import { memo, useRef, useEffect } from 'react';
import useEditorStore from '../../stores/useEditorStore';
import useProjectStore from '../../stores/useProjectStore';
import { computeRects } from '../../utils/layoutEngine';

/* ── Mini frame renderer (reuses EditorStrip pattern) ── */
const MiniFrames = memo(function MiniFrames({ tree, ox, oy, pw, ph, pgBounds }) {
  if (!tree) return null;
  const b = pgBounds || null;
  const pL = b ? pw * (b.left || 0) : 0, pR = b ? pw * (b.right || 0) : 0;
  const pT = b ? ph * (b.top || 0) : 0, pB = b ? ph * (b.bottom || 0) : 0;
  const rects = computeRects(tree, ox + pL, oy + pT, pw - pL - pR, ph - pT - pB, 0.5);
  return rects.map((rect) => (
    <div key={rect.leaf.id} className="absolute overflow-hidden"
      style={{ left: rect.x, top: rect.y, width: Math.max(rect.w, 0), height: Math.max(rect.h, 0) }}>
      {rect.leaf.photo ? (
        <img src={rect.leaf.photo.thumbData || rect.leaf.photo.blob || rect.leaf.photo.previewUrl} alt=""
          className="w-full h-full object-cover" loading="lazy" draggable={false} />
      ) : (
        <div className="w-full h-full bg-[#E8E5E0]" />
      )}
    </div>
  ));
});

