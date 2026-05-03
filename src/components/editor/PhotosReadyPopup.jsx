import { useEffect, useState } from 'react';

export default function PhotosReadyPopup({ photoCount, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  // Auto-close after 6 seconds
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-[80] flex items-end lg:items-center justify-center p-0 lg:p-4 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative bg-white w-full lg:max-w-[380px] lg:rounded-2xl rounded-t-[20px] shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUpQuick 0.3s ease-out', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>

        <div className="lg:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-[#DDD]" />
        </div>

        <div className="px-6 pt-5 pb-4 text-center">
          <div className="w-14 h-14 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3D6B5E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 className="text-[18px] font-bold text-[#1C1C1E] mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Super! {photoCount} fotografii incarcate
          </h2>
          <p className="text-[13px] text-[#888] leading-relaxed">
            Acum plaseaza-le pe pagini. Apasa <strong className="text-[#3D6B5E]">Auto AI</strong> din bara de jos si vezi magia colajelor!
          </p>
        </div>

        <div className="px-6 pb-4">
          <button onClick={onClose}
            className="w-full h-[48px] rounded-xl bg-[#1C1C1E] text-white text-[14px] font-bold active:scale-[0.97] transition-all"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
            Am inteles
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUpQuick {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
