/**
 * Product dimensions — FIREBASE-FIRST.
 * Firestore = source of truth. localStorage = cache.
 * DEFAULTS hardcoded as fallback (these never get lost).
 */

const cmToPx = (cm) => Math.round((cm / 2.54) * 300);

/* ── Default dimensions (hardcoded fallback) ── */
const DEFAULTS = {
  'pagini-groase': {
    '20x20': {
      cover:  { width: cmToPx(20 * 2 + 2.6), height: cmToPx(20 + 3), bleed: 15, spine: 26 },
      spread: { width: cmToPx(20 * 2),        height: cmToPx(20),     bleed: 3 },
    },
    '20x30': {
      cover:  { width: cmToPx(20 * 2 + 2.6), height: cmToPx(30 + 3), bleed: 15, spine: 26 },
      spread: { width: cmToPx(20 * 2),        height: cmToPx(30),     bleed: 3 },
    },
    '23x23': {
      cover:  { width: cmToPx(23 * 2 + 2.6), height: cmToPx(23 + 3), bleed: 15, spine: 26 },
      spread: { width: cmToPx(23 * 2),        height: cmToPx(23),     bleed: 3 },
    },
    '30x30': {
      cover:  { width: cmToPx(30 * 2 + 2.6), height: cmToPx(30 + 3), bleed: 15, spine: 26 },
      spread: { width: cmToPx(30 * 2),        height: cmToPx(30),     bleed: 3 },
    },
  },
  'pagini-subtiri': {
    '20x20': {
      cover:  { width: cmToPx(20 * 2 + 1.0), height: cmToPx(20 + 3), bleed: 15, spine: 10 },
      spread: { width: cmToPx(20 * 2),        height: cmToPx(20),     bleed: 3, cotor: 5 },
    },
    '20x30': {
      cover:  { width: cmToPx(20 * 2 + 1.0), height: cmToPx(30 + 3), bleed: 15, spine: 10 },
      spread: { width: cmToPx(20 * 2),        height: cmToPx(30),     bleed: 3, cotor: 5 },
    },
    '23x23': {
      cover:  { width: cmToPx(23 * 2 + 1.0), height: cmToPx(23 + 3), bleed: 15, spine: 10 },
      spread: { width: cmToPx(23 * 2),        height: cmToPx(23),     bleed: 3, cotor: 5 },
    },
    '30x30': {
      cover:  { width: cmToPx(30 * 2 + 1.0), height: cmToPx(30 + 3), bleed: 15, spine: 10 },
      spread: { width: cmToPx(30 * 2),        height: cmToPx(30),     bleed: 3, cotor: 5 },
    },
  },
};

const CACHE_KEY = 'momentive-dimensions';
const ACTIVE_CACHE_KEY = 'momentive-active-formats';

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }
function readCache(key) { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; } }
function writeCache(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} }

// ── READ: sync (cache → defaults) ──
export function getAllDimensions() {
  return readCache(CACHE_KEY) || deepClone(DEFAULTS);
}

export function getDimensions(productSlug, format) {
  const all = getAllDimensions();
  const fmt = format.replace('×', 'x');
  return all[productSlug]?.[fmt] || null;
}

// ── READ: async from Firestore ──
export async function getAllDimensionsAsync() {
  try {
    const { db } = await import('../firebase/config');
    if (!db) return getAllDimensions();
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'settings', 'dimensions'));
    if (snap.exists()) {
      const data = snap.data();
      delete data.updatedAt;
      writeCache(CACHE_KEY, data);
      return data;
    }
  } catch {}
  return getAllDimensions();
}

// ── WRITE: Firestore first, then cache ──
export async function saveDimensions(dims) {
  try {
    const { db } = await import('../firebase/config');
    if (db) {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'dimensions'), { ...dims, updatedAt: new Date().toISOString() });
    }
  } catch {}
  writeCache(CACHE_KEY, dims);
}

export function resetDimensions() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

// ── Active formats ──
export function getActiveFormats() {
  return readCache(ACTIVE_CACHE_KEY);
}

export function getActiveFormatsForProduct(productSlug) {
  const active = getActiveFormats();
  if (!active) return null;
  const productActive = active[productSlug];
  if (!productActive) return null;
  return Object.entries(productActive).filter(([, v]) => v).map(([k]) => k);
}

// ── WRITE: Firestore first ──
export async function saveActiveFormats(active) {
  try {
    const { db } = await import('../firebase/config');
    if (db) {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'activeFormats'), { ...active, updatedAt: new Date().toISOString() });
    }
  } catch {}
  writeCache(ACTIVE_CACHE_KEY, active);
}

// ── Load from Firestore ──
export async function loadActiveFormatsFromFirestore() {
  try {
    const { db } = await import('../firebase/config');
    if (!db) return null;
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'settings', 'activeFormats'));
    if (snap.exists()) {
      const data = snap.data();
      delete data.updatedAt;
      writeCache(ACTIVE_CACHE_KEY, data);
      return data;
    }
  } catch {}
  return null;
}

// Legacy alias
export const syncActiveFormatsToFirestore = saveActiveFormats;
