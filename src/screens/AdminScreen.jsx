import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import useAdminStore from '../stores/useAdminStore';
import useAuthStore from '../stores/useAuthStore';
import { getAllOrders, getAllOrdersAsync, getInvitations } from '../utils/adminData';

/* ═══ NAV — full sidebar items ═══ */
const NAV = [
  { path: '/admin_panel/live',         label: 'Live',              icon: 'live' },
  { path: '/admin_panel/orders',      label: 'Toate comenzile',  icon: 'orders' },
  { path: '/admin_panel/clients',    label: 'Clienți',           icon: 'clients' },
  { path: '/admin_panel/de_tiparit',  label: 'Producție & Livrare', icon: 'print' },
  { path: '/admin_panel/invitations', label: 'Link-uri trimise', icon: 'link' },
  { sep: 'Site' },
  { path: '/admin_panel/hero',       label: 'Hero Slideshow',   icon: 'live' },
  { path: '/admin_panel/landing',    label: 'Landing Page',     icon: 'landing' },
  { path: '/admin_panel/travel',     label: 'Pagina Călătorie', icon: 'travel' },
  { path: '/admin_panel/pages',      label: 'Pagini CMS',      icon: 'pages' },
  { path: '/admin_panel/emails',     label: 'Notificări email', icon: 'email' },
  { path: '/admin_panel/errors',    label: 'Erori & Funnel',  icon: 'errors' },
  { sep: 'Configurare' },
  { path: '/admin_panel/layouts',    label: 'Colaje învățate',  icon: 'layouts' },
  { path: '/admin_panel/products',   label: 'Produse',          icon: 'products' },
  { path: '/admin_panel/team',        label: 'Echipă',           icon: 'team' },
  { path: '/admin_panel/covers',      label: 'Coverte',          icon: 'covers' },
  { path: '/admin_panel/dimensions',  label: 'Dimensiuni',       icon: 'dimensions' },
  { path: '/admin_panel/pricing',     label: 'Prețuri',          icon: 'pricing' },
  { path: '/admin_panel/offers',      label: 'Oferte',           icon: 'offers' },
];

/* ═══ Mobile bottom tabs — cele mai folosite ═══ */
const MOBILE_TABS = [
  { path: '/admin_panel/orders', label: 'Comenzi', icon: 'orders' },
  { path: '/admin_panel/clients', label: 'Clienți', icon: 'clients' },
  { path: '/admin_panel/de_tiparit', label: 'Producție', icon: 'print' },
  { path: '/admin_panel/live', label: 'Live', icon: 'live' },
  { id: 'more', label: 'Mai mult', icon: 'more' },
];

