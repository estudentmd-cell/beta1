import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllClients, getAllClientsAsync, getClientOrders, getAllOrders, getAllOrdersAsync } from '../../utils/adminData';
import StatusBadge, { getGranularStatus, getSalesAction } from './StatusBadge';

/* ── Journey: pas curent din date reale ── */
const STEP_LABELS = ['Cont', 'Upload', 'Editare', 'Comandă', 'Plată', 'Designer', 'Aprobare', 'Tipar', 'Livrat'];

function getJourneyStep(order) {
  if (!order) return { step: 0, label: 'Doar cont' };
  const s = order.status;
  const photos = order.totalPhotos || 0;
  const used = order.usedPhotos || 0;
  const progress = order.progress || 0;
  const ts = order.updatedAt || order.updated_at || order.createdAt || order.created_at;
  const days = ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 86400000) : 0;
  const stuckDays = days > 0 ? `${days}z` : '';

  if (s === 'delivered' || s === 'livrat') return { step: 8, label: 'Livrat' };
  if (s === 'shipped') return { step: 7, label: 'Expediat', stuckDays };
  if (s === 'in_print') return { step: 7, label: 'La tipar', stuckDays };
  if (s === 'approved_print' || s === 'print_ready') return { step: 7, label: 'Gata de tipar', stuckDays };
  if (s === 'pending_client_approval') return { step: 6, label: 'Așteaptă aprobare', stuckDays };
  if (s === 'revision_requested') return { step: 6, label: 'Cere modificări', stuckDays };
  if (s === 'designer_working') return { step: 5, label: `Designer: ${order.designer || '?'}`, stuckDays };
  if (s === 'paid_pending_designer' || s === 'paid_pending_verification') return { step: 4, label: 'Achitat, fără designer', stuckDays };
  if (s === 'awaiting_payment') return { step: 3, label: 'Nu a achitat', stuckDays };

  if (progress >= 80) return { step: 2, label: `${progress}% — aproape gata!`, stuckDays };
  if (progress > 0 || used > 0) return { step: 2, label: `${progress}% editare`, stuckDays };
  if (photos > 0) return { step: 1, label: `${photos} poze, 0 plasate`, stuckDays };

  return { step: 0, label: 'Nu a început', stuckDays };
}

