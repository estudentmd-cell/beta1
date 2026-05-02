import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useProjectStore from '../../stores/useProjectStore';
import useEditorStore from '../../stores/useEditorStore';
import { createSpread } from '../../utils/layoutEngine';
import { restoreSpreads, restorePhotos } from '../../utils/projectRestore';
import { sendUserNotification, sendAdminNotification } from '../../firebase/notifications';
import { db } from '../../firebase/config';
import EditHistory from '../shared/EditHistory';
import { saveProject } from '../../utils/projectStorage';
import {
  getAllOrders,
  getAllOrdersAsync,
  updateOrderStatus,
  assignDesigner,
  addOrderNote,
  calculateSLA,
  addContactEntry,
  getContactLog,
  deleteOrder,
  deleteClient,
  CONTACT_OUTCOMES,
} from '../../utils/adminData';
import StatusBadge, { getSalesAction } from './StatusBadge';
import SLABadge from './SLABadge';
import OrderTimeline from './OrderTimeline';
import { renderAllSpreads } from '../../utils/renderEngine';

// Who needs to act on this order?
function getActionOwner(status) {
  switch (status) {
    case 'awaiting_payment': return { who: 'admin', label: 'Așteaptă achitarea — sună clientul', color: 'bg-amber-100 text-amber-800' };
    case 'paid_pending_designer': return { who: 'admin', label: 'Admin trebuie să asigneze designer', color: 'bg-amber-100 text-amber-800' };
    case 'paid_pending_verification': return { who: 'admin', label: 'Admin trebuie să verifice', color: 'bg-amber-100 text-amber-800' };
    case 'designer_working': return { who: 'designer', label: 'Designerul lucrează', color: 'bg-blue-100 text-blue-800' };
    case 'revision_requested': return { who: 'designer', label: 'Designerul trebuie să facă modificări', color: 'bg-red-100 text-red-800' };
    case 'pending_client_approval': return { who: 'client', label: 'Clientul trebuie să aprobe', color: 'bg-purple-100 text-purple-800' };
    case 'approved_print': return { who: 'admin', label: 'Admin: export tipar', color: 'bg-green-100 text-green-800' };
    case 'in_print': return { who: 'factory', label: 'La tipar — se produce', color: 'bg-yellow-100 text-yellow-800' };
    case 'shipped': return { who: 'courier', label: 'Expediat — în curs de livrare', color: 'bg-cyan-100 text-cyan-800' };
    case 'delivered': return { who: 'done', label: 'Livrat — finalizat', color: 'bg-green-100 text-green-800' };
    default: return { who: 'client', label: 'Draft — clientul editează', color: 'bg-gray-100 text-gray-600' };
  }
}

