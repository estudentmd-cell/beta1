import { useState, useEffect } from 'react';
import { getConsent, setConsent } from '../../utils/metaPixel';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only if user hasn't decided yet
    if (getConsent() === null) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    setConsent(true);
    setVisible(false);
  };

  const decline = () => {
    setConsent(false);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-4 animate-[slideUp_0.3s_ease]">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-[#E8E4DB] px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-[13px] text-[#585858] leading-relaxed flex-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Folosim cookies pentru a analiza traficul și a personaliza reclamele.{' '}
          <a href="/confidentialitate" className="text-[#3D6B5E] underline">Detalii</a>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-[13px] text-[#888] rounded-lg hover:bg-[#F5F3F0] transition"
          >
            Refuz
          </button>
          <button
            onClick={accept}
            className="px-5 py-2 text-[13px] font-semibold text-white bg-[#1C1C1E] rounded-lg hover:bg-[#333] active:scale-[0.97] transition-all"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
