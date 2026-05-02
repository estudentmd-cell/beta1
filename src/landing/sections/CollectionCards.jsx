import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import useCmsStore from '../../components/cms/useCmsStore';
import { db, storage } from '../../firebase/config';
import { useLivePricing } from '../../hooks/usePricingAdmin';

const defaultCollections = [
  {
    id: 'copii',
    title: 'Copii',
    titleFull: 'Album cu pozele copiilor',
    image: '/images/newborn.webp',
    link: '/colectie/copii',
    emotionalText: 'Copiii cresc în fiecare zi. Pozele rămân în telefon.',
    priceType: 'pagini-groase',
  },
  {
    id: 'nunti',
    title: 'Nuntă',
    titleFull: 'Album cu poze de la nuntă',
    image: '/images/nunta.webp',
    link: '/colectie/nunti',
    emotionalText: '2000 de poze de la nuntă. Câte le-ai mai răsfoit?',
    priceType: 'pagini-groase',
  },
  {
    id: 'bunici',
    title: 'Newborn',
    titleFull: 'Album cu pozele de la newborn',
    image: '/images/familie.webp',
    link: '/colectie/familie',
    emotionalText: 'Primele zile sunt irepetabile. Pune-le într-un album.',
    priceType: 'pagini-groase',
  },
  {
    id: 'telefon',
    title: 'Zi de naștere',
    titleFull: 'Album cu pozele de zi de naștere',
    image: '/images/familie.webp',
    link: '/colectie/toate',
    emotionalText: 'Fiecare zi de naștere e unică. Fă-le un album.',
    priceType: 'pagini-subtiri',
  },
];