export default function AdminOrderDetail() {
  const { orderId: selectedOrderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [clientOrders, setClientOrders] = useState([]);
  const [showAssign, setShowAssign] = useState(false);
  const [designerName, setDesignerName] = useState('');
  const [noteText, setNoteText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [showCallLog, setShowCallLog] = useState(false);
  const [callOutcome, setCallOutcome] = useState('');
  const [callNote, setCallNote] = useState('');
  const [contactHistory, setContactHistory] = useState([]);
  const [actionFeedback, setActionFeedback] = useState('');

  // Load order — localStorage first, then Firestore
  useEffect(() => {
    if (!selectedOrderId) return;
    const localOrders = getAllOrders();
    const localFound = localOrders.find((o) => o.id === selectedOrderId);
    if (localFound) setOrder(localFound);

    getAllOrdersAsync().then((merged) => {
      const found = merged.find((o) => o.id === selectedOrderId);
      if (found) {
        setOrder(found);
        const phone = (found.clientPhone || '').replace(/\D/g, '').slice(-8);
        const email = (found.clientEmail || '').toLowerCase().trim();
        const clientId = found.client_id || found.activeClientId;
        const others = merged.filter((o) => {
          if (o.id === selectedOrderId) return false;
          const oPhone = (o.clientPhone || '').replace(/\D/g, '').slice(-8);
          const oEmail = (o.clientEmail || '').toLowerCase().trim();
          const oId = o.client_id || o.activeClientId;
          return (phone && oPhone === phone) || (email && oEmail === email) || (clientId && oId === clientId);
        });
        setClientOrders(others);
        if (found.clientPhone) {
          setContactHistory(getContactLog(found.clientPhone));
        }
      }
    }).catch(() => {});
  }, [selectedOrderId]);

  if (!order) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>Comanda nu a fost găsită.</p>
        <button className="mt-4 text-sm text-[#3D6B5E] hover:underline" onClick={() => navigate('/admin_panel/orders')}>
          ← Înapoi
        </button>
      </div>
    );
  }

  const slaHours = calculateSLA(order);
  const status = order.status;
  const clientName = order.clientName || '—';
  const clientPhone = order.clientPhone || '';
  const clientEmail = order.clientEmail || '';
  const productName = order.productConfig?.name || '—';
  const format = order.productConfig?.format || '';
  const pages = order.productConfig?.initialPages || '';
  const totalPrice = order.priceTotal || 0;
  const albumPrice = order.priceAlbum || totalPrice;
  const designFee = order.priceDesign || 0;
  const isDesigner = order.orderType === 'designer';
  const address = order.address || '—';
  const paidAt = order.paidAt || order.createdAt || '';
  const revisionText = order.revisionMessage || '';
  const revisionCount = order.revisionCount || 0;
  const actionOwner = getActionOwner(status);

  function reloadOrder() {
    const localOrders = getAllOrders();
    const localFound = localOrders.find((o) => o.id === selectedOrderId);
    if (localFound) setOrder({ ...localFound });
    getAllOrdersAsync().then((merged) => {
      const found = merged.find((o) => o.id === selectedOrderId);
      if (found) setOrder({ ...found });
    }).catch(() => {});
  }

  function showFeedback(msg) {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(''), 3000);
  }

  function openInEditor() {
    if (!order.spreads || !order.productConfig) return;
    useProjectStore.setState({
      currentProjectId: order.id,
      productConfig: { ...order.productConfig },
      coverTemplate: order.coverTemplate || null,
    });
    const restoredPhotos = restorePhotos(order.photos);
    const restoredSpreads = restoreSpreads(order.spreads || [], restoredPhotos);
    useEditorStore.setState({
      photos: restoredPhotos,
      spreads: restoredSpreads.length > 0 ? restoredSpreads : [createSpread([])],
      currentSpread: order.currentSpread || 0,
      undoStack: [], redoStack: [], selectedFrame: null, swapSource: null,
    });
    navigate(`/admin_panel/editor/${order.id}`);
  }

  function rebuildSpreads() {
    const restoredPhotos = restorePhotos(order.photos);
    return restoreSpreads(order.spreads || [], restoredPhotos);
  }

  async function exportZIP() {
    setExporting(true);
    setExportProgress('Încarcă date proaspete...');
    try {
      // ALWAYS fetch fresh from Firestore before export — ce vede clientul = ce se exportă
      let freshOrder = order;
      if (db) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          let snap = await getDoc(doc(db, 'projects', selectedOrderId));
          if (!snap.exists()) snap = await getDoc(doc(db, 'orders', selectedOrderId));
          if (snap.exists()) freshOrder = { id: snap.id, ...snap.data() };
        } catch {}
      }
      const restoredPhotos = restorePhotos(freshOrder.photos);
      const spreads = restoreSpreads(freshOrder.spreads || [], restoredPhotos);
      const fmt = freshOrder.productConfig?.format || '20×20';
      const gapMM = 1.5;
      const pgs = freshOrder.productConfig?.initialPages || 40;
      const slug = freshOrder.productConfig?.slug || 'pagini-groase';
      setExportProgress('0/0');
      await renderAllSpreads(spreads, fmt, gapMM, (cur, total) => {
        setExportProgress(`${cur}/${total}`);
      }, pgs, slug);
    } catch (e) {
      console.error('Export failed:', e);
    }
    setExporting(false);
    setExportProgress('');
  }

  function handleStatusChange(newStatus, detail) {
    updateOrderStatus(order.id, newStatus, detail);
    reloadOrder();
  }

  function handleAssign() {
    if (!designerName.trim()) return;
    assignDesigner(order.id, designerName.trim());
    setDesignerName('');
    setShowAssign(false);
    reloadOrder();
  }

  function handleAddNote() {
    if (!noteText.trim()) return;
    addOrderNote(order.id, 'Admin', noteText.trim());
    setNoteText('');
    reloadOrder();
  }

  function handleCallLog() {
    if (!callOutcome) return;
    const phone = order.clientPhone || order.client_phone || '';
    addContactEntry(phone, order.clientName, order.id, callOutcome, callNote.trim());
    setContactHistory(getContactLog(phone));
    setCallOutcome('');
    setCallNote('');
    setShowCallLog(false);
    reloadOrder();
  }

  // ── Key actions ──

  async function handleSendToClient() {
    handleStatusChange('pending_client_approval', 'Trimis spre aprobare client');
    await sendUserNotification({
      clientId: order.client_id || order.activeClientId,
      orderId: order.id,
      title: 'Albumul tau este gata!',
      message: `Macheta albumului "${productName}" a fost finalizata. Previzualizeaza si aproba.`,
      action: 'Previzualizeaza albumul',
      actionUrl: '/app/cabinet',
    });
    showFeedback('Trimis la client! Clientul a fost notificat.');
  }

  async function handleApproveForPrint() {
    handleStatusChange('approved_print', 'Machetă aprobată de admin');
    await sendUserNotification({
      clientId: order.client_id || order.activeClientId,
      orderId: order.id,
      title: 'Macheta ta a fost aprobata!',
      message: 'Albumul tau a trecut controlul de calitate si va fi trimis la tipar.',
      action: 'Vezi comanda',
      actionUrl: '/app/cabinet',
    });
    showFeedback('Machetă aprobată! Clientul a fost notificat.');
  }

  async function handleMarkInPrint() {
    handleStatusChange('in_print', 'Trimis la tipar');
    await sendUserNotification({
      clientId: order.client_id || order.activeClientId,
      orderId: order.id,
      title: 'Albumul tau e la tipar!',
      message: 'Comanda ta se produce acum. Te vom anunta cand e gata.',
    });
    showFeedback('Marcat la tipar. Clientul a fost notificat.');
  }

  async function handleMarkShipped() {
    handleStatusChange('shipped', 'Comanda expediată');
    await sendUserNotification({
      clientId: order.client_id || order.activeClientId,
      orderId: order.id,
      title: 'Albumul tau a fost expediat!',
      message: 'Comanda ta e pe drum! Vei primi albumul in curand.',
    });
    showFeedback('Expediat! Clientul a fost notificat.');
  }

  async function handleMarkDelivered() {
    handleStatusChange('delivered', 'Comanda livrată');
    await sendUserNotification({
      clientId: order.client_id || order.activeClientId,
      orderId: order.id,
      title: 'Albumul tau a fost livrat!',
      message: 'Felicitari! Albumul tau foto a fost livrat cu succes.',
    });
    showFeedback('Livrat! Clientul a fost notificat.');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('ro-RO', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button onClick={() => navigate('/admin_panel/orders')} className="text-sm text-gray-500 hover:text-gray-700 transition">
          ← Înapoi
        </button>
        <h2 className="text-lg font-bold text-gray-900">Comanda {order.orderNumber || order.id}</h2>
        <StatusBadge order={order} />
        <SLABadge hours={slaHours != null ? Math.round(slaHours) : null} />
      </div>

      {/* ── Action Owner Banner ── */}
      <div className={`rounded-xl px-4 py-3 mb-4 flex items-center justify-between ${actionOwner.color}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{actionOwner.label}</span>
        </div>
        {actionOwner.who === 'admin' && status === 'paid_pending_designer' && (
          <button onClick={() => setShowAssign(true)} className="px-3 py-1.5 bg-white/80 rounded-lg text-xs font-semibold hover:bg-white transition">
            Asignează designer →
          </button>
        )}
      </div>

      {/* ── Action Feedback ── */}
      {actionFeedback && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 animate-[fadeIn_0.3s_ease]">
          <span className="text-green-600">✓</span>
          <span className="text-sm text-green-800 font-medium">{actionFeedback}</span>
        </div>
      )}

      {/* ── Sales Alert (for draft orders) ── */}
      {(() => {
        const sa = getSalesAction(order);
        if (!sa.action) return null;
        const isHot = sa.priority === 'hot';
        return (
          <div className={`rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3 ${
            isHot ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
          }`}>
            <div>
              <div className={`text-sm font-semibold ${isHot ? 'text-red-800' : 'text-amber-800'}`}>{sa.action}</div>
              <p className={`text-xs mt-0.5 ${isHot ? 'text-red-600' : 'text-amber-600'}`}>{sa.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              {sa.phone && (
                <a href={`tel:${sa.phone}`} className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  isHot ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}>📞 Sună</a>
              )}
              <button onClick={() => setShowCallLog(true)} className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 transition">
                ✓ Am sunat
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Call Log Form ── */}
      {showCallLog && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border-2 border-[#3D6B5E]/20">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">📞 Logare apel — {clientName}</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(CONTACT_OUTCOMES).map(([key, info]) => (
              <button key={key} onClick={() => setCallOutcome(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                  callOutcome === key ? 'bg-[#3D6B5E] text-white border-[#3D6B5E]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                {info.icon} {info.label}
              </button>
            ))}
          </div>
          <textarea value={callNote} onChange={(e) => setCallNote(e.target.value)}
            placeholder="Notă opțională..." rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
          <div className="flex items-center gap-2">
            <button onClick={handleCallLog} disabled={!callOutcome}
              className="rounded-lg px-4 py-2 text-sm font-medium bg-[#3D6B5E] text-white hover:bg-[#2d5246] transition disabled:opacity-40">
              Salvează apelul
            </button>
            <button onClick={() => { setShowCallLog(false); setCallOutcome(''); setCallNote(''); }}
              className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition">Anulează</button>
          </div>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: col-span-2 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Info grid */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Nr. comandă" value={order.orderNumber || '—'} />
              <InfoRow label="Client" value={clientName} />
              <InfoRow label="Telefon" value={clientPhone || '—'} />
              <InfoRow label="Email" value={clientEmail || '—'} />
              <InfoRow label="Produs" value={`${productName}${format ? ` · ${format}` : ''}${pages ? ` · ${pages} pag` : ''}`} />
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Preț total</div>
                <div className="text-green-600 font-bold text-lg">{totalPrice} lei</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Plată</div>
                <div className={`text-sm font-bold ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                  {order.paymentStatus === 'paid' ? 'ACHITAT' : 'NEACHITAT'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Designer</div>
                <div className="text-sm text-gray-700 flex items-center gap-2">
                  {order.designer || <span className="text-gray-400">Neatribuit</span>}
                  {!order.designer && (
                    <button onClick={() => setShowAssign(true)} className="text-xs text-[#3D6B5E] hover:underline font-medium">
                      Asignează
                    </button>
                  )}
                </div>
              </div>
              <InfoRow label="Serviciu" value={isDesigner ? 'Cu designer' : order.orderType === 'finish' ? 'Finalizare' : 'Self-service'} />
              <EditableAddress orderId={order.id} address={address} />
              <InfoRow label="Data plății" value={formatDate(paidAt)} />
            </div>
          </div>

          {/* Client's other orders */}
          {clientOrders.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Alte comenzi ale clientului ({clientOrders.length + 1} total)
              </h4>
              <div className="space-y-2">
                {clientOrders.map((co) => (
                  <div key={co.id} onClick={() => navigate(`/admin_panel/orders/${co.id}`)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition border border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[#3D6B5E]">{co.orderNumber || co.id}</span>
                      <span className="text-xs text-gray-500">
                        {co.productConfig?.name || 'Album'} · {co.productConfig?.format || ''} · {co.productConfig?.initialPages || ''} pag
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{co.totalPhotos || 0} poze</span>
                      <StatusBadge order={co} />
                      {co.priceTotal > 0 && <span className="text-xs font-semibold text-gray-700">{co.priceTotal} lei</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo & Spread progress */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Progres album</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Fotografii uploadate</div>
                <div className="text-xl font-bold text-gray-800">{order.totalPhotos || 0}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Fotografii plasate</div>
                <div className="text-xl font-bold text-gray-800">
                  {order.usedPhotos || 0}
                  <span className="text-sm font-normal text-gray-400"> / {order.totalPhotos || 0}</span>
                </div>
                {(order.totalPhotos || 0) > 0 && (
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.round(((order.usedPhotos || 0) / order.totalPhotos) * 100)}%` }} />
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Pagini completate</div>
                <div className="text-xl font-bold text-gray-800">
                  {order.filledSpreads || 0}
                  <span className="text-sm font-normal text-gray-400"> / {order.totalSpreads || 0}</span>
                </div>
                {(order.totalSpreads || 0) > 0 && (
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-[#3D6B5E] h-1.5 rounded-full transition-all" style={{ width: `${Math.round(((order.filledSpreads || 0) / order.totalSpreads) * 100)}%` }} />
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Progres total</div>
                <div className="text-xl font-bold text-[#3D6B5E]">{order.progress || 0}%</div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-[#3D6B5E] h-1.5 rounded-full transition-all" style={{ width: `${order.progress || 0}%` }} />
                </div>
              </div>
            </div>

            {/* Photo thumbnails */}
            {order.photos && order.photos.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-400 mb-2">Previzualizare fotografii ({order.photos.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {order.photos.slice(0, 20).map((photo) => (
                    <div key={photo.id} className={`w-12 h-12 rounded overflow-hidden border-2 ${photo.used ? 'border-[#3D6B5E]' : 'border-gray-200'}`}
                      title={`${photo.fileName}${photo.used ? ' (plasată)' : ' (neplasată)'}`}>
                      {(photo.thumbData || photo.previewUrl || photo.storageUrl) ? (
                        <img src={photo.thumbData || photo.previewUrl || photo.storageUrl} alt={photo.fileName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-[8px]">📷</div>
                      )}
                    </div>
                  ))}
                  {order.photos.length > 20 && (
                    <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-medium">+{order.photos.length - 20}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Assign designer form */}
          {showAssign && (
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
              <input type="text" value={designerName} onChange={(e) => setDesignerName(e.target.value)}
                placeholder="Nume designer..." className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30"
                onKeyDown={(e) => e.key === 'Enter' && handleAssign()} />
              <button onClick={handleAssign} className="rounded-lg px-4 py-2 text-sm font-medium bg-[#3D6B5E] text-white hover:bg-[#2d5246] transition">Confirmă</button>
              <button onClick={() => { setShowAssign(false); setDesignerName(''); }} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition">Anulează</button>
            </div>
          )}

          {/* Revision message */}
          {status === 'revision_requested' && revisionText && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-amber-800">Mesaj revizie de la client</span>
                <span className="text-xs text-amber-600 font-medium">Revizia {revisionCount}/3</span>
              </div>
              <p className="text-sm text-amber-900">{revisionText}</p>
            </div>
          )}

          {/* ── ACTION BUTTONS — clear, grouped ── */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Acțiuni</h4>
            <div className="flex flex-wrap gap-3">
              {/* Editor */}
              {order.spreads && order.spreads.length > 0 && (
                <>
                  <button onClick={() => navigate(`/admin_panel/editor/${order.id}`)}
                    className="rounded-lg px-4 py-2.5 text-sm font-medium bg-[#3D6B5E] text-white hover:bg-[#2d5246] transition">
                    🎨 Deschide în editor
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/admin_panel/editor/${order.id}`); showFeedback('Link copiat!'); }}
                    className="rounded-lg px-3 py-2.5 text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 transition" title="Copiază link editor">
                    🔗 Link
                  </button>
                </>
              )}

              {/* Export ZIP */}
              {order.spreads && order.spreads.length > 0 && (
                <button onClick={exportZIP} disabled={exporting}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-60">
                  {exporting ? `📐 Export... ${exportProgress}` : '📐 Export 300dpi ZIP'}
                </button>
              )}

              {/* Assign designer */}
              {/* Așteaptă achitarea → confirmare plată */}
              {status === 'awaiting_payment' && (
                <button onClick={() => {
                  const nextStatus = order.orderType === 'self' ? 'paid_pending_verification' : 'paid_pending_designer';
                  handleStatusChange(nextStatus, 'Achitat — confirmat de manager');
                  showFeedback('Plată confirmată!');
                }}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium bg-[#3D6B5E] text-white hover:bg-[#2d5246] transition">
                  💰 Marchează achitat
                </button>
              )}

              {status === 'paid_pending_designer' && !order.designer && (
                <button onClick={() => setShowAssign(true)}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium border-2 border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 transition">
                  👤 Asignează designer
                </button>
              )}

              {/* Designer a terminat → Trimite la client pentru aprobare */}
              {(status === 'designer_working' || status === 'revision_requested') && (
                <button onClick={handleSendToClient}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition">
                  📤 Trimite la client
                </button>
              )}

              {/* Verificare album (clientul a făcut singur) → Designer aprobă direct */}
              {status === 'paid_pending_verification' && (
                <button onClick={async () => {
                  handleStatusChange('approved_print', 'Aprobat de designer — gata de tipar');
                  await sendUserNotification({
                    clientId: order.client_id || order.activeClientId,
                    orderId: order.id,
                    title: 'Felicitări! Macheta ta a fost aprobată!',
                    message: 'Designerul a verificat albumul tău și totul este perfect. Începe printarea!',
                    actionUrl: '/app/cabinet',
                  });
                  showFeedback('Aprobat! Clientul a fost notificat.');
                }}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium bg-[#3D6B5E] text-white hover:bg-[#2d5246] transition">
                  ✅ Aprobat de designer
                </button>
              )}

              {/* Client a aprobat → Gata de tipar */}
              {status === 'pending_client_approval' && (
                <button onClick={() => { handleApproveForPrint(); showFeedback('Gata de tipar!'); }}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium bg-[#3D6B5E] text-white hover:bg-[#2d5246] transition">
                  ✅ Gata de tipar
                </button>
              )}

              {/* Mark in print */}
              {status === 'approved_print' && (
                <button onClick={handleMarkInPrint}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium border-2 border-[#3D6B5E] text-[#3D6B5E] hover:bg-[#3D6B5E]/5 transition">
                  🖨 La tipar
                </button>
              )}

              {/* Mark shipped */}
              {status === 'in_print' && (
                <button onClick={handleMarkShipped}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium border-2 border-[#3D6B5E] text-[#3D6B5E] hover:bg-[#3D6B5E]/5 transition">
                  📦 Expediat
                </button>
              )}

              {/* Mark delivered */}
              {status === 'shipped' && (
                <button onClick={handleMarkDelivered}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium border-2 border-[#3D6B5E] text-[#3D6B5E] hover:bg-[#3D6B5E]/5 transition">
                  ✓ Livrat
                </button>
              )}

              {/* Cancel — folosește cancelOrder cu motiv + email + audit */}
              {status !== 'cancelled' && status !== 'delivered' && status !== 'refunded' && (
                <button onClick={() => {
                  const reason = prompt('Motivul anulării:');
                  if (reason !== null) {
                    import('../../utils/adminData').then(m => m.cancelOrder(order.id, reason)).then(() => window.location.reload());
                  }}}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 transition">
                  ✕ Anulează
                </button>
              )}

              {/* ⋯ More actions (dangerous) */}
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); const el = e.currentTarget.nextSibling; el.style.display = el.style.display === 'block' ? 'none' : 'block'; }}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium border border-gray-300 text-gray-500 hover:bg-gray-50 transition">
                  ⋯
                </button>
                <div style={{ display: 'none' }} className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 min-w-[200px]">
                  {order.status !== 'cancelled' ? (
                    <button onClick={() => {
                      const reason = prompt(`Motivul anulării comenzii ${order.orderNumber || order.id}:`);
                      if (reason !== null) {
                        import('../../utils/adminData').then(m => m.cancelOrder(order.id, reason)).then(() => navigate('/admin_panel/orders'));
                      }}}
                      className="w-full text-left px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition">
                      ✕ Anulează comanda
                    </button>
                  ) : (
                    <button onClick={() => {
                      const daysLeft = order.deleteAfter ? Math.max(0, Math.ceil((new Date(order.deleteAfter) - new Date()) / (24*60*60*1000))) : 60;
                      if (daysLeft > 0) { alert(`Poate fi ștearsă definitiv peste ${daysLeft} zile.`); return; }
                      if (confirm(`Sigur ștergi DEFINITIV comanda ${order.orderNumber || order.id}? Ireversibil!`)) {
                        deleteOrder(order.id).then((ok) => { if(ok) navigate('/admin_panel/orders'); });
                      }}}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
                      🗑 Șterge definitiv
                    </button>
                  )}
                  {clientPhone && (
                    <button onClick={() => {
                      if (confirm(`Sigur ștergi clientul ${clientName} (${clientPhone}) cu TOATE comenzile? Ireversibil!`)) {
                        deleteClient(clientPhone).then(() => navigate('/admin_panel/orders'));
                      }}}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition border-t border-gray-100">
                      🗑 Șterge client complet
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Export progress */}
          {exporting && (
            <div className="mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: exportProgress ? `${(parseInt(exportProgress) / parseInt(exportProgress.split('/')[1] || 1)) * 100}%` : '0%' }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Se exportă: {exportProgress}</p>
            </div>
          )}
        </div>

        {/* Right: col-span-1 */}
        <div className="space-y-4">
          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Cronologie</h3>
            <OrderTimeline events={order.timeline || []} />
            {(!order.timeline || order.timeline.length === 0) && (
              <p className="text-xs text-gray-400">Nicio intrare încă.</p>
            )}
          </div>

          {/* Contact History */}
          {contactHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">📞 Istoric apeluri ({contactHistory.length})</h3>
                <button onClick={() => setShowCallLog(true)} className="text-xs text-[#3D6B5E] hover:underline font-medium">+ Adaugă apel</button>
              </div>
              <div className="space-y-2">
                {contactHistory.slice(0, 10).map((log) => {
                  const info = CONTACT_OUTCOMES[log.outcome] || { label: log.outcome, icon: '📞', color: 'gray' };
                  return (
                    <div key={log.id} className="bg-gray-50 rounded-lg p-2.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-gray-700">{info.icon} {info.label}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(log.timestamp).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {log.note && <p className="text-xs text-gray-500">{log.note}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Call button if no history */}
          {contactHistory.length === 0 && (order.clientPhone || order.client_phone) && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">📞 Contactare client</h3>
              <p className="text-xs text-gray-400 mb-3">Niciun apel logat încă</p>
              <div className="flex gap-2">
                <a href={`tel:${order.clientPhone || order.client_phone}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors">
                  📞 Sună
                </a>
                <button onClick={() => setShowCallLog(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 transition">
                  ✓ Am sunat
                </button>
              </div>
            </div>
          )}

          {/* Device info */}
          {(order.deviceType || order.userAgent || order.clientIp) && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Dispozitiv client</h3>
              <div className="space-y-1.5 text-[12px]">
                {order.deviceType && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{order.deviceType === 'mobile' ? '📱' : '💻'}</span>
                    <span className="font-medium text-gray-700">{order.deviceType === 'mobile' ? 'Telefon' : 'Calculator'}</span>
                  </div>
                )}
                {order.userAgent && (
                  <p className="text-[11px] text-gray-400 break-all">{order.userAgent}</p>
                )}
                {order.clientIp && (
                  <p className="text-[11px] text-gray-500">IP: <span className="font-mono">{order.clientIp}</span></p>
                )}
                {order.screenW && (
                  <p className="text-[11px] text-gray-400">Ecran: {order.screenW}×{order.screenH || '?'}px</p>
                )}
              </div>
            </div>
          )}

          {/* TODO: NotificationHistory — de implementat */}

          {/* Edit History */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <EditHistory projectId={order.id} />
          </div>

          {/* Internal notes */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Note interne</h3>
            {(order.notes || []).length > 0 && (
              <div className="space-y-2 mb-3">
                {order.notes.map((note, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-700">{note.author || 'Admin'}</span>
                      <span className="text-xs text-gray-400">{formatDate(note.timestamp || note.ts)}</span>
                    </div>
                    <p className="text-gray-600">{note.text || note.detail}</p>
                  </div>
                ))}
              </div>
            )}
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
              placeholder="Scrie o notă internă..." rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]" />
            <button onClick={handleAddNote} disabled={!noteText.trim()}
              className="mt-2 rounded-lg px-4 py-2 text-sm font-medium bg-[#3D6B5E] text-white hover:bg-[#2d5246] transition disabled:opacity-40">
              Adaugă notă
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className="text-sm text-gray-700">{value}</div>
    </div>
  );
}

function EditableAddress({ orderId, address }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(
    typeof address === 'object'
      ? `${address.street || ''}, ${address.city || ''}`.replace(/^, |, $/g, '')
      : (address || '')
  );
  const [saved, setSaved] = useState(false);
  const [modified, setModified] = useState(address?.modified || false);

  const handleSave = async () => {
    if (!db) return;
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const updateData = {
        address: val.trim(),
        addressModified: true,
        addressModifiedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'orders', orderId), updateData, { merge: true });
      await setDoc(doc(db, 'projects', orderId), updateData, { merge: true });
      setModified(true);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.warn('Address save failed:', e);
    }
  };

  return (
    <div>
      <div className="text-xs text-gray-400 mb-0.5 flex items-center gap-2">
        Adresă de livrare
        {modified && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Modificată</span>}
        {saved && <span className="text-[9px] text-green-600 font-medium">✓ Salvat</span>}
      </div>
      {editing ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="str. Exemplu 10, Chișinău"
            className="flex-1 text-sm px-3 py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]"
            autoFocus
          />
          <button onClick={handleSave} className="text-xs font-medium text-white bg-[#3D6B5E] px-3 py-1.5 rounded-lg hover:bg-[#2f5549]">Salvează</button>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-400 px-2">✕</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">{val || '—'}</span>
          <button onClick={() => setEditing(true)} className="text-xs text-[#3D6B5E] hover:underline font-medium">Editează</button>
        </div>
      )}
    </div>
  );
}
