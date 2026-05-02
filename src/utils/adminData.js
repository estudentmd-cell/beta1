/* ═══ ADMIN DATA LAYER ═══
   Firestore = SINGURA sursă de adevăr
*/
import { db } from '../firebase/config';

const LS_TIMELINE = 'momentive-timeline';
const LS_INVITATIONS = 'momentive-invitations';
const LS_TEAM = 'momentive-team';
const LS_CONTACT_LOG = 'momentive-contact-log';

function getLocalProjects() {
  return []; // Firestore only — no localStorage
}

function saveProjects() {
  // No-op — Firestore only
}

function getLocal(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}

function getLocalArray(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function saveLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Firestore helpers ───────────────────────────────────

let _firestoreOrdersCache = null;
let _firestoreProjectsCache = null;
let _cacheTime = 0;
const CACHE_TTL = 10000; // 10s cache — reduce Firestore reads

// Call this after any status change to force fresh data
export function invalidateCache() {
  _firestoreOrdersCache = null;
  _firestoreProjectsCache = null;
  _cacheTime = 0;
}

async function fetchFirestoreOrders() {
  if (!db) return [];
  const now = Date.now();
  if (_firestoreOrdersCache && (now - _cacheTime) < CACHE_TTL) return _firestoreOrdersCache;
  try {
    const { collection, getDocs, query, limit } = await import('firebase/firestore');
    const q = query(collection(db, 'orders'), limit(200));
    const snap = await getDocs(q);
    _firestoreOrdersCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    _cacheTime = now;
    return _firestoreOrdersCache;
  } catch (e) {
    console.warn('Firestore orders fetch failed:', e);
    return [];
  }
}

let _projectsCacheTime = 0;
async function fetchFirestoreProjects() {
  if (!db) return [];
  const now = Date.now();
  if (_firestoreProjectsCache && (now - _projectsCacheTime) < CACHE_TTL) return _firestoreProjectsCache;
  try {
    const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
    // Limit to last 200 projects for speed — admin rarely needs older ones
    const q = query(collection(db, 'projects'), limit(200));
    const snap = await getDocs(q);
    _firestoreProjectsCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    _projectsCacheTime = now;
    return _firestoreProjectsCache;
  } catch (e) {
    console.warn('Firestore projects fetch failed:', e);
    return [];
  }
}

// Merge Firestore + localStorage, deduplicate by ID
function mergeById(firestoreList, localList) {
  const map = new Map();
  for (const item of localList) {
    if (item.id) map.set(item.id, item);
  }
  for (const item of firestoreList) {
    if (item.id) map.set(item.id, { ...map.get(item.id), ...item });
  }
  return Array.from(map.values());
}

// ─── Orders ───────────────────────────────────────────────

function filterMeaningful(orders) {
  return orders.filter((o) => {
    if (o.paymentStatus === 'paid') return true;
    if (o.clientName && o.clientName.trim()) return true;
    if ((o.totalPhotos || 0) > 0) return true;
    return false;
  });
}

/* Sync version — reads localStorage only (for initial render) */
export function getAllOrders() {
  return filterMeaningful(getLocalProjects());
}

/* Async version — Firestore ONLY */
export async function getAllOrdersAsync() {
  const [fsOrders, fsProjects] = await Promise.all([
    fetchFirestoreOrders(),
    fetchFirestoreProjects(),
  ]);
  const merged = mergeById([...fsOrders, ...fsProjects], []);
  return filterMeaningful(merged);
}

export function getAllProjects() {
  return getLocalProjects();
}

export function getOrdersByStatus(status) {
  return getAllOrders().filter((o) => o.status === status);
}

export function getOrderStats() {
  const orders = getAllOrders();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  let pendingDesigner = 0, designerWorking = 0, awaitingApproval = 0;
  let printReady = 0, slaOverdue = 0, todayOrders = 0, todayRevenue = 0;

  for (const o of orders) {
    if (o.status === 'paid_pending_designer') pendingDesigner++;
    if (o.status === 'designer_working') designerWorking++;
    if (o.status === 'pending_client_approval' || o.status === 'revision_requested') awaitingApproval++;
    if (o.status === 'approved_print') printReady++;
    const sla = calculateSLA(o);
    if (sla !== null && sla > 48) slaOverdue++;
    if (o.createdAt && o.createdAt.startsWith(todayStr)) {
      todayOrders++;
      todayRevenue += o.priceTotal || 0;
    }
  }

  return { pendingDesigner, designerWorking, awaitingApproval, printReady, slaOverdue, todayOrders, todayRevenue };
}

export async function assignDesigner(orderId, designerName) {
  // 1. Firestore FIRST
  if (db) {
    try {
      const { doc, setDoc, getDoc, addDoc, collection } = await import('firebase/firestore');
      await setDoc(doc(db, 'orders', orderId), { designer: designerName, status: 'designer_working', updated_at: new Date().toISOString() }, { merge: true });
      await setDoc(doc(db, 'projects', orderId), { designer: designerName, status: 'designer_working', updated_at: new Date().toISOString() }, { merge: true });
      await addDoc(collection(db, 'orders', orderId, 'timeline'), { event: 'designer-assigned', detail: `Designer asignat: ${designerName}`, timestamp: new Date().toISOString() });

      // Send email notification to client
      try {
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (orderSnap.exists()) {
          const order = orderSnap.data();
          const clientEmail = order.clientEmail || order.client_email;
          if (clientEmail) {
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions(undefined, 'europe-west1');
            const sendOrderEmail = httpsCallable(functions, 'sendOrderEmail');
            await sendOrderEmail({
              to: clientEmail,
              templateId: 'designer_assigned',
              variables: {
                clientName: order.clientName || order.client_name || '',
                orderId,
                orderNumber: order.orderNumber || orderId,
                productName: order.productConfig?.name || 'Album foto',
                designerName,
                estimateDays: '3-5',
                siteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://fotocarte.md',
                cabinetUrl: typeof window !== 'undefined' ? `${window.location.origin}/app/cabinet` : '',
              },
            });
          }
        }
      } catch (e) { console.warn('assignDesigner email failed:', e); }
    } catch (e) { console.warn('assignDesigner Firestore failed:', e); }
  }
  invalidateCache();
}

// Map status → email template ID
const STATUS_EMAIL_MAP = {
  'paid_pending_designer': 'payment_confirmed',
  'designer_working': 'designer_assigned',
  'pending_client_approval': 'ready_for_approval',
  'approved_print': 'sent_to_print',
  'in_print': 'in_print',
  'shipped': 'shipped',
  'delivered': 'delivered',
};

export async function updateOrderStatus(orderId, newStatus, detail = '') {
  // 1. Firestore FIRST
  if (db) {
    try {
      const { doc, setDoc, getDoc, addDoc, collection } = await import('firebase/firestore');
      const updateData = { status: newStatus, updated_at: new Date().toISOString() };
      await setDoc(doc(db, 'orders', orderId), updateData, { merge: true });
      await setDoc(doc(db, 'projects', orderId), updateData, { merge: true });
      await addDoc(collection(db, 'orders', orderId, 'timeline'), { event: `status-${newStatus}`, detail: detail || `Status schimbat: ${newStatus}`, timestamp: new Date().toISOString() });

      // 2. Send email notification via Cloud Function
      const templateId = STATUS_EMAIL_MAP[newStatus];
      if (templateId) {
        try {
          const orderSnap = await getDoc(doc(db, 'orders', orderId));
          if (orderSnap.exists()) {
            const order = orderSnap.data();
            const clientEmail = order.clientEmail || order.client_email;
            if (clientEmail) {
              const { getFunctions, httpsCallable } = await import('firebase/functions');
              const functions = getFunctions(undefined, 'europe-west1');
              const sendOrderEmail = httpsCallable(functions, 'sendOrderEmail');
              await sendOrderEmail({
                to: clientEmail,
                templateId,
                variables: {
                  clientName: order.clientName || order.client_name || '',
                  orderId,
                  orderNumber: order.orderNumber || orderId,
                  productName: order.productConfig?.name || 'Album foto',
                  format: order.productConfig?.format || '20×20',
                  pages: String(order.productConfig?.initialPages || 40),
                  price: String(order.priceTotal || order.priceAlbum || ''),
                  service: order.serviceLevel === 'verify_only' ? 'Verificare album' : 'Serviciu designer',
                  paymentMethod: order.paymentMethod === 'card' ? 'Card bancar' : 'Transfer bancar',
                  address: order.address ? `${order.address.street || ''}, ${order.address.city || ''}` : '',
                  designerName: order.designer || '',
                  estimateDays: '3-5',
                  estimateDate: order.estimateDate || '',
                  trackingNumber: order.trackingNumber || '',
                  courierName: order.courierName || 'Curier',
                  siteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://fotocarte.md',
                  previewUrl: typeof window !== 'undefined' ? `${window.location.origin}/app/editor/${orderId}` : '',
                  cabinetUrl: typeof window !== 'undefined' ? `${window.location.origin}/app/cabinet` : '',
                  reviewUrl: typeof window !== 'undefined' ? `${window.location.origin}/app/cabinet` : '',
                },
              });
              console.log(`[EMAIL] Sent "${templateId}" to ${clientEmail}`);
            }
          }
        } catch (emailErr) { console.warn('Email send failed:', emailErr); }
      }
    } catch (e) { console.warn('updateOrderStatus Firestore failed:', e); }
  }
  invalidateCache();
}

export async function addOrderNote(orderId, author, text) {
  const entry = { event: 'internal-note', detail: `[${author}] ${text}`, timestamp: new Date().toISOString() };
  // 1. Firestore FIRST
  if (db) {
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'orders', orderId, 'timeline'), entry);
    } catch (e) { console.warn('addOrderNote Firestore failed:', e); }
  }
  // 2. Cache
  const timeline = getLocal(LS_TIMELINE);
  if (!timeline[orderId]) timeline[orderId] = [];
  timeline[orderId].push(entry);
  saveLocal(LS_TIMELINE, timeline);
}

