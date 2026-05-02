import { useRef, useCallback, useState } from 'react';
import useCmsStore from './useCmsStore';
import { storage } from '../../firebase/config';

export default function EditableImage({ id, defaultSrc, className = '', alt = '', imgClassName = '', onLoad }) {
  const inputRef = useRef(null);
  const editMode = useCmsStore((s) => s.editMode);
  const src = useCmsStore((s) => s.get(id, defaultSrc));
  const update = useCmsStore((s) => s.update);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file) => {
    if (!file?.type?.startsWith('image/')) return;
    setUploading(true);

    let url;
    if (storage) {
      try {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const storageRef = ref(storage, `cms/${id}`);
        await uploadBytes(storageRef, file);
        url = await getDownloadURL(storageRef);
      } catch (e) {
        console.warn('CMS image upload failed:', e);
        url = URL.createObjectURL(file);
      }
    } else {
      url = URL.createObjectURL(file);
    }

    update(id, url, 'image');
    setUploading(false);
  }, [id, update]);

  const hasSrc = src && src.length > 0;

  return (
    <div
      className={`relative group/img ${className} ${editMode ? 'cms-editable-img' : ''}`}
      onClick={(e) => { if (editMode) { e.preventDefault(); e.stopPropagation(); inputRef.current?.click(); } }}
      onDragEnter={editMode ? (e) => { e.preventDefault(); setDragging(true); } : undefined}
      onDragOver={editMode ? (e) => { e.preventDefault(); setDragging(true); } : undefined}
      onDragLeave={editMode ? () => setDragging(false) : undefined}
      onDrop={editMode ? (e) => {
        e.preventDefault(); e.stopPropagation(); setDragging(false);
        const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
      } : undefined}
    >
      {hasSrc ? (
        <img
          src={src}
          alt={alt}
          className={imgClassName || 'w-full h-full object-cover'}
          onLoad={onLoad}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300 text-4xl">
          📷
        </div>
      )}

      {/* Edit overlay — stil Tilda */}
      {editMode && (
        <>
          {/* Hover border highlight */}
          <div className={`absolute inset-0 rounded-inherit pointer-events-none transition-all duration-200 ${
            dragging
              ? 'ring-2 ring-blue-500 bg-blue-500/15'
              : 'ring-0 group-hover/img:ring-2 group-hover/img:ring-[#3D6B5E]'
          }`} />

          {/* Center action */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-1.5 transition-opacity duration-200 cursor-pointer ${
            dragging ? 'opacity-100' : 'opacity-0 group-hover/img:opacity-100'
          }`}
            style={{ background: 'rgba(0,0,0,0.35)' }}
          >
            {uploading ? (
              <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span className="text-white text-[11px] font-medium">
                  {dragging ? 'Eliberează pentru upload' : hasSrc ? 'Schimbă imaginea' : 'Adaugă imagine'}
                </span>
              </>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
        </>
      )}
    </div>
  );
}
