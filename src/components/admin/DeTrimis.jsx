import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllOrders, getAllOrdersAsync, updateOrderStatus, calculateSLA } from '../../utils/adminData';
import { sendUserNotification } from '../../firebase/notifications';
import StatusBadge from './StatusBadge';
import SLABadge from './SLABadge';

export default function DeTrimis() {
  const [orders, setOrders] = useState([]);
  const [sendingId, setSendingId] = useState(null);
  const navigate = useNavigate();

  function load() {
    const all = getAllOrders()
      .filter(o => o.status === 'designer_working' || o.status === 'revision_requested')
      .sort((a, b) => {
        // Revisions first (need attention), then by SLA
        const aRev = a.status === 'revision_requested' ? 0 : 1;
        const bRev = b.status === 'revision_requested' ? 0 : 1;
        if (aRev !== bRev) return aRev - bRev;
        return (calculateSLA(b) || 0) - (calculateSLA(a) || 0);
      });
    setOrders(all);
  }

  useEffect(() => {
    load();
    getAllOrdersAsync().then(() => load()).catch(() => {});
  }, []);

  async function handleSendToClient(order) {
    setSendingId(order.id);
    updateOrderStatus(order.id, 'pending_client_approval', 'Trimis spre aprobare client');
    await sendUserNotification({
      clientId: order.client_id || order.activeClientId,
      orderId: order.id,
      title: 'Albumul tău este gata!',
      message: `Comanda ${order.orderNumber || order.id} a fost finalizată de designer. Previzualizează și aprobă.`,
      action: 'Previzualizează albumul',
      actionUrl: '/app/cabinet',
    }).catch(() => {});
    setSendingId(null);
    load();
  }

  const working = orders.filter(o => o.status === 'designer_working');
  const revisions = orders.filter(o => o.status === 'revision_requested');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-lg">🎨</div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">De trimis la client</h2>
          <p className="text-sm text-gray-500">
            {orders.length === 0 ? 'Niciun album în lucru' : `${working.length} în lucru · ${revisions.length} revizuiri`}
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm py-16 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-500">Niciun album de trimis. Designerii nu au comenzi active.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Revisions first with alert */}
          {revisions.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-2">
              <p className="text-sm font-semibold text-orange-800">
                ⚠ {revisions.length} cereri de revizie — necesită atenție
              </p>
            </div>
          )}

          {orders.map(o => {
            const sla = calculateSLA(o);
            const isRevision = o.status === 'revision_requested';
            const isSending = sendingId === o.id;

            return (
              <div
                key={o.id}
                className={`bg-white rounded-xl shadow-sm p-4 ${isRevision ? 'ring-2 ring-orange-200' : ''}`}
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  {/* Order info */}
                  <div
                    className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition"
                    onClick={() => navigate(`/admin_panel/orders/${o.id}`)}
                  >
                    <div>
                      <span className="font-mono text-sm font-bold text-[#3D6B5E]">{o.orderNumber || o.id}</span>
                      <SLABadge hours={sla != null ? Math.round(sla) : null} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{o.clientName || 'Client'}</div>
                      <div className="text-xs text-gray-400">Designer: {o.designer || '—'}</div>
                    </div>
                    <StatusBadge order={o} />
                    <span className="text-xs text-gray-500">{o.totalPhotos || 0} poze</span>
                    {o.priceTotal > 0 && (
                      <span className="text-sm font-bold text-green-600">{o.priceTotal} lei</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {o.spreads && o.spreads.length > 0 && (
                      <button
                        onClick={() => navigate(`/admin_panel/editor/${o.id}`)}
                        className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        👁 Preview
                      </button>
                    )}
                    <button
                      onClick={() => handleSendToClient(o)}
                      disabled={isSending}
                      className="px-4 py-2 bg-[#3D6B5E] text-white rounded-lg text-sm font-semibold hover:bg-[#2d5246] transition disabled:opacity-50"
                    >
                      {isSending ? 'Se trimite...' : '📤 Trimite la client'}
                    </button>
                  </div>
                </div>

                {/* Revision message */}
                {isRevision && o.revisionMessage && (
                  <div className="mt-3 bg-orange-50 rounded-lg p-3 text-sm text-orange-800">
                    <span className="font-semibold">Mesaj client:</span> {o.revisionMessage}
                    {o.revisionCount > 0 && (
                      <span className="ml-2 text-xs text-orange-600">(Revizia {o.revisionCount}/3)</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
