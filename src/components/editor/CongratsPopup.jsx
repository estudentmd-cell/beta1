import { useState, useEffect, useRef } from 'react';

export default function CongratsPopup({ photoCount, onAutoFill, onManual, onDesigner, onClose }) {
  const [displayCount, setDisplayCount] = useState(0);
  const [showButtons, setShowButtons] = useState(false);
  const rafRef = useRef(null);

  // Animate counter from 0 to photoCount
  useEffect(() => {
    if (!photoCount) return;
    const duration = 1000;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(eased * photoCount));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setShowButtons(true);
      }
    }

    // small delay so checkmark draws first
    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, 400);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [photoCount]);

  return (
    <>
      <style>{`
        @keyframes congrats-slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes congrats-fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes congrats-scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes congrats-drawCircle {
          from { stroke-dashoffset: 157; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes congrats-drawCheck {
          from { stroke-dashoffset: 36; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes congrats-backdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .congrats-popup {
          animation: congrats-slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @media (min-width: 640px) {
          .congrats-popup {
            animation: congrats-scaleIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
        }

        .congrats-circle {
          stroke-dasharray: 157;
          stroke-dashoffset: 157;
          animation: congrats-drawCircle 0.6s ease forwards;
        }
        .congrats-check {
          stroke-dasharray: 36;
          stroke-dashoffset: 36;
          animation: congrats-drawCheck 0.4s ease 0.45s forwards;
        }

        .congrats-btn-reveal {
          opacity: 0;
          transform: translateY(8px);
        }
        .congrats-btn-reveal.show {
          animation: congrats-fadeIn 0.35s ease forwards;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
        style={{ animation: 'congrats-backdrop 0.25s ease forwards' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        {/* Panel */}
        <div className="congrats-popup bg-white w-full sm:max-w-[420px] rounded-t-[20px] sm:rounded-2xl px-6 pt-8 pb-6 sm:pb-8 sm:mx-4 shadow-xl">

          {/* Checkmark animation */}
          <div className="flex justify-center mb-5">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle
                cx="32" cy="32" r="25"
                stroke="#3D6B5E"
                strokeWidth="2.5"
                fill="none"
                className="congrats-circle"
              />
              <path
                d="M22 33 L29 40 L42 25"
                stroke="#3D6B5E"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                className="congrats-check"
              />
            </svg>
          </div>

          {/* Text */}
          <h2
            className="text-center text-xl font-semibold text-[#1C1C1E] mb-1"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Gata! {displayCount} fotografii încărcate
          </h2>
          <p className="text-center text-[15px] text-gray-500 mb-7">
            Acum hai să le aranjăm pe pagini
          </p>

          {/* Buttons */}
          <div className="space-y-3">
            {/* Auto-fill — primary */}
            <div className={`congrats-btn-reveal ${showButtons ? 'show' : ''}`}>
              <button
                onClick={onAutoFill}
                className="w-full bg-[#1C1C1E] text-white text-[15px] font-medium py-3.5 rounded-xl
                           active:scale-[0.98] transition-transform duration-100"
              >
                Aranjează automat
              </button>
              <p className="text-center text-[12px] text-gray-400 mt-1.5">
                Recomandat · Gata în 10 secunde
              </p>
            </div>

            {/* Manual — text link */}
            <div
              className={`congrats-btn-reveal ${showButtons ? 'show' : ''}`}
              style={{ animationDelay: showButtons ? '0.08s' : '0s' }}
            >
              <button
                onClick={onManual}
                className="w-full text-[14px] text-gray-400 hover:text-gray-600 py-2 transition-colors"
              >
                Aranjez manual, poză cu poză
              </button>
            </div>

            {/* Divider */}
            <div
              className={`congrats-btn-reveal ${showButtons ? 'show' : ''} flex items-center gap-3`}
              style={{ animationDelay: showButtons ? '0.12s' : '0s' }}
            >
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[12px] text-gray-300">sau</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Designer path */}
            <div
              className={`congrats-btn-reveal ${showButtons ? 'show' : ''}`}
              style={{ animationDelay: showButtons ? '0.16s' : '0s' }}
            >
              <button
                onClick={onDesigner}
                className="w-full bg-[#EAF0EC] text-[#3D6B5E] text-[14px] font-medium py-3 rounded-xl
                           active:scale-[0.98] transition-transform duration-100"
              >
                Designerul aranjează totul — gratuit
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
