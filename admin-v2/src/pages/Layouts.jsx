import { ORDERS } from '../data/mock';
import StatusBadge from '../components/StatusBadge';

export default function Layouts() {
  // Filter orders that need layout work
  const layoutOrders = ORDERS.filter((o) =>
    ['making_layout', 'client_reviewing', 'client_editing', 'revision_requested', 'ready_to_print'].includes(o.status)
  );

  const inProgress = layoutOrders.filter((o) => o.status === 'making_layout');
  const sentToClient = layoutOrders.filter((o) => o.status === 'client_reviewing');
  const revisions = layoutOrders.filter((o) => o.status === 'revision_requested' || o.status === 'client_editing');
  const approved = layoutOrders.filter((o) => o.status === 'ready_to_print');

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Makete</h2>
      <p className="text-sm text-gray-500">Gestionare makete — de la creare la aprobare</p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="În lucru" count={inProgress.length} color="bg-blue-50 text-blue-700" />
        <StatCard label="La client" count={sentToClient.length} color="bg-violet-50 text-violet-700" />
        <StatCard label="Modificări" count={revisions.length} color="bg-orange-50 text-orange-700" />
        <StatCard label="Aprobate" count={approved.length} color="bg-green-50 text-green-700" />
      </div>

      {/* Layout queue */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">Toate maketele</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b bg-gray-50/50">
              <th className="px-4 py-2 text-left">Nr</th>
              <th className="px-4 py-2 text-left">Client</th>
              <th className="px-4 py-2 text-left">Produs</th>
              <th className="px-4 py-2 text-left">Designer</th>
              <th className="px-4 py-2 text-left">Status maketă</th>
              <th className="px-4 py-2 text-left">Trimisă</th>
              <th className="px-4 py-2 text-left">Aprobată</th>
              <th className="px-4 py-2 text-left">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {ORDERS.filter((o) => o.designer || o.dates.layoutSent).map((o) => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-mono font-bold text-gray-800">{o.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{o.clientName}</div>
                  <div className="text-xs text-gray-400">{o.clientPhone}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{o.product} · {o.format}</td>
                <td className="px-4 py-3 text-xs text-blue-600 font-semibold">{o.designer || '—'}</td>
                <td className="px-4 py-3">
                  {o.dates.layoutApproved ? (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Aprobată</span>
                  ) : o.dates.layoutSent ? (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">La client</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">În lucru</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{o.dates.layoutSent || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{o.dates.layoutApproved || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="px-2 py-1 text-[10px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700">Deschide</button>
                    {!o.dates.layoutSent && (
                      <button className="px-2 py-1 text-[10px] font-bold bg-violet-600 text-white rounded hover:bg-violet-700">Trimite</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, count, color }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs font-medium mt-1">{label}</div>
    </div>
  );
}
