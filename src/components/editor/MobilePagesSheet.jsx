import { useState, useEffect, useRef } from 'react';
import useEditorStore from '../../stores/useEditorStore';
import useProjectStore from '../../stores/useProjectStore';
import { computeRects } from '../../utils/layoutEngine';
import { GROASE_PAGE_OPTIONS, SUBTIRI_PAGE_OPTIONS, getPagePrice } from '../../utils/pricing';
import { formatPrice } from '../../utils/format';

function MiniPreview({ spread, size = 80 }) {
  const halfW = size / 2;
  const h = size * 0.55;

  const renderFrames = (tree, ox, oy, pw, ph, pgBounds) => {
    if (!tree) return null;
    const b = pgBounds || null;
    const pL = b ? pw*(b.left||0) : 0, pR = b ? pw*(b.right||0) : 0;
    const pT = b ? ph*(b.top||0) : 0, pB = b ? ph*(b.bottom||0) : 0;
    const rects = computeRects(tree, ox+pL, oy+pT, pw-pL-pR, ph-pT-pB, 0.2);
    return rects.map((rect) => (
      <div key={rect.leaf.id} className="absolute overflow-hidden"
        style={{ left: rect.x, top: rect.y, width: Math.max(rect.w, 0), height: Math.max(rect.h, 0) }}>
        {rect.leaf.photo ? (
          <img src={rect.leaf.photo.thumbData || rect.leaf.photo.blob} alt="" className="w-full h-full object-cover" draggable={false} />
        ) : (
          <div className="w-full h-full bg-[#E8E5E0]" />
        )}
      </div>
    ));
  };

  const hasPhotos = spread.photos?.length > 0;
  const coverBg = spread.isCover ? (spread.coverTemplate?.coverStyle?.bg || '#F0EDE8') : '#fff';

  return (
    <div className="relative rounded-sm overflow-hidden" style={{ width: size, height: h, background: coverBg, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
      <div className="absolute top-0 bottom-0 bg-[#D0CAC0]" style={{ left: halfW - 0.5, width: 1 }} />
      {hasPhotos ? (
        spread.mode === 'spread' ? renderFrames(spread.full?.tree, 0, 0, size, h) : (
          <>{renderFrames(spread.left?.tree, 0, 0, halfW, h)}{renderFrames(spread.right?.tree, halfW, 0, halfW, h)}</>
        )
      ) : spread.isCover ? (
        <div className="absolute flex items-center justify-center" style={{ left: halfW, top: 0, width: halfW, height: h }}>
          <div className="bg-white/30 rounded-[1px]" style={{ width: 14, height: 10 }} />
        </div>
      ) : (
        <><div className="absolute bg-[#E8E5E0]" style={{ left: 1, top: 1, width: halfW - 2, height: h - 2 }} />
          <div className="absolute bg-[#E8E5E0]" style={{ left: halfW + 1, top: 1, width: halfW - 2, height: h - 2 }} /></>
      )}
    </div>
  );
}

export default function MobilePagesSheet({ onClose }) {
  const spreads = useEditorStore((s) => s.spreads);
  const currentSpread = useEditorStore((s) => s.currentSpread);
  const goToSpread = useEditorStore((s) => s.goToSpread);
  const photos = useEditorStore((s) => s.photos);
  const { productConfig, currentSpreadCount } = useProjectStore();
  const [mode, setMode] = useState('pagini');
  const [expandedIdx, setExpandedIdx] = useState(null); // which rotation has inline gallery open
  const swipeStartY = useRef(null);

  const hasCover = spreads[0]?.isCover;
  const pages = currentSpreadCount * 2 || productConfig.initialPages;
  const pageOptions = productConfig.slug === 'pagini-subtiri' ? SUBTIRI_PAGE_OPTIONS : GROASE_PAGE_OPTIONS;

  const handleSelectPage = (pages) => {
    useProjectStore.getState().setSpreadCount(pages / 2);
    useEditorStore.getState().resizeSpreads(pages);
    useProjectStore.setState((s) => ({ productConfig: { ...s.productConfig, initialPages: pages } }));
  };

  const handleGoTo = (idx) => {
    goToSpread(idx);
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  useEffect(() => {
    const handler = () => setMode('galerie');
    window.addEventListener('openPagesSheetGalerie', handler);
    return () => window.removeEventListener('openPagesSheetGalerie', handler);
  }, []);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[49] sm:hidden" onClick={onClose} />
      <div className="fixed left-0 right-0 bottom-[56px] top-[30%] z-[50] bg-white rounded-t-2xl shadow-2xl sm:hidden overflow-hidden flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex justify-center py-2 cursor-pointer"
          onClick={onClose}
          onTouchStart={(e) => { swipeStartY.current = e.touches[0].clientY; }}
          onTouchEnd={(e) => {
            if (swipeStartY.current !== null) {
              const dy = e.changedTouches[0].clientY - swipeStartY.current;
              if (dy > 50) onClose();
              swipeStartY.current = null;
            }
          }}>
          <div className="w-10 h-1 bg-[#D0CAC0] rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-[#E8E4DB] flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[#1c1c1c]">Paginile albumului</h3>
          <button onClick={onClose} className="text-[13px] text-[#3D6B5E] font-semibold px-2 py-1">Gata ↓</button>
        </div>

        {/* Content — rotation list with inline galleries */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-2">
              {spreads.map((sp, i) => {
                const isCurrent = i === currentSpread;
                const isExpanded = expandedIdx === i;
                const photoCount = sp.photos?.length || 0;
                const label = sp.isCover ? 'Copertă' : `Rot. ${i + (hasCover ? 0 : 1)}`;
                return (
                  <div key={sp.id}>
                    <button onClick={() => handleGoTo(i)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all active:scale-[0.98] ${isExpanded ? 'bg-[#E8F2ED] ring-2 ring-[#3D6B5E]' : isCurrent ? 'bg-[#F5F3F0]' : 'bg-white'}`}>
                      <MiniPreview spread={sp} size={60} />
                      <div className="flex-1 text-left">
                        <span className={`text-[12px] font-semibold ${isExpanded ? 'text-[#3D6B5E]' : 'text-[#1c1c1c]'}`}>{label}</span>
                        {photoCount > 0 && <span className="text-[10px] text-[#B0A89E] ml-2">{photoCount} 📷</span>}
                      </div>
                      <svg className={`w-4 h-4 text-[#B0A89E] transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {/* Inline gallery under this rotation */}
                    {isExpanded && (
                      <div className="mt-1 mb-2 bg-[#FAF8F5] rounded-lg p-2 border border-[#E8E4DB] animate-[fadeIn_0.15s_ease]">
                        <div className="grid grid-cols-4 gap-1 max-h-[150px] overflow-y-auto">
                          {photos.filter(p => p.previewUrl || p.thumbData).filter(p => !p.used).map(photo => (
                            <button key={photo.id}
                              onClick={() => {
                                if (!photo.storageUrl) return;
                                if (sp.isCover) {
                                  const emptyFrame = (sp.coverFrames || []).find(f => !f.photo);
                                  if (emptyFrame) useEditorStore.getState().placeCoverPhoto(emptyFrame.id, photo.id);
                                } else {
                                  useEditorStore.getState().placePhoto(photo.id);
                                }
                              }}
                              className="aspect-square overflow-hidden rounded active:scale-90 transition-all">
                              <img src={photo.thumbData || photo.previewUrl} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
                            </button>
                          ))}
                          {photos.filter(p => (p.previewUrl || p.thumbData) && !p.used).length === 0 && (
                            <div className="col-span-4 text-center py-3 text-[10px] text-[#B0A89E]">Toate pozele sunt plasate</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
        </div>

        {/* Page count selector */}
        {(
          <div className="border-t border-[#E8E4DB] px-4 py-3">
            <p className="text-[11px] font-semibold text-[#8A8078] uppercase tracking-wider mb-2">Nr pagini</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {pageOptions.map((p) => {
                const price = getPagePrice(productConfig.format, p, productConfig.slug);
                const isActive = p === pages;
                return (
                  <button key={p} onClick={() => handleSelectPage(p)}
                    className={`flex flex-col items-center px-3 py-2 rounded-xl border-2 transition-all shrink-0 ${isActive ? 'border-[#3D6B5E] bg-[#E8F2ED]' : 'border-[#E8E4DB] bg-white'}`}>
                    <span className={`text-[14px] font-bold ${isActive ? 'text-[#3D6B5E]' : 'text-[#1c1c1c]'}`}>{p}</span>
                    <span className="text-[10px] text-[#8A8078]">{formatPrice(price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
