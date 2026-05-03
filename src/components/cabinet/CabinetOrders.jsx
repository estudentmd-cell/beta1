import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, getProjectsAsync, deleteProject } from '../../utils/projectStorage';
import { daysLeft } from '../../utils/offers';
import useProjectStore from '../../stores/useProjectStore';
import useEditorStore from '../../stores/useEditorStore';
import useAuthStore from '../../stores/useAuthStore';
import { createSpread } from '../../utils/layoutEngine';
import { restoreSpreads, restorePhotos } from '../../utils/projectRestore';
import { updateOrderStatus } from '../../utils/adminData';
import { sendAdminNotification } from '../../firebase/notifications';
import { db } from '../../firebase/config';

const PROGRESS_STEPS = ['Plătit', 'Designer', 'Aprobă', 'La tipar', 'Livrat'];

function getStepFromStatus(status) {
  if (status === 'delivered' || status === 'livrat') return 4;
  if (status === 'approved_print' || status === 'in_print' || status === 'shipped') return 3;
  if (status === 'pending_approval' || status === 'pending_client_approval' || status === 'revision_requested') return 2;
  if (status === 'paid_pending_designer' || status === 'paid_pending_verification' || status === 'designer_working') return 1;
  if (status === 'awaiting_payment') return 0;
  if (status === 'draft') return 0;
  return 0;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Status config ──
const STATUS_CONFIG = {
  draft: { label: 'Neterminat', bg: 'bg-[#FFF3CD]', text: 'text-[#856404]' },
  awaiting_payment: { label: 'Așteaptă achitarea', bg: 'bg-[#FFF3CD]', text: 'text-[#856404]' },
  paid_pending_verification: { label: 'Verificare', bg: 'bg-[#EAF0EC]', text: 'text-[#3D6B5E]' },
  paid_pending_designer: { label: 'La designer', bg: 'bg-[#F0EDFF]', text: 'text-[#5B4FC7]' },
  designer_working: { label: 'Designer lucrează', bg: 'bg-[#F0EDFF]', text: 'text-[#5B4FC7]' },
  pending_approval: { label: 'Gata — verifică', bg: 'bg-[#D4EDDA]', text: 'text-[#155724]' },
  pending_client_approval: { label: 'Gata — verifică', bg: 'bg-[#D4EDDA]', text: 'text-[#155724]' },
  revision_requested: { label: 'Modificări cerute', bg: 'bg-[#FFF3CD]', text: 'text-[#856404]' },
  approved_print: { label: 'La tipar', bg: 'bg-[#D1ECF1]', text: 'text-[#0C5460]' },
  in_print: { label: 'Se tipărește', bg: 'bg-[#FFF3CD]', text: 'text-[#856404]' },
  shipped: { label: 'Expediat', bg: 'bg-[#D1ECF1]', text: 'text-[#0C5460]' },
  delivered: { label: 'Livrat', bg: 'bg-[#D4EDDA]', text: 'text-[#155724]' },
  livrat: { label: 'Livrat', bg: 'bg-[#D4EDDA]', text: 'text-[#155724]' },
  cancelled: { label: 'Anulat', bg: 'bg-[#FDE8E8]', text: 'text-[#991B1B]' },
  refunded: { label: 'Rambursat', bg: 'bg-[#FDE8E8]', text: 'text-[#991B1B]' },
};

// ── Status messages ──
const STATUS_MESSAGES = {
  paid_pending_verification: { icon: '🔍', title: 'Albumul tău este în verificare', desc: 'Designerul verifică calitatea tehnică. Te notificăm când e gata.' },
  paid_pending_designer: { icon: '🎨', title: 'Designerul lucrează la albumul tău', desc: 'Te notificăm când macheta e gata pentru verificare.' },
  designer_working: { icon: '🎨', title: 'Designerul lucrează la albumul tău', desc: 'Te notificăm când macheta e gata pentru verificare.' },
  approved_print: { icon: '✅', title: 'Albumul se pregătește de tipar', desc: 'Macheta a fost verificată și aprobată tehnic.' },
  in_print: { icon: '🖨', title: 'Albumul tău se tipărește', desc: 'Te anunțăm când e gata de expediere.' },
  shipped: { icon: '📦', title: 'Albumul a fost expediat!', desc: 'Comanda e pe drum. Vei primi albumul în curând!' },
  cancelled: { icon: '❌', title: 'Comanda a fost anulată', desc: 'Proiectul tău rămâne salvat 60 de zile. Poți oricând crea o nouă comandă.' },
};

export default function CabinetOrders({ onNavigate }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const { activeClientId } = useAuthStore();
  const [offers, setOffers] = useState([]);
  const [showRevisionModal, setShowRevisionModal] = useState(null);
  const [revisionText, setRevisionText] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    import('../../utils/offers').then(m => m.getActiveOffersAsync()).then(setOffers);
  }, []);

  // Load this client's projects
  useEffect(() => {
    const { clientEmail, clientPhone, activeClientId } = useAuthStore.getState();
    console.log('[CabinetOrders] Looking for orders with:', { clientEmail, clientPhone, activeClientId });
    getProjectsAsync({ email: clientEmail, phone: clientPhone, clientId: activeClientId })
      .then(all => {
        if (db) {
          import('firebase/firestore').then(({ collection, getDocs, query, where }) => {
            // Query orders by client_id (Firestore rules require this filter)
            const queries = [];
            if (activeClientId) {
              queries.push(getDocs(query(collection(db, 'orders'), where('client_id', '==', activeClientId))).catch(() => ({ docs: [] })));
              queries.push(getDocs(query(collection(db, 'orders'), where('activeClientId', '==', activeClientId))).catch(() => ({ docs: [] })));
            }
            if (clientEmail) {
              queries.push(getDocs(query(collection(db, 'orders'), where('clientEmail', '==', clientEmail.toLowerCase().trim()))).catch(() => ({ docs: [] })));
            }
            Promise.all(queries).then(snapshots => {
              const orderMap = new Map();
              snapshots.forEach(snap => snap.docs?.forEach(d => orderMap.set(d.id, { id: d.id, ...d.data() })));
              const orders = Array.from(orderMap.values());
              console.log('[CabinetOrders] Found', orders.length, 'orders via queries. Matched by:', { activeClientId, clientEmail });
              // Merge by ID — orders override projects, no duplicates
              const merged = new Map();
              all.forEach(p => merged.set(p.id, p));
              orders.forEach(o => merged.set(o.id, { ...merged.get(o.id), ...o }));
              const result = Array.from(merged.values());
              setProjects(result);
            }).catch(() => setProjects(all));
          });
        } else {
          setProjects(all);
        }
      })
      .catch(() => {});
  }, [activeClientId]);

  const handleContinue = (project) => {
    useProjectStore.setState({
      currentProjectId: project.id,
      productConfig: project.productConfig,
      coverTemplate: project.coverTemplate,
    });
    const restoredPhotos = restorePhotos(project.photos);
    const restoredSpreads = restoreSpreads(project.spreads || [], restoredPhotos);
    useEditorStore.setState({
      photos: restoredPhotos,
      spreads: restoredSpreads.length > 0 ? restoredSpreads : [createSpread([])],
      currentSpread: project.currentSpread || 0,
      undoStack: [], redoStack: [], selectedFrame: null, swapSource: null,
    });
    navigate(`/app/editor/${project.id}`);
  };

  const handleDelete = (projectId) => {
    deleteProject(projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setConfirmDelete(null);
  };

  const handleApprove = async (project) => {
    updateOrderStatus(project.id, 'approved_print', 'Client a aprobat macheta');
    if (db) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'projects', project.id), { status: 'approved_print', approvedAt: new Date().toISOString() }, { merge: true });
      } catch {}
    }
    await sendAdminNotification('client_approved', {
      orderId: project.id, clientName: project.clientName || '', clientPhone: project.clientPhone || '',
      message: `${project.clientName || 'Clientul'} a aprobat macheta pentru comanda ${project.orderNumber || project.id}`,
    });
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: 'approved_print', statusLabel: 'Aprobat — trimis la tipar' } : p));
    setShowSuccessModal('approved');
  };

  const handleRevisionSubmit = async () => {
    if (!showRevisionModal || !revisionText.trim()) return;
    const project = showRevisionModal;
    updateOrderStatus(project.id, 'revision_requested', `Client cere modificări: ${revisionText.trim()}`);
    if (db) {
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'orders', project.id), {
          revisionMessage: revisionText.trim(), revisionCount: (project.revisionCount || 0) + 1, status: 'revision_requested',
        });
      } catch {}
    }
    await sendAdminNotification('revision_requested', {
      orderId: project.id, clientName: project.clientName || '', clientPhone: project.clientPhone || '',
      message: `${project.clientName || 'Clientul'} cere modificări: "${revisionText.trim()}"`, revisionMessage: revisionText.trim(),
    });
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: 'revision_requested', statusLabel: 'Modificări solicitate' } : p));
    setShowRevisionModal(null);
    setRevisionText('');
    setShowSuccessModal('revision');
  };

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      {/* Header — desktop only */}
      <div className="hidden md:flex items-center gap-3">
        <button onClick={() => onNavigate('account')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F0F0F0] transition-colors">
          <svg className="w-5 h-5 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-serif text-[24px] text-[#1A1A1A]">Comenzile mele</h2>
        <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-2 text-[12px] font-bold rounded-full bg-[#EAF0EC] text-[#3D6B5E]">
          {projects.length}
        </span>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center">
          <span className="text-4xl block mb-3">📖</span>
          <p className="text-[15px] font-semibold text-[#1A1A1A] mb-1">Nicio comandă încă</p>
          <p className="text-[13px] text-[#888] mb-4">Creează primul tău album foto!</p>
          <button onClick={() => navigate('/')}
            className="bg-[#3D6B5E] text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold">
            Alege un album →
          </button>
        </div>
      )}

      {/* ═══ PROJECT CARDS — grid ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {projects.map((project) => {
        const config = project.productConfig || {};
        const step = getStepFromStatus(project.status);
        const isDraft = project.status === 'draft';
        const isAwaitingPayment = project.status === 'awaiting_payment';
        const isPendingApproval = project.status === 'pending_approval' || project.status === 'pending_client_approval';
        const isDesignerWorking = ['paid_pending_designer', 'paid_pending_verification', 'designer_working', 'revision_requested'].includes(project.status);
        const isFinal = ['in_print', 'shipped', 'delivered'].includes(project.status);
        const price = project.priceTotal || config.basePrice || 0;
        const isOffer = config.isOffer;
        const offerOldPrice = config.offerOldPrice || 0;
        const offerData = isOffer ? offers.find((o) => o.id === config.offerId) : null;
        const offerDays = offerData ? daysLeft(offerData.deadline) : 0;
        const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
        const statusMsg = STATUS_MESSAGES[project.status];

        const coverImg = project.coverTemplate?.coverStyle?.mockupImage
          || project.coverTemplate?.coverStyle?.designSquare
          || project.coverTemplate?.coverStyle?.bgImage
          || null;

        const photoCount = project.photos?.length || project.totalPhotos || 0;

        return (
          <div key={project.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">

            {/* ── Approval Banner ── */}
            {isPendingApproval && (
              <div className="bg-[#3D6B5E] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎉</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-white">Albumul tău este gata!</p>
                    <p className="text-[11px] text-white/70">Răsfoiește-l și confirmă</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── THUMBNAIL ── */}
            <div className="relative aspect-square bg-[#F2F0ED] overflow-hidden">
              {coverImg ? (
                <img src={coverImg} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-[#D0CAC0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}
              {/* Overlays on thumbnail */}
              <div className="absolute top-3 left-3">
                <span className={`inline-flex items-center h-[26px] px-2.5 rounded-full text-[11px] font-bold backdrop-blur-sm ${sc.bg} ${sc.text}`}>
                  {sc.label}
                </span>
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white rounded-full px-2.5 h-[26px] text-[11px] font-semibold">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                </svg>
                {photoCount}
              </div>
              {/* Price badge */}
              {price > 0 && (
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 h-[30px] flex items-center gap-1.5 shadow-sm">
                  {isOffer && offerOldPrice > 0 && (
                    <span className="text-[11px] text-[#999] line-through">{Math.round(offerOldPrice)}</span>
                  )}
                  <span className={`text-[15px] font-bold ${isOffer ? 'text-[#3D6B5E]' : 'text-[#1C1C1E]'}`}>{Math.round(price)} lei</span>
                </div>
              )}
            </div>

            {/* ── CARD BODY ── */}
            <div className="px-3 pt-2 pb-3">

              {/* Order number + Title + format */}
              {project.orderNumber && (
                <p className="text-[11px] font-bold text-[#3D6B5E] font-mono">{project.orderNumber}</p>
              )}
              <h3 className="text-[13px] font-bold text-[#1C1C1E] truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {config.name || 'Album foto'}
              </h3>
              <p className="text-[11px] text-[#8E8E93] mt-0.5">
                {config.format || '20×20'} · {config.initialPages || 0} pag
              </p>
              <p className="text-[10px] text-[#B0A89E] mt-0.5">{formatDate(project.createdAt)}</p>

              {/* ── ACTION BUTTON — single, compact ── */}
              <div className="mt-2 space-y-1.5">
                {isDraft || isAwaitingPayment ? (
                  /* Draft or awaiting payment — client can edit freely */
                  <button onClick={() => handleContinue(project)}
                    className="w-full h-[36px] bg-[#1C1C1E] text-white rounded-lg text-[12px] font-bold active:scale-[0.97] transition-all">
                    {isDraft ? 'Editeaza' : 'Modifica comanda'}
                  </button>
                ) : (
                  /* Any other status — locked, read only + contact us */
                  <>
                    <button onClick={() => { handleContinue(project); navigate(`/app/editor/${project.id}?readOnly=true`); }}
                      className="w-full h-[36px] bg-[#F2F2F7] rounded-lg text-[12px] font-semibold text-[#3D6B5E] active:bg-[#E5E5EA] transition-colors">
                      Vezi albumul
                    </button>
                    {!isFinal && (
                      <a href="tel:+37360595984"
                        className="w-full h-[36px] flex items-center justify-center gap-1.5 bg-white border border-[#E8E4DB] rounded-lg text-[11px] font-medium text-[#888] active:bg-[#F5F3F0] transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        Contacteaza-ne pentru modificari
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
      </div>

      {/* Tip for drafts */}
      {projects.some((p) => p.status === 'draft') && (
        <div className="bg-[#EAF0EC] rounded-2xl p-4 flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <p className="text-[13px] font-semibold text-[#3D6B5E]">Albumul tău te așteaptă!</p>
            <p className="text-[12px] text-[#5A7E6E] mt-0.5">Progresul e salvat automat.</p>
          </div>
        </div>
      )}

      {/* New album CTA */}
      <button onClick={() => navigate('/')}
        className="w-full flex items-center justify-center gap-3 h-[50px] bg-white rounded-2xl text-[15px] font-semibold text-[#3D6B5E] active:scale-[0.98] transition-all shadow-sm">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Creează un album nou
      </button>

      {/* ── Delete Confirmation ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-4xl mb-3">🗑️</div>
              <h3 className="text-[17px] font-bold text-[#1A1A1A] mb-1">Ștergi albumul?</h3>
              <p className="text-[13px] text-[#888] mb-5">Acțiunea nu poate fi anulată.</p>
            </div>
            <button onClick={() => handleDelete(confirmDelete)}
              className="w-full h-[48px] bg-[#FF3B30] text-white rounded-xl text-[15px] font-bold active:scale-[0.97] transition-all mb-2">
              Șterge definitiv
            </button>
            <button onClick={() => setConfirmDelete(null)}
              className="w-full h-[44px] text-[15px] font-medium text-[#555] active:bg-[#F2F2F7] rounded-xl transition-colors">
              Anulează
            </button>
          </div>
        </div>
      )}

      {/* ── Revision Modal ── */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowRevisionModal(null)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[17px] font-bold text-[#1A1A1A] mb-2">✏️ Ce modificări dorești?</h3>
            <p className="text-[13px] text-[#777] mb-4">Descrie ce ai vrea schimbat.</p>
            <textarea
              value={revisionText}
              onChange={(e) => setRevisionText(e.target.value)}
              placeholder="Ex: Vreau să schimb ordinea pozelor pe pagina 3..."
              rows={4}
              className="w-full rounded-xl border border-[#DDD] px-4 py-3 text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowRevisionModal(null)}
                className="flex-1 h-[44px] rounded-xl text-[14px] text-[#777] bg-[#F2F2F7] active:bg-[#E5E5EA] transition">
                Anulează
              </button>
              <button onClick={handleRevisionSubmit} disabled={!revisionText.trim()}
                className="flex-1 h-[44px] bg-amber-500 text-white rounded-xl text-[14px] font-bold active:scale-[0.97] transition disabled:opacity-40">
                Trimite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Modal ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowSuccessModal(null)}>
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-8 shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            {showSuccessModal === 'approved' ? (
              <>
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-2">Felicitări!</h3>
                <p className="text-[13px] text-[#666] mb-6">Comanda ta va fi trimisă la tipar. Vei primi albumul în curând!</p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">✏️</div>
                <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-2">Mulțumim!</h3>
                <p className="text-[13px] text-[#666] mb-6">Designerul va face modificările. Te notificăm când e gata.</p>
              </>
            )}
            <button onClick={() => setShowSuccessModal(null)}
              className="w-full h-[44px] bg-[#3D6B5E] text-white rounded-xl text-[14px] font-bold active:scale-[0.97] transition">
              Am înțeles
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
