import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'motion/react';
import useAuthStore from '../../stores/useAuthStore';
import useUIStore from '../../stores/useUIStore';
import useCmsStore from '../cms/useCmsStore';
// Offers loaded async from Firestore

const ALL_OCCASION_LINKS = [
  { label: 'Album foto de nuntă', to: '/colectie/nunti', emoji: '💒', id: 'nunti' },
  { label: 'Album foto de familie', to: '/colectie/familie', emoji: '👨‍👩‍👧‍👦', id: 'familie' },
  { label: 'Album pentru copii', to: '/colectie/copii', emoji: '👶', id: 'copii' },
  { label: 'Album foto de cumetrie', to: '/colectie/cumetrie', emoji: '👼', id: 'cumetrie' },
  { label: 'Album foto de botez', to: '/colectie/botez', emoji: '✝️', id: 'botez' },
  { label: 'Album foto de călătorie', to: '/colectie/calatorie', emoji: '✈️', id: 'calatorie' },
  { label: 'Album foto de vacanță', to: '/colectie/vacanta', emoji: '🌴', id: 'vacanta' },
  { label: 'Album foto de zi de naștere', to: '/colectie/zi-de-nastere', emoji: '🎂', id: 'zi-de-nastere' },
  { label: 'Album foto de clasă', to: '/colectie/clasa', emoji: '🎓', id: 'clasa' },
  { label: 'Album foto anual', to: '/colectie/anual', emoji: '📅', id: 'anual' },
  { label: 'Ziua Mamei', to: '/colectie/ziua-mamei', emoji: '💐', id: 'ziua-mamei' },
  { label: 'Ziua Tatălui', to: '/colectie/ziua-tatalui', emoji: '👔', id: 'ziua-tatalui' },
  { label: 'Ziua Îndrăgostiților', to: '/colectie/valentines', emoji: '💙', id: 'valentines' },
];

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomepage = location.pathname === '/';
  const { clientName, isAuthenticated, clientEmail, user, authMethod, isAdmin } = useAuthStore();
  const initial = clientName ? clientName.charAt(0).toUpperCase() : '?';
  const hasIdentity = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
  const [offersCount, setOffersCount] = useState(0);
  const cmsEditMode = useCmsStore((s) => s.editMode);
  // When admin toolbar is visible, push header down
  const adminToolbarH = isAdmin ? (cmsEditMode ? 49 : 46) : 0;

  // Active collections — Firestore is source of truth, show NOTHING until loaded
  const [occasionLinks, setOccasionLinks] = useState([]);
  useEffect(() => {
    import('../../utils/offers').then(m => m.getActiveOffersAsync()).then(o => setOffersCount(o.length));
  }, []);
  useEffect(() => {
    import('../admin/AdminCollections').then(({ getActiveCollections, getCollectionItems }) => {
      Promise.all([getActiveCollections(), getCollectionItems()]).then(([active, items]) => {
        let links = ALL_OCCASION_LINKS;
        if (items && items.length > 0) {
          links = items.map(it => ({
            label: it.label, to: '/colectie/' + it.slug, emoji: it.emoji, id: it.id,
          }));
        }
        // Filter by active status — if none active, show empty (not hardcoded fallback)
        if (active) links = links.filter(l => active[l.id]);
        setOccasionLinks(links);
      });
    }).catch(() => {});
  }, []);

  // Desktop dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState(false);

  // User popover
  const [userPopover, setUserPopover] = useState(false);
  const userPopoverRef = useRef(null);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
    setMobileAccordion(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const scrollToSection = useCallback((sectionId) => {
    setMobileOpen(false);
    if (isHomepage) {
      const el = document.getElementById(sectionId);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    }
    navigate('/#' + sectionId);
  }, [isHomepage, navigate]);

  // Desktop dropdown + popover handlers
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (userPopoverRef.current && !userPopoverRef.current.contains(e.target)) setUserPopover(false);
    };
    const handleEsc = (e) => { if (e.key === 'Escape') setUserPopover(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleEsc); };
  }, []);

  const handleMouseEnter = () => { clearTimeout(timeoutRef.current); setDropdownOpen(true); };
  const handleMouseLeave = () => { timeoutRef.current = setTimeout(() => setDropdownOpen(false), 200); };

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <>
      <header className="h-14 flex items-center px-4 fixed left-0 right-0 z-50" style={{
        top: adminToolbarH,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'linear-gradient(135deg, #3D6B5E 0%, #2F5548 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        {/* Skip link — accessibility */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-ac focus:text-white focus:px-4 focus:py-2 focus:rounded">
          Sari la conținut
        </a>
        {/* Scroll progress bar */}
        {isHomepage && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-ac origin-left"
            style={{ scaleX }}
          />
        )}
        {/* ── MOBILE: Hamburger ── */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="sm:hidden w-11 h-11 flex items-center justify-center -ml-1.5"
          aria-label="Menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        {/* ── Logo ── */}
        <Link to="/" className="font-serif text-xl font-bold hover:opacity-80 transition-opacity text-white">
          fotocarte<span className="text-white/60">.</span>
        </Link>

        {/* ── DESKTOP: Nav links ── */}
        <nav className="hidden sm:flex items-center gap-1 ml-6">
          {/* Fotocărți dropdown */}
          <div ref={dropdownRef} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <Link to="/colectie/toate" className={`px-3 py-1.5 text-[13px] font-medium hover:text-white hover:bg-white/15 rounded-lg transition-colors flex items-center gap-1 ${dropdownOpen ? 'text-white bg-white/15' : 'text-white'}`}
              aria-haspopup="true" aria-expanded={dropdownOpen}>
              Fotocărți
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                <path d="M2 4L5 6.5L8 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </Link>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-2 py-2 min-w-[280px] z-[60] animate-[fadeIn_0.15s_ease]"
                role="menu"
                style={{
                  background: 'rgba(255, 255, 255, 0.88)',
                  backdropFilter: 'blur(80px) saturate(220%)',
                  WebkitBackdropFilter: 'blur(80px) saturate(220%)',
                  border: '0.5px solid rgba(255, 255, 255, 0.75)',
                  borderRadius: '20px',
                  boxShadow: '0 32px 100px rgba(0, 0, 0, 0.20), 0 12px 40px rgba(0, 0, 0, 0.12), 0 0 0 0.5px rgba(0,0,0,0.04)',
                }}>
                <p className="px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#857D74] font-semibold">După ocazie</p>
                <ul className="list-none m-0 p-0">
                  {occasionLinks.map((item, i) => (
                    <li key={i} role="menuitem">
                      <Link to={item.to} onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 mx-1 rounded-xl text-sm text-[#5C544B] hover:bg-white/40 hover:text-[#1c1c1c] transition-colors">
                        <span className="text-base w-5 text-center" aria-hidden="true">{item.emoji}</span>{item.label}
                      </Link>
                    </li>
                  ))}
                  <li className="border-t border-black/5 mt-1 pt-1 mx-1" role="menuitem">
                    <Link to="/colectie/toate" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-ac font-medium hover:bg-ac/10 transition-colors">
                      <span className="text-base w-5 text-center" aria-hidden="true">→</span>Vezi toate designurile
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <Link to="/albume-de-calatorie" className="px-3 py-1.5 text-[13px] text-white font-medium hover:text-white hover:bg-white/15 rounded-lg transition-colors">
            Albume de călătorie
          </Link>
          <Link to="/preturi" className="px-3 py-1.5 text-[13px] text-white font-medium hover:text-white hover:bg-white/15 rounded-lg transition-colors">
            Cât costă?
          </Link>
          <button onClick={() => scrollToSection('cum-functioneaza')} className="px-3 py-1.5 text-[13px] text-white font-medium hover:text-white hover:bg-white/15 rounded-lg transition-colors">
            Cum funcționează
          </button>
          {offersCount > 0 && (
            <button onClick={() => scrollToSection('oferte')} className="px-3 py-1.5 text-[13px] font-semibold text-[#FFD5D5] hover:bg-white/15 rounded-lg transition-colors flex items-center gap-1.5">
              Oferte
              <span className="w-4 h-4 rounded-full bg-white text-[#C0392B] text-[9px] font-bold flex items-center justify-center">{offersCount}</span>
            </button>
          )}
        </nav>

        {/* ── Right side ── */}
        <div className="ml-auto flex items-center gap-2">
          {/* Auth buttons — mobile + desktop */}
          {!hasIdentity ? (
            <div className="flex items-center gap-2">
              <button onClick={() => useUIStore.getState().openModal('auth', { mode: 'login', onSuccess: () => navigate('/app/cabinet') })}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-white/90 active:scale-95 hover:text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Intră
              </button>
              <button onClick={() => useUIStore.getState().openModal('auth', { mode: 'register', onSuccess: () => navigate('/app/cabinet') })}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-[#3D6B5E] bg-white rounded-full active:scale-95 hover:bg-white/90 transition-colors shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                Creează cont
              </button>
            </div>
          ) : (
            <Link to="/app/cabinet" className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-white bg-white/15 rounded-full no-underline active:scale-95 hover:bg-white/25 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Contul meu
            </Link>
          )}

          {/* Cart icon */}
          <Link to={hasIdentity ? '/app/cabinet' : '/app/login?returnTo=/app/cabinet'} className="hidden sm:flex relative w-9 h-9 items-center justify-center rounded-full hover:bg-white/15 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </Link>

          {/* User Account Popover */}
          <div className="hidden sm:block relative" ref={userPopoverRef}>
            <button
              onClick={() => setUserPopover(!userPopover)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-white/20 transition-all"
              aria-haspopup="menu"
            >
              <div className="w-8 h-8 rounded-full bg-white text-[#3D6B5E] flex items-center justify-center text-xs font-bold">
                {isAuthenticated ? initial : '?'}
              </div>
            </button>

            {userPopover && (
              <div className="absolute top-full right-0 mt-2 w-[260px] p-3 z-[60] animate-[fadeIn_0.15s_ease]"
              style={{
                transformOrigin: 'top right',
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(100px) saturate(250%)',
                WebkitBackdropFilter: 'blur(100px) saturate(250%)',
                border: '0.5px solid rgba(255, 255, 255, 0.80)',
                borderRadius: '20px',
                boxShadow: '0 48px 120px rgba(0, 0, 0, 0.25), 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0,0,0,0.05)',
              }}>
                {/* Profile header */}
                <div className="flex items-center gap-3 pb-3 mb-2 border-b border-black/5">
                  <div className="w-10 h-10 rounded-full bg-ac text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {isAuthenticated ? initial : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1c1c1c] truncate">{clientName || 'Vizitator'}</p>
                    <span className="inline-block mt-0.5 text-[10px] font-medium text-ac bg-ac/10 px-2 py-0.5 rounded-full">Client</span>
                  </div>
                </div>

                {/* Menu items */}
                <nav className="space-y-0.5 mb-2">
                  <Link to={hasIdentity ? '/app/cabinet' : '/app/login?returnTo=/app/cabinet'} onClick={() => setUserPopover(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#5C544B] hover:bg-black/[0.03] hover:text-[#1c1c1c] transition-colors no-underline">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    Proiectele mele
                  </Link>
                  <Link to={hasIdentity ? '/app/cabinet' : '/app/login?returnTo=/app/cabinet'} onClick={() => setUserPopover(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#5C544B] hover:bg-black/[0.03] hover:text-[#1c1c1c] transition-colors no-underline">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                    Comenzile mele
                  </Link>
                  <Link to="/" onClick={() => setUserPopover(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#5C544B] hover:bg-black/[0.03] hover:text-[#1c1c1c] transition-colors no-underline">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    Acasă
                  </Link>
                  <a href="https://wa.me/37360595984" target="_blank" rel="noopener noreferrer" onClick={() => setUserPopover(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#5C544B] hover:bg-black/[0.03] hover:text-[#25D366] transition-colors no-underline">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.624-1.467A11.932 11.932 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.168 0-4.19-.591-5.927-1.621l-.425-.252-2.742.87.888-2.665-.277-.44A9.77 9.77 0 012.182 12c0-5.415 4.403-9.818 9.818-9.818S21.818 6.585 21.818 12 17.415 21.818 12 21.818z"/></svg>
                    WhatsApp
                  </a>
                  <a href="https://instagram.com/fotocarte.md" target="_blank" rel="noopener noreferrer" onClick={() => setUserPopover(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#5C544B] hover:bg-black/[0.03] hover:text-[#E4405F] transition-colors no-underline">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    Instagram
                  </a>
                </nav>

                {/* Sign out */}
                <div className="border-t border-black/5 pt-2">
                  <button onClick={async () => { setUserPopover(false); useUIStore.getState().closeModal(); await useAuthStore.getState().logout(); navigate('/'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#B0A89E] hover:text-[#B54A3A] hover:bg-red-50 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Deconectare
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Spacer for fixed header + admin toolbar */}
      <div style={{ height: 56 + adminToolbarH }} />

      {/* ══ MOBILE FULLSCREEN MENU ══ */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[39] overflow-y-auto sm:hidden animate-[fadeIn_0.2s_ease]"
          style={{
            paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          }}>
          <div className="px-4 py-4 sm:px-5 sm:py-6">

            {/* CTA — primul lucru vizibil */}
            <Link
              to="/colectie/toate"
              className="block w-full glass-btn-dark text-center mb-6 no-underline py-4"
            >
              Începe albumul →
            </Link>

            {/* Fotocărți — accordion */}
            <div className="border-b border-[#E8E4DB] pb-4 mb-4">
              <button
                onClick={() => setMobileAccordion(!mobileAccordion)}
                className="flex items-center justify-between w-full py-3 text-[16px] font-medium text-[#1c1c1c]"
                aria-expanded={mobileAccordion}
              >
                <span>Fotocărți</span>
                <svg width="14" height="14" viewBox="0 0 10 10" fill="none" className={`transition-transform ${mobileAccordion ? 'rotate-180' : ''}`}>
                  <path d="M2 4L5 6.5L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              {mobileAccordion && (
                <div className="pl-2 pt-1 space-y-0.5">
                  {occasionLinks.map((item, i) => (
                    <Link key={i} to={item.to}
                      className="flex items-center gap-3 py-3 text-[15px] text-[#5C544B] active:text-[#1c1c1c] no-underline">
                      <span className="text-lg w-6 text-center">{item.emoji}</span>{item.label}
                    </Link>
                  ))}
                  <Link to="/colectie/toate"
                    className="flex items-center gap-3 py-2.5 text-[15px] text-ac font-medium no-underline">
                    <span className="text-lg w-6 text-center">→</span>Toate designurile
                  </Link>
                </div>
              )}
            </div>

            {/* Alte linkuri */}
            <div className="space-y-0">
              <Link to="/albume-de-calatorie" className="block py-3.5 text-[16px] font-medium text-[#1c1c1c] border-b border-[#E8E4DB] no-underline">
                Albume de călătorie ✈️
              </Link>
              <Link to="/preturi" className="block py-3.5 text-[16px] font-medium text-[#1c1c1c] border-b border-[#E8E4DB] no-underline">
                Cât costă?
              </Link>
              <button onClick={() => scrollToSection('cum-functioneaza')} className="block w-full py-3.5 text-left text-[16px] font-medium text-[#1c1c1c] border-b border-[#E8E4DB]">
                Cum funcționează
              </button>
              {offersCount > 0 && (
                <button onClick={() => scrollToSection('oferte')} className="flex items-center gap-2 w-full py-3.5 text-left text-[16px] font-medium text-[#C0392B] border-b border-[#E8E4DB]">
                  Oferte 🌸
                  <span className="w-5 h-5 rounded-full bg-[#C0392B] text-white text-[10px] font-bold flex items-center justify-center">{offersCount}</span>
                </button>
              )}
              {hasIdentity ? (
                <Link to="/app/cabinet" className="block py-3.5 text-[16px] font-medium text-[#1c1c1c] border-b border-[#E8E4DB] no-underline">
                  Cabinetul meu
                </Link>
              ) : (
                <>
                  <button onClick={() => { setMobileOpen(false); useUIStore.getState().openModal('auth', { mode: 'login', onSuccess: () => navigate('/app/cabinet') }); }}
                    className="block w-full py-3.5 text-left text-[16px] font-medium text-[#1c1c1c] border-b border-[#E8E4DB]">
                    Intră în cont
                  </button>
                  <button onClick={() => { setMobileOpen(false); useUIStore.getState().openModal('auth', { mode: 'register', onSuccess: () => navigate('/app/cabinet') }); }}
                    className="block w-full py-3.5 text-left text-[16px] font-semibold text-[#3D6B5E] border-b border-[#E8E4DB]">
                    Creează cont
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
