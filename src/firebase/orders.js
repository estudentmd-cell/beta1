import { db } from './config';

const LS_ORDERS = 'momentive-orders';
const LS_TIMELINE = 'momentive-timeline';

function getLocal(key) { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } }
function saveLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

function generateOrderId() {
  // Secure random ID: timestamp + random hex (unpredictable, non-sequential)
  const ts = Date.now().toString(36);
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `${ts}-${rand}`;
}

/* Strip undefined values — Firestore rejects them */
function stripUndefined(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) clean[k] = stripUndefined(v);
    }
    return clean;
  }
  return obj;
}

export async function createOrder(data) {
  const id = generateOrderId();
  if (db) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      // Strip thumbData from photos to avoid 1MB Firestore doc limit
      const cleanData = { ...data };
      if (cleanData.photos) {
        cleanData.photos = cleanData.photos.map(p => {
          const { thumbData, previewUrl, ...rest } = p;
          return rest;
        });
      }
      await setDoc(doc(db, 'orders', id), stripUndefined({ ...cleanData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
      return id;
    } catch (e) { console.warn('Firestore createOrder failed', e); }
  }
  const orders = getLocal(LS_ORDERS);
  orders[id] = { id, ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  saveLocal(LS_ORDERS, orders);
  return id;
}

export async function getOrder(id) {
  if (db) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'orders', id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (e) { console.warn('Firestore getOrder failed', e); }
  }
  const orders = getLocal(LS_ORDERS);
  return orders[id] || null;
}

export async function updateOrder(id, updates) {
  if (db) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'orders', id), { ...updates, updated_at: new Date().toISOString() });
      return;
    } catch (e) { console.warn('Firestore updateOrder failed', e); }
  }
  const orders = getLocal(LS_ORDERS);
  if (orders[id]) { orders[id] = { ...orders[id], ...updates, updated_at: new Date().toISOString() }; }
  saveLocal(LS_ORDERS, orders);
}

export async function getOrdersByPhone(phone) {
  const last8 = phone.replace(/\D/g, '').slice(-8);
  if (db) {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'orders'));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => o.client_phone && o.client_phone.replace(/\D/g, '').slice(-8) === last8);
    } catch (e) { console.warn('Firestore getOrdersByPhone failed', e); }
  }
  const orders = getLocal(LS_ORDERS);
  return Object.values(orders).filter((o) => o.client_phone && o.client_phone.replace(/\D/g, '').slice(-8) === last8);
}

export async function addTimeline(orderId, event, detail = '') {
  const entry = { event, detail, timestamp: new Date().toISOString() };
  if (db) {
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'orders', orderId, 'timeline'), entry);
      return;
    } catch (e) { console.warn('Firestore addTimeline failed', e); }
  }
  const timeline = getLocal(LS_TIMELINE);
  if (!timeline[orderId]) timeline[orderId] = [];
  timeline[orderId].push(entry);
  saveLocal(LS_TIMELINE, timeline);
}

export async function getOrderTimeline(orderId) {
  if (db) {
    try {
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
      const q = query(collection(db, 'orders', orderId, 'timeline'), orderBy('timestamp', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data());
    } catch (e) { console.warn('Firestore getOrderTimeline failed', e); }
  }
  const timeline = getLocal(LS_TIMELINE);
  return timeline[orderId] || [];
}

export async function getAllOrders() {
  if (db) {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'orders'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) { console.warn('Firestore getAllOrders failed', e); }
  }
  const orders = getLocal(LS_ORDERS);
  return Object.values(orders);
}

export async function getOrderPhotos(orderId) {
  if (db) {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'orders', orderId, 'photos'));
      return snap.docs.map((d) => d.data());
    } catch (e) { console.warn('Firestore getOrderPhotos failed', e); }
  }
  return [];
}
