import useAuthStore from '../stores/useAuthStore';
import useProjectStore from '../stores/useProjectStore';
import useOrderStore from '../stores/useOrderStore';

const SESSION_KEY = 'momentive-session';
const SESSION_TTL = 24 * 60 * 60 * 1000;

const TERMINAL_SCREENS = ['confirm-designer', 'confirm-self', 'confirm-approved'];
const LEGACY_SCREENS = ['upload', 'gallery', 'fork'];

export function useSessionRestore() {
  const saveSession = () => {
    const auth = useAuthStore.getState();
    const project = useProjectStore.getState();
    const order = useOrderStore.getState();

    const session = {
      ts: Date.now(),
      clientId: auth.activeClientId,
      screen: window.location.hash.replace('#/app/', ''),
      project: {
        currentProjectId: project.currentProjectId,
        currentSpreadCount: project.currentSpreadCount,
        chosenPath: project.chosenPath,
        selectedServiceLevel: project.selectedServiceLevel,
      },
      order: {
        approvalOrderId: order.approvalOrderId,
        currentOrderId: order.currentOrderId,
      },
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  };

  const restoreSession = (clientId) => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;

      const session = JSON.parse(raw);

      // Check TTL
      if (Date.now() - session.ts > SESSION_TTL) {
        clearSession();
        return null;
      }

      // Check client match
      if (session.clientId !== clientId) {
        clearSession();
        return null;
      }

      // Skip terminal screens
      if (TERMINAL_SCREENS.includes(session.screen)) {
        return 'cabinet';
      }

      // Redirect legacy screens to editor
      if (LEGACY_SCREENS.includes(session.screen)) {
        return 'editor';
      }

      // Restore store states
      if (session.project) {
        const store = useProjectStore.getState();
        if (session.project.currentProjectId) store.setProject(session.project.currentProjectId, null);
        if (session.project.currentSpreadCount) store.setSpreadCount(session.project.currentSpreadCount);
        if (session.project.chosenPath) store.setChosenPath(session.project.chosenPath);
        if (session.project.selectedServiceLevel) store.setServiceLevel(session.project.selectedServiceLevel);
      }

      if (session.order) {
        const store = useOrderStore.getState();
        if (session.order.currentOrderId) store.setCurrentOrder(session.order.currentOrderId);
      }

      return session.screen || 'cabinet';
    } catch (e) {
      console.warn('Session restore failed', e);
      return null;
    }
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
  };

  return { saveSession, restoreSession, clearSession };
}
