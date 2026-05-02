const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

// Gmail SMTP
function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'fotocartemd@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD || '',
    },
  });
}

// ── Security helpers ──
function sha256(value) {
  if (!value) return undefined;
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function maskEmail(email) {
  if (!email) return '***';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local[0]}***@${domain}`;
}

// Rate limiter — tracks attempts per key in Firestore
const RATE_LIMITS = {
  sendCode: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },      // 5 per 15 min
  verifyCode: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },     // 5 per 15 min
  sendEmail: { maxAttempts: 10, windowMs: 60 * 60 * 1000 },     // 10 per hour
};

async function checkRateLimit(action, key) {
  const limit = RATE_LIMITS[action];
  if (!limit) return;

  const docRef = db.doc(`rate_limits/${action}_${key.replace(/[^a-zA-Z0-9]/g, '_')}`);
  const doc = await docRef.get();

  const now = Date.now();
  let attempts = [];

  if (doc.exists) {
    attempts = (doc.data().attempts || []).filter(t => now - t < limit.windowMs);
  }

  if (attempts.length >= limit.maxAttempts) {
    throw new HttpsError('resource-exhausted', 'Prea multe încercări. Încearcă din nou mai târziu.');
  }

  attempts.push(now);
  await docRef.set({ attempts, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
}

// ══════════════════════════════════════════════
//  Branded HTML wrapper
// ══════════════════════════════════════════════
function wrapInTemplate(bodyContent) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F3F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="background:#1C1C1E;padding:32px;text-align:center;border-radius:16px 16px 0 0;">
      <h1 style="color:white;font-size:28px;margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:400;letter-spacing:1px;">fotocarte.</h1>
    </div>
    <div style="background:#ffffff;padding:36px 32px;border-left:1px solid #E8E4DB;border-right:1px solid #E8E4DB;">
      ${bodyContent}
    </div>
    <div style="background:#FAF8F5;padding:20px 32px;border-radius:0 0 16px 16px;border-top:1px solid #E8E4DB;text-align:center;">
      <p style="font-size:12px;color:#999;margin:0 0 4px;">Multumim ca ai ales fotocarte.md!</p>
      <p style="font-size:10px;color:#CCC;margin:0;">Fotocarte &middot; Chisinau, Moldova &middot; +373 60 595 984</p>
    </div>
  </div>
</body>
</html>`;
}

// Convert plain text body to styled HTML
function textToHtml(text, variables) {
  let result = text;
  for (const [key, value] of Object.entries(variables || {})) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  const lines = result.split('\n');
  let html = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      html += '<div style="height:12px;"></div>';
    } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      html += `<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 4px;padding-left:8px;">${trimmed}</p>`;
    } else {
      html += `<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 12px;">${trimmed}</p>`;
    }
  }
  return html;
}

