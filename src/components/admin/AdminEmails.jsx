import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';

/**
 * Admin — Email notification templates editor.
 * Templates stored in Firestore settings/email_templates.
 * Each template has: subject, body (with {{variables}}), enabled flag.
 */

const EMAIL_STAGES = [
  {
    id: 'order_confirmed',
    label: 'Comandă plasată',
    trigger: 'După plasare comandă',
    icon: '✅',
    variables: ['clientName', 'orderId', 'orderNumber', 'productName', 'format', 'pages', 'price', 'service', 'address', 'siteUrl'],
    defaultSubject: 'Comanda ta {{orderNumber}} a fost înregistrată!',
    defaultBody: `Salut {{clientName}},

Mulțumim pentru comanda ta! Am înregistrat-o cu succes.

Detalii comandă:
• Produs: {{productName}}
• Format: {{format}} · {{pages}} pagini
• Serviciu: {{service}}
• Nr. comandă: {{orderNumber}}
• Total: {{price}} lei

Adresa de livrare:
{{address}}

Managerul nostru te va contacta în curând pentru confirmarea comenzii și detalii de achitare.

Cu drag,
Echipa Fotocarte`,
  },
  {
    id: 'payment_confirmed',
    label: 'Plata confirmată',
    trigger: 'Manager marchează achitat',
    icon: '💰',
    variables: ['clientName', 'orderNumber', 'productName', 'price'],
    defaultSubject: 'Am primit plata — comanda {{orderNumber}}',
    defaultBody: `Salut {{clientName}},

Plata pentru comanda {{orderNumber}} a fost confirmată cu succes!

Designerul nostru va începe lucrul la albumul tău {{productName}} în curând. Te vom notifica când macheta va fi gata.

Cu drag,
Echipa Fotocarte`,
  },
  {
    id: 'designer_assigned',
    label: 'Designer asignat',
    trigger: 'Admin asignează designer',
    icon: '🎨',
    variables: ['clientName', 'orderId', 'designerName', 'estimateDays', 'siteUrl'],
    defaultSubject: 'Designerul lucrează la albumul tău',
    defaultBody: `Salut {{clientName}},

Vești bune! Designerul nostru {{designerName}} a început să lucreze la albumul tău.

Estimăm că macheta va fi gata în {{estimateDays}} zile lucrătoare.

Te vom notifica imediat ce albumul va fi gata de verificat.

Cu drag,
Echipa Fotocarte`,
  },
  {
    id: 'ready_for_approval',
    label: 'Macheta gata — verifică',
    trigger: 'Designer trimite la aprobare',
    icon: '👁️',
    variables: ['clientName', 'orderId', 'previewUrl', 'siteUrl'],
    defaultSubject: 'Albumul tău este gata! Verifică macheta',
    defaultBody: `Salut {{clientName}},

Macheta albumului tău este gata! 🎉

Designerul a terminat aranjarea pozelor și acum poți verifica rezultatul.

👉 Verifică albumul: {{previewUrl}}

Dacă totul arată bine, confirmă trimiterea la tipar. Dacă vrei modificări, ne poți scrie direct.

Cu drag,
Echipa Fotocarte`,
  },
  {
    id: 'sent_to_print',
    label: 'Trimis la tipar',
    trigger: 'Client aprobă macheta',
    icon: '🖨️',
    variables: ['clientName', 'orderId', 'estimateDate', 'siteUrl'],
    defaultSubject: 'Albumul tău a fost trimis la tipar!',
    defaultBody: `Salut {{clientName}},

Albumul tău a fost trimis la tipar! 🖨️

Estimăm livrarea pe data de {{estimateDate}}.

Te vom notifica când albumul va fi expediat.

Nr. comandă: {{orderId}}

Cu drag,
Echipa Fotocarte`,
  },
  {
    id: 'shipped',
    label: 'Album expediat',
    trigger: 'Se trimite coletul',
    icon: '📦',
    variables: ['clientName', 'orderId', 'trackingNumber', 'courierName', 'estimateDate', 'siteUrl'],
    defaultSubject: 'Albumul tău a fost expediat!',
    defaultBody: `Salut {{clientName}},

Albumul tău este pe drum! 📦

Detalii livrare:
• Curier: {{courierName}}
• Nr. tracking: {{trackingNumber}}
• Estimare livrare: {{estimateDate}}

Nr. comandă: {{orderId}}

Cu drag,
Echipa Fotocarte`,
  },
  {
    id: 'in_print',
    label: 'La tipar',
    trigger: 'Admin trimite la tipar',
    icon: '🖨️',
    variables: ['clientName', 'orderId', 'orderNumber', 'estimateDate', 'siteUrl'],
    defaultSubject: 'Albumul tău este la tipar!',
    defaultBody: `Salut {{clientName}},

Albumul tău a fost trimis la tipografie! 🖨️

Echipa noastră de producție lucrează la imprimarea albumului tău pe hârtie fotografică premium.

Estimăm că albumul va fi gata și expediat până la {{estimateDate}}.

Nr. comandă: {{orderNumber}}

Te vom notifica imediat ce albumul va fi expediat.

Cu drag,
Echipa Fotocarte`,
  },
  {
    id: 'order_cancelled',
    label: 'Comandă anulată',
    trigger: 'Admin anulează comanda',
    icon: '❌',
    variables: ['clientName', 'orderNumber', 'reason', 'productName', 'siteUrl'],
    defaultSubject: 'Comanda {{orderNumber}} a fost anulată',
    defaultBody: `Salut {{clientName}},

Te informăm că comanda ta {{orderNumber}} ({{productName}}) a fost anulată.

Motivul: {{reason}}

Dacă consideri că este o greșeală sau dorești să plasezi o nouă comandă, te rugăm să ne contactezi pe WhatsApp sau să accesezi site-ul nostru.

Proiectul tău rămâne salvat timp de 60 de zile — poți oricând crea o nouă comandă cu același album.

Cu drag,
Echipa Fotocarte`,
  },
  {
    id: 'delivered',
    label: 'Album livrat',
    trigger: 'Confirmare livrare',
    icon: '🎁',
    variables: ['clientName', 'orderId', 'reviewUrl', 'siteUrl'],
    defaultSubject: 'Albumul tău a ajuns! Sperăm că-ți place',
    defaultBody: `Salut {{clientName}},

Albumul tău foto a fost livrat cu succes! 🎉

Sperăm că rezultatul te va bucura la fel de mult cum ne-a bucurat pe noi să-l creăm.

Dacă dorești să ne spui părerea ta, ne-ar face mare plăcere:
👉 {{reviewUrl}}

Mulțumim că ai ales Fotocarte!

Cu drag,
Echipa Fotocarte`,
  },
];

