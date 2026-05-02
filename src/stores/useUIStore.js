import { create } from 'zustand';

let toastId = 0;

const useUIStore = create((set, get) => ({
  activeModal: null,
  modalData: null,
  toasts: [],

  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  addToast: (message) => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts, { id, message, ts: Date.now() }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));

export default useUIStore;
