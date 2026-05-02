import { create } from 'zustand';

const useOrderStore = create((set) => ({
  approvalOrderId: null,
  approvalOrder: null,
  currentOrderId: null,

  setApprovalOrder: (id, order) => set({ approvalOrderId: id, approvalOrder: order }),
  setCurrentOrder: (id) => set({ currentOrderId: id }),
  clearApproval: () => set({ approvalOrderId: null, approvalOrder: null }),
}));

export default useOrderStore;
