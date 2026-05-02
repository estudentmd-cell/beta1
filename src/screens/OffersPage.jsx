import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageMeta } from '../utils/seo';
import { getActiveOffersAsync } from '../utils/offers';
import { useLivePricing } from '../hooks/usePricingAdmin';
import { trackViewContent } from '../utils/metaPixel';

const outfit = { fontFamily: 'Outfit, sans-serif' };

function daysLeft(deadline) {
  if (!deadline) return 999;
  return Math.max(0, Math.ceil((new Date(deadline) - Date.now()) / 86400000));
}

/* ── Offer Card ── */
function OfferCard({ offer, highlight }) {
  const navigate = useNavigate();
  const days = daysLeft(offer.deadline);
  const savings = (offer.oldPrice || 0) - (offer.newPrice || 0);
  const discount = offer.oldPrice > 0 ? Math.round((1 - offer.newPrice / offer.oldPrice) * 100) : 0;
  const slug = offer.product === 'pagini-subtiri' ? 'pagini-subtiri' : 'pagini-groase';
  const productLabel = offer.product === 'pagini-subtiri' ? 'Pagini Subțiri' : 'Pagini Groase';

  // Nr poze recomandat (3-4 per pagină)
  const minPhotos = Math.round(offer.pages * 1.5);
  const maxPhotos = Math.round(offer.pages * 4);

  // Galerie imagini
  const images = offer.images?.length > 0 ? offer.images : (offer.image ? [offer.image] : []);
  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setImgIdx(i => (i + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, [images.length]);

  const handleClick = () => {
    navigate(`/oferte/${offer.id}`);
  };

  return (
    <div className={`bg-white rounded-2xl overflow-hidden transition-all ${
      highlight ? 'ring-2 ring-[#3D6B5E] shadow-lg scale-[1.02]' : 'border border-[#E8E4DB] shadow-sm'
    }`}>
      {/* Badge popular */}
      {highlight && (
        <div className="bg-[#3D6B5E] text-white text-center text-[12px] font-bold py-1.5 uppercase tracking-wider" style={outfit}>
          Cel mai popular
        </div>
      )}

      {/* Galerie imagine */}
      <div className="relative aspect-[4/3] bg-[#F5F1EB] overflow-hidden">
        {images.length > 0 ? (
          <img src={images[imgIdx]} alt={offer.name} className="w-full h-full object-cover transition-opacity duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#D0CAC0]">
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
        )}
        {/* Badge reducere */}
        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-[#B54A3A] text-white text-[12px] font-bold px-3 py-1 rounded-full" style={outfit}>
            -{discount}%
          </div>
        )}
        {/* Dots galerie */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <span key={i} className={`block h-[4px] rounded-full transition-all ${i === imgIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="text-[18px] font-bold text-[#1c1c1c] mb-1" style={outfit}>{offer.name}</h3>
        <p className="text-[13px] text-[#8A8078] mb-3" style={outfit}>{productLabel} · {offer.format} cm</p>

        {/* Specificații */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-[13px] text-[#5C544B]" style={outfit}>
            <svg className="w-4 h-4 text-[#3D6B5E] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            <span><strong>{offer.pages}</strong> pagini</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[#5C544B]" style={outfit}>
            <svg className="w-4 h-4 text-[#3D6B5E] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span>Perfect pentru <strong>{minPhotos}–{maxPhotos}</strong> fotografii</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[#5C544B]" style={outfit}>
            <svg className="w-4 h-4 text-[#3D6B5E] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            <span>Livrare <strong>gratuită</strong></span>
          </div>
        </div>

        {/* Preț */}
        <div className="bg-[#FAF8F5] rounded-xl p-3.5 mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] text-[#B0A89E] line-through" style={outfit}>{offer.oldPrice} lei</span>
            <span className="text-[24px] font-bold text-[#1c1c1c]" style={outfit}>{offer.newPrice} lei</span>
          </div>
          {savings > 0 && (
            <p className="text-[12px] text-[#3D6B5E] font-medium mt-1" style={outfit}>
              Economisești {savings} lei
            </p>
          )}
        </div>

        {/* CTA */}
        <button onClick={handleClick}
          className="w-full h-[52px] bg-[#1c1c1c] text-white text-[14px] font-bold rounded-xl active:scale-[0.98] transition-all hover:bg-[#333]"
          style={outfit}>
          Creează albumul →
        </button>

        {/* Deadline */}
        {days <= 30 && (
          <p className="text-center text-[11px] text-[#B0A89E] mt-3" style={outfit}>
            Ofertă valabilă {days === 0 ? 'doar azi' : days === 1 ? 'încă 1 zi' : `încă ${days} zile`}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: 'Oferte albume foto — prețuri speciale',
    description: 'Albume foto premium la prețuri reduse. Pagini groase, copertă rigidă, livrare gratuită în Moldova.',
    path: '/oferte',
  });

  useEffect(() => {
    trackViewContent({ contentName: 'Offers Page', contentType: 'page' });
    getActiveOffersAsync().then(items => {
      setOffers(items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Determină cea mai populară (cea din mijloc sau prima cu badge)
  const highlightIdx = offers.length === 3 ? 1 : 0;

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20 sm:pb-0">
      {/* Hero */}
      <div className="text-center pt-8 sm:pt-12 pb-8 px-5">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#B0A89E] mb-3" style={outfit}>Oferte speciale</p>
        <h1 className="text-[28px] sm:text-[36px] md:text-[44px] text-[#1c1c1c] leading-[1.1] mb-3" style={{ ...outfit, fontWeight: 700 }}>
          Albume foto la preț redus
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#8A8078] max-w-lg mx-auto leading-relaxed" style={outfit}>
          Alege albumul potrivit. Încarcă pozele, noi facem restul — în doar 10 minute.
        </p>
        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-5 text-[13px] text-[#8A8078]" style={outfit}>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#F5A623]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            4.9 — 200+ albume
          </span>
          <span>Copertă rigidă</span>
          <span>Livrare gratuită</span>
        </div>
      </div>

      {/* Offer cards */}
      {loading ? (
        <div className="max-w-5xl mx-auto px-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="aspect-[3/4] rounded-2xl bg-white animate-pulse" />)}
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-16 px-5">
          <p className="text-[18px] text-[#8A8078] mb-4" style={outfit}>Momentan nu sunt oferte active.</p>
          <Link to="/colectie/toate" className="inline-flex items-center justify-center h-[48px] px-8 bg-[#1c1c1c] text-white text-[13px] font-semibold rounded-full no-underline" style={outfit}>
            Vezi toate albumele →
          </Link>
        </div>
      ) : (
        <div className={`max-w-5xl mx-auto px-5 grid gap-5 ${
          offers.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
          offers.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto' :
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {offers.map((offer, i) => (
            <OfferCard key={offer.id} offer={offer} highlight={i === highlightIdx} />
          ))}
        </div>
      )}

      {/* Pot pune orice poze */}
      <div className="max-w-3xl mx-auto px-5 mt-12">
        <div className="bg-white rounded-2xl p-6 sm:p-8 text-center" style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.04)' }}>
          <h2 className="text-[20px] sm:text-[24px] font-bold text-[#1c1c1c] mb-3" style={outfit}>Pot pune orice poze?</h2>
          <p className="text-[15px] text-[#8A8078] leading-relaxed max-w-lg mx-auto" style={outfit}>
            <strong className="text-[#1c1c1c]">Da, absolut orice.</strong> Poze de la nuntă, vacanță, cu copilul,
            de pe telefon, de la ședința foto — toate sunt perfecte pentru un album.
            Tu alegi pozele, noi le aranjăm frumos.
          </p>
        </div>
      </div>

      {/* Cum funcționează */}
      <div className="max-w-4xl mx-auto px-5 mt-10">
        <h2 className="text-[22px] sm:text-[28px] font-bold text-[#1c1c1c] text-center mb-8" style={outfit}>Cum funcționează</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { n: '1', title: 'Alegi albumul', desc: 'Selectezi formatul și numărul de pagini.' },
            { n: '2', title: 'Încarci pozele', desc: 'Direct din telefon sau calculator. Noi le aranjăm automat.' },
            { n: '3', title: 'Primești acasă', desc: 'Tipărit pe hârtie premium, livrat gratuit.' },
          ].map(step => (
            <div key={step.n} className="text-center">
              <div className="w-10 h-10 rounded-full bg-[#3D6B5E] text-white text-[16px] font-bold flex items-center justify-center mx-auto mb-3" style={outfit}>{step.n}</div>
              <h3 className="text-[16px] font-semibold text-[#1c1c1c] mb-1" style={outfit}>{step.title}</h3>
              <p className="text-[14px] text-[#8A8078]" style={outfit}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-5 mt-12 pb-10">
        <h2 className="text-[20px] font-bold text-[#1c1c1c] text-center mb-6" style={outfit}>Întrebări frecvente</h2>
        <div className="space-y-3">
          {[
            { q: 'Câte poze încap în album?', a: 'Depinde de format și pagini. Un album de 40 pagini încape 100-200 fotografii. Poți pune de la 1 poză pe pagină până la 6.' },
            { q: 'Cât durează livrarea?', a: 'Albumul se tipărește și se livrează în 18 zile lucrătoare. Livrarea este gratuită în toată Moldova.' },
            { q: 'Pot pune poze de pe telefon?', a: 'Da! Pozele din telefon sunt perfecte. Le încarci direct din browser, fără aplicație separată.' },
            { q: 'Ce se întâmplă după ce comand?', a: 'Echipa noastră verifică gratuit fiecare album înainte de tipărire. Te contactăm dacă e ceva de ajustat.' },
          ].map((faq, i) => (
            <details key={i} className="bg-white rounded-xl border border-[#E8E4DB] overflow-hidden group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-[14px] font-medium text-[#1c1c1c] list-none" style={outfit}>
                {faq.q}
                <svg className="w-4 h-4 text-[#B0A89E] shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </summary>
              <p className="px-5 pb-4 text-[13px] text-[#8A8078] leading-relaxed" style={outfit}>{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Sticky CTA mobile */}
      {offers.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="bg-white/95 backdrop-blur-xl border-t border-black/[0.06] px-4 py-3">
            <Link to={`/oferte/${offers[highlightIdx]?.id || offers[0]?.id}`}
              className="flex items-center justify-center h-[48px] bg-[#1c1c1c] text-white text-[13px] font-semibold rounded-full no-underline active:scale-[0.97] transition-all w-full" style={outfit}>
              Începe albumul — de la {Math.min(...offers.map(o => o.newPrice))} lei
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
