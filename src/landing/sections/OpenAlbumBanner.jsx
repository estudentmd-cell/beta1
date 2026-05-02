import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useCmsStore from '../../components/cms/useCmsStore';
import { db, storage } from '../../firebase/config';
import { useBlockContent, EditableText } from './useBlockContent';

const SLOTS = ['img1', 'img2', 'img3', 'img4', 'img5', 'img6'];
const PLACEHOLDERS = [
  '/images/familie.webp',
  '/images/newborn.webp',
  '/images/nunta.webp',
  '/images/familie.webp',
  '/images/newborn.webp',
  '/images/nunta.webp',
];

async function uploadGalleryImage(slotId, file) {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const ext = file.name?.split('.').pop() || 'jpg';
  const ts = Date.now();
  const storageRef = ref(storage, `homepage/open-album-gallery/${slotId}_${ts}.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: 'public, max-age=86400' });
  return await getDownloadURL(storageRef);
}

async function saveGalleryData(data) {
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'homepage_openalbum', 'gallery'), { ...data, updated_at: new Date().toISOString() }, { merge: true });
}

async function loadGalleryData() {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    // Check both locations (admin saves to open-album-gallery, inline saves to homepage_openalbum)
    const snap1 = await getDoc(doc(db, 'open-album-gallery', 'gallery'));
    const snap2 = await getDoc(doc(db, 'homepage_openalbum', 'gallery'));
    const data1 = snap1.exists() ? snap1.data() : {};
    const data2 = snap2.exists() ? snap2.data() : {};
    // Admin (open-album-gallery) has priority
    return { ...data2, ...data1 };
  } catch { return {}; }
}

/* ─── Single gallery cell ─── */
function GalleryCell({ slotId, src, editMode, onUpload, className }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setUploading(true);
    const url = await uploadGalleryImage(slotId, f);
    onUpload(slotId, url);
    setUploading(false);
  };

  return (
    <div className={`relative overflow-hidden rounded-xl bg-[#EEEAE5] ${className}`}>
      <img src={src} alt="Album deschis" className="absolute inset-0 w-full h-full object-cover" loading="lazy" draggable={false} />

      {editMode && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
          className={`absolute top-2 right-2 z-30 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md cursor-pointer transition ${uploading ? 'animate-pulse' : ''}`}
        >
          {uploading ? (
            <div className="w-3 h-3 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
          )}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

export default function OpenAlbumBanner() {
  const editMode = useCmsStore((s) => s.editMode);
  const [gallery, setGallery] = useState({});
  const [loaded, setLoaded] = useState(false);
  const { data: texts, save: saveText } = useBlockContent('homepage_openalbum', 'texts', {
    title: 'Așa arată pozele tale tipărite',
    subtitle: 'Hârtie premium, culori vii, pagini groase. Nu e un ecran — e ceva ce poți ține în mână.',
    cta: 'Vezi colecția de design-uri →',
  });

  useEffect(() => {
    let cancelled = false;
    loadGalleryData().then((d) => { if (!cancelled) { setGallery(d); setLoaded(true); } });
    return () => { cancelled = true; };
  }, []);

  const handleUpload = async (slotId, url) => {
    const updated = { ...gallery, [slotId]: url };
    setGallery(updated);
    await saveGalleryData(updated);
  };

  const getImg = (i) => gallery[SLOTS[i]] || PLACEHOLDERS[i];

  if (!loaded) return <div className="py-10 sm:py-16"><div className="max-w-[1360px] mx-auto px-4"><div className="h-[300px] sm:h-[400px] bg-[#F5F1EB] rounded-2xl animate-pulse" /></div></div>;

  return (
    <section className="py-10 sm:py-16 md:py-20 bg-white">
      <div className="max-w-[1360px] mx-auto px-4 md:px-12">

        {/* Header */}
        <div className="text-center mb-6 sm:mb-10">
          <EditableText value={texts.title} field="title" editMode={editMode} onSave={saveText} as="h2"
            className="text-[28px] sm:text-[30px] md:text-[38px] text-[#1c1c1c] leading-[1.15]"
            style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
          />
          <EditableText value={texts.subtitle} field="subtitle" editMode={editMode} onSave={saveText}
            className="text-[15px] sm:text-[16px] text-[#888] mt-2 max-w-[500px] mx-auto"
          />
        </div>

        {/* ═══ MOBILE — horizontal scroll, larger cards ═══ */}
        <style>{`.gallery-scroll-m::-webkit-scrollbar { display: none; }`}</style>
        <div aria-label="Galerie album deschis" className="sm:hidden gallery-scroll-m overflow-x-auto -mx-4 px-4 pb-2"
          style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          <div className="flex gap-3" style={{ width: 'max-content', paddingRight: '16px' }}>
            {SLOTS.map((slot, i) => (
              <div key={slot} className="flex-shrink-0 rounded-xl overflow-hidden" style={{ width: '200px', scrollSnapAlign: 'start', boxShadow: '0 5px 40px rgba(0,0,0,0.06)' }}>
                <GalleryCell slotId={slot} src={getImg(i)} editMode={editMode} onUpload={handleUpload} className="aspect-[3/4]" />
              </div>
            ))}
          </div>
        </div>

        {/* ═══ DESKTOP — mosaic grid ═══ */}
        <div className="hidden sm:grid grid-cols-4 grid-rows-2 gap-3 md:gap-4" style={{ height: '420px' }}>
          {/* Large left */}
          <GalleryCell slotId="img1" src={getImg(0)} editMode={editMode} onUpload={handleUpload} className="col-span-2 row-span-2" />
          {/* Top right 2 */}
          <GalleryCell slotId="img2" src={getImg(1)} editMode={editMode} onUpload={handleUpload} className="" />
          <GalleryCell slotId="img3" src={getImg(2)} editMode={editMode} onUpload={handleUpload} className="" />
          {/* Bottom right 2 */}
          <GalleryCell slotId="img4" src={getImg(3)} editMode={editMode} onUpload={handleUpload} className="" />
          <GalleryCell slotId="img5" src={getImg(4)} editMode={editMode} onUpload={handleUpload} className="" />
        </div>

        {/* CTA */}
        <div className="text-center mt-6 sm:mt-8">
          <Link
            to="/colectie/toate"
            className="inline-flex items-center justify-center px-7 py-3.5 bg-[#1c1c1c] text-white text-[15px] font-semibold rounded-full no-underline hover:bg-[#333] active:scale-[0.97] transition-all"
          >
            Vezi colecția de design-uri →
          </Link>
        </div>
      </div>
    </section>
  );
}
