import { db } from './config';

const LS_KEY = 'momentive-user-notifications';
const LS_ADMIN_KEY = 'momentive-admin-notifications';

function getLocalNotifs() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveLocalNotifs(notifs) {
  localStorage.setItem(LS_KEY, JSON.stringify(notifs));
}

function getLocalAdminNotifs() {
  try { return JSON.parse(localStorage.getItem(LS_ADMIN_KEY) || '[]'); } catch { return []; }
}
function saveLocalAdminNotifs(notifs) {
  localStorage.setItem(LS_ADMIN_KEY, JSON.stringify(notifs));
}

/** Admin notification (legacy) */
export async function addNotification(data) {
  if (db) {
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'notifications'), { ...data, created_at: new Date().toISOString(), read: false });
      return;
    } catch (e) { console.warn('Firestore addNotification failed', e); }
  }
}

/** Send notification to user — visible in their cabinet */
export async function sendUserNotification({ clientId, orderId, title, message, action, actionUrl }) {
  const notif = {
    clientId: clientId || null,
    userId: clientId || null,
    orderId: orderId || null,
    title,
    message,
    action: action || null,
    actionUrl: actionUrl || null,
    read: false,
    createdAt: new Date().toISOString(),
  };

  if (db) {
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'user-notifications'), { ...notif, createdAt: serverTimestamp() });
    } catch (e) { console.warn('Firestore user notification failed:', e); }
  }

  const all = getLocalNotifs();
  all.unshift({ id: `notif_${Date.now()}`, ...notif });
  saveLocalNotifs(all);
}

/** Get notifications for a user — matches by clientId OR by orderId from their projects */
export async function getUserNotifications(clientId, projectIds = []) {
  let notifs = [];

  if (db) {
    try {
      // Query user-notifications filtered by clientId (Firestore rules require this)
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      if (clientId) {
        const snap = await getDocs(query(collection(db, 'user-notifications'), where('clientId', '==', clientId)));
        notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      console.warn('Firestore getUserNotifications failed:', e);
    }
  }

  // Merge local
  const local = getLocalNotifs();
  const seen = new Set(notifs.map((n) => n.id));
  for (const ln of local) {
    if (!seen.has(ln.id)) {
      if ((clientId && ln.clientId === clientId) ||
          (ln.orderId && projectIds.includes(ln.orderId)) ||
          (!ln.clientId)) {
        notifs.push(ln);
      }
    }
  }

  return notifs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/** Mark as read */
export async function markNotificationRead(notifId) {
  if (db) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'user-notifications', notifId), { read: true });
    } catch {}
  }
  const all = getLocalNotifs();
  const idx = all.findIndex((n) => n.id === notifId);
  if (idx >= 0) { all[idx].read = true; saveLocalNotifs(all); }
}

// ─── Admin Notifications ─────────────────────────────────

/**
 * Send notification to admin panel
 * @param {'new_order'|'client_approved'|'revision_requested'|'photos_uploaded'} type
 * @param {Object} data - { orderId, clientName, clientPhone, message, ... }
 */
export async function sendAdminNotification(type, data) {
  const notif = {
    type,
    orderId: data.orderId || null,
    clientName: data.clientName || '',
    clientPhone: data.clientPhone || '',
    message: data.message || '',
    read: false,
    createdAt: new Date().toISOString(),
    ...data,
  };

  if (db) {
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'admin-notifications'), { ...notif, createdAt: serverTimestamp() });
    } catch (e) { console.warn('Firestore admin notification failed:', e); }
  }

  const all = getLocalAdminNotifs();
  all.unshift({ id: `admin_notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ...notif });
  saveLocalAdminNotifs(all);
}

/** Get all admin notifications */
export async function getAdminNotifications() {
  let notifs = [];

  if (db) {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'admin-notifications'));
      notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('Firestore getAdminNotifications failed:', e);
    }
  }

  // Merge local
  const local = getLocalAdminNotifs();
  const seen = new Set(notifs.map((n) => n.id));
  for (const ln of local) {
    if (!seen.has(ln.id)) notifs.push(ln);
  }

  return notifs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/** Mark admin notification as read */
export async function markAdminNotifRead(id) {
  if (db) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'admin-notifications', id), { read: true });
    } catch {}
  }
  const all = getLocalAdminNotifs();
  const idx = all.findIndex((n) => n.id === id);
  if (idx >= 0) { all[idx].read = true; saveLocalAdminNotifs(all); }
}

/** Mark all admin notifications as read */
export async function markAllAdminNotifsRead() {
  if (db) {
    try {
      const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'admin-notifications'));
      const batch = [];
      snap.docs.forEach((d) => {
        if (!d.data().read) {
          batch.push(updateDoc(doc(db, 'admin-notifications', d.id), { read: true }));
        }
      });
      await Promise.all(batch);
    } catch {}
  }
  const all = getLocalAdminNotifs();
  all.forEach((n) => { n.read = true; });
  saveLocalAdminNotifs(all);
}
