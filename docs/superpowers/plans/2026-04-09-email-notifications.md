# Email Notifications via EmailJS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send automatic email notifications to clients via EmailJS when an order is placed (confirmation + receipt) and when the maketa is ready for approval (with cover preview + link to cabinet).

**Architecture:** One generic EmailJS template receives full HTML content from the app. Two email generators build responsive, Apple-style HTML emails. Email sending is triggered from CheckoutScreen (order confirmation) and from admin status change flows (maketa ready). A config file holds all editable text strings.

**Tech Stack:** EmailJS (`@emailjs/browser` — already installed), inline HTML email with table-based responsive layout.

**Site URL:** `https://fotocarte-app.web.app` (Firebase Hosting)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/services/emailService.js` | Create | EmailJS send wrapper + HTML email generators |
| `src/config/emailTemplates.js` | Create | All editable text strings, subjects, labels |
| `src/screens/CheckoutScreen.jsx` | Modify (line ~91) | Call sendOrderConfirmationEmail after order created |
| `src/components/admin/DeTrimis.jsx` | Modify (line ~33) | Call sendMaketaReadyEmail when sending to client |
| `src/components/admin/AdminOrders.jsx` | Modify (line ~428) | Call sendMaketaReadyEmail on inline status change |
| `src/components/admin/AdminOrderDetail.jsx` | Modify (line ~210) | Call sendMaketaReadyEmail on detail page status change |

---

### Task 1: Create Email Text Config

**Files:**
- Create: `src/config/emailTemplates.js`

- [ ] **Step 1: Create the config file with all email text strings**

```js
// src/config/emailTemplates.js
// All email text in one place — edit here, applies everywhere.

export const SITE_URL = 'https://fotocarte-app.web.app';
export const BRAND_NAME = 'fotocarte.';
export const BRAND_COLOR = '#3D6B5E';
export const SUPPORT_EMAIL = 'hello@momentive.md';
export const SUPPORT_PHONE = '+373 60 595 984';

export const ORDER_CONFIRMATION = {
  subject: (orderId) => `Comanda ta #${orderId} a fost plasată`,
  heading: 'Mulțumim pentru comandă!',
  intro: (clientName) => `Salut ${clientName}, comanda ta a fost înregistrată cu succes.`,
  productLabel: 'Produs',
  formatLabel: 'Format',
  pagesLabel: 'Pagini',
  serviceLabel: 'Serviciu',
  serviceSelf: 'Verificare album',
  serviceDesigner: 'Serviciu designer',
  totalLabel: 'Total',
  paymentLabel: 'Plată',
  paymentCard: 'Card bancar',
  paymentTransfer: 'Transfer bancar',
  addressLabel: 'Adresa de livrare',
  deliveryNote: 'Livrare estimată în 18 zile lucrătoare',
  footerText: 'Dacă ai întrebări, scrie-ne la',
};

export const MAKETA_READY = {
  subject: (orderId) => `Macheta albumului tău #${orderId} este gata!`,
  heading: 'Albumul tău este gata!',
  intro: (clientName) => `Salut ${clientName}, designerul a finalizat macheta albumului tău.`,
  description: 'Verifică albumul și aprobă-l sau cere modificări.',
  buttonText: 'Vezi albumul tău',
  buttonUrl: '/app/cabinet',
  footerText: 'Dacă ai întrebări, scrie-ne la',
};
```

- [ ] **Step 2: Verify file was created correctly**

Run: `head -5 src/config/emailTemplates.js`
Expected: First 5 lines of the config file visible.

---

### Task 2: Create Email Service with HTML Generators

**Files:**
- Create: `src/services/emailService.js`

- [ ] **Step 1: Create the email service file**

This file contains:
1. `sendEmail(to, subject, htmlBody)` — generic EmailJS sender
2. `buildOrderConfirmationHTML(orderData)` — generates responsive HTML for order confirmation
3. `buildMaketaReadyHTML(orderData, coverImageUrl)` — generates responsive HTML for maketa ready
4. `sendOrderConfirmationEmail(orderData)` — public API
5. `sendMaketaReadyEmail(orderData)` — public API

```js
// src/services/emailService.js
import emailjs from '@emailjs/browser';
import {
  SITE_URL, BRAND_NAME, BRAND_COLOR, SUPPORT_EMAIL, SUPPORT_PHONE,
  ORDER_CONFIRMATION as OC,
  MAKETA_READY as MR,
} from '../config/emailTemplates';