/* ── Single spread preview ── */
function SpreadPreview({ spread, index, isCover }) {
  // Responsive: full width on mobile, fixed on desktop
  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 1024;
  const W = isMobileView ? Math.min(window.innerWidth - 48, 500) : 220;
  const H = Math.round(W * 0.68);
  const halfW = (W - 1) / 2;

  const hasPhotos = spread.photos?.length > 0 ||
    spread.full?.photos?.length > 0 ||
    spread.left?.photos?.length > 0 ||
    spread.right?.photos?.length > 0;

  return (
    <div className="flex flex-col items-center gap-1.5 w-full lg:w-auto">
      <div className="relative bg-white rounded-md shadow-sm border border-[#E8E4DB] overflow-hidden"
        style={{ width: W, height: H }}>
        {spread.isCover ? (
          // Cover — show cover frames
          spread.coverFrames?.length > 0 ? (
            spread.coverFrames.map((frame, i) => {
              const photo = frame.photo;
              const src = photo && (
                useEditorStore.getState().photos.find(p => p.id === photo.id)?.thumbData ||
                useEditorStore.getState().photos.find(p => p.id === photo.id)?.previewUrl
              );
              return (
                <div key={i} className="absolute inset-0">
                  {src ? (
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#F5F3F0] flex items-center justify-center text-[#C4A882] text-xs">Coperta</div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="w-full h-full bg-[#F5F3F0] flex items-center justify-center text-[#C4A882] text-sm font-medium">Coperta</div>
          )
        ) : spread.mode === 'spread' ? (
          // Full spread
          hasPhotos ? (
            <MiniFrames tree={spread.full?.tree} ox={0} oy={0} pw={W} ph={H} pgBounds={spread.full?.bounds} />
          ) : (
            <div className="w-full h-full bg-[#FAF8F5] flex items-center justify-center text-[#ccc] text-xs">Pagina goala</div>
          )
        ) : (
          // Left + Right pages
          <>
            <div className="absolute" style={{ left: 0, top: 0, width: halfW, height: H }}>
              {spread.left?.photos?.length > 0 ? (
                <MiniFrames tree={spread.left?.tree} ox={0} oy={0} pw={halfW} ph={H} pgBounds={spread.left?.bounds} />
              ) : (
                <div className="w-full h-full bg-[#FAF8F5]" />
              )}
            </div>
            <div className="absolute bg-[#E8E4DB]" style={{ left: halfW, top: 0, width: 1, height: H }} />
            <div className="absolute" style={{ left: halfW + 1, top: 0, width: halfW, height: H }}>
              {spread.right?.photos?.length > 0 ? (
                <MiniFrames tree={spread.right?.tree} ox={0} oy={0} pw={halfW} ph={H} pgBounds={spread.right?.bounds} />
              ) : (
                <div className="w-full h-full bg-[#FAF8F5]" />
              )}
            </div>
          </>
        )}
      </div>
      <span className="text-[11px] text-[#999] font-medium">
        {isCover ? 'Coperta' : `Pag. ${index * 2 - 1}–${index * 2}`}
      </span>
    </div>
  );
}

/* ── Main modal ── */
export default function AlbumPreviewModal({ onConfirm, onClose }) {
  const spreads = useEditorStore((s) => s.spreads);
  const photos = useEditorStore((s) => s.photos);
  const productConfig = useProjectStore((s) => s.productConfig);
  const overlayRef = useRef(null);
  const gridRef = useRef(null);

  const usedPhotos = photos.filter(p => p.used).length;
  const totalPhotos = photos.length;

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Count pages with content
  const interiorSpreads = spreads.filter(s => !s.isCover);
  const filledSpreads = interiorSpreads.filter(s =>
    s.photos?.length > 0 || s.full?.photos?.length > 0 || s.left?.photos?.length > 0 || s.right?.photos?.length > 0
  );

  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 1024;

  // ═══ MOBILE: simple confirmation message (no thumbnails) ═══
  if (isMobileView) {
    return (
      <div ref={overlayRef} onClick={handleOverlayClick}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.2s ease-out' }}>
        <div className="bg-white w-full rounded-t-[20px] shadow-2xl"
          onClick={e => e.stopPropagation()}
          style={{ animation: 'slideUp 0.25s ease-out', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>

          <div className="flex justify-center pt-3 mb-2">
            <div className="w-10 h-1 rounded-full bg-[#DDD]" />
          </div>

          <div className="px-6 pt-2 pb-4 text-center">
            <div className="w-16 h-16 bg-[#E8F5E9] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3D6B5E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>

            <h2 className="text-[20px] font-bold text-[#1C1C1E] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Albumul tau e gata!
            </h2>
            <p className="text-[14px] text-[#666] leading-relaxed mb-2">
              Echipa noastra va verifica macheta inainte de tipar. Daca ceva nu e in regula, te vom contacta.
            </p>

            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3 text-[12px] text-[#999]">
              <span>{productConfig?.format || '20x20'} cm</span>
              <span>·</span>
              <span>{filledSpreads.length * 2} pagini</span>
              <span>·</span>
              <span>{usedPhotos} fotografii</span>
            </div>
          </div>

          <div className="px-6 pb-2 space-y-2.5">
            <button onClick={onConfirm}
              className="w-full h-[52px] rounded-xl bg-[#1C1C1E] text-white text-[15px] font-bold hover:bg-[#333] active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              style={{ fontFamily: 'Outfit, sans-serif' }}>
              Continua spre comanda
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button onClick={onClose}
              className="w-full h-[40px] text-[13px] text-[#999] font-medium">
              Vreau sa mai verific
            </button>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        `}</style>
      </div>
    );
  }

  // ═══ DESKTOP: full preview with thumbnails ═══
  return (
    <div ref={overlayRef} onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div className="bg-white max-h-[90vh] max-w-[740px] w-full rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'slideUp 0.25s ease-out' }}>

        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-[#F0EDE8]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 shrink-0 rounded-full bg-[#FFF3E0] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E6930A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-[#1C1C1E]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Verificati macheta inainte de comanda
              </h2>
              <p className="text-[13px] text-[#888]">
                Va merge la tipar exact asa. Verificati ordinea pozelor si textele.
              </p>
            </div>
          </div>

          <div className="flex gap-4 mt-3 text-[12px] text-[#666]">
            <span>{productConfig?.name || 'Album foto'}</span>
            <span>|</span>
            <span>{productConfig?.format || '20x20'} cm</span>
            <span>|</span>
            <span>{filledSpreads.length * 2} pagini cu poze</span>
            <span>|</span>
            <span>{usedPhotos}/{totalPhotos} fotografii plasate</span>
          </div>
        </div>

        {/* Spreads grid — scrollable */}
        <div ref={gridRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-3 gap-4 justify-items-center">
            {spreads.map((sp, i) => (
              <SpreadPreview key={sp.id} spread={sp} index={i} isCover={sp.isCover} />
            ))}
          </div>

          {totalPhotos - usedPhotos > 0 && (
            <div className="mt-5 p-3 rounded-xl bg-[#FFF9E6] border border-[#F0E4B8] text-[13px] text-[#8B7B2B] text-center">
              {totalPhotos - usedPhotos} fotografii nu sunt plasate in album. Daca doriti sa le includeti, apasati "Vreau sa verific".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-[#F0EDE8] bg-[#FAFAF8] flex flex-row gap-3">
          <button onClick={onClose}
            className="flex-1 h-12 rounded-xl border border-[#D5D0C8] text-[14px] font-semibold text-[#555] hover:bg-[#F0EDE8] active:scale-[0.98] transition-all"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
            Vreau sa verific
          </button>
          <button onClick={onConfirm}
            className="flex-1 h-12 rounded-xl bg-[#1C1C1E] text-white text-[14px] font-semibold hover:bg-[#333] active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
            Totul e bine, continua
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
