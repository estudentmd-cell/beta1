import { db } from './config';

export async function addProject(data) {
  const id = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  if (!db) throw new Error('Firebase not available');
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'projects', id), { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  return id;
}

export async function updateProject(id, updates) {
  if (!db) return;
  const { doc, updateDoc } = await import('firebase/firestore');
  await updateDoc(doc(db, 'projects', id), { ...updates, updated_at: new Date().toISOString() });
}

export async function getProject(id) {
  if (!db) return null;
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'projects', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getProjectsByClient(clientId) {
  if (!db) return [];
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const q = query(collection(db, 'projects'), where('client_id', '==', clientId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getProjectData(projectId) {
  if (!db) return null;
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'project_data', projectId));
  return snap.exists() ? snap.data() : null;
}

export async function saveProjectData(projectId, data) {
  if (!db) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'project_data', projectId), { ...data, saved_at: new Date().toISOString() });
}
