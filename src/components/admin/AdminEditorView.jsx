import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useProjectStore from '../../stores/useProjectStore';
import useEditorStore from '../../stores/useEditorStore';
import useAuthStore from '../../stores/useAuthStore';
import { createSpread } from '../../utils/layoutEngine';
import { restoreSpreads, restorePhotos } from '../../utils/projectRestore';
import { logAdminView } from '../../utils/editHistory';
import { getAllOrders, updateOrderStatus } from '../../utils/adminData';
import { sendUserNotification } from '../../firebase/notifications';
import { db } from '../../firebase/config';
import EditorTopbar from '../editor/EditorTopbar';
import EditorSidebar from '../editor/EditorSidebar';
import EditorCanvas from '../editor/EditorCanvas';
import EditorStrip from '../editor/EditorStrip';
import EditHistory from '../shared/EditHistory';

/* ── Diff helper: detect what changed between two project snapshots ── */
function detectChanges(prev, next) {
  if (!prev || !next) return [];
  const events = [];
  const now = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // New photos uploaded
  const prevPhotoIds = new Set((prev.photos || []).map(p => p.id));
  const newPhotos = (next.photos || []).filter(p => !prevPhotoIds.has(p.id));
  if (newPhotos.length > 0) {
    events.push({ time: now, icon: '📸', text: `+${newPhotos.length} poze noi`, type: 'upload' });
  }

  // Photos got URLs (upload completed)
  const prevWithUrl = (prev.photos || []).filter(p => p.previewUrl).length;
  const nextWithUrl = (next.photos || []).filter(p => p.previewUrl).length;
  if (nextWithUrl > prevWithUrl) {
    events.push({ time: now, icon: '✅', text: `${nextWithUrl - prevWithUrl} poze incarcate`, type: 'upload' });
  }

  // Photo moved (crop offset changed) — check leafCrops on spreads
  const prevLeafCrops = (prev.spreads || []).map(s => JSON.stringify(s.leafCrops || {})).join('');
  const nextLeafCrops = (next.spreads || []).map(s => JSON.stringify(s.leafCrops || {})).join('');
  if (prevLeafCrops !== nextLeafCrops) {
    events.push({ time: now, icon: '✋', text: 'Cadrare poze modificata', type: 'move' });
  }

  // Spread changed
  if (prev.currentSpread !== next.currentSpread) {
    events.push({ time: now, icon: '📖', text: `Pagina ${(next.currentSpread || 0) + 1}`, type: 'navigate' });
  }

  // Layout changed (photos assigned to different spreads — check per-page IDs)
  const prevLayout = (prev.spreads || []).map(s => `${(s.fullPhotoIds||s.photoIds||[]).join(',')}_${(s.leftPhotoIds||[]).join(',')}_${(s.rightPhotoIds||[]).join(',')}`).join('|');
  const nextLayout = (next.spreads || []).map(s => `${(s.fullPhotoIds||s.photoIds||[]).join(',')}_${(s.leftPhotoIds||[]).join(',')}_${(s.rightPhotoIds||[]).join(',')}`).join('|');
  if (prevLayout !== nextLayout) {
    events.push({ time: now, icon: '🔄', text: 'Layout modificat', type: 'layout' });
  }

  // Cover text changed
  const prevCoverTexts = (prev.spreads || []).filter(s => s.isCover).flatMap(s => (s.coverTexts || []).map(t => t.text)).join('|');
  const nextCoverTexts = (next.spreads || []).filter(s => s.isCover).flatMap(s => (s.coverTexts || []).map(t => t.text)).join('|');
  if (prevCoverTexts !== nextCoverTexts) {
    events.push({ time: now, icon: '✏️', text: 'Text coperta modificat', type: 'text' });
  }

  // Separator ratios changed (frame proportions)
  const prevRatios = (prev.spreads || []).map(s => JSON.stringify([s.fullRatios, s.leftRatios, s.rightRatios])).join('');
  const nextRatios = (next.spreads || []).map(s => JSON.stringify([s.fullRatios, s.leftRatios, s.rightRatios])).join('');
  if (prevRatios !== nextRatios) {
    events.push({ time: now, icon: '↔️', text: 'Proportii cadre modificate', type: 'layout' });
  }

  // Progress changed
  if ((prev.progress || 0) !== (next.progress || 0)) {
    events.push({ time: now, icon: '📊', text: `Progres: ${next.progress || 0}%`, type: 'progress' });
  }

  return events;
}

