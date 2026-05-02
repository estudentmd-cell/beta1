import { create } from 'zustand';
import { db } from '../../firebase/config';

const CACHE_KEY = 'momentive-cms-content';

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

let unsubListener = null;

const useCmsStore = create((set, get) => ({
  content: {},
  loaded: false,
  editMode: false,

  toggleEditMode: () => set((s) => {
    const next = !s.editMode;
    try { localStorage.setItem('cms_edit_mode', next ? 'true' : 'false'); } catch {}
    return { editMode: next };
  }),

  get: (id, defaultValue) => {
    return get().content[id]?.value ?? defaultValue;
  },

  // WRITE: Firestore FIRST, then cache + state
  update: async (id, value, type = 'text') => {
    const entry = { value, type, updated_at: Date.now() };

    if (db) {
      try {
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
        await setDoc(doc(db, 'site-content', id), {
          value,
          type,
          updated_at: serverTimestamp(),
        });
      } catch (e) {
        console.warn('CMS Firestore save failed:', e);
      }
    }

    set((s) => ({ content: { ...s.content, [id]: entry } }));
    const all = readCache();
    all[id] = entry;
    writeCache(all);
  },

  // READ: Firestore first + real-time listener
  fetchAll: async () => {
    if (!db) {
      // Offline fallback — use cache only when no Firestore
      const cached = readCache();
      if (Object.keys(cached).length > 0) {
        set({ content: cached, loaded: true });
      }
      return;
    }

    try {
      const { collection, onSnapshot } = await import('firebase/firestore');

      // Set up real-time listener — auto-syncs across all devices
      if (unsubListener) unsubListener();
      unsubListener = onSnapshot(collection(db, 'site-content'), (snap) => {
        const data = {};
        snap.forEach((d) => { data[d.id] = d.data(); });
        writeCache(data);
        set({ content: data, loaded: true });
      }, (err) => {
        console.warn('CMS real-time listener failed:', err);
        // Only use cache as fallback on error
        const cached = readCache();
        if (Object.keys(cached).length > 0) {
          set({ content: cached, loaded: true });
        }
      });
    } catch (e) {
      console.warn('CMS Firestore fetch failed, using cache:', e);
      set({ content: readCache(), loaded: true });
    }
  },
}));

// Init: restore editMode from localStorage (UI state only)
try {
  if (localStorage.getItem('cms_edit_mode') === 'true') {
    useCmsStore.setState({ editMode: true });
  }
} catch {}

export default useCmsStore;
