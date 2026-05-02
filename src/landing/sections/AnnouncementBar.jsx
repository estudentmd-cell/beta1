import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActiveOffers, getActiveOffersAsync, daysLeft } from '../../utils/offers';
import { useLivePricing } from '../../hooks/usePricingAdmin';

async function loadCmsTexts() {
  try {
    const { db } = await import('../../firebase/config');
    if (!db) return {};
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'homepage_announcement', 'texts'));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const [offers, setOffers] = useState(getActiveOffers());
  const [cms, setCms] = useState({});
  const { getPrice } = useLivePricing();

  useEffect(() => {
    let cancelled = false;
    getActiveOffersAsync().then(d => { if (!cancelled) setOffers(d); });
    loadCmsTexts().then(d => { if (!cancelled) setCms(d); });
    return () => { cancelled = true; };
  }, []);

  if (!visible) return null;

  // Pick the best offer to show (most urgent or biggest discount)
  const bestOffer = offers.length > 0
    ? offers.reduce((best, o) => {
        const dl = daysLeft(o.deadline);
        const bestDl = daysLeft(best.deadline);
        // Prioritize: expiring soon (urgency) > bigger discount
        if (dl <= 7 && dl < bestDl) return o;
        if (dl > 7 && bestDl > 7 && o.oldPrice - o.newPrice > best.oldPrice - best.newPrice) return o;
        return best;
      })
    : null;

  // Dynamic message based on offers
  const message = bestOffer
    ? (() => {
        const days = daysLeft(bestOffer.deadline);
        const discount = bestOffer.oldPrice - bestOffer.newPrice;
        if (days <= 3) return `🔥 Ultima șansă! Album ${bestOffer.format} cm — ${bestOffer.newPrice} MDL în loc de ${bestOffer.oldPrice} · Mai ai ${days === 1 ? '1 zi' : days + ' zile'}`;
        if (days <= 7) return `⏰ Album ${bestOffer.format} cm de la ${bestOffer.newPrice} MDL (economisești ${discount} MDL) · Mai ai ${days} zile`;
        return `🌸 ${bestOffer.badge} la albumul ${bestOffer.format} cm · ${bestOffer.pages} pagini — doar ${bestOffer.newPrice} MDL`;
      })()
    : (cms.fallback_message || `📸 Album foto de la ${getPrice('20×20', 32, 'pagini-subtiri') || 85} MDL · Încarci pozele, noi aranjăm · Livrare în toată Moldova`);

  const linkTo = bestOffer ? '#oferte' : (cms.fallback_link_url || '/colectie/toate');
  const linkText = bestOffer ? 'Vezi oferta →' : (cms.fallback_link_text || 'Începe acum →');
  const bgColor = cms.bg_color || '#2C2520';
  const textColor = cms.text_color || '#ffffff';

  return (
    <div role="alert" className="text-center py-2.5 px-10 text-[12px] sm:text-[13px] relative z-30" style={{ backgroundColor: bgColor, color: textColor }}>
      <span>{message} · </span>
      <Link
        to={linkTo}
        onClick={bestOffer ? (e) => {
          e.preventDefault();
          document.getElementById('oferte')?.scrollIntoView({ behavior: 'smooth' });
        } : undefined}
        className="underline underline-offset-2 font-semibold hover:opacity-80"
        style={{ color: textColor }}
      >
        {linkText}
      </Link>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm leading-none"
        style={{ color: `${textColor}66` }}
        aria-label="Închide"
      >
        ✕
      </button>
    </div>
  );
}