// ─── Clients ──────────────────────────────────────────────

export function getAllClients() {
  const orders = getAllOrders();
  const clientMap = {};

  for (const o of orders) {
    const phone = o.clientPhone || o.client_phone;
    if (!phone) continue;
    const key = phone.replace(/\D/g, '').slice(-8);

    if (!clientMap[key]) {
      clientMap[key] = {
        phone: phone,
        name: o.clientName || 'Necunoscut',
        email: o.clientEmail || o.client_email || '',
        orderCount: 0,
        photoCount: 0,
        totalSpent: 0,
        lastOrder: null,
      };
    }

    clientMap[key].orderCount++;
    clientMap[key].photoCount += o.totalPhotos || 0;
    clientMap[key].totalSpent += o.priceTotal || 0;

    const date = o.createdAt || o.created_at;
    if (date && (!clientMap[key].lastOrder || date > clientMap[key].lastOrder)) {
      clientMap[key].lastOrder = date;
    }
  }

  return Object.values(clientMap);
}

/* Async version — merges Firestore clients collection (leads + clients) with order data */
export async function getAllClientsAsync() {
  const orders = await getAllOrdersAsync();

  // 1. Build client map from Firestore clients collection (includes leads without orders)
  const clientMap = {};
  if (db) {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'clients'));
      for (const d of snap.docs) {
        const c = d.data();
        const phone = c.phone || '';
        const key = phone.replace(/\D/g, '').slice(-8) || d.id;
        clientMap[key] = {
          id: d.id,
          phone,
          name: c.name || '',
          email: c.email || '',
          type: c.type || (c.authMethod === 'phone_only' ? 'lead' : 'client'),
          authMethod: c.authMethod || '',
          orderCount: 0,
          photoCount: 0,
          totalSpent: 0,
          lastOrder: null,
          created_at: c.created_at || null,
          last_access: c.last_access || null,
        };
      }
    } catch (e) { console.warn('Firestore clients fetch failed:', e); }
  }

  // 2. Enrich with order data
  for (const o of orders) {
    const phone = o.clientPhone || o.client_phone;
    if (!phone) continue;
    const key = phone.replace(/\D/g, '').slice(-8);

    if (!clientMap[key]) {
      clientMap[key] = {
        phone,
        name: o.clientName || 'Necunoscut',
        email: o.clientEmail || o.client_email || '',
        type: 'client',
        orderCount: 0,
        photoCount: 0,
        totalSpent: 0,
        lastOrder: null,
      };
    }

    clientMap[key].orderCount++;
    clientMap[key].photoCount += o.totalPhotos || 0;
    clientMap[key].totalSpent += o.priceTotal || 0;
    // If has orders, they're a client (not just lead)
    if (clientMap[key].type === 'lead') clientMap[key].type = 'client';

    const date = o.createdAt || o.created_at;
    if (date && (!clientMap[key].lastOrder || date > clientMap[key].lastOrder)) {
      clientMap[key].lastOrder = date;
    }
  }

  return Object.values(clientMap);
}

