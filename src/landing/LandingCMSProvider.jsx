/**
 * Centralized CMS provider for landing page.
 * Single Firestore fetch — all sections read from cache via useLandingCMS().
 */
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';

const LandingCMSContext = createContext({});

const CMS_DOCS = [
  { key: 'heroSlides',    path: ['settings', 'hero_slides'] },
  { key: 'faq',           path: ['homepage_faq', 'content'] },
  { key: 'floatingCta',   path: ['homepage_floatingcta', 'texts'] },
  { key: 'announcement',  path: ['homepage_announcement', 'texts'] },
  { key: 'hotOffers',     path: ['homepage_hotoffers', 'texts'] },
  { key: 'carouselTexts', path: ['homepage_carousel', 'texts'] },
  { key: 'trustStrip',    path: ['homepage_truststrip', 'texts'] },
  { key: 'openAlbum',     path: ['homepage_openalbum', 'gallery'] },
  { key: 'openAlbumAlt',  path: ['open-album-gallery', 'gallery'] },
];

const CMS_COLLECTIONS = [
  { key: 'collectionCards', path: 'homepage_images' },
  { key: 'howItWorksImgs',  path: 'homepage_howitworks' },
];

export function LandingCMSProvider({ children }) {
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;
    if (!db) { setLoaded(true); return; }

    (async () => {
      try {
        const { doc, getDoc, collection, getDocs } = await import('firebase/firestore');
        if (abortRef.current) return;

        // Fetch all single docs in parallel
        const docPromises = CMS_DOCS.map(async ({ key, path }) => {
          try {
            const snap = await getDoc(doc(db, ...path));
            return { key, data: snap.exists() ? snap.data() : null };
          } catch { return { key, data: null }; }
        });

        // Fetch all collections in parallel
        const colPromises = CMS_COLLECTIONS.map(async ({ key, path }) => {
          try {
            const snap = await getDocs(collection(db, path));
            const map = {};
            snap.forEach((d) => { map[d.id] = d.data(); });
            return { key, data: map };
          } catch { return { key, data: {} }; }
        });

        const results = await Promise.all([...docPromises, ...colPromises]);
        if (abortRef.current) return;

        const merged = {};
        results.forEach(({ key, data: val }) => { merged[key] = val; });
        setData(merged);
      } catch {
        // All fetches failed — sections fall back to defaults
      }
      if (!abortRef.current) setLoaded(true);
    })();

    return () => { abortRef.current = true; };
  }, []);

  return (
    <LandingCMSContext.Provider value={{ ...data, _loaded: loaded }}>
      {children}
    </LandingCMSContext.Provider>
  );
}

/**
 * Hook: get CMS data by key.
 * Returns { data, loaded } — data is null if not yet loaded or not found.
 */
export function useLandingCMS(key) {
  const ctx = useContext(LandingCMSContext);
  return { data: ctx[key] ?? null, loaded: ctx._loaded ?? false };
}
