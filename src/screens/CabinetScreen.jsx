import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import CabinetAccount from '../components/cabinet/CabinetAccount';
import CabinetOffers from '../components/cabinet/CabinetOffers';
import CabinetOrders from '../components/cabinet/CabinetOrders';
import CabinetPending from '../components/cabinet/CabinetPending';
import CabinetAddresses from '../components/cabinet/CabinetAddresses';
import CabinetProfile from '../components/cabinet/CabinetProfile';

const NAV_ITEMS = [
  { id: 'account',   label: 'Acasă',               icon: 'home' },
  { id: 'orders',    label: 'Comenzile mele',       icon: 'package' },
  { id: 'offers',    label: 'Oferte',               icon: 'gift' },
  { id: 'pending',   label: 'De plătit',            icon: 'clock' },
  { sep: true },
  { id: 'addresses', label: 'Adrese',               icon: 'map-pin' },
  { id: 'profile',   label: 'Profil',               icon: 'user' },
];

function NavIcon({ name, className = '' }) {
  const cls = `w-[18px] h-[18px] ${className}`;
  const p = { className: cls, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home': return <svg {...p}><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" /></svg>;
    case 'package': return <svg {...p}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
    case 'clock': return <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
    case 'map-pin': return <svg {...p}><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><circle cx="12" cy="11" r="3" /></svg>;
    case 'user': return <svg {...p}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
    case 'gift': return <svg {...p}><path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>;
    case 'logout': return <svg {...p}><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
    default: return null;
  }
}

const PAGE_MAP = {
  account: CabinetAccount,
  offers: CabinetOffers,
  orders: CabinetOrders,
  pending: CabinetPending,
  addresses: CabinetAddresses,
  profile: CabinetProfile,
};

export default function CabinetScreen() {
  const navigate = useNavigate();
  const { clientName, clientEmail, user, authMethod, logout } = useAuthStore();
  const [activePage, setActivePage] = useState('account');

  const hasIdentity = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));

  useEffect(() => {
    if (!hasIdentity) navigate('/', { replace: true });
  }, [hasIdentity, navigate]);

  if (!hasIdentity) return null;

  const displayName = user?.displayName || clientName || 'Utilizator';
  const displayEmail = user?.email || clientEmail || '';
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    import('../stores/useUIStore').then(m => m.default.getState().closeModal());
    logout();
    navigate('/');
  };
  const handleNavClick = (id) => setActivePage(id);
  const ActiveComponent = PAGE_MAP[activePage] || CabinetAccount;
  const pageTitle = NAV_ITEMS.find(i => i.id === activePage)?.label || 'Contul meu';

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ═══ DESKTOP LAYOUT ═══ */}
      <div className="hidden md:flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-[240px] shrink-0 sticky top-0 h-screen flex flex-col border-r border-[#EBEBEB] bg-white">
          {/* Logo */}
          <button onClick={() => navigate('/')} className="px-5 pt-5 pb-3 font-serif text-[20px] text-[#3D6B5E] tracking-tight hover:opacity-70 transition-opacity text-left">
            fotocarte.
          </button>

          {/* User */}
          <div className="flex items-center gap-3 px-5 py-3 mx-3 mb-2 bg-[#F8F6F3] rounded-xl">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#3D6B5E] text-white flex items-center justify-center text-[13px] font-bold shrink-0">{initial}</div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{displayName}</p>
              <p className="text-[11px] text-[#999] truncate">{displayEmail}</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-1 space-y-0.5">
            {NAV_ITEMS.map((item, i) => {
              if (item.sep) return <div key={i} className="h-px bg-[#F0EDE6] my-2 mx-2" />;
              const isActive = activePage === item.id;
              return (
                <button key={item.id} onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all ${
                    isActive ? 'bg-[#3D6B5E] text-white font-semibold' : 'text-[#555] hover:bg-[#F5F3F0]'
                  }`}>
                  <NavIcon name={item.icon} className={isActive ? 'text-white' : 'text-[#999]'} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-3 pb-4">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[#C0392B] hover:bg-red-50 transition-colors">
              <NavIcon name="logout" className="text-[#C0392B]" />
              Deconectare
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-6 lg:px-10 xl:px-16 py-6 max-w-[1000px]">
          {/* Sub-pages already have their own headers with back buttons */}
          <ActiveComponent onNavigate={setActivePage} onLogout={handleLogout} />
        </main>
      </div>

      {/* ═══ MOBILE LAYOUT ═══ */}
      <div className="md:hidden flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-black/[0.06]">
          <div className="flex items-center justify-between px-4 h-[48px]">
            {activePage !== 'account' ? (
              <button onClick={() => setActivePage('account')} className="flex items-center gap-0.5 text-[15px] text-[#3D6B5E] font-medium active:opacity-50">
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" d="M15 19l-7-7 7-7"/></svg>
              </button>
            ) : (
              <button onClick={() => navigate('/')} className="flex items-center gap-0.5 text-[15px] text-[#3D6B5E] font-medium active:opacity-50">
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" d="M15 19l-7-7 7-7"/></svg>
              </button>
            )}
            <span className="text-[16px] font-semibold text-[#1C1C1E]">{activePage === 'account' ? 'Contul meu' : pageTitle}</span>
            <div className="w-[28px]" />
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 px-4 py-3 pb-[90px]">
          <ActiveComponent onNavigate={setActivePage} onLogout={handleLogout} />
        </main>

        {/* Mobile bottom tabs */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-black/[0.06]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex items-center justify-around h-[56px]">
            {[
              { id: 'account', label: 'Acasă', icon: 'home' },
              { id: 'orders', label: 'Comenzi', icon: 'package' },
              { id: 'offers', label: 'Oferte', icon: 'gift' },
              { id: 'profile', label: 'Profil', icon: 'user' },
            ].map(tab => {
              const isActive = activePage === tab.id;
              return (
                <button key={tab.id} onClick={() => setActivePage(tab.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[48px] transition-colors ${
                    isActive ? 'text-[#3D6B5E]' : 'text-[#999]'
                  }`}>
                  <NavIcon name={tab.icon} className={isActive ? 'text-[#3D6B5E]' : 'text-[#BBB]'} />
                  <span className={`text-[11px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
