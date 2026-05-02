import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useProjectStore from '../../stores/useProjectStore';
import useEditorStore from '../../stores/useEditorStore';
import useAuthStore from '../../stores/useAuthStore';
import { getPagePrice } from '../../utils/pricing';
import { useLivePricing } from '../../hooks/usePricingAdmin';
import { formatPrice } from '../../utils/format';
import { calculateDeliveryDate, formatDate } from '../../utils/delivery';

function SaveIndicator() {
  const saveStatus = useEditorStore((s) => s.saveStatus);
  if (saveStatus === 'saving') return <span className="text-[10px] text-white/50 animate-pulse">Se salvează...</span>;
  if (saveStatus === 'saved') return <span className="text-[10px] text-white/70">✓ Salvat</span>;
  return null;
}

export default function MobileEditorTopbar({ onSave }) {
  const navigate = useNavigate();
  const { productConfig, currentSpreadCount } = useProjectStore();
  const { clientName } = useAuthStore();
  const [showInfo, setShowInfo] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  const pages = currentSpreadCount * 2 || productConfig.initialPages;
  const { getPrice: liveGetPrice } = useLivePricing();
  const standardPrice = liveGetPrice ? liveGetPrice(productConfig.format, pages, productConfig.slug) : getPagePrice(productConfig.format, pages, productConfig.slug);
  const price = productConfig._offerId ? (productConfig.basePrice || standardPrice) : standardPrice;
  const deliveryDate = formatDate(calculateDeliveryDate(18));

  const handleSave = async () => {
    if (onSave) await onSave();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  const typeName = productConfig.slug === 'pagini-subtiri' ? 'Subțiri' : 'Groase';

  return (
    <>
      <div className="h-12 flex items-center px-3 gap-2 shrink-0 z-30 sm:hidden sticky top-0" style={{
        background: 'linear-gradient(135deg, #3D6B5E 0%, #2F5548 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="w-11 h-11 flex items-center justify-center -ml-2"
          aria-label="Înapoi"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Title */}
        <span className="text-[13px] font-semibold text-white truncate flex-1">
          Album {productConfig.format}
        </span>

        {/* Save status indicator */}
        <SaveIndicator />

        {/* Pro templates button — hidden until ready
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('openTemplatePicker'))}
          className="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider bg-white/15 text-white/80 active:bg-white/25"
        >
          PRO
        </button>
        */}

        {/* Info button */}
        <button
          onClick={() => setShowInfo(!showInfo)}
          className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors ${
            showInfo ? 'bg-white/20 text-white' : 'text-white/60'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </button>

        {/* Cabinet / Login */}
        <button
          onClick={() => {
            const { user, authMethod } = useAuthStore.getState();
            const hasIdentity = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
            navigate(hasIdentity ? '/app/cabinet' : '/app/login?returnTo=/app/editor');
          }}
          className="w-11 h-11 flex items-center justify-center rounded-full text-white/60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>

      </div>

      {/* Info dropdown */}
      {showInfo && (
        <div className="bg-white border-b border-[#E8E4DB] px-4 py-3 sm:hidden animate-[fadeIn_0.15s_ease] z-20">
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-[#8A8078]">Tip</span>
              <span className="font-semibold text-[#1c1c1c]">{productConfig.name || 'Album Cartonat'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A8078]">Pagini</span>
              <span className="font-semibold text-[#1c1c1c]">{typeName} · {pages} pagini</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A8078]">Format</span>
              <span className="font-semibold text-[#1c1c1c]">{productConfig.format} cm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A8078]">Poze recomandate</span>
              <span className="font-semibold text-[#1c1c1c]">{pages * 3}–{pages * 4}</span>
            </div>
            <div className="border-t border-[#E8E4DB] pt-2 flex justify-between">
              <span className="text-[#8A8078]">Preț</span>
              <span className="font-bold text-[#1c1c1c] text-base">{formatPrice(price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A8078]">Livrare estimată</span>
              <span className="font-semibold text-[#3D6B5E]">~{deliveryDate}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
