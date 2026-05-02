import { ORDERS } from '../data/mock';
import StatusBadge from '../components/StatusBadge';

export default function PrintDelivery() {
  const printOrders = ORDERS.filter((o) =>
    ['ready_to_print', 'printing', 'printing_urgent', 'packaging', 'ready_to_ship', 'delivered'].includes(o.status)
  );

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Tipar & Livrare</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b bg-gray-50/50">
              <th className="px-4 py-3 text-left">Nr</th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Produs</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">La tipar</th>
              <th className="px-4 py-3 text-left">Gata fabrică</th>
              <th className="px-4 py-3 text-left">Livrat</th>
              <th className="px-4 py-3 text-left">Cod tipar</th>
              <th className="px-4 py-3 text-left">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {printOrders.map((o) => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-mono font-bold text-gray-800">{o.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{o.clientName}</div>
                  <div className="text-xs text-gray-400">{o.clientPhone}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{o.product} · {o.format} · {o.pages}p</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-600">{o.dates.toPrint || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{o.dates.factoryReady || '—'}</td>
                <td className="px-4 py-3 text-xs">
                  {o.dates.delivered ? (
                    <span className="text-green-600 font-bold">{o.dates.delivered}</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{o.printCode || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {o.status === 'ready_to_print' && (
                      <button className="px-2 py-1 text-[10px] font-bold bg-red-600 text-white rounded hover:bg-red-700">Export ZIP</button>
                    )}
                    {o.status === 'printing' && (
                      <button className="px-2 py-1 text-[10px] font-bold bg-teal-600 text-white rounded hover:bg-teal-700">Gata fabrică</button>
                    )}
                    {(o.status === 'packaging' || o.status === 'ready_to_ship') && (
                      <button className="px-2 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700">Livrat</button>
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
