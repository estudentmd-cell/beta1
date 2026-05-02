/* ═══ OFERTE ═══
   Sursa de adevăr: Firestore settings/offers
   Cache: localStorage (instant load, no flash)
*/

import { db } from '../firebase/config';

const CACHE_KEY = 'momentive-offers';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function writeCache(items) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(items)); } catch {}
}

// Hardcoded fallback — ONLY used on very first visit with no cache and no Firestore
export const ACTIVE_OFFERS = [
  {
    id: 'offer-nunta',
    product: 'pagini-groase',
    name: 'Album de Nuntă',
    format: '23×23',
    pages: 30,
    oldPrice: 2640,
    newPrice: 1360,
    deadline: '2026-06-05T23:59:59',
    badge: '-24%',
    theme: 'wedding',
    emoji: '💒',
    tagline: 'Amintirile nunții tale, pentru totdeauna',
    active: true,
  },
  {
    id: 'offer-copii',
    product: 'pagini-groase',
    name: 'Album pentru Copii',
    format: '20×20',
    pages: 21,
    oldPrice: 1560,
    newPrice: 1200,
    deadline: '2026-05-06T23:59:59',
    badge: '-24%',
    theme: 'kids',
    emoji: '👶',
    tagline: 'Primii pași, primele zâmbete',
    active: true,
  },
];

/** Get active offers — sync (cache → fallback) */
export function getActiveOffers() {
  const now = new Date();
  const source = readCache() || ACTIVE_OFFERS;
  return source.filter((o) => o.active !== false && new Date(o.deadline) > now);
}

/** Get active offers — async (Firestore → cache) */
export async function getActiveOffersAsync() {
  if (!db) return getActiveOffers();
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'settings', 'offers'));
    if (snap.exists() && snap.data().items) {
      writeCache(snap.data().items);
    }
  } catch {}
  return getActiveOffers();
}

export function daysLeft(deadline) {
  const diff = new Date(deadline) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

export function getRecommendation(photoCount) {
  if (photoCount <= 0) return null;
  if (photoCount <= 30) return { product: 'pagini-subtiri', format: '20×20', pages: 32, message: `Ai ${photoCount} fotografii — perfect pentru un album compact` };
  if (photoCount <= 60) return { product: 'pagini-groase', format: '23×23', pages: 40, message: `Ai ${photoCount} fotografii — îți recomandăm un album premium` };
  return { product: 'pagini-groase', format: '30×30', pages: 60, message: `Ai ${photoCount} fotografii — merită un album mare!` };
}
