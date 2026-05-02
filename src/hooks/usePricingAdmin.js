import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
  GROASE_PRICES, GROASE_PAGE_OPTIONS,
  SUBTIRI_PRICES, SUBTIRI_PAGE_OPTIONS,
} from '../utils/pricing';

const DEFAULTS = {
  'pagini-groase': { prices: GROASE_PRICES, pageOptions: GROASE_PAGE_OPTIONS },
  'pagini-subtiri': { prices: SUBTIRI_PRICES, pageOptions: SUBTIRI_PAGE_OPTIONS },
};

// Read pricing from Firestore, fallback to hardcoded defaults
// pricing pornește cu DEFAULTS (hardcoded), apoi se actualizează din Firestore
// Dacă prețurile din Firestore sunt diferite, se face update fără flash vizibil
export function useLivePricing() {
  const [pricing, setPricing] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) { setPricing(DEFAULTS); setLoading(false); return; }

    (async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'settings', 'pricing'));
        if (snap.exists()) {
          const data = snap.data();
          setPricing({
            'pagini-groase': {
              prices: data.groase_prices || DEFAULTS['pagini-groase'].prices,
              pageOptions: data.groase_options || DEFAULTS['pagini-groase'].pageOptions,
            },
            'pagini-subtiri': {
              prices: data.subtiri_prices || DEFAULTS['pagini-subtiri'].prices,
              pageOptions: data.subtiri_options || DEFAULTS['pagini-subtiri'].pageOptions,
            },
          });
        } else {
          setPricing(DEFAULTS);
        }
      } catch (e) {
        console.warn('Failed to load pricing:', e);
        setPricing(DEFAULTS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getPrice = (format, pages, type) => {
    const table = pricing[type]?.prices?.[format];
    if (!table) return 0;
    if (table[pages] !== undefined) return table[pages];
    // Interpolate
    const opts = pricing[type]?.pageOptions || [];
    let base = opts[0];
    for (let i = opts.length - 1; i >= 0; i--) {
      if (opts[i] <= pages) { base = opts[i]; break; }
    }
    return table[base] || 0;
  };

  return { pricing, getPrice, loading };
}

// Save pricing to Firestore (admin only)
export async function savePricing(groasePrices, subtiriPrices, groaseOptions, subtiriOptions) {
  if (!db) throw new Error('Firebase not configured');
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'settings', 'pricing'), {
    groase_prices: groasePrices,
    groase_options: groaseOptions || GROASE_PAGE_OPTIONS,
    subtiri_prices: subtiriPrices,
    subtiri_options: subtiriOptions || SUBTIRI_PAGE_OPTIONS,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}
