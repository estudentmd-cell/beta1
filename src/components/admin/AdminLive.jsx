import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllOrdersAsync } from '../../utils/adminData';
import { db } from '../../firebase/config';
import StatusBadge from './StatusBadge';

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'acum';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}z`;
}

export default function AdminLive() {
  const [orders, setOrders] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const addLog = (msg, type = 'info', role = 'client') => {
    setActivityLog(prev => [{ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), msg, type, role }, ...prev].slice(0, 30));
  };

  function loadOrders() {
    getAllOrdersAsync().then(all => {
      all.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
      setOrders(all);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  async function loadVisitors() {
    if (!db) return;
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'visitors'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      all.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      setVisitors(all);
    } catch {}
  }

  useEffect(() => {
    loadOrders();
    loadVisitors();
    const t = setInterval(() => { loadOrders(); loadVisitors(); }, 15000);

    // Real-time Activity Feed — skip initial snapshot
    let unsub;
    if (db) {
      (async () => {
        const { collection, onSnapshot } = await import('firebase/firestore');
        let projectsReady = false, ordersReady = false, clientsReady = false;

        const unsubP = onSnapshot(collection(db, 'projects'), (snap) => {
          if (!projectsReady) { projectsReady = true; return; }
          snap.docChanges().forEach(c => {
            const d = c.doc.data();
            const name = d.clientName || 'Client';
            if (c.type === 'modified') addLog(`${name} — #${c.doc.id} actualizat (${d.totalPhotos || 0} poze)`, 'update', 'client');
          });
        });
        const unsubO = onSnapshot(collection(db, 'orders'), (snap) => {
          if (!ordersReady) { ordersReady = true; return; }
          snap.docChanges().forEach(c => {
            if (c.type === 'added') addLog(`📦 Comandă nouă #${c.doc.id}`, 'order', 'admin');
            else if (c.type === 'modified') addLog(`📦 #${c.doc.id} → ${c.doc.data().status || '?'}`, 'order', 'admin');
          });
        });
        const unsubC = onSnapshot(collection(db, 'clients'), (snap) => {
          if (!clientsReady) { clientsReady = true; return; }
          snap.docChanges().forEach(c => {
            const d = c.doc.data();
            if (c.type === 'added') addLog(`📋 Client nou — ${d.email || d.phone || '?'}`, 'new', 'client');
          });
        });
        unsub = () => { unsubP(); unsubO(); unsubC(); };
      })();
    }

    return () => { clearInterval(t); if (unsub) unsub(); };
  }, []);

  if (loading) return <div className="p-8 text-gray-400">Se încarcă...</div>;

  // Activity Feed UI
  const activityFeed = (
    <div className="bg-[#1c1c1c] rounded-xl overflow-hidden mb-6">
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[12px] text-white/70 font-semibold">Live Activity</span>
        </div>
        <button onClick={() => setActivityLog([])} className="text-[10px] text-white/20 hover:text-white/50">Curăță</button>
      </div>
      {activityLog.length === 0 ? (
        <div className="px-4 py-6 text-center text-[11px] text-white/20">Se așteaptă activitate în timp real...</div>
      ) : (
        <div className="max-h-[200px] overflow-y-auto px-4 py-2 space-y-1">
          {activityLog.map(e => (
            <div key={e.id} className="flex items-center gap-2 text-[11px]">
              <span className="text-white/25 font-mono shrink-0">{e.time}</span>
              <span className={`flex-1 ${
                e.type === 'new' ? 'text-green-400' : e.type === 'order' ? 'text-blue-400' : 'text-yellow-300'
              }`}>{e.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Stats
  const total = orders.length;
  const paid = orders.filter(o => o.paymentStatus === 'paid').length;
  const revenue = orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + (o.priceTotal || 0), 0);
  const delivered = orders.filter(o => o.status === 'delivered').length;

  // Visitor stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayVisitors = visitors.filter(v => (v.timestamp || '').startsWith(todayStr));
  const mobileCount = visitors.filter(v => v.device === 'mobile').length;
  const desktopCount = visitors.filter(v => v.device === 'desktop').length;
  const tabletCount = visitors.filter(v => v.device === 'tablet').length;

  // Group by country
  const countryMap = {};
  visitors.forEach(v => {
    const c = v.country || '—';
    countryMap[c] = (countryMap[c] || 0) + 1;
  });
  const topCountries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Group by city
  const cityMap = {};
  visitors.forEach(v => {
    const c = v.city || '—';
    if (c !== '—') cityMap[c] = (cityMap[c] || 0) + 1;
  });
  const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Device chart
  const deviceTotal = mobileCount + desktopCount + tabletCount || 1;

  return (
    <div className="space-y-6">
      {/* Live Activity Feed */}
      {activityFeed}
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Vizitatori total" value={visitors.length} sub={`${todayVisitors.length} azi`} />
        <StatBox label="Comenzi plătite" value={paid} sub={`${revenue} lei venituri`} accent />
        <StatBox label="Total comenzi" value={total} sub={`${delivered} livrate`} />
        <StatBox label="Azi activi" value={todayVisitors.length} sub="vizitatori unici" />
      </div>

      {/* Devices + Location */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Dispozitive */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Dispozitive</h3>
          <div className="space-y-3">
            <DeviceBar label="📱 Mobil" count={mobileCount} total={deviceTotal} color="bg-blue-500" />
            <DeviceBar label="💻 Desktop" count={desktopCount} total={deviceTotal} color="bg-green-500" />
            <DeviceBar label="📟 Tabletă" count={tabletCount} total={deviceTotal} color="bg-purple-500" />
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
            Total: {visitors.length} vizitatori
          </div>
        </div>

        {/* Țări */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Țări</h3>
          {topCountries.length === 0 ? (
            <p className="text-sm text-gray-400">Nicio vizită încă</p>
          ) : (
            <div className="space-y-2">
              {topCountries.map(([country, count]) => (
                <div key={country} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{country}</span>
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orașe */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Orașe</h3>
          {topCities.length === 0 ? (
            <p className="text-sm text-gray-400">Nicio vizită încă</p>
          ) : (
            <div className="space-y-2">
              {topCities.map(([city, count]) => (
                <div key={city} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{city}</span>
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent visitors */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Vizitatori recenți</h3>
          <span className="text-xs text-gray-400">Auto-refresh 15s</span>
        </div>
        {visitors.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Niciun vizitator încă.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-gray-400 border-b uppercase tracking-wider">
                  <th className="px-4 py-2">Dispozitiv</th>
                  <th className="px-4 py-2">Browser</th>
                  <th className="px-4 py-2">Locație</th>
                  <th className="px-4 py-2">Pagina</th>
                  <th className="px-4 py-2">Ecran</th>
                  <th className="px-4 py-2">Când</th>
                </tr>
              </thead>
              <tbody>
                {visitors.slice(0, 30).map(v => (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        v.device === 'mobile' ? 'bg-blue-100 text-blue-700' :
                        v.device === 'tablet' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {v.device === 'mobile' ? '📱 Mobil' : v.device === 'tablet' ? '📟 Tabletă' : '💻 Desktop'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{v.browser || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs font-medium text-gray-800">{v.city || '—'}</div>
                      <div className="text-[10px] text-gray-400">{v.country || '—'}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{v.page || '/'}</td>
                    <td className="px-4 py-2.5 text-[10px] text-gray-400">{v.screenW}×{v.screenH}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{timeAgo(v.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h3 className="text-sm font-semibold text-gray-700">Comenzi recente</h3>
        </div>
        {orders.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Nicio comandă.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-gray-400 border-b uppercase tracking-wider">
                  <th className="px-4 py-2">Comandă</th>
                  <th className="px-4 py-2">Client</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Ultima acțiune</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 15).map(o => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => navigate(`/admin_panel/orders/${o.id}`)}>
                    <td className="px-4 py-2.5 font-mono text-xs font-bold">{o.id}</td>
                    <td className="px-4 py-2.5 text-[13px] font-medium text-gray-900">{o.clientName || '—'}</td>
                    <td className="px-4 py-2.5"><StatusBadge order={o} /></td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{timeAgo(o.updatedAt || o.createdAt)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold">{o.priceTotal ? `${o.priceTotal} lei` : '—'}</td>
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

function StatBox({ label, value, sub, accent }) {
  return (
    <div className={`rounded-xl p-4 ${accent ? 'bg-[#EAF0EC] border border-[#3D6B5E]/20' : 'bg-white shadow-sm'}`}>
      <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent ? 'text-[#3D6B5E]' : 'text-gray-900'}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function DeviceBar({ label, count, total, color }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
