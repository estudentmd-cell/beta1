import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import useProjectStore from '../stores/useProjectStore';
import { GROASE_PAGE_OPTIONS, SUBTIRI_PAGE_OPTIONS } from '../utils/pricing';
import { useLivePricing } from '../hooks/usePricingAdmin';
import useEditorStore from '../stores/useEditorStore';
import { calculateDeliveryDate, formatDate } from '../utils/delivery';
import { getAllCoverTemplates, getAllCoverTemplatesAsync } from '../utils/coverData';
import { loadActiveFormatsFromFirestore } from '../utils/dimensions';
import { getProducts } from '../components/admin/AdminProducts';
import EditableImage from '../components/cms/EditableImage';
import useAuthStore from '../stores/useAuthStore';
import useUIStore from '../stores/useUIStore';
import { usePageMeta } from '../utils/seo';
import { trackViewContent } from '../utils/metaPixel';

/* ── Poze reale pentru galerie (temporar de la Innocence) ── */
const GALLERY_IMAGES = [
  'https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-01.jpg?v=1744188639&width=1200',
  'https://www.innocence-editions.com/cdn/shop/files/Innocence-magazine-softcover-portrait-int-02_12a1f5ec-025f-4413-8b24-3ec8f81a25e2.jpg?v=1744190237&width=1200',
  'https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-06.jpg?v=1744188647&width=1200',
  'https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-07.jpg?v=1744188647&width=1200',
  'https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-02.jpg?v=1744188647&width=1200',
  'https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-03.jpg?v=1744188647&width=1200',
  'https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-04.jpg?v=1744188647&width=1200',
  'https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-05.jpg?v=1744188647&width=1200',
];

/* ── Types — fallback hardcoded, overridden by Firestore products ── */
const FALLBACK_TYPES = {
  'pagini-groase': {
    name: 'Pagini Groase',
    badge: 'Popular',
    badgeColor: 'bg-ac',
    desc: 'Rigide · Deschidere 180°',
    img: '/images/pagini-groase/1.jpg',
    imgId: 'type_groase_img',
    pageOptions: GROASE_PAGE_OPTIONS,
    defaultPages: 40,
    gallery: [
      { id: 'g_groase_1', src: '/images/pagini-groase/1.jpg' },
      { id: 'g_groase_2', src: '/images/pagini-groase/2.jpg' },
      { id: 'g_groase_3', src: '/images/pagini-groase/3.jpg' },
      { id: 'g_groase_4', src: '/images/pagini-groase/4.jpg' },
      { id: 'g_groase_5', src: '/images/pagini-groase/5.jpg' },
      { id: 'g_groase_6', src: '/images/pagini-groase/6.jpg' },
    ],
  },
  'pagini-subtiri': {
    name: 'Pagini Subțiri',
    badge: 'Economie',
    badgeColor: 'bg-cyan',
    desc: 'Flexibile · Stil revistă',
    img: '/images/pagini-subtiri/1.webp',
    imgId: 'type_subtiri_img',
    pageOptions: SUBTIRI_PAGE_OPTIONS,
    defaultPages: 52,
    gallery: [
      { id: 'g_subtiri_1', src: '/images/pagini-subtiri/1.webp' },
      { id: 'g_subtiri_2', src: '/images/pagini-subtiri/2.jpg' },
      { id: 'g_subtiri_3', src: '/images/pagini-subtiri/3.jpg' },
      { id: 'g_subtiri_4', src: '/images/pagini-subtiri/4.jpg' },
      { id: 'g_subtiri_5', src: '/images/pagini-subtiri/5.jpg' },
      { id: 'g_subtiri_6', src: '/images/pagini-subtiri/6.jpg' },
    ],
  },
};

// Build TYPES dynamically from Firestore products
function buildTypes(liveProducts) {
  const types = { ...FALLBACK_TYPES };
  if (!liveProducts) return types;
  for (const p of liveProducts) {
    if (!p.slug || p.active === false) continue;
    const fallback = FALLBACK_TYPES[p.slug];
    types[p.slug] = {
      name: p.name || fallback?.name || p.slug,
      badge: p.badge || fallback?.badge || '',
      badgeColor: p.badgeColor || fallback?.badgeColor || 'bg-ac',
      desc: p.desc || fallback?.desc || '',
      img: p.heroImage || (p.gallery?.[0]?.src) || fallback?.img || '',
      imgId: `type_${p.slug}_img`,
      pageOptions: fallback?.pageOptions || GROASE_PAGE_OPTIONS,
      defaultPages: p.defaultPages || fallback?.defaultPages || 40,
      deliveryDays: p.deliveryDays || 18,
      gallery: (p.gallery && p.gallery.length > 0)
        ? p.gallery.map((g, i) => ({ id: g.id || `g_${p.slug}_${i}`, src: g.src }))
        : (fallback?.gallery || []),
    };
  }
  return types;
}