export function getClientOrders(phone) {
  const last8 = phone.replace(/\D/g, '').slice(-8);
  return getAllOrders().filter(
    (o) => (o.clientPhone || o.client_phone) && (o.clientPhone || o.client_phone).replace(/\D/g, '').slice(-8) === last8,
  );
}

// ─── Invitations ──────────────────────────────────────────

export function getInvitations() {
  return getLocalArray(LS_INVITATIONS);
}

/** Get invitations from Firestore (source of truth) */
export async function getInvitationsAsync() {
  if (!db) return getInvitations();
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, 'invitations'));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Update local cache
    saveLocal(LS_INVITATIONS, items);
    return items;
  } catch (e) {
    console.warn('getInvitationsAsync failed:', e);
    return getInvitations();
  }
}

export async function createInvitation(name, phone, extras = {}) {
  const id = crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const slug = Math.random().toString(36).slice(2, 10);
  const invitation = {
    id, name, phone, slug,
    url: `${window.location.origin}/app/product/${slug}`,
    createdAt: new Date().toISOString(),
    status: 'sent',
    clicks: 0,
    ...extras,
  };
  // 1. Firestore FIRST
  if (db) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'invitations', id), invitation);
    } catch (e) { console.warn('createInvitation Firestore failed:', e); }
  }
  // 2. Cache
  const invitations = getInvitations();
  invitations.unshift(invitation);
  saveLocal(LS_INVITATIONS, invitations);
  return invitation;
}

