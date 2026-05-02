import { create } from 'zustand';

// Restore from sessionStorage
function loadSession(key, fallback) {
  try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveSession(key, val) {
  try { if (val) sessionStorage.setItem(key, JSON.stringify(val)); else sessionStorage.removeItem(key); } catch {}
}

const DEFAULT_CONFIG = {
  name: 'Album Pagini Groase',
  slug: 'pagini-groase',
  format: '20×20',
  initialPages: 20,
  basePrice: 100,
  extraPagePrice: 3.5,
  designPrice: 49,
};

const useProjectStore = create((set, get) => ({
  currentProjectId: sessionStorage.getItem('fc_projectId') || null,
  editorProjectData: null,
  currentSpreadCount: loadSession('fc_spreadCount', 0),
  chosenPath: sessionStorage.getItem('fc_chosenPath') || '',
  selectedServiceLevel: '',
  coverTemplate: loadSession('fc_coverTemplate', null),
  productConfig: loadSession('fc_productConfig', DEFAULT_CONFIG),
  isEditingFromCabinet: false,
  cameFromCabinet: false,
  approvalEditMode: false,

  setProject: (id, data) => {
    if (id) sessionStorage.setItem('fc_projectId', id);
    else sessionStorage.removeItem('fc_projectId');
    set({ currentProjectId: id, editorProjectData: data });
  },
  setSpreadCount: (n) => {
    saveSession('fc_spreadCount', n);
    set({ currentSpreadCount: n });
  },
  setEditorData: (data) => set({ editorProjectData: data }),
  setChosenPath: (path) => {
    sessionStorage.setItem('fc_chosenPath', path || '');
    set({ chosenPath: path });
  },
  setServiceLevel: (level) => set({ selectedServiceLevel: level }),
  setEditingFromCabinet: (val) => set({ isEditingFromCabinet: val }),
  setCameFromCabinet: (val) => set({ cameFromCabinet: val }),
  setCoverTemplate: (tpl) => {
    saveSession('fc_coverTemplate', tpl);
    set({ coverTemplate: tpl });
  },
  setApprovalEditMode: (val) => set({ approvalEditMode: val }),
  setProductConfig: (config) => {
    saveSession('fc_productConfig', config);
    set({ productConfig: config });
  },
  resetForNewProject: () => {
    sessionStorage.removeItem('fc_projectId');
    sessionStorage.removeItem('fc_productConfig');
    sessionStorage.removeItem('fc_coverTemplate');
    sessionStorage.removeItem('fc_spreadCount');
    sessionStorage.removeItem('fc_chosenPath');
    set({
      currentProjectId: null, editorProjectData: null, coverTemplate: null,
      currentSpreadCount: 0, chosenPath: '', selectedServiceLevel: '',
      isEditingFromCabinet: false, cameFromCabinet: false, approvalEditMode: false,
      productConfig: DEFAULT_CONFIG,
    });
  },
}));

// Sync productConfig via setState override — no external subscribe needed
const origSetState = useProjectStore.setState;
useProjectStore.setState = (partial, replace) => {
  origSetState(partial, replace);
  const state = useProjectStore.getState();
  if (partial.productConfig) saveSession('fc_productConfig', state.productConfig);
};

export default useProjectStore;
