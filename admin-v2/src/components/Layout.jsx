import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { section: 'GENERAL', items: [
    { to: '/', icon: '📊', label: 'Dashboard' },
    { to: '/pipeline', icon: '🔄', label: 'Pipeline' },
    { to: '/live', icon: '📈', label: 'Live & Analitică', badge: 3 },
  ]},
  { section: 'COMENZI & DESIGN', items: [
    { to: '/orders', icon: '📋', label: 'Toate comenzile' },
    { to: '/layouts', icon: '🎨', label: 'Makete' },
    { to: '/approval', icon: '✅', label: 'Așteaptă aprobare' },
    { to: '/print', icon: '🖨', label: 'Gata de tipar' },
  ]},
  { section: 'CLIENȚI', items: [
    { to: '/clients', icon: '👥', label: 'Cabinet clienți' },
  ]},
  { section: 'FINANCIAR', items: [
    { to: '/finance', icon: '💰', label: 'Venituri' },
  ]},
  { section: 'PRODUSE', items: [
    { to: '/covers', icon: '📕', label: 'Coverte' },
    { to: '/dimensions', icon: '📐', label: 'Dimensiuni' },
    { to: '/offers', icon: '🎁', label: 'Oferte' },
  ]},
  { section: 'CONFIGURARE', items: [
    { to: '/team', icon: '👤', label: 'Echipă' },
  ]},
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-[#F5F5F5]">
      {/* Sidebar — dark brown like current admin */}
      <aside className="w-[210px] bg-[#2C2520] text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#3D6B5E] flex items-center justify-center text-xs font-bold">M</div>
          <span className="text-sm font-bold tracking-tight">momentive.</span>
          <span className="ml-1 text-[9px] font-bold bg-[#3D6B5E] text-white px-1.5 py-0.5 rounded">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-1">
          {NAV.map((group) => (
            <div key={group.section} className="mb-2">
              <div className="px-4 py-1.5 text-[9px] font-bold text-white/25 uppercase tracking-wider">
                {group.section}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-[7px] text-[12px] transition-colors ${
                      isActive ? 'bg-white/10 text-white font-semibold' : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <span className="text-[11px] w-4 text-center">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#5a4a3a] flex items-center justify-center text-[10px] font-bold">FC</div>
            <div>
              <div className="text-[11px] font-semibold">Foto Carte md</div>
              <div className="text-[9px] text-white/30">Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="h-[48px] bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <input type="text" placeholder="Caută..." className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs w-[180px] focus:outline-none focus:ring-1 focus:ring-[#3D6B5E]/30" />
            <button className="relative">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </button>
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