export async function deleteInvitation(id) {
  // 1. Firestore FIRST
  if (db) {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'invitations', id));
    } catch (e) { console.warn('deleteInvitation Firestore failed:', e); }
  }
  // 2. Cache
  const invitations = getInvitations().filter((inv) => inv.id !== id);
  saveLocal(LS_INVITATIONS, invitations);
}


// ─── Team ─────────────────────────────────────────────────

const DEFAULT_TEAM = [
  { id: 'tm-1', name: 'Dumitru Admin', email: 'fotocartemd@gmail.com', role: 'owner', completed: 0 },
  { id: 'tm-2', name: 'Ana Designer', email: 'ana@fotocarte.md', role: 'designer', completed: 12 },
];

export function getTeamMembers() {
  // Don't cache team data in localStorage — security risk (visible to clients)
  // Return default only, real data comes from Firestore
  return DEFAULT_TEAM;
}

export async function addTeamMember(name, email, role) {
  const id = `tm-${Date.now()}`;
  const member = { id, name, email, role, completed: 0, addedAt: new Date().toISOString() };
  // 1. Firestore FIRST
  if (db) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'team', id), member);
    } catch (e) { console.warn('addTeamMember Firestore failed:', e); }
  }
  return member;
}

export async function removeTeamMember(memberId) {
  // 1. Firestore FIRST
  if (db) {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'team', memberId));
    } catch (e) { console.warn('removeTeamMember Firestore failed:', e); }
  }
  return [];
}

export async function updateTeamMember(memberId, updates) {
  // 1. Firestore FIRST
  if (db) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'team', memberId), updates, { merge: true });
    } catch (e) { console.warn('updateTeamMember Firestore failed:', e); }
  }
  return [];
}

export function getDesignerStats(designerName, orders) {
  const assigned = orders.filter(o => o.designer === designerName);
  const active = assigned.filter(o => ['designer_working', 'revision_requested'].includes(o.status));
  const pending = orders.filter(o => o.status === 'paid_pending_designer' && !o.designer);
  const completed = assigned.filter(o => ['pending_client_approval', 'approved_print', 'in_print', 'shipped', 'delivered'].includes(o.status));
  const revisions = assigned.filter(o => o.status === 'revision_requested');

  // Average time (from assignment to client approval) for completed orders
  let avgHours = null;
  const withTimes = completed.filter(o => o.updatedAt && o.createdAt);
  if (withTimes.length > 0) {
    const totalHours = withTimes.reduce((sum, o) => {
      const diff = new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime();
      return sum + diff / 3600000;
    }, 0);
    avgHours = Math.round(totalHours / withTimes.length);
  }

  return {
    active: active.length,
    activeOrders: active,
    completed: completed.length,
    revisions: revisions.length,
    totalAssigned: assigned.length,
    pendingGlobal: pending.length,
    avgHours,
  };
}

// ─── Analytics (REAL data) ───────────────────────────────

function eventAction(order) {
  switch (order.status) {
    case 'draft': return 'Proiect creat';
    case 'awaiting_payment': return 'Comandă plasată — așteaptă achitarea';
    case 'paid_pending_designer': return 'Comandă plătită — așteaptă designer';
    case 'paid_pending_verification': return 'Comandă plătită — verificare';
    case 'designer_working': return 'Designer lucrează';
    case 'pending_client_approval': return 'Trimis spre aprobare';
    case 'revision_requested': return 'Revizuire cerută de client';
    case 'approved_print': return 'Aprobat pentru tipar';
    case 'in_print': return 'La tipar';
    case 'shipped': return 'Expediat';
    case 'delivered': return 'Livrat';
    default: return order.status || 'Activitate';
  }
}

function eventDetail(order) {
  const parts = [];
  if (order.id) parts.push(order.id);
  if (order.priceTotal) parts.push(`${order.priceTotal} lei`);
  if (order.totalPhotos) parts.push(`${order.totalPhotos} poze`);
  return parts.join(' — ');
}

function eventType(order) {
  if (['approved_print', 'delivered', 'shipped'].includes(order.status)) return 'green';
  if (['cancelled', 'revision_requested'].includes(order.status)) return 'red';
  if (order.paymentStatus === 'paid') return 'gold';
  return 'blue';
}

