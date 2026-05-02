import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { motion } from 'motion/react';
import AppHeader from '../components/layout/AppHeader';
import { getAllCoverTemplates, getAllCoverTemplatesAsync } from '../utils/coverData';
import AlbumMockup3D from '../components/shared/AlbumMockup3D';
import { getPagePrice } from '../utils/pricing';
import { formatPrice } from '../utils/format';
import { usePageMeta, COLLECTION_SEO } from '../utils/seo';
import { trackViewContent } from '../utils/metaPixel';
import useProjectStore from '../stores/useProjectStore';

/* Auto-animate grid wrapper — 3 columns like Innocence */
function GridWithAutoAnimate({ children }) {
  const [parent] = useAutoAnimate({ duration: 300 });
  return (
    <div ref={parent} className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-14">
      {children}
    </div>
  );
}

/* ── Display names for Firestore templates (overrides numeric IDs) ── */
const TEMPLATE_DISPLAY = {
  '01':  { name: 'Rustic Chic',        desc: 'Eleganță rustică, momente autentice' },
  '02':  { name: 'Memories',           desc: 'Toate amintirile într-un singur loc' },
  '03':  { name: 'Tender Moments',     desc: 'Momente tandre, pagini prețioase' },
  '04':  { name: 'Essential',          desc: 'Tot ce contează, nimic în plus' },
  '05':  { name: 'Modern Frame',       desc: 'Cadru modern, impact vizual' },
  '006': { name: 'Elegant',            desc: 'Rafinament pentru ocazii speciale' },
  '007': { name: 'Story',              desc: 'Fiecare pagină spune ceva' },
  '008': { name: 'Simple Elegance',    desc: 'Simplitate rafinată, rezultat impecabil' },
  '009': { name: 'Minimalist',         desc: 'Curat, simplu, fără distrageri' },
  '010': { name: 'Timeless',           desc: 'Eleganță care nu se demodează' },
  '06':  { name: 'In the Spotlight',   desc: 'Fotografiile tale în centrul atenției' },
  '07':  { name: 'Storybook',          desc: 'Povestea ta, capitol cu capitol' },
  '08':  { name: 'Treasured Instants', desc: 'Clipe prețioase, mereu aproape' },
  '09':  { name: 'Magazine Style',     desc: 'Look editorial, fiecare pagină contează' },
  '11':  { name: 'Heartfelt Lines',    desc: 'Linii fine, emoții mari' },
};

/* ── Poze reale de albume (temporar de la Innocence, vor fi înlocuite) ── */
const REAL_ALBUM_IMAGES = {
  'typewriter': 'https://www.innocence-editions.com/cdn/shop/files/Innocence-album-rigide-portrait-v1-01.jpg?v=1731588993&width=800',
  'tender-moments': 'https://www.innocence-editions.com/cdn/shop/files/Innocence-album-rigide-portrait-v7-01.jpg?v=1731589179&width=800',
  'just-married': 'https://www.innocence-editions.com/cdn/shop/files/Innocence-album-rigide-portrait-v2-01.jpg?v=1731589038&width=800',
  'classic-portrait': 'https://www.innocence-editions.com/cdn/shop/files/Innocence-album-rigide-portrait-v8-01.jpg?v=1731589211&width=800',
  'modern-grid': 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-evasion-01.jpg?v=1739446018&width=800',
  'minimalist': 'https://www.innocence-editions.com/cdn/shop/files/Innocence-album-rigide-portrait-v5-01.jpg?v=1735387691&width=800',
};

