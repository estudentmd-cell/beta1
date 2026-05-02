import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePageMeta } from '../utils/seo';
import { getActiveOffersAsync } from '../utils/offers';
import useProjectStore from '../stores/useProjectStore';
import useEditorStore from '../stores/useEditorStore';
import useAuthStore from '../stores/useAuthStore';
import useUIStore from '../stores/useUIStore';
import { createSpread } from '../utils/layoutEngine';
import { trackViewContent } from '../utils/metaPixel';

const outfit = { fontFamily: 'Outfit, sans-serif' };

function daysLeft(deadline) {
  if (!deadline) return 999;
  return Math.max(0, Math.ceil((new Date(deadline) - Date.now()) / 86400000));
}

/* ── Gallery with swipe (mobile) + thumbnails (desktop) ── */
function OfferGallery({ images }) {
  const [idx, setIdx] = useState(0);
  const touchStart = useRef(null);
  const len = images.length;

  const prev = useCallback(() => setIdx(i => (i - 1 + len) % len), [len]);
  const next = useCallback(() => setIdx(i => (i + 1) % len), [len]);

  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { diff > 0 ? next() : prev(); }
    touchStart.current = null;
  };

  if (len === 0) {
    return (
      <div className="w-full aspect-[4/3] bg-[#F5F1EB] rounded-2xl flex items-center justify-center text-[#D0CAC0]">
        <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
      </div>
    );
  }

  return (
    <div>
      {/* Main image */}
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#F5F1EB] shadow-lg"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {images.map((src, i) => (
          <img key={i} src={src} alt="" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
        ))}

        {/* Desktop arrows */}
        {len > 1 && (
          <>
            <button onClick={prev} className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur items-center justify-center shadow-md hover:bg-white transition-colors">
              <svg className="w-5 h-5 text-[#1c1c1c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={next} className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur items-center justify-center shadow-md hover:bg-white transition-colors">
              <svg className="w-5 h-5 text-[#1c1c1c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </>
        )}

        {/* Mobile dots */}
        {len > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
            {images.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`block h-[5px] rounded-full transition-all ${i === idx ? 'w-5 bg-white' : 'w-2 bg-white/50'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop thumbnails */}
      {len > 1 && (
        <div className="hidden md:flex gap-2.5 mt-3">
          {images.map((src, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`relative w-[72px] h-[54px] rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-[#3D6B5E] shadow-md' : 'border-transparent opacity-60 hover:opacity-90'}`}>
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Trust Badge (inline, compact) ── */
function TrustBadge({ icon, label }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-[#5C544B]" style={outfit}>
      <div className="w-5 h-5 text-[#3D6B5E] shrink-0 flex items-center justify-center">
        {icon}
      </div>
      <span>{label}</span>
    </div>
  );
}

/* ── Interactive Photo Calculator ── */
function PhotoCalculator({ pages, onStart }) {
  const [count, setCount] = useState(100);
  const perPage = useMemo(() => Math.max(1, Math.round(count / pages)), [count, pages]);
  const spreads = pages / 2;

  const getMessage = (n) => {
    if (n <= 1) return { text: 'Fiecare poza pe o pagina separata — stil elegant, minimalist', icon: '✨', quality: 'Premium' };
    if (n <= 2) return { text: 'Balanta perfecta — poze mari cu colaje subtile', icon: '👌', quality: 'Ideal' };
    if (n <= 4) return { text: 'Album bogat — colaje variate cu poze mari si mici', icon: '📖', quality: 'Foarte bun' };
    if (n <= 7) return { text: 'Toate momentele importante — colaje pline de amintiri', icon: '🎉', quality: 'Bun' };
    return { text: 'Album foarte dens — recomandam sa adaugi pagini extra', icon: '📚', quality: 'Dens' };
  };

  const msg = getMessage(perPage);
  const pct = Math.min(100, (count / 500) * 100);

  return (
    <div className="bg-white rounded-2xl p-5 md:p-8 border border-[#E8E4DB]">
      <h3 className="text-[17px] md:text-[20px] font-bold text-[#1c1c1c] mb-0.5" style={outfit}>
        Am suficiente poze?
      </h3>
      <p className="text-[13px] md:text-[14px] text-[#8A8078] mb-4 md:mb-5" style={outfit}>
        Oricite poze ai — albumul se adapteaza automat.
      </p>

      {/* Slider */}
      <div className="mb-4 md:mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] text-[#8A8078]" style={outfit}>Cite poze ai?</span>
          <span className="text-[20px] md:text-[22px] font-extrabold text-[#1c1c1c] tabular-nums" style={outfit}>{count}</span>
        </div>
        <input
          type="range" min="20" max="500" step="10" value={count}
          onChange={e => setCount(+e.target.value)}
          className="w-full h-2 rounded-full appearance-none cursor-pointer touch-none"
          style={{
            background: `linear-gradient(to right, #3D6B5E ${pct}%, #E8E4DB ${pct}%)`,
          }}
        />
        <div className="flex justify-between text-[10px] md:text-[11px] text-[#B0A89E] mt-1" style={outfit}>
          <span>20</span><span>100</span><span>200</span><span>300</span><span>500</span>
        </div>
      </div>

      {/* Result card */}
      <div className="bg-[#FAF8F5] rounded-xl p-3.5 md:p-4 border border-[#E8E4DB]/60">
        <div className="flex items-start gap-2.5 md:gap-3">
          <span className="text-[22px] md:text-[24px] leading-none mt-0.5">{msg.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-0.5">
              <span className="text-[14px] md:text-[15px] font-bold text-[#1c1c1c]" style={outfit}>
                ~{perPage} {perPage === 1 ? 'poza' : 'poze'} per pagina
              </span>
              <span className="text-[10px] md:text-[11px] font-bold text-[#3D6B5E] bg-[#3D6B5E]/10 px-2 py-0.5 rounded-full" style={outfit}>
                {msg.quality}
              </span>
            </div>
            <p className="text-[12px] md:text-[13px] text-[#8A8078] leading-relaxed" style={outfit}>{msg.text}</p>
          </div>
        </div>

        {/* Visual spread preview */}
        <div className="flex items-center gap-2.5 md:gap-3 mt-3 md:mt-4 pt-3 border-t border-[#E8E4DB]/60">
          <div className="flex gap-0.5 shrink-0">
            {Array.from({ length: Math.min(perPage, 6) }, (_, i) => (
              <div key={i} className="w-3.5 h-[18px] md:w-4 md:h-5 rounded-[2px] bg-[#3D6B5E]/20 border border-[#3D6B5E]/30" />
            ))}
            {perPage > 6 && <span className="text-[10px] md:text-[11px] text-[#8A8078] ml-1" style={outfit}>+{perPage - 6}</span>}
          </div>
          <span className="text-[11px] md:text-[12px] text-[#8A8078]" style={outfit}>
            = 1 pagina ({pages} total)
          </span>
        </div>
      </div>

      {/* Extra pages suggestion */}
      {perPage > 6 && (
        <div className="mt-2.5 md:mt-3 flex items-center gap-2 text-[12px] md:text-[13px] text-[#3D6B5E] font-medium" style={outfit}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <span>Poti adauga pagini extra pentru un album mai aerisit</span>
        </div>
      )}

      {/* Mini CTA */}
      <button onClick={onStart}
        className="w-full mt-3.5 md:mt-4 h-[46px] md:h-[48px] bg-[#1c1c1c] text-white text-[13px] md:text-[14px] font-bold rounded-xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98]"
        style={outfit}>
        INCEPE CU {count} POZE →
      </button>
    </div>
  );
}

/* ── Urgency bar with animated pulse ── */
function UrgencyBar({ days }) {
  if (days > 60) return null;
  const pct = Math.max(5, Math.min(100, (days / 30) * 100));
  const label = days === 0
    ? 'Oferta valabila doar azi!'
    : days === 1
      ? 'Oferta valabila inca 1 zi'
      : `Oferta valabila inca ${days} zile`;

  return (
    <div className="bg-[#FFF8F6] border border-[#B54A3A]/15 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-[#B54A3A] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <span className="text-[13px] text-[#B54A3A] font-semibold" style={outfit}>{label}</span>
      </div>
      <div className="h-1.5 bg-[#B54A3A]/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#B54A3A] rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, animation: 'urgencyPulse 2s ease-in-out infinite' }}
        />
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function OfferDetailPage() {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: offer ? `${offer.name} — oferta speciala` : 'Oferta speciala',
    description: offer ? `${offer.name}: ${offer.pages} pagini, format ${offer.format} cm. Pret redus de la ${offer.oldPrice} la ${offer.newPrice} lei.` : 'Oferta speciala albume foto',
    path: `/oferte/${offerId}`,
  });

  useEffect(() => {
    getActiveOffersAsync().then(items => {
      const found = (items || []).find(o => o.id === offerId);
      setOffer(found || null);
      setLoading(false);
      if (found) {
        trackViewContent({ contentName: found.name, contentType: 'offer', contentIds: found.id });
      }
    }).catch(() => setLoading(false));
  }, [offerId]);

  const handleStart = useCallback(() => {
    if (!offer) return;

    const proceed = () => {
      // Reset editor
      useEditorStore.setState({
        photos: [],
        spreads: [createSpread([])],
        currentSpread: 0,
        undoStack: [],
        redoStack: [],
        selectedFrame: null,
        swapSource: null,
      });

      // Set productConfig with offer data + _offerReady flag
      const slug = offer.product === 'pagini-subtiri' ? 'pagini-subtiri' : 'pagini-groase';
      useProjectStore.getState().setProject(null, null);
      useProjectStore.setState({
        productConfig: {
          name: slug === 'pagini-subtiri' ? 'Pagini Subtiri' : 'Pagini Groase',
          slug,
          format: offer.format,
          initialPages: offer.pages,
          basePrice: offer.newPrice,
          _offerReady: true,
          _offerId: offer.id,
          _offerDeadline: offer.deadline,
          _offerOldPrice: offer.oldPrice,
        },
      });
      useProjectStore.getState().setSpreadCount(offer.pages / 2);

      // Navigate to collection for cover selection
      navigate('/colectie/toate');
    };

    // Check auth
    const { user, authMethod } = useAuthStore.getState();
    const hasAuth = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));

    if (!hasAuth) {
      useUIStore.getState().openModal('auth', { mode: 'register' });
      const unsub = useAuthStore.subscribe((state) => {
        if (state.user?.uid && (state.authMethod === 'email_code' || state.authMethod === 'google')) {
          unsub();
          proceed();
        }
      });
    } else {
      proceed();
    }
  }, [offer, navigate]);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#3D6B5E]/20 border-t-[#3D6B5E] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-[#B0A89E]" style={outfit}>Se incarca...</p>
        </div>
      </div>
    );
  }

  /* ── Not found state ── */
  if (!offer) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-[20px] font-bold text-[#1c1c1c] mb-2" style={outfit}>Oferta nu a fost gasita</p>
          <p className="text-[14px] text-[#8A8078] mb-6" style={outfit}>Aceasta oferta nu mai este disponibila sau nu exista.</p>
          <Link to="/oferte" className="inline-flex items-center justify-center h-[48px] px-8 bg-[#1c1c1c] text-white text-[13px] font-semibold rounded-full no-underline" style={outfit}>
            Vezi toate ofertele
          </Link>
        </div>
      </div>
    );
  }

  const images = offer.images?.length > 0 ? offer.images : (offer.image ? [offer.image] : []);
  const productLabel = offer.product === 'pagini-subtiri' ? 'Pagini Subtiri' : 'Pagini Groase';
  const days = daysLeft(offer.deadline);
  const savings = (offer.oldPrice || 0) - (offer.newPrice || 0);
  const discount = offer.oldPrice > 0 ? Math.round((1 - offer.newPrice / offer.oldPrice) * 100) : 0;
  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-32 md:pb-16">
      {/* Keyframes for urgency pulse */}
      <style>{`
        @keyframes urgencyPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 26px; height: 26px;
          border-radius: 50%;
          background: #3D6B5E;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: #3D6B5E;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          cursor: pointer;
        }
        @media (min-width: 768px) {
          input[type="range"]::-webkit-slider-thumb { width: 22px; height: 22px; }
          input[type="range"]::-moz-range-thumb { width: 22px; height: 22px; }
        }
      `}</style>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-5">
        <nav className="flex items-center gap-2 text-[12px] text-[#999]" style={outfit}>
          <Link to="/" className="hover:text-[#1c1c1c] transition-colors no-underline text-[#999]">Acasa</Link>
          <span className="text-[#DDD]">/</span>
          <Link to="/oferte" className="hover:text-[#1c1c1c] transition-colors no-underline text-[#999]">Oferte</Link>
          <span className="text-[#DDD]">/</span>
          <span className="text-[#1c1c1c] font-medium">{offer.name}</span>
        </nav>
      </div>

      {/* ════ Content — 2 columns on desktop ════ */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-5 md:pt-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10">

          {/* ── Left — Gallery (sticky on desktop) ── */}
          <div className="md:col-span-7">
            <div className="md:sticky md:top-6">
              <OfferGallery images={images} />
            </div>
          </div>

          {/* ── Right — Details ── */}
          <div className="md:col-span-5 space-y-4">

            {/* 1. Discount badge */}
            {discount > 0 && (
              <span className="inline-flex items-center bg-[#B54A3A] text-white text-[14px] font-extrabold px-4 py-1.5 rounded-full tracking-wide" style={outfit}>
                -{discount}% REDUCERE
              </span>
            )}

            {/* 2. Title */}
            <h1 className="text-[26px] md:text-[32px] font-bold text-[#1c1c1c] leading-[1.15] tracking-tight" style={outfit}>
              {offer.name}
            </h1>

            {/* 3. Subtitle / tagline */}
            {offer.tagline && (
              <p className="text-[15px] md:text-[16px] text-[#8A8078] leading-relaxed -mt-1" style={outfit}>{offer.tagline}</p>
            )}

            {/* 4. Specs strip — horizontal pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 bg-[#F0EDE8] text-[#5C544B] text-[12px] font-semibold px-3 py-1.5 rounded-full" style={outfit}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                {offer.format} cm
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#F0EDE8] text-[#5C544B] text-[12px] font-semibold px-3 py-1.5 rounded-full" style={outfit}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                {offer.pages} pagini
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#F0EDE8] text-[#5C544B] text-[12px] font-semibold px-3 py-1.5 rounded-full" style={outfit}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                Oricite poze
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#F0EDE8] text-[#5C544B] text-[12px] font-semibold px-3 py-1.5 rounded-full" style={outfit}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                {productLabel}
              </span>
            </div>

            {/* 5. PRICE BLOCK — hero of the page */}
            <div className="bg-white rounded-2xl p-5 border border-[#E8E4DB] shadow-sm">
              <div className="flex items-end gap-3 mb-1.5">
                <span className="text-[36px] md:text-[42px] font-extrabold text-[#1c1c1c] leading-none tracking-tight" style={outfit}>
                  {offer.newPrice} <span className="text-[20px] md:text-[22px] font-bold">lei</span>
                </span>
              </div>
              {offer.oldPrice > 0 && (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[16px] text-[#B0A89E] line-through" style={outfit}>{offer.oldPrice} lei</span>
                  {savings > 0 && (
                    <span className="inline-flex items-center bg-[#E8F5E9] text-[#2E7D32] text-[13px] font-bold px-2.5 py-0.5 rounded-full" style={outfit}>
                      Economisesti {savings} lei
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 6. CTA button — visible on all screens */}
            <button onClick={handleStart}
              className="flex items-center justify-center w-full h-[52px] md:h-[56px] bg-[#1c1c1c] text-white text-[14px] md:text-[15px] font-bold rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              style={outfit}>
              INCEPE ALBUMUL
              <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>

            {/* 7. Urgency bar */}
            <UrgencyBar days={days} />

            {/* 8. Trust badges — compact horizontal */}
            <div className="grid grid-cols-1 gap-2.5 pt-1">
              <TrustBadge
                icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>}
                label="Coperta rigida premium"
              />
              <TrustBadge
                icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
                label="Livrare gratuita in toata Moldova"
              />
              <TrustBadge
                icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                label="Design verificat inainte de tiparire"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ════ Below the fold — How it works ════ */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 mt-16 md:mt-20">
        <h2 className="text-[22px] md:text-[28px] font-bold text-[#1c1c1c] text-center mb-10" style={outfit}>
          Cum functioneaza
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              n: '1',
              title: 'Alegi coperta',
              desc: 'Selectezi designul care ti se potriveste din colectia noastra.',
              icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
            },
            {
              n: '2',
              title: 'Incarci pozele',
              desc: 'Direct din telefon sau calculator. Noi le aranjam automat.',
              icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
            },
            {
              n: '3',
              title: 'Primesti acasa',
              desc: 'Tiparit pe hartie premium, livrat gratuit in 18 zile.',
              icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/></svg>,
            },
          ].map(step => (
            <div key={step.n} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#3D6B5E]/10 text-[#3D6B5E] flex items-center justify-center mx-auto mb-4">
                {step.icon}
              </div>
              <div className="text-[11px] font-bold text-[#3D6B5E] uppercase tracking-widest mb-1" style={outfit}>Pasul {step.n}</div>
              <h3 className="text-[17px] font-semibold text-[#1c1c1c] mb-1.5" style={outfit}>{step.title}</h3>
              <p className="text-[14px] text-[#8A8078] leading-relaxed max-w-[260px] mx-auto" style={outfit}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ════ Photo Calculator — interactive ════ */}
      <div className="max-w-3xl mx-auto px-4 md:px-8 mt-16">
        <PhotoCalculator pages={offer.pages} onStart={handleStart} />
      </div>

      {/* ════ Reassurance section ════ */}
      <div className="max-w-3xl mx-auto px-4 md:px-8 mt-16">
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#E8E4DB]">
          <h3 className="text-[18px] md:text-[20px] font-bold text-[#1c1c1c] mb-3" style={outfit}>Pot pune orice poze?</h3>
          <p className="text-[14px] md:text-[15px] text-[#8A8078] leading-relaxed mb-4" style={outfit}>
            Da! Pozele de pe telefon sunt perfecte. Nu ai nevoie de poze profesionale. Sistemul nostru le aranjaza automat intr-un design armonios, iar designerul nostru verifica fiecare pagina inainte de tiparire.
          </p>
          <div className="flex flex-wrap gap-3">
            {['Poze din telefon', 'Poze de la fotograf', 'Screenshots', 'Orice format'].map(tag => (
              <span key={tag} className="text-[12px] text-[#3D6B5E] font-medium bg-[#3D6B5E]/8 px-3 py-1 rounded-full" style={outfit}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ════ Social proof strip ════ */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 mt-12 mb-8">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-center">
          {[
            { val: '2000+', label: 'Albume tiparite' },
            { val: '4.9', label: 'Rating clienti' },
            { val: '100%', label: 'Satisfactie garantata' },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-[24px] md:text-[28px] font-extrabold text-[#1c1c1c]" style={outfit}>{stat.val}</div>
              <div className="text-[12px] text-[#8A8078] mt-0.5" style={outfit}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════ Mobile sticky CTA ════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="bg-white/95 backdrop-blur-xl border-t border-black/[0.06] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[20px] font-extrabold text-[#1c1c1c]" style={outfit}>{offer.newPrice} lei</span>
                {offer.oldPrice > 0 && (
                  <span className="text-[12px] text-[#B0A89E] line-through" style={outfit}>{offer.oldPrice}</span>
                )}
              </div>
              {savings > 0 && (
                <span className="text-[11px] text-[#2E7D32] font-semibold" style={outfit}>-{savings} lei</span>
              )}
            </div>
            <button onClick={handleStart}
              className="shrink-0 h-[44px] px-5 bg-[#1c1c1c] text-white text-[13px] font-bold rounded-xl active:scale-[0.97] transition-all cursor-pointer"
              style={outfit}>
              INCEPE ALBUMUL
              <svg className="w-4 h-4 ml-1.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