function computeBottlenecks(orders) {
  const bottlenecks = [];

  const drafts = orders.filter((o) => o.status === 'draft');
  const abandoned = drafts.filter((o) => (o.totalPhotos || 0) === 0);
  if (abandoned.length > 0) {
    bottlenecks.push({
      id: 'b1',
      screen: 'Upload',
      severity: abandoned.length > 3 ? 'critical' : 'warning',
      issue: `${abandoned.length} proiecte fără fotografii uploadate`,
      suggestion: 'Trimite reminder clienților să-și uploadeze pozele',
    });
  }

  const lowProgress = orders.filter((o) => o.paymentStatus === 'paid' && (o.progress || 0) < 50);
  if (lowProgress.length > 0) {
    bottlenecks.push({
      id: 'b2',
      screen: 'Editor',
      severity: 'warning',
      issue: `${lowProgress.length} comenzi plătite cu progres sub 50%`,
      suggestion: 'Verifică dacă clienții au nevoie de ajutor cu editorul',
    });
  }

  const slaIssues = orders.filter((o) => calculateSLA(o) > 48);
  if (slaIssues.length > 0) {
    bottlenecks.push({
      id: 'b3',
      screen: 'SLA',
      severity: 'critical',
      issue: `${slaIssues.length} comenzi au depășit SLA de 48h`,
      suggestion: 'Prioritizează aceste comenzi imediat',
    });
  }

  return bottlenecks;
}

function buildOrderTimeline(order) {
  const events = [];
  if (order.createdAt) {
    events.push({
      t: new Date(order.createdAt).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
      action: 'Proiect creat',
      detail: order.productConfig?.name || '',
      type: 'green',
    });
  }
  if (order.totalPhotos > 0) {
    events.push({ t: '', action: 'Fotografii uploadate', detail: `${order.totalPhotos} poze`, type: 'blue' });
  }
  if (order.usedPhotos > 0) {
    events.push({ t: '', action: 'Editor utilizat', detail: `${order.usedPhotos}/${order.totalPhotos} plasate`, type: 'blue' });
  }
  if (order.paidAt) {
    events.push({
      t: new Date(order.paidAt).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
      action: 'Plată efectuată',
      detail: `${order.priceTotal} lei`,
      type: 'green',
    });
  }
  return events;
}

function computeSessionHistory(orders) {
  return orders
    .filter((o) => o.createdAt || o.created_at)
    .sort((a, b) => (b.createdAt || b.created_at || '').localeCompare(a.createdAt || a.created_at || ''))
    .slice(0, 15)
    .map((o, i) => ({
      id: `sh-${i}`,
      name: o.clientName || 'Client',
      phone: o.clientPhone || o.client_phone || '',
      device: '💻',
      startTime: new Date(o.createdAt || o.created_at).toLocaleString('ro-RO'),
      duration: o.progress || 0,
      eventCount: (o.totalPhotos || 0) + (o.filledSpreads || 0),
      outcome: o.paymentStatus === 'paid' ? 'completed' : o.status === 'draft' ? 'active' : 'abandoned',
      dropScreen: o.status === 'draft' ? (o.totalPhotos ? 'Editor' : 'Upload') : null,
      events: buildOrderTimeline(o),
    }));
}

export function getAnalyticsData() {
  const orders = getAllOrders();
  if (orders.length === 0) {
    return { funnel: [], recentEvents: [], bottlenecks: [], sessionHistory: [] };
  }
  const total = orders.length;
  const withPhotos = orders.filter((o) => (o.totalPhotos || 0) > 0).length;
  const inEditor = orders.filter((o) => (o.usedPhotos || 0) > 0).length;
  const atCheckout = orders.filter((o) => o.paymentStatus === 'paid').length;
  const completed = orders.filter((o) => ['approved_print', 'in_print', 'shipped', 'delivered'].includes(o.status)).length;

  const funnel = [
    { name: 'Proiecte create', visitors: total, pct: 100, drop: 0 },
    { name: 'Fotografii uploadate', visitors: withPhotos, pct: Math.round(withPhotos / total * 100), drop: Math.round((total - withPhotos) / total * 100) },
    { name: 'Editor utilizat', visitors: inEditor, pct: Math.round(inEditor / total * 100), drop: withPhotos ? Math.round((withPhotos - inEditor) / withPhotos * 100) : 0 },
    { name: 'Plată efectuată', visitors: atCheckout, pct: Math.round(atCheckout / total * 100), drop: inEditor ? Math.round((inEditor - atCheckout) / inEditor * 100) : 0 },
    { name: 'Finalizate', visitors: completed, pct: Math.round(completed / total * 100), drop: atCheckout ? Math.round((atCheckout - completed) / atCheckout * 100) : 0 },
  ];

  const recentEvents = orders
    .filter((o) => o.updatedAt || o.createdAt)
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
    .slice(0, 20)
    .map((o) => ({
      ts: o.updatedAt || o.createdAt,
      user: o.clientName || 'Client',
      action: eventAction(o),
      detail: eventDetail(o),
      type: eventType(o),
    }));

  const bottlenecks = computeBottlenecks(orders);
  const sessionHistory = computeSessionHistory(orders);

  return { funnel, recentEvents, bottlenecks, sessionHistory };
}

