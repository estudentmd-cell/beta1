import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ORDERS, STATUSES } from '../data/mock';
import StatusBadge from '../components/StatusBadge';

export default function Orders() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const filtered = ORDERS.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.id.toLowerCase().includes(q) || o.clientName.toLowerCase().includes(q) || o.clientPhone.includes(q);
    }
    return true;
  });

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Toate comenzile</h2>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text" placeholder="Caută după ID, nume, telefon..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="">Toate statusurile</option>
          {Object.entries(STATUSES).map(([key, val]) => (
            <option key={key} value={key}>{val.icon} {val.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b bg-gray-50/50">
              <th className="px-4 py-3 text-left">Nr</th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Produs</th>
              <th className="px-4 py-3 text-center">Poze</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Designer</th>
              <th className="px-4 py-3 text-left">Maketă</th>
              <th className="px-4 py-3 text-left">Dispozitiv</th>
              <th className="px-4 py-3 text-right">Preț</th>
              <th className="px-4 py-3 text-right">Achitat</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} onClick={() => navigate(`/orders/${o.id.replace('#', '')}`)}
                className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition">
                <td className="px-4 py-3 font-mono font-bold text-gray-800">{o.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{o.clientName}</div>
                  <div className="text-xs text-gray-400">{o.clientPhone}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {o.productName || o.product} · {o.format} · {o.pages}p
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-bold">{o.photos}</span>
                  {o.photosPlaced < o.photos && (
                    <span className="text-xs text-gray-400 ml-0.5">/{o.photosPlaced}pl</span>
                  )}
                </td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-600">{o.designer || '—'}</td>
                <td className="px-4 py-3 text-xs">
                  {o.dates.layoutApproved ? (
                    <span className="text-green-600 font-semibold">Aprobată</span>
                  ) : o.dates.layoutSent ? (
                    <span className="text-violet-600 font-semibold">Trimisă</span>
                  ) : o.designer ? (
                    <span className="text-blue-600">În lucru</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-xs">{o.device === 'mobile' ? '📱' : '💻'}</td>
                <td className="px-4 py-3 text-right font-semibold">{o.price} lei</td>
                <td className="px-4 py-3 text-right text-xs">
                  {o.paid > 0 ? (
                    <span className="text-green-600 font-bold">{o.paid} lei</span>
                  ) : (
                    <span className="text-red-400">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
