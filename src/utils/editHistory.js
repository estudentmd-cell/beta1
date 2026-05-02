/**
 * Edit History — logs all changes to a project.
 * Stored in localStorage + Firestore for both customer and admin visibility.
 */
import { db } from '../firebase/config';

const LS_KEY = 'momentive-edit-history';

function getLocalHistory() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}

function saveLocalHistory(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

/**
 * Log an edit event.
 * @param {string} projectId
 * @param {object} entry - { action, detail, user, role }
 */
export async function logEdit(projectId, entry) {
  const event = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  // 1. Firestore FIRST
  if (db) {
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'projects', projectId, 'history'), {
        ...entry,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Edit history Firestore push failed:', e);
    }
  }

  // 2. Cache locally
  const all = getLocalHistory();
  if (!all[projectId]) all[projectId] = [];
  all[projectId].push(event);
  if (all[projectId].length > 100) all[projectId] = all[projectId].slice(-100);
  saveLocalHistory(all);
}

/**
 * Get edit history for a project.
 * Merges Firestore + localStorage, sorted newest first.
 */
export async function getEditHistory(projectId) {
  let events = [];

  // Firestore
  if (db) {
    try {
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
      const q = query(
        collection(db, 'projects', projectId, 'history'),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      events = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          timestamp: data.timestamp?.toDate?.()?.toISOString?.() || data.timestamp,
        };
      });
    } catch (e) {
      console.warn('Edit history Firestore fetch failed:', e);
    }
  }

  // Merge localStorage
  const local = getLocalHistory();
  const localEvents = (local[projectId] || []).reverse();

  if (events.length === 0) return localEvents;

  // Deduplicate by timestamp
  const seen = new Set(events.map((e) => e.timestamp));
  for (const le of localEvents) {
    if (!seen.has(le.timestamp)) events.push(le);
  }

  return events.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

// ── Predefined actions ──

export function logPhotoUpload(projectId, count, userName, role = 'customer') {
  return logEdit(projectId, {
    action: 'photos_uploaded',
    detail: `${count} fotografii incarcate`,
    user: userName,
    role,
  });
}

export function logLayoutChange(projectId, spreadIdx, userName, role = 'customer') {
  return logEdit(projectId, {
    action: 'layout_changed',
    detail: `Layout modificat pe pagina ${spreadIdx + 1}`,
    user: userName,
    role,
  });
}

export function logPhotoSwap(projectId, spreadIdx, userName, role = 'customer') {
  return logEdit(projectId, {
    action: 'photo_swapped',
    detail: `Fotografie schimbata pe pagina ${spreadIdx + 1}`,
    user: userName,
    role,
  });
}

export function logCropChange(projectId, photoName, userName, role = 'customer') {
  return logEdit(projectId, {
    action: 'crop_changed',
    detail: `Crop ajustat: ${photoName}`,
    user: userName,
    role,
  });
}

export function logProjectSaved(projectId, userName, role = 'customer') {
  return logEdit(projectId, {
    action: 'project_saved',
    detail: 'Proiect salvat',
    user: userName,
    role,
  });
}

export function logAdminView(projectId, adminName) {
  return logEdit(projectId, {
    action: 'admin_viewed',
    detail: `Admin a deschis proiectul`,
    user: adminName,
    role: 'admin',
  });
}

export function logAdminEdit(projectId, detail, adminName) {
  return logEdit(projectId, {
    action: 'admin_edited',
    detail,
    user: adminName,
    role: 'admin',
  });
}