/* ── Extra albume cu poze reale (pentru a avea mai multe în colecție) ── */
const EXTRA_ALBUMS = [
  { id: 'horizon', name: 'Rustic Chic', desc: 'Eleganță rustică, momente autentice', theme: 'travel', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-horizon-01.jpg?v=1739446682&width=800' },
  { id: 'exploration', name: 'Memories', desc: 'Toate amintirile într-un singur loc', theme: 'travel', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-exploration-01_4917c217-40e6-48fc-83c2-a22351635196.jpg?v=1739445212&width=800' },
  { id: 'serenity', name: 'Tender Moments', desc: 'Momente tandre, pagini prețioase', theme: 'family', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-serenite-01.jpg?v=1739448923&width=800' },
  { id: 'odyssee', name: 'Storybook', desc: 'Povestea ta, capitolul cu capitolul', theme: 'travel', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-odyssee-01.jpg?v=1739449038&width=800' },
  { id: 'escapade', name: 'In the Spotlight', desc: 'Fotografiile tale în centrul atenției', theme: 'travel', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-escapade-01.jpg?v=1739446182&width=800' },
  { id: 'sunset', name: 'Timeless', desc: 'Eleganță care nu se demodează', theme: 'classic', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-crepuscule-01.jpg?v=1739446545&width=800' },
  { id: 'nomade', name: 'Essential', desc: 'Tot ce contează, nimic în plus', theme: 'travel', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-nomade-01.jpg?v=1739447003&width=800' },
  { id: 'softness', name: 'Simple Elegance', desc: 'Simplitate rafinată, rezultat impecabil', theme: 'family', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-legerete-01.jpg?v=1739446385&width=800' },
  { id: 'pure', name: 'Minimalist', desc: 'Curat, simplu, fără distrageri', theme: 'minimal', image: 'https://www.innocence-editions.com/cdn/shop/files/Innocence-album-rigide-portrait-v4-01.jpg?v=1731589095&width=800' },
  { id: 'arc', name: 'Elegant Arch', desc: 'Forme fine, cadru sofisticat', theme: 'classic', image: 'https://www.innocence-editions.com/cdn/shop/files/Innocence-album-rigide-portrait-v3-01.jpg?v=1731589068&width=800' },
  { id: 'balade', name: 'Story', desc: 'Fiecare pagină spune ceva', theme: 'family', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-balade-01.jpg?v=1739448791&width=800' },
  { id: 'daydream', name: 'Treasured Instants', desc: 'Clipe prețioase, mereu aproape', theme: 'family', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-reverie-01.jpg?v=1739448590&width=800' },
  { id: 'sensation', name: 'Modern Frame', desc: 'Cadru modern, impact vizual', theme: 'classic', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-sensation-01.jpg?v=1739446903&width=800' },
  { id: 'immersion', name: 'Magazine Style', desc: 'Look editorial, fiecare pagină contează', theme: 'classic', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-immersion-01.jpg?v=1739446803&width=800' },
  { id: 'mirage', name: 'Simplicity', desc: 'Frumusețe în forma ei pură', theme: 'minimal', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-mirage-01_fff64e35-cd67-4df4-a98e-1021108a204c.jpg?v=1739442359&width=800' },
  { id: 'celebration-ivory', name: 'Elegant', desc: 'Rafinament pentru ocazii speciale', theme: 'wedding', image: 'https://www.innocence-editions.com/cdn/shop/files/Innocence-Albums-Noel-01-Ivory-01.jpg?v=1761230914&width=800' },
  { id: 'iconic', name: 'Calligraphy', desc: 'Detalii caligrafice, atingere personală', theme: 'classic', image: 'https://www.innocence-editions.com/cdn/shop/files/Innocence-album-rigide-portrait-v6-01.jpg?v=1731589146&width=800' },
  { id: 'yearbook', name: 'Monochrome', desc: 'Contrast și eleganță în alb-negru', theme: 'birthday', image: 'https://www.innocence-editions.com/cdn/shop/files/innocence-album-yearbook-hardcover-portrait-01_65608487-1e32-4d79-bf36-4f740419a1da.jpg?v=1756821039&width=800' },
  { id: 'escale', name: 'Heartfelt Lines', desc: 'Linii fine, emoții mari', theme: 'travel', image: 'https://www.innocence-editions.com/cdn/shop/files/Albums-rigides-escale-01.jpg?v=1739448409&width=800' },
  { id: 'celebration-green', name: 'Fragments', desc: 'Fragmente de viață, un album complet', theme: 'christening', image: 'https://www.innocence-editions.com/cdn/shop/files/Innocence-Albums-Noel-03-Pine-01.jpg?v=1761236068&width=800' },
];

// Maps URL slug → array of theme IDs to match (supports old + new theme names)
const SLUG_TO_THEMES = {
  nunti: ['wedding'],
  cumetrie: ['christening'],
  botez: ['baptism', 'christening'],
  'zi-de-nastere': ['birthday'],
  familie: ['family'],
  copii: ['kids', 'family'],
  vacanta: ['vacation', 'travel'],
  calatorie: ['travel', 'vacation'],
  clasa: ['school', 'classic'],
  anual: ['yearbook'],
  'ziua-mamei': ['mothers_day', 'family'],
  'ziua-tatalui': ['fathers_day', 'family'],
  valentines: ['valentines', 'wedding'],
  clasic: ['classic'],
  minimal: ['minimal'],
  toate: null,
};

const COLLECTION_INFO = {
  toate: { title: 'Creează-ți albumul foto cartonat', subtitle: 'Simplu, elegant și accesibil. Alege designul care ți se potrivește.', breadcrumb: 'Toate albumele' },
  nunti: { title: 'Albume foto de nuntă', subtitle: 'Modele elegante pentru cea mai frumoasă zi din viața voastră.', breadcrumb: 'Nuntă' },
  cumetrie: { title: 'Albume foto de cumetrie', subtitle: 'Păstrează amintirile botezului într-un album special.', breadcrumb: 'Cumetrie' },
  botez: { title: 'Albume foto de botez', subtitle: 'Un album de suflet pentru un moment sfânt.', breadcrumb: 'Botez' },
  'zi-de-nastere': { title: 'Albume de zi de naștere', subtitle: 'Celebrează fiecare an cu un album personalizat.', breadcrumb: 'Zi de naștere' },
  familie: { title: 'Albume foto de familie', subtitle: 'Generații de amintiri într-un singur album.', breadcrumb: 'Familie' },
  copii: { title: 'Albume pentru copii', subtitle: 'Primii pași, primele zâmbete — totul într-un album.', breadcrumb: 'Copii' },
  vacanta: { title: 'Albume foto de vacanță', subtitle: 'Aventurile tale merită un album de calitate.', breadcrumb: 'Vacanță' },
  calatorie: { title: 'Albume foto de călătorie', subtitle: 'Destinații și amintiri din jurul lumii.', breadcrumb: 'Călătorie' },
  clasa: { title: 'Albume foto de clasă', subtitle: 'Amintiri din anii de școală.', breadcrumb: 'Clasă' },
  anual: { title: 'Album foto anual', subtitle: 'Un an întreg de momente importante.', breadcrumb: 'Anual' },
  'ziua-mamei': { title: 'Cadou de Ziua Mamei', subtitle: 'Cel mai frumos cadou pentru cea mai importantă femeie.', breadcrumb: 'Ziua Mamei' },
  'ziua-tatalui': { title: 'Cadou de Ziua Tatălui', subtitle: 'Un album cu amintiri pentru tata.', breadcrumb: 'Ziua Tatălui' },
  valentines: { title: 'Ziua Îndrăgostiților', subtitle: 'Amintiri de dragoste într-un album special.', breadcrumb: 'Valentine\'s' },
  clasic: { title: 'Design clasic', subtitle: 'Eleganță atemporală pentru orice ocazie.', breadcrumb: 'Clasic' },
  minimal: { title: 'Design minimalist', subtitle: 'Simplitate rafinată, focus pe fotografii.', breadcrumb: 'Minimal' },
};

const DEFAULT_CATEGORY_PILLS = [
  { slug: 'toate', label: 'Toate' },
  { slug: 'nunti', label: 'Nuntă' },
  { slug: 'familie', label: 'Familie' },
  { slug: 'copii', label: 'Copii' },
  { slug: 'cumetrie', label: 'Cumetrie' },
  { slug: 'vacanta', label: 'Vacanță' },
  { slug: 'zi-de-nastere', label: 'Zi de naștere' },
  { slug: 'clasic', label: 'Clasic' },
  { slug: 'minimal', label: 'Minimal' },
];

/* ── Album Card — stil Innocence: clean, elegant, with price ── */
function AlbumCard({ album, index, allTemplates }) {
  const { id, name, desc, image, theme } = album;
  const navigate = useNavigate();

  // Base price — "de la X lei" (cheapest config: 20×20, 20 pages, groase)
  const basePrice = getPagePrice('20×20', 20, 'pagini-groase');
  const badge = index === 0 ? { label: 'Bestseller' } : null;

  const handleClick = (e) => {
    e.preventDefault();

    // Offer flow — productConfig already set, just need cover
    const { productConfig } = useProjectStore.getState();
    if (productConfig?._offerReady) {
      const updatedConfig = { ...productConfig };
      delete updatedConfig._offerReady; // Clean up flag
      useProjectStore.setState({ productConfig: updatedConfig });

      // Set cover template (same logic as normal flow)
      const fullTemplate = allTemplates.find(t => t.id === id);
      if (fullTemplate) {
        const fmt = productConfig.format;
        const pfMap = fullTemplate.perFormat || {};
        const pfKeys = Object.keys(pfMap);
        let pf = pfMap[fmt] || pfMap[fmt?.replace('×', 'x')] || pfMap[fmt?.replace('x', '×')] || null;
        if (!pf && pfKeys.length > 0) {
          const fmtClean = (fmt || '').replace(/[×x]/g, '');
          const match = pfKeys.find(k => k.replace(/[×x]/g, '') === fmtClean);
          pf = match ? pfMap[match] : pfMap[pfKeys[0]];
        }
        const isPortrait = fmt === '20×30';
        const designUrl = isPortrait
          ? (fullTemplate.coverStyle?.designPortrait || fullTemplate.coverStyle?.designSquare || fullTemplate.coverStyle?.bgImage)
          : (fullTemplate.coverStyle?.designSquare || fullTemplate.coverStyle?.bgImage);
        useProjectStore.getState().setCoverTemplate({
          id: fullTemplate.id, name: fullTemplate.name,
          frames: pf?.frames || fullTemplate.frames || [],
          texts: pf?.texts || fullTemplate.texts || [],
          decorTexts: pf?.decorTexts || fullTemplate.decorTexts || [],
          decorImages: pf?.decorImages || fullTemplate.decorImages || [],
          perFormat: fullTemplate.perFormat,
          coverStyle: { ...fullTemplate.coverStyle, bgImage: designUrl || fullTemplate.coverStyle?.bgImage },
        });
      } else {
        useProjectStore.getState().setCoverTemplate({
          id, name, coverStyle: { bgImage: image },
          frames: [], texts: [], decorTexts: [], decorImages: [],
        });
      }

      navigate('/app/editor');
      return;
    }

    // Normal flow → configurator cu cover-ul selectat
    // Transmite restricțiile designului (pageTypes, formats)
    const fullTpl = allTemplates.find(t => t.id === id);
    const pageTypes = fullTpl?.pageTypes || [];
    const formats = fullTpl?.formats || [];
    // Dacă designul e doar pentru subțiri, duce direct la subțiri
    const defaultType = (pageTypes.length === 1 && pageTypes[0] === 'pagini-subtiri') ? 'pagini-subtiri' : 'pagini-groase';
    let url = `/app/product/${defaultType}?coverId=${encodeURIComponent(id)}&coverName=${encodeURIComponent(name)}`;
    if (pageTypes.length > 0) url += `&pageTypes=${encodeURIComponent(pageTypes.join(','))}`;
    if (formats.length > 0) url += `&formats=${encodeURIComponent(formats.join(','))}`;
    navigate(url);
  };

  return (
    <button
      onClick={handleClick}
      className="group block text-left w-full"
    >
      {/* Image — 4:5 aspect ratio, clean edges */}
      <div className="relative overflow-hidden mb-4" style={{ aspectRatio: '4/5' }}>
        {/* Badge */}
        {badge && (
          <span className="absolute top-3 left-3 z-10 bg-[#1c1c1c] text-white text-[10px] font-medium tracking-wider px-3 py-1.5 rounded-sm">
            {badge.label}
          </span>
        )}

        <img
          src={image}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>

      {/* Product info */}
      <div className="space-y-1">
        <h3 className="text-[15px] font-medium text-[#1c1c1c] group-hover:text-[#3D6B5E] transition-colors leading-snug" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {name}
        </h3>
        {desc && (
          <p className="text-[13px] text-[#888] leading-relaxed line-clamp-2">{desc}</p>
        )}
      </div>
    </button>
  );
}

/* ── Main Screen ── */
export default function CollectionScreen() {
  const { tema } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slug = tema || 'toate';
  const seo = COLLECTION_SEO[slug] || COLLECTION_SEO.toate;
  usePageMeta({
    title: seo.title,
    description: seo.description,
    path: `/colectie/${slug}`,
  });
  const themeFilters = SLUG_TO_THEMES[slug] ?? null;
  const info = COLLECTION_INFO[slug] || COLLECTION_INFO.toate;

  // Meta Pixel — ViewContent (collection page)
  useEffect(() => {
    trackViewContent({ contentName: `Colecție: ${seo.title}`, contentType: 'collection', contentIds: slug });
  }, [slug]);

  // Filter pills + redirect disabled collections
  const [categoryPills, setCategoryPills] = useState(null); // null = loading
  useEffect(() => {
    import('../components/admin/AdminCollections').then(({ getActiveCollections, getCollectionItems }) => {
      Promise.all([getActiveCollections(), getCollectionItems()]).then(([active, items]) => {
        if (!active) { setCategoryPills(DEFAULT_CATEGORY_PILLS); return; }

        let pills = DEFAULT_CATEGORY_PILLS;
        if (items && items.length > 0) {
          pills = [
            { slug: 'toate', label: 'Toate' },
            ...items.filter(it => active[it.id]).map(it => ({
              slug: it.slug || it.id,
              label: it.label,
            })),
          ];
        } else {
          pills = DEFAULT_CATEGORY_PILLS.filter(p => p.slug === 'toate' || active[p.slug]);
        }
        setCategoryPills(pills.length > 1 ? pills : DEFAULT_CATEGORY_PILLS);

        if (slug !== 'toate' && !active[slug]) {
          navigate('/colectie/toate', { replace: true });
        }
      });
    }).catch(() => setCategoryPills(DEFAULT_CATEGORY_PILLS));
  }, [slug]);

  // Save invite slug from URL (for tracking — works on /colectie/* routes)
  useEffect(() => {
    const inviteSlug = searchParams.get('invite');
    if (inviteSlug && !sessionStorage.getItem('_invite_done_' + inviteSlug)) {
      localStorage.setItem('fc_invite_slug', inviteSlug);
      sessionStorage.setItem('_invite_done_' + inviteSlug, '1');
      // Log click
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
  }, [searchParams]);

  // Fetch templates from Firestore (async) + localStorage cache (instant)
  const [rawTemplates, setRawTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getAllCoverTemplatesAsync();
        if (!cancelled && data.length > 0) {
          setRawTemplates(data);
          setLoading(false);
        }
      } catch {}
      // Retry once after 2s if still empty
      setTimeout(async () => {
        if (cancelled) return;
        try {
          const data = await getAllCoverTemplatesAsync();
          if (!cancelled && data.length > 0) {
            setRawTemplates(data);
          }
        } catch {}
        if (!cancelled) setLoading(false);
      }, 2000);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const allAlbums = rawTemplates.map((t) => {
    const display = TEMPLATE_DISPLAY[t.id];
    return {
      id: t.id,
      name: display?.name || t.name,
      desc: display?.desc || t.desc,
      theme: t.theme,
      image: t.coverStyle?.mockupImage || t.coverStyle?.designSquare || t.coverStyle?.previewImage || t.coverStyle?.bgImage || '',
    };
  }).filter((a) => a.image);

  // DEBUG — ce imagini afișează CollectionScreen
  console.log(`%c[CollectionScreen] ${rawTemplates.length} templates, ${allAlbums.length} cu imagini`, 'color:blue;font-weight:bold');
  if (allAlbums.length > 0) console.log('[CollectionScreen] Prima imagine:', allAlbums[0].image?.substring(0, 80));

  const filtered = themeFilters
    ? allAlbums.filter((a) => themeFilters.includes(a.theme))
    : allAlbums;

  return (
    <div className="min-h-screen bg-white">
      {/* Header — now in RootLayout globally */}

      {/* Breadcrumb */}
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 pt-5">
        <nav className="flex items-center gap-2 text-[12px] text-[#999]">
          <Link to="/" className="hover:text-[#1c1c1c] transition-colors">Acasă</Link>
          <span className="text-[#DDD]">/</span>
          <span className="text-[#1c1c1c]">{info.breadcrumb}</span>
        </nav>
      </div>

      {/* Title section — elegant, serif, centered */}
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 pt-10 pb-8 text-center">
        <h1 className="font-serif text-[28px] md:text-[40px] text-[#1c1c1c] mb-3 leading-tight">
          {info.title}
        </h1>
        <p className="text-[#888] text-[15px] md:text-[16px] max-w-[520px] mx-auto leading-relaxed">
          {info.subtitle}
        </p>
      </div>

      {/* Category filter — centered pills */}
      <div className="max-w-[1200px] mx-auto pb-10">
        <div className="flex gap-2 overflow-x-auto px-5 md:px-10 md:flex-wrap md:justify-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
          <style>{`.category-scroll::-webkit-scrollbar { display: none; }`}</style>
          {!categoryPills ? (
            <div className="flex gap-2">{[1,2,3].map(i => <div key={i} className="w-24 h-9 rounded-full bg-gray-100 animate-pulse" />)}</div>
          ) : categoryPills.map((cat) => {
            const isActive = slug === cat.slug;
            return (
              <Link
                key={cat.slug}
                to={`/colectie/${cat.slug}`}
                style={{ fontFamily: 'Outfit, sans-serif' }}
                className={`text-[13px] px-4 py-2.5 rounded-full transition-all no-underline whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1c1c1c] text-white font-semibold shadow-sm'
                    : 'bg-white text-[#555] border border-[#E5E5EA]'
                }`}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Product count */}
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 pb-4">
        <p className="text-[13px] text-tx-3">
          {filtered.length} {filtered.length === 1 ? 'design' : 'designuri'}
        </p>
      </div>

      {/* Product grid — auto-animated on filter */}
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 pb-16">
        <GridWithAutoAnimate>
          {filtered.map((album, index) => (
            <AlbumCard key={album.id} album={album} index={index} allTemplates={rawTemplates} />
          ))}
        </GridWithAutoAnimate>

        {/* Loading state */}
        {loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-[#3D6B5E]/20 border-t-[#3D6B5E] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[14px] text-[#B0A89E]">Se încarcă colecția...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">📚</span>
            <p className="font-serif text-xl text-tx-1 mb-2">Niciun design găsit</p>
            <p className="text-tx-3 text-sm mb-4">Încercă o altă categorie sau explorează toate designurile.</p>
            <Link
              to="/colectie/toate"
              className="inline-block glass-btn-dark uppercase tracking-[0.1em] text-[13px] px-6 py-3"
            >
              VEZI TOATE DESIGNURILE
            </Link>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      {filtered.length > 0 && (
        <div className="glass-subtle py-12 text-center">
          <p className="font-serif text-2xl text-tx-1 mb-2">Nu găsești ce cauți?</p>
          <p className="text-tx-3 text-sm mb-6">Poți crea propriul design de la zero în editorul nostru.</p>
          <Link
            to="/app/editor"
            className="inline-block glass-btn-dark uppercase tracking-[0.1em] text-[13px] px-8 py-3.5"
          >
            CREEAZĂ DESIGN PROPRIU
          </Link>
        </div>
      )}
    </div>
  );
}
