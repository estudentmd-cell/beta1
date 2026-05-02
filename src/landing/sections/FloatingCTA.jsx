import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActiveOffers, getActiveOffersAsync } from '../../utils/offers';
import { useLivePricing } from '../../hooks/usePricingAdmin';

async function loadCmsTexts() {
  try {
    const { db } = await import('../../firebase/config');
    if (!db) return {};
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'homepage_floatingcta', 'texts'));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

export default function FloatingCTA() {
  const [visible, setVisible] = useState(false);
  const [offers, setOffers] = useState(getActiveOffers());
  const [cms, setCms] = useState({});

  useEffect(() => {
    let cancelled = false;
    getActiveOffersAsync().then(d => { if (!cancelled) setOffers(d); });
    loadCmsTexts().then(d => { if (!cancelled) setCms(d); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;

      // Show after scrolling past Hero
      const pastHero = scrollY > viewportHeight * 0.8;

      // Hide when offers section is in view
      const offersEl = document.getElementById('oferte');
      let inOffers = false;
      if (offersEl) {
        const rect = offersEl.getBoundingClientRect();
        inOffers = rect.top < viewportHeight && rect.bottom > 0;
      }

      setVisible(pastHero && !inOffers);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { getPrice } = useLivePricing();

  const bestOffer = offers.length > 0 ? offers[0] : null;
  const minPrice = getPrice('20×20', 32, 'pagini-subtiri') || getPrice('20×20', 40, 'pagini-groase') || '';
  const linkTo = cms.link || '/colectie/toate';

  const label = bestOffer
    ? (cms.label_offer || 'Creează albumul — {price} MDL').replace('{price}', bestOffer.newPrice)
    : minPrice
      ? (cms.label || '📸 Creează albumul — de la {price} MDL').replace('{price}', minPrice)
      : '📸 Creează albumul tău';

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 sm:hidden transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="px-4 pb-4 pt-2">
        <Link
          to={linkTo}
          aria-label="Creează albumul foto"
          className="flex items-center justify-center w-full h-[52px] rounded-full bg-[#3D6B5E] text-white text-[15px] font-semibold no-underline active:scale-[0.97] transition-all shadow-lg"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        >
          {label}
        </Link>
      </div>
    </div>
  );
}