function SvgIcon({ name, className = '' }) {
  const c = `w-5 h-5 ${className}`;
  const p = { className: c, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.8 };
  switch (name) {
    case 'orders': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /><path strokeLinecap="round" d="M9 12h6M9 16h6" /></svg>;
    case 'print': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" rx="1" /></svg>;
    case 'team': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>;
    case 'covers': return <svg {...p}><rect x="2" y="3" width="20" height="18" rx="2" /><path d="M8 3v18" /></svg>;
    case 'dimensions': return <svg {...p}><path d="M21 3H3v18h18V3zM9 3v18M3 9h18" /></svg>;
    case 'pricing': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'layouts': return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="10" width="7" height="4" rx="1"/><rect x="3" y="13" width="7" height="8" rx="1"/><rect x="14" y="17" width="7" height="4" rx="1"/></svg>;
    case 'offers': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>;
    case 'live': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3-9 4 18 3-9h4" /></svg>;
    case 'link': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
    case 'clients': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>;
    case 'products': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
    case 'pages': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    case 'email': return <svg {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>;
    case 'errors': return <svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
    case 'landing': return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M3 9h18M9 9v12" /></svg>;
    case 'travel': return <svg {...p}><circle cx="12" cy="10" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>;
    case 'more': return <svg {...p}><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" /></svg>;
    default: return null;
  }
}

export default function AdminScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, unreadCount, loadNotifications, dismissNotification, markAllRead } = useAdminStore();
  const { user, isAdmin: clientIsAdmin, isAuthenticated, loading, signInWithGoogle, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [firestoreAdmin, setFirestoreAdmin] = useState(null);

  useEffect(() => {
    if (!user?.uid || !isAuthenticated) { setFirestoreAdmin(false); return; }
    (async () => {
      try {
        const { db } = await import('../firebase/config');
        if (!db) { setFirestoreAdmin(false); return; }
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'admins', user.uid));
        setFirestoreAdmin(snap.exists() && snap.data()?.role === 'admin');
      } catch { setFirestoreAdmin(false); }
    })();
  }, [user?.uid, isAuthenticated]);

  const isAdmin = firestoreAdmin === true;
  const [counts, setCounts] = useState({});
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchRef = useRef(null);

  function refreshCounts() {
    getAllOrdersAsync().then(orders => {
      const MOVED = ['approved_print', 'in_print', 'shipped', 'delivered'];
      const comenzi = orders.filter(o => o.status && o.status !== 'draft' && !MOVED.includes(o.status)).length;
      const gataTipar = orders.filter(o => o.status === 'approved_print').length;
      const deLivrat = orders.filter(o => o.status === 'in_print' || o.status === 'shipped').length;
      const invitations = getInvitations();
      const norm = (ph) => (ph || '').replace(/\D/g, '').slice(-8);
      const paidPhones = new Set();
      orders.forEach(o => { if (o.status && o.status !== 'draft') { const ph = norm(o.clientPhone || o.client_phone); if (ph) paidPhones.add(ph); } });
      const linkuri = invitations.filter(inv => { const ph = norm(inv.phone); return ph && !paidPhones.has(ph); }).length;
      setCounts({ comenzi, linkuri, gataTipar, deLivrat });
    }).catch(() => {});
  }

  useEffect(() => { loadNotifications(); refreshCounts(); const t = setInterval(() => { loadNotifications(); refreshCounts(); }, 30000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!globalSearch || globalSearch.length < 2) { setSearchResults([]); return; }
    const q = globalSearch.toLowerCase();
    getAllOrdersAsync().then(all => {
      setSearchResults(all.filter(o =>
        (o.id || '').toLowerCase().includes(q) || (o.clientName || '').toLowerCase().includes(q) ||
        (o.clientPhone || '').toLowerCase().includes(q) || (o.clientEmail || '').toLowerCase().includes(q)
      ).slice(0, 8));
    }).catch(() => {});
  }, [globalSearch]);

  useEffect(() => {
    const h = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchResults([]); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => {
    const h = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); };
    if (bellOpen) document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [bellOpen]);

  // Close more menu on navigation
  useEffect(() => { setMoreOpen(false); setSidebarOpen(false); }, [location.pathname]);

  const isGoogleUser = user?.email && isAuthenticated && user.uid && !user.uid.startsWith('phone_') && !user.uid.startsWith('guest_');

  if (loading || (isAuthenticated && user?.uid && firestoreAdmin === null)) return <div className="flex items-center justify-center h-screen text-gray-400">Se verifică...</div>;

  if (!isGoogleUser) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4 px-6">
        <div className="text-5xl">🔐</div>
        <h2 className="font-serif text-2xl">Admin Panel</h2>
        <p className="text-gray-400 text-sm">Conectează-te cu Google</p>
        {googleError && <div className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{googleError}</div>}
        <button onClick={async () => { setGoogleError(''); setGoogleLoading(true); try { await signInWithGoogle(); } catch (e) { setGoogleError(e?.message || 'Eroare'); } finally { setGoogleLoading(false); } }}
          disabled={googleLoading} className="flex items-center gap-3 px-6 py-3 border rounded-xl bg-white hover:shadow transition text-sm font-semibold disabled:opacity-50">
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {googleLoading ? 'Se conectează...' : 'Conectare cu Google'}
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4 px-6">
        <div className="text-5xl">⛔</div>
        <p className="text-gray-500 text-sm text-center">Contul <strong>{user.email}</strong> nu are drepturi admin.</p>
        <button onClick={logout} className="px-5 py-2 border rounded-lg text-sm hover:shadow transition">Deconectare</button>
      </div>
    );
  }

  const isActive = (p) => location.pathname === p || (p !== '/admin_panel' && location.pathname.startsWith(p));

  let title = 'Toate comenzile';
  if (location.pathname.startsWith('/admin_panel/orders/')) title = 'Detalii comandă';
  else if (location.pathname.startsWith('/admin_panel/clients/')) title = 'Profil client';
  else { const found = NAV.find(n => n.path && isActive(n.path)); if (found) title = found.label; }

  if (location.pathname === '/admin_panel' || location.pathname === '/admin_panel/') {
    navigate('/admin_panel/orders', { replace: true });
  }

  const statusLabels = {
    draft: 'Draft', awaiting_payment: 'Așteaptă plata', paid_pending_designer: 'Așteaptă designer', designer_working: 'Designer',
    pending_client_approval: 'La client', revision_requested: 'Revizie', approved_print: 'Gata tipar',
    in_print: 'La tipar', shipped: 'Expediat', delivered: 'Livrat',
  };

  return (
    <div className="flex min-h-screen bg-[#F5F5F4]">
      {/* ── DESKTOP SIDEBAR ── */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed top-0 left-0 h-screen z-50 w-[220px] bg-[#1E1E1E] flex-col overflow-y-auto transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'} md:translate-x-0 md:flex`}>

        <div className="px-4 pt-5 pb-6 flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#3D6B5E] text-white flex items-center justify-center text-xs font-bold">F</div>
          <span className="font-serif text-[17px] text-white">fotocarte</span>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map((item, i) => {
            if (item.sep) return <p key={i} className="uppercase text-[10px] tracking-wider text-gray-500 px-3 mt-5 mb-2">{item.sep}</p>;
            const active = isActive(item.path);
            return (
              <button key={item.path} onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[13px] transition
                  ${active ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
                <SvgIcon name={item.icon} className={active ? 'text-white' : 'text-gray-500'} />
                <span className="flex-1">{item.label}</span>
                {(() => {
                  const countMap = { '/admin_panel/orders': counts.comenzi, '/admin_panel/invitations': counts.linkuri, '/admin_panel/de_tiparit': counts.gataTipar, '/admin_panel/de_livrat': counts.deLivrat };
                  const c = countMap[item.path];
                  if (!c) return null;
                  return <span className="min-w-[20px] h-[20px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">{c}</span>;
                })()}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/5" onClick={logout}>
          <div className="w-8 h-8 rounded-full bg-[#3D6B5E] text-white flex items-center justify-center text-sm font-bold">
            {(user?.displayName || 'A')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-white truncate">{user?.displayName || user?.email}</p>
            <p className="text-[10px] text-gray-500">Deconectare</p>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 min-w-0 flex flex-col md:ml-[220px]">
        {/* ── TOPBAR ── */}
        <header className="h-12 md:h-12 bg-white border-b border-gray-200 flex items-center px-4 md:px-5 sticky top-0 z-30">
          {/* Desktop hamburger */}
          <button onClick={() => setSidebarOpen(true)} className="mr-3 hidden md:hidden text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          <h1 className="text-[15px] font-semibold text-gray-800 truncate">{title}</h1>
          <div className="flex-1" />

          {/* Search — desktop only */}
          <div className="relative hidden md:block mr-3" ref={searchRef}>
            <input type="text" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Caută comandă, client..."
              className="rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 w-48 lg:w-56 transition-all focus:w-64" />
            {searchResults.length > 0 && (
              <div className="absolute left-0 top-full mt-1 w-[320px] bg-white rounded-xl shadow-xl border overflow-hidden z-50">
                {searchResults.map(o => (
                  <div key={o.id} onClick={() => { navigate(`/admin_panel/orders/${o.id}`); setGlobalSearch(''); setSearchResults([]); }}
                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-800">{o.id?.slice(0, 8)}</span>
                        <span className="text-sm text-gray-700">{o.clientName || '—'}</span>
                      </div>
                      <div className="text-[11px] text-gray-400">{o.clientPhone || ''}</div>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{statusLabels[o.status] || o.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bell */}
          <div className="relative" ref={bellRef}>
            <button onClick={() => setBellOpen(!bellOpen)} className="relative p-2 text-gray-400 hover:text-gray-600 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full">{unreadCount}</span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 top-full mt-1 w-[calc(100vw-32px)] sm:w-[360px] max-h-[420px] bg-white rounded-xl shadow-xl border overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-2.5 border-b">
                  <span className="text-sm font-semibold">Notificări</span>
                  {unreadCount > 0 && <button onClick={() => markAllRead()} className="text-xs text-[#3D6B5E] font-medium">Citite</button>}
                </div>
                <div className="overflow-y-auto max-h-[370px]">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-sm">Nicio notificare</div>
                  ) : notifications.slice(0, 15).map(n => (
                    <div key={n.id} onClick={() => { if (!n.read) dismissNotification(n.id); if (n.orderId) { navigate(`/admin_panel/orders/${n.orderId}`); setBellOpen(false); } }}
                      className={`px-4 py-2.5 border-b border-gray-50 cursor-pointer hover:bg-gray-50 active:bg-gray-100 ${!n.read ? 'bg-blue-50/40' : ''}`}>
                      <p className={`text-sm ${!n.read ? 'font-medium text-gray-900' : 'text-gray-500'} line-clamp-2`}>{n.message || n.type}</p>
                      <span className="text-[10px] text-gray-400">{n.clientName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="flex-1 p-3 md:p-5 pb-20 md:pb-5">
          <Outlet />
        </main>
      </div>

      {/* ═══ MOBILE BOTTOM TAB BAR ═══ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {MOBILE_TABS.map((tab) => {
            if (tab.id === 'more') {
              return (
                <button key="more" onClick={() => setMoreOpen(!moreOpen)}
                  className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${moreOpen ? 'text-[#3D6B5E]' : 'text-gray-400'}`}>
                  <SvgIcon name="more" className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5 font-medium">Mai mult</span>
                </button>
              );
            }
            const active = isActive(tab.path);
            const countMap = { '/admin_panel/orders': counts.comenzi, '/admin_panel/de_tiparit': counts.gataTipar };
            const c = countMap[tab.path];
            return (
              <button key={tab.path} onClick={() => { navigate(tab.path); setMoreOpen(false); }}
                className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${active ? 'text-[#3D6B5E]' : 'text-gray-400'}`}>
                <div className="relative">
                  <SvgIcon name={tab.icon} className="w-5 h-5" />
                  {c > 0 && <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center text-[8px] font-bold bg-red-500 text-white rounded-full px-0.5">{c}</span>}
                </div>
                <span className={`text-[10px] mt-0.5 ${active ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ═══ MOBILE "MAI MULT" SHEET ═══ */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto animate-[slideUp_0.2s_ease] safe-area-bottom"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-[#DDD]" /></div>
            <div className="px-4 pb-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2 mt-2">Navigare</p>
              <div className="grid grid-cols-3 gap-2">
                {NAV.filter(n => n.path && !MOBILE_TABS.some(t => t.path === n.path)).map((item) => {
                  const active = isActive(item.path);
                  return (
                    <button key={item.path} onClick={() => { navigate(item.path); setMoreOpen(false); }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${active ? 'bg-[#EAF0EC] text-[#3D6B5E]' : 'bg-gray-50 text-gray-500 active:bg-gray-100'}`}>
                      <SvgIcon name={item.icon} className="w-5 h-5" />
                      <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Logout */}
              <button onClick={logout}
                className="w-full mt-4 flex items-center justify-center gap-2 h-12 rounded-xl bg-red-50 text-red-500 text-[14px] font-medium active:bg-red-100 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Deconectare
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
