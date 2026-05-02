import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Toast from './components/layout/Toast';
import useUIStore from './stores/useUIStore';
import useAuthStore from './stores/useAuthStore';
import UploadModal from './components/upload/UploadModal';
import ServicePickerModal from './components/modals/ServicePickerModal';
import CancelModal from './components/modals/CancelModal';
import AutoFillPopup from './components/editor/AutoFillPopup';
import UploadFlowPopup from './components/editor/UploadFlowPopup';
import PostArrangePopup from './components/editor/PostArrangePopup';
import CoverGuardPopup from './components/editor/CoverGuardPopup';
import { createProjectSnapshot, saveProject } from './utils/projectStorage';
import { trackAddToCart } from './utils/metaPixel';
import { router } from './router';

// Meta Pixel — AddToCart la momentul real: clientul decide să cumpere
function fireAddToCart() {
  try {
    const projectState = require('./stores/useProjectStore').default.getState();
    const authState = require('./stores/useAuthStore').default.getState();
    const { productConfig, currentSpreadCount, chosenPath } = projectState;
    const pages = currentSpreadCount * 2 || productConfig?.initialPages || 40;
    // Calculează prețul real (cu paginile adăugate în editor, nu basePrice vechi)
    const { getPagePrice } = require('./utils/pricing');
    const livePrice = getPagePrice(productConfig?.format, pages, productConfig?.slug);
    const price = livePrice || productConfig?.basePrice || 0;
    trackAddToCart({
      productName: productConfig?.name || 'Album foto',
      productSlug: productConfig?.slug || 'album',
      price,
      format: productConfig?.format,
      pages,
      service: chosenPath === 'designer' ? 'designer' : 'self',
      user: {
        email: authState.clientEmail,
        phone: authState.clientPhone,
        firstName: authState.clientName?.split(' ')[0],
        lastName: authState.clientName?.split(' ').slice(1).join(' '),
        externalId: authState.userId,
      },
    });
  } catch (e) { console.warn('[MetaPixel] AddToCart error:', e); }
}

// Salvează proiectul înainte de a naviga la checkout
async function saveBeforeCheckout() {
  try {
    const editorState = (await import('./stores/useEditorStore')).default.getState();
    const projectState = (await import('./stores/useProjectStore')).default.getState();
    const authState = (await import('./stores/useAuthStore')).default.getState();
    const snapshot = createProjectSnapshot(projectState.currentProjectId, projectState, editorState, authState);
    await saveProject(snapshot);
  } catch (e) { console.warn('Save before checkout failed:', e); }
}


