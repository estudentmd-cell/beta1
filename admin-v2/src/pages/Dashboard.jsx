import { ORDERS, CLIENTS, getStats, getUrgentActions } from '../data/mock';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const stats = getStats();
  const urgent = getUrgentActions();

  // Today stats
  const todayOrders = 11;
  const todayRevenue = 498;
  const printReady = 1;
  const slaOverdue = 0;

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-gray-800">Dashboard</h2>

      {/* KPI Cards — border-left colored like current admin */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon="📋" label="AȘTEAPTĂ DESIGNER" value={stats.awaitingPhotos + 2} borderColor="border-l-blue-500" />
        <StatCard icon="🎨" label="DESIGNER LUCREAZĂ" value={0} borderColor="border-l-yellow-500" />
        <StatCard icon="✅" label="AȘTEAPTĂ APROBARE" value={stats.awaitingApproval || 1} borderColor="border-l-violet-500" />
        <StatCard icon="🖨" label="GATA DE TIPAR" value={1} borderColor="border-l-green-500" />
        <StatCard icon="🚨" label="SLA DEPĂȘIT" value={0} borderColor="border-l-red-500" />
      </div>

      {/* Two columns: Urgent + Stats */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Urgent actions — 3 cols */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Acțiuni urgente</h3>
          {urgent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-300">
              <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-sm">Totul e în regulă</span>
            </div>
          ) : (
            <div className="space-y-2">
              {urgent.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-700">{a.message}</span>
                  <a href={`tel:${a.order.clientPhone}`} className="px-3 py-1 bg-[#3D6B5E] text-white text-[10px] font-bold rounded-lg hover:bg-[#2d5445] shrink-0">
                    📞 Sună
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats today — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Statistici azi</h3>
          <div className="space-y-3">
            <StatRow label="Comenzi noi azi" value={todayOrders} />
            <StatRow label="Venituri azi" value={`${todayRevenue} lei`} accent />
            <StatRow label="Gata de tipar" value={printReady} />
            <StatRow label="SLA depășit" value={slaOverdue} />
          </div>
        </div>
      </div>

      {/* Abandoned leads */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">📞 Lead-uri abandonate</h3>
          <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
            {ORDERS.filter((o) => o.status === 'abandoned' || (o.status === 'awaiting_photos' && o.photos > 0)).length}
          </span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-gray-400 border-b uppercase tracking-wider">
              <th className="px-5 py-2.5 text-left font-medium">Telefon</th>
              <th className="px-4 py-2.5 text-left font-medium">Produs</th>
              <th className="px-4 py-2.5 text-left font-medium">Format</th>
              <th className="px-4 py-2.5 text-left font-medium">Pagini</th>
              <th className="px-4 py-2.5 text-left font-medium">Poze</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-left font-medium">Când</th>
              <th className="px-4 py-2.5 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {ORDERS.filter((o) => o.status === 'abandoned' || (o.status === 'awaiting_photos')).map((o) => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-800">{o.clientPhone}</td>
                <td className="px-4 py-3 text-gray-600">{o.product === 'Printbook' ? 'Groase' : o.product}</td>
                <td className="px-4 py-3 text-gray-600">{o.format}</td>
                <td className="px-4 py-3 text-gray-600">{o.pages}</td>
                <td className="px-4 py-3 text-gray-800 font-semibold">{o.photos}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-gray-400">
                  {o.status === 'abandoned' ? '3h' : '0 min'}
                </td>
                <td className="px-4 py-3">
                  <a href={`tel:${o.clientPhone}`} className="px-3 py-1 bg-[#3D6B5E] text-white text-[10px] font-bold rounded hover:bg-[#2d5445]">
                    📞 Sună
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, borderColor }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColor} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{icon}</span>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
    </div>
  );
}

function StatRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-bold ${accent ? 'text-[#3D6B5E]' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}