export default function AdminEditorView() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sent, setSent] = useState(false);
  const [liveLog, setLiveLog] = useState([]);
  const [showLivePanel, setShowLivePanel] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [adminEditing, setAdminEditing] = useState(false);
  // Sync readOnly state — when admin is NOT editing, editor is readOnly (view-only mirroring)
  useEffect(() => { useEditorStore.setState({ readOnly: !adminEditing }); }, [adminEditing]);
  const prevSnapshotRef = useRef(null);
  const syncCountRef = useRef(0);

  const addLiveEvents = useCallback((events) => {
    if (events.length === 0) return;
    setLiveLog(prev => [...events, ...prev].slice(0, 50));
  }, []);

  /* ── Apply Firestore snapshot to editor state ── */
  const applySnapshot = useCallback((data) => {
    // Skip mirroring when admin is actively editing
    if (adminEditing) return;
    // Detect changes vs previous
    const prev = prevSnapshotRef.current;
    const changes = detectChanges(prev, data);
    if (changes.length > 0) {
      addLiveEvents(changes);
      syncCountRef.current++;
    }
    prevSnapshotRef.current = data;

    // Update order info
    setOrderInfo({
      clientName: data.clientName || '—',
      clientEmail: data.clientEmail || '',
      clientPhone: data.clientPhone || '',
      clientId: data.client_id || data.activeClientId || null,
      status: data.status || 'draft',
    });

    // Restore project config
    if (data.productConfig) {
      useProjectStore.setState({
        currentProjectId: data.id || projectId,
        productConfig: { ...data.productConfig },
        coverTemplate: data.coverTemplate || null,
      });
    }

    // Restore photos + spreads
    const restoredPhotos = restorePhotos(data.photos);
    const restoredSpreads = restoreSpreads(data.spreads || [], restoredPhotos);

    useEditorStore.setState({
      photos: restoredPhotos,
      spreads: restoredSpreads.length > 0 ? restoredSpreads : [createSpread([])],
      currentSpread: data.currentSpread || 0,
      undoStack: [],
      redoStack: [],
      selectedFrame: null,
      swapSource: null,
    });

    setLastSync(new Date());
  }, [projectId, addLiveEvents]);

  /* ── Initial load + real-time listener ── */
  useEffect(() => {
    if (!isAdmin) {
      setError('Acces interzis');
      setLoading(false);
      return;
    }

    let unsub = null;

    (async () => {
      setLoading(true);
      setError(null);

      let order = null;

      // 1. Try Firestore first
      if (db) {
        try {
          const { doc, getDoc, onSnapshot } = await import('firebase/firestore');
          const snap = await getDoc(doc(db, 'projects', projectId));
          if (snap.exists()) {
            order = { id: snap.id, ...snap.data() };
          }
          if (!order) {
            const orderSnap = await getDoc(doc(db, 'orders', projectId));
            if (orderSnap.exists()) {
              order = { id: orderSnap.id, ...orderSnap.data() };
            }
          }

          // Set up real-time listener
          unsub = onSnapshot(doc(db, 'projects', projectId), (docSnap) => {
            if (!docSnap.exists()) return;
            const data = { id: docSnap.id, ...docSnap.data() };
            setIsLive(true);
            applySnapshot(data);
          });

          console.log('%c[ADMIN LIVE] Real-time mirroring active for #' + projectId, 'color: red; font-weight: bold');
          addLiveEvents([{
            time: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            icon: '🔴',
            text: 'Mirroring LIVE activat',
            type: 'system',
          }]);
        } catch (e) {
          console.warn('Firestore load failed:', e);
        }
      }

      // 2. Fallback to localStorage
      if (!order) {
        const allOrders = getAllOrders();
        order = allOrders.find((o) => o.id === projectId);
      }

      if (!order) {
        setError(`Proiectul "${projectId}" nu a fost gasit`);
        setLoading(false);
        return;
      }

      // Apply initial state
      prevSnapshotRef.current = order;
      applySnapshot(order);

      // Log admin view
      logAdminView(projectId, user?.displayName || user?.email || 'Admin');

      setLoading(false);
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [projectId, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Se incarca proiectul...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-gray-500">{error}</p>
        <button
          onClick={() => navigate('/admin_panel/orders')}
          className="text-sm text-[#3D6B5E] hover:underline"
        >
          ← Inapoi la comenzi
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F7F7F7] overflow-hidden">
      {/* Admin bar */}
      <div className="bg-[#2C2520] text-white px-4 py-2 flex items-center gap-4 text-sm shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="text-white/60 hover:text-white transition-colors"
        >
          ← Inapoi
        </button>
        <div className="h-4 w-px bg-white/20" />
        <span className="font-semibold">Admin LIVE</span>
        {/* Live indicator */}
        {isLive && (
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-red-400 text-xs font-mono">LIVE</span>
          </span>
        )}
        <div className="h-4 w-px bg-white/20" />
        <span className="text-white/60">
          {orderInfo?.clientName}
          {orderInfo?.clientEmail ? ` (${orderInfo.clientEmail})` : ''}
        </span>
        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
          orderInfo?.status === 'draft' ? 'bg-gray-600' :
          orderInfo?.status?.includes('designer') ? 'bg-purple-600' :
          orderInfo?.status?.includes('approved') ? 'bg-green-600' :
          'bg-yellow-600'
        }`}>
          {orderInfo?.status}
        </span>
        <div className="flex-1" />

        {/* Trimite la client button */}
        {orderInfo?.status && !['approved_print', 'shipped', 'delivered'].includes(orderInfo.status) && !sent && (
          <button
            onClick={async () => {
              updateOrderStatus(projectId, 'pending_client_approval', 'Trimis spre aprobare client');
              if (db) {
                try {
                  const { doc, setDoc } = await import('firebase/firestore');
                  await setDoc(doc(db, 'orders', projectId), { status: 'pending_client_approval' }, { merge: true }).catch(() => {});
                  await setDoc(doc(db, 'projects', projectId), { status: 'pending_client_approval' }, { merge: true }).catch(() => {});
                } catch {}
              }
              await sendUserNotification({
                clientId: orderInfo?.clientId || null,
                orderId: projectId,
                title: 'Albumul tau este gata!',
                message: `Comanda ${projectId} a fost finalizata. Previzualizeaza si confirma trimiterea la tipar.`,
                action: 'Previzualizeaza albumul',
                actionUrl: '/app/cabinet',
              });
              setSent(true);
              setOrderInfo((prev) => prev ? { ...prev, status: 'pending_client_approval' } : prev);
            }}
            className="text-xs px-4 py-1.5 rounded-full bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
          >
            Trimite la client
          </button>
        )}
        {sent && (
          <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-300">
            Trimis!
          </span>
        )}

        {/* Admin edit toggle */}
        <button
          onClick={() => setAdminEditing(!adminEditing)}
          className={`text-xs px-3 py-1 rounded-full transition-colors font-semibold ${
            adminEditing ? 'bg-orange-500/30 text-orange-300' : 'bg-white/10 text-white/60 hover:text-white'
          }`}
        >
          {adminEditing ? '✏️ Editare activă' : '👁 Doar vizualizare'}
        </button>

        <button
          onClick={() => setShowLivePanel(!showLivePanel)}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            showLivePanel ? 'bg-red-500/30 text-red-300' : 'bg-white/10 text-white/60 hover:text-white'
          }`}
        >
          {showLivePanel ? '🔴 Live Log' : '🔴 Live Log'}
        </button>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            showHistory ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60 hover:text-white'
          }`}
        >
          Istoric
        </button>
        <span className="text-white/40 text-xs">ID: {projectId}</span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 relative">
        <div className="flex flex-col flex-1 min-w-0">
          <EditorTopbar onSave={async () => {
            // Admin save — push changes to Firestore so client sees them in real time
            try {
              const { createProjectSnapshot, saveProject } = await import('../../utils/projectStorage');
              const snap = createProjectSnapshot(projectId, useProjectStore.getState(), useEditorStore.getState(), { clientName: orderInfo?.clientName, clientPhone: orderInfo?.clientPhone, clientEmail: orderInfo?.clientEmail, activeClientId: orderInfo?.clientId });
              saveProject(snap);
              addLiveEvents([{ time: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), icon: '💾', text: 'Salvat de admin', type: 'system' }]);
            } catch (e) { console.error('Admin save failed:', e); }
          }} />
          <div className="flex flex-1 min-h-0">
            <EditorSidebar onOpenLightbox={() => {}} />
            <div className="flex-1 flex flex-col min-w-0">
              <EditorCanvas />
              <EditorStrip />
            </div>
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="w-[280px] border-l border-[#EBEBEB] bg-white overflow-y-auto p-4 shrink-0">
            <EditHistory projectId={projectId} />
          </div>
        )}

        {/* ── Floating LIVE Activity Panel (bottom-right) ── */}
        {showLivePanel && (
          <div className="absolute bottom-4 right-4 w-[320px] max-h-[360px] bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50 flex flex-col"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            {/* Panel header */}
            <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-white text-xs font-semibold">Activitate Client - LIVE</span>
              <span className="ml-auto text-white/30 text-[10px] font-mono">
                {syncCountRef.current} sync{syncCountRef.current !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setShowLivePanel(false)}
                className="text-white/30 hover:text-white/60 text-xs ml-1"
              >
                ✕
              </button>
            </div>

            {/* Event list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ maxHeight: '300px' }}>
              {liveLog.length === 0 ? (
                <div className="text-white/20 text-xs text-center py-6">
                  Se asteapta activitatea clientului...
                </div>
              ) : (
                liveLog.map((entry, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                      i === 0 ? 'bg-white/10 animate-[fadeIn_0.3s_ease-out]' : 'bg-transparent'
                    }`}
                  >
                    <span className="shrink-0 text-sm leading-none mt-0.5">{entry.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className={`${
                        entry.type === 'system' ? 'text-red-400' :
                        entry.type === 'upload' ? 'text-green-400' :
                        entry.type === 'move' ? 'text-blue-400' :
                        entry.type === 'navigate' ? 'text-yellow-400' :
                        entry.type === 'text' ? 'text-purple-400' :
                        'text-white/70'
                      }`}>
                        {entry.text}
                      </span>
                    </div>
                    <span className="text-white/20 text-[10px] font-mono shrink-0">{entry.time}</span>
                  </div>
                ))
              )}
            </div>

            {/* Footer with last sync */}
            {lastSync && (
              <div className="px-3 py-1.5 border-t border-white/5 text-[10px] text-white/20 font-mono">
                Ultima sincronizare: {lastSync.toLocaleTimeString('ro-RO')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
