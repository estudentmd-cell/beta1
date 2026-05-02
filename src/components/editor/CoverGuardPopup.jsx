import { useEffect, useState } from 'react';

export default function CoverGuardPopup({ hasCoverPhoto, hasCoverText, onGoToCover, onContinue, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const allDone = hasCoverPhoto && hasCoverText;

  const items = [
    {
      done: hasCoverPhoto,
      label: 'Adaugă o poză pe copertă',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" />
          <circle cx="8" cy="10" r="2" stroke="currentColor" />
          <path d="M22 16l-5.5-5.5a2 2 0 0 0-2.83 0L2 21" stroke="currentColor" />
        </svg>
      ),
    },
    {
      done: hasCoverText,
      label: 'Personalizează textul',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="currentColor" />
          <path d="M15 5l4 4" stroke="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} />

      {/* Card */}
      <div
        className="relative bg-white w-full sm:max-w-[420px] sm:rounded-2xl rounded-t-[20px] shadow-2xl animate-[slideUpCover_0.35s_ease]"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle mobile */}
        <div className="sm:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-[#DDD]" />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#BBB] hover:text-[#666] text-xl leading-none transition"
        >
          &times;
        </button>

        {/* Content */}
        <div className="px-6 pt-6 pb-2 text-center">
          {/* Book icon */}
          <div className="w-16 h-16 bg-[#FFF7ED] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-[gentleBounce_2s_ease-in-out_infinite]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <path d="M8 7h8" />
              <path d="M8 11h5" />
            </svg>
          </div>

          <h2 className="text-[19px] font-bold text-[#1C1C1E] mb-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Coperta ta mai are nevoie de atenție
          </h2>
          <p className="text-[13px] text-[#8E8E93] leading-relaxed max-w-[320px] mx-auto mb-5">
            E primul lucru pe care îl vede oricine deschide albumul
          </p>
        </div>

        {/* Checklist */}
        <div className="px-6 pb-4 space-y-2.5">
          {items.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl border transition-all ${
                item.done
                  ? 'border-[#D1FAE5] bg-[#F0FFF4]'
                  : 'border-[#FEE2B3] bg-[#FFFBF0] animate-[gentleShake_0.5s_ease-in-out]'
              }`}
              style={!item.done ? { animationDelay: `${0.4 + i * 0.15}s`, animationFillMode: 'both' } : undefined}
            >
              {/* Status icon */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                item.done ? 'bg-[#22C55E]' : 'bg-[#F59E0B]/15'
              }`}>
                {item.done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-[#F59E0B]" />
                )}
              </div>

              {/* Label */}
              <span className={`flex-1 text-[14px] font-medium ${
                item.done ? 'text-[#22C55E] line-through decoration-[#22C55E]/30' : 'text-[#1C1C1E]'
              }`}>
                {item.label}
              </span>

              {/* Action icon */}
              <span className={`shrink-0 ${item.done ? 'text-[#22C55E]/40' : 'text-[#F59E0B]'}`}>
                {item.icon}
              </span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 pt-2 space-y-2.5">
          <button
            onClick={onGoToCover}
            className="w-full h-[52px] bg-[#1C1C1E] text-white rounded-xl font-bold text-[15px] hover:bg-[#333] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
            Mergi la copertă
          </button>

          <button
            onClick={onContinue}
            className="w-full h-[40px] text-[13px] text-[#8E8E93] hover:text-[#1C1C1E] transition font-medium"
          >
            Continuă oricum — designerul va corecta
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUpCover {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes gentleBounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes gentleShake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-4px); }
          40%  { transform: translateX(3px); }
          60%  { transform: translateX(-2px); }
          80%  { transform: translateX(1px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
