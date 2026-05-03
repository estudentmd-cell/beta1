import { useRef, useState, useCallback, memo, useEffect, useMemo, lazy, Suspense } from 'react';
import useEditorStore, { getUploadPctMap } from '../../stores/useEditorStore';
import useAuthStore from '../../stores/useAuthStore';
import useUIStore from '../../stores/useUIStore';
import LazyImage from './LazyImage';

const PhotoGalleryPopup = lazy(() => import('./PhotoGalleryPopup'));

const PhotoItem = memo(function PhotoItem({ photo, idx, onDragStart, onDragOver, onDrop, onDragEnd, onClick, onRemove, isReorderFrom, isDragTarget }) {
  const isReady = !!photo.storageUrl;
  return (
    <div
      draggable={isReady}
      onDragStart={(e) => isReady ? onDragStart(e, photo, idx) : e.preventDefault()}
      onDragOver={(e) => onDragOver(e, idx)}
      onDrop={(e) => onDrop(e, idx)}
      onDragEnd={onDragEnd}
      onClick={() => isReady && !photo.used && onClick(photo.id)}
      className={`relative mb-1 rounded-[4px] overflow-hidden group break-inside-avoid transition-all ${
        !isReady ? 'cursor-default pointer-events-none' :
        photo.used ? 'cursor-default' : 'cursor-grab hover:brightness-95 active:scale-[0.97]'
      } ${isReorderFrom ? 'opacity-40 scale-95' : ''
      } ${isDragTarget ? 'ring-2 ring-ac scale-[1.02]' : ''}`}
    >
      {isReady ? (
        <img
          src={photo.thumbData || photo.previewUrl || photo.storageUrl}
          alt={photo.fileName}
          className="w-full aspect-square object-cover block rounded-[4px]"
          draggable={false}
          decoding="async"
          loading="lazy"
          style={{ animation: 'fadeSlideIn 0.4s ease-out both' }}
        />
      ) : (
        <div className="w-full aspect-square bg-gradient-to-b from-[#F5F1EB] to-[#EBE7E0] rounded-[4px] relative overflow-hidden">
          {/* Shimmer animation */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
          {/* Upload ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#3D6B5E]/15 border-t-[#3D6B5E]/40 rounded-full animate-spin" />
          </div>
        </div>
      )}
      <span className="absolute top-0.5 left-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-black/50 text-white text-[8px] font-bold px-1 pointer-events-none">
        {idx + 1}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }}
        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white/90 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
        title="Șterge din galerie"
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {photo.used && (
        <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-sm bg-[#3B82F6] flex items-center justify-center shadow-sm">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
      {isDragTarget && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-ac rounded-full" />
      )}
      {/* File name */}
      {photo.fileName && (
        <p className="text-[9px] text-[#8A8078] text-center mt-0.5 truncate px-0.5 leading-tight">{photo.fileName}</p>
      )}
    </div>
  );
});

function fmtBytes(b) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + ' MB';
  return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function fmtSpeed(bps) {
  if (bps <= 0) return '';
  if (bps < 1024 * 1024) return (bps / 1024).toFixed(0) + ' KB/s';
  return (bps / (1024 * 1024)).toFixed(1) + ' MB/s';
}

const TIER_LABELS = { micro: 'Original', small: 'Max calitate', medium: 'Calitate înaltă', large: 'Optimizat', bulk: 'Comprimat' };

function SidebarUploadBar() {
  return null; // Dezactivat — progresul se arată doar în UploadWidget
  const isUploading = useEditorStore(s => s.isUploading);
  const uploadedCount = useEditorStore(s => s.uploadedCount);
  const uploadTotalCount = useEditorStore(s => s.uploadTotalCount);
  const uploadProgress = useEditorStore(s => s.uploadProgress);
  const uploadBytesSent = useEditorStore(s => s.uploadBytesSent);
  const uploadBytesTotal = useEditorStore(s => s.uploadBytesTotal);
  const uploadSpeed = useEditorStore(s => s.uploadSpeed);
  const uploadTier = useEditorStore(s => s.uploadTier);
  const _tick = useEditorStore(s => s._uploadTick);
  const photos = useEditorStore(s => s.photos);
  const justDone = !isUploading && uploadTotalCount > 0 && uploadedCount >= uploadTotalCount;
  if (!isUploading && !justDone) return null;

  const pct = uploadProgress || 0;
  const speed = fmtSpeed(uploadSpeed);
  const remaining = Math.max(0, uploadBytesTotal - uploadBytesSent);
  const eta = uploadSpeed > 0 ? (remaining / uploadSpeed < 60 ? `~${Math.ceil(remaining / uploadSpeed)}s` : `~${Math.ceil(remaining / uploadSpeed / 60)}min`) : '';
  const tierLabel = TIER_LABELS[uploadTier] || '';

  // Show last 3 completed photos (with thumbs) for visual feedback
  const pctMap = getUploadPctMap();
  const activePhotos = photos.filter(p => p.thumbData && p.cloudinaryId).slice(-3).reverse();

  return (
    <div className="mx-1.5 mb-2 bg-[#FAF8F5] border border-[#E8E4DB] rounded-xl overflow-hidden animate-[fadeIn_0.3s_ease]">
      {/* Stats header */}
      <div className="px-2.5 pt-2 pb-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-[#1c1c1c]">
            {justDone ? `✓ ${uploadTotalCount} încărcate` : `${pct}% · ${uploadedCount}/${uploadTotalCount} gata`}
          </span>
          {tierLabel && !justDone && (
            <span className="text-[8px] text-[#3D6B5E] font-medium bg-[#E8F2ED] px-1.5 py-0.5 rounded-full">{tierLabel}</span>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-[#E8E4DB] rounded-full overflow-hidden mb-1">
          <div
            className={`h-full rounded-full transition-all duration-300 ${justDone ? 'bg-[#3D8B5E]' : 'bg-[#3D6B5E]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Bytes + speed + ETA */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[#5C544B]">
            {fmtBytes(uploadBytesSent)} / {fmtBytes(uploadBytesTotal)}
          </span>
          {!justDone && (
            <span className="text-[9px] text-[#8A8078]">
              {speed}{eta ? ` · ${eta}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Active file thumbnails */}
      {activePhotos.length > 0 && (
        <div className="px-2 pb-2 flex gap-1.5">
          {activePhotos.map((photo) => {
            const filePct = pctMap.get(photo.id) ?? 0;
            return (
              <div key={photo.id} className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#E8E4DB] shrink-0">
                {(photo.thumbData || photo.blob) ? (
                  <img src={photo.thumbData || photo.blob} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#F5F1EB] to-[#E8E4DB] relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite]"
                      style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)' }} />
                  </div>
                )}
                {/* Mini progress overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/20">
                  <div className="h-full bg-[#3D6B5E] transition-all duration-300" style={{ width: `${filePct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

function EmotionalBar({ photos }) {
  const total = photos.length;
  const used = photos.filter((p) => p.used).length;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const color = pct < 30 ? 'bg-danger' : pct < 70 ? 'bg-warn' : 'bg-ok';
  const msg = total === 0
    ? 'Adaugă poze pentru a începe albumul.'
    : pct < 30 ? 'Ai multe poze disponibile. Adaugă-le în album!'
    : pct < 70 ? 'Bun progres! Continuă să aranjezi.'
    : pct < 100 ? 'Aproape gata! Mai ai câteva poze.'
    : 'Toate pozele sunt plasate!';

  return (
    <div className="px-3 py-2">
      <div className="h-1.5 bg-bg-2 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-tx-3 mt-1">{msg}</p>
    </div>
  );
}

export default function EditorSidebar({ onOpenLightbox }) {
  // Granular selectors — sidebar only re-renders when photos/gap change, NOT on layout/spread changes
  const photos = useEditorStore((s) => s.photos);
  const addPhotos = useEditorStore((s) => s.addPhotos);
  const gapMM = useEditorStore((s) => s.gapMM);
  const setGap = useEditorStore((s) => s.setGap);
  const placePhoto = useEditorStore((s) => s.placePhoto);
  const removePhoto = useEditorStore((s) => s.removePhoto);
  const reorderPhoto = useEditorStore((s) => s.reorderPhoto);
  const sortByDate = useEditorStore((s) => s.sortByDate);
  const sortByName = useEditorStore((s) => s.sortByName);
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [reorderFrom, setReorderFrom] = useState(null);
  const [reorderOver, setReorderOver] = useState(null);
  const [hideUsed, setHideUsed] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [sidebarSort, setSidebarSort] = useState(null);
  const [sortOpen, setSortOpen] = useState(false);

  const SORT_LABELS = { name: 'Pe nume', exif: 'Data foto', used: 'Utilizare', orient: 'Orientare' };

  const handleSidebarSort = (sortId) => {
    setSidebarSort(sortId);
    if (!sortId) return;
    const all = useEditorStore.getState().photos;
    let sorted;
    switch (sortId) {
      case 'name':
        sorted = [...all].sort((a, b) => (a.fileName || '').localeCompare(b.fileName || '', undefined, { numeric: true }));
        break;
      case 'exif':
        sorted = [...all].sort((a, b) => {
          const da = a.exifDate || ''; const db = b.exifDate || '';
          if (da && db) return db.localeCompare(da);
          if (da) return -1; if (db) return 1;
          return (b.fileName || '').localeCompare(a.fileName || '', undefined, { numeric: true });
        });
        break;
      case 'used':
        sorted = [...all].sort((a, b) => (a.used === b.used ? 0 : a.used ? 1 : -1));
        break;
      case 'orient':
        sorted = [...all].sort((a, b) => {
          const oa = a.origW && a.origH ? (a.origH > a.origW ? 0 : a.origH === a.origW ? 1 : 2) : 3;
          const ob = b.origW && b.origH ? (b.origH > b.origW ? 0 : b.origH === b.origW ? 1 : 2) : 3;
          return oa - ob;
        });
        break;
      default: return;
    }
    useEditorStore.getState().reorderPhotos(sorted.map(p => p.id));
  };

  // Auth required before ANY upload (security: real Firebase UID needed for storage rules)
  const needsAuth = () => {
    const { user, authMethod } = useAuthStore.getState();
    // Has real Firebase auth (Google, email link, or anonymous from invitation)
    const hasRealAuth = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
    return !hasRealAuth;
  };

  const showAuthModal = () => {
    useUIStore.getState().openModal('auth', {
      stayOnPage: true,
      hideSkip: true,
      title: 'Protejează-ți albumul',
      subtitle: 'Conectează-te pentru a salva pozele în siguranță și a reveni oricând la albumul tău',
    });
  };

  const handleFiles = (e) => {
    if (e.target.files?.length) {
      if (needsAuth()) { showAuthModal(); e.target.value = ''; return; }
      addPhotos(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      if (needsAuth()) { showAuthModal(); return; }
      addPhotos(e.dataTransfer.files);
    }
  };

  const handleDragStart = (e, photo, idx) => {
    // Check if this is a gallery reorder drag or a place-on-canvas drag
    if (photo.used) { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', photo.id);
    e.dataTransfer.setData('text/gallery-idx', String(idx));
    e.dataTransfer.effectAllowed = 'copyMove';
    setReorderFrom(idx);
  };

  const handleGalleryDragOver = (e, idx) => {
    e.preventDefault();
    if (reorderFrom !== null && reorderFrom !== idx) {
      setReorderOver(idx);
    }
  };

  const handleGalleryDrop = (e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    const fromIdx = parseInt(e.dataTransfer.getData('text/gallery-idx'));
    if (!isNaN(fromIdx) && fromIdx !== idx) {
      reorderPhoto(fromIdx, idx);
    }
    setReorderFrom(null);
    setReorderOver(null);
  };

  const handleGalleryDragEnd = () => {
    setReorderFrom(null);
    setReorderOver(null);
  };

  const usedCount = photos.filter((p) => p.used).length;

  // Respectă ordinea din store (setată de galerie) — doar filtrare hideUsed
  const sortedPhotos = useMemo(() => {
    return hideUsed ? photos.filter(p => !p.used) : photos;
  }, [photos, hideUsed]);

  return (
    <div className="w-[220px] lg:w-[260px] xl:w-[280px] flex flex-col shrink-0 overflow-hidden bg-white"
      style={{ borderRight: '1px solid #E5E5EA' }}>

      {/* Upload button — prominent */}
      <div
        className={`p-3 ${dragOver ? 'bg-[#EAF0EC]' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic" onChange={handleFiles} className="hidden" />
        <button onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-1.5 bg-[#3D6B5E] text-white rounded-lg h-[34px] text-[12px] font-semibold hover:bg-[#2d5445] active:scale-[0.97] transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adauga poze
        </button>
      </div>

      {/* Gallery popup */}
      {showGallery && (
        <Suspense fallback={null}>
          <PhotoGalleryPopup onClose={() => setShowGallery(false)} />
        </Suspense>
      )}

      {/* Stats bar — compact */}
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-bold text-[#1C1C1E]">{photos.length} Fotografii</span>
          <span className="text-[12px] text-[#8E8E93]">{usedCount} plasate</span>
        </div>
        {/* Progress bar */}
        {photos.length > 0 && (
          <div className="h-[3px] bg-[#E5E5EA] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${
              usedCount === 0 ? 'bg-[#FF3B30]' : usedCount < photos.length * 0.7 ? 'bg-[#FF9500]' : 'bg-[#34C759]'
            }`} style={{ width: `${photos.length > 0 ? Math.round((usedCount / photos.length) * 100) : 0}%` }} />
          </div>
        )}
      </div>

      {/* Gap slider */}
      <div className="px-3 py-1.5 flex items-center gap-2 border-b border-[#F2F2F7]">
        <span className="text-[10px] font-semibold text-[#8E8E93] uppercase">Gap</span>
        <input type="range" min="0.25" max="0.5" step="0.25" value={gapMM}
          onChange={(e) => setGap(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-[#3D6B5E] cursor-pointer" />
        <span className="text-[11px] text-[#1C1C1E] font-semibold w-10 text-right">{gapMM}mm</span>
      </div>

      {/* Upload stats */}
      <SidebarUploadBar />

      {/* Sort bar — above photos */}
      {photos.length > 0 && (
        <div className="px-2 py-1.5 border-b border-[#F2F2F7] relative">
          <button onClick={() => setSortOpen(!sortOpen)}
            className={`flex items-center gap-1 px-2.5 h-[26px] rounded-full text-[10px] font-semibold transition ${
              sidebarSort ? 'bg-[#3D6B5E] text-white' : 'text-[#8E8E93] bg-[#F2F2F7] hover:bg-[#E5E5EA]'}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h12M3 18h6"/></svg>
            {sidebarSort ? SORT_LABELS[sidebarSort] : 'Sortare'}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-[10]" onClick={() => setSortOpen(false)} />
              <div className="absolute top-full left-2 mt-1 bg-white rounded-xl shadow-xl border border-[#E5E5EA] py-1 z-[20] min-w-[170px]">
                {[
                  { id: null, label: 'Fără sortare' },
                  { id: 'name', label: 'Pe nume' },
                  { id: 'exif', label: 'După data fotografiei' },
                  { id: 'used', label: 'Prin utilizare' },
                  { id: 'orient', label: 'Prin orientare' },
                ].map(opt => (
                  <button key={opt.id || 'none'} onClick={() => { handleSidebarSort(opt.id); setSortOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 transition hover:bg-[#F2F2F7] ${
                      sidebarSort === opt.id ? 'text-[#3D6B5E] font-semibold' : 'text-[#1C1C1E]'}`}>
                    {sidebarSort === opt.id && <span>✓</span>}
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Photo gallery */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-3">
        {photos.length === 0 ? (
          <div className="text-center py-8 text-tx-4 text-xs">
            <span className="text-2xl block mb-2">📷</span>
            Nicio fotografie încă
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {sortedPhotos.map((photo, sortedIdx) => {
              return (
              <PhotoItem
                key={photo.id}
                photo={photo}
                idx={sortedIdx}
                onDragStart={handleDragStart}
                onDragOver={handleGalleryDragOver}
                onDrop={handleGalleryDrop}
                onDragEnd={handleGalleryDragEnd}
                onClick={placePhoto}
                onRemove={removePhoto}
                isReorderFrom={reorderFrom === sortedIdx}
                isDragTarget={reorderOver === sortedIdx && reorderFrom !== sortedIdx}
              />);
            })}
          </div>
        )}
      </div>
    </div>
  );
}
