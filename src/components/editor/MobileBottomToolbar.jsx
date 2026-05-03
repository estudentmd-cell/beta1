import { useState, useRef, useEffect, useCallback, memo } from 'react';
import useEditorStore from '../../stores/useEditorStore';
import useProjectStore from '../../stores/useProjectStore';
import useAuthStore from '../../stores/useAuthStore';
import useUIStore from '../../stores/useUIStore';
import LazyImage from './LazyImage';
import { computeRects } from '../../utils/layoutEngine';
import { getDimensions } from '../../utils/dimensions';
import { getCoverDimensions } from '../../utils/coverDimensions';
import MobilePagesSheet from './MobilePagesSheet';

/* ═══ Focused Spread Preview — shows current rotation fixed at top ═══ */
const FocusedSpread = memo(function FocusedSpread() {
  const spreads = useEditorStore((s) => s.spreads);
  const currentSpread = useEditorStore((s) => s.currentSpread);
  const _tick = useEditorStore((s) => s._tick);
  const selectedFrame = useEditorStore((s) => s.selectedFrame);
  const { productConfig } = useProjectStore.getState();

  const spread = spreads[currentSpread];
  if (!spread) return null;

  const formatStr = productConfig?.format || '20×20';
  const [fW, fH] = formatStr.split('×').map(Number);
  const canvasW = typeof window !== 'undefined' ? Math.min(window.innerWidth - 32, 500) : 340;
  const spreadRatio = (2 * fW) / fH;
  const canvasH = Math.round(canvasW / spreadRatio);
  const spineW = 1;
  const halfW = (canvasW - spineW) / 2;
  const gapMM = useEditorStore.getState().gapMM;
  const gapPx = (gapMM / 25.4) * 300 * (canvasW / 2000);

  const sDims = getDimensions(productConfig?.slug, formatStr);
  const bMm = sDims?.spread?.bleed || 3;
  const cMm = sDims?.spread?.cotor || 0;
  const mmToH = canvasH / (fH * 10);
  const mmToW = canvasW / (fW * 20);
  const bH = Math.round(bMm * mmToH);
  const bW = Math.round(bMm * mmToW);
  const cW = Math.round((cMm / 2) * mmToW);

  const hasPhotos = spread.photos?.length > 0;
  const mode = spread.mode || 'spread';
  const isSpreadMode = mode === 'spread';

  const renderFrames = (tree, ox, oy, pw, ph, pgBounds) => {
    if (!tree) return null;
    const b = pgBounds || null;
    const pL = b ? pw * (b.left||0) : 0, pR = b ? pw * (b.right||0) : 0;
    const pT = b ? ph * (b.top||0) : 0, pB = b ? ph * (b.bottom||0) : 0;
    const rects = computeRects(tree, ox + pL, oy + pT, pw - pL - pR, ph - pT - pB, gapPx);
    return rects.map((rect) => {
      const { leaf, x, y, w, h } = rect;
      const photo = leaf.photo;
      const crop = leaf.cropOffset || { opx: 50, opy: 50 };
      return (
        <div
          key={leaf.id}
          className="absolute overflow-hidden"
          style={{ left: x, top: y, width: Math.max(w, 0), height: Math.max(h, 0), borderRadius: 1 }}
        >
          {photo ? (
            (photo.previewUrl) ? (
              <img
                src={photo.previewUrl}
                alt=""
                className="w-full h-full object-cover select-none pointer-events-none"
                loading="lazy"
                style={{ objectPosition: `${crop.opx}% ${crop.opy}%` }}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-[#F5F1EB]" />
            )
          ) : (
            <div className="w-full h-full bg-[#E8E5E0] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B0AAA2" strokeWidth="1.5">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex justify-center">
      <div
        className="relative bg-white rounded-lg overflow-hidden"
        style={{ width: canvasW, height: canvasH, boxShadow: '0 2px 8px rgba(44,37,32,.1)' }}
      >
        <div className="absolute top-0 bottom-0 bg-[#E0DBD4] z-[5]" style={{ left: halfW, width: spineW }} />
        {/* Regular spreads */}
        {hasPhotos && !spread.isCover && (
          isSpreadMode
            ? renderFrames(spread.full?.tree, bW, bH, canvasW - bW * 2, canvasH - bH * 2, spread.full?.bounds)
            : (
              <>
                {renderFrames(spread.left?.tree, bW, bH, halfW - bW - cW, canvasH - bH * 2, spread.left?.bounds)}
                {renderFrames(spread.right?.tree, halfW + spineW + cW, bH, halfW - cW - bW, canvasH - bH * 2, spread.right?.bounds)}
              </>
            )
        )}
        {!hasPhotos && !spread.isCover && (
          <div className="absolute inset-0 z-0 flex">
            <div className="flex-1 bg-[#E8E5E0] m-1 rounded-sm flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B0AAA2" strokeWidth="1.5">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <div className="flex-1 bg-[#E8E5E0] m-1 rounded-sm flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B0AAA2" strokeWidth="1.5">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>
        )}
        {/* Cover — show design + photo frames */}
        {spread.isCover && (() => {
          const coverTpl = spread.coverTemplate || useProjectStore.getState().coverTemplate;
          const coverBg = coverTpl?.coverStyle?.bg || '#FFFFFF';
          const fmt = productConfig?.format || '20×20';
          const isPortraitFmt = fmt === '20×30';
          const coverDesignImg = isPortraitFmt
            ? (coverTpl?.coverStyle?.designPortrait || coverTpl?.coverStyle?.bgImage)
            : (coverTpl?.coverStyle?.designSquare || coverTpl?.coverStyle?.bgImage);
          const coverBgImage = coverDesignImg || coverTpl?.coverStyle?.bgImage;
          const cd = getCoverDimensions(fmt, productConfig?.initialPages || 40, productConfig?.slug || 'pagini-groase');
          const spinePx = Math.round((cd.spineW / cd.totalW) * canvasW);
          const backW2 = Math.round((fW / cd.totalW) * canvasW);
          const frontW2 = canvasW - backW2 - spinePx;
          return (
            <div className="absolute inset-0 z-[2]">
              {/* Cover background */}
              <div className="absolute inset-0 overflow-hidden" style={{ background: coverBg }}>
                {coverBgImage && <img src={coverBgImage} alt="" className="w-full h-full" style={{ display: 'block' }} />}
              </div>
              {/* Spine */}
              <div className="absolute top-0 bottom-0 bg-black/5" style={{ left: backW2, width: spinePx }} />
              {/* Cover photo frames */}
              {(spread.coverFrames || []).map((frame) => {
                const fx = backW2 + spinePx + (frame.x / 100) * frontW2;
                const fy = (frame.y / 100) * canvasH;
                const fw = (frame.w / 100) * frontW2;
                const fh = (frame.h / 100) * canvasH;
                const photo = frame.photo;
                const crop = frame.cropOffset || photo?.cropOffset || { opx: 50, opy: 50 };
                const borderPx = frame.borderWidth > 0 ? Math.max(2, frame.borderWidth * (canvasH / 1000)) : 0;
                return (
                  <div key={frame.id} className="absolute overflow-hidden rounded-sm z-[3]"
                    style={{ left: fx, top: fy, width: fw, height: fh, padding: borderPx, background: borderPx > 0 ? (frame.borderColor || '#FFFFFF') : undefined }}>
                    <div className="w-full h-full overflow-hidden rounded-sm">
                      {photo?.previewUrl ? (
                        <img src={photo.previewUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${crop.opx}% ${crop.opy}%` }} draggable={false} />
                      ) : (
                        <div className="w-full h-full bg-[#E8E4DB] flex items-center justify-center">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B0AAA2" strokeWidth="1.5">
                            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Cover text zones */}
              {(spread.coverTexts || []).map((tz) => {
                const tx = backW2 + spinePx + (tz.x / 100) * frontW2;
                const ty = (tz.y / 100) * canvasH;
                const tw = (tz.w / 100) * frontW2;
                const th = (tz.h / 100) * canvasH;
                const fontSize = Math.max(6, (tz.fontSize / 100) * canvasH);
                return (
                  <div key={tz.id} className="absolute flex items-center justify-center z-[4]"
                    style={{ left: tx, top: ty, width: tw, height: th }}>
                    <span className="truncate" style={{ fontSize, fontWeight: tz.fontWeight || 'normal', fontFamily: tz.fontFamily || 'sans-serif', color: tz.text ? (tz.color || '#1D1B18') : 'rgba(0,0,0,0.15)', textAlign: 'center', width: '100%' }}>
                      {tz.text || tz.placeholder || 'Text'}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
});

/* ═══ Photo Gallery Grid ═══ */
function PhotoGallery({ onClose, onAddMore, replaceLeafId = null }) {
  const photos = useEditorStore((s) => s.photos);
  const placePhoto = useEditorStore((s) => s.placePhoto);
  const spreads = useEditorStore((s) => s.spreads);
  const currentSpread = useEditorStore((s) => s.currentSpread);
  const goToSpread = useEditorStore((s) => s.goToSpread);
  const sbarMN = useEditorStore((s) => s.sbarMN);
  const sbarLN = useEditorStore((s) => s.sbarLN);
  const sbarRN = useEditorStore((s) => s.sbarRN);
  const isUploading = useEditorStore((s) => s.isUploading);
  const uploadProgress = useEditorStore((s) => s.uploadProgress);
  const _uploadTick = useEditorStore((s) => s._uploadTick);

  const spread = spreads[currentSpread];
  const isCover = spread?.isCover;
  const hasCover = spreads[0]?.isCover;
  const hasPhotos = spread?.photos?.length > 0;
  const rotLabel = isCover ? 'Copertă' : `Rotația ${currentSpread + (hasCover ? 0 : 1)}`;

  const [mobileSort, setMobileSort] = useState(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const usedCount = photos.filter((p) => p.used).length;
  const totalCount = photos.length;
  const pct = totalCount > 0 ? Math.round((usedCount / totalCount) * 100) : 0;

  // Respectă ordinea din store — fără re-sortare
  const visiblePhotos = photos.filter(p => p.storageUrl || p.previewUrl || p.thumbData);

  const MOBILE_SORT = [
    { id: null, label: 'Fără sortare' },
    { id: 'name', label: 'Pe nume' },
    { id: 'exif', label: 'După data fotografiei' },
    { id: 'used', label: 'Prin utilizare' },
    { id: 'orient', label: 'Prin orientare' },
  ];
  const SORT_LABELS = { name: 'Nume', exif: 'Data foto', used: 'Utilizare', orient: 'Orientare' };

  const handleMobileSort = (sortId) => {
    setMobileSort(sortId);
    setSortMenuOpen(false);
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

  const getPhotoRotation = useCallback((photoId) => {
    for (let i = 0; i < spreads.length; i++) {
      const sp = spreads[i];
      if (sp.photos?.some((p) => p.id === photoId)) {
        return sp.isCover ? 'Cop.' : `R.${i + (hasCover ? 0 : 1)}`;
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
    store.placePhoto(photo.id);
  };

  // Navigate between spreads while gallery is open
  const goPrev = () => { if (currentSpread > 0) goToSpread(currentSpread - 1); };
  const goNext = () => { if (currentSpread < spreads.length - 1) goToSpread(currentSpread + 1); };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#FAF8F5]">
      {/* ── Photo gallery ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Gallery header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#E8E4DB] shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-[12px] text-[#3D6B5E] font-bold px-3 min-h-[44px] bg-[#E8F2ED] rounded-lg active:scale-95 flex items-center">
              Gata ↓
            </button>
            <button onClick={onAddMore} className="flex items-center gap-1 text-[11px] text-[#5C544B] font-semibold px-3 min-h-[44px] bg-[#F0EDE6] rounded-lg active:scale-95">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Încarcă
            </button>
            {/* Auto — mutat in toolbar-ul de jos */}
          </div>
          <div className="text-right">
            <span className="text-[12px] font-semibold text-[#1c1c1c]">
              {replaceLeafId ? 'Alege o poză nouă' : <>Adaugă pe <span className="text-[#3D6B5E]">{rotLabel}</span></>}
            </span>
            <div className="flex items-center justify-end gap-2 mt-0.5">
              <span className="text-[10px] text-[#8A8078]">
                {isUploading
                  ? `Se încarcă... ${Math.round(uploadProgress)}%`
                  : `${totalCount} poze · ${usedCount} plasate`
                }
              </span>
              {isUploading ? (
                <div className="w-14 h-1 bg-[#E8E4DB] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#3D6B5E] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }} />
                </div>
              ) : (
                <div className="w-14 h-1 bg-[#E8E4DB] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct < 30 ? 'bg-[#B54A3A]' : pct < 70 ? 'bg-[#B8860B]' : 'bg-[#3D8B5E]'}`}
                    style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sort dropdown */}
        {totalCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[#E8E4DB] shrink-0 relative">
            <button onClick={() => setSortMenuOpen(!sortMenuOpen)}
              className={`flex items-center gap-1 px-2.5 h-[28px] rounded-full text-[10px] font-semibold transition ${
                mobileSort ? 'bg-[#3D6B5E] text-white' : 'text-[#8A8078] bg-[#F0EDE6] active:bg-[#E8E4DB]'}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h12M3 18h6"/></svg>
              {mobileSort ? SORT_LABELS[mobileSort] : 'Sortare'}
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {sortMenuOpen && (
              <>
                <div className="fixed inset-0 z-[10]" onClick={() => setSortMenuOpen(false)} />
                <div className="absolute top-full left-3 mt-1 bg-white rounded-xl shadow-xl border border-[#E5E5EA] py-1 z-[20] min-w-[180px]">
                  {MOBILE_SORT.map(opt => (
                    <button key={opt.id || 'none'} onClick={() => handleMobileSort(opt.id)}
                      className={`w-full text-left px-3 py-2.5 text-[12px] flex items-center gap-2 transition active:bg-[#F2F2F7] ${
                        mobileSort === opt.id ? 'text-[#3D6B5E] font-semibold' : 'text-[#1C1C1E]'}`}>
                      {mobileSort === opt.id && <span>✓</span>}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

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
                {visiblePhotos.map((photo, idx) => {
                  const rotation = photo.used ? getPhotoRotation(photo.id) : null;
                  const isLoading = photo.loading && !photo.storageUrl;
                  const thumbSrc = photo.thumbData || photo.previewUrl;
                  return (
                    <div key={photo.id} className="relative">
                      <button
                        onClick={() => handleTap(photo)}
                        className={`relative aspect-square overflow-hidden rounded w-full transition-all ${!isLoading ? 'active:scale-[0.93]' : ''}`}
                      >
                        {thumbSrc ? (
                          <LazyImage src={thumbSrc} alt="" className="w-full h-full object-cover" placeholderClass="w-full h-full bg-[#F5F1EB] animate-pulse" draggable={false} />
                        ) : (
                          <div className="w-full h-full bg-[#F5F1EB] animate-pulse" />
                        )}
                        {/* Number badge */}
                        <span className="absolute top-0.5 left-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-black/50 text-white text-[7px] font-bold px-0.5 pointer-events-none">
                          {idx + 1}
                        </span>
                        {/* Upload spinner overlay */}
                        {isLoading && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          </div>
                        )}
                        {/* Used badge — blue checkmark like Periodica */}
                        {photo.used && !isLoading && (
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-sm bg-[#3B82F6] flex items-center justify-center shadow-sm">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </button>
                      {/* File name */}
                      <p className="text-[7px] text-[#8A8078] text-center truncate mt-0.5 px-0.5 leading-tight">{photo.fileName}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ Main Toolbar ═══ */
export default function MobileBottomToolbar({ onSave, onOrder }) {
  const [activeSheet, setActiveSheet] = useState(null);
  const [replaceLeafId, setReplaceLeafId] = useState(null);
  const fileRef = useRef(null);
  const galFileRef = useRef(null);
  const swipeStartY = useRef(null);
  const addPhotos = useEditorStore((s) => s.addPhotos);
  const photos = useEditorStore((s) => s.photos);
  const isUploading = useEditorStore((s) => s.isUploading);
  const prevPhotosRef = useRef(0);

  const needsAuth = () => {
    const { user, authMethod } = useAuthStore.getState();
    const hasRealAuth = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
    return !hasRealAuth;
  };

  const handleFiles = (e) => {
    if (e.target.files?.length) {
      if (needsAuth()) {
        useUIStore.getState().openModal('auth', {
          stayOnPage: true, hideSkip: true,
          title: 'Conectează-te pentru a încărca poze',
          subtitle: 'Pozele tale sunt protejate — doar tu le poți accesa',
        });
        e.target.value = '';
        return;
      }
      addPhotos(e.target.files);
      e.target.value = '';
    }
  };

  // Auto-open gallery when first photos appear from upload
  useEffect(() => {
    const hadNone = prevPhotosRef.current === 0;
    prevPhotosRef.current = photos.length;
    if (hadNone && photos.length > 0 && isUploading) {
      useEditorStore.getState().goToSpread(0);
      setActiveSheet('photos');
    }
  }, [photos.length, isUploading]);

  useEffect(() => {
    const handler = (e) => {
      const leafId = e.detail?.replaceLeafId || null;
      setReplaceLeafId(leafId);
      setActiveSheet('photos');
      window.dispatchEvent(new CustomEvent('galleryOpened'));
    };
    window.addEventListener('openMobilePhotoSheet', handler);
    return () => window.removeEventListener('openMobilePhotoSheet', handler);
  }, []);

  const closePhotos = () => {
    setActiveSheet(null);
    setReplaceLeafId(null);
  };

  const toggleSheet = (sheet) => {
    if (sheet !== 'photos') setReplaceLeafId(null);
    const opening = sheet === 'photos' && activeSheet !== 'photos';
    setActiveSheet(activeSheet === sheet ? null : sheet);
    if (opening) {
      window.dispatchEvent(new CustomEvent('galleryOpened'));
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic" onChange={handleFiles} className="hidden" />
      <input ref={galFileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic" onChange={handleFiles} className="hidden" />

      {/* Photo gallery — bottom half, rotation visible above */}
      {activeSheet === 'photos' && (
        <div data-gallery-open className="fixed left-0 right-0 z-40 flex flex-col bg-[#FAF8F5] lg:hidden rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-[#E8E4DB]"
          style={{ top: '50vh', bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex justify-center pt-2 pb-1 cursor-pointer"
            onClick={closePhotos}
            onTouchStart={(e) => { swipeStartY.current = e.touches[0].clientY; }}
            onTouchEnd={(e) => {
              if (swipeStartY.current !== null) {
                const dy = e.changedTouches[0].clientY - swipeStartY.current;
                if (dy > 50) closePhotos();
                swipeStartY.current = null;
              }
            }}>
            <div className="w-10 h-1 bg-[#D0CAC0] rounded-full" />
          </div>
          <PhotoGallery onClose={closePhotos} onAddMore={() => galFileRef.current?.click()} replaceLeafId={replaceLeafId} />
        </div>
      )}

      <ToolbarNav activeSheet={activeSheet} toggleSheet={toggleSheet} onSave={onSave} onOrder={onOrder} />
    </>
  );
}

/* ═══ Toolbar Navigation Tabs ═══ */
function ToolbarNav({ activeSheet, toggleSheet, onSave, onOrder }) {
  const [saveFlash, setSaveFlash] = useState(false);

  const handleSave = async () => {
    if (onSave) await onSave();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  return (
    <nav className="lg:hidden z-50 fixed bottom-0 left-0 right-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="bg-white border-t border-[#E8E4DB] flex items-center justify-around h-14">
        {/* Galerie — photo gallery (like Periodica "Галерея") */}
        <button onClick={() => toggleSheet('photos')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${activeSheet === 'photos' ? 'text-[#3D6B5E]' : 'text-[#8A8078]'}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={activeSheet === 'photos' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span className="text-[10px] leading-tight font-medium">Galerie</span>
        </button>
        {/* Sabloane — templates (like Periodica "Шаблоны") */}
        <button onClick={() => toggleSheet('templates')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${activeSheet === 'templates' ? 'text-[#3D6B5E]' : 'text-[#8A8078]'}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span className="text-[10px] leading-tight font-medium">Sabloane</span>
        </button>
        {/* Auto AI — auto arrange (like Periodica "Собрать с ИИ") */}
        <button onClick={() => { import('../../stores/useUIStore').then(m => m.default.getState().openModal('autoFill')); }}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[#8A8078] transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="text-[10px] leading-tight font-medium">Auto AI</span>
        </button>
        {/* Mai mult — more options (like Periodica "Ещё") */}
        <button onClick={() => toggleSheet('more')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${activeSheet === 'more' ? 'text-[#3D6B5E]' : 'text-[#8A8078]'}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
          </svg>
          <span className="text-[10px] leading-tight font-medium">Mai mult</span>
        </button>
      </div>
    </nav>
  );
}
