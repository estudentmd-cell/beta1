import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CLIENTS } from '../data/mock';
import { ScoreBadge } from '../components/StatusBadge';

export default function Clients() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const filtered = CLIENTS.filter((c) => {
    if (filter === 'client' && c.type !== 'client') return false;
    if (filter === 'lead' && c.type !== 'lead') return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q));
    }
    return true;
  }).sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));

  const totalClients = CLIENTS.length;
  const verified = CLIENTS.filter((c) => c.type === 'client').length;
  const leads = CLIENTS.filter((c) => c.type === 'lead').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Clienți</h2>
          <div className="flex gap-3 text-sm text-gray-500 mt-1">
            <span className="font-semibold text-gray-800">{totalClients} total</span>
            <span className="text-green-600">{verified} verificați</span>
            <span className="text-amber-600">{leads} lead-uri</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="Căutați clienți..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">Toți</option>
          <option value="client">Verificați</option>
          <option value="lead">Lead-uri</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b bg-gray-50/50">
              <th className="px-4 py-3 text-left">Nume client</th>
              <th className="px-4 py-3 text-left">Telefon</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Scor</th>
              <th className="px-4 py-3 text-left">Locație</th>
              <th className="px-4 py-3 text-center">Comenzi</th>
              <th className="px-4 py-3 text-center">Poze</th>
              <th className="px-4 py-3 text-left">Ultima ofertă</th>
              <th className="px-4 py-3 text-center">Recenzie</th>
              <th className="px-4 py-3 text-right">Sumă cheltuită</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} onClick={() => navigate(`/clients/${c.id}`)}
                className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{c.name}</div>
                  {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="hover:text-green-600">{c.phone}</a>
                </td>
                <td className="px-4 py-3">
                  {c.type === 'client' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-600 border border-green-200">Verificat</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">Lead</span>
                  )}
                </td>
                <td className="px-4 py-3"><ScoreBadge score={c.score} /></td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.location || '—'}</td>
                <td className="px-4 py-3 text-center font-semibold">
                  {c.totalOrders > 0 ? c.totalOrders : <span className="text-gray-300">0</span>}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{c.totalPhotos || 0}</td>
                <td className="px-4 py-3 text-xs">
                  {c.totalSpent > 0 ? (
                    <div>
                      <span className="text-amber-600 font-semibold">Nuntă -24%</span>
                      <div className="text-[9px] text-gray-400">propus acum 3z</div>
                    </div>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-xs">
                  {c.type === 'client' && c.totalSpent > 0 ? (
                    c.totalOrders >= 2 ? (
                      <span className="text-green-600 font-bold">⭐ 5/5</span>
                    ) : (
                      <span className="text-gray-400">Neprimită</span>
                    )
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {c.totalSpent > 0 ? `${c.totalSpent.toLocaleString()} lei` : <span className="text-gray-300">0 lei</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