/* Async version of analytics — merges Firestore data */
export async function getAnalyticsDataAsync() {
  const orders = await getAllOrdersAsync();
  if (orders.length === 0) {
    return { funnel: [], recentEvents: [], bottlenecks: [], sessionHistory: [] };
  }
  // Same computation as sync version
  const total = orders.length;
  const withPhotos = orders.filter((o) => (o.totalPhotos || 0) > 0).length;
  const inEditor = orders.filter((o) => (o.usedPhotos || 0) > 0).length;
  const atCheckout = orders.filter((o) => o.paymentStatus === 'paid').length;
  const completed = orders.filter((o) => ['approved_print', 'in_print', 'shipped', 'delivered'].includes(o.status)).length;

  const funnel = [
    { name: 'Proiecte create', visitors: total, pct: 100, drop: 0 },
    { name: 'Fotografii uploadate', visitors: withPhotos, pct: Math.round(withPhotos / total * 100), drop: Math.round((total - withPhotos) / total * 100) },
    { name: 'Editor utilizat', visitors: inEditor, pct: Math.round(inEditor / total * 100), drop: withPhotos ? Math.round((withPhotos - inEditor) / withPhotos * 100) : 0 },
    { name: 'Plată efectuată', visitors: atCheckout, pct: Math.round(atCheckout / total * 100), drop: inEditor ? Math.round((inEditor - atCheckout) / inEditor * 100) : 0 },
    { name: 'Finalizate', visitors: completed, pct: Math.round(completed / total * 100), drop: atCheckout ? Math.round((atCheckout - completed) / atCheckout * 100) : 0 },
  ];

  const recentEvents = orders
    .filter((o) => o.updatedAt || o.createdAt)
    .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''))
    .slice(0, 20)
    .map((o) => ({
      ts: o.updatedAt || o.createdAt,
      user: o.clientName || 'Client',
      action: eventAction(o),
      detail: eventDetail(o),
      type: eventType(o),
    }));

  const bottlenecks = computeBottlenecks(orders);
  const sessionHistory = computeSessionHistory(orders);

  return { funnel, recentEvents, bottlenecks, sessionHistory };
}

// ─── Contact Log (Follow-up tracking) ────────────────────

const CONTACT_OUTCOMES = {
  will_order:   { label: 'Va comanda',     icon: '✅', color: 'green' },
  thinking:     { label: 'Se gândește',    icon: '🤔', color: 'amber' },
  no_answer:    { label: 'Nu răspunde',    icon: '📵', color: 'gray' },
  refused:      { label: 'Refuză',         icon: '❌', color: 'red' },
  needs_help:   { label: 'Are nevoie de ajutor', icon: '🆘', color: 'blue' },
  callback:     { label: 'Sună înapoi',   icon: '🔄', color: 'purple' },
};

export { CONTACT_OUTCOMES };

export function getContactLog(clientPhone) {
  const allLogs = getLocalArray(LS_CONTACT_LOG);
  if (!clientPhone) return allLogs;
  const phone8 = clientPhone.replace(/\D/g, '').slice(-8);
  return allLogs.filter(l => l.phone8 === phone8);
}

export function addContactEntry(clientPhone, clientName, orderId, outcome, note) {
  const logs = getLocalArray(LS_CONTACT_LOG);
  const phone8 = (clientPhone || '').replace(/\D/g, '').slice(-8);
  const entry = {
    id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    phone: clientPhone,
    phone8,
    clientName: clientName || '',
    orderId: orderId || '',
    outcome,
    note: note || '',
    calledBy: 'Admin',
    timestamp: new Date().toISOString(),
  };
  logs.unshift(entry);
  saveLocal(LS_CONTACT_LOG, logs);

  // Also add to order timeline if orderId exists
  if (orderId) {
    const timeline = getLocal(LS_TIMELINE);
    if (!timeline[orderId]) timeline[orderId] = [];
    const outcomeInfo = CONTACT_OUTCOMES[outcome] || { label: outcome };
    timeline[orderId].push({
      event: 'contact-call',
      detail: `📞 Apel: ${outcomeInfo.label}${note ? ` — ${note}` : ''}`,
      timestamp: new Date().toISOString(),
    });
    saveLocal(LS_TIMELINE, timeline);
  }

  return entry;
}

