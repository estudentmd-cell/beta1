import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import useAuthStore from './stores/useAuthStore';
import useCmsStore from './components/cms/useCmsStore';
import AdminToolbar from './components/cms/AdminToolbar';
import './styles/index.css';
import './styles/animations.css';
import GlobalAuthModal from './components/shared/GlobalAuthModal';
import MaintenancePage from './components/MaintenancePage';
import './styles/admin.css';

// Init Firebase auth listener on app boot
useAuthStore.getState().initAuth();

// Email link auth removed — now using email + 4-digit code + custom token

// Init error tracker & funnel monitor
import('./utils/errorTracker').then(({ initErrorTracker }) => initErrorTracker());

// Fetch CMS content on boot
useCmsStore.getState().fetchAll();

// Preload cover templates from Firestore — so colecție loads instant
import('./utils/coverData').then(({ getAllCoverTemplatesAsync }) => {
  getAllCoverTemplatesAsync().catch(() => {});
});

function Root() {
  return (
    <>
      <MaintenancePage />
      <RouterProvider router={router} />
      <AdminToolbar />
      <GlobalAuthModal />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
