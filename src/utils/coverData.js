/**
 * Cover template definitions — FIREBASE-FIRST.
 * Firestore = source of truth. localStorage = display cache only.
 * All writes go to Firestore FIRST, cache updated on success.
 */

const CACHE_KEY = 'momentive-cover-templates';

export const COVER_CATEGORIES = [
  { id: 'all', label: 'Toate' },
  { id: 'wedding', label: 'Album foto de nuntă', emoji: '💒' },
  { id: 'family', label: 'Album foto de familie', emoji: '👨‍👩‍👧‍👦' },
  { id: 'kids', label: 'Album pentru copii', emoji: '👶' },
  { id: 'christening', label: 'Album foto de cumetrie', emoji: '👼' },
  { id: 'baptism', label: 'Album foto de botez', emoji: '✝️' },
  { id: 'travel', label: 'Album foto de călătorie', emoji: '✈️' },
  { id: 'vacation', label: 'Album foto de vacanță', emoji: '🌴' },
  { id: 'birthday', label: 'Album foto de zi de naștere', emoji: '🎂' },
  { id: 'school', label: 'Album foto de clasă', emoji: '🎓' },
  { id: 'yearbook', label: 'Album foto anual', emoji: '📅' },
  { id: 'mothers_day', label: 'Ziua Mamei', emoji: '💐' },
  { id: 'fathers_day', label: 'Ziua Tatălui', emoji: '👔' },
  { id: 'valentines', label: 'Ziua Îndrăgostiților', emoji: '💙' },
  { id: 'classic', label: 'Clasic', emoji: '📖' },
  { id: 'minimal', label: 'Minimal', emoji: '◻️' },
];

import { db } from '../firebase/config';

// ── Cache helpers (used ONLY as offline fallback, never for initial render) ──
function readCache() {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const arr = JSON.parse(stored);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch {}
  return [];
}

function writeCache(templates) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(templates)); } catch {}
}

// In-memory cache — stores latest Firestore response within current session
let _memoryCache = [];

// ── READ: sync — returns in-memory data from current session only ──
// Returns [] on first load (forces skeleton), never stale localStorage data
export function getAllCoverTemplates() {
  return _memoryCache;
}

// ── READ: async from Firestore (source of truth), force server fetch ──
export async function getAllCoverTemplatesAsync() {
  if (!db) return readCache(); // offline-only fallback
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, 'cover-templates'));
    const templates = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    templates.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.name || '').localeCompare(b.name || ''));
    _memoryCache = templates;
    writeCache(templates); // update localStorage for offline fallback
    return templates;
  } catch (e) {
    console.warn('[coverData] Firestore fetch failed, using cache:', e.message);
    const cached = readCache();
    _memoryCache = cached;
    return cached;
  }
}

// ── READ: single template by id ──
export function getCoverTemplate(id) {
  return readCache().find((t) => t.id === id) || null;
}

// ── WRITE: save single template to Firestore FIRST, then cache ──
async function saveToFirestore(template) {
  if (!db) throw new Error('Firestore not available');
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'cover-templates', template.id), template, { merge: true });
}

// ── WRITE: add template — Firestore first ──
export async function addCoverTemplate(template) {
  await saveToFirestore(template);
  const all = readCache();
  all.push(template);
  writeCache(all);
  return all;
}

// ── WRITE: update template — Firestore first ──
export async function updateCoverTemplate(id, updates) {
  const all = readCache();
  const idx = all.findIndex((t) => t.id === id);
  const updated = idx >= 0 ? { ...all[idx], ...updates } : { id, ...updates };
  await saveToFirestore(updated);
  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.push(updated);
  }
  writeCache(all);
  return all;
}

// ── WRITE: delete template — Firestore first ──
export async function deleteCoverTemplate(id) {
  if (db) {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'cover-templates', id));
  }
  const all = readCache().filter((t) => t.id !== id);
  writeCache(all);
  return all;
}

// ── WRITE: save all templates — Firestore first (bulk) ──
export async function saveCoverTemplates(templates) {
  if (db) {
    const { doc, setDoc } = await import('firebase/firestore');
    await Promise.all(templates.map((t) =>
      t.id ? setDoc(doc(db, 'cover-templates', t.id), t, { merge: true }) : Promise.resolve()
    ));
  }
  writeCache(templates);
}

// ── Reset cache ──
export function resetCoverTemplates() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}
