import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';

const TABS = [
  { id: 'home', label: 'Acasa', to: '/', match: (p) => p === '/' },
  { id: 'catalog', label: 'Catalog', to: '/colectie/toate', match: (p) => p.startsWith('/colectie') },
  { id: 'proiecte', label: 'Proiecte', to: '/app/cabinet', match: (p) => p === '/app/cabinet' },
  { id: 'cos', label: 'Cos', to: '/app/checkout', match: (p) => p.startsWith('/app/checkout') },
  { id: 'profil', label: 'Profil', to: '/app/cabinet?tab=account', match: (p) => p === '/app/cabinet' && typeof window !== 'undefined' && window.location.search.includes('tab=account') },
];

function TabIcon({ id, active }) {
  const stroke = active ? '#1c1c1c' : '#8A8078';
  const cls = 'w-6 h-6';

  switch (id) {
    case 'home':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" fill={active ? stroke : 'none'} />
        </svg>
      );
    case 'catalog':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" fill={active ? stroke : 'none'} />
          <rect x="14" y="3" width="7" height="7" rx="1" fill={active ? stroke : 'none'} />
          <rect x="3" y="14" width="7" height="7" rx="1" fill={active ? stroke : 'none'} />
          <rect x="14" y="14" width="7" height="7" rx="1" fill={active ? stroke : 'none'} />
        </svg>
      );
    case 'proiecte':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" fill={active ? stroke : 'none'} />
        </svg>
      );
    case 'cos':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" fill={stroke} />
          <circle cx="20" cy="21" r="1" fill={stroke} />
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
        </svg>
      );
    case 'profil':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" fill={active ? stroke : 'none'} />
        </svg>
      );
    default:
      return null;
  }
}

export default function MobileTabBar() {
  const location = useLocation();
  const { isAdmin } = useAuthStore();

  const hide =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/app/editor') ||
    location.pathname.startsWith('/app/product') ||
    location.pathname.startsWith('/app/checkout');

  if (hide || isAdmin) return null;

  return (
    <nav role="navigation" aria-label="Navigare principala" className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-white/85 backdrop-blur-xl border-t border-black/[0.06]">
        <div className="mobile-nav-menu" style={{ '--nav-accent': '#1c1c1c' }}>
          {TABS.map((tab) => {
            const active = tab.match(location.pathname);
            return (
              <Link
                key={tab.id}
                to={tab.to}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
                className={`mobile-nav-menu__item ${active ? 'active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="mobile-nav-menu__icon">
                  <TabIcon id={tab.id} active={active} />
                </div>
                <strong className={`mobile-nav-menu__text ${active ? 'active' : ''}`}>
                  {tab.label}
                </strong>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
