import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllOrders, getAllOrdersAsync, updateOrderStatus } from '../../utils/adminData';
import { sendUserNotification } from '../../firebase/notifications';
import { db } from '../../firebase/config';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export default function DeLivrat() {
  const [inPrint, setInPrint] = useState([]);
  const [shipped, setShipped] = useState([]);
  const [feedback, setFeedback] = useState('');
  const navigate = useNavigate();

  function load() {
    getAllOrdersAsync().then(all => {
      setInPrint(all.filter(o => o.status === 'in_print').sort((a, b) => (a.printReadyDate || '').localeCompare(b.printReadyDate || '')));
      setShipped(all.filter(o => o.status === 'shipped').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')));
    }).catch(() => {
      const all = getAllOrders();
      setInPrint(all.filter(o => o.status === 'in_print'));
      setShipped(all.filter(o => o.status === 'shipped'));
    });
  }

  useEffect(() => { load(); }, []);

  function flash(msg) { setFeedback(msg); setTimeout(() => setFeedback(''), 3000); }

  async function markShipped(order) {
    updateOrderStatus(order.id, 'shipped', 'Expediat');
    if (db) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'orders', order.id), { status: 'shipped', shippedAt: new Date().toISOString() }, { merge: true });
      } catch {}
    }
    await sendUserNotification({
      clientId: order.client_id || order.activeClientId, orderId: order.id,
      title: 'Albumul tău a fost expediat!', message: 'Comanda e pe drum! Vei primi albumul în curând.',
      actionUrl: '/app/cabinet',
    });
    flash(`${order.orderNumber || order.id} — expediat`);
    load();
  }

  async function markDelivered(order) {
    updateOrderStatus(order.id, 'delivered', 'Livrat');
    if (db) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'orders', order.id), { status: 'delivered', deliveredAt: new Date().toISOString() }, { merge: true });
      } catch {}
    }
    await sendUserNotification({
      clientId: order.client_id || order.activeClientId, orderId: order.id,
      title: 'Albumul tău a fost livrat!', message: 'Felicitări! Bucură-te de albumul tău foto!',
      actionUrl: '/app/cabinet',
    });
    flash(`${order.orderNumber || order.id} — livrat`);
    load();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-lg">📦</div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">De livrat</h2>
          <p className="text-sm text-gray-500">{inPrint.length} la tipar · {shipped.length} expediate</p>
        </div>
      </div>

      {feedback && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-4 text-sm text-green-800 font-medium">✓ {feedback}</div>
      )}

      {/* ── La tipar ── */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          🖨 În proces de imprimare
          {inPrint.length > 0 && <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">{inPrint.length}</span>}
        </h3>

        {inPrint.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm py-10 text-center text-gray-400 text-sm">Nicio comandă la tipar.</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-gray-400 border-b uppercase tracking-wider">
                  <th className="px-4 py-3">Comandă</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Produs</th>
                  <th className="px-4 py-3">Dat la tipar</th>
                  <th className="px-4 py-3">Gata estimat</th>
                  <th className="px-4 py-3">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {inPrint.map(o => {
                  const days = daysUntil(o.printReadyDate);
                  return (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#3D6B5E]">{o.orderNumber || o.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-[13px]">{o.clientName || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{o.productConfig?.name} · {o.productConfig?.format}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-600">{fmtDate(o.printSentDate)}</td>
                      <td className="px-4 py-3">
                        {o.printReadyDate ? (
                          <span className={`text-xs font-bold ${days !== null && days <= 0 ? 'text-green-600' : days !== null && days <= 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {fmtDate(o.printReadyDate)}
                            {days !== null && days <= 0 && ' — GATA!'}
                            {days !== null && days > 0 && ` (${days}z)`}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => markShipped(o)}
                            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[11px] font-semibold hover:bg-purple-700 transition">
                            📦 Împachetat & expediat
                          </button>
                          <button onClick={() => navigate(`/admin_panel/orders/${o.id}`)}
                            className="px-2 py-1.5 text-[11px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Detalii</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Expediate ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          📦 Expediate — de confirmat livrare
          {shipped.length > 0 && <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">{shipped.length}</span>}
        </h3>

        {shipped.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm py-10 text-center text-gray-400 text-sm">Nicio comandă expediată.</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-gray-400 border-b uppercase tracking-wider">
                  <th className="px-4 py-3">Comandă</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Expediat la</th>
                  <th className="px-4 py-3">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {shipped.map(o => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#3D6B5E]">{o.orderNumber || o.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 text-[13px]">{o.clientName || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{o.clientPhone || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(o.shippedAt || o.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => markDelivered(o)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-semibold hover:bg-emerald-700 transition">
                        ✓ Confirmare livrat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
