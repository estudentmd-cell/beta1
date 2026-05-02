import { useState, useEffect, useCallback } from 'react';

export default function Lightbox({ photos, startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(startIndex);

  const photo = photos[idx];
  const total = photos.length;

  const next = useCallback(() => setIdx((i) => Math.min(i + 1, total - 1)), [total]);
  const prev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, next, prev]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center animate-[fadeIn_0.2s_ease]">
      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white text-lg flex items-center justify-center hover:bg-white/20 transition-colors z-10">
        ✕
      </button>

      {/* Prev */}
      <button onClick={prev} disabled={idx === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-20">
        ‹
      </button>

      {/* Image */}
      <img
        src={photo.blob || photo.thumbData}
        alt={photo.fileName}
        className="max-w-[90vw] max-h-[85vh] object-contain select-none"
        draggable={false}
      />

      {/* Next */}
      <button onClick={next} disabled={idx === total - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-20">
        ›
      </button>

      {/* Counter */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
        {idx + 1} / {total}
      </div>

      {/* Caption */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/40 text-xs">
        {photo.origW}×{photo.origH} · {photo.orient === 'H' ? 'Landscape' : photo.orient === 'V' ? 'Portrait' : 'Pătrat'}
        {photo.used ? ' · In album' : ' · Disponibil'}
      </div>
    </div>
  );
}