export function getLastContact(clientPhone) {
  const logs = getContactLog(clientPhone);
  return logs.length > 0 ? logs[0] : null;
}

// Get clients that need re-contact (last contact > threshold hours, still draft)
export function getClientsToRecontact(thresholdHours = 48) {
  const allLogs = getLocalArray(LS_CONTACT_LOG);
  const orders = getAllOrders();

  // Build map: phone8 → last contact timestamp
  const lastContactMap = {};
  for (const log of allLogs) {
    if (!lastContactMap[log.phone8] || log.timestamp > lastContactMap[log.phone8].timestamp) {
      lastContactMap[log.phone8] = log;
    }
  }

  // Find draft orders where client was contacted but needs re-contact
  const recontact = [];
  const seen = new Set();

  for (const o of orders) {
    if (o.status !== 'draft') continue;
    const phone = o.clientPhone || o.client_phone || '';
    if (!phone) continue;
    const phone8 = phone.replace(/\D/g, '').slice(-8);
    if (seen.has(phone8)) continue;
    seen.add(phone8);

    const lastContact = lastContactMap[phone8];
    if (!lastContact) continue; // Never contacted — handled by sales actions

    const hoursSince = (Date.now() - new Date(lastContact.timestamp).getTime()) / 3600000;
    if (hoursSince < thresholdHours) continue; // Too recent

    // Skip if they refused
    if (lastContact.outcome === 'refused') continue;

    recontact.push({
      order: o,
      lastContact,
      hoursSinceContact: Math.round(hoursSince),
    });
  }

  return recontact.sort((a, b) => b.hoursSinceContact - a.hoursSinceContact);
}

// ─── CANCEL ORDER (soft delete — industrie standard) ─────

export async function cancelOrder(orderId, reason = '', adminName = 'Admin') {
  if (!db) return;
  try {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const { addTimeline } = await import('../firebase/orders');

    await updateDoc(doc(db, 'orders', orderId), {
      status: 'cancelled',
      statusLabel: 'Anulat',
      cancelledAt: new Date().toISOString(),
      cancelledBy: adminName,
      cancelReason: reason || 'Anulat de administrator',
      // Auto-cleanup după 60 zile — data la care proiectul poate fi șters
      deleteAfter: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Audit trail
    await addTimeline(orderId, 'order_cancelled', `Comandă anulată: ${reason || 'Fără motiv specificat'} (de ${adminName})`).catch(() => {});

    // Notifică clientul prin email
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { getDoc } = await import('firebase/firestore');
      const orderSnap = await getDoc(doc(db, 'orders', orderId));
      if (orderSnap.exists()) {
        const order = orderSnap.data();
        if (order.clientEmail) {
          const functions = getFunctions(undefined, 'europe-west1');
          const sendEmail = httpsCallable(functions, 'sendOrderEmail');
          sendEmail({
            to: order.clientEmail,
            templateId: 'order_cancelled',
            clientId: order.client_id || null,
            variables: {
              clientName: order.clientName || 'Client',
              orderNumber: order.orderNumber || orderId,
              reason: reason || 'Comandă anulată de administrație',
              productName: order.productName || order.productConfig?.name || 'Album foto',
              siteUrl: window.location.origin,
            },
          }).catch(e => console.warn('Cancel email failed:', e));
        }
      }
    } catch (e) { console.warn('Cancel notification failed:', e); }

    invalidateCache();
  } catch (e) { console.warn('cancelOrder failed:', e); }
}

// ─── DELETE ORDER (hard delete — doar pentru comenzi anulate > 60 zile) ─────

export async function deleteOrder(orderId) {
  if (!db) return;
  try {
    const { doc, deleteDoc, collection, getDocs, getDoc } = await import('firebase/firestore');

    // Verificare: permite hard delete DOAR dacă e anulat și a trecut termenul
    const orderSnap = await getDoc(doc(db, 'orders', orderId));
    if (orderSnap.exists()) {
      const order = orderSnap.data();
      if (order.status !== 'cancelled') {
        console.warn('Nu se poate șterge o comandă activă. Anulează mai întâi.');
        return false;
      }
      if (order.deleteAfter && new Date(order.deleteAfter) > new Date()) {
        const daysLeft = Math.ceil((new Date(order.deleteAfter) - new Date()) / (24*60*60*1000));
        console.warn(`Comanda poate fi ștearsă peste ${daysLeft} zile.`);
        return false;
      }
    }

    // Hard delete — doar după verificare
    await deleteDoc(doc(db, 'orders', orderId)).catch(() => {});
    await deleteDoc(doc(db, 'projects', orderId)).catch(() => {});
    try {
      const tlSnap = await getDocs(collection(db, 'orders', orderId, 'timeline'));
      for (const d of tlSnap.docs) await deleteDoc(d.ref).catch(() => {});
    } catch {}
    try {
      const phSnap = await getDocs(collection(db, 'orders', orderId, 'photos'));
      for (const d of phSnap.docs) await deleteDoc(d.ref).catch(() => {});
    } catch {}

    invalidateCache();
    return true;
  } catch (e) { console.warn('Firestore deleteOrder failed:', e); return false; }
}

// ─── DELETE CLIENT ────────────────────────────────────────

export async function deleteClient(clientPhone) {
  const phone8 = (clientPhone || '').replace(/\D/g, '').slice(-8);
  if (!phone8) return;

  // Firestore only — delete from collections below

  // Delete contact log entries
  const logs = getLocalArray(LS_CONTACT_LOG);
  const filteredLogs = logs.filter(l => l.phone8 !== phone8);
  saveLocal(LS_CONTACT_LOG, filteredLogs);

  if (db) {
    try {
      const { collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');

      // Find and delete client doc
      const clientSnap = await getDocs(collection(db, 'clients'));
      for (const d of clientSnap.docs) {
        const data = d.data();
        const cPhone = (data.phone || '').replace(/\D/g, '').slice(-8);
        if (cPhone === phone8) {
          await deleteDoc(doc(db, 'clients', d.id)).catch(() => {});
        }
      }

      // Find and delete all orders for this client
      const orderSnap = await getDocs(collection(db, 'orders'));
      for (const d of orderSnap.docs) {
        const data = d.data();
        const oPhone = (data.clientPhone || data.client_phone || '').replace(/\D/g, '').slice(-8);
        if (oPhone === phone8) {
          await deleteDoc(doc(db, 'orders', d.id)).catch(() => {});
          // Also delete from projects
          await deleteDoc(doc(db, 'projects', d.id)).catch(() => {});
        }
      }

      // Delete projects too
      const projSnap = await getDocs(collection(db, 'projects'));
      for (const d of projSnap.docs) {
        const data = d.data();
        const pPhone = (data.clientPhone || data.client_phone || '').replace(/\D/g, '').slice(-8);
        if (pPhone === phone8) {
          await deleteDoc(doc(db, 'projects', d.id)).catch(() => {});
        }
      }

      // Delete user notifications
      const notifSnap = await getDocs(collection(db, 'user-notifications'));
      for (const d of notifSnap.docs) {
        const data = d.data();
        if (data.clientId && clientSnap.docs.some(cd => cd.id === data.clientId)) {
          await deleteDoc(doc(db, 'user-notifications', d.id)).catch(() => {});
        }
      }
    } catch (e) { console.warn('Firestore deleteClient failed:', e); }
  }
}

// ─── SLA ──────────────────────────────────────────────────

export function calculateSLA(order) {
  if (!order) return null;
  const paidAt = order.paidAt;
  if (!paidAt) return null;

  const paidDate = new Date(paidAt);
  const now = new Date();
  const diffMs = now - paidDate;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60) * 10) / 10;
  return diffHours;
}

