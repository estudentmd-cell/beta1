import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { getActiveOffers, getActiveOffersAsync, daysLeft } from '../../utils/offers';

function CountdownLabel({ deadline }) {
  const days = daysLeft(deadline);
  if (days === 0) return <span className="text-[#B54A3A] font-semibold">Ultima zi!</span>;
  if (days === 1) return <span className="text-[#B54A3A] font-semibold">Mai ai 1 zi</span>;
  if (days <= 3) return <span className="text-[#B54A3A] font-semibold">Mai ai {days} zile</span>;
  if (days <= 7) return <span className="text-[#8B6F4E] font-medium">Mai ai {days} zile</span>;
  return <span className="text-[#857D74]">Mai ai {days} zile</span>;
}

function buildOfferUrl(offer) {
  return `/oferte/${offer.id}`;
}

async function loadCmsTexts() {
  try {
    const { db } = await import('../../firebase/config');
    if (!db) return {};
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'homepage_hotoffers', 'texts'));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

export default function HotOffers() {
  const [offers, setOffers] = useState(getActiveOffers());
  const [cms, setCms] = useState({});

  useEffect(() => {
    let cancelled = false;
    getActiveOffersAsync().then(d => { if (!cancelled) setOffers(d); });
    loadCmsTexts().then(d => { if (!cancelled) setCms(d); });
    return () => { cancelled = true; };
  }, []);

  if (offers.length === 0) return null;

  return (
    <div id="oferte">
      <div className="max-w-[1360px] mx-auto px-4 md:px-12">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[12px] uppercase tracking-[0.15em] text-[#B0A89E] mb-3">
            {cms.label || 'OFERTE LIMITATE'}
          </p>
          <h2 className="text-[28px] sm:text-[30px] md:text-[36px] lg:text-[42px] text-[#1c1c1c] leading-tight"
            style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
            {cms.heading || 'Prețuri speciale'}
          </h2>
        </div>

        {/* Cards */}
        <div className={`grid gap-4 ${
          offers.length === 1 ? 'grid-cols-1 max-w-[380px] mx-auto' :
          offers.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-[780px] mx-auto' :
          offers.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}>
          {offers.map((offer, i) => {
            const days = daysLeft(offer.deadline);
            const discount = offer.oldPrice > 0 ? Math.round((1 - offer.newPrice / offer.oldPrice) * 100) : 0;
            const productLabel = offer.product === 'pagini-subtiri' ? 'Pagini Subțiri' : 'Pagini Groase';

            return (
              <Link
                to={buildOfferUrl(offer)}
                key={offer.id}
                className="group bg-white rounded-2xl overflow-hidden border border-[#E4E4E4] hover:border-transparent transition-all duration-300 no-underline"
                style={{ boxShadow: '0 5px 40px rgba(0,0,0,0.06)' }}
              >
                {/* Offer image carousel — set from admin panel */}
                <OfferImage
                  format={offer.format}
                  images={offer.images}
                  image={offer.image}
                />

                <div className="p-5">
                  {/* Discount badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-[#B54A3A] text-white text-[13px] font-bold px-2.5 py-1 rounded-lg">
                      {offer.badge || `-${discount}%`}
                    </span>
                    <span className="text-[13px] text-[#857D74]">Economie {offer.oldPrice - offer.newPrice} MDL</span>
                  </div>

                  {/* Product title — format based */}
                  <h3 className="text-[20px] font-bold text-[#1c1c1c] leading-tight mb-1">
                    Album {offer.format} cm
                  </h3>
                  <p className="text-[15px] text-[#6B635B] mb-4">
                    {productLabel} · {offer.pages} pagini · Orice design
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-[13px] text-[#857D74] line-through">{offer.oldPrice} MDL</span>
                    <span className="text-[28px] font-bold text-[#1c1c1c] leading-none">{offer.newPrice}</span>
                    <span className="text-[13px] text-[#6B635B]">MDL</span>
                  </div>

                  {/* CTA */}
                  <div className="w-full py-3 text-center text-[14px] font-semibold uppercase tracking-wider bg-[#1c1c1c] text-white rounded-xl group-hover:bg-[#3D6B5E] transition-colors mb-3">
                    Comandă acum →
                  </div>

                  {/* Countdown */}
                  <div className="flex items-center gap-2 text-[13px]">
                    <svg className={`w-3.5 h-3.5 shrink-0 ${days <= 3 ? 'text-[#B54A3A]' : 'text-[#B0A89E]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                    </svg>
                    <CountdownLabel deadline={offer.deadline} />
                    <div className="flex-1 h-[3px] bg-[#EEECE8] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${days <= 3 ? 'bg-[#B54A3A]' : days <= 7 ? 'bg-[#8B6F4E]' : 'bg-[#B0A89E]'}`}
                        style={{ width: `${Math.min(100, Math.max(5, ((30 - days) / 30) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OfferImage({ format, images, image }) {
  // Support both: images array (new) and single image (legacy)
  const imgs = images?.length > 0 ? images : image ? [image] : ['/images/pagini-groase/1.jpg'];
  const [current, setCurrent] = useState(0);
  const touchStart = useRef(null);

  // Auto-rotate every 4s if multiple images
  useEffect(() => {
    if (imgs.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % imgs.length), 4000);
    return () => clearInterval(t);
  }, [imgs.length]);

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStart.current === null || imgs.length <= 1) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      setCurrent(c => diff > 0 ? (c + 1) % imgs.length : (c - 1 + imgs.length) % imgs.length);
    }
    touchStart.current = null;
  };

  return (
    <div
      className="relative bg-[#F5F1EB] overflow-hidden aspect-[4/3]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {imgs.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`Album ${format} ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          loading={i === 0 ? 'eager' : 'lazy'}
          draggable={false}
        />
      ))}
      {/* Dots */}
      {imgs.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {imgs.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
