import { useState, useRef, useCallback, useEffect } from 'react';
import useEditorStore from '../../stores/useEditorStore';
import LazyImage from './LazyImage';

export default function MobilePhotoSheet({ onClose, replaceLeafId = null }) {
  const photos = useEditorStore((s) => s.photos);
  const placePhoto = useEditorStore((s) => s.placePhoto);
  const removePhoto = useEditorStore((s) => s.removePhoto);
  const spreads = useEditorStore((s) => s.spreads);
  const currentSpread = useEditorStore((s) => s.currentSpread);

  const [longPressId, setLongPressId] = useState(null);
  const longPressTimer = useRef(null);
  const touchStartPos = useRef(null);

  const spread = spreads[currentSpread];
  const isCover = spread?.isCover;
  const hasCover = spreads[0]?.isCover;
  const rotationLabel = isCover ? 'Copertă' : `Rotația ${currentSpread + (hasCover ? 0 : 1)}`;

  const usedCount = photos.filter((p) => p.used).length;
  const totalCount = photos.length;
  const pct = totalCount > 0 ? Math.round((usedCount / totalCount) * 100) : 0;

  // Find which rotation a photo is on
  const getPhotoRotation = useCallback((photoId) => {
    for (let i = 0; i < spreads.length; i++) {
      const sp = spreads[i];
      if (sp.photos?.some((p) => p.id === photoId)) {
        return sp.isCover ? 'Copertă' : `Rot. ${i + (hasCover ? 0 : 1)}`;
      }
    }
    return null;
  }, [spreads, hasCover]);

  const handleTap = (photo) => {
    if (!photo.storageUrl) return; // not uploaded yet
    // Replace mode — place photo directly in the selected frame
    if (replaceLeafId) {
      useEditorStore.getState().placePhotoInFrame(photo.id, replaceLeafId);
      onClose();
      return;
    }
    // Cover — permite orice poză (inclusiv deja folosită pe colaje)
    const store = useEditorStore.getState();
    const sp = store.spreads[store.currentSpread];
    if (sp?.isCover) {
      store.placeCoverPhotoAuto(photo.id);
      return;
    }
    if (photo.used) return;
    placePhoto(photo.id);
  };

  const handleLongPressStart = (photoId, e) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      setLongPressId(photoId);
    }, 500);
  };

  const handleTouchMove = (e) => {
    if (longPressTimer.current && touchStartPos.current) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    touchStartPos.current = null;
  };

  // Show ALL photos — uploading first, then unused, then used last
  const visiblePhotos = photos
    .filter(p => p.storageUrl || p.previewUrl || p.thumbData)
    .sort((a, b) => (a.used === b.used ? 0 : a.used ? 1 : -1));

  return (
    <>
      {/* Inline gallery — sits below the current spread, NOT an overlay */}
      <div
        className="bg-white border-t border-[#E8E4DB] sm:hidden flex flex-col overflow-hidden"
        style={{ height: '45vh', minHeight: 220 }}
      >
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-[#E8E4DB] shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-[#1c1c1c]">
                {replaceLeafId ? 'Alege o poză nouă' : <>Adaugă pe <span className="text-[#3D6B5E]">{rotationLabel}</span></>}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-[#8A8078]">{totalCount} poze · {usedCount} plasate</span>
                <div className="w-16 h-1 bg-[#E8E4DB] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct < 30 ? 'bg-[#B54A3A]' : pct < 70 ? 'bg-[#B8860B]' : 'bg-[#3D8B5E]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-[12px] text-[#3D6B5E] font-semibold px-2 py-1 bg-[#E8F2ED] rounded-lg">
              Gata ↓
            </button>
          </div>
        </div>

        {/* Photo grid — scrollable */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {totalCount === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl block mb-2">📷</span>
              <p className="text-[13px] text-[#8A8078]">Nicio fotografie încă</p>
              <p className="text-[11px] text-[#B0A89E] mt-1">Apasă "Adaugă" pentru a selecta poze</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-1">
                {visiblePhotos.map((photo) => {
                  const rotation = photo.used ? getPhotoRotation(photo.id) : null;
                  const originalIdx = photos.findIndex(p => p.id === photo.id);
                  const isLoading = photo.loading && !photo.storageUrl;
                  const thumbSrc = photo.thumbData || photo.previewUrl || photo.storageUrl;
                  return (
                    <button
                      key={photo.id}
                      onClick={() => handleTap(photo)}
                      onTouchStart={(e) => !isLoading && handleLongPressStart(photo.id, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleLongPressEnd}
                      onTouchCancel={handleLongPressEnd}
                      className={`relative aspect-square overflow-hidden rounded transition-all ${!isLoading ? 'active:scale-[0.93]' : ''} ${
                        photo.used && !replaceLeafId ? 'opacity-25' : ''
                      }`}
                    >
                      {thumbSrc ? (
                        <LazyImage
                          src={thumbSrc}
                          alt={photo.fileName}
                          className="w-full h-full object-cover"
                          placeholderClass="w-full h-full bg-[#F5F1EB] animate-pulse"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-[#F5F1EB] animate-pulse" />
                      )}
                      {/* Number */}
                      <span className="absolute top-0.5 left-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-black/40 text-white text-[8px] font-bold px-0.5">
                        {originalIdx + 1}
                      </span>
                      {/* Upload spinner */}
                      {isLoading && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                      {/* Used badge */}
                      {photo.used && !isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                            ✓ {rotation}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

            </>
          )}
        </div>
      </div>

      {/* Lightbox for long press */}
      {longPressId && (() => {
        const photo = photos.find((p) => p.id === longPressId);
        if (!photo) return null;
        return (
          <div
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
            onClick={() => setLongPressId(null)}
          >
            <img
              src={photo.blob || photo.thumbData}
              alt={photo.fileName}
              className="max-w-[90vw] max-h-[85vh] object-contain"
            />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const store = useEditorStore.getState();
                  const sp = store.spreads[store.currentSpread];
                  if (sp?.isCover) {
                    store.placeCoverPhotoAuto(photo.id);
                  } else if (!photo.used && !photo.loading) {
                    placePhoto(photo.id);
                  }
                  setLongPressId(null);
                }}
                disabled={!spreads[currentSpread]?.isCover && (photo.used || photo.loading)}
                className="px-5 py-2.5 bg-[#3D6B5E] text-white text-[13px] font-bold rounded-xl disabled:opacity-30"
              >
                Plasează pe {rotationLabel}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePhoto(photo.id);
                  setLongPressId(null);
                }}
                className="px-4 py-2.5 bg-[#B54A3A] text-white text-[13px] font-bold rounded-xl"
              >
                Șterge
              </button>
            </div>
          </div>
        );
      })()}
    </>
  );
}
