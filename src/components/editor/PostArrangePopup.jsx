import useEditorStore from '../../stores/useEditorStore';

/**
 * PostArrangePopup — apare DUPĂ auto-arrange, ghidează spre checkout.
 * Bottom sheet pe mobile, modal centrat pe desktop.
 */
export default function PostArrangePopup({ onCheckout, onAdjust, onClose }) {
  const photos = useEditorStore(s => s.photos);
  const spreads = useEditorStore(s => s.spreads);
  const isUploading = useEditorStore(s => s.isUploading);

  const photoCount = photos.length;
  const interiorSpreads = spreads.filter(s => !s.isCover);
  const pageCount = interiorSpreads.length * 2;

  // Primele 3 rotații non-cover pentru mini thumbnails
  const previewSpreads = interiorSpreads.slice(0, 3);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[paFadeIn_0.3s_ease]" />

      <div
        className="relative bg-white w-full sm:max-w-[420px] sm:rounded-2xl rounded-t-[20px] shadow-2xl animate-[paSlideUp_0.4s_cubic-bezier(0.22,1,0.36,1)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle mobile */}
        <div className="sm:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-[#DDD]" />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#BBB] hover:text-[#666] text-xl leading-none transition-colors"
        >
          &times;
        </button>

        {/* Mini spread thumbnails */}
        <div className="flex justify-center gap-3 px-6 pt-6 pb-4">
          {previewSpreads.map((spread, idx) => (
            <MiniSpreadThumb
              key={spread.id || idx}
              spread={spread}
              delay={idx * 0.1}
            />
          ))}
        </div>

        {/* Text */}
        <div className="text-center px-6 animate-[paFadeIn_0.5s_ease_0.25s_both]">
          <h2 className="text-[20px] font-bold text-[#1A1A1A] mb-1">
            Albumul tău arată superb!
          </h2>
          <p className="text-[14px] text-[#888]">
            {photoCount} fotografii pe {pageCount} pagini
          </p>
        </div>

        {/* Buttons */}
        <div className="px-6 pt-6 pb-5 space-y-3 animate-[paFadeIn_0.5s_ease_0.4s_both]">
          {/* Main CTA — checkout */}
          <div>
            <button
              onClick={isUploading ? undefined : onCheckout}
              disabled={isUploading}
              className={`w-full h-[52px] rounded-xl font-bold text-[16px] active:scale-[0.98] transition-all ${
                isUploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#3D6B5E] text-white hover:bg-[#2d5445] shadow-lg shadow-[#3D6B5E]/20'
              }`}
            >
              {isUploading ? 'Pozele se încarcă...' : 'Plasează comanda'}
            </button>
            <p className="text-center text-[12px] text-[#A0A0A0] mt-1.5">
              Un designer verifică gratuit
            </p>
          </div>

          {/* Secondary — adjust */}
          <button
            onClick={onAdjust}
            className="w-full h-[40px] text-[13px] text-[#666] hover:text-[#333] font-medium transition-colors"
          >
            Vreau să fac câteva ajustări
          </button>
        </div>
      </div>

      <style>{`
        @keyframes paSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes paFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes paFanIn {
          from { opacity: 0; transform: translateY(16px) rotate(var(--fan-rot, 0deg)) scale(0.85); }
          to { opacity: 1; transform: translateY(0) rotate(var(--fan-rot, 0deg)) scale(1); }
        }
      `}</style>
    </div>
  );
}

/**
 * Mini spread thumbnail — dreptunghi cu "poze" simplificate.
 * Arată câte poze sunt pe fiecare pagină din spread.
 */
function MiniSpreadThumb({ spread, delay }) {
  // Numără pozele pe pagina left și right
  const leftPhotos = spread.left?.photos?.length || 0;
  const rightPhotos = spread.right?.photos?.length || 0;
  const totalPhotos = leftPhotos + rightPhotos;

  // Distribuie vizual dacă nu avem info per pagină
  const leftCount = totalPhotos > 0 ? Math.max(1, Math.ceil(totalPhotos / 2)) : 2;
  const rightCount = totalPhotos > 0 ? Math.max(1, totalPhotos - leftCount) : 2;

  // Dimensiunea slot-urilor în funcție de câte sunt
  const getSlotSize = (count) => {
    if (count <= 1) return { w: 20, h: 26 };
    if (count <= 2) return { w: 10, h: 13 };
    if (count <= 4) return { w: 8, h: 10 };
    return { w: 6, h: 7 };
  };

  const fanRotation = delay === 0 ? '-3deg' : delay <= 0.1 ? '0deg' : '3deg';

  return (
    <div
      className="flex bg-[#F5F3F0] rounded-lg overflow-hidden shadow-sm"
      style={{
        width: 60,
        aspectRatio: '3/4',
        '--fan-rot': fanRotation,
        animation: `paFanIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${delay + 0.15}s both`,
      }}
    >
      {/* Left page */}
      <div className="flex-1 flex flex-wrap gap-[2px] items-center justify-center p-1 content-center">
        {Array.from({ length: Math.min(leftCount, 6) }).map((_, i) => {
          const sz = getSlotSize(leftCount);
          return (
            <div
              key={i}
              className="rounded-[1px] bg-[#3D6B5E]/40"
              style={{ width: sz.w, height: sz.h }}
            />
          );
        })}
      </div>

      {/* Spine */}
      <div className="w-px bg-[#E0DDD8] self-stretch my-2" />

      {/* Right page */}
      <div className="flex-1 flex flex-wrap gap-[2px] items-center justify-center p-1 content-center">
        {Array.from({ length: Math.min(rightCount, 6) }).map((_, i) => {
          const sz = getSlotSize(rightCount);
          return (
            <div
              key={i}
              className="rounded-[1px] bg-[#3D6B5E]/30"
              style={{ width: sz.w, height: sz.h }}
            />
          );
        })}
      </div>
    </div>
  );
}
