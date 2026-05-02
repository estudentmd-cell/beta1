/**
 * Meta Pixel + Conversions API — modul centralizat
 *
 * Client-side: fbq() calls cu Advanced Matching + deduplicare
 * Server-side: Cloud Function sendMetaConversion (CAPI)
 *
 * Pixel ID: 4243044435969286
 */

const PIXEL_ID = '4243044435969286';

// ── Consent ──────────────────────────────────────────────
let consentGranted = null; // null = not decided, true/false

export function getConsent() {
  if (consentGranted !== null) return consentGranted;
  const stored = localStorage.getItem('fc_cookie_consent');
  if (stored === 'granted') { consentGranted = true; return true; }
  if (stored === 'denied') { consentGranted = false; return false; }
  return null;
}

export function setConsent(granted) {
  consentGranted = granted;
  localStorage.setItem('fc_cookie_consent', granted ? 'granted' : 'denied');
  if (granted) {
    // Re-init pixel with any stored user data
    initPixel();
  }
}

// ── Generate event ID for deduplication ──────────────────
function generateEventId(eventName) {
  return `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Read fbp / fbc cookies (NEVER hash these) ───────────
export function getFbp() {
  const match = document.cookie.match(/(?:^|;\s*)_fbp=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getFbc() {
  // 1. Check _fbc cookie (set by Meta Pixel automatically)
  const match = document.cookie.match(/(?:^|;\s*)_fbc=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);
  // 2. Check current URL for fbclid
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get('fbclid');
  if (fbclid) return `fb.1.${Date.now()}.${fbclid}`;
  // 3. Fallback: use saved fbclid from session (survives SPA navigation)
  const savedFbclid = sessionStorage.getItem('fc_fbclid');
  if (savedFbclid) return `fb.1.${Date.now()}.${savedFbclid}`;
  return null;
}

// ── Store fbclid from landing URL ────────────────────────
export function captureFbclid() {
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get('fbclid');
  if (fbclid) {
    sessionStorage.setItem('fc_fbclid', fbclid);
    sessionStorage.setItem('fc_landing_url', window.location.href);
  }
}

// ── Init Pixel with Advanced Matching ────────────────────
let pixelInitialized = false;

export function initPixel(userData) {
  if (typeof window === 'undefined' || !window.fbq) return;
  if (!getConsent()) return;

  // Check if already initialized by index.html
  if (window.__fbPixelInited && !userData) {
    pixelInitialized = true;
    return;
  }

  // Advanced Matching — user data se trimite la init
  // Pixel-ul hashează automat (SHA-256) — NU hashăm noi
  const matchData = {};
  if (userData?.email) matchData.em = userData.email.toLowerCase().trim();
  if (userData?.phone) {
    // Format: digits only, cu country code
    const clean = userData.phone.replace(/[^\d+]/g, '');
    matchData.ph = clean.startsWith('+') ? clean.slice(1) : clean;
  }
  if (userData?.name) {
    const parts = userData.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      matchData.fn = parts[0].toLowerCase();
      matchData.ln = parts.slice(1).join(' ').toLowerCase();
    }
  }
  if (userData?.externalId) matchData.external_id = userData.externalId;

  if (Object.keys(matchData).length > 0 || !pixelInitialized) {
    window.fbq('init', PIXEL_ID, matchData);
    pixelInitialized = true;
    window.__fbPixelInited = true;
  }
}

// ── Update user data (after login/register) ──────────────
export function updateUserData(userData) {
  if (!getConsent()) return;
  // Re-init with new user data for better matching
  initPixel(userData);
}

// ── Track standard event ─────────────────────────────────
export function trackEvent(eventName, params = {}, options = {}) {
  if (!getConsent()) return null;
  if (typeof window === 'undefined' || !window.fbq) return null;

  const eventId = options.eventId || generateEventId(eventName);

  window.fbq('track', eventName, params, { eventID: eventId });

  return eventId;
}

// ── Track custom event ───────────────────────────────────
export function trackCustomEvent(eventName, params = {}) {
  if (!getConsent()) return null;
  if (typeof window === 'undefined' || !window.fbq) return null;

  const eventId = generateEventId(eventName);
  window.fbq('trackCustom', eventName, params, { eventID: eventId });

  return eventId;
}

// ── Send server-side event via Cloud Function (CAPI) ─────
export async function sendServerEvent(eventName, eventId, userData = {}, customData = {}) {
  if (!getConsent()) return;

  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions(undefined, 'europe-west1');
    const sendMetaConversion = httpsCallable(functions, 'sendMetaConversion');

    await sendMetaConversion({
      eventName,
      eventId,
      sourceUrl: window.location.href,
      fbp: getFbp(),
      fbc: getFbc(),
      clientUserAgent: navigator.userAgent, // Real browser UA, not Firebase SDK
      userData: {
        email: userData.email?.toLowerCase().trim(),
        phone: userData.phone,
        firstName: userData.firstName,
        lastName: userData.lastName,
        externalId: userData.externalId,
        city: userData.city,
        country: userData.country,
        zip: userData.zip,
      },
      customData,
    });
  } catch (e) {
    console.warn('[MetaPixel] CAPI error:', e);
  }
}

// ══════════════════════════════════════════════════════════
//  HIGH-LEVEL TRACKING FUNCTIONS (folosite în componente)
// ══════════════════════════════════════════════════════════

/** SPA PageView — la fiecare navigare */
export function trackPageView() {
  if (!getConsent()) return;
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', 'PageView');
}

/** ViewContent — produs, colecție, landing sections */
export function trackViewContent(data) {
  return trackEvent('ViewContent', {
    content_name: data.contentName,
    content_type: data.contentType || 'product',
    content_ids: data.contentIds ? [data.contentIds] : undefined,
    value: data.value,
    currency: data.value ? 'MDL' : undefined,
  });
}

/** AddToCart — clientul decide să cumpere (continuă la plată) */
export function trackAddToCart(data) {
  // GA4 via dataLayer (GTM)
  window.dataLayer?.push({ ecommerce: null }); // clear previous
  window.dataLayer?.push({
    event: 'add_to_cart',
    ecommerce: {
      currency: 'MDL',
      value: data.price,
      items: [{
        item_id: data.productSlug,
        item_name: data.productName,
        price: data.price,
        quantity: 1,
        item_variant: data.format,
        item_category: data.service || 'album',
      }],
    },
  });

  const eventId = trackEvent('AddToCart', {
    content_name: data.productName,
    content_ids: [data.productSlug],
    content_type: 'product',
    value: data.price,
    currency: 'MDL',
    contents: [{
      id: data.productSlug,
      quantity: 1,
      item_price: data.price,
    }],
  });

  // CAPI duplicate — server-side
  if (eventId) {
    sendServerEvent('AddToCart', eventId, data.user, {
      value: data.price,
      currency: 'MDL',
      contentName: data.productName,
      contentIds: [data.productSlug],
      contentType: 'product',
    });
  }

  return eventId;
}

/** InitiateCheckout — intrare pe checkout */
export function trackInitiateCheckout(data) {
  // GA4 via dataLayer (GTM)
  window.dataLayer?.push({ ecommerce: null });
  window.dataLayer?.push({
    event: 'begin_checkout',
    ecommerce: {
      currency: 'MDL',
      value: data.price,
      items: [{
        item_id: data.productSlug,
        item_name: data.productName,
        price: data.price,
        quantity: 1,
      }],
    },
  });

  const eventId = trackEvent('InitiateCheckout', {
    content_name: data.productName,
    content_ids: [data.productSlug],
    value: data.price,
    currency: 'MDL',
    num_items: 1,
  });

  if (eventId) {
    sendServerEvent('InitiateCheckout', eventId, data.user, {
      value: data.price,
      currency: 'MDL',
      contentName: data.productName,
      numItems: 1,
    });
  }

  return eventId;
}

/** Purchase — comandă plasată */
export function trackPurchase(data) {
  // GA4 via dataLayer (GTM)
  window.dataLayer?.push({ ecommerce: null });
  window.dataLayer?.push({
    event: 'purchase',
    ecommerce: {
      transaction_id: data.orderNumber,
      currency: 'MDL',
      value: data.price,
      items: [{
        item_id: data.productSlug,
        item_name: data.productName,
        price: data.price,
        quantity: 1,
        item_variant: data.format,
      }],
    },
  });

  const eventId = trackEvent('Purchase', {
    content_name: data.productName,
    content_ids: [data.orderId],
    content_type: 'product',
    value: data.price,
    currency: 'MDL',
    order_id: data.orderNumber,
    num_items: 1,
    contents: [{
      id: data.productSlug,
      quantity: 1,
      item_price: data.price,
    }],
  }, { eventId: `purchase_${data.orderId}` });

  // CAPI — cel mai important event server-side
  if (eventId) {
    sendServerEvent('Purchase', eventId, data.user, {
      value: data.price,
      currency: 'MDL',
      contentName: data.productName,
      contentIds: [data.orderId],
      contentType: 'product',
      orderId: data.orderNumber,
      numItems: 1,
    });
  }

  return eventId;
}

/** Lead — cont nou creat */
export function trackLead(data) {
  // GA4 via dataLayer (GTM)
  window.dataLayer?.push({ event: 'sign_up', method: 'email_code' });
  const eventId = trackEvent('Lead', {
    content_name: 'account_created',
    value: 0,
    currency: 'MDL',
  });

  if (eventId) {
    sendServerEvent('Lead', eventId, data.user, {
      contentName: 'account_created',
    });
  }

  return eventId;
}

/** Contact — login existent / email submitted */
export function trackContact(data) {
  return trackEvent('Contact', {
    content_name: data.step || 'email_submitted',
  });
}

/** Service selected — custom event */
export function trackServiceSelected(service) {
  return trackCustomEvent('ServiceSelected', {
    service_type: service, // 'designer' | 'self'
  });
}

/** Photos uploaded — custom event */
export function trackPhotosUploaded(count) {
  return trackCustomEvent('PhotosUploaded', {
    photo_count: count,
  });
}
