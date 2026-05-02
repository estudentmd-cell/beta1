import { ORDERS, CLIENTS } from '../data/mock';

export default function Finance() {
  const paidOrders = ORDERS.filter((o) => o.paid > 0);
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.paid, 0);
  const avgOrder = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;
  const unpaid = ORDERS.filter((o) => o.paid === 0 && o.price > 0);
  const unpaidTotal = unpaid.reduce((sum, o) => sum + o.price, 0);

  // Top clients by spend
  const topClients = [...CLIENTS]
    .filter((c) => c.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Venituri</h2>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-xl p-5 border border-green-200">
          <div className="text-xs text-green-600 font-medium">Total încasat</div>
          <div className="text-3xl font-bold text-green-700 mt-1">{totalRevenue.toLocaleString()} lei</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="text-xs text-gray-500 font-medium">Comenzi plătite</div>
          <div className="text-3xl font-bold text-gray-800 mt-1">{paidOrders.length}</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="text-xs text-gray-500 font-medium">Comandă medie</div>
          <div className="text-3xl font-bold text-gray-800 mt-1">{avgOrder} lei</div>
        </div>
        <div className="bg-red-50 rounded-xl p-5 border border-red-200">
          <div className="text-xs text-red-600 font-medium">Neachitat</div>
          <div className="text-3xl font-bold text-red-600 mt-1">{unpaidTotal.toLocaleString()} lei</div>
          <div className="text-xs text-red-400 mt-1">{unpaid.length} comenzi</div>
        </div>
      </div>

      {/* Top clients */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">Top clienți după cheltuieli</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b bg-gray-50/50">
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Client</th>
              <th className="px-4 py-2 text-left">Locație</th>
              <th className="px-4 py-2 text-center">Comenzi</th>
              <th className="px-4 py-2 text-right">Total cheltuit</th>
            </tr>
          </thead>
          <tbody>
            {topClients.map((c, i) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 font-bold">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.phone}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.location}</td>
                <td className="px-4 py-3 text-center font-semibold">{c.totalOrders}</td>
                <td className="px-4 py-3 text-right font-bold text-green-700">{c.totalSpent.toLocaleString()} lei</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unpaid orders */}
      {unpaid.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-red-100">
          <div className="px-5 py-4 border-b border-red-100">
            <h3 className="text-sm font-bold text-red-600">Comenzi neachitate ({unpaid.length})</h3>
          </div>
          {unpaid.map((o) => (
            <div key={o.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
              <div>
                <span className="font-mono font-bold text-gray-700">{o.id}</span>
                <span className="ml-3 text-sm text-gray-600">{o.clientName}</span>
                <span className="ml-2 text-xs text-gray-400">{o.clientPhone}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-red-600">{o.price} lei</span>
                <a href={`tel:${o.clientPhone}`} className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700">
                  📞 Sună
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
