import { useEffect, useState } from 'react';

export default function MissingPhotosPopup({ missingPages, onGoToPage, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const pageList = missingPages.map(p => p.label).join(', ');

  return (
    <div className="fixed inset-0 z-[80] flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} />

      <div className="relative bg-white w-full lg:max-w-[440px] lg:rounded-2xl rounded-t-[20px] shadow-2xl animate-[slideUpCover_0.35s_ease]"
        onClick={e => e.stopPropagation()}>

        <div className="lg:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-[#DDD]" />
        </div>

        <div className="px-6 pt-6 pb-3 text-center">
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
          <p className="text-[13px] text-[#8E8E93] leading-relaxed max-w-[340px] mx-auto mb-1">
            Adauga poze pe paginile goale ca sa poti plasa comanda.
          </p>
        </div>

        {/* List of pages with issues */}
        <div className="px-6 pb-4">
          <div className="rounded-xl border border-[#FEE2B3] bg-[#FFFBF0] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#FEE2B3]/50">
              <span className="text-[11px] font-bold text-[#B45309] uppercase tracking-wider">Pagini fara poze</span>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {missingPages.map((page, i) => (
                <button key={i}
                  onClick={() => onGoToPage(page.idx)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#FEF3C7] transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-[#EF4444]/15">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                  </div>
                  <span className="flex-1 text-[13px] font-medium text-[#1C1C1E]">{page.label}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Button — go to first problem */}
        <div className="px-6 pb-6 pt-1">
          <button onClick={() => onGoToPage(missingPages[0].idx)}
            className="w-full h-[52px] bg-[#1C1C1E] text-white rounded-xl font-bold text-[15px] hover:bg-[#333] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            Completeaza albumul
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
