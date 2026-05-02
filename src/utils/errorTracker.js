/**
 * Error Tracker & Funnel Monitor
 * Captures JS errors + tracks user funnel steps → Firestore
 */

let _initialized = false;
let _sessionId = null;

function getSessionId() {
  if (_sessionId) return _sessionId;
  _sessionId = sessionStorage.getItem('_err_sid');
  if (!_sessionId) {
    _sessionId = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    sessionStorage.setItem('_err_sid', _sessionId);
  }
  return _sessionId;
}

function getDevice() {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return 'mobile';
  if (/Tablet|iPad/i.test(ua)) return 'tablet';
  return 'desktop';
}

function getBrowser() {
  const ua = navigator.userAgent;
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Edg/i.test(ua)) return 'Edge';
  return 'Altul';
}

let _authStore = null;

function getClientInfo() {
  try {
    if (!_authStore) return { clientName: null, clientPhone: null };
    const state = _authStore.getState();
    return {
      clientName: state.clientName || null,
      clientPhone: state.clientPhone || null,
    };
  } catch {
    return { clientName: null, clientPhone: null };
  }
}

function isAdminPage() {
  return window.location.pathname.includes('/admin_panel');
}

async function writeToFirestore(collectionName, data) {
  try {
    const { db } = await import('../firebase/config');
    if (!db) return;
    const { collection, addDoc } = await import('firebase/firestore');
    await addDoc(collection(db, collectionName), data);
  } catch {}
}

/* ── Auto Error Capture ── */

async function captureError(message, stack, severity = 'error') {
  if (isAdminPage()) return;

  const client = getClientInfo();
  await writeToFirestore('errors', {
    message: String(message).slice(0, 500),
    stack: String(stack || '').slice(0, 2000),
    page: window.location.pathname,
    device: getDevice(),
    browser: getBrowser(),
    screenW: window.innerWidth,
    screenH: window.innerHeight,
    clientName: client.clientName,
    clientPhone: client.clientPhone,
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
    severity,
  });
}

/* ── Funnel Step Tracking ── */

const _trackedSteps = new Set();

export async function trackStep(step, meta = null) {
  if (isAdminPage()) return;

  // Deduplicate per session (visit, select_product, open_editor, checkout only fire once)
  const onceSteps = ['visit', 'select_product', 'open_editor', 'checkout', 'order_placed'];
  if (onceSteps.includes(step)) {
    const key = `${getSessionId()}_${step}`;
    if (_trackedSteps.has(key)) return;
    _trackedSteps.add(key);
  }

  const client = getClientInfo();
  await writeToFirestore('funnel', {
    step,
    sessionId: getSessionId(),
    device: getDevice(),
    browser: getBrowser(),
    clientName: client.clientName,
    clientPhone: client.clientPhone,
    timestamp: new Date().toISOString(),
    meta: meta || null,
  });
}

/* ── Initialize ── */

export function initErrorTracker() {
  if (_initialized) return;
  _initialized = true;

  // Lazy-load auth store to avoid circular deps
  import('../stores/useAuthStore').then(mod => { _authStore = mod.default || mod; }).catch(() => {});

  // Track initial visit
  trackStep('visit');

  // Global error handler
  window.addEventListener('error', (event) => {
    const msg = event.message || 'Unknown error';
    const stack = event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`;
    captureError(msg, stack, 'error');
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || 'Unhandled rejection');
    const stack = reason?.stack || '';
    captureError(msg, stack, 'warning');
  });
}

export default { initErrorTracker, trackStep };
