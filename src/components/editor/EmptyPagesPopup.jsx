import { useEffect, useState } from 'react';
import useEditorStore from '../../stores/useEditorStore';

export default function EmptyPagesPopup({ emptyPages, onGoToPage, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const goToFirstEmpty = () => {
    const spreads = useEditorStore.getState().spreads;
    const firstEmpty = spreads.findIndex((sp, idx) => {
      if (sp.isCover) return false;
      return !(sp.photos?.length > 0 || sp.full?.photos?.length > 0 || sp.left?.photos?.length > 0 || sp.right?.photos?.length > 0);
    });
    if (firstEmpty >= 0 && onGoToPage) onGoToPage(firstEmpty);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} />

      <div className="relative bg-white w-full lg:max-w-[420px] lg:rounded-2xl rounded-t-[20px] shadow-2xl animate-[slideUpCover_0.35s_ease]"
        onClick={e => e.stopPropagation()}>

        <div className="lg:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-[#DDD]" />
        </div>

        <div className="px-6 pt-6 pb-2 text-center">
          <div className="w-16 h-16 bg-[#FEE2E2] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="12" cy="12" r="3" />
              <path d="M3 16l5-5 4 4" />
            </svg>
          </div>

          <h2 className="text-[19px] font-bold text-[#1C1C1E] mb-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Lipsesc fotografii in album
          </h2>
          <p className="text-[13px] text-[#8E8E93] leading-relaxed max-w-[320px] mx-auto mb-4">
            {emptyPages.length === 1
              ? 'Ai o pagina fara fotografii. Adauga poze ca sa poti plasa comanda.'
              : `Ai ${emptyPages.length} pagini fara fotografii. Adauga poze ca sa poti plasa comanda.`
            }
          </p>
        </div>

        <div className="px-6 pb-4">
          <div className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-[#FEE2B3] bg-[#FFFBF0]">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-[#EF4444]/15">
              <span className="text-[12px] font-bold text-[#EF4444]">{emptyPages.length}</span>
            </div>
            <span className="flex-1 text-[14px] font-medium text-[#1C1C1E]">
              {emptyPages.length === 1 ? 'Pagina goala' : 'Pagini goale'}
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          <button onClick={goToFirstEmpty}
            className="w-full h-[52px] bg-[#1C1C1E] text-white rounded-xl font-bold text-[15px] hover:bg-[#333] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            Completeaza paginile
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUpCover {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
