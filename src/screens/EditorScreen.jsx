import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import useEditorStore from '../stores/useEditorStore';
import useProjectStore from '../stores/useProjectStore';
import useAuthStore from '../stores/useAuthStore';
import useUIStore from '../stores/useUIStore';
import EditorTopbar from '../components/editor/EditorTopbar';
import EditorSidebar from '../components/editor/EditorSidebar';
import EditorCanvas from '../components/editor/EditorCanvas';
import EditorStrip from '../components/editor/EditorStrip';
import Lightbox from '../components/editor/Lightbox';
import DesignerNudge from '../components/editor/DesignerNudge';
import UploadProgressBar from '../components/editor/UploadProgressBar';
import MobileEditorTopbar from '../components/editor/MobileEditorTopbar';
import MobileBottomToolbar from '../components/editor/MobileBottomToolbar';
const WelcomeUploadPopup = lazy(() => import('../components/editor/WelcomeUploadPopup'));
import MobileVerticalEditor from '../components/editor/MobileVerticalEditor';
import { createProjectSnapshot, saveProject, generateId } from '../utils/projectStorage';
import { updateOrderStatus } from '../utils/adminData';
import { sendAdminNotification } from '../firebase/notifications';
import { getProject as getFirestoreProject } from '../firebase/projects';
import { restoreSpreads, restorePhotos } from '../utils/projectRestore';
import { createSpread, loadApprovedLayouts } from '../utils/layoutEngine';
import { getPagePrice } from '../utils/pricing';
import { getAllCoverTemplates } from '../utils/coverData';
import { logProjectSaved, logPhotoUpload } from '../utils/editHistory';
import UploadWidget from '../components/editor/UploadWidget';
import OfflineBanner from '../components/editor/OfflineBanner';

/* PhoneGate removed — auth is now handled via email_code or google */

function UploadTimer({ isUploading }) {
  const [elapsed, setElapsed] = useState(0);
  const [finalTime, setFinalTime] = useState(null);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (isUploading) {
      startRef.current = performance.now();
      setFinalTime(null);
      setElapsed(0);
      const tick = () => {
        setElapsed(((performance.now() - startRef.current) / 1000));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else if (startRef.current && !finalTime) {
      cancelAnimationFrame(rafRef.current);
      setFinalTime(elapsed);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isUploading]);

  const time = finalTime ?? elapsed;
  if (!startRef.current && !finalTime) return null;

  const mins = Math.floor(time / 60);
  const secs = (time % 60).toFixed(1);

  return (
    <div className={`fixed top-14 right-4 z-[70] px-3 py-1.5 rounded-full text-[12px] font-mono font-bold shadow-lg ${isUploading ? 'bg-red-500 text-white animate-pulse' : 'bg-green-500 text-white'}`}>
      {isUploading ? '⏱ ' : '✓ '}{mins > 0 ? `${mins}m ` : ''}{secs}s
    </div>
  );
}

function DebugBadge({ mobileShowEditor, readOnly }) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const currentSpread = useEditorStore((s) => s.currentSpread);
  const spreads = useEditorStore((s) => s.spreads);
  const photos = useEditorStore((s) => s.photos);
  const selectedFrame = useEditorStore((s) => s.selectedFrame);
  const panActive = useEditorStore((s) => s.panActive);
  if (!isAdmin) return null;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const spread = spreads[currentSpread];
  const mobileView = !mobileShowEditor ? 'WELCOME' : 'PAGINI';
  const view = isMobile ? mobileView : 'DESKTOP';
  const spreadInfo = spread?.isCover ? 'COVER' : `R${currentSpread}/${spreads.length - 1}`;
  const mode = spread?.mode === 'spread' ? 'full' : 'L+R';
  const pc = `${photos.filter(p => p.used).length}/${photos.length}`;
  const sel = selectedFrame ? ` SEL` : '';
  const pan = panActive ? ' PAN' : '';
  const ro = readOnly ? ' RO' : '';
  return (
    <div className="fixed bottom-[62px] sm:bottom-1 left-1 z-[9999] bg-black/80 text-[#4ADE80] text-[9px] font-mono px-2 py-1 rounded pointer-events-none leading-snug">
      {view} · {spreadInfo} · {mode} · {pc}{sel}{pan}{ro}
    </div>
  );
}