function ModalContainer() {
  const { activeModal, modalData, closeModal } = useUIStore();

  switch (activeModal) {
    case 'servicePicker': return <ServicePickerModal />;
    case 'cancel':        return <CancelModal />;
    case 'upload':        return <UploadModal />;
    case 'autoFill':      return <AutoFillPopup
      onClose={closeModal}
      onDone={() => {
        closeModal();
        // Delay 12s — clientul vede macheta, analizează cum s-au pus pozele
        setTimeout(() => useUIStore.getState().openModal('postArrange'), 12000);
      }}
    />;
    case 'uploadFlow':    return <UploadFlowPopup
      onAutoFill={() => { closeModal(); setTimeout(() => useUIStore.getState().openModal('autoFill'), 200); }}
      onManual={closeModal}
      onDesigner={async () => {
        const useProjectStore = require('./stores/useProjectStore').default;
        useProjectStore.getState().setChosenPath?.('designer');
        useProjectStore.getState().setServiceLevel?.('full_design');
        fireAddToCart(); // Meta Pixel — AddToCart (designer path)
        await saveBeforeCheckout();
        closeModal();
        router.navigate('/app/checkout');
      }}
      onClose={closeModal}
    />;
    case 'postArrange':   return <PostArrangePopup
      onCheckout={async () => {
        // Cover guard — verifică coperta înainte de checkout
        const editorState = require('./stores/useEditorStore').default.getState();
        const projectState = require('./stores/useProjectStore').default.getState();
        if (projectState.chosenPath !== 'designer') {
          const coverSpread = editorState.spreads.find(s => s.isCover);
          const hasCoverPhoto = !!(coverSpread?.coverFrames?.some(f => f.photo) || coverSpread?.full?.photos?.length > 0);
          const coverTexts = coverSpread?.coverTexts || [];
          const hasTextFields = coverTexts.length > 0;
          const hasCoverText = !hasTextFields || coverTexts.some(t => t.text && t.text !== 'Text' && t.text !== t.placeholder && t.text.trim().length > 2);
          if (!hasCoverPhoto || !hasCoverText) {
            closeModal();
            setTimeout(() => useUIStore.getState().openModal('coverGuard', {
              hasCoverPhoto,
              hasCoverText,
              goToCover: () => {
                const coverIdx = editorState.spreads.findIndex(s => s.isCover);
                if (coverIdx >= 0) editorState.goToSpread(coverIdx);
              },
            }), 200);
            return;
          }
        }
        fireAddToCart(); // Meta Pixel — AddToCart (self path, post-arrange)
        await saveBeforeCheckout();
        closeModal();
        router.navigate('/app/checkout');
      }}
      onAdjust={() => {
        closeModal();
        const store = require('./stores/useEditorStore').default.getState();
        const idx = store.spreads.findIndex(s => !s.isCover);
        if (idx >= 0) store.goToSpread(idx);
      }}
      onClose={closeModal}
    />;
    case 'coverGuard':    return <CoverGuardPopup
      hasCoverPhoto={modalData?.hasCoverPhoto || false}
      hasCoverText={modalData?.hasCoverText || false}
      onGoToCover={() => { closeModal(); if (modalData?.goToCover) modalData.goToCover(); }}
      onContinue={() => { fireAddToCart(); closeModal(); router.navigate('/app/checkout'); }}
      onClose={closeModal}
    />;
    // auth modal handled by GlobalAuthModal in main.jsx
    default:              return null;
  }
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // ── Auto-identify client from invite link ──
  // Works on ANY /app/* page — reads ?invite=slug, fetches from Firestore, sets phone+name
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const inviteSlug = params.get('invite');
    if (!inviteSlug) return;
    // Only run once per slug
    if (sessionStorage.getItem('_invite_done_' + inviteSlug)) return;
    sessionStorage.setItem('_invite_done_' + inviteSlug, '1');

    (async () => {
      try {
        const { db } = await import('./firebase/config');
        if (!db) return;
        const { collection, getDocs } = await import('firebase/firestore');

        // 1. Find invitation
        const invSnap = await getDocs(collection(db, 'invitations'));
        const inv = invSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(i => i.slug === inviteSlug);
        if (!inv || !inv.phone) return;

        // 2. Check if invitation is expired
        if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
          console.warn('[Invite] Invitation expired:', inviteSlug);
          return;
        }

        // 2b. Save invite slug — identity will be applied after authentication
        localStorage.setItem('fc_invite_slug', inviteSlug);
        try { localStorage.setItem('fc_invite_data', JSON.stringify({ name: inv.name, phone: inv.phone })); } catch {}

        // 2c. Log click to Firestore (track funnel)
        import('firebase/firestore').then(({ doc, updateDoc, increment }) => {
          import('./firebase/config').then(({ db: fdb }) => {
            if (fdb && inv.id) {
              const clickData = {
                clicks: increment(1),
                lastClickAt: new Date().toISOString(),
                lastClickDevice: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
              };
              if (!inv.firstClickAt) clickData.firstClickAt = new Date().toISOString();
              updateDoc(doc(fdb, 'invitations', inv.id), clickData).catch(() => {});
            }
          });
        });

        // 3. Find existing project for this client (cross-device restore)
        const norm = (ph) => (ph || '').replace(/\D/g, '').slice(-8);
        const myPhone = norm(inv.phone);
        const projSnap = await getDocs(collection(db, 'projects'));
        const existing = projSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => norm(p.clientPhone) === myPhone && (p.totalPhotos || 0) > 0)
          .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));

        if (existing.length > 0) {
          // Redirect to existing project (cross-device restore)
          const best = existing[0];
          const currentPath = window.location.pathname;
          if (!currentPath.includes(`/editor/${best.id}`)) {
            navigate(`/app/editor/${best.id}`, { replace: true });
          }
        }
      } catch (e) { console.warn('Invite lookup failed:', e); }
    })();
  }, [location.search]);

  // ── Track visitor — once per session ──
  useEffect(() => {
    if (sessionStorage.getItem('_tracked')) return;
    sessionStorage.setItem('_tracked', '1');

    (async () => {
      try {
        const { db } = await import('./firebase/config');
        if (!db) return;
        const { collection, addDoc } = await import('firebase/firestore');

        // Device detection
        const ua = navigator.userAgent;
        let device = 'desktop';
        if (/Mobi|Android/i.test(ua)) device = 'mobile';
        else if (/Tablet|iPad/i.test(ua)) device = 'tablet';
        const browser = /Chrome/i.test(ua) ? 'Chrome' : /Safari/i.test(ua) ? 'Safari' : /Firefox/i.test(ua) ? 'Firefox' : 'Altul';

        // Geolocation from IP
        let geo = { country: '—', city: '—' };
        try {
          const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
          if (res.ok) {
            const data = await res.json();
            geo = { country: data.country_name || data.country || '—', city: data.city || '—', region: data.region || '' };
          }
        } catch {}

        await addDoc(collection(db, 'visitors'), {
          device,
          browser,
          country: geo.country,
          city: geo.city,
          region: geo.region || '',
          page: location.pathname,
          referrer: document.referrer || '',
          screenW: window.innerWidth,
          screenH: window.innerHeight,
          timestamp: new Date().toISOString(),
        });
      } catch {}
    })();
  }, []);

  return (
    <div className="min-h-screen bg-bg pb-16 sm:pb-0 overflow-x-hidden">
      <Outlet />
      <Toast />
      <ModalContainer />
    </div>
  );
}
