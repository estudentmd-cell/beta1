import { useEffect, useState } from 'react';

export default function CoverGuardPopup({ hasCoverPhoto, onGoToCover, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end lg:items-center justify-center p-0 lg:p-4"
    >
      {/* Backdrop — no click to close (like Periodica: cannot skip) */}
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} />

      {/* Card */}
      <div
        className="relative bg-white w-full lg:max-w-[420px] lg:rounded-2xl rounded-t-[20px] shadow-2xl animate-[slideUpCover_0.35s_ease]"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle mobile */}
        <div className="lg:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-[#DDD]" />
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-2 text-center">
          {/* Warning icon */}
          <div className="w-16 h-16 bg-[#FEE2E2] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="18" rx="2" />
              <circle cx="8" cy="10" r="2" />
              <path d="M22 16l-5.5-5.5a2 2 0 0 0-2.83 0L2 21" />
            </svg>
          </div>

          <h2 className="text-[19px] font-bold text-[#1C1C1E] mb-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Lipseste poza de pe coperta
          </h2>
          <p className="text-[13px] text-[#8E8E93] leading-relaxed max-w-[320px] mx-auto mb-5">
            Adauga o fotografie pe coperta albumului ca sa poti plasa comanda.
          </p>
        </div>

        {/* Status */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-[#FEE2B3] bg-[#FFFBF0]">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-[#EF4444]/15">
              <div className="w-3 h-3 rounded-full border-2 border-[#EF4444]" />
            </div>
            <span className="flex-1 text-[14px] font-medium text-[#1C1C1E]">
              Adauga o poza pe coperta
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="18" rx="2" />
              <circle cx="8" cy="10" r="2" />
              <path d="M22 16l-5.5-5.5a2 2 0 0 0-2.83 0L2 21" />
            </svg>
          </div>
        </div>

        {/* Single button — no skip option (like Periodica) */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={onGoToCover}
            className="w-full h-[52px] bg-[#1C1C1E] text-white rounded-xl font-bold text-[15px] hover:bg-[#333] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
            Mergi la coperta
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