export default function EditorScreen() {
  const { addToast } = useUIStore();
  const { isAuthenticated, clientPhone, clientEmail, user, authMethod } = useAuthStore();
  const { projectId: urlProjectId } = useParams();
  const [searchParams] = useSearchParams();
  const readOnly = searchParams.get('readOnly') === 'true';
  useEffect(() => { useEditorStore.setState({ readOnly }); }, [readOnly]);
  const [phoneGateDone, setPhoneGateDone] = useState(false);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeShownRef = useRef(false);
  const navigate = useNavigate();

  // Funnel tracking — open editor
  useEffect(() => { import('../utils/errorTracker').then(({ trackStep }) => trackStep('open_editor')); }, []);

  // PhoneGate disabled — organic clients enter editor freely
  const needsPhoneGate = false;
  const photos = useEditorStore((s) => s.photos);

  const [mobileTransition, setMobileTransition] = useState(false);
  const [mobileShowEditor, setMobileShowEditor] = useState(false);

  // Animate empty→editor transition on mobile
  useEffect(() => {
    if (photos.length > 0 && !mobileShowEditor) {
      setMobileTransition(true);
      const t = setTimeout(() => { setMobileShowEditor(true); setMobileTransition(false); }, 350);
      return () => clearTimeout(t);
    }
  }, [photos.length, mobileShowEditor]);
  const spreads = useEditorStore((s) => s.spreads);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const approvalEditMode = useProjectStore((s) => s.approvalEditMode);
  const projectIdRef = useRef(currentProjectId);
  // Start as restoring if we have a project ID (from URL or store) — prevents welcome popup flash
  const storeHasProject = !!useProjectStore.getState().currentProjectId;
  const [isRestoring, setIsRestoring] = useState(!!urlProjectId || storeHasProject);

  // Welcome popup — only for truly NEW empty projects (no photos, no cover, no restored data)
  useEffect(() => {
    if (welcomeShownRef.current || readOnly || isRestoring) return;
    const { photos } = useEditorStore.getState();
    const hasPhotos = photos.length > 0;
    // Arată popup dacă nu are poze — chiar dacă are cover selectat
    if (!hasPhotos) {
      setShowWelcome(true);
      welcomeShownRef.current = true;
    } else {
      setShowWelcome(false);
    }
  }, [isRestoring, readOnly]);

  const [isApprovalMode, setIsApprovalMode] = useState(false);
  const [editingInApproval, setEditingInApproval] = useState(false);
  const [showApprovalPopup, setShowApprovalPopup] = useState(false);
  const [saveBarEmail, setSaveBarEmail] = useState('');
  const [saveBarPhone, setSaveBarPhone] = useState('');
  const [saveBarSaved, setSaveBarSaved] = useState(false);
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [photoPickerShown, setPhotoPickerShown] = useState(false);
  const fileInputRef = useRef(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const openPhotoPicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleMobileFileSelect = (e) => {
    if (e.target.files?.length) {
      useEditorStore.getState().addPhotos(e.target.files);
    }
    e.target.value = '';
  };

  // Listen for save popup trigger from topbar
  useEffect(() => {
    const handler = () => setShowSavePopup(true);
    window.addEventListener('openSavePopup', handler);
    return () => window.removeEventListener('openSavePopup', handler);
  }, []);

  // Load Google Fonts + sync custom fonts from Firestore
  useEffect(() => {
    import('../utils/fontManager').then(({ loadAllFonts, syncFontsFromFirestore }) => {
      loadAllFonts();
      syncFontsFromFirestore();
    }).catch(() => {});
  }, []);

  // Detect if this order is pending client approval — check orders collection ONLY (source of truth for status)
  useEffect(() => {
    if (!currentProjectId) return;
    (async () => {
      try {
        const { db } = await import('../firebase/config');
        if (!db) return;
        const { doc, getDoc } = await import('firebase/firestore');
        const orderSnap = await getDoc(doc(db, 'orders', currentProjectId));
        if (orderSnap.exists()) {
          const status = orderSnap.data().status;
          // ONLY show approval mode when designer explicitly sent it for review
          if (status === 'pending_client_approval') {
            setIsApprovalMode(true);
          }
          // If designer is still working — don't show anything special, just read-only would be handled elsewhere
        }
      } catch {}
    })();
  }, [currentProjectId]);


  // ── Load project from Firestore or initialize new ──
  useEffect(() => {
    // Load approved layouts from Firestore before restoring project
    loadApprovedLayouts();
    const storeProjectId = useProjectStore.getState().currentProjectId;

    function restoreProject(firestoreData) {
      // Firestore = singura sursă de adevăr
      const saved = firestoreData;
      if (!saved) return false;

      const mergedPhotos = (saved.photos || []);
      const mergedSpreads = saved.spreads || [];

      // Restore cover template — from project level, or from first spread, or fetch from Firestore
      let coverTpl = saved.coverTemplate || null;
      if (!coverTpl) {
        const coverSpread = mergedSpreads.find(s => s.isCover && s.coverTemplate);
        if (coverSpread) coverTpl = coverSpread.coverTemplate;
      }
      // If still no cover template but we know the cover ID, try to find it in cached templates
      if (!coverTpl && saved.productConfig?.coverId) {
        try {
          const found = getAllCoverTemplates().find(t => t.id === saved.productConfig.coverId);
          if (found) coverTpl = found;
        } catch {}
      }
      // Verifică dacă oferta a expirat — revine la prețul standard
      let restoredConfig = saved.productConfig || useProjectStore.getState().productConfig;
      if (saved.fromOffer && saved.offerDeadline && new Date(saved.offerDeadline) < new Date()) {
        // Oferta a expirat — recalculează prețul standard
        const standardPrice = getPagePrice(restoredConfig.format, restoredConfig.initialPages, restoredConfig.slug);
        restoredConfig = {
          ...restoredConfig,
          basePrice: standardPrice || restoredConfig.basePrice,
          _offerId: undefined,
          _offerDeadline: undefined,
          _offerOldPrice: undefined,
          _offerReady: undefined,
        };
      }
      useProjectStore.setState({
        currentProjectId: saved.id,
        productConfig: restoredConfig,
        coverTemplate: coverTpl,
      });
      const restoredPhotos = restorePhotos(mergedPhotos);
      const restoredSpreads = restoreSpreads(mergedSpreads, restoredPhotos);
      useEditorStore.setState({
        photos: restoredPhotos,
        spreads: restoredSpreads.length > 0 ? restoredSpreads : [createSpread([])],
        currentSpread: saved.currentSpread || 0,
        undoStack: [],
        redoStack: [],
        selectedFrame: null,
        swapSource: null,
      });
      projectIdRef.current = saved.id;
      return true;
    }

    function initNewProject() {
      const { productConfig, coverTemplate, currentProjectId: existingId } = useProjectStore.getState();
      const { spreads } = useEditorStore.getState();

      if (!existingId) {
        const newId = generateId();
        useProjectStore.getState().setProject(newId, null);
        projectIdRef.current = newId;
        navigate(`/app/editor/${newId}`, { replace: true });
      } else {
        projectIdRef.current = existingId;
        if (!urlProjectId) {
          navigate(`/app/editor/${existingId}`, { replace: true });
        }
      }

      if (spreads.length === 1 && spreads[0].photos.length === 0) {
        const interiorSpreads = Math.max(1, Math.floor(productConfig.initialPages / 2));
        const totalSpreads = interiorSpreads + (coverTemplate ? 1 : 0);
        useEditorStore.getState().initSpreads(totalSpreads, coverTemplate);
      }
    }

    // If URL has a projectId and it's different from current — load from Firestore ONLY
    if (urlProjectId && urlProjectId !== storeProjectId) {
      // Clear old project data immediately — prevents stale photos showing
      // _dirty stays false — prevents auto-save from overwriting Firestore while loading
      useEditorStore.setState({
        photos: [], spreads: [createSpread([])], currentSpread: 0,
        undoStack: [], redoStack: [], selectedFrame: null, swapSource: null,
        uploadProgress: 0, uploadedCount: 0, uploadTotalCount: 0,
        uploadBytesTotal: 0, uploadBytesSent: 0, isUploading: false,
        _dirty: false, saveStatus: 'idle',
      });
      setMobileShowEditor(false);
      setIsRestoring(true);
      getFirestoreProject(urlProjectId)
        .then((firestoreData) => {
          const ok = restoreProject(firestoreData);
          if (!ok) initNewProject();
        })
        .catch((err) => {
          console.warn('Firestore restore failed:', err);
          initNewProject();
        })
        .finally(() => setIsRestoring(false));
      return;
    }

    initNewProject();
    setIsRestoring(false);
  }, [urlProjectId]);

  // ── POST-RESTORE POPUP — show uploadFlow when returning to project with photos but none arranged ──
  useEffect(() => {
    if (readOnly || isRestoring) return;
    // Wait 2 seconds after restore for state to settle
    const timer = setTimeout(() => {
      const { photos, spreads, isUploading: uploading } = useEditorStore.getState();
      if (uploading) return; // Upload in progress — the upload trigger handles this
      if (photos.length < 5) return; // Too few photos
      // Check if any spread has photos placed
      const hasArranged = spreads.some(s =>
        (s.full?.photos?.length > 0) || (s.left?.photos?.length > 0) || (s.right?.photos?.length > 0)
      );
      if (hasArranged) return; // Already arranged
      // Check if already shown this session
      const projectId = useProjectStore.getState().currentProjectId;
      const key = `uploadflow_restored_${projectId}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      // Clear the upload flow flag so the popup can show after restore
      sessionStorage.removeItem(`uploadflow_shown_${projectId}`);
      // Open uploadFlow popup (not autoFill) — user sees their photo count and arrangement options
      const { activeModal } = useUIStore.getState();
      if (!activeModal) {
        useUIStore.getState().openModal('uploadFlow');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [isRestoring, readOnly]);

  // ── SAVE SYSTEM — Canva-style: save on every completed action ──
  useEffect(() => {
    if (readOnly) return;
    let saveInProgress = false;
    let lastSaveHash = '';

    const doSaveNow = async () => {
      if (saveInProgress) return;
      const editorState = useEditorStore.getState();
      const projectState = useProjectStore.getState();
      // Don't save if truly empty (no photos, no cover, only 1 default spread)
      const hasCoverSpread = editorState.spreads.some(s => s.isCover);
      const hasContent = editorState.photos.length > 0 || hasCoverSpread || editorState.spreads.length > 1;
      if (!hasContent) return;
      if (!editorState._dirty) return;

      const snapshot = createProjectSnapshot(
        projectIdRef.current, projectState, editorState, useAuthStore.getState()
      );

      // Quick hash to avoid duplicate saves — must include ALL mutable data
      const hash = JSON.stringify({
        tp: snapshot.totalPhotos, up: snapshot.usedPhotos, cs: snapshot.currentSpread,
        sp: snapshot.spreads?.length,
        lc: (snapshot.spreads || []).map(s => JSON.stringify(s.leafCrops || {})).join(''),
        ct: (snapshot.spreads || []).filter(s => s.isCover).map(s => (s.coverTexts || []).map(t => t.text).join('')).join(''),
        // Layout assignments — which photos on which page
        la: (snapshot.spreads || []).map(s => `${(s.fullPhotoIds||[]).join(',')}|${(s.leftPhotoIds||[]).join(',')}|${(s.rightPhotoIds||[]).join(',')}`).join(';'),
        // Variant indices — layout choices
        vi: (snapshot.spreads || []).map(s => `${s.fullVi||0},${s.leftVi||0},${s.rightVi||0}`).join(';'),
        // Cover frames
        cf: (snapshot.spreads || []).filter(s => s.isCover).map(s => (s.coverFrames||[]).map(f => `${f.photo?.id||''}:${JSON.stringify(f.photo?.cropOffset||{})}`).join(',')).join(';'),
        // Separator ratios — frame proportions
        ra: (snapshot.spreads || []).map(s => `${JSON.stringify(s.fullRatios||[])}|${JSON.stringify(s.leftRatios||[])}|${JSON.stringify(s.rightRatios||[])}`).join(';'),
        // Bounds — layout margins per page
        bn: (snapshot.spreads || []).map(s => `${JSON.stringify(s.fullBounds||0)}|${JSON.stringify(s.leftBounds||0)}|${JSON.stringify(s.rightBounds||0)}`).join(';'),
      });
      if (hash === lastSaveHash) return;
      lastSaveHash = hash;

      saveInProgress = true;
      useEditorStore.getState().markSaving();
      try {
        await saveProject(snapshot);
        useEditorStore.getState().markSaved();
      } catch {}
      saveInProgress = false;
    };

    // Listen to _dirty flag — save 2s after last change (debounce — prevents save spam during rapid edits)
    let saveTimer = null;
    const unsub = useEditorStore.subscribe((state, prev) => {
      if (state._dirty && !prev._dirty) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(doSaveNow, 2000);
      }
      // If still getting changes, reset timer
      if (state._dirty && state._tick !== prev._tick) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(doSaveNow, 2000);
      }
    });

    // Backup: periodic check every 5s for any missed changes
    const interval = setInterval(() => {
      if (useEditorStore.getState()._dirty) doSaveNow();
    }, 5000);

    // Save on tab switch / close
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') doSaveNow();
    };
    document.addEventListener('visibilitychange', onVisChange);

    // Save on refresh/close — warn user + best effort save
    const onBeforeUnload = (e) => {
      doSaveNow();
      // Show browser "are you sure?" dialog when there are unsaved changes
      if (useEditorStore.getState()._dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      unsub();
      clearInterval(interval);
      clearTimeout(saveTimer);
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
      doSaveNow();
    };
  }, []);

  const doSave = async () => {
    const editorState = useEditorStore.getState();
    const projectState = useProjectStore.getState();
    const snapshot = createProjectSnapshot(projectIdRef.current, projectState, editorState, useAuthStore.getState());
    await saveProject(snapshot);
    addToast('Proiect salvat!');
    const { clientName: cn, isAdmin, user: authUser } = useAuthStore.getState();
    const userName = authUser?.displayName || cn || 'Client';
    logProjectSaved(projectIdRef.current, userName, isAdmin ? 'admin' : 'customer');
  };

  const handleSave = async () => {
    const { clientPhone: cp, clientEmail: ce, isAdmin, user: u } = useAuthStore.getState();
    // Admin saves directly
    if (isAdmin) { await doSave(); return; }
    // Client needs BOTH phone AND email
    const hasPhone = !!cp;
    const hasEmail = !!(u?.email || ce);
    if (!hasPhone || !hasEmail) {
      sessionStorage.setItem('pendingSave', '1');
      navigate('/app/login?returnTo=/app/editor&mode=register');
      return;
    }
    await doSave();
  };

  // Auto-save after returning from login/register
  useEffect(() => {
    if (sessionStorage.getItem('pendingSave') === '1') {
      sessionStorage.removeItem('pendingSave');
      const { clientPhone: cp, clientEmail: ce, user: u } = useAuthStore.getState();
      if (cp || ce || u?.email) {
        setTimeout(() => { doSave(); addToast('Proiect salvat!'); }, 500);
      }
    }
  }, []);

  // ── Keyboard shortcuts (V10 spec) ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      const store = useEditorStore.getState();

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); store.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); store.redo(); return; }
      if (e.key === 'Escape') { store.clearSelection(); store.cancelSwap(); store.exitPan(); store.stopBoundsEdit(); return; }
      if (e.key === 'm' || e.key === 'M') { store.cycleLayout(); return; }
      if (e.key === 'r' || e.key === 'R') { store.shufflePhotos(); return; }
      if (e.key === 'a' || e.key === 'A') { store.autoLayoutCurrent(); return; }
      if (e.key === 'PageUp' || e.key === ',') { store.prevSpread(); return; }
      if (e.key === 'PageDown' || e.key === '.') { store.nextSpread(); return; }
      if (e.key === 'ArrowLeft') { store.prevSpread(); return; }
      if (e.key === 'ArrowRight') { store.nextSpread(); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Block exit while uploading (fast OR HQ background) ──
  const isUploading = useEditorStore(s => s.isUploading);
  useEffect(() => {
    if (!isUploading) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = 'Pozele se încarcă! Dacă pleci acum, vei pierde fotografiile neîncărcate.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isUploading]);

  // ── Branded loading screen — ONLY on first photo upload ──
  const [showBrandedLoader, setShowBrandedLoader] = useState(false);
  const hadPhotosBeforeUpload = useRef(photos.length > 0);
  useEffect(() => {
    if (isUploading && !hadPhotosBeforeUpload.current) {
      setShowBrandedLoader(true);
    }
    if (!isUploading && showBrandedLoader) {
      // Hide after upload finishes (small delay for smooth transition)
      const t = setTimeout(() => setShowBrandedLoader(false), 600);
      return () => clearTimeout(t);
    }
  }, [isUploading, showBrandedLoader]);
  // Track whether user already had photos (so subsequent uploads don't trigger it)
  useEffect(() => {
    if (photos.length > 0) hadPhotosBeforeUpload.current = true;
  }, [photos.length]);

  // ── UPLOAD FLOW POPUP — deschide când începe upload-ul ──
  const prevUploading = useRef(false);
  const uploadStartTimerRef = useRef(null);
  useEffect(() => {
    // Upload a început
    if (isUploading && !prevUploading.current && photos.length > 0) {
      const { activeModal } = useUIStore.getState();
      // Nu deschide dacă alt popup e deja activ (inclusiv welcome)
      if (!activeModal && !showWelcome) {
        // Clear any stale timer before setting a new one
        if (uploadStartTimerRef.current) clearTimeout(uploadStartTimerRef.current);
        uploadStartTimerRef.current = setTimeout(() => {
          uploadStartTimerRef.current = null;
          useUIStore.getState().openModal('uploadFlow');
        }, 1500);
      }
    }
    // Upload s-a terminat — dacă popup-ul nu e deschis, deschide-l
    if (!isUploading && prevUploading.current && photos.length >= 5) {
      // Cancel the start timer if upload finished before it fired
      if (uploadStartTimerRef.current) {
        clearTimeout(uploadStartTimerRef.current);
        uploadStartTimerRef.current = null;
      }
      const { activeModal } = useUIStore.getState();
      if (activeModal !== 'uploadFlow') {
        const projectId = useProjectStore.getState().currentProjectId;
        const key = `uploadflow_shown_${projectId}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          const hasArranged = spreads.some(s =>
            (s.full?.photos?.length > 0) || (s.left?.photos?.length > 0) || (s.right?.photos?.length > 0)
          );
          if (!hasArranged) {
            setTimeout(() => useUIStore.getState().openModal('uploadFlow'), 800);
          }
        }
      }
    }
    prevUploading.current = isUploading;
    return () => {
      if (uploadStartTimerRef.current) clearTimeout(uploadStartTimerRef.current);
    };
  }, [isUploading, photos.length, showWelcome]);

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] overflow-hidden overscroll-none touch-none-pull" style={{ overscrollBehavior: 'none' }}>
      {isRestoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAF8F5]">
          <div className="text-center animate-pulse">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#E8E4DB] rounded-2xl flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3D6B5E" strokeWidth="1.5">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <p className="text-[14px] text-[#8A8078] font-medium">Se încarcă albumul...</p>
          </div>
        </div>
      )}
      {/* PhoneGate removed — auth unified to email_code / google */}

      {/* Upload speed timer — desktop only */}
      <div className="hidden sm:block">
        <UploadTimer isUploading={isUploading} />
      </div>

      {/* ── UPLOAD WIDGET — desktop only (mobile shows progress inline in gallery) ── */}
      <div className="hidden sm:block">
        <UploadWidget />
      </div>

      {/* ── Approval Bar — when client reviews the album ── */}
      {isApprovalMode && !showApprovalPopup && (
        <div className="bg-[#3D6B5E] text-white px-5 py-3 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <span className="text-sm font-medium">Răsfoiește albumul tău. Când ești gata, confirmă.</span>
          </div>
          <div className="flex items-center gap-3">
            {!editingInApproval ? (
              <>
                <button onClick={async () => {
                  // Approve — send to print
                  updateOrderStatus(currentProjectId, 'approved_print', 'Client a aprobat macheta');
                  await sendAdminNotification('client_approved', {
                    orderId: currentProjectId,
                    clientName: user?.displayName || clientPhone || '',
                    message: `Clientul a aprobat macheta pentru comanda ${currentProjectId}`,
                  });
                  // Update Firestore
                  try {
                    const { db } = await import('../firebase/config');
                    if (db) {
                      const { doc, setDoc } = await import('firebase/firestore');
                      await setDoc(doc(db, 'orders', currentProjectId), { status: 'approved_print' }, { merge: true });
                    }
                  } catch {}
                  setShowApprovalPopup('approved');
                  setIsApprovalMode(false);
                }}
                  className="px-5 py-2 bg-white text-[#3D6B5E] rounded-xl text-sm font-bold hover:bg-gray-100 active:scale-[0.97] transition-all">
                  ✓ Totul e perfect — trimite la tipar
                </button>
                <button onClick={() => setEditingInApproval(true)}
                  className="px-4 py-2 text-white/80 text-sm hover:text-white transition">
                  Vreau să schimb ceva
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-white/70">Fă modificările, apoi confirmă →</span>
                <button onClick={async () => {
                  // Save modifications first
                  handleSave();
                  // Then approve
                  updateOrderStatus(currentProjectId, 'approved_print', 'Client a modificat și aprobat macheta');
                  await sendAdminNotification('client_approved', {
                    orderId: currentProjectId,
                    clientName: user?.displayName || clientPhone || '',
                    message: `Clientul a modificat și aprobat macheta pentru comanda ${currentProjectId}`,
                  });
                  try {
                    const { db } = await import('../firebase/config');
                    if (db) {
                      const { doc, setDoc } = await import('firebase/firestore');
                      await setDoc(doc(db, 'orders', currentProjectId), { status: 'approved_print' }, { merge: true });
                    }
                  } catch {}
                  setShowApprovalPopup('modified');
                  setIsApprovalMode(false);
                  setEditingInApproval(false);
                }}
                  className="px-5 py-2 bg-white text-[#3D6B5E] rounded-xl text-sm font-bold hover:bg-gray-100 active:scale-[0.97] transition-all">
                  ✓ Gata, trimite la tipar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Approval Success Popup ── */}
      {showApprovalPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden text-center">
            <div className="bg-[#3D6B5E] p-8 text-white">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="font-serif text-xl mb-1">Felicitări!</h2>
              <p className="text-sm text-white/70">
                {showApprovalPopup === 'modified'
                  ? 'Modificările au fost salvate. Albumul se trimite la tipar!'
                  : 'Albumul tău va fi tipărit! Te anunțăm când e gata.'}
              </p>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-5">Vei primi o notificare când albumul este gata de livrare.</p>
              <button onClick={() => { setShowApprovalPopup(false); navigate('/app/cabinet'); }}
                className="w-full py-3.5 rounded-xl bg-[#3D6B5E] text-white text-sm font-bold hover:bg-[#2d5445] active:scale-[0.98] transition-all">
                Am înțeles →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save popup (modal) — Google Auth + manual ── */}
      {showSavePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowSavePopup(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-[#3D6B5E] px-6 py-5 text-white text-center">
              <h3 className="font-serif text-xl mb-1">Salvează albumul</h3>
              <p className="text-sm text-white/70">Continuă de pe orice dispozitiv</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Google Auth — recommended, or already logged in */}
              <div>
                {authMethod === 'google' && user ? (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
                      {user.photoURL && <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-green-800 truncate">{user.displayName || user.email}</p>
                        <p className="text-xs text-green-600">Logat cu Google</p>
                      </div>
                      <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <button
                      onClick={() => {
                        const snapshot = createProjectSnapshot(projectIdRef.current, useProjectStore.getState(), useEditorStore.getState(), useAuthStore.getState());
                        saveProject(snapshot);
                        setShowSavePopup(false);
                        addToast('Proiect salvat!');
                      }}
                      className="w-full mt-3 py-3 rounded-xl bg-[#3D6B5E] text-white text-sm font-bold hover:bg-[#2d5246] active:scale-[0.98] transition-all"
                    >
                      Salvează proiectul
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 text-center">Recomandat</p>
                    <button
                      onClick={async () => {
                        try {
                          const { signInWithGoogle } = useAuthStore.getState();
                          const result = await signInWithGoogle();
                          if (result?.user) {
                            // Save user to Firestore users collection
                            try {
                              const { db } = await import('../firebase/config');
                              if (db) {
                                const { doc, setDoc } = await import('firebase/firestore');
                                await setDoc(doc(db, 'users', result.user.uid), {
                                  email: result.user.email,
                                  displayName: result.user.displayName,
                                  photoURL: result.user.photoURL,
                                  lastLogin: new Date().toISOString(),
                                  createdAt: new Date().toISOString(),
                                }, { merge: true });
                              }
                            } catch {}
                            // Update auth store
                            useAuthStore.setState({
                              clientEmail: result.user.email,
                              clientName: result.user.displayName,
                              userId: result.user.uid,
                              activeClientId: result.user.uid,
                              authMethod: 'google',
                            });
                            // Save project linked to user
                            const snapshot = createProjectSnapshot(projectIdRef.current, useProjectStore.getState(), useEditorStore.getState(), useAuthStore.getState());
                            saveProject(snapshot);
                            setShowSavePopup(false);
                            addToast(`Bine ai venit, ${result.user.displayName || result.user.email}!`);
                          }
                        } catch (e) {
                          console.error('Google auth failed:', e);
                          addToast('Autentificare eșuată. Încearcă manual.');
                        }
                      }}
                      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continuă cu Google
                    </button>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] text-gray-400 uppercase">sau manual</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Manual — phone + email */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">Email *</label>
                  <input type="email" value={saveBarEmail} onChange={e => setSaveBarEmail(e.target.value)}
                    placeholder="maria@gmail.com"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">Telefon</label>
                  <div className="flex">
                    <span className="bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl px-2.5 py-2.5 text-sm text-gray-400">+373</span>
                    <input type="tel" inputMode="numeric" value={saveBarPhone} onChange={e => setSaveBarPhone(e.target.value)}
                      placeholder="69 123 456"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-r-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
                  </div>
                </div>
                <button onClick={() => {
                  if (!saveBarEmail.includes('@')) return;
                  const phone = saveBarPhone ? '+373' + saveBarPhone.replace(/\D/g, '').slice(-8) : '';
                  useAuthStore.setState({
                    clientEmail: saveBarEmail.toLowerCase().trim(),
                    clientPhone: phone || useAuthStore.getState().clientPhone,
                    authMethod: 'email_save',
                  });
                  // Save to clients collection
                  (async () => {
                    try {
                      const { db } = await import('../firebase/config');
                      if (db) {
                        const { doc, setDoc } = await import('firebase/firestore');
                        const clientId = useAuthStore.getState().activeClientId || 'anon_' + Date.now();
                        await setDoc(doc(db, 'clients', clientId), {
                          email: saveBarEmail.toLowerCase().trim(),
                          phone: phone,
                          lastSeen: new Date().toISOString(),
                        }, { merge: true });
                      }
                    } catch {}
                  })();
                  setSaveBarSaved(true);
                  setShowSavePopup(false);
                  const snapshot = createProjectSnapshot(projectIdRef.current, useProjectStore.getState(), useEditorStore.getState(), useAuthStore.getState());
                  saveProject(snapshot);
                  addToast('Proiect salvat!');
                }}
                  className="w-full py-3 rounded-xl bg-[#3D6B5E] text-white text-sm font-bold hover:bg-[#2d5246] active:scale-[0.98] transition-all">
                  Salvează manual
                </button>
              </div>
            </div>

            <button onClick={() => setShowSavePopup(false)}
              className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 border-t border-gray-100 transition">Mai târziu</button>
          </div>
        </div>
      )}

      {/* ── READ-ONLY BANNER ── */}
      {readOnly && (
        <div className="bg-[#3D6B5E] text-white text-center py-2 px-4 text-[13px] font-medium z-50">
          Vizualizare album — doar citire
          <button onClick={() => navigate('/app/cabinet')} className="ml-3 underline underline-offset-2 text-white/80 hover:text-white">
            ← Înapoi la comenzi
          </button>
        </div>
      )}

      {/* ── WELCOME POPUP ── */}
      {showWelcome && (
        <Suspense fallback={null}>
          <WelcomeUploadPopup onClose={() => setShowWelcome(false)} />
        </Suspense>
      )}

      {/* ── DESKTOP TOPBAR ── */}
      {!readOnly && (
        <div className="hidden sm:block">
          <EditorTopbar onSave={handleSave} />
        </div>
      )}

      {/* ── MOBILE TOPBAR ── */}
      {!readOnly && <MobileEditorTopbar onSave={handleSave} />}

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden sm:flex flex-1 min-h-0">
        {!readOnly && <EditorSidebar onOpenLightbox={(idx) => setLightboxIdx(idx)} />}
        <div className="flex-1 flex flex-col min-w-0">
          <EditorCanvas />
          <EditorStrip />
        </div>
      </div>

      {/* ── MOBILE LAYOUT — vertical scroll through all spreads ── */}
      <div className="flex flex-col flex-1 min-h-0 sm:hidden relative">
        {/* Hidden file input — auto-triggered on first visit */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={handleMobileFileSelect}
          className="hidden"
        />

        {/* Offline banner — under topbar (upload progress moved inline to gallery on mobile) */}
        <OfflineBanner />

        {/* Empty state — beautiful welcome screen with exit animation */}
        {!mobileShowEditor ? (
          <div
            onClick={openPhotoPicker}
            className={`flex-1 flex items-center justify-center bg-gradient-to-b from-[#FAF8F5] to-[#E8E4DB] relative overflow-hidden cursor-pointer active:bg-[#E8E4DB] transition-all duration-300 ${mobileTransition ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          >
            {/* Subtle decorative circles */}
            <div className="absolute top-[15%] left-[10%] w-32 h-32 bg-[#3D6B5E]/[0.04] rounded-full blur-2xl" />
            <div className="absolute bottom-[20%] right-[5%] w-40 h-40 bg-[#B8860B]/[0.04] rounded-full blur-2xl" />

            <div className="text-center px-8 animate-[fadeIn_0.5s_ease] relative z-10">
              {/* Animated icon — hand tapping on album */}
              <div className="w-24 h-24 mx-auto mb-6 bg-[#F0EDE6] rounded-full flex items-center justify-center">
                <div className="relative">
                  <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                    <rect x="8" y="8" width="13" height="13" rx="2" fill="#3D6B5E" opacity="0.2" />
                    <rect x="27" y="8" width="13" height="13" rx="2" fill="#3D6B5E" opacity="0.3" />
                    <rect x="8" y="27" width="13" height="13" rx="2" fill="#3D6B5E" opacity="0.3" />
                    <rect x="27" y="27" width="13" height="13" rx="2" fill="#3D6B5E" opacity="0.15" />
                    <path d="M34 18c0-1.5-1.2-2.5-2.5-2.5S29 16.5 29 18v-3c0-1.5-1.2-2.5-2.5-2.5S24 13.5 24 15v-2c0-1.5-1.2-2.5-2.5-2.5S19 11.5 19 13v12l-3-3c-1-1-2.5-1-3.5 0s-1 2.6 0 3.6l8 9c.5.5 1.2.9 2 .9h10c2 0 3.5-1.5 3.5-3.5V18z"
                      fill="#3D6B5E" opacity="0.7" />
                  </svg>
                  <div className="absolute -inset-2 rounded-full border-2 border-[#3D6B5E]/20 animate-ping" style={{ animationDuration: '2s' }} />
                </div>
              </div>

              <h2 className="text-[22px] font-bold text-[#1c1c1c] mb-2" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>
                Alege fotografiile tale
              </h2>
              <p className="text-[14px] text-[#8A8078] mb-2 leading-relaxed max-w-[260px] mx-auto">
                Selectează cel puțin <strong className="text-[#1c1c1c]">20 de poze</strong> din galerie pentru albumul perfect
              </p>

              <p className="text-[15px] text-[#3D6B5E] font-bold mt-6 animate-bounce">
                Atinge ecranul pentru a deschide galeria
              </p>

              <div className="flex items-center justify-center gap-4 mt-8 text-[11px] text-[#B0A89E]">
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Securizat
                </span>
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Cloud
                </span>
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Gratuit
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Vertical scroll editor — all spreads as cards */
          <div className="flex-1 flex flex-col min-h-0 animate-[fadeIn_0.4s_ease]">
            <MobileVerticalEditor isApprovalMode={isApprovalMode && !editingInApproval} />
          </div>
        )}

        {/* Bottom toolbar — hidden during empty state */}
        {mobileShowEditor && <MobileBottomToolbar onSave={handleSave} onOrder={async () => {
          // Blochează checkout dacă upload e în curs
          if (useEditorStore.getState().isUploading) {
            useUIStore.getState().addToast?.('Pozele se încarcă — așteaptă puțin');
            return;
          }
          const { chosenPath } = useProjectStore.getState();
          const { spreads } = useEditorStore.getState();
          const hasPhotosOnSpreads = spreads.some(s => s.photos?.length > 0 || s.full || s.left || s.right);

          if (chosenPath !== 'designer' && !hasPhotosOnSpreads) {
            useUIStore.getState().openModal('servicePicker');
            return;
          }

          import('../utils/errorTracker').then(({ trackStep }) => trackStep('click_order')).catch(() => {});

          // ── Cover guard — verifică dacă coperta e completă ──
          const { chosenPath: cp2 } = useProjectStore.getState();
          if (cp2 !== 'designer') {
            const coverSpread = spreads.find(s => s.isCover);
            const hasCoverPhoto = !!(coverSpread?.coverFrames?.some(f => f.photo) || coverSpread?.full?.photos?.length > 0);
            const coverTexts = coverSpread?.coverTexts || [];
            const hasCoverText = coverTexts.some(t => t.text && t.text !== 'Text' && t.text !== t.placeholder && t.text.trim().length > 2);
            if (!hasCoverPhoto || !hasCoverText) {
              useUIStore.getState().openModal('coverGuard', {
                hasCoverPhoto,
                hasCoverText,
                goToCover: () => {
                  const coverIdx = spreads.findIndex(s => s.isCover);
                  if (coverIdx >= 0) useEditorStore.getState().goToSpread(coverIdx);
                },
              });
              return;
            }
          }

          const { clientPhone: cp, clientEmail: ce, isAdmin, user: u } = useAuthStore.getState();
          const hasPhone = !!cp;
          const hasEmail = !!(u?.email || ce);
          if (!isAdmin && (!hasPhone || !hasEmail)) {
            sessionStorage.setItem('pendingSave', '1');
            navigate('/app/login?returnTo=/app/checkout&mode=register');
          } else {
            await doSave();
            navigate('/app/checkout');
          }
        }} />}
      </div>

      {/* Upload progress — desktop floating bar */}
      <div className="hidden sm:block">
        <UploadProgressBar />
      </div>

      {/* Designer nudge — appears once after uploading 5+ photos */}
      <DesignerNudge />

      {lightboxIdx !== null && photos.length > 0 && (
        <Lightbox
          photos={photos}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      {/* Debug status badge — admin only, reactive */}
      <DebugBadge mobileShowEditor={mobileShowEditor} readOnly={readOnly} />
    </div>
  );
}
