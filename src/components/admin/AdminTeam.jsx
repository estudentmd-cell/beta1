import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateTeamMember,
  getAllOrders,
  getAllOrdersAsync,
  getDesignerStats,
  assignDesigner,
} from '../../utils/adminData';
import StatusBadge from './StatusBadge';

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner', bg: 'bg-green-100', text: 'text-green-700' },
  { value: 'designer', label: 'Designer', bg: 'bg-blue-100', text: 'text-blue-700' },
  { value: 'manager', label: 'Manager', bg: 'bg-purple-100', text: 'text-purple-700' },
];

function getRoleBadge(role) {
  return ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[1];
}

export default function AdminTeam() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('designer');
  const [editingId, setEditingId] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null); // designerName

  useEffect(() => {
    setMembers(getTeamMembers());
    setOrders(getAllOrders());
    getAllOrdersAsync().then(merged => setOrders(merged)).catch(() => {});
  }, []);

  function reload() {
    setMembers(getTeamMembers());
    setOrders(getAllOrders());
  }

  function handleAdd() {
    if (!newName.trim()) return;
    addTeamMember(newName.trim(), newEmail.trim(), newRole);
    setNewName('');
    setNewEmail('');
    setNewRole('designer');
    setShowAdd(false);
    reload();
  }

  function handleRemove(memberId) {
    removeTeamMember(memberId);
    reload();
  }

  function handleRoleChange(memberId, role) {
    updateTeamMember(memberId, { role });
    setEditingId(null);
    reload();
  }

  // Unassigned orders (waiting for designer)
  const pendingOrders = orders.filter(o => o.status === 'paid_pending_designer' && !o.designer);

  // Quick assign
  function handleQuickAssign(orderId, designerName) {
    assignDesigner(orderId, designerName);
    reload();
    setShowAssignModal(null);
  }

  // Designers only
  const designers = members.filter(m => m.role === 'designer');

  return (
    <div className="space-y-6">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Membri echipă" value={members.length} icon="👥" />
        <SummaryCard label="Designeri activi" value={designers.length} icon="🎨" />
        <SummaryCard
          label="Comenzi neasignate"
          value={pendingOrders.length}
          icon="📋"
          warn={pendingOrders.length > 0}
        />
        <SummaryCard
          label="Comenzi în lucru"
          value={orders.filter(o => o.status === 'designer_working').length}
          icon="⚡"
        />
      </div>

      {/* ── Unassigned orders alert ── */}
      {pendingOrders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-amber-800">
              📋 {pendingOrders.length} comenzi așteaptă designer
            </h3>
          </div>
          <div className="space-y-2">
            {pendingOrders.slice(0, 5).map(o => (
              <div key={o.id} className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-amber-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-gray-700">{o.id}</span>
                  <span className="text-sm text-gray-600">{o.clientName || 'Client'}</span>
                  <span className="text-xs text-gray-400">{o.totalPhotos || 0} poze</span>
                </div>
                <div className="flex items-center gap-2">
                  {designers.map(d => (
                    <button
                      key={d.id}
                      onClick={() => handleQuickAssign(o.id, d.name)}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition"
                      title={`Asignează la ${d.name}`}
                    >
                      → {d.name.split(' ')[0]}
                    </button>
                  ))}
                  <button
                    onClick={() => navigate(`/admin_panel/orders/${o.id}`)}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition"
                  >
                    Detalii
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Team members with stats ── */}
      <div className="space-y-4">
        {members.map((member) => {
          const role = getRoleBadge(member.role);
          const stats = member.role === 'designer' ? getDesignerStats(member.name, orders) : null;

          return (
            <div key={member.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Member header */}
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-500">
                    {(member.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{member.name}</div>
                    <div className="text-xs text-gray-400">{member.email || '—'}</div>
                  </div>
                  {editingId === member.id ? (
                    <div className="flex gap-1">
                      {ROLE_OPTIONS.map(r => (
                        <button
                          key={r.value}
                          onClick={() => handleRoleChange(member.id, r.value)}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition ${
                            member.role === r.value
                              ? `${r.bg} ${r.text} border-current`
                              : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer ${role.bg} ${role.text}`}
                      onClick={() => setEditingId(member.id)}
                      title="Click pentru a schimba rolul"
                    >
                      {role.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Elimină din echipă"
                    >
                      Elimină
                    </button>
                  )}
                </div>
              </div>

              {/* Designer stats */}
              {stats && (
                <div className="px-5 pb-5">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                    <MiniStat label="Active acum" value={stats.active} highlight={stats.active > 0} />
                    <MiniStat label="Completate" value={stats.completed} />
                    <MiniStat label="Revizuiri" value={stats.revisions} warn={stats.revisions > 0} />
                    <MiniStat label="Total asignate" value={stats.totalAssigned} />
                    <MiniStat label="Timp mediu" value={stats.avgHours ? `${stats.avgHours}h` : '—'} />
                  </div>

                  {/* Active orders list */}
                  {stats.activeOrders.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-400 mb-2">Comenzi active:</p>
                      <div className="flex flex-wrap gap-2">
                        {stats.activeOrders.map(o => (
                          <div
                            key={o.id}
                            onClick={() => navigate(`/admin_panel/orders/${o.id}`)}
                            className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition"
                          >
                            <span className="font-mono text-xs font-bold text-gray-700">{o.id}</span>
                            <span className="text-xs text-gray-500">{o.clientName || 'Client'}</span>
                            <StatusBadge order={o} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stats.active === 0 && stats.pendingGlobal > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs text-amber-600 font-medium">
                        ⚠ Designer liber — {stats.pendingGlobal} comenzi așteaptă asignare
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Add member ── */}
      {showAdd ? (
        <div className="bg-white rounded-xl shadow-sm p-5 border-2 border-[#3D6B5E]/20">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Adaugă membru nou</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nume complet"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email (opțional)"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="rounded-lg px-4 py-2 text-sm font-medium bg-[#3D6B5E] text-white hover:bg-[#2d5246] transition disabled:opacity-40"
            >
              Adaugă
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName(''); setNewEmail(''); }}
              className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Anulează
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-300 transition"
        >
          + Adaugă membru în echipă
        </button>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, warn }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 ${warn ? 'ring-2 ring-amber-200' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${warn ? 'text-amber-600' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, highlight, warn }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${warn ? 'text-orange-500' : highlight ? 'text-[#3D6B5E]' : 'text-gray-900'}`}>
        {value}
      </div>
      <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
    </div>
  );
}