// ══════════════════════════════════════════════
//  0. Send verification code + check if email exists
//  All Firestore writes happen server-side (no client auth needed)
// ══════════════════════════════════════════════
exports.sendCode = onCall({ region: 'europe-west1', secrets: ['GMAIL_APP_PASSWORD'] }, async (request) => {
  const { email, mode } = request.data;
  if (!email || !email.includes('@') || email.length < 5 || email.length > 254) {
    throw new HttpsError('invalid-argument', 'Email invalid');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit — max 5 code requests per email per 15 min
  await checkRateLimit('sendCode', normalizedEmail);

  // Check if email already has an account
  const clientSnap = await db.collection('clients').where('email', '==', normalizedEmail).limit(1).get();
  const exists = !clientSnap.empty;

  // Login mode — contul trebuie să existe
  if (mode === 'login' && !exists) {
    throw new HttpsError('not-found', 'Nu există cont cu acest email. Creează unul nou.');
  }

  // Generate 4-digit code
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes (was 10)

  // Store HASHED code in Firestore (server-side — no auth needed)
  await db.doc(`email-codes/${normalizedEmail}`).set({
    codeHash,
    email: normalizedEmail,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    expires_at: expiresAt.toISOString(),
    verified: false,
    attempts: 0,
  });

  // Send code via email
  try {
      const time = expiresAt.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
      const bodyContent = `
        <p style="font-size:16px;color:#1C1C1E;margin:0 0 8px;">Salut! &#128075;</p>
        <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 24px;">
          Codul tau de verificare pentru Fotocarte:
        </p>
        <div style="text-align:center;margin:0 0 24px;">
          <span style="display:inline-block;background:#F5F5F5;padding:16px 32px;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:8px;color:#1C1C1E;">${code}</span>
        </div>
        <div style="background:#FFF9E6;border-radius:10px;padding:14px 18px;margin:0 0 24px;">
          <p style="font-size:13px;color:#8B7B2B;margin:0;">&#128274; Codul expira la ${time}. Nu-l transmite altor persoane.</p>
        </div>
        <p style="font-size:12px;color:#B0A89E;line-height:1.6;margin:0;">
          Daca nu ai solicitat acest cod, ignora acest email.
        </p>`;
      await getTransporter().sendMail({
        from: '"Fotocarte" <fotocartemd@gmail.com>',
        to: normalizedEmail,
        subject: `${code} — Codul tau Fotocarte`,
        html: wrapInTemplate(bodyContent),
      });
    } catch (e) {
      console.error('Email send failed:', e.message);
    }

  console.log(`Code sent: ${maskEmail(normalizedEmail)} (exists: ${exists})`);

  return { success: true, exists };
});

// ══════════════════════════════════════════════
//  1. Verify email code + return Custom Auth Token
//  Single auth method for ALL clients.
//  Same UID on every device — email is the identity.
// ══════════════════════════════════════════════
exports.verifyAndAuth = onCall({ region: 'europe-west1', minInstances: 1 }, async (request) => {
  const { email, code, mode } = request.data;
  if (!email || !code) {
    throw new HttpsError('invalid-argument', 'Email și cod necesare');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit — max 5 verify attempts per email per 15 min
  await checkRateLimit('verifyCode', normalizedEmail);

  // 1. Verify code from Firestore
  const codeDocRef = db.doc(`email-codes/${normalizedEmail}`);
  const codeDoc = await codeDocRef.get();
  if (!codeDoc.exists) {
    throw new HttpsError('not-found', 'Cod inexistent. Solicită un cod nou.');
  }

  const codeData = codeDoc.data();

  // Check max attempts on this specific code (brute force protection)
  if ((codeData.attempts || 0) >= 5) {
    // Delete the code — force requesting a new one
    await codeDocRef.delete();
    throw new HttpsError('resource-exhausted', 'Prea multe încercări greșite. Solicită un cod nou.');
  }

  // Increment attempt counter before checking
  await codeDocRef.update({ attempts: admin.firestore.FieldValue.increment(1) });

  // Compare hashed code
  const codeHash = hashCode(code);
  if (codeData.codeHash !== codeHash) {
    throw new HttpsError('permission-denied', 'Cod greșit');
  }

  const expiresAt = codeData.expires_at ? new Date(codeData.expires_at).getTime() : 0;
  if (expiresAt < Date.now()) {
    throw new HttpsError('deadline-exceeded', 'Codul a expirat. Solicită unul nou.');
  }

  // Mark code as used and delete it (one-time use)
  await codeDocRef.delete();

  // 2. Find or create client
  const clientsSnap = await db.collection('clients')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  let clientId;
  let clientName = '';
  let clientPhone = '';
  let isNew = false;

  if (!clientsSnap.empty) {
    // Returning client — use existing UID (works for both register & login)
    const clientDoc = clientsSnap.docs[0];
    clientId = clientDoc.id;
    const data = clientDoc.data();
    clientName = data.name || '';
    clientPhone = data.phone || '';
    // Update last access
    await clientDoc.ref.update({ last_access: new Date().toISOString() });
  } else if (mode === 'login') {
    // Login strict — contul nu există, nu creăm
    throw new HttpsError('not-found', 'Nu există cont cu acest email.');
  } else {
    // New client — generate persistent UID (doar register/upload)
    const { name, phone } = request.data;
    clientId = db.collection('clients').doc().id;
    await db.doc(`clients/${clientId}`).set({
      email: normalizedEmail,
      name: name || '',
      phone: phone || '',
      authMethod: 'email_code',
      type: 'client',
      status: 'active',
      created_at: new Date().toISOString(),
    });
    clientName = name || '';
    clientPhone = phone || '';
    isNew = true;
  }

  // 3. Create custom token with the persistent client UID
  const customToken = await admin.auth().createCustomToken(clientId, {
    email: normalizedEmail,
    authMethod: 'email_code',
  });

  console.log(`Auth: ${isNew ? 'NEW' : 'RETURNING'} client ${maskEmail(normalizedEmail)}`);

  return { token: customToken, clientId, clientName, clientPhone, isNew };
});

// ══════════════════════════════════════════════
//  2. Send Order Notification Email (callable)
// ══════════════════════════════════════════════
exports.sendOrderEmail = onCall({ region: 'europe-west1', secrets: ['GMAIL_APP_PASSWORD'] }, async (request) => {
  const { to, templateId, variables } = request.data;

  if (!to || !templateId) {
    throw new HttpsError('invalid-argument', 'Missing to or templateId');
  }

  // Rate limit email sending
  await checkRateLimit('sendEmail', to);

  // Load template from Firestore
  const settingsSnap = await db.doc('settings/email_templates').get();
  const settings = settingsSnap.data();
  const template = settings?.templates?.[templateId];

  if (!template || template.enabled === false) {
    console.log(`Template "${templateId}" disabled or not found, skipping`);
    return { success: false, reason: 'Template disabled' };
  }

  // Replace variables in subject
  let subject = template.subject;
  for (const [key, value] of Object.entries(variables || {})) {
    subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }

  // Build HTML body — special layout for order_confirmed
  let bodyContent;

  if (templateId === 'order_confirmed') {
    const v = variables || {};
    const coverHtml = v.coverImage ? `
      <div style="text-align:center;margin:0 0 24px;">
        <img src="${v.coverImage}" alt="${v.coverName || 'Cover'}" style="max-width:200px;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.1);" />
      </div>` : '';

    bodyContent = `
      <p style="font-size:16px;color:#1C1C1E;margin:0 0 4px;">Salut! &#128075;</p>
      <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 24px;">
        Salut ${v.clientName || ''}, comanda ta a fost inregistrata cu succes.
      </p>

      ${coverHtml}

      <div style="border:2px solid #C4A882;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
        <p style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;font-weight:600;">Detalii comanda</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="font-size:14px;color:#888;padding:6px 0;">Produs</td><td style="font-size:14px;color:#1C1C1E;padding:6px 0;text-align:right;font-weight:600;">${v.productName || 'Album foto'}</td></tr>
          <tr><td style="font-size:14px;color:#888;padding:6px 0;">Format</td><td style="font-size:14px;color:#1C1C1E;padding:6px 0;text-align:right;font-weight:600;">${v.format || '20x20'} cm</td></tr>
          <tr><td style="font-size:14px;color:#888;padding:6px 0;">Pagini</td><td style="font-size:14px;color:#1C1C1E;padding:6px 0;text-align:right;font-weight:600;">${v.pages || '40'}</td></tr>
          <tr><td style="font-size:14px;color:#888;padding:6px 0;">Serviciu</td><td style="font-size:14px;color:#1C1C1E;padding:6px 0;text-align:right;font-weight:600;">${v.service || 'Serviciu designer'}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #E8E4DB;margin:12px 0;">
        <table style="width:100%;">
          <tr><td style="font-size:16px;color:#1C1C1E;font-weight:700;">Total</td><td style="font-size:20px;color:#1C1C1E;font-weight:700;text-align:right;">${v.price || '0'} lei</td></tr>
        </table>
      </div>

      <div style="margin:0 0 20px;">
        <p style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;font-weight:600;">Adresa de livrare</p>
        <p style="font-size:14px;color:#1C1C1E;margin:0;">${v.address || ''}</p>
      </div>

      <div style="background:#FFF9E6;border-radius:10px;padding:14px 18px;margin:0 0 20px;">
        <p style="font-size:13px;color:#8B7B2B;margin:0;">&#128222; Managerul nostru te va contacta in curand pentru confirmare si detalii de achitare.</p>
      </div>

      <div style="text-align:center;margin:24px 0 0;">
        <a href="https://fotocarte.md/app/cabinet" style="display:inline-block;background:#3D6B5E;color:white;text-decoration:none;padding:14px 40px;border-radius:12px;font-size:15px;font-weight:600;">
          Vezi statusul comenzii &rarr;
        </a>
      </div>

      <p style="font-size:14px;color:#444;margin:20px 0 0;text-align:center;">Multumim ca ai ales fotocarte.md!</p>`;
  } else if (templateId === '_admin_new_upload') {
    // Admin notification — new client uploaded photos
    const v = variables || {};
    bodyContent = `
      <p style="font-size:16px;color:#1C1C1E;margin:0 0 12px;font-weight:600;">&#128247; Client nou a incarcat poze!</p>
      <div style="background:#F5F3F0;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
        <p style="font-size:14px;color:#1C1C1E;margin:0 0 6px;"><strong>${v.clientName || '—'}</strong></p>
        <p style="font-size:13px;color:#666;margin:0 0 4px;">Email: ${v.clientEmail || '—'}</p>
        <p style="font-size:13px;color:#666;margin:0 0 4px;">Telefon: ${v.clientPhone || '—'}</p>
        <p style="font-size:13px;color:#666;margin:0 0 4px;">Poze: <strong>${v.photoCount || '?'}</strong></p>
        <p style="font-size:13px;color:#666;margin:0;">Dispozitiv: ${v.device || '—'}</p>
      </div>
      <div style="text-align:center;">
        <a href="https://fotocarte.md/admin_panel/orders" style="display:inline-block;background:#3D6B5E;color:white;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;">
          Deschide panelul &rarr;
        </a>
      </div>`;
    subject = `[Fotocarte] ${v.clientName || 'Client'} a incarcat ${v.photoCount || ''} poze`;
  } else {
    // Generic template — convert plain text to HTML
    const showCabinetBtn = ['designer_assigned', 'ready_for_approval', 'sent_to_print', 'in_print', 'shipped'].includes(templateId);
    bodyContent = textToHtml(template.body, variables);
    if (showCabinetBtn) {
      bodyContent += `
        <div style="text-align:center;margin:24px 0 0;">
          <a href="https://fotocarte.md/app/cabinet" style="display:inline-block;background:#3D6B5E;color:white;text-decoration:none;padding:14px 40px;border-radius:12px;font-size:15px;font-weight:600;">
            Vezi statusul comenzii &rarr;
          </a>
        </div>`;
    }
  }

  const html = wrapInTemplate(bodyContent);

  await getTransporter().sendMail({
    from: '"Fotocarte" <fotocartemd@gmail.com>',
    to,
    subject,
    html,
  });

  console.log(`Email sent: ${templateId} → ${maskEmail(to)}`);
  return { success: true };
});

// ══════════════════════════════════════════════
//  3. Abandoned Project Reminder (runs every hour)
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
//  Helper: send + log notification
// ══════════════════════════════════════════════
async function sendAndLog(docRef, email, subject, bodyContent, type) {
  await getTransporter().sendMail({
    from: '"Fotocarte" <fotocartemd@gmail.com>',
    replyTo: 'fotocartemd@gmail.com',
    to: email,
    subject,
    html: wrapInTemplate(bodyContent),
  });
  // Log to notifications_log for admin panel
  await db.collection('notifications_log').add({
    orderId: docRef.id,
    email: maskEmail(email),
    type,
    subject,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function firstName(name) { return (name || '').split(' ')[0] || ''; }
function greet(name) { return name ? `Salut ${firstName(name)}!` : 'Salut!'; }

// ══════════════════════════════════════════════
//  Scheduled: All client notifications (runs every hour)
// ══════════════════════════════════════════════
exports.abandonedReminder = onSchedule(
  { schedule: 'every 1 hours', region: 'europe-west1', secrets: ['GMAIL_APP_PASSWORD'] },
  async () => {
    const now = Date.now();
    const H = (h) => h * 60 * 60 * 1000;
    let totalSent = 0;

    // ─── 1. DRAFT — uploaded photos, didn't order (+2h first, +24h second) ───
    const draftsSnap = await db.collection('orders').where('status', '==', 'draft').get();
    for (const doc of draftsSnap.docs) {
      const o = doc.data();
      const email = o.clientEmail || o.client_email;
      const photos = o.totalPhotos || 0;
      if (!email || photos < 10) continue;

      const age = now - new Date(o.createdAt || o.created_at).getTime();
      const name = o.clientName || '';
      const hasArranged = (o.progress || 0) > 0 || (o.filledSpreads || 0) > 0;
      const productName = o.productConfig?.name || 'album foto';

      // First reminder: +2h
      if (age >= H(2) && age < H(20) && !o.reminderSent) {
        try {
          const subject = hasArranged
            ? `${firstName(name)}, albumul tau e aproape gata!`
            : `${firstName(name)}, ${photos} fotografii te asteapta`;
          const body = hasArranged
            ? `<p style="font-size:16px;color:#1C1C1E;margin:0 0 8px;">${greet(name)} &#128075;</p>
              <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 20px;">
                Albumul tau cu <strong>${photos} fotografii</strong> aranajate pe pagini arata minunat! Mai e doar un pas pana la comanda.
              </p>
              <div style="text-align:center;margin:0 0 24px;">
                <a href="https://fotocarte.md/app/editor/${doc.id}" style="display:inline-block;background:#3D6B5E;color:white;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:16px;font-weight:600;">
                  Finalizeaza albumul &rarr;
                </a>
              </div>`
            : `<p style="font-size:16px;color:#1C1C1E;margin:0 0 8px;">${greet(name)} &#128075;</p>
              <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 20px;">
                Cele <strong>${photos} fotografii</strong> pe care le-ai incarcat sunt salvate. Cu un singur click le aranjam automat pe pagini &mdash; dureaza 10 secunde!
              </p>
              <div style="text-align:center;margin:0 0 24px;">
                <a href="https://fotocarte.md/app/editor/${doc.id}" style="display:inline-block;background:#3D6B5E;color:white;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:16px;font-weight:600;">
                  Creeaza albumul &rarr;
                </a>
              </div>
              <p style="font-size:13px;color:#888;margin:0;text-align:center;">Designerul nostru poate aranja totul gratuit pentru tine.</p>`;
          await sendAndLog(doc, email, subject, body, 'draft_reminder');
          await doc.ref.update({ reminderSent: true, reminderSentAt: new Date().toISOString() });
          totalSent++;
        } catch (err) { console.error(`Draft reminder failed:`, err.message); }
      }

      // Second reminder: +24h
      if (age >= H(24) && age < H(72) && o.reminderSent && !o.reminder2Sent) {
        try {
          const subject = hasArranged
            ? `${firstName(name)}, albumul tau "${productName}" e gata de comanda`
            : `${firstName(name)}, am pastrat cele ${photos} fotografii ale tale`;
          const body = hasArranged
            ? `<p style="font-size:16px;color:#1C1C1E;margin:0 0 8px;">${greet(name)}</p>
              <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 20px;">
                Albumul tau cu <strong>${photos} fotografii</strong> e aranjat si gata. Il poti comanda oricand &mdash; il tiparim si ti-l livram acasa.
              </p>
              <div style="text-align:center;margin:0 0 20px;">
                <a href="https://fotocarte.md/app/editor/${doc.id}" style="display:inline-block;background:#3D6B5E;color:white;text-decoration:none;padding:14px 40px;border-radius:12px;font-size:15px;font-weight:600;">
                  Vezi albumul &rarr;
                </a>
              </div>`
            : `<p style="font-size:16px;color:#1C1C1E;margin:0 0 8px;">${greet(name)}</p>
              <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 20px;">
                Cele <strong>${photos} fotografii</strong> sunt in siguranta. Vrei sa le aranjam noi pe pagini? Designerul nostru face totul gratuit!
              </p>
              <div style="text-align:center;margin:0 0 20px;">
                <a href="https://fotocarte.md/app/editor/${doc.id}" style="display:inline-block;background:#3D6B5E;color:white;text-decoration:none;padding:14px 40px;border-radius:12px;font-size:15px;font-weight:600;">
                  Continua albumul &rarr;
                </a>
              </div>`;
          const footer = `<div style="background:#F5F3F0;border-radius:10px;padding:14px 18px;margin:0 0 16px;">
              <p style="font-size:13px;color:#666;margin:0;">&#128222; Ai intrebari? Suna-ne: <strong>+373 60 595 984</strong></p>
            </div>`;
          await sendAndLog(doc, email, subject, body + footer, 'draft_reminder_2');
          await doc.ref.update({ reminder2Sent: true, reminder2SentAt: new Date().toISOString() });
          totalSent++;
        } catch (err) { console.error(`Draft reminder 2 failed:`, err.message); }
      }
    }

    // ─── 2. AWAITING PAYMENT — placed order, manager contacts (+2h + +24h) ───
    const awaitingSnap = await db.collection('orders').where('status', '==', 'awaiting_payment').get();
    for (const doc of awaitingSnap.docs) {
      const o = doc.data();
      const email = o.clientEmail || o.client_email;
      if (!email) continue;

      const age = now - new Date(o.orderedAt || o.createdAt || o.created_at).getTime();
      const name = o.clientName || '';
      const orderNumber = o.orderNumber || doc.id;
      const total = o.priceTotal || 0;

      // First: +2h
      if (age >= H(2) && age < H(20) && !o.paymentReminder1Sent) {
        try {
          const productName = o.productConfig?.name || 'album foto';
          const pages = o.productConfig?.initialPages || '';
          const pagesInfo = pages ? ` &middot; ${pages} pagini` : '';
          await sendAndLog(doc, email,
            `Comanda ${orderNumber} — pasii urmatori`,
            `<p style="font-size:16px;color:#1C1C1E;margin:0 0 8px;">${greet(name)} &#128578;</p>
            <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 20px;">
              Comanda ta <strong>${orderNumber}</strong> (${productName}${pagesInfo}) a fost inregistrata. Managerul nostru te va contacta pentru a confirma detaliile si a genera factura.
            </p>
            <div style="background:#F5F3F0;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
              <p style="font-size:14px;color:#1C1C1E;margin:0;font-weight:600;">Total: ${total} lei</p>
              <p style="font-size:12px;color:#888;margin:4px 0 0;">Plata se face dupa confirmarea cu managerul</p>
            </div>
            <div style="text-align:center;margin:0 0 20px;">
              <a href="https://fotocarte.md/app/cabinet" style="display:inline-block;background:#3D6B5E;color:white;text-decoration:none;padding:14px 40px;border-radius:12px;font-size:15px;font-weight:600;">
                Vezi comanda ta &rarr;
              </a>
            </div>
            <p style="font-size:13px;color:#888;margin:0;text-align:center;">
              Intrebari? Suna-ne la <strong>+373 60 595 984</strong>
            </p>`,
            'payment_reminder_1'
          );
          await doc.ref.update({ paymentReminder1Sent: true, paymentReminder1SentAt: new Date().toISOString() });
          totalSent++;
        } catch (err) { console.error(`Payment reminder 1 failed:`, err.message); }
      }

      // Second: +24h
      if (age >= H(24) && age < H(72) && !o.paymentReminder2Sent) {
        try {
          await sendAndLog(doc, email,
            `${firstName(name)}, albumul tau ${orderNumber} e gata de tiparit`,
            `<p style="font-size:16px;color:#1C1C1E;margin:0 0 8px;">${greet(name)}</p>
            <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 20px;">
              Albumul tau foto e pregatit si asteapta sa prinda viata pe hartie. Dupa confirmarea cu managerul, il tiparim si ti-l livram acasa.
            </p>
            <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">
              Ai vreo intrebare sau vrei sa modifici ceva la album? Scrie-ne sau suna-ne &mdash; te ajutam cu placere.
            </p>
            <div style="text-align:center;margin:0 0 20px;">
              <a href="https://fotocarte.md/app/cabinet" style="display:inline-block;background:#3D6B5E;color:white;text-decoration:none;padding:14px 40px;border-radius:12px;font-size:15px;font-weight:600;">
                Vezi comanda &rarr;
              </a>
            </div>
            <div style="background:#F5F3F0;border-radius:10px;padding:14px 18px;margin:0 0 16px;">
              <p style="font-size:13px;color:#666;margin:0;">&#128222; <strong>+373 60 595 984</strong> &mdash; raspundem oricand</p>
            </div>`,
            'payment_reminder_2'
          );
          await doc.ref.update({ paymentReminder2Sent: true, paymentReminder2SentAt: new Date().toISOString() });
          totalSent++;
        } catch (err) { console.error(`Payment reminder 2 failed:`, err.message); }
      }
    }

    // ─── 3. DELIVERED — ask for review (+3 days, human tone) ───
    const deliveredSnap = await db.collection('orders').where('status', '==', 'delivered').get();
    for (const doc of deliveredSnap.docs) {
      const o = doc.data();
      const email = o.clientEmail || o.client_email;
      if (!email || o.reviewReminderSent) continue;

      const deliveredAt = o.deliveredAt || o.updatedAt;
      if (!deliveredAt) continue;
      const age = now - new Date(deliveredAt).getTime();
      if (age < H(72) || age > H(168)) continue; // 3-7 days

      const name = o.clientName || '';

      try {
        await sendAndLog(doc, email,
          `${firstName(name)}, cum a fost albumul?`,
          `<p style="font-size:16px;color:#1C1C1E;margin:0 0 8px;">${greet(name)} &#128218;</p>
          <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 20px;">
            Speram ca albumul tau foto iti aduce bucurie de fiecare data cand il rasfoiesti!
          </p>
          <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">
            Suntem o echipa mica si fiecare album ne face mai buni. Daca ai un minut, o recenzie sincera ne ajuta enorm &mdash; chiar si sugestiile de imbunatatire.
          </p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="https://g.page/r/fotocarte-md/review" style="display:inline-block;background:#3D6B5E;color:white;text-decoration:none;padding:14px 40px;border-radius:12px;font-size:15px;font-weight:600;">
              Lasa o recenzie &#11088;
            </a>
          </div>
          <p style="font-size:13px;color:#888;margin:0;text-align:center;">Multumim din suflet! &#128155;</p>`,
          'review_request'
        );
        await doc.ref.update({ reviewReminderSent: true, reviewReminderSentAt: new Date().toISOString() });
        totalSent++;
      } catch (err) { console.error(`Review reminder failed:`, err.message); }
    }

    // ─── Cleanup: delete expired rate limit docs (older than 1 hour) ───
    try {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000);
      const expiredRateLimits = await db.collection('rate_limits')
        .where('updatedAt', '<', cutoff).limit(100).get();
      const batch = db.batch();
      expiredRateLimits.docs.forEach(d => batch.delete(d.ref));
      if (!expiredRateLimits.empty) await batch.commit();
    } catch (err) { console.error('Rate limit cleanup failed:', err.message); }

    console.log(`Notifications: sent ${totalSent} emails total`);
  }
);

// ══════════════════════════════════════════════
//  4. Cloudinary Signed Upload — generates signature for browser uploads
// ══════════════════════════════════════════════
exports.signCloudinaryUpload = onCall({ region: 'europe-west1' }, async (request) => {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;

  if (!apiSecret || !apiKey) {
    throw new HttpsError('internal', 'Cloudinary not configured');
  }

  const { folder } = request.data;
  if (!folder) {
    throw new HttpsError('invalid-argument', 'Missing folder');
  }

  const timestamp = Math.floor(Date.now() / 1000);

  // Cloudinary requires signing these params alphabetically
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  return { signature, timestamp, apiKey };
});

// ══════════════════════════════════════════════
//  5. Meta Conversions API (CAPI) — server-side events
//  Deduplicates with client-side Pixel via eventId
// ══════════════════════════════════════════════
exports.sendMetaConversion = onCall({ region: 'europe-west1' }, async (request) => {
  const PIXEL_ID = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_CAPI_TOKEN;

  if (!ACCESS_TOKEN || !PIXEL_ID) {
    console.warn('[CAPI] Missing config');
    return { success: false, reason: 'Missing config' };
  }

  const { eventName, eventId, sourceUrl, fbp, fbc, clientUserAgent, userData, customData } = request.data;

  if (!eventName) {
    throw new HttpsError('invalid-argument', 'Missing eventName');
  }

  // Build user_data — hash PII, do NOT hash fbp/fbc
  const user_data = {};
  if (userData?.email) user_data.em = [sha256(userData.email)];
  if (userData?.phone) user_data.ph = [sha256(userData.phone.replace(/[^\d]/g, ''))];
  if (userData?.firstName) user_data.fn = [sha256(userData.firstName)];
  if (userData?.lastName) user_data.ln = [sha256(userData.lastName)];
  if (userData?.externalId) user_data.external_id = [userData.externalId];
  if (userData?.city) user_data.ct = [sha256(userData.city)];
  if (userData?.country) user_data.country = [sha256(userData.country)];
  if (userData?.zip) user_data.zp = [sha256(userData.zip)];
  // fbp and fbc are NEVER hashed
  if (fbp) user_data.fbp = fbp;
  if (fbc) user_data.fbc = fbc;
  // Client IP — real IP from x-forwarded-for (not Google Cloud infra IP)
  const forwardedFor = request.rawRequest?.headers?.['x-forwarded-for'];
  const realIp = forwardedFor ? forwardedFor.split(',')[0].trim() : request.rawRequest?.ip;
  if (realIp) user_data.client_ip_address = realIp;
  // User Agent — from browser (passed by client), not Firebase SDK
  if (clientUserAgent) user_data.client_user_agent = clientUserAgent;

  // Build custom_data
  const custom_data = {};
  if (customData?.value) custom_data.value = customData.value;
  if (customData?.currency) custom_data.currency = customData.currency;
  if (customData?.contentName) custom_data.content_name = customData.contentName;
  if (customData?.contentIds) custom_data.content_ids = customData.contentIds;
  if (customData?.contentType) custom_data.content_type = customData.contentType;
  if (customData?.orderId) custom_data.order_id = customData.orderId;
  if (customData?.numItems) custom_data.num_items = customData.numItems;

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url: sourceUrl || 'https://fotocarte.md',
    action_source: 'website',
    user_data,
    custom_data,
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [eventData] }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('[CAPI] Error:', JSON.stringify(result));
      return { success: false, error: result };
    }

    console.log(`[CAPI] ${eventName} sent`);
    return { success: true, events_received: result.events_received };
  } catch (e) {
    console.error('[CAPI] Fetch error:', e.message);
    return { success: false, error: e.message };
  }
});