/* ─── Firebase helpers ─── */
async function uploadOriginalImage(cardId, file) {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const ext = file.name?.split('.').pop() || 'jpg';
  const ts = Date.now();
  const path = `homepage/collection-cards/${cardId}_${ts}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: 'public, max-age=86400' });
  return await getDownloadURL(storageRef);
}

async function saveCardData(cardId, data) {
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'homepage_images', cardId), { ...data, updated_at: new Date().toISOString() }, { merge: true });
}

async function loadAllCards() {
  try {
    const { collection: col, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(col(db, 'homepage_images'));
    const map = {};
    snap.forEach((d) => { map[d.id] = d.data(); });
    // Admin panel saves images as img_bunici etc in 'texts' doc — merge them
    const textsDoc = map.texts || {};
    const imgMap = { img_bunici: 'bunici', img_copii: 'copii', img_nunti: 'nunti', img_telefon: 'telefon' };
    Object.entries(imgMap).forEach(([key, cardId]) => {
      if (textsDoc[key]) {
        map[cardId] = { ...map[cardId], url: textsDoc[key] };
      }
    });
    return map;
  } catch { return {}; }
}

/* ─── Zoom bar (appears under card in edit mode when image is custom) ─── */
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

/* ─── Desktop Card ─── */
function CollectionCard({ col, cardData, editMode, onUpdate, getPrice, pricingLoading }) {
  const fileRef = useRef(null);
  const titleRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const imgSrc = cardData?.url || col.image;
  // Forțăm titlul din defaults — admin poate edita inline
  const titleText = col.titleFull;
  const zoom = cardData?.zoom || 1;
  const posX = cardData?.posX || 50;
  const posY = cardData?.posY || 50;
  const hasCustom = !!cardData?.url;

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setUploading(true);
    const url = await uploadOriginalImage(col.id, f);
    const data = { url, zoom: 1, posX: 50, posY: 50 };
    await saveCardData(col.id, data);
    onUpdate(col.id, { ...cardData, ...data });
    setUploading(false);
  };

  const handleZoom = async (z) => {
    const data = { ...cardData, zoom: z };
    onUpdate(col.id, data);
    await saveCardData(col.id, { zoom: z });
  };

  // Drag to reposition image inside mask
  const handlePointerDown = (e) => {
    if (!editMode || !hasCustom) return;
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
    onUpdate(col.id, { ...cardData, posX: nx, posY: ny });
  };

  const handlePointerUp = async () => {
    if (!dragging) return;
    setDragging(false);
    await saveCardData(col.id, { posX: cardData?.posX || 50, posY: cardData?.posY || 50 });
  };

  const handleTitleBlur = () => {
    const t = titleRef.current?.innerText?.trim();
    if (t && t !== titleText) {
      saveCardData(col.id, { titleFull: t });
      onUpdate(col.id, { ...cardData, titleFull: t });
    }
  };

  const imgStyle = hasCustom ? {
    objectPosition: `${posX}% ${posY}%`,
    transform: `scale(${zoom})`,
  } : {};

  const Wrapper = editMode ? 'div' : Link;
  const wrapperProps = editMode
    ? { className: 'relative block overflow-hidden group aspect-[3/4] cursor-default' }
    : { to: col.link, className: 'relative block overflow-hidden group aspect-[3/4]' };

  const priceValue = col.priceType && !pricingLoading
    ? getPrice('20×20', col.priceType === 'pagini-subtiri' ? 32 : 20, col.priceType)
    : 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 transition-all duration-300" style={{ boxShadow: '0 5px 40px rgba(0,0,0,0.06)' }}>
      {/* Image */}
      <div
        className={`relative aspect-[3/4] overflow-hidden ${editMode && hasCustom ? 'cursor-move' : ''}`}
        onPointerDown={editMode && hasCustom ? handlePointerDown : undefined}
        onPointerMove={editMode && hasCustom ? handlePointerMove : undefined}
        onPointerUp={editMode && hasCustom ? handlePointerUp : undefined}
        onPointerCancel={editMode && hasCustom ? handlePointerUp : undefined}
      >
        <img src={imgSrc} alt={titleText}
          className="absolute inset-0 w-full h-full object-cover object-[center_30%] transition-transform duration-300"
          style={imgStyle}
          draggable={false}
        />

        {editMode && (
          <>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
              className={`absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg cursor-pointer transition ${uploading ? 'animate-pulse' : ''}`}
              title="Schimbă poza"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              )}
            </button>
            {hasCustom && (
              <div className="absolute top-3 left-3 z-20 bg-black/50 text-white text-[9px] px-2 py-1 rounded-full pointer-events-none">
                Trage poza
              </div>
            )}
          </>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {editMode ? (
          <h3 ref={titleRef} contentEditable suppressContentEditableWarning
            onBlur={handleTitleBlur}
            onClick={(e) => e.stopPropagation()}
            className="text-[14px] md:text-[16px] text-[#1c1c1c] leading-snug outline-none ring-1 ring-[#3D6B5E]/30 rounded px-1 -mx-1 cursor-text mb-2"
            style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
            {titleText}
          </h3>
        ) : (
          <h3 className="text-[14px] md:text-[16px] text-[#1c1c1c] leading-snug mb-2"
            style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
            {titleText}
          </h3>
        )}

        <Link
          to="/colectie/toate"
          className="block w-full py-3 text-center text-[13px] font-semibold text-white bg-[#1c1c1c] rounded-full no-underline hover:bg-[#333] active:scale-[0.97] transition-all"
        >
          Alege design
        </Link>
      </div>

      {editMode && hasCustom && <div className="px-5 pb-3"><ZoomBar zoom={zoom} onZoom={handleZoom} /></div>}
    </div>
  );
}

/* ─── Mobile Card ─── */
function MobileCard({ col, cardData, editMode, onUpdate, getPrice, pricingLoading }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const imgSrc = cardData?.url || col.image;
  const zoom = cardData?.zoom || 1;
  const posX = cardData?.posX || 50;
  const posY = cardData?.posY || 50;
  const hasCustom = !!cardData?.url;

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setUploading(true);
    const url = await uploadOriginalImage(col.id, f);
    const data = { url, zoom: 1, posX: 50, posY: 50 };
    await saveCardData(col.id, data);
    onUpdate(col.id, { ...cardData, ...data });
    setUploading(false);
  };

  const handlePointerDown = (e) => {
    if (!editMode || !hasCustom) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: posX, oy: posY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e) => {
    if (!dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.x) / rect.width) * -100;
    const dy = ((e.clientY - dragStart.current.y) / rect.height) * -100;
    onUpdate(col.id, { ...cardData, posX: Math.max(0, Math.min(100, dragStart.current.ox + dx)), posY: Math.max(0, Math.min(100, dragStart.current.oy + dy)) });
  };
  const handlePointerUp = async () => {
    if (!dragging) return;
    setDragging(false);
    await saveCardData(col.id, { posX: cardData?.posX || 50, posY: cardData?.posY || 50 });
  };

  const imgStyle = hasCustom ? { objectPosition: `${posX}% ${posY}%`, transform: `scale(${zoom})` } : {};

  const Wrapper = editMode ? 'div' : Link;
  const wrapperProps = editMode
    ? { className: 'relative block overflow-hidden rounded-lg aspect-[3/4] no-underline cursor-default' }
    : { to: col.link, className: 'relative block overflow-hidden rounded-lg aspect-[3/4] no-underline' };

  const titleText = col.titleFull;
  const priceValue = col.priceType && !pricingLoading
    ? getPrice('20×20', col.priceType === 'pagini-subtiri' ? 32 : 20, col.priceType)
    : 0;

  return (
    <div className="bg-white rounded-xl overflow-hidden flex flex-col" style={{ boxShadow: '0 5px 40px rgba(0,0,0,0.06)' }}>
      {/* Image */}
      <div
        className={`relative aspect-[3/4] overflow-hidden ${editMode && hasCustom ? 'cursor-move' : ''}`}
        onPointerDown={editMode && hasCustom ? handlePointerDown : undefined}
        onPointerMove={editMode && hasCustom ? handlePointerMove : undefined}
        onPointerUp={editMode && hasCustom ? handlePointerUp : undefined}
      >
        <img src={imgSrc} alt={col.titleFull} className="absolute inset-0 w-full h-full object-cover object-[center_30%]" style={imgStyle} draggable={false} />

        {editMode && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
            className={`absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-md cursor-pointer ${uploading ? 'animate-pulse' : ''}`}
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

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-[14px] text-[#1c1c1c] leading-snug mb-1"
          style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
          {titleText}
        </h3>
        <Link
          to="/colectie/toate"
          className="block w-full py-2 text-center text-[13px] font-semibold text-white bg-[#1c1c1c] rounded-full no-underline active:scale-[0.97] transition-all"
        >
          Alege design
        </Link>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function CollectionCards() {
  const editMode = useCmsStore((s) => s.editMode);
  const [cards, setCards] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [visibleCollections, setVisibleCollections] = useState(defaultCollections);
  const { getPrice, loading: pricingLoading } = useLivePricing();

  useEffect(() => {
    let cancelled = false;
    loadAllCards().then((data) => {
      if (!cancelled) { setCards(data); setLoaded(true); }
    });
    return () => { cancelled = true; };
  }, []);

  const handleUpdate = (id, data) => {
    setCards((prev) => ({ ...prev, [id]: data }));
  };

  if (!loaded) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_,i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-[#f0f0f0] animate-pulse" />)}</div>;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto sm:hidden pb-2 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {visibleCollections.map((col) => (
          <div key={col.id} className="shrink-0 w-[42vw] snap-start">
            <MobileCard col={col} cardData={cards[col.id]} editMode={editMode} onUpdate={handleUpdate} getPrice={getPrice} pricingLoading={pricingLoading} />
          </div>
        ))}
      </div>
      <div className="hidden sm:grid sm:grid-cols-4 gap-4">
        {visibleCollections.slice(0, 4).map((col) => (
          <CollectionCard key={col.id} col={col} cardData={cards[col.id]} editMode={editMode} onUpdate={handleUpdate} getPrice={getPrice} pricingLoading={pricingLoading} />
        ))}
      </div>
    </>
  );
}