const SERVICE_ID = 'service_riu4h4v';
const TEMPLATE_ID = 'template_generic_html'; // ← new generic template in EmailJS
const PUBLIC_KEY = 'G5ZCle95xNR-1_AFo';

// ─── Generic sender ─────────────────────────────────────────

async function sendEmail(to, subject, htmlBody) {
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_email: to,
      subject,
      html_body: htmlBody,
    }, PUBLIC_KEY);
    console.log(`[Email] Sent "${subject}" to ${to}`);
  } catch (e) {
    console.warn('[Email] Send failed:', e);
    // Don't throw — email failure shouldn't block order flow
  }
}

// ─── Shared HTML parts ──────────────────────────────────────

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;overflow:hidden;">
${content}
</table>
<!-- Footer -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:24px 32px;text-align:center;">
<p style="margin:0 0 4px;font-size:13px;color:#86868B;">${OC.footerText} <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_COLOR};text-decoration:none;">${SUPPORT_EMAIL}</a></p>
<p style="margin:0;font-size:12px;color:#AEAEB2;">${SUPPORT_PHONE}</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function logoRow() {
  return `<tr><td style="padding:32px 32px 20px;text-align:center;">
<span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#1A1A1A;">fotocarte<span style="color:${BRAND_COLOR};">.</span></span>
</td></tr>`;
}

function divider() {
  return `<tr><td style="padding:0 32px;"><div style="border-top:1px solid #F0F0F0;"></div></td></tr>`;
}

function formatPrice(n) {
  return Number(n).toFixed(2).replace('.', ',') + ' lei';
}

// ─── Order Confirmation HTML ────────────────────────────────

function buildOrderConfirmationHTML(order) {
  const serviceText = order.orderType === 'self' ? OC.serviceSelf : OC.serviceDesigner;
  const paymentText = order.paymentMethod === 'card' ? OC.paymentCard : OC.paymentTransfer;
  const pages = (order.spreads?.length || 0) * 2 || order.productConfig?.initialPages || 0;
  const address = order.address || {};
  const addressText = [address.street, address.city, address.zip, address.country === 'RO' ? 'România' : 'Moldova'].filter(Boolean).join(', ');

  const detailRow = (label, value) =>
    `<tr>
      <td style="padding:6px 0;font-size:14px;color:#86868B;width:40%;">${label}</td>
      <td style="padding:6px 0;font-size:14px;color:#1D1D1F;font-weight:500;text-align:right;">${value}</td>
    </tr>`;

  return emailWrapper(`
    ${logoRow()}
    <!-- Heading -->
    <tr><td style="padding:0 32px 8px;text-align:center;">
      <h1 style="margin:0;font-size:22px;font-weight:600;color:#1D1D1F;">${OC.heading}</h1>
    </td></tr>
    <tr><td style="padding:0 32px 24px;text-align:center;">
      <p style="margin:0;font-size:15px;color:#86868B;line-height:1.5;">${OC.intro(order.clientName)}</p>
    </td></tr>
    ${divider()}
    <!-- Order details -->
    <tr><td style="padding:20px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${detailRow(OC.productLabel, order.productConfig?.name || 'Fotocarte')}
        ${detailRow(OC.formatLabel, order.productConfig?.format || '—')}
        ${detailRow(OC.pagesLabel, pages)}
        ${detailRow(OC.serviceLabel, serviceText)}
        ${detailRow(OC.paymentLabel, paymentText)}
      </table>
    </td></tr>
    ${divider()}
    <!-- Total -->
    <tr><td style="padding:20px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:16px;font-weight:600;color:#1D1D1F;">${OC.totalLabel}</td>
          <td style="font-size:22px;font-weight:700;color:#1D1D1F;text-align:right;">${formatPrice(order.priceTotal)}</td>
        </tr>
      </table>
    </td></tr>
    ${divider()}
    <!-- Address -->
    <tr><td style="padding:20px 32px;">
      <p style="margin:0 0 4px;font-size:12px;color:#86868B;text-transform:uppercase;letter-spacing:0.5px;">${OC.addressLabel}</p>
      <p style="margin:0;font-size:14px;color:#1D1D1F;line-height:1.5;">${addressText}</p>
    </td></tr>
    <!-- Delivery note -->
    <tr><td style="padding:16px 32px 32px;text-align:center;">
      <div style="background:#F5F5F7;border-radius:12px;padding:14px 20px;">
        <p style="margin:0;font-size:13px;color:#86868B;">📦 ${OC.deliveryNote}</p>
      </div>
    </td></tr>
  `);
}

