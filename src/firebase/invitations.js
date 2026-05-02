import { db } from './config';

export async function getInvitationBySlug(slug) {
  if (db) {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'invitations'), where('slug', '==', slug));
      const snap = await getDocs(q);
      if (!snap.empty) { const d = snap.docs[0]; return { id: d.id, ...d.data() }; }
      return null;
    } catch (e) { console.warn('Firestore getInvitationBySlug failed', e); }
  }
  return null;
}

export async function updateInvitation(id, updates) {
  if (db) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'invitations', id), updates);
    } catch (e) { console.warn('Firestore updateInvitation failed', e); }
  }
}
