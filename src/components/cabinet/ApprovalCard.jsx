import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateOrderStatus } from '../../utils/adminData';
import { sendAdminNotification } from '../../firebase/notifications';
import { db } from '../../firebase/config';

export default function ApprovalCard({ order, onStatusChange }) {
  const navigate = useNavigate();
  const [showRevision, setShowRevision] = useState(false);
  const [revisionText, setRevisionText] = useState('');
  const [done, setDone] = useState(null); // 'approved' | 'revision'

  if (!order) return null;
  if (order.status !== 'pending_approval' && order.status !== 'pending_client_approval') return null;

  const handleApprove = async () => {
    updateOrderStatus(order.id, 'approved_print', 'Client a aprobat macheta');
    await sendAdminNotification('client_approved', {
      orderId: order.id,
      clientName: order.clientName || '',
      clientPhone: order.clientPhone || '',
      message: `${order.clientName || 'Clientul'} a aprobat macheta pentru comanda ${order.orderNumber || order.id}`,
    });
    setDone('approved');
    if (onStatusChange) onStatusChange('approved_print');
  };

  const handleRevision = async () => {
    if (!revisionText.trim()) return;
    updateOrderStatus(order.id, 'revision_requested', `Client cere modificări: ${revisionText.trim()}`);

    if (db) {
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'orders', order.id), {
          revisionMessage: revisionText.trim(),
          revisionCount: (order.revisionCount || 0) + 1,
          status: 'revision_requested',
        });
      } catch {}
    }

    await sendAdminNotification('revision_requested', {
      orderId: order.id,
      clientName: order.clientName || '',
      clientPhone: order.clientPhone || '',
      message: `${order.clientName || 'Clientul'} cere modificări: "${revisionText.trim()}"`,
      revisionMessage: revisionText.trim(),
    });
    setDone('revision');
    setShowRevision(false);
    if (onStatusChange) onStatusChange('revision_requested');
  };

  // After action
  if (done === 'approved') {
    return (
      <div className="bg-gradient-to-r from-[#EAF0EC] to-emerald-50 border border-[#3D6B5E]/20 rounded-[12px] p-5 mb-4 text-center">
        <span className="text-4xl block mb-2">🎉</span>
        <p className="font-bold text-[#3D6B5E] text-base">Felicitări!</p>
        <p className="text-sm text-[#5A7E6E] mt-1">Comanda ta va fi trimisă la tipar. Vei primi albumul în curând!</p>
      </div>
    );
  }

  if (done === 'revision') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-5 mb-4 text-center">
        <span className="text-4xl block mb-2">✏️</span>
        <p className="font-bold text-amber-800 text-base">Mulțumim!</p>
        <p className="text-sm text-amber-600 mt-1">Designerul va face modificările. Te vom notifica când sunt gata.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#EAF0EC] to-emerald-50 border border-[#3D6B5E]/20 rounded-[12px] p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">🎉</span>
        <div>
          <p className="font-bold text-[#3D6B5E] text-[15px]">Macheta ta e gata!</p>
          <p className="text-xs text-[#5A7E6E]">Verifică albumul și confirmă sau cere modificări.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => navigate('/app/cabinet')}
          className="px-3 py-2 bg-white border border-[#3D6B5E]/30 text-[#3D6B5E] rounded-lg text-xs font-semibold hover:bg-[#3D6B5E]/5 transition">
          👁 Vezi albumul
        </button>
        <button onClick={handleApprove}
          className="px-4 py-2 bg-[#3D6B5E] text-white text-xs font-semibold rounded-lg hover:bg-[#2d5445] transition min-h-[36px]">
          ✅ Aprobă
        </button>
        <button onClick={() => setShowRevision(!showRevision)}
          className="px-3 py-2 border border-amber-300 text-amber-700 bg-amber-50 rounded-lg text-xs font-semibold hover:bg-amber-100 transition">
          ✏️ Cere modificări
        </button>
      </div>

      {/* Revision form */}
      {showRevision && (
        <div className="mt-3 pt-3 border-t border-[#3D6B5E]/10">
          <textarea
            value={revisionText}
            onChange={(e) => setRevisionText(e.target.value)}
            placeholder="Descrie ce modificări dorești..."
            rows={3}
            className="w-full rounded-lg border border-[#DDD] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30"
            autoFocus
          />
          <div className="flex items-center gap-2 mt-2">
            <button onClick={handleRevision} disabled={!revisionText.trim()}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition disabled:opacity-40">
              Trimite
            </button>
            <button onClick={() => { setShowRevision(false); setRevisionText(''); }}
              className="px-3 py-2 text-xs text-[#777] hover:text-[#333] transition">Anulează</button>
          </div>
        </div>
      )}
    </div>
  );
}