// ─── Maketa Ready HTML ──────────────────────────────────────

function buildMaketaReadyHTML(order) {
  // Try to find a cover preview image from the order photos
  const coverImg = order.photos?.find(p => p.thumbData || p.previewUrl || p.url);
  const coverUrl = coverImg ? (coverImg.url || coverImg.previewUrl || coverImg.thumbData || '') : '';
  const cabinetUrl = `${SITE_URL}${MR.buttonUrl}`;

  const coverBlock = coverUrl && !coverUrl.startsWith('data:')
    ? `<tr><td style="padding:0 32px 20px;text-align:center;">
        <img src="${coverUrl}" alt="Preview album" width="260" style="width:260px;max-width:100%;height:auto;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);" />
      </td></tr>`
    : '';

  return emailWrapper(`
    ${logoRow()}
    <!-- Heading -->
    <tr><td style="padding:0 32px 8px;text-align:center;">
      <h1 style="margin:0;font-size:22px;font-weight:600;color:#1D1D1F;">${MR.heading}</h1>
    </td></tr>
    <tr><td style="padding:0 32px 24px;text-align:center;">
      <p style="margin:0;font-size:15px;color:#86868B;line-height:1.5;">${MR.intro(order.clientName || 'Client')}</p>
      <p style="margin:8px 0 0;font-size:14px;color:#86868B;">${MR.description}</p>
    </td></tr>
    <!-- Cover preview -->
    ${coverBlock}
    <!-- CTA Button -->
    <tr><td style="padding:0 32px 32px;text-align:center;">
      <a href="${cabinetUrl}" target="_blank"
         style="display:inline-block;background:${BRAND_COLOR};color:#FFFFFF;font-size:16px;font-weight:600;padding:14px 40px;border-radius:980px;text-decoration:none;letter-spacing:-0.2px;">
        ${MR.buttonText}
      </a>
    </td></tr>
  `);
}

// ─── Public API ─────────────────────────────────────────────

export async function sendOrderConfirmationEmail(orderData) {
  if (!orderData.clientEmail) return;
  const subject = OC.subject(orderData.id);
  const html = buildOrderConfirmationHTML(orderData);
  await sendEmail(orderData.clientEmail, subject, html);
}

export async function sendMaketaReadyEmail(orderData) {
  if (!orderData.clientEmail) return;
  const subject = MR.subject(orderData.id);
  const html = buildMaketaReadyHTML(orderData);
  await sendEmail(orderData.clientEmail, subject, html);
}
```

- [ ] **Step 2: Verify file was created**

Run: `wc -l src/services/emailService.js`
Expected: ~150 lines

---

### Task 3: Create Generic EmailJS Template

**Files:** None (manual step in EmailJS dashboard)

- [ ] **Step 1: Create new template in EmailJS dashboard**

Go to https://dashboard.emailjs.com → Email Templates → Create New Template

Template ID: `template_generic_html`

Template content:
- **Subject:** `{{subject}}`
- **To Email:** `{{to_email}}`
- **Content (HTML):** `{{{html_body}}}` (triple braces = raw HTML, no escaping)

Note: The triple braces `{{{html_body}}}` are critical — double braces would escape the HTML.

- [ ] **Step 2: Test the template by sending a test email from EmailJS dashboard**

---

### Task 4: Integrate Email into Checkout Flow

**Files:**
- Modify: `src/screens/CheckoutScreen.jsx:90-92`

- [ ] **Step 1: Add import at top of CheckoutScreen.jsx**

Add after the existing imports (after line 11):

```js
import { sendOrderConfirmationEmail } from '../services/emailService';
```

- [ ] **Step 2: Add email send after order creation**

In the `placeOrder` function, after `saveProject(orderData)` (line 93), add:

```js
      // Send confirmation email (non-blocking)
      sendOrderConfirmationEmail(orderData).catch(() => {});
