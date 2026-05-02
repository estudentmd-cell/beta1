/**
 * Shared carousel component for banner image slots.
 * Supports multiple images with auto-rotate, swipe, and per-slot CMS upload.
 */
import { useRef, useState, useEffect } from 'react';
import { db, storage } from '../../firebase/config';

const MAX_SLOTS = 4;

async function uploadSlotImage(collection, slotIdx, file) {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const ext = file.name?.split('.').pop() || 'jpg';
  const ts = Date.now();
  const storageRef = ref(storage, `homepage/${collection}/slot${slotIdx}_${ts}.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: 'public, max-age=86400' });
  return await getDownloadURL(storageRef);
}

async function saveImages(docPath, images) {
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, ...docPath), { images, updated_at: new Date().toISOString() }, { merge: true });
}

async function loadImages(docPath) {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, ...docPath));
    return snap.exists() ? (snap.data().images || []) : [];
  } catch { return []; }
}

export function useBannerCarousel(collection, docPath, fallbackImage) {
  const [images, setImages] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadImages(docPath).then(async (imgs) => {
      if (cancelled) return;
      if (imgs.length > 0) {
        setImages(imgs);
      } else {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const textsSnap = await getDoc(doc(db, docPath[0], 'texts'));
          if (cancelled) return;
          const textsData = textsSnap.exists() ? textsSnap.data() : {};
          if (textsData.image) {
            setImages([textsData.image]);
          } else {
            setImages([fallbackImage]);
          }
        } catch {
          if (!cancelled) setImages([fallbackImage]);
        }
      }
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const handleUpload = async (slotIdx, file) => {
    const url = await uploadSlotImage(collection, slotIdx, file);
    const updated = [...images];
    updated[slotIdx] = url;
    setImages(updated);
    await saveImages(docPath, updated);
    return url;
  };

  const addSlot = async () => {
    if (images.length >= MAX_SLOTS) return;
    const updated = [...images, fallbackImage];
    setImages(updated);
    await saveImages(docPath, updated);
  };

  const removeSlot = async (idx) => {
    if (images.length <= 1) return;
    const updated = images.filter((_, i) => i !== idx);
    setImages(updated);
    await saveImages(docPath, updated);
  };

  return { images, loaded, handleUpload, addSlot, removeSlot };
}

export default function BannerCarousel({ images, editMode, onUpload, onAdd, onRemove }) {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef(null);

  // Auto-rotate
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, [images.length]);

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStart.current === null || images.length <= 1) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      setCurrent(c => diff > 0 ? (c + 1) % images.length : (c - 1 + images.length) % images.length);
    }
    touchStart.current = null;
  };

  return (
    <div
      role="region"
      aria-label="Carousel imagini"
      className="absolute inset-0 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Images */}
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt="Banner imagine"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          loading={i === 0 ? 'eager' : 'lazy'}
          draggable={false}
        />
      ))}

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(i); }}
              aria-label={`Imagine ${i + 1}`}
              className={`h-[3px] rounded-full transition-all ${i === current ? 'w-5 bg-white' : 'w-2 bg-white/50'}`}
            />
          ))}
        </div>
      )}

      {/* Edit controls */}
      {editMode && (
        <div className="absolute top-3 right-3 z-30 flex gap-2">
          {/* Upload current slot */}
          <UploadButton
            onFile={(file) => onUpload(current, file)}
          />

          {/* Add slot */}
          {images.length < MAX_SLOTS && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd(); }}
              className="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md text-[16px] text-[#1c1c1c] font-bold"
              title="Adaugă imagine"
            >+</button>
          )}

          {/* Remove current slot */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(current); setCurrent(0); }}
              className="w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center shadow-md text-white text-[14px] font-bold"
              title="Șterge imaginea curentă"
            >×</button>
          )}

          {/* Slot indicator */}
          <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded-full self-center">
            {current + 1}/{images.length}
          </span>
        </div>
      )}
    </div>
  );
}

function UploadButton({ onFile }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setUploading(true);
    await onFile(f);
    setUploading(false);
  };

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); ref.current?.click(); }}
        className={`w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md cursor-pointer transition ${uploading ? 'animate-pulse' : ''}`}
        title="Schimbă imaginea"
      >
        {uploading ? (
          <div className="w-3 h-3 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
          </svg>
        )}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </>
  );
}