const FORMATS = [
  { id: '20×20', label: '20×20', w: 28, h: 28 },
  { id: '20×30', label: '20×30', w: 24, h: 34 },
  { id: '23×23', label: '23×23', w: 32, h: 32 },
  { id: '30×30', label: '30×30', w: 38, h: 38 },
];

const COVERS = [
  { emoji: '💒', title: 'Nuntă', bg: '#F5F0EB', accent: '#8B7355' },
  { emoji: '👶', title: 'Copii', bg: '#EFF6FB', accent: '#5B8DB8' },
  { emoji: '👨‍👩‍👧‍👦', title: 'Familie', bg: '#FDF6F0', accent: '#C17F59' },
  { emoji: '✈️', title: 'Vacanță', bg: '#EBF5EE', accent: '#3D6B5A' },
  { emoji: '🎂', title: 'Zi naștere', bg: '#FBF0EE', accent: '#C05040' },
  { emoji: '👼', title: 'Botez', bg: '#F0E8F0', accent: '#5A4060' },
  { emoji: '🎁', title: 'Cadou', bg: '#F5EBF5', accent: '#9B5580' },
  { emoji: '🌸', title: 'Primăvară', bg: '#F0F5EB', accent: '#5B8B40' },
];

/* ── Gallery — mobil: swipe + dots, desktop: thumbnails stânga + imagine mare ── */
function Gallery({ coverImage, coverName, productGallery }) {
  // Doar imagini cu URL-uri reale (http), nu path-uri locale inexistente
  const validGallery = (productGallery || []).filter(g => g.src?.startsWith('http'));
  // DEBUG — arată EXACT de unde vine fiecare imagine
  const usingFirestore = validGallery.length > 0;
  console.log(`%c[Gallery] ${usingFirestore ? '✅ Firestore' : '❌ FALLBACK innocence'} — ${validGallery.length} valid din ${(productGallery||[]).length} total`,
    usingFirestore ? 'color:green;font-weight:bold' : 'color:red;font-weight:bold');
  if (!usingFirestore && productGallery?.length > 0) {
    console.log('[Gallery] ⚠️ Imagini filtrate (nu încep cu http):', productGallery.map(g => g.src));
  }
  const detailImages = usingFirestore
    ? validGallery.map((g, i) => ({ src: g.src, label: g.label || `Detaliu ${i + 1}` }))
    : GALLERY_IMAGES.map((src, i) => ({ src, label: `Detaliu ${i + 1}` }));
  const allImages = [
    ...(coverImage ? [{ src: coverImage, label: coverName || 'Cover selectat' }] : []),
    ...detailImages,
  ];

  const [active, setActive] = useState(0);
  const [touchX, setTouchX] = useState(null);

  const swipe = {
    onTouchStart: (e) => setTouchX(e.touches[0].clientX),
    onTouchEnd: (e) => {
      if (touchX === null) return;
      const diff = touchX - e.changedTouches[0].clientX;
      setTouchX(null);
      if (Math.abs(diff) > 50) setActive(a => diff > 0 ? Math.min(a + 1, allImages.length - 1) : Math.max(a - 1, 0));
    },
  };

  return (
    <>
      {/* ═══ MOBIL — swipe full-width + dots ═══ */}
      <div className="md:hidden" {...swipe}>
        <div className="relative bg-[#F5F1EB] rounded-2xl overflow-hidden">
          <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${active * 100}%)` }}>
            {allImages.map((img, i) => (
              <div key={i} className="w-full shrink-0 aspect-square">
                <img src={img.src} alt={img.label} className="w-full h-full object-contain" loading={i < 2 ? 'eager' : 'lazy'} />
              </div>
            ))}
          </div>
        </div>
        {/* Dots */}
        {allImages.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {allImages.map((_, i) => (
              <button key={i} onClick={() => setActive(i)}
                className={`h-[6px] rounded-full transition-all duration-300 ${i === active ? 'w-6 bg-[#1c1c1c]' : 'w-[6px] bg-[#D0CAC0]'}`} />
            ))}
          </div>
        )}
      </div>

      {/* ═══ DESKTOP — thumbnails stânga + imagine mare dreapta ═══ */}
      <div className="hidden md:flex gap-3">
        {/* Thumbnails verticale */}
        <div className="flex flex-col gap-2 w-[72px] shrink-0">
          {allImages.map((img, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`w-[72px] h-[72px] rounded-lg overflow-hidden border-2 transition-all ${
                i === active ? 'border-[#3D6B5E] shadow-sm' : 'border-transparent opacity-40 hover:opacity-80'
              }`}>
              <img src={img.src} alt={img.label} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
        {/* Imagine principală */}
        <div className="flex-1 relative bg-[#F5F1EB] rounded-2xl overflow-hidden aspect-[4/5]">
          <img src={allImages[active]?.src} alt={allImages[active]?.label} className="w-full h-full object-contain" />
          {/* Săgeți */}
          {active > 0 && (
            <button onClick={() => setActive(a => a - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 shadow flex items-center justify-center hover:bg-white transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          {active < allImages.length - 1 && (
            <button onClick={() => setActive(a => a + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 shadow flex items-center justify-center hover:bg-white transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
          {/* Counter */}
          <div className="absolute bottom-3 right-3 bg-black/40 text-white text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm">
            {active + 1} / {allImages.length}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Page Select — native dropdown with prices ── */
function PageSelect({ options, value, onChange, format, productSlug, getPrice }) {
  const currentPrice = getPrice ? getPrice(format, value, productSlug) : 0;
  return (
    <div className="mb-5">
      <p className="text-[11px] font-bold text-tx-3 uppercase tracking-wider mb-2">Selectează nr. de pagini</p>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full appearance-none bg-card border-2 border-bdr rounded-xl px-4 py-3.5 text-base font-bold text-tx-1 focus:border-ac focus:outline-none cursor-pointer"
        >
          {options.map((p) => (
            <option key={p} value={p}>
              {p} pagini · {p * 3}–{p * 4} poze
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-tx-3">
          <svg width="14" height="14" viewBox="0 0 10 10" fill="none">
            <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      {currentPrice > 0 && (
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[12px] text-[#8A8078]">{value} pagini · {value / 2} file</span>
          <span className="text-[14px] font-bold text-[#3D6B5E]">{currentPrice} MDL</span>
        </div>
      )}
    </div>
  );
}

/* ── Main ── */
export default function ProductScreen() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  // Read pre-configured params from URL (from offers or collection)
  const initialCoverImage = searchParams.get('cover') || null;
  const initialCoverName = searchParams.get('coverName') || null;
  const initialFormat = searchParams.get('format') || null;
  const initialPages = searchParams.get('pages') ? Number(searchParams.get('pages')) : null;
  const initialType = searchParams.get('type') || slug || 'pagini-groase';
  // SEO — set after liveProducts loaded so we have the name
  const tema = searchParams.get('tema') || null; // tema tematică (nunti, familie, vacanta...)
  const coverId = searchParams.get('coverId') || null;
  // Restricții de la designul selectat — citite direct din Firestore
  const hasCover = !!(initialCoverImage || initialCoverName || coverId);
  const [allowedPageTypes, setAllowedPageTypes] = useState([]);
  const [allowedFormats, setAllowedFormats] = useState([]);
  const [restrictionsLoaded, setRestrictionsLoaded] = useState(!hasCover);
  useEffect(() => {
    // Caută template-ul selectat în Firestore și aplică restricțiile
    getAllCoverTemplatesAsync().then(templates => {
      const tpl = templates.find(t =>
        (coverId && t.id === coverId) ||
        (initialCoverName && t.name === initialCoverName) ||
        (initialCoverImage && (
          t.coverStyle?.mockupImage === initialCoverImage ||
          t.coverStyle?.previewImage === initialCoverImage ||
          t.coverStyle?.bgImage === initialCoverImage ||
          t.coverStyle?.designSquare === initialCoverImage
        ))
      );
      if (tpl) {
        const pt = tpl.pageTypes || [];
        const fm = tpl.formats || [];
        if (pt.length > 0) {
          setAllowedPageTypes(pt);
          // Dacă tipul curent nu e permis, schimbă automat
          if (!pt.includes(type)) {
            setType(pt[0]);
            setPages(TYPES[pt[0]]?.defaultPages || 40);
          }
        }
        if (fm.length > 0) setAllowedFormats(fm);
      }
      setRestrictionsLoaded(true);
    }).catch(() => { setRestrictionsLoaded(true); });
  }, []);
  // Save invite slug + log click (for links that go directly to ProductScreen)
  useEffect(() => {
    const inviteSlug = searchParams.get('invite');
    if (inviteSlug && !sessionStorage.getItem('_invite_done_' + inviteSlug)) {
      localStorage.setItem('fc_invite_slug', inviteSlug);
      sessionStorage.setItem('_invite_done_' + inviteSlug, '1');
      (async () => {
        try {
          const { db } = await import('../firebase/config');
          if (!db) return;
          const { collection: col, getDocs, doc, updateDoc, increment } = await import('firebase/firestore');
          const snap = await getDocs(col(db, 'invitations'));
          const inv = snap.docs.map(d => ({ id: d.id, ...d.data() })).find(i => i.slug === inviteSlug);
          if (inv?.id) {
            const data = { clicks: increment(1), lastClickAt: new Date().toISOString(), lastClickDevice: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop' };
            if (!inv.firstClickAt) data.firstClickAt = new Date().toISOString();
            updateDoc(doc(db, 'invitations', inv.id), data).catch(() => {});
            try { localStorage.setItem('fc_invite_data', JSON.stringify({ name: inv.name, phone: inv.phone })); } catch {}
          }
        } catch {}
      })();
    }
  }, []);

  // Funnel tracking
  useEffect(() => { import('../utils/errorTracker').then(({ trackStep }) => trackStep('select_product', { slug })); }, []);

  // Meta Pixel — ViewContent
  useEffect(() => {
    trackViewContent({
      contentName: t?.name || slug,
      contentType: 'product',
      contentIds: slug,
      value: price,
    });
  }, [slug]);

  const [starting, setStarting] = useState(false); // double-click protection

  const { productConfig } = useProjectStore();
  const { pricing, getPrice, loading: pricingLoading } = useLivePricing();

  const [type, setType] = useState(initialType);
  const [liveProducts, setLiveProducts] = useState(null);
  const [productsLoaded, setProductsLoaded] = useState(false);
  useEffect(() => {
    getProducts().then(items => { if (items) setLiveProducts(items); setProductsLoaded(true); })
      .catch(() => setProductsLoaded(true));
  }, []);

  // Build types dynamically — Firestore products override hardcoded fallbacks
  const TYPES = useMemo(() => buildTypes(liveProducts), [liveProducts]);
  const allProductSlugs = useMemo(() => Object.keys(TYPES), [TYPES]);
  const t = TYPES[type] || TYPES['pagini-groase'] || Object.values(TYPES)[0];

  usePageMeta({
    title: `Album ${t.name}`,
    description: `Album foto cu ${t.name.toLowerCase()} — ${t.desc}. Copertă cartonată, hârtie premium, livrare în Moldova.`,
    path: `/app/product/${slug || 'pagini-groase'}`,
  });

  // Selected cover state — can be changed from "V-ar putea plăcea și"
  const [activeCover, setActiveCover] = useState({ image: initialCoverImage, name: initialCoverName, id: coverId });

  // Resolve cover image from coverId if no direct image URL
  useEffect(() => {
    if (coverId && !activeCover.image) {
      getAllCoverTemplatesAsync().then(templates => {
        const tpl = templates.find(t => t.id === coverId);
        if (tpl) {
          const img = tpl.coverStyle?.mockupImage || tpl.coverStyle?.previewImage || tpl.coverStyle?.bgImage || '';
          setActiveCover({ image: img, name: tpl.name || initialCoverName, id: coverId });
        }
      });
    }
  }, [coverId]);

  const handleCoverSelect = (image, name, id) => {
    setActiveCover({ image, name, id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Use live page options from Firestore if available
  const livePageOptions = pricing[type]?.pageOptions || t.pageOptions;

  const [format, setFormat] = useState(initialFormat || '20×20');
  const [pages, setPages] = useState(initialPages || t.defaultPages);

  // Load active formats from Firestore + restrict by design
  const [visibleFormats, setVisibleFormats] = useState(FORMATS);
  const [activeFormatsPerType, setActiveFormatsPerType] = useState({});
  useEffect(() => {
    loadActiveFormatsFromFirestore().then(active => {
      // Calculează formatele active per fiecare tip de produs
      const perType = {};
      allProductSlugs.forEach(prodKey => {
        let fmts = FORMATS;
        if (active) {
          const productActive = active[prodKey];
          if (productActive) {
            fmts = fmts.filter(f => {
              const key = f.id.replace('×', 'x');
              return productActive[key] !== false;
            });
          }
        }
        if (allowedFormats.length > 0) {
          fmts = fmts.filter(f => allowedFormats.includes(f.id));
        }
        perType[prodKey] = fmts;
      });
      setActiveFormatsPerType(perType);

      // Setează formatele vizibile pentru tipul curent
      const filtered = perType[type] || FORMATS;
      if (filtered.length > 0) {
        setVisibleFormats(filtered);
        if (!filtered.find(f => f.id === format)) {
          setFormat(filtered[0].id);
        }
      }
    });
  }, [type]);

  const switchType = (newType) => {
    setType(newType);
    setPages(TYPES[newType]?.defaultPages || 40);
  };

  const price = useMemo(() => getPrice(format, pages, type), [format, pages, type, pricing]);
  const [deliveryDays, setDeliveryDays] = useState(18);
  useEffect(() => { import('../utils/delivery').then(m => m.loadDeliveryDays(type).then(setDeliveryDays)); }, [type]);
  const deliveryDate = useMemo(() => formatDate(calculateDeliveryDate(deliveryDays)), [deliveryDays]);

  const handleStart = async () => {
    if (starting) return;

    // Auth gate: require Google or Email before entering editor
    const { user, authMethod } = useAuthStore.getState();
    const hasRealAuth = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
    if (!hasRealAuth) {
      useUIStore.getState().openModal('auth', {
        stayOnPage: true,
        hideSkip: true,
        title: 'Conectează-te pentru a începe',
        subtitle: 'Albumul tău va fi salvat în cloud — accesibil de pe orice dispozitiv',
      });
      // Listen for auth change, then retry
      const unsub = useAuthStore.subscribe((state) => {
        if (state.user?.uid && (state.authMethod === 'email_code' || state.authMethod === 'google')) {
          unsub();
          handleStart();
        }
      });
      return;
    }

    setStarting(true);

    // Meta Pixel — ViewContent cu intent (clientul configurează, nu cumpără încă)
    trackViewContent({
      contentName: `${t.name} — ${format} — ${pages}pag`,
      contentType: 'product_configured',
      contentIds: type,
      value: price,
    });

    useEditorStore.setState({
      photos: [], spreads: [{ id: 's0', mode: 'spread', full: null, left: null, right: null, photos: [] }],
      currentSpread: 0, undoStack: [], redoStack: [], selectedFrame: null, swapSource: null,
    });
    useProjectStore.getState().setProject(null, null);
    // Salvează cover-ul ales din colecție — template complet cu design per format
    if (activeCover.image || activeCover.name) {
      // Fetch from Firestore (nu doar localStorage — pe incognito cache-ul e gol)
      let allCovers = [];
      try { allCovers = await getAllCoverTemplatesAsync(); } catch {}
      if (allCovers.length === 0) allCovers = getAllCoverTemplates();
      const fullTemplate = allCovers.find(t =>
        t.id === activeCover.id ||
        t.name === activeCover.name ||
        t.coverStyle?.mockupImage === activeCover.image ||
        t.coverStyle?.previewImage === activeCover.image ||
        t.coverStyle?.bgImage === activeCover.image
      );
      if (fullTemplate) {
        // Selectează design-ul corect per format ales
        const isPortrait = format === '20×30';
        const designUrl = isPortrait
          ? (fullTemplate.coverStyle?.designPortrait || fullTemplate.coverStyle?.designSquare || fullTemplate.coverStyle?.bgImage)
          : (fullTemplate.coverStyle?.designSquare || fullTemplate.coverStyle?.bgImage);

        // Pick elements per format — robust lookup with normalized keys
        const pfMap = fullTemplate.perFormat || {};
        const pfKeys = Object.keys(pfMap);
        let pf = pfMap[format] || pfMap[format.replace('×', 'x')] || pfMap[format.replace('x', '×')] || null;
        if (!pf && pfKeys.length > 0) {
          const fmtClean = format.replace(/[×x]/g, '');
          const match = pfKeys.find(k => k.replace(/[×x]/g, '') === fmtClean);
          pf = match ? pfMap[match] : pfMap[pfKeys[0]];
        }
        const tplFrames = pf?.frames || fullTemplate.frames || [];
        const tplTexts = pf?.texts || fullTemplate.texts || [];
        const tplDecorTexts = pf?.decorTexts || fullTemplate.decorTexts || [];
        const tplDecorImages = pf?.decorImages || fullTemplate.decorImages || [];

        useProjectStore.getState().setCoverTemplate({
          id: fullTemplate.id,
          name: fullTemplate.name,
          frames: tplFrames,
          texts: tplTexts,
          decorTexts: tplDecorTexts,
          decorImages: tplDecorImages,
          perFormat: fullTemplate.perFormat,
          coverStyle: {
            ...fullTemplate.coverStyle,
            bgImage: designUrl || fullTemplate.coverStyle?.bgImage,
          },
        });
      } else {
        useProjectStore.getState().setCoverTemplate({
          id: 'selected_cover',
          name: activeCover.name || 'Cover selectat',
          coverStyle: { bgImage: activeCover.image },
          frames: [], texts: [], decorTexts: [], decorImages: [],
        });
      }
    }
    const configUpdate = { ...productConfig, name: t.name, slug: type, format, initialPages: pages, basePrice: price };
    useProjectStore.setState({ productConfig: configUpdate });
    useProjectStore.getState().setSpreadCount(pages / 2);
    navigate('/app/editor');
  };

  // Skeleton while Firestore products load — prevents fallback image flash
  if (!productsLoaded) return (
    <div className="min-h-screen bg-bg pb-24 md:pb-0">
      <div className="max-w-5xl xl:max-w-6xl mx-auto">
        <div className="md:grid md:grid-cols-2 md:gap-10 md:px-4 md:py-8">
          <div className="aspect-[4/5] rounded-2xl bg-[#f0f0f0] animate-pulse m-4" />
          <div className="p-4 space-y-4">
            <div className="h-8 w-48 bg-[#f0f0f0] rounded animate-pulse" />
            <div className="h-4 w-32 bg-[#f0f0f0] rounded animate-pulse" />
            <div className="h-12 w-full bg-[#f0f0f0] rounded-xl animate-pulse" />
            <div className="h-12 w-full bg-[#f0f0f0] rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg pb-24 md:pb-0">
      {/* Header — now in RootLayout globally */}

      <div className="max-w-5xl xl:max-w-6xl mx-auto">
        {/* ── MOBILE: vertical flow / DESKTOP: 2 col ── */}
        <div className="md:grid md:grid-cols-2 md:gap-10 md:px-4 md:py-8">

          {/* ── GALLERY ── */}
          <div className="md:sticky md:top-20 md:self-start">
            <div className="px-0 md:px-0">
              <Gallery coverImage={activeCover.image} coverName={activeCover.name} productGallery={t.gallery} />
            </div>
          </div>

          {/* ── CONFIGURATOR ── */}
          <div className={`px-4 pt-5 md:pt-0 glass rounded-2xl md:p-6 transition-opacity duration-300 ${restrictionsLoaded ? 'opacity-100' : 'opacity-0'}`}>

            {/* Title */}
            <h1 className="font-serif text-2xl mb-1">Album Cartonat</h1>
            <div className="mb-5" />

            {/* ── TIP PAGINI ── */}
            <p className="text-[11px] font-bold text-tx-3 uppercase tracking-wider mb-2">Alege tipul de pagini</p>
            <div className={`grid gap-3 mb-6 ${allProductSlugs.length <= 2 ? 'grid-cols-2' : allProductSlugs.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {Object.entries(TYPES).map(([key, _item]) => {
                // Merge with Firestore data
                const lp = liveProducts?.find(p => p.slug === key);
                const item = lp ? { ..._item, name: lp.name || _item.name, badge: lp.badge || _item.badge, desc: lp.desc || _item.desc } : _item;
                const isActive = type === key;
                const isAllowed = allowedPageTypes.length === 0 || allowedPageTypes.includes(key);
                const isDisabled = !isAllowed;
                // Preț minim — din formatele active per acest tip
                const typeFmts = (activeFormatsPerType[key] || FORMATS).map(f => f.id);
                const firstPage = item.pageOptions?.[0] || item.defaultPages || 20;
                const minPrices = typeFmts.map(f => getPrice(f, firstPage, key)).filter(p => p > 0);
                const startPrice = minPrices.length > 0 ? Math.min(...minPrices) : getPrice('20×20', firstPage, key);
                return (
                  <button
                    key={key}
                    onClick={() => !isDisabled && switchType(key)}
                    disabled={isDisabled}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                      isDisabled ? 'border-bdr opacity-40 cursor-not-allowed grayscale' :
                      isActive ? 'border-ac shadow-md' : 'border-bdr'
                    }`}
                  >
                    {/* Badge */}
                    <div className={`absolute top-2 left-2 z-10 ${item.badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                      {item.badge}
                    </div>

                    {/* Photo */}
                    <div className="aspect-[4/3] bg-bg-2">
                      <EditableImage
                        id={item.imgId}
                        defaultSrc={item.img}
                        alt={item.name}
                        className="w-full h-full"
                        imgClassName="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className={`p-3 text-left ${isActive ? 'bg-ac-light' : 'bg-card'}`}>
                      <p className={`font-bold text-sm ${isActive ? 'text-ac' : 'text-tx-1'}`}>{item.name}</p>
                      <p className="text-[11px] text-tx-4">{item.desc}</p>
                      <p className="text-xs text-tx-3 mt-1">de la <strong className="text-tx-1">{Math.round(startPrice)} MDL</strong></p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── FORMAT ── */}
            <p className="text-[11px] font-bold text-tx-3 uppercase tracking-wider mb-2">Alege dimensiunea</p>
            <div className={`grid gap-2 mb-5 ${visibleFormats.length <= 2 ? 'grid-cols-2' : visibleFormats.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {visibleFormats.map((f) => {
                const isActive = format === f.id;
                const [w, h] = f.id.split('×').map(Number);
                const isSquare = w === h;
                const sizeLabel = isSquare
                  ? (w <= 20 ? 'Compact' : w <= 23 ? 'Mediu' : 'Mare')
                  : 'Portret';
                const startPrice = getPrice(f.id, livePageOptions[0] || 40, type);
                return (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all ${
                      isActive ? 'border-ac bg-ac-light shadow-sm' : 'border-bdr bg-card hover:border-ac/30'
                    }`}
                  >
                    {/* Album mockup */}
                    <div
                      className="rounded-sm relative overflow-hidden"
                      style={{
                        width: `${f.w}px`,
                        height: `${f.h}px`,
                        backgroundColor: isActive ? '#3D6B5E' : '#E8E4DB',
                        boxShadow: '2px 2px 6px rgba(0,0,0,.08)',
                        transform: 'rotateY(-2deg)',
                      }}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[6%]"
                        style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.15), transparent)' }} />
                      {isActive && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className={`text-sm font-bold ${isActive ? 'text-ac' : 'text-tx-1'}`}>{f.label} cm</span>
                    <span className={`text-[10px] ${isActive ? 'text-ac/70' : 'text-tx-4'}`}>{sizeLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* ── PAGINI — pills horizontal ── */}
            <PageSelect options={livePageOptions} value={pages} onChange={setPages} format={format} productSlug={type} getPrice={getPrice} />

            {/* ── PREȚ — desktop only (mobil = sticky bar) ── */}
            <div className="hidden md:block glass-inner rounded-2xl border border-bdr p-5 mb-4">
              <div className="flex items-end justify-between mb-1">
                <p className="text-3xl font-bold text-tx-1">{Math.round(price)} <span className="text-base text-tx-3">MDL</span></p>
              </div>
              <p className="text-sm text-tx-3 mb-3">🚚 Dacă comanzi azi, primești până la <strong className="text-tx-1">{deliveryDate}</strong></p>

              {/* Progress steps — shows client they're almost there */}
              <div className="flex items-center gap-1.5 mb-4">
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-[#3D6B5E] text-white text-[9px] font-bold flex items-center justify-center">1</span>
                  <span className="text-[10px] text-[#3D6B5E] font-medium">Configurează</span>
                </div>
                <div className="flex-1 h-px bg-gray-200" />
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold flex items-center justify-center">2</span>
                  <span className="text-[10px] text-gray-400">Adaugă poze</span>
                </div>
                <div className="flex-1 h-px bg-gray-200" />
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold flex items-center justify-center">3</span>
                  <span className="text-[10px] text-gray-400">Comandă</span>
                </div>
              </div>

              <button onClick={handleStart} disabled={starting} className={`w-full glass-btn-dark rounded-full py-4 font-bold transition-all text-base ${starting ? 'opacity-50' : 'active:scale-[0.98]'}`}>
                {starting ? 'Se pregătește...' : 'CREEAZĂ ALBUMUL ACUM →'}
              </button>
              <p className="text-center text-[10px] text-tx-4 mt-2">Durează doar 5 minute. Plătești la final.</p>
              <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-tx-4">
                <span>🛡 Garanție 100%</span><span>·</span><span>🔒 Plată securizată</span><span>·</span><span>🔄 Salvezi și revii</span>
              </div>
            </div>

            {/* ── CALCULATOR POZE → PAGINI (jos) ── */}
            <div className="bg-[#F5F3F0] rounded-2xl px-5 py-4 border border-[#E8E4DB]">
              <p className="text-[13px] font-bold text-[#1c1c1c] mb-3">Câte poze ai?</p>
              <input
                type="number"
                placeholder="ex: 150"
                min="10" max="2000"
                inputMode="numeric"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#3D6B5E]/20 text-center text-[16px] font-bold focus:border-[#3D6B5E] focus:outline-none bg-white mb-3"
                onChange={(e) => {
                  const n = parseInt(e.target.value);
                  if (!n || n < 10) return;
                  const ideal = Math.ceil(n / 3.5);
                  const closest = livePageOptions.reduce((a, b) => Math.abs(b - ideal) < Math.abs(a - ideal) ? b : a);
                  setPages(closest);
                }}
              />
              <div className="bg-white rounded-xl p-3 text-center">
                <p className="text-[15px] font-bold text-[#3D6B5E]">Recomandăm {pages} pagini</p>
                <p className="text-[12px] text-[#8A8078] mt-0.5">~{Math.round(pages * 3.5)} poze · {pages / 2} file față-verso</p>
              </div>
              <p className="text-[10px] text-[#B0A89E] mt-2 text-center">Introdu numărul de poze și îți recomandăm albumul potrivit</p>
            </div>

            {/* Social proof */}
          </div>
        </div>

        {/* ── DIFERENȚA: PAGINI GROASE vs SUBȚIRI ── */}
        <section className="py-10 px-4">
          <h2 className="font-serif text-xl mb-6 text-center">Care e diferența?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* Pagini Groase */}
            <div className="bg-white rounded-2xl border-2 border-ac/20 overflow-hidden">
              <div className="aspect-[16/9] bg-[#F5F1EB] overflow-hidden">
                <img
                  src="https://www.innocence-editions.com/cdn/shop/files/02-album-innocence-ete-07.jpg?v=1744188647&width=800"
                  alt="Pagini Groase — album deschis layflat"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-ac text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Popular</span>
                  <h3 className="font-bold text-sm text-tx-1">Pagini Groase</h3>
                </div>
                <ul className="space-y-1.5 text-[13px] text-tx-2">
                  <li className="flex items-start gap-2"><span className="text-ac mt-0.5">✓</span>Pagini rigide de 2mm — nu se îndoaie</li>
                  <li className="flex items-start gap-2"><span className="text-ac mt-0.5">✓</span>Deschidere plată 180° — panorame fără întrerupere</li>
                  <li className="flex items-start gap-2"><span className="text-ac mt-0.5">✓</span>Hârtie fotografică premium, mat sau lucios</li>
                  <li className="flex items-start gap-2"><span className="text-ac mt-0.5">✓</span>Ideal pentru nunți, botezuri, ocazii speciale</li>
                </ul>
              </div>
            </div>

            {/* Pagini Subțiri */}
            <div className="bg-white rounded-2xl border border-bdr overflow-hidden">
              <div className="aspect-[16/9] bg-[#F5F1EB] overflow-hidden">
                <img
                  src="https://www.innocence-editions.com/cdn/shop/files/Innocence-magazine-softcover-portrait-int-02_12a1f5ec-025f-4413-8b24-3ec8f81a25e2.jpg?v=1744190237&width=800"
                  alt="Pagini Subțiri — album stil revistă"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-cyan text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Economie</span>
                  <h3 className="font-bold text-sm text-tx-1">Pagini Subțiri</h3>
                </div>
                <ul className="space-y-1.5 text-[13px] text-tx-2">
                  <li className="flex items-start gap-2"><span className="text-cyan mt-0.5">✓</span>Pagini flexibile — ușor de răsfoit</li>
                  <li className="flex items-start gap-2"><span className="text-cyan mt-0.5">✓</span>Hârtie fotografică mată de calitate</li>
                  <li className="flex items-start gap-2"><span className="text-cyan mt-0.5">✓</span>Mai multe pagini la preț accesibil</li>
                  <li className="flex items-start gap-2"><span className="text-cyan mt-0.5">✓</span>Ideal pentru vacanțe, familie, călătorii</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── V-AR PUTEA PLĂCEA ȘI — from Firestore templates ── */}
        {(() => {
          const allCovers = getAllCoverTemplates()
            .filter(t => t.coverStyle?.mockupImage || t.coverStyle?.designSquare || t.coverStyle?.bgImage)
            .filter(t => {
              // Exclude the currently selected cover
              const img = t.coverStyle?.mockupImage || t.coverStyle?.designSquare || t.coverStyle?.bgImage;
              return img !== activeCover.image && t.name !== activeCover.name;
            })
            .slice(0, 8);
          if (allCovers.length === 0) return null;
          return (
            <section className="py-10 px-4">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-tx-3 text-center mb-8">V-AR PUTEA PLĂCEA ȘI</h2>
              <div className="flex overflow-x-auto gap-4 pb-3" style={{ scrollbarWidth: 'none' }}>
                {allCovers.map((t, i) => {
                  const img = t.coverStyle?.mockupImage || t.coverStyle?.designSquare || t.coverStyle?.bgImage;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleCoverSelect(img, t.name, t.id)}
                      className="flex-shrink-0 w-[200px] md:w-[220px] group text-left"
                    >
                      <div className="relative rounded-sm overflow-hidden aspect-square mb-2" style={{ background: t.coverStyle?.bg || '#F5F1EB' }}>
                        {i < 2 && (
                          <span className="absolute top-2 left-2 z-10 bg-[#D4A59A] text-white text-[9px] font-medium uppercase tracking-wider px-2 py-0.5">
                            NOU ÎN COLECȚIE
                          </span>
                        )}
                        <img
                          src={img}
                          alt={t.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <p className="text-[13px] text-tx-2 group-hover:text-ac transition-colors">{t.name}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* ── GARANȚIE ── */}
        <section className="px-4 pb-10">
          <div className="bg-ac-light rounded-2xl border border-ac/15 p-5 text-center max-w-md mx-auto">
            <span className="text-2xl block mb-1">🛡</span>
            <p className="font-bold text-ac text-sm">Garanție de satisfacție 100%</p>
            <p className="text-xs text-tx-3">Nu ești mulțumit? Banii înapoi.</p>
          </div>
        </section>
      </div>

      {/* ── STICKY BAR — mobile only ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-bdr px-4 py-3 flex items-center gap-3 md:hidden z-50 safe-area-pb">
        <div className="flex-1">
          <p className="text-xl font-bold text-tx-1 leading-none">{Math.round(price)} <span className="text-sm text-tx-3">MDL</span></p>
          <p className="text-[10px] text-tx-4">{t.name} · {format} · {pages} pag</p>
        </div>
        <button
          onClick={handleStart}
          disabled={starting}
          className={`bg-ac text-white px-5 py-3 rounded-xl font-bold text-sm transition-all ${starting ? 'opacity-50' : 'hover:bg-ac-2 active:scale-[0.98]'}`}
        >
          {starting ? '...' : 'ÎNCEPE →'}
        </button>
      </div>
    </div>
  );
}
