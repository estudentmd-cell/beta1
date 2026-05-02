import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllOrders, getAllOrdersAsync, assignDesigner, getTeamMembers, calculateSLA } from '../../utils/adminData';
import SLABadge from './SLABadge';

export default function DeAsignat() {
  const [orders, setOrders] = useState([]);
  const [designers, setDesigners] = useState([]);
  const navigate = useNavigate();

  function load() {
    const all = getAllOrders()
      .filter(o => o.status === 'paid_pending_designer' && !o.designer)
      .sort((a, b) => (a.paidAt || a.createdAt || '').localeCompare(b.paidAt || b.createdAt || ''));
    setOrders(all);
    setDesigners(getTeamMembers().filter(m => m.role === 'designer'));
  }

  useEffect(() => {
    load();
    getAllOrdersAsync().then(() => load()).catch(() => {});
  }, []);

  function handleAssign(orderId, designerName) {
    assignDesigner(orderId, designerName);
    load();
  }

  // Count active orders per designer
  const allOrders = getAllOrders();
  function activeCount(name) {
    return allOrders.filter(o => o.designer === name && ['designer_working', 'revision_requested'].includes(o.status)).length;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg">📋</div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">De asignat la designer</h2>
          <p className="text-sm text-gray-500">
            {orders.length === 0 ? 'Toate comenzile sunt asignate' : `${orders.length} comenzi așteaptă un designer`}
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm py-16 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-500">Totul e asignat. Nicio comandă în așteptare.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => {
            const sla = calculateSLA(o);
            return (
              <div key={o.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  {/* Order info */}
                  <div
                    className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition"
                    onClick={() => navigate(`/admin_panel/orders/${o.id}`)}
                  >
                    <div>
                      <span className="font-mono text-sm font-bold text-gray-900">{o.id}</span>
                      <SLABadge hours={sla != null ? Math.round(sla) : null} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{o.clientName || 'Client'}</div>
                      <div className="text-xs text-gray-400">{o.clientPhone || ''}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {o.productConfig?.name || 'Album'} · {o.productConfig?.format || ''} · {o.totalPhotos || 0} poze
                    </div>
                    {o.priceTotal > 0 && (
                      <span className="text-sm font-bold text-green-600">{o.priceTotal} lei</span>
                    )}
                  </div>

                  {/* Assign buttons — 1 click per designer */}
                  <div className="flex items-center gap-2">
                    {designers.map(d => (
                      <button
                        key={d.id}
                        onClick={() => handleAssign(o.id, d.name)}
                        className="px-4 py-2 bg-[#3D6B5E] text-white rounded-lg text-sm font-semibold hover:bg-[#2d5246] transition"
                      >
                        → {d.name.split(' ')[0]}
                        <span className="ml-1 text-[10px] opacity-70">({activeCount(d.name)})</span>
                      </button>
                    ))}
                    <button
                      onClick={() => navigate(`/admin_panel/orders/${o.id}`)}
                      className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      Detalii
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