// ─── CLEANUP: Delete all test data ───────────────────────
const ADMIN_EMAIL = 'fotocartemd@gmail.com';
const CLEANUP_COLLECTIONS = [
  'orders', 'projects', 'project_data', 'mail_queue',
  'visitors', 'email-codes', 'user-notifications',
  'admin-notifications', 'errors', 'funnel', 'invitations',
];

export async function cleanupAllData(onProgress) {
  if (!db) throw new Error('Firestore not available');
  const { collection, getDocs, doc, deleteDoc } = await import('firebase/firestore');
  const results = {};

  // Delete full collections
  for (const colName of CLEANUP_COLLECTIONS) {
    onProgress?.(`Se șterge ${colName}...`);
    const snap = await getDocs(collection(db, colName));
    let deleted = 0;
    for (const d of snap.docs) {
      await deleteDoc(doc(db, colName, d.id));
      deleted++;
    }
    results[colName] = deleted;
  }

  // Clients — keep admin email
  onProgress?.('Se curăță clienții (se păstrează admin)...');
  const clientsSnap = await getDocs(collection(db, 'clients'));
  let clientDel = 0, clientKept = 0;
  for (const d of clientsSnap.docs) {
    const data = d.data();
    if ((data.email || '').toLowerCase() === ADMIN_EMAIL) { clientKept++; continue; }
    await deleteDoc(doc(db, 'clients', d.id));
    clientDel++;
  }
  results.clients = `${clientDel} șters, ${clientKept} păstrat`;

  // Clear localStorage cache
  localStorage.removeItem(LS_TIMELINE);
  localStorage.removeItem(LS_INVITATIONS);
  localStorage.removeItem(LS_CONTACT_LOG);
  invalidateCache();

  onProgress?.('Gata!');
  return results;
}
