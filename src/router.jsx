import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation, useRouteError } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import MobileTabBar from './components/layout/MobileTabBar';
import { JsonLd, organizationSchema, websiteSchema } from './utils/seo';
import { trackPageView, initPixel, captureFbclid, getConsent } from './utils/metaPixel';
import CookieConsent from './components/shared/CookieConsent';

// Global error boundary — auto-reloads on chunk load failures
function ChunkErrorBoundary() {
  const error = useRouteError();
  const msg = String(error?.message || error || '');
  const isChunkError = msg.includes('dynamically imported module') || msg.includes('Failed to fetch') || msg.includes('Loading chunk');

  useEffect(() => {
    // Log ALL errors so we can debug
    console.error('[ErrorBoundary]', error);
    if (isChunkError) {
      const lastReload = Number(sessionStorage.getItem('chunk_err_reload') || 0);
      if (Date.now() - lastReload > 10000) {
        sessionStorage.setItem('chunk_err_reload', String(Date.now()));
        window.location.reload();
        return;
      }
    }
  }, [error, isChunkError]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', fontFamily: 'system-ui' }}>
      <div style={{ fontSize: '48px' }}>{isChunkError ? '🔄' : '⚠️'}</div>
      <p style={{ color: '#666', fontSize: '14px' }}>
        {isChunkError ? 'Se actualizeaza aplicatia...' : 'A apărut o eroare'}
      </p>
      {!isChunkError && (
        <pre style={{ maxWidth: '90vw', overflow: 'auto', padding: '12px', background: '#f5f5f5', borderRadius: '8px', fontSize: '12px', color: '#c00', textAlign: 'left' }}>
          {msg || 'Eroare necunoscută'}
        </pre>
      )}
      <button onClick={() => { sessionStorage.removeItem('chunk_err_reload'); window.location.reload(); }}
        style={{ padding: '8px 24px', borderRadius: '8px', background: '#3D6B5E', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
        Reincarca pagina
      </button>
    </div>
  );
}

// Homepage — loads immediately (critical path)
import LandingPage from './landing/LandingPage';
import App from './App';

// Page transition wrapper
function PageTransition({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Root layout — adds mobile tab bar + page transitions
// Global layout components — shared across all public pages
import AppHeader from './components/layout/AppHeader';
const LandingFooter = lazyRetry(() => import('./landing/sections/LandingFooter'));

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RootLayout() {
  const location = useLocation();
  // No header/footer on editor, admin, checkout, cabinet screens
  const isApp = location.pathname.includes('/editor') || location.pathname.includes('/admin_panel') || location.pathname.includes('/checkout') || location.pathname.includes('/cabinet');

  // Meta Pixel — init on first load + track PageView on each navigation
  useEffect(() => {
    captureFbclid();
    if (getConsent()) initPixel();
  }, []);

  useEffect(() => {
    trackPageView();
    // GTM/GA4 — SPA page view tracking
    window.dataLayer?.push({
      event: 'page_view',
      page_path: location.pathname,
      page_title: document.title,
    });
  }, [location.pathname]);

  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <ScrollToTop />
      <CookieConsent />
      {!isApp && <AppHeader />}
      <PageTransition>
        <Outlet />
      </PageTransition>
      {!isApp && (
        <Suspense fallback={null}>
          <LandingFooter />
        </Suspense>
      )}
      <MobileTabBar />
    </>
  );
}

// Loading fallback — minimal, clean
const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-[#3D6B5E]/20 border-t-[#3D6B5E] rounded-full animate-spin mx-auto mb-3" />
      <p className="text-[13px] text-[#B0A89E]">Se încarcă...</p>
    </div>
  </div>
);

// Lazy wrapper helper
const L = (importFn) => {
  const Component = lazy(importFn);
  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
};

// ── LAZY IMPORTS — se încarcă doar când sunt necesare ──

// Public pages (light)
const TravelPage = lazyRetry(() => import('./landing/TravelPage'));
const CollectionScreen = lazyRetry(() => import('./screens/CollectionScreen'));
const ProductScreen = lazyRetry(() => import('./screens/ProductScreen'));
const PricingScreen = lazyRetry(() => import('./screens/PricingScreen'));
const OffersScreen = lazyRetry(() => import('./screens/OffersPage'));
const OfferDetailPage = lazyRetry(() => import('./screens/OfferDetailPage'));
const PaginiScreen = lazyRetry(() => import('./screens/PaginiScreen'));

// Auth
const LoginScreen = lazyRetry(() => import('./screens/LoginScreen'));

// Editor (heavy — canvas engine, upload pipeline)
const EditorScreen = lazyRetry(() => import('./screens/EditorScreen'));
const CheckoutScreen = lazyRetry(() => import('./screens/CheckoutScreen'));
const ConfirmDesignerScreen = lazyRetry(() => import('./screens/ConfirmDesignerScreen'));
const CabinetScreen = lazyRetry(() => import('./screens/CabinetScreen'));

// 404
const NotFoundScreen = lazyRetry(() => import('./screens/NotFoundScreen'));

// Admin (heavy — all admin components)
const AdminScreen = lazyRetry(() => import('./screens/AdminScreen'));
const AdminDashboard = lazyRetry(() => import('./components/admin/AdminDashboard'));
const AdminLive = lazyRetry(() => import('./components/admin/AdminLive'));
const AdminOrders = lazyRetry(() => import('./components/admin/AdminOrders'));
const AdminOrderDetail = lazyRetry(() => import('./components/admin/AdminOrderDetail'));
const DeAsignat = lazyRetry(() => import('./components/admin/DeAsignat'));
const DeTrimis = lazyRetry(() => import('./components/admin/DeTrimis'));
const DeTiparit = lazyRetry(() => import('./components/admin/DeTiparit'));
const DeLivrat = lazyRetry(() => import('./components/admin/DeLivrat'));
const AdminClients = lazyRetry(() => import('./components/admin/AdminClients'));
const ClientDetail = lazyRetry(() => import('./components/admin/ClientDetail'));
const AdminInvitations = lazyRetry(() => import('./components/admin/AdminInvitations'));
const AdminTeam = lazyRetry(() => import('./components/admin/AdminTeam'));
const AdminDimensions = lazyRetry(() => import('./components/admin/AdminDimensions'));
const AdminCovers = lazyRetry(() => import('./components/admin/AdminCovers'));
const AdminCoverEditor = lazyRetry(() => import('./components/admin/AdminCoverEditor'));
const AdminPricing = lazyRetry(() => import('./components/admin/AdminPricing'));
const AdminOffers = lazyRetry(() => import('./components/admin/AdminOffers'));
const AdminCollections = lazyRetry(() => import('./components/admin/AdminCollections'));
const AdminProducts = lazyRetry(() => import('./components/admin/AdminProducts'));
const AdminLayouts = lazyRetry(() => import('./components/admin/AdminLayouts'));
const AdminEditorView = lazyRetry(() => import('./components/admin/AdminEditorView'));
const AdminHeroSlides = lazyRetry(() => import('./components/admin/AdminHeroSlides'));
const AdminLanding = lazyRetry(() => import('./components/admin/AdminLanding'));
const AdminTravel = lazyRetry(() => import('./components/admin/AdminTravel'));
const AdminPages = lazyRetry(() => import('./components/admin/AdminPages'));
const AdminEmails = lazyRetry(() => import('./components/admin/AdminEmails'));
const AdminErrors = lazyRetry(() => import('./components/admin/AdminErrors'));
const CmsScreen = lazyRetry(() => import('./screens/CmsScreen'));
const Abandonati = lazyRetry(() => import('./components/admin/Abandonati'));

// Lazy import with auto-retry on chunk load failure
function lazyRetry(fn) {
  return lazy(() => fn().then(mod => {
    // Success — clear any reload flag
    sessionStorage.removeItem('chunk_reload');
    return mod;
  }).catch(() => {
    // Chunk failed (stale cache) — reload page if not reloaded in last 10s
    const lastReload = Number(sessionStorage.getItem('chunk_reload') || 0);
    if (Date.now() - lastReload > 10000) {
      sessionStorage.setItem('chunk_reload', String(Date.now()));
      window.location.reload();
      return new Promise(() => {}); // never resolves — page reloads
    }
    // Already reloaded recently — try import one more time
    sessionStorage.removeItem('chunk_reload');
    return fn();
  }));
}

// Suspense wrapper for route elements
const S = (Component) => (
  <Suspense fallback={<Loading />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ChunkErrorBoundary />,
    children: [
      {
        path: '/',
        element: <LandingPage />,
      },
      {
        path: '/albume-de-calatorie',
        element: S(TravelPage),
      },
      {
        path: '/pagini',
        element: S(PaginiScreen),
      },
      {
        path: '/preturi',
        element: S(PricingScreen),
      },
      {
        path: '/oferte',
        element: S(OffersScreen),
      },
      {
        path: '/oferte/:offerId',
        element: S(OfferDetailPage),
      },
      { path: '/despre', element: S(CmsScreen) },
      { path: '/faq', element: S(CmsScreen) },
      { path: '/termeni', element: S(CmsScreen) },
      { path: '/confidentialitate', element: S(CmsScreen) },
      { path: '/contacte', element: S(CmsScreen) },
      {
        path: '/colectie/:tema',
        element: S(CollectionScreen),
      },
      {
        path: '/app/revin',
        element: <Navigate to="/" replace />,
      },
      {
        path: '/admin_panel',
        element: S(AdminScreen),
        children: [
          { index: true, element: S(AdminDashboard) },
          { path: 'live', element: S(AdminDashboard) },
          { path: 'orders', element: S(AdminOrders) },
          { path: 'orders/:orderId', element: S(AdminOrderDetail) },
          { path: 'abandonati', element: S(Abandonati) },
          { path: 'de_asignat', element: S(DeAsignat) },
          { path: 'de_trimis', element: S(DeTrimis) },
          { path: 'de_tiparit', element: S(DeTiparit) },
          { path: 'de_livrat', element: S(DeLivrat) },
          { path: 'clients', element: S(AdminClients) },
          { path: 'clients/:clientId', element: S(ClientDetail) },
          { path: 'invitations', element: S(AdminInvitations) },
          { path: 'team', element: S(AdminTeam) },
          { path: 'dimensions', element: S(AdminDimensions) },
          { path: 'pricing', element: S(AdminPricing) },
          { path: 'offers', element: S(AdminOffers) },
          { path: 'collections', element: S(AdminCollections) },
          { path: 'layouts', element: S(AdminLayouts) },
          { path: 'products', element: S(AdminProducts) },
          { path: 'covers', element: S(AdminCovers) },
          { path: 'covers/:coverId', element: S(AdminCoverEditor) },
          { path: 'hero', element: S(AdminHeroSlides) },
          { path: 'landing', element: S(AdminLanding) },
          { path: 'travel', element: S(AdminTravel) },
          { path: 'pages', element: S(AdminPages) },
          { path: 'emails', element: S(AdminEmails) },
          { path: 'errors', element: S(AdminErrors) },
        ],
      },
      {
        path: '/admin_panel/editor/:projectId',
        element: S(AdminEditorView),
      },
      {
        path: '/app',
        element: <App />,
        children: [
          { index: true, element: <Navigate to="editor" replace /> },
          { path: 'product/:slug', element: S(ProductScreen) },
          { path: 'offers', element: S(OffersScreen) },
          { path: 'covers', element: <Navigate to="/colectie/toate" replace /> },
          { path: 'login', element: S(LoginScreen) },
          { path: 'editor', element: S(EditorScreen) },
          { path: 'editor/:projectId', element: S(EditorScreen) },
          { path: 'checkout', element: S(CheckoutScreen) },
          { path: 'confirm-self', element: S(ConfirmDesignerScreen) },
          { path: 'confirm-designer', element: S(ConfirmDesignerScreen) },
          { path: 'cabinet', element: S(CabinetScreen) },
        ],
      },
      { path: '*', element: S(NotFoundScreen) },
    ],
  },
]);
