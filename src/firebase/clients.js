import { db } from './config';

const LS_KEY = 'momentive-clients';

function getLocalClients() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function saveLocalClients(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

// Normalize phone to last 8 digits for matching
function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '').slice(-8);
}

export async function getClient(clientId) {
  if (db) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'clients', clientId));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (e) { console.warn('Firestore getClient failed, using localStorage', e); }
  }
  const clients = getLocalClients();
  return clients[clientId] || null;
}

export async function createClient(clientId, data) {
  if (db) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'clients', clientId), {
        ...data,
        phone_normalized: normalizePhone(data.phone),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true });
      return;
    } catch (e) { console.warn('Firestore createClient failed, using localStorage', e); }
  }
  const clients = getLocalClients();
  clients[clientId] = { id: clientId, ...data, phone_normalized: normalizePhone(data.phone), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  saveLocalClients(clients);
}

export async function updateClientAccess(clientId) {
  if (db) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'clients', clientId), { last_access: new Date().toISOString() });
      return;
    } catch (e) { console.warn('Firestore updateClientAccess failed', e); }
  }
  const clients = getLocalClients();
  if (clients[clientId]) {
    clients[clientId].last_access = new Date().toISOString();
    saveLocalClients(clients);
  }
}

/**
 * Find existing client by phone number.
 * Returns the client doc if found, null otherwise.
 */
export async function findClientByPhone(phone) {
  const norm = normalizePhone(phone);
  if (!norm || norm.length < 6) return null;

  if (db) {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'clients'), where('phone_normalized', '==', norm));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, ...d.data() };
      }
    } catch (e) { console.warn('Firestore findClientByPhone failed', e); }
  }

  // Fallback: search localStorage
  const clients = getLocalClients();
  return Object.values(clients).find((c) => normalizePhone(c.phone) === norm) || null;
}

/**
 * Link a Google account to an existing phone-based client.
 * Copies all projects/data from old phone_xxx ID to new Google uid.
 * Updates the client doc with Google info.
 */
export async function linkGoogleToClient(oldClientId, googleUser) {
  const googleUid = googleUser.uid;

  if (db) {
    try {
      const { doc, getDoc, setDoc, collection, getDocs, deleteDoc } = await import('firebase/firestore');

      // 1. Read old client doc
      const oldSnap = await getDoc(doc(db, 'clients', oldClientId));
      const oldData = oldSnap.exists() ? oldSnap.data() : {};

      // 2. Create/update client doc under Google uid with merged data
      await setDoc(doc(db, 'clients', googleUid), {
        ...oldData,
        email: googleUser.email || oldData.email || '',
        name: googleUser.displayName || oldData.name || '',
        photoURL: googleUser.photoURL || '',
        phone: oldData.phone || '',
        phone_normalized: oldData.phone_normalized || '',
        authMethod: 'google',
        google_uid: googleUid,
        previous_id: oldClientId,
        linked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true });

      // 3. Update all orders that reference the old client ID
      const ordersSnap = await getDocs(collection(db, 'orders'));
      for (const orderDoc of ordersSnap.docs) {
        const data = orderDoc.data();
        if (data.client_id === oldClientId || data.activeClientId === oldClientId) {
          await setDoc(doc(db, 'orders', orderDoc.id), {
            client_id: googleUid,
            google_uid: googleUid,
            clientEmail: googleUser.email || data.clientEmail || '',
            clientName: googleUser.displayName || data.clientName || '',
          }, { merge: true });
        }
      }

      // 4. Update all projects that reference the old client ID
      const projectsSnap = await getDocs(collection(db, 'projects'));
      for (const projDoc of projectsSnap.docs) {
        const data = projDoc.data();
        if (data.client_id === oldClientId || data.activeClientId === oldClientId) {
          await setDoc(doc(db, 'projects', projDoc.id), {
            client_id: googleUid,
            google_uid: googleUid,
          }, { merge: true });
        }
      }

      return googleUid;
    } catch (e) {
      console.warn('linkGoogleToClient failed:', e);
    }
  }

  // localStorage fallback: just update local clients
  const clients = getLocalClients();
  const oldClient = clients[oldClientId] || {};
  clients[googleUid] = {
    ...oldClient,
    id: googleUid,
    email: googleUser.email || '',
    name: googleUser.displayName || '',
    authMethod: 'google',
    google_uid: googleUid,
    previous_id: oldClientId,
    linked_at: new Date().toISOString(),
  };
  saveLocalClients(clients);
  return googleUid;
}

/**
 * Find existing client by email.
 */
export async function findClientByEmail(email) {
  const norm = (email || '').toLowerCase().trim();
  if (!norm) return null;

  if (db) {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'clients'), where('email', '==', norm));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, ...d.data() };
      }
    } catch (e) { console.warn('Firestore findClientByEmail failed', e); }
  }

  const clients = getLocalClients();
  return Object.values(clients).find((c) => (c.email || '').toLowerCase() === norm) || null;
}

/**
 * Get all clients (for admin panel).
 */
export async function getAllClients() {
  if (db) {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'clients'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) { console.warn('Firestore getAllClients failed', e); }
  }
  const clients = getLocalClients();
  return Object.values(clients);
}

/**
 * Upgrade lead to verified client (called at checkout after email code verification).
 * Links email to existing phone-based lead. Returns the client_id to use.
 */
export async function upgradeLeadToClient(currentClientId, email, name) {
  const normEmail = (email || '').toLowerCase().trim();

  // Check if a client with this email already exists
  const existingByEmail = await findClientByEmail(normEmail);

  if (existingByEmail) {
    // Returning client — merge phone data from current session into existing profile
    if (db) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'clients', existingByEmail.id), {
          name: name || existingByEmail.name,
          type: 'client',
          last_access: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { merge: true });
      } catch (e) { console.warn('upgradeLeadToClient merge failed', e); }
    }
    return existingByEmail.id;
  }

  // New client — upgrade current lead doc
  if (db) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'clients', currentClientId), {
        email: normEmail,
        name: name || '',
        type: 'client',
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true });
    } catch (e) { console.warn('upgradeLeadToClient failed', e); }
  }
  return currentClientId;
}

export async function getClientBySlug(slug) {
  if (db) {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'clients'), where('slug', '==', slug));
      const snap = await getDocs(q);
      if (!snap.empty) { const d = snap.docs[0]; return { id: d.id, ...d.data() }; }
      return null;
    } catch (e) { console.warn('Firestore getClientBySlug failed', e); }
  }
  const clients = getLocalClients();
  return Object.values(clients).find((c) => c.slug === slug) || null;
}
