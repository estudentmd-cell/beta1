import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AnimatedSection, AnimatedItem, AnimatedText } from '../../components/motion/AnimatedSection';
import { getAllCoverTemplatesAsync } from '../../utils/coverData';
import useCmsStore from '../../components/cms/useCmsStore';
import useAuthStore from '../../stores/useAuthStore';
import { db, storage } from '../../firebase/config';

/* ─── Firebase helpers ─── */
async function uploadCarouselImage(cardId, file) {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const ext = file.name?.split('.').pop() || 'jpg';
  const ts = Date.now();
  const storageRef = ref(storage, `homepage/carousel/${cardId}_${ts}.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: 'public, max-age=86400' });
  return await getDownloadURL(storageRef);
}

async function saveCarouselData(cardId, data) {
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'homepage_carousel', cardId), { ...data, updated_at: new Date().toISOString() }, { merge: true });
}

async function loadAllCarouselData() {
  try {
    const { collection: col, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(col(db, 'homepage_carousel'));
    const map = {};
    snap.forEach((d) => { map[d.id] = d.data(); });
    return map;
  } catch { return {}; }
}

/* ─── Zoom bar ─── */
function ZoomBar({ zoom, onZoom }) {
  return (
    <div className="flex items-center gap-2 mt-1.5 px-1">
      <span className="text-[9px] text-gray-400 w-7 text-right">{Math.round(zoom * 100)}%</span>
      <input type="range" min="1" max="3" step="0.05" value={zoom}
        onChange={(e) => onZoom(parseFloat(e.target.value))}
        aria-label="Zoom imagine"
        className="flex-1 h-1 accent-[#3D6B5E] cursor-pointer" />
    </div>
  );
}

/* ─── Album Card with zoom+drag in edit mode ─── */
function AlbumCard({ album, i, editMode, cardData, onUpdate }) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const imgSrc = cardData?.url || album.image;
  const zoom = cardData?.zoom || 1;
  const posX = cardData?.posX || 50;
  const posY = cardData?.posY || 50;
  const hasCustom = !!cardData?.url;

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setUploading(true);
    try {
      const url = await uploadCarouselImage(album.id, f);
      const data = { url, zoom: 1, posX: 50, posY: 50 };
      await saveCarouselData(album.id, data);
      onUpdate(album.id, { ...cardData, ...data });
    } catch {
      // upload error handled silently
    }
    setUploading(false);
  };

  const handleZoom = async (z) => {
    onUpdate(album.id, { ...cardData, zoom: z });
    await saveCarouselData(album.id, { zoom: z });
  };

  const handlePointerDown = (e) => {
    if (!editMode) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: posX, oy: posY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.x) / rect.width) * -100;
    const dy = ((e.clientY - dragStart.current.y) / rect.height) * -100;
    const nx = Math.max(0, Math.min(100, dragStart.current.ox + dx));
    const ny = Math.max(0, Math.min(100, dragStart.current.oy + dy));
    onUpdate(album.id, { ...cardData, posX: nx, posY: ny });
  };

  const handlePointerUp = async () => {
    if (!dragging) return;
    setDragging(false);
    await saveCarouselData(album.id, { posX: cardData?.posX || 50, posY: cardData?.posY || 50 });
  };

  const imgStyle = {
    objectPosition: `${posX}% ${posY}%`,
    transform: zoom !== 1 ? `scale(${zoom})` : undefined,
  };

  const Wrapper = editMode ? 'div' : Link;
  const wrapperProps = editMode
    ? { className: 'block group' }
    : { to: `/app/product/pagini-groase?coverId=${encodeURIComponent(album.id)}&coverName=${encodeURIComponent(album.name)}`, className: 'block group' };

  return (
    <>
      <Wrapper {...wrapperProps}>
        {/* Card image */}
        <div
          className={`relative bg-white overflow-hidden aspect-square rounded-2xl transition-all duration-300 ease-out group-hover:-translate-y-1 ${editMode ? 'cursor-move' : ''}`}
          style={{ boxShadow: '0 5px 40px rgba(0,0,0,0.06)' }}
          onPointerDown={editMode ? handlePointerDown : undefined}
          onPointerMove={editMode ? handlePointerMove : undefined}
          onPointerUp={editMode ? handlePointerUp : undefined}
          onPointerCancel={editMode ? handlePointerUp : undefined}
        >
          {/* Badges */}
          {i === 0 && (
            <span className="absolute top-3 left-3 z-10 bg-[#D4A59A] text-white text-[10px] font-medium uppercase tracking-wider px-2.5 py-1">
              CEL MAI VÂNDUT
            </span>
          )}
          {i === 1 && (
            <span className="absolute top-3 left-3 z-10 bg-[#D4A59A] text-white text-[10px] font-medium uppercase tracking-wider px-2.5 py-1">
              NOU ÎN COLECȚIE
            </span>
          )}

          {/* Primary image — subtle scale on hover */}
          <img
            src={imgSrc}
            alt={album.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            style={imgStyle}
            loading={i < 4 ? 'eager' : 'lazy'}
            draggable={false}
          />

          {/* Edit controls */}
          {editMode && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
              className={`absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg cursor-pointer transition ${uploading ? 'animate-pulse' : ''}`}
            >
              {uploading ? (
                <div className="w-3 h-3 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              )}
            </button>
          )}

          {editMode && dragging && (
            <div className="absolute inset-0 border-2 border-[#3D6B5E] rounded pointer-events-none z-20" />
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        {/* Info */}
        <div className="mt-4 text-center">
          <h3 className="text-[15px] sm:text-[16px] text-[#1c1c1c] font-medium leading-snug">
            {album.name}
          </h3>
        </div>
      </Wrapper>

      {/* Zoom bar — in edit mode for any image */}
      {editMode && (
        <ZoomBar zoom={zoom} onZoom={handleZoom} />
      )}
    </>
  );
}

async function loadCarouselTexts() {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'homepage_carousel', 'texts'));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

export default function AlbumCarousel() {
  const editMode = useCmsStore((s) => s.editMode);
  const [allTemplates, setAllTemplates] = useState([]);
  const [carouselData, setCarouselData] = useState({});
  const [cmsTexts, setCmsTexts] = useState({});

  useEffect(() => {
    let cancelled = false;
    getAllCoverTemplatesAsync().then(d => { if (!cancelled) setAllTemplates(d); }).catch(() => {});
    loadAllCarouselData().then(d => { if (!cancelled) setCarouselData(d); }).catch(() => {});
    loadCarouselTexts().then(d => { if (!cancelled) setCmsTexts(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const DISPLAY_NAMES = {
    '01': 'Rustic Chic', '02': 'Memories', '03': 'Tender Moments', '04': 'Essential', '05': 'Modern Frame',
    '006': 'Elegant', '007': 'Story', '008': 'Simple Elegance', '009': 'Minimalist', '010': 'Timeless',
    '06': 'In the Spotlight', '07': 'Storybook', '08': 'Treasured Instants', '09': 'Magazine Style', '11': 'Heartfelt Lines',
  };

  const albums = allTemplates
    .filter((t) => t.theme === 'family')
    .map((t) => ({
      id: t.id,
      name: DISPLAY_NAMES[t.id] || t.name,
      image: t.coverStyle?.mockupImage || t.coverStyle?.designSquare || t.coverStyle?.previewImage || t.coverStyle?.bgImage || '',
      imageSecondary: t.coverStyle?.previewImage || t.coverStyle?.bgImage || '',
    }))
    .filter((a) => a.image);

  const handleUpdate = (id, data) => {
    setCarouselData((prev) => ({ ...prev, [id]: data }));
  };

  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.album-card')?.offsetWidth || 300;
    el.scrollBy({ left: direction * (cardWidth + 24), behavior: 'smooth' });
    setTimeout(updateScrollState, 400);
  };

  if (albums.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-[#FAF8F5]">
      <div className="mx-auto px-4 sm:px-6 md:px-12" style={{ maxWidth: '1360px' }}>
        {/* Header */}
        <AnimatedSection stagger staggerDelay={0.1} className="text-center mb-8 sm:mb-12">
          <AnimatedItem>
            <p className="text-[12px] uppercase tracking-[0.15em] text-[#B0A89E] mb-3">
              {cmsTexts.label || 'ALBUMURILE FOTO CELE MAI VÂNDUTE'}
            </p>
          </AnimatedItem>
          <AnimatedItem>
            <AnimatedText
              as="h2"
              className="text-[28px] sm:text-[30px] md:text-[36px] text-[#1c1c1c]"
              style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
            >
              {cmsTexts.heading || 'Cărți foto cartonate'}
            </AnimatedText>
          </AnimatedItem>
        </AnimatedSection>

        {/* Mobile — horizontal scroll Popsa style */}
        <style>{`.popsa-scroll::-webkit-scrollbar { display: none; }`}</style>
        <div className="sm:hidden popsa-scroll overflow-x-auto pb-4 -mx-4 px-4"
          style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', scrollPaddingLeft: '16px' }}>
          <div className="flex gap-4" style={{ width: 'max-content', paddingRight: '16px' }}>
            {albums.slice(0, 8).map((album, i) => (
              <div key={album.id} className="flex-shrink-0 bg-white rounded-2xl overflow-hidden"
                style={{ width: '220px', scrollSnapAlign: 'start', scrollSnapStop: 'always', boxShadow: '0 5px 40px rgba(0,0,0,0.06)' }}>
                <AlbumCard album={album} i={i} editMode={editMode} cardData={carouselData[album.id]} onUpdate={handleUpdate} />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop — grid Popsa style */}
        <div className="hidden sm:grid sm:grid-cols-3 md:grid-cols-4 gap-5 md:gap-8">
          {albums.slice(0, 8).map((album, i) => (
            <motion.div
              key={album.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.06, 0.3) }}
              className="album-card bg-white rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.967]"
              style={{ boxShadow: '0 5px 40px rgba(0,0,0,0.06)' }}
              whileHover={editMode ? undefined : { y: -4, transition: { duration: 0.2 } }}
            >
              <AlbumCard album={album} i={i} editMode={editMode} cardData={carouselData[album.id]} onUpdate={handleUpdate} />
            </motion.div>
          ))}
        </div>

        {/* View All button — Popsa style */}
        <AnimatedSection preset="fadeIn" className="text-center mt-10">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Link to={cmsTexts.cta_link || '/colectie/toate'}
              className="inline-flex items-center justify-center px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl transition-colors duration-100 no-underline"
              style={{ background: 'rgba(0,0,0,0.05)', color: '#2E2E2E' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.09)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}>
              {cmsTexts.cta_text || 'VEZI TOT'}
            </Link>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}