function StepBar({ step }) {
  return (
    <div className="flex items-center gap-0.5 w-20">
      {STEP_LABELS.map((_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full ${
          i < step ? 'bg-[#3D6B5E]' : i === step ? 'bg-[#3D6B5E]/40' : 'bg-gray-200'
        }`} />
      ))}
    </div>
  );
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Acum';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d} zile`;
}

function formatMoney(amount) {
  if (!amount) return '0,00 L';
  return amount.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' L';
}

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stepFilter, setStepFilter] = useState('all'); // filter by journey step
  const navigate = useNavigate();

  useEffect(() => {
    getAllClientsAsync().then((merged) => setClients(merged)).catch(() => {});
    getAllOrdersAsync().then(setOrders).catch(() => {});
  }, []);

  // Build enriched client list with sales data + journey
  const enrichedClients = clients.map((c) => {
    const clientOrders = orders.filter((o) => {
      const oPhone = (o.clientPhone || o.client_phone || '').replace(/\D/g, '').slice(-8);
      const cPhone = (c.phone || '').replace(/\D/g, '').slice(-8);
      return cPhone && oPhone === cPhone;
    });

    const bestDraft = clientOrders
      .filter(o => o.status === 'draft')
      .sort((a, b) => (b.progress || 0) - (a.progress || 0))[0];

    const bestPaid = clientOrders.find(o => o.status && o.status !== 'draft');

    const mainOrder = bestPaid || bestDraft || clientOrders[0];
    const salesAction = mainOrder ? getSalesAction(mainOrder) : { priority: 'none' };
    const granularStatus = mainOrder ? getGranularStatus(mainOrder) : null;
    const journey = getJourneyStep(mainOrder);

    return {
      ...c,
      mainOrder,
      salesAction,
      granularStatus,
      bestDraft,
      bestPaid,
      clientOrders,
      journey,
    };
  });

  const filtered = enrichedClients.filter((c) => {
    const isLead = c.type === 'lead' || (!c.email && c.orderCount === 0);

    if (statusFilter === 'client' && isLead) return false;
    if (statusFilter === 'lead' && !isLead) return false;
    if (statusFilter === 'hot' && c.salesAction.priority !== 'hot') return false;
    if (statusFilter === 'risk' && !['hot', 'warm'].includes(c.salesAction.priority)) return false;

    // Journey step filter
    if (stepFilter !== 'all') {
      const stepNum = parseInt(stepFilter);
      if (!isNaN(stepNum) && c.journey.step !== stepNum) return false;
    }

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  // Sort: hot leads first, then by recency
  filtered.sort((a, b) => {
    const priorityOrder = { hot: 0, warm: 1, cold: 2, none: 3 };
    const pa = priorityOrder[a.salesAction.priority] ?? 3;
    const pb = priorityOrder[b.salesAction.priority] ?? 3;
    if (pa !== pb) return pa - pb;
    if (a.totalSpent !== b.totalSpent) return (b.totalSpent || 0) - (a.totalSpent || 0);
    const da = a.lastOrder || a.last_access || a.created_at || '';
    const db2 = b.lastOrder || b.last_access || b.created_at || '';
    return db2 > da ? 1 : db2 < da ? -1 : 0;
  });

  const totalClients = clients.length;
  const clientCount = clients.filter((c) => c.type !== 'lead' && (c.email || c.orderCount > 0)).length;
  const leadCount = totalClients - clientCount;
  const hotCount = enrichedClients.filter(c => c.salesAction.priority === 'hot').length;
  const riskCount = enrichedClients.filter(c => ['hot', 'warm'].includes(c.salesAction.priority)).length;

  // Step counts for filter buttons
  const stepCounts = {};
  enrichedClients.forEach(c => {
    stepCounts[c.journey.step] = (stepCounts[c.journey.step] || 0) + 1;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{totalClients} clienți</span>
          <span>{clientCount} verificați</span>
          <span>{leadCount} lead-uri</span>
          {hotCount > 0 && (
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
              {hotCount} hot
            </span>
          )}
        </div>
      </div>

      {/* Journey step filter buttons */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setStepFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            stepFilter === 'all' ? 'bg-[#3D6B5E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Toți ({totalClients})
        </button>
        {STEP_LABELS.map((label, i) => {
          const count = stepCounts[i] || 0;
          if (count === 0) return null;
          const isActive = stepFilter === String(i);
          const needsAction = i <= 3; // pre-payment steps need attention
          return (
            <button
              key={i}
              onClick={() => setStepFilter(isActive ? 'all' : String(i))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                isActive ? 'bg-[#3D6B5E] text-white' :
                needsAction && count > 0 ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' :
                'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {i + 1}. {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search + status filter */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Căutați clienți..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="all">Toți</option>
          <option value="hot">Hot leads ({hotCount})</option>
          <option value="risk">La risc ({riskCount})</option>
          <option value="client">Clienți verificați</option>
          <option value="lead">Lead-uri</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            {search ? 'Niciun client găsit' : 'Nu sunt clienți încă'}
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Unde e acum</th>
                <th className="px-4 py-3">Ultima activitate</th>
                <th className="px-4 py-3 text-right">Cheltuit</th>
                <th className="px-4 py-3">Acțiune</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => {
                const j = client.journey;
                const isStuck = j.stuckDays && parseInt(j.stuckDays) > 1;

                return (
                  <tr
                    key={client.phone || client.id || i}
                    onClick={() => navigate(`/admin_panel/clients/${encodeURIComponent(client.phone || client.id)}`)}
                    className={`hover:bg-gray-50 cursor-pointer transition ${
                      client.salesAction.priority === 'hot' ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        {client.salesAction.priority === 'hot' && <span className="text-xs">🔥</span>}
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-1.5">
                            {client.name || '—'}
                            {!client.last_access ? (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Nou</span>
                            ) : client.orderCount > 0 ? (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">Revine</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {client.phone || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <div className="flex flex-col gap-1">
                        <StepBar step={j.step} />
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-700">
                            {j.step + 1}/9
                          </span>
                          <span className={`text-xs ${isStuck ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            {j.label}
                          </span>
                          {j.stuckDays && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              parseInt(j.stuckDays) > 3 ? 'bg-red-100 text-red-600 font-bold' :
                              parseInt(j.stuckDays) > 1 ? 'bg-amber-100 text-amber-600' :
                              'text-gray-400'
                            }`}>
                              {j.stuckDays}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-gray-500 text-xs">
                      {timeAgo(client.lastOrder || client.last_access || client.created_at)}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-right font-semibold">
                      {client.totalSpent > 0 ? formatMoney(client.totalSpent) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      {client.salesAction.action && client.salesAction.phone ? (
                        <a
                          href={`tel:${client.salesAction.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            client.salesAction.priority === 'hot'
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : client.salesAction.priority === 'warm'
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          📞 Sună
                        </a>
                      ) : client.bestPaid ? (
                        <span className="text-xs text-green-600 font-medium">✓ Plătit</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
