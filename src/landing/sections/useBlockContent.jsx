/**
 * Hook + helpers for editable landing page blocks.
 * Each block stores its content in Firestore under a unique doc.
 * In admin editMode, texts become contentEditable inline with visual indicators.
 */
import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase/config';

/* ═══ Hook: load + save block content from Firestore ═══ */
export function useBlockContent(collection, docId, defaults) {
  const [data, setData] = useState(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!db) { setLoaded(true); return; }
    (async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, collection, docId));
        if (!cancelled && snap.exists()) {
          setData({ ...defaults, ...snap.data() });
        }
      } catch {}
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const save = async (field, value) => {
    const updated = { ...data, [field]: value };
    setData(updated);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, collection, docId), { [field]: value, updated_at: new Date().toISOString() }, { merge: true });
    } catch { /* save failed silently */ }
  };

  return { data, loaded, save };
}

/* ═══ EditableText — inline text editing with visual indicators ═══ */
export function EditableText({ value, field, editMode, onSave, className, style, as: Tag = 'p' }) {
  const ref = useRef(null);
  const [saved, setSaved] = useState(false);

  const handleBlur = () => {
    const t = ref.current?.innerText?.trim();
    if (t && t !== value) {
      onSave(field, t);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  if (editMode) {
    return (
      <div className="relative group/edit">
        <Tag
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          className={`${className || ''} outline-none ring-2 ring-[#3D6B5E]/40 ring-offset-2 rounded px-1 -mx-1 cursor-text hover:ring-[#3D6B5E]/70 focus:ring-[#3D6B5E] transition-all`}
          style={style}
        >
          {value}
        </Tag>
        {/* Label */}
        <span className="absolute -top-2 left-2 bg-[#3D6B5E] text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/edit:opacity-100 transition-opacity pointer-events-none z-10">
          {field.replace(/_/g, ' ').toUpperCase()}
        </span>
        {/* Saved indicator */}
        {saved && (
          <span className="absolute -top-2 right-2 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded animate-[fadeIn_0.2s_ease] z-10">
            Salvat
          </span>
        )}
      </div>
    );
  }

  return <Tag className={className} style={style}>{value}</Tag>;
}

/* ═══ IMAGE SIZE GUIDELINES — what dimensions to use ═══ */
const IMAGE_GUIDES = {
  'hero':        { w: 1920, h: 1080, label: 'Hero', ratio: '16:9' },
  'square':      { w: 800,  h: 800,  label: 'Pătrat', ratio: '1:1' },
  'landscape':   { w: 1200, h: 800,  label: 'Landscape', ratio: '3:2' },
  'banner':      { w: 1400, h: 700,  label: 'Banner', ratio: '2:1' },
  'card':        { w: 600,  h: 600,  label: 'Card', ratio: '1:1' },
  'gallery':     { w: 800,  h: 800,  label: 'Galerie', ratio: '1:1' },
};

/* ═══ EditableImage — image with upload button + size guide ═══ */
export function EditableImage({ src, editMode, onUpload, guide = 'square', className = '', alt = '' }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const g = IMAGE_GUIDES[guide] || IMAGE_GUIDES.square;

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setUploading(true);
    await onUpload(f);
    setUploading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className={`relative group/img ${className}`}>
      <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" draggable={false} />

      {editMode && (
        <>
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-all pointer-events-none" />

          {/* Upload button */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); ref.current?.click(); }}
            className={`absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-white/95 hover:bg-white rounded-full pl-2.5 pr-3 py-1.5 shadow-lg cursor-pointer transition ${uploading ? 'animate-pulse' : ''}`}
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
            )}
            <span className="text-[10px] font-semibold text-[#1c1c1c]">Schimbă</span>
          </button>

          {/* Size guide badge */}
          <div className="absolute bottom-2 left-2 z-20 bg-black/70 text-white text-[9px] px-2 py-1 rounded-full pointer-events-none flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 15l4-4 3 3 4-4 7 7"/>
            </svg>
            {g.w}×{g.h}px · {g.ratio}
          </div>

          {/* Saved indicator */}
          {saved && (
            <div className="absolute top-3 left-3 z-30 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-[fadeIn_0.2s_ease]">
              Salvat
            </div>
          )}

          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  );
}
