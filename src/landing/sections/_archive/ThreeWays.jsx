import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import useCmsStore from '../../components/cms/useCmsStore';
import useAuthStore from '../../stores/useAuthStore';
import { db, storage } from '../../firebase/config';

/* ─── Firebase helpers ─── */
async function uploadWayImage(cardId, file) {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const ext = file.name?.split('.').pop() || 'jpg';
  const path = `homepage/three-ways/${cardId}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: 'public, max-age=31536000' });
  return await getDownloadURL(storageRef);
}

async function saveWayData(cardId, data) {
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'homepage_threeways', cardId), { ...data, updated_at: new Date().toISOString() }, { merge: true });
}

async function loadAllWays() {
  try {
    const { collection: col, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(col(db, 'homepage_threeways'));
    const map = {};
    snap.forEach((d) => { map[d.id] = d.data(); });
    return map;
  } catch { return {}; }
}

/* ─── Zoom bar ─── */
function ZoomBar({ zoom, onZoom, dark }) {
  return (
    <div className="flex items-center gap-2 mt-1.5 px-1">
      <span className={`text-[9px] w-7 text-right ${dark ? 'text-white/40' : 'text-gray-400'}`}>{Math.round(zoom * 100)}%</span>
      <input type="range" min="1" max="3" step="0.05" value={zoom}
        onChange={(e) => onZoom(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-[#3D6B5E] cursor-pointer" />
    </div>
  );
}

const defaultCards = [
  {
    id: 'desktop',
    title: 'Creează de pe calculator',
    bullets: [
      'Cel mai ușor redactor foto din Moldova',
      'Trage pozele, alege layout-ul, gata',
      'Peste 50 de template-uri gratuite',
    ],
    cta: 'Începe albumul →',
    ctaLink: '/editor',
    image: '/images/nunta.webp',
    bg: '#F0EDE8',
  },
  {
    id: 'mobile',
    title: 'Continuă de pe telefon',
    bullets: [
      'Ușor, comod, adaptat special',
      'Adaugă poze direct din galerie',
      'Editezi oricând, de oriunde',
    ],
    cta: null,
    image: '/images/newborn.webp',
    bg: '#E8EDE8',
  },
  {
    id: 'design',
    title: 'Design gratuit de la noi',
    bullets: [
      'Nu ai timp? Noi facem totul',
      'Trimite pozele, primești albumul gata',
      'Serviciu gratuit la orice comandă',
    ],
    cta: 'Solicită design gratuit →',
    ctaLink: '/contact',
    image: '/images/familie.webp',
    bg: '#3D6B5E',
    dark: true,
  },
];

/* ─── Single Way Card with zoom+drag ─── */
function WayCard({ card, cardData, editMode, onUpdate, tall = false }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const imgSrc = cardData?.url || card.image;
  const isDark = card.dark;
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
      const url = await uploadWayImage(card.id, f);
      const data = { url, zoom: 1, posX: 50, posY: 50 };
      await saveWayData(card.id, data);
      onUpdate(card.id, { ...cardData, ...data });
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const handleZoom = async (z) => {
    onUpdate(card.id, { ...cardData, zoom: z });
    await saveWayData(card.id, { zoom: z });
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
    const nx = Math.max(0, Math.min(100, dragStart.current.ox + dx));
    const ny = Math.max(0, Math.min(100, dragStart.current.oy + dy));
    onUpdate(card.id, { ...cardData, posX: nx, posY: ny });
  };

  const handlePointerUp = async () => {
    if (!dragging) return;
    setDragging(false);
    await saveWayData(card.id, { posX: cardData?.posX || 50, posY: cardData?.posY || 50 });
  };

  const imgStyle = hasCustom ? {
    objectPosition: `${posX}% ${posY}%`,
    transform: `scale(${zoom})`,
  } : {};

  return (
    <div
      className={`relative rounded-2xl overflow-hidden group ${tall ? 'h-full' : ''}`}
      style={{ backgroundColor: card.bg }}
    >
      <div className={`relative z-10 p-6 md:p-8 flex flex-col ${tall ? 'h-full' : ''}`}>
        <h3
          className={`text-[20px] md:text-[24px] leading-tight mb-4 ${isDark ? 'text-white' : 'text-[#1c1c1c]'}`}
          style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
        >
          {card.title}
        </h3>

        <ul className={`space-y-2 mb-5 ${isDark ? 'text-white/80' : 'text-[#555]'}`}>
          {card.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] md:text-[14px] leading-snug">
              <span className={`mt-0.5 ${isDark ? 'text-white/60' : 'text-[#3D6B5E]'}`}>✓</span>
              {b}
            </li>
          ))}
        </ul>

        {card.cta && !editMode && (
          <Link
            to={card.ctaLink || '/'}
            className={`inline-block text-[12px] font-semibold px-5 py-2.5 rounded-full transition w-fit no-underline ${
              isDark
                ? 'bg-white text-[#1c1c1c] hover:bg-white/90'
                : 'bg-[#3D6B5E] text-white hover:bg-[#2f5549]'
            }`}
          >
            {card.cta}
          </Link>
        )}

        {/* Image area — masca with zoom+drag */}
        <div
          className={`relative mt-auto pt-5 overflow-hidden rounded-xl ${tall ? 'flex-1 min-h-[200px]' : 'aspect-[16/10]'} ${editMode && hasCustom ? 'cursor-move' : ''}`}
          onPointerDown={editMode && hasCustom ? handlePointerDown : undefined}
          onPointerMove={editMode && hasCustom ? handlePointerMove : undefined}
          onPointerUp={editMode ? handlePointerUp : undefined}
          onPointerCancel={editMode ? handlePointerUp : undefined}
        >
          <img
            src={imgSrc}
            alt={card.title}
            className="w-full h-full object-cover rounded-xl"
            style={imgStyle}
            draggable={false}
          />

          {editMode && dragging && (
            <div className="absolute inset-0 border-2 border-[#3D6B5E] rounded-xl pointer-events-none z-20" />
          )}

          {/* Edit button */}
          {editMode && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
              className={`absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg cursor-pointer transition ${uploading ? 'animate-pulse' : ''}`}
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
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        {/* Zoom bar in edit mode */}
        {editMode && hasCustom && (
          <ZoomBar zoom={zoom} onZoom={handleZoom} dark={isDark} />
        )}
      </div>
    </div>
  );
}

/* ─── Main — Carousel ─── */
export default function ThreeWays() {
  const editMode = useCmsStore((s) => s.editMode);
  const [cards, setCards] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => { loadAllWays().then((d) => { setCards(d); setLoaded(true); }); }, []);

  const handleUpdate = (id, data) => {
    setCards((prev) => ({ ...prev, [id]: data }));
  };

  const prev = () => setCurrent((c) => (c - 1 + defaultCards.length) % defaultCards.length);
  const next = () => setCurrent((c) => (c + 1) % defaultCards.length);

  if (!loaded) return <div className="aspect-[2/1] rounded-2xl bg-[#f0f0f0] animate-pulse" />;

  const card = defaultCards[current];

  return (
    <div>
      <div className="relative">
        <WayCard card={card} cardData={cards[card.id]} editMode={editMode} onUpdate={handleUpdate} />

        {/* Arrows — desktop */}
        <button onClick={prev}
          className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md items-center justify-center hover:bg-gray-50 transition hidden md:flex">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button onClick={next}
          className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md items-center justify-center hover:bg-gray-50 transition hidden md:flex">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Dots + mobile buttons */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {defaultCards.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === current ? 'bg-[#3D6B5E] w-6' : 'bg-gray-300'}`} />
        ))}
      </div>

      {/* Mobile nav */}
      <div className="flex gap-3 mt-3 md:hidden">
        <button onClick={prev} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 transition">← Înapoi</button>
        <button onClick={next} className="flex-1 py-2.5 rounded-xl bg-[#3D6B5E] text-white text-sm font-medium transition">Următorul →</button>
      </div>
    </div>
  );
}