export default function AdminEmails() {
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState('order_confirmed');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Email config
  const [config, setConfig] = useState({
    senderName: 'Fotocarte',
    senderEmail: 'album@fotocarte.md',
    replyTo: 'fotocartemd@gmail.com',
    resendApiKey: '',
    workerUrl: '',
  });

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'settings', 'email_templates'));
      if (snap.exists()) {
        const data = snap.data();
        setTemplates(data.templates || {});
        if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
      }
    } catch (e) { console.warn('Failed to load email templates:', e); }
    setLoading(false);
  }

  async function saveAll() {
    setSaving(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'email_templates'), {
        templates,
        config,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert('Eroare: ' + e.message); }
    setSaving(false);
  }

  const stage = EMAIL_STAGES.find(s => s.id === activeStage);
  const tpl = templates[activeStage] || {
    subject: stage?.defaultSubject || '',
    body: stage?.defaultBody || '',
    enabled: true,
  };

  const updateTemplate = (field, value) => {
    setTemplates(prev => ({
      ...prev,
      [activeStage]: { ...tpl, [field]: value },
    }));
  };

  // Initialize defaults for stages that don't have saved templates
  useEffect(() => {
    if (!loading) {
      const merged = { ...templates };
      let changed = false;
      for (const stage of EMAIL_STAGES) {
        if (!merged[stage.id]) {
          merged[stage.id] = { subject: stage.defaultSubject, body: stage.defaultBody, enabled: true };
          changed = true;
        }
      }
      if (changed) setTemplates(merged);
    }
  }, [loading]);

  async function sendTestEmail() {
    if (!testEmail.trim()) return;
    if (!config.workerUrl) { alert('Configurează URL-ul Worker-ului în setări'); return; }
    setSendingTest(true);
    try {
      const res = await fetch(config.workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: '[TEST] ' + tpl.subject.replace(/\{\{(\w+)\}\}/g, (_, v) => `[${v}]`),
          body: tpl.body.replace(/\{\{(\w+)\}\}/g, (_, v) => `[${v}]`),
          senderName: config.senderName,
          senderEmail: config.senderEmail,
          replyTo: config.replyTo,
        }),
      });
      if (res.ok) alert('Email de test trimis!');
      else alert('Eroare: ' + await res.text());
    } catch (e) { alert('Eroare: ' + e.message); }
    setSendingTest(false);
  }

  if (loading) return <div className="p-8 text-center text-[#888]">Se încarcă...</div>;

  return (
    <div className="p-6 max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Notificări email</h1>
          <p className="text-sm text-[#888]">Editează textele emailurilor trimise automat la fiecare etapă.</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-[12px] text-green-600 font-semibold">Salvat!</span>}
          <button onClick={saveAll} disabled={saving}
            className="px-5 py-2 bg-[#3D6B5E] text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-[#2d5445] transition">
            {saving ? 'Se salvează...' : 'Salvează tot'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* ── Left: Stage list ── */}
        <div className="w-[220px] shrink-0 space-y-1">
          {EMAIL_STAGES.map(s => {
            const isActive = activeStage === s.id;
            const t = templates[s.id];
            const enabled = t?.enabled !== false;
            return (
              <button key={s.id} onClick={() => setActiveStage(s.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition-all flex items-center gap-2 ${
                  isActive ? 'bg-[#3D6B5E] text-white font-semibold' : 'text-[#555] hover:bg-[#F5F3F0]'
                }`}>
                <span className="text-[16px]">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{s.label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-white/60' : 'text-[#999]'}`}>{s.trigger}</div>
                </div>
                {!enabled && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold">OFF</span>}
              </button>
            );
          })}

          {/* Config section */}
          <div className="border-t border-[#E8E4DB] pt-3 mt-3">
            <p className="text-[10px] font-bold text-[#999] uppercase mb-2 px-1">Configurare</p>
            <div className="space-y-2 px-1">
              <div>
                <label className="block text-[9px] text-[#888] uppercase mb-0.5">Nume expeditor</label>
                <input type="text" value={config.senderName} onChange={e => setConfig(p => ({ ...p, senderName: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-[#E0D8D0] rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-[#3D6B5E]/30" />
              </div>
              <div>
                <label className="block text-[9px] text-[#888] uppercase mb-0.5">Email expeditor</label>
                <input type="email" value={config.senderEmail} onChange={e => setConfig(p => ({ ...p, senderEmail: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-[#E0D8D0] rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-[#3D6B5E]/30" />
              </div>
              <div>
                <label className="block text-[9px] text-[#888] uppercase mb-0.5">Reply-To (Gmail)</label>
                <input type="email" value={config.replyTo} onChange={e => setConfig(p => ({ ...p, replyTo: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-[#E0D8D0] rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-[#3D6B5E]/30" />
              </div>
              <div>
                <label className="block text-[9px] text-[#888] uppercase mb-0.5">Worker URL</label>
                <input type="url" value={config.workerUrl} onChange={e => setConfig(p => ({ ...p, workerUrl: e.target.value }))} placeholder="https://email.fotocarte.workers.dev"
                  className="w-full px-2 py-1.5 border border-[#E0D8D0] rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-[#3D6B5E]/30" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Template editor ── */}
        <div className="flex-1 bg-white rounded-xl border border-[#EBEBEB] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                {stage?.icon} {stage?.label}
              </h2>
              <p className="text-[12px] text-[#888]">Declanșare: {stage?.trigger}</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[12px] text-[#888]">{tpl.enabled !== false ? 'Activ' : 'Dezactivat'}</span>
              <button onClick={() => updateTemplate('enabled', !tpl.enabled)}
                className={`w-10 h-6 rounded-full transition-colors relative ${tpl.enabled !== false ? 'bg-[#3D6B5E]' : 'bg-[#DDD]'}`}>
                <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all ${tpl.enabled !== false ? 'left-[19px]' : 'left-[3px]'}`} style={{ width: 18, height: 18 }} />
              </button>
            </label>
          </div>

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Subiect email</label>
            <input type="text" value={tpl.subject} onChange={e => updateTemplate('subject', e.target.value)}
              className="w-full px-3 py-2 border border-[#E0D8D0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
          </div>

          {/* Body */}
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Conținut email</label>
            <textarea value={tpl.body} onChange={e => updateTemplate('body', e.target.value)}
              rows={14} className="w-full px-3 py-2 border border-[#E0D8D0] rounded-lg text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
          </div>

          {/* Variables */}
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Variabile disponibile</label>
            <div className="flex flex-wrap gap-1.5">
              {(stage?.variables || []).map(v => (
                <button key={v} onClick={() => {
                  navigator.clipboard.writeText(`{{${v}}}`);
                }} className="px-2 py-1 bg-[#F0EDE6] rounded text-[11px] font-mono text-[#3D6B5E] hover:bg-[#E8E4DB] transition cursor-copy"
                  title="Click pentru a copia">
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Preview — responsive toggle */}
          <div className="border-t border-[#E8E4DB] pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-[#888] uppercase">Previzualizare email</p>
              <div className="flex gap-1 bg-[#F0EDE6] rounded-lg p-0.5">
                <button onClick={() => updateTemplate('_previewMode', 'desktop')}
                  className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${tpl._previewMode !== 'mobile' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#888]'}`}>
                  Desktop
                </button>
                <button onClick={() => updateTemplate('_previewMode', 'mobile')}
                  className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${tpl._previewMode === 'mobile' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#888]'}`}>
                  Telefon
                </button>
              </div>
            </div>
            <div className={`mx-auto bg-[#F0F0F0] rounded-xl p-3 flex justify-center ${tpl._previewMode === 'mobile' ? 'max-w-[375px]' : ''}`}>
              <div className="w-full bg-white rounded-lg overflow-hidden shadow-sm" style={{ maxWidth: tpl._previewMode === 'mobile' ? 345 : 600 }}>
                {/* Email header with logo */}
                <div style={{ background: '#3D6B5E', padding: '24px 24px 20px', textAlign: 'center' }}>
                  <div style={{ color: '#fff', fontSize: 22, fontFamily: 'Georgia, serif', letterSpacing: 0.5 }}>fotocarte.</div>
                </div>
                {/* Subject */}
                <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #F0EDE6' }}>
                  <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Subiect</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', paddingBottom: 12 }}>
                    {tpl.subject.replace(/\{\{clientName\}\}/g, 'Maria').replace(/\{\{productName\}\}/g, 'Pagini Groase').replace(/\{\{(\w+)\}\}/g, (_, v) => `[${v}]`)}
                  </div>
                </div>
                {/* Body */}
                <div style={{ padding: '20px 24px', fontSize: 14, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {tpl.body
                    .replace(/\{\{clientName\}\}/g, 'Maria')
                    .replace(/\{\{orderId\}\}/g, 'FC-2026-0042')
                    .replace(/\{\{productName\}\}/g, 'Pagini Groase')
                    .replace(/\{\{format\}\}/g, '20×20')
                    .replace(/\{\{pages\}\}/g, '40')
                    .replace(/\{\{price\}\}/g, '2028')
                    .replace(/\{\{designerName\}\}/g, 'Ana')
                    .replace(/\{\{estimateDays\}\}/g, '3-5')
                    .replace(/\{\{estimateDate\}\}/g, '05 mai 2026')
                    .replace(/\{\{previewUrl\}\}/g, 'fotocarte-app.web.app/app/editor/...')
                    .replace(/\{\{trackingNumber\}\}/g, 'MD12345678')
                    .replace(/\{\{courierName\}\}/g, 'Nova Poshta')
                    .replace(/\{\{reviewUrl\}\}/g, 'fotocarte-app.web.app/review')
                    .replace(/\{\{siteUrl\}\}/g, 'fotocarte-app.web.app')
                    .replace(/\{\{(\w+)\}\}/g, (_, v) => `[${v}]`)}
                </div>
                {/* Footer */}
                <div style={{ padding: '16px 24px', background: '#FAF8F5', borderTop: '1px solid #F0EDE6', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Fotocarte · Chișinău, Moldova</div>
                  <div style={{ fontSize: 10, color: '#BBB' }}>Ai primit acest email deoarece ai plasat o comandă pe fotocarte-app.web.app</div>
                </div>
              </div>
            </div>
          </div>

          {/* Test email */}
          <div className="border-t border-[#E8E4DB] pt-4 mt-4">
            <p className="text-[11px] font-semibold text-[#888] uppercase mb-2">Trimite email de test</p>
            <div className="flex gap-2">
              <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="email@test.com"
                className="flex-1 px-3 py-2 border border-[#E0D8D0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
              <button onClick={sendTestEmail} disabled={sendingTest || !testEmail.trim()}
                className="px-4 py-2 bg-[#F0EDE6] text-[#3D6B5E] text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-[#E8E4DB] transition">
                {sendingTest ? 'Se trimite...' : 'Trimite test'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ NOTIFICATION LOG ═══ */}
      <NotificationLog />
    </div>
  );
}

function NotificationLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'notifications_log'), orderBy('sentAt', 'desc'), limit(50)));
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const TYPE_LABELS = {
    draft_reminder: { label: 'Album neterminat', color: 'text-amber-700 bg-amber-50' },
    almost_done_reminder: { label: 'Aproape gata', color: 'text-purple-700 bg-purple-50' },
    payment_reminder_1: { label: 'Achitare #1', color: 'text-orange-700 bg-orange-50' },
    payment_reminder_2: { label: 'Achitare #2', color: 'text-red-700 bg-red-50' },
    payment_confirmed: { label: 'Plată confirmată', color: 'text-green-700 bg-green-50' },
    review_request: { label: 'Cerere recenzie', color: 'text-blue-700 bg-blue-50' },
    order_confirmed: { label: 'Comandă confirmată', color: 'text-green-700 bg-green-50' },
    designer_assigned: { label: 'Designer asignat', color: 'text-indigo-700 bg-indigo-50' },
    ready_for_approval: { label: 'Macheta gata', color: 'text-purple-700 bg-purple-50' },
    sent_to_print: { label: 'La tipar', color: 'text-teal-700 bg-teal-50' },
    in_print: { label: 'Se tipărește', color: 'text-teal-700 bg-teal-50' },
    shipped: { label: 'Expediat', color: 'text-blue-700 bg-blue-50' },
    delivered: { label: 'Livrat', color: 'text-emerald-700 bg-emerald-50' },
  };

  if (loading) return null;
  if (logs.length === 0) return (
    <div className="mt-6 bg-white rounded-xl border border-[#EBEBEB] p-5 text-center text-[#999] text-sm">
      Nicio notificare trimisă încă.
    </div>
  );

  return (
    <div className="mt-6">
      <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">Notificări trimise ({logs.length})</h2>
      <div className="bg-white rounded-xl border border-[#EBEBEB] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] text-gray-400 border-b uppercase tracking-wider">
              <th className="px-4 py-2.5">Tip</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Subiect</th>
              <th className="px-4 py-2.5">Comandă</th>
              <th className="px-4 py-2.5">Data</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const info = TYPE_LABELS[log.type] || { label: log.type, color: 'text-gray-600 bg-gray-50' };
              const date = log.sentAt?.toDate ? log.sentAt.toDate() : new Date(log.sentAt);
              return (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${info.color}`}>{info.label}</span>
                  </td>
                  <td className="px-4 py-2 text-[12px] text-gray-700">{log.email}</td>
                  <td className="px-4 py-2 text-[12px] text-gray-500 truncate max-w-[200px]">{log.subject}</td>
                  <td className="px-4 py-2 text-[11px] font-mono text-[#3D6B5E]">{log.orderId || '—'}</td>
                  <td className="px-4 py-2 text-[11px] text-gray-400">
                    {date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
