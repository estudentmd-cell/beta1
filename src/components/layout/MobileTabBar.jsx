import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useAuthStore from '../../stores/useAuthStore';
import { Home, LayoutGrid, HelpCircle, Tag } from 'lucide-react';
// Offers loaded async from Firestore

const TABS = [
  {
    id: 'home',
    label: 'Acasă',
    to: '/',
    match: (p) => p === '/' || p === '/pagini' || p.startsWith('/albume'),
  },
  {
    id: 'colectie',
    label: 'Colecție',
    to: '/colectie/toate',
    match: (p) => p.startsWith('/colectie'),
  },
  {
    id: 'cumcomand',
    label: 'Cum comand',
    to: '/#cum-functioneaza',
    match: (p) => false,
  },
  {
    id: 'preturi',
    label: 'Prețuri',
    to: '/preturi',
    match: (p) => p === '/preturi',
  },
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
    case 'colectie':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" fill={active ? stroke : 'none'} />
          <rect x="14" y="3" width="7" height="7" rx="1" fill={active ? stroke : 'none'} />
          <rect x="3" y="14" width="7" height="7" rx="1" fill={active ? stroke : 'none'} />
          <rect x="14" y="14" width="7" height="7" rx="1" fill={active ? stroke : 'none'} />
        </svg>
      );
    case 'incepe':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" fill={active ? stroke : 'none'} />
          <path d="M12 8v8M8 12h8" stroke={active ? '#fff' : stroke} strokeWidth="2" />
        </svg>
      );
    case 'cont':
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
  const [offersCount, setOffersCount] = useState(0);

  useEffect(() => {
    import('../../utils/offers').then(m => m.getActiveOffersAsync()).then(o => setOffersCount(o.length)).catch(() => {});
  }, []);

  const hide =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/app/editor') ||
    location.pathname.startsWith('/app/product') ||
    location.pathname.startsWith('/app/cabinet');

  if (hide || isAdmin) return null;

  const LUCIDE_ICONS = { home: Home, colectie: LayoutGrid, cumcomand: HelpCircle, preturi: Tag };

  return (
    <nav role="navigation" aria-label="Navigare principală" className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-white/85 backdrop-blur-xl border-t border-black/[0.06]">
        <div className="mobile-nav-menu" style={{ '--nav-accent': '#1c1c1c' }}>
          {TABS.map((tab) => {
            const active = tab.match(location.pathname);
            const hasOfferBadge = false;
            const Icon = LUCIDE_ICONS[tab.id];
            return (
              <Link
                key={tab.id}
                to={tab.to}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
                className={`mobile-nav-menu__item ${active ? 'active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="mobile-nav-menu__icon relative">
                  <Icon className="mobile-nav-menu__svg" />
                  {hasOfferBadge && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] rounded-full bg-[#FF3B30] text-white text-[9px] font-bold flex items-center justify-center px-1">
                      {offersCount}
                    </span>
                  )}
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