```

This goes right after line 93 (`saveProject(orderData);`), before the `createClient` call on line 95. The `.catch(() => {})` ensures email failure doesn't break the checkout.

- [ ] **Step 3: Verify the integration**

Run: `grep -n 'sendOrderConfirmationEmail' src/screens/CheckoutScreen.jsx`
Expected: Two matches — the import and the call.

---

### Task 5: Integrate Email into Admin "Send to Client" Flows

There are 3 places where admin sends maketa to client. All need email.

**Files:**
- Modify: `src/components/admin/DeTrimis.jsx:31-42`
- Modify: `src/components/admin/AdminOrders.jsx:428-440`
- Modify: `src/components/admin/AdminOrderDetail.jsx:208-215`

- [ ] **Step 1: Add import to DeTrimis.jsx**

Add after existing imports (after line 6):

```js
import { sendMaketaReadyEmail } from '../../services/emailService';
```

- [ ] **Step 2: Add email send in DeTrimis.jsx handleSendToClient**

After the `sendUserNotification` call (after line 41), add:

```js
    sendMaketaReadyEmail(order).catch(() => {});
```

- [ ] **Step 3: Add import to AdminOrders.jsx**

Add after existing imports (near line 4):

```js
import { sendMaketaReadyEmail } from '../../services/emailService';
```

- [ ] **Step 4: Add email send in AdminOrders.jsx inline status change**

In the inline button handler around line 436 (after `sendUserNotification`), add:

```js
                              sendMaketaReadyEmail(o).catch(() => {});
```

- [ ] **Step 5: Add import to AdminOrderDetail.jsx**

Add after existing imports (near line 7):

```js
import { sendMaketaReadyEmail } from '../../services/emailService';
```

- [ ] **Step 6: Add email send in AdminOrderDetail.jsx**

After line 211 (after `sendUserNotification` call in the "send to client" handler), add:

```js
    sendMaketaReadyEmail(order).catch(() => {});
```

- [ ] **Step 7: Verify all integrations**

Run: `grep -rn 'sendMaketaReadyEmail' src/`
Expected: 6 matches — 3 imports + 3 calls (DeTrimis, AdminOrders, AdminOrderDetail).

---

### Task 6: Test End-to-End

- [ ] **Step 1: Build the project to verify no compilation errors**

Run: `cd /Users/dumitru/Desktop/INPORTNAT\ WEB\ SITE/fotocarte-demo-90-08apr && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Manual test — place a test order**

1. Open the app locally (`npm run dev`)
2. Go through checkout with a real email address
3. Check inbox — should receive order confirmation email
4. Check it looks correct on mobile (open email on phone)

- [ ] **Step 3: Manual test — send maketa to client from admin**

1. Open admin panel
2. Find a test order in "De trimis"
3. Click "Trimite la client"
4. Check email inbox — should receive maketa ready email with cover preview + button

- [ ] **Step 4: Commit**

```bash
git add src/config/emailTemplates.js src/services/emailService.js src/screens/CheckoutScreen.jsx src/components/admin/DeTrimis.jsx src/components/admin/AdminOrders.jsx src/components/admin/AdminOrderDetail.jsx
git commit -m "feat: add email notifications via EmailJS (order confirmation + maketa ready)"
```
