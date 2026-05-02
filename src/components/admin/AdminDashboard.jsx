import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllOrders, getAllOrdersAsync, calculateSLA, cleanupAllData } from '../../utils/adminData';
import useAdminStore from '../../stores/useAdminStore';
import StatusBadge from './StatusBadge';
import SLABadge from './SLABadge';
import { db } from '../../firebase/config';

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}z`;
}

const PERIODS = [
  { id: 'today', label: 'Azi', days: 0 },
  { id: 'week', label: '7 zile', days: 7 },
  { id: 'month', label: '30 zile', days: 30 },
  { id: 'all', label: 'Total', days: 9999 },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [period, setPeriod] = useState('week');
  const { notifications, loadNotifications, unreadCount } = useAdminStore();

  const [loading, setLoading] = useState(true);
  const [cleanupStatus, setCleanupStatus] = useState('');
  const [cleaning, setCleaning] = useState(false);

  const handleCleanup = async () => {
    if (!confirm('ATENȚIE: Se vor șterge TOATE comenzile, proiectele, clienții (exceptând admin), invitațiile, vizitatorii și datele de test.\n\nAceastă acțiune este ireversibilă!\n\nContinui?')) return;
    if (!confirm('Ești absolut sigur? Toate datele vor fi șterse permanent.')) return;
    setCleaning(true);
    try {
      const results = await cleanupAllData((msg) => setCleanupStatus(msg));
      setCleanupStatus('Curățare completă!');
      console.log('Cleanup results:', results);
      // Reload data
      getAllOrdersAsync().then(o => setOrders(o));
      setTimeout(() => { setCleanupStatus(''); setCleaning(false); }, 3000);
    } catch (e) {
      setCleanupStatus('Eroare: ' + e.message);
      setCleaning(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    getAllOrdersAsync().then(o => { setOrders(o); setLoading(false); }).catch(() => setLoading(false));
    // Load visitors
    if (db) {
      import('firebase/firestore').then(({ collection, getDocs }) => {
        getDocs(collection(db, 'visitors')).then(snap => {
          setVisitors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      }).catch(() => {});
    }
  }, []);

  // Period filter
  const periodDays = PERIODS.find(p => p.id === period)?.days ?? 7;
  const cutoff = periodDays === 0
    ? new Date().toISOString().slice(0, 10)
    : new Date(Date.now() - periodDays * 86400000).toISOString();

  const getDate = (o) => o.createdAt || o.created_at || '';
  const filteredOrders = periodDays === 0
    ? orders.filter(o => getDate(o).startsWith(cutoff))
    : periodDays >= 9999
    ? orders
    : orders.filter(o => getDate(o) >= cutoff);

  // KPIs
  const totalOrders = filteredOrders.length;
  const paidOrders = filteredOrders.filter(o => o.paymentStatus === 'paid');
  const revenue = paidOrders.reduce((s, o) => s + (o.priceTotal || 0), 0);
  const uniqueClients = new Set(filteredOrders.map(o => o.clientPhone || o.clientEmail || o.id).filter(Boolean)).size;
  const conversionRate = visitors.length > 0 ? Math.round((paidOrders.length / visitors.length) * 100) : 0;

  // Pipeline
  const pipeline = {
    draft: orders.filter(o => o.status === 'draft' && (o.totalPhotos || 0) > 0).length,
    awaitingPayment: orders.filter(o => o.status === 'awaiting_payment').length,
    pendingDesigner: orders.filter(o => o.status === 'paid_pending_designer').length,
    designerWorking: orders.filter(o => o.status === 'designer_working').length,
    awaitingClient: orders.filter(o => o.status === 'pending_client_approval' || o.status === 'revision_requested').length,
    printReady: orders.filter(o => o.status === 'approved_print').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  // Active clients (working now)
  const activeClients = orders
    .filter(o => {
      if ((o.totalPhotos || 0) === 0) return false;
      const hrs = (Date.now() - new Date(o.updatedAt || o.createdAt || '').getTime()) / 3600000;
      return hrs < 72;
    })
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  // Recent orders (all, sorted)
  const recentOrders = [...orders]
    .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''))
    .slice(0, 10);

  // Geography — city + region combined
  const cityMap = {};
  visitors.forEach(v => {
    const city = v.city || '—';
    const region = v.region || '';
    const label = region && region !== city ? `${city}, ${region}` : city;
    if (label !== '—') cityMap[label] = (cityMap[label] || 0) + 1;
  });
  const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Devices
  const mobileCount = visitors.filter(v => v.device === 'mobile').length;
  const desktopCount = visitors.filter(v => v.device === 'desktop').length;

  return (
    <div className="space-y-6">

      {/* ── Cleanup button + Period filter ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === p.id ? 'bg-[#3D6B5E] text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}>
            {p.label}
          </button>
        ))}
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Comenzi" value={totalOrders} sub={`${paidOrders.length} achitate`} icon="📦" />
        <KpiCard label="Venituri" value={`${revenue} lei`} sub={`${paidOrders.length} tranzacții`} icon="💰" accent />
        <KpiCard label="Clienți" value={uniqueClients} sub="unici" icon="👥" />
        <KpiCard label="Conversie" value={`${conversionRate}%`} sub={`din ${visitors.length} vizitatori`} icon="📈" />
      </div>

      {/* ── Two columns: Orders + Active clients ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Comenzi recente — 2/3 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Comenzi recente</h3>
            <button onClick={() => navigate('/admin_panel/orders')} className="text-xs text-[#3D6B5E] font-medium">
              Toate →
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">Nicio comandă</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentOrders.map(o => (
                <div key={o.id} onClick={() => navigate(`/admin_panel/orders/${o.id}`)}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer transition">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{o.clientName || '—'}</span>
                      <StatusBadge order={o} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {o.productConfig?.name || 'Album'} · {o.productConfig?.format || ''} · {o.totalPhotos || 0} poze
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    {o.priceTotal > 0 && <div className="text-sm font-bold text-[#3D6B5E]">{o.priceTotal} lei</div>}
                    <div className="text-[10px] text-gray-400">{timeAgo(o.updatedAt || o.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clienți activi — 1/3 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-900">Clienți activi
              {activeClients.length > 0 && <span className="ml-2 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{activeClients.length}</span>}
            </h3>
          </div>
          {activeClients.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">Nimeni activ acum</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activeClients.slice(0, 8).map(o => (
                <div key={o.id} onClick={() => navigate(`/admin_panel/orders/${o.id}`)}
                  className="px-5 py-3 hover:bg-gray-50 cursor-pointer transition">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{o.clientName || '—'}</span>
                    <span className="text-[10px] text-gray-400">{timeAgo(o.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#3D6B5E] transition-all" style={{ width: `${o.progress || 0}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500">{o.totalPhotos || 0} poze · {Math.round(o.progress || 0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Two columns: Geography + Devices ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Geografic */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Geografic — de unde vin clienții</h3>
          {topCities.length === 0 ? (
            <p className="text-sm text-gray-400">Nicio vizită încă</p>
          ) : (
            <div className="space-y-2">
              {topCities.map(([city, count]) => {
                const pct = Math.round((count / visitors.length) * 100);
                return (
                  <div key={city}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-gray-700">{city}</span>
                      <span className="text-sm font-bold text-gray-900">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#3D6B5E] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dispozitive */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Dispozitive</h3>
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <DeviceBar label="📱 Mobil" count={mobileCount} total={visitors.length || 1} color="bg-blue-500" />
              <div className="mt-3">
                <DeviceBar label="💻 Desktop" count={desktopCount} total={visitors.length || 1} color="bg-green-500" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{visitors.length}</div>
              <div className="text-xs text-gray-400">total vizitatori</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pipeline ── */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Pipeline comenzi</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <PipeStep label="Editează" count={pipeline.draft} color="bg-yellow-500" />
          <PipeArrow />
          <PipeStep label="Așteaptă plata" count={pipeline.awaitingPayment} color="bg-amber-500" />
          <PipeArrow />
          <PipeStep label="Așteaptă designer" count={pipeline.pendingDesigner} color="bg-orange-500" />
          <PipeArrow />
          <PipeStep label="Designer lucrează" count={pipeline.designerWorking} color="bg-blue-500" />
          <PipeArrow />
          <PipeStep label="Așteaptă client" count={pipeline.awaitingClient} color="bg-purple-500" />
          <PipeArrow />
          <PipeStep label="La tipar" count={pipeline.printReady} color="bg-[#3D6B5E]" />
          <PipeArrow />
          <PipeStep label="Expediat" count={pipeline.shipped} color="bg-cyan-500" />
          <PipeArrow />
          <PipeStep label="Livrat" count={pipeline.delivered} color="bg-green-600" />
        </div>
      </div>

      {/* ── Erori & Funnel card ── */}
      <ErrorFunnelCard period={period} navigate={navigate} />

      {/* ── Notifications ── */}
      {unreadCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-amber-800">🔔 {unreadCount} notificări necitite</h3>
            <button onClick={() => useAdminStore.getState().markAllRead()}
              className="text-xs text-amber-600 font-medium">Marchează citite</button>
          </div>
          <div className="space-y-1">
            {notifications.filter(n => !n.read).slice(0, 3).map(n => (
              <div key={n.id} onClick={() => { useAdminStore.getState().dismissNotification(n.id); if (n.orderId) navigate(`/admin_panel/orders/${n.orderId}`); }}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2 cursor-pointer hover:bg-amber-50/50 transition text-sm">
                <span className="text-gray-700 truncate">{n.message || 'Notificare'}</span>
                <span className="text-[10px] text-gray-400 shrink-0 ml-2">{timeAgo(n.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, icon, accent }) {
  return (
    <div className={`rounded-xl p-5 ${accent ? 'bg-[#3D6B5E] text-white' : 'bg-white shadow-sm'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium uppercase tracking-wider ${accent ? 'text-white/60' : 'text-gray-400'}`}>{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${accent ? 'text-white/50' : 'text-gray-400'}`}>{sub}</div>}
    </div>
  );
}

function PipeStep({ label, count, color }) {
  return (
    <div className="flex flex-col items-center shrink-0 min-w-[80px]">
      <div className={`w-10 h-10 rounded-full ${color} text-white flex items-center justify-center text-sm font-bold mb-1`}>{count}</div>
      <span className="text-[10px] text-gray-500 text-center leading-tight">{label}</span>
    </div>
  );
}

function PipeArrow() {
  return <div className="text-gray-300 shrink-0">→</div>;
}

function ErrorFunnelCard({ period, navigate }) {
  const [errorCount, setErrorCount] = useState(0);
  const [funnelSummary, setFunnelSummary] = useState(null);

  useEffect(() => {
    if (!db) return;
    (async () => {
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const p = PERIODS.find(x => x.id === period);
        const cutoff = !p || p.days >= 9999 ? '' : p.days === 0 ? new Date().toISOString().slice(0, 10) : new Date(Date.now() - p.days * 86400000).toISOString();
        const filterFn = (ts) => {
          if (!cutoff) return true;
          if (p.days === 0) return (ts || '').startsWith(cutoff);
          return (ts || '') >= cutoff;
        };

        const [errSnap, funSnap] = await Promise.all([
          getDocs(collection(db, 'errors')),
          getDocs(collection(db, 'funnel')),
        ]);

        const errs = errSnap.docs.map(d => d.data()).filter(d => filterFn(d.timestamp));
        setErrorCount(errs.length);

        const funs = funSnap.docs.map(d => d.data()).filter(d => filterFn(d.timestamp));
        const steps = ['visit', 'select_product', 'open_editor', 'upload_photos', 'checkout', 'order_placed'];
        const labels = ['Vizite', 'Produs', 'Editor', 'Upload', 'Checkout', 'Comandă'];
        const counts = steps.map(step => {
          const sessions = new Set();
          funs.filter(f => f.step === step).forEach(f => sessions.add(f.sessionId));
          return sessions.size;
        });
        setFunnelSummary(labels.map((l, i) => `${l}: ${counts[i]}`).join(' → '));
      } catch {}
    })();
  }, [period]);

  return (
    <div onClick={() => navigate('/admin_panel/errors')}
      className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:bg-gray-50 transition">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Erori & Funnel</h3>
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {errorCount} erori
            </span>
          )}
          <span className="text-xs text-[#3D6B5E] font-medium">Detalii →</span>
        </div>
      </div>
      {funnelSummary ? (
        <p className="text-xs text-gray-500">{funnelSummary}</p>
      ) : (
        <p className="text-xs text-gray-400">Se încarcă...</p>
      )}
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
