import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useProjectStore from '../../stores/useProjectStore';
import useEditorStore from '../../stores/useEditorStore';
import useAuthStore from '../../stores/useAuthStore';
import { formatPrice } from '../../utils/format';
import { getPagePrice } from '../../utils/pricing';
import { useLivePricing } from '../../hooks/usePricingAdmin';

function SaveIndicator() {
  const saveStatus = useEditorStore((s) => s.saveStatus);
  if (saveStatus === 'saving') return <span className="text-[10px] text-white/50 animate-pulse">...</span>;
  if (saveStatus === 'saved') return <span className="text-[10px] text-white/70">✓</span>;
  return null;
}

export default function MobileEditorTopbar({ onSave }) {
  const navigate = useNavigate();
  const { productConfig, currentSpreadCount } = useProjectStore();
  const [showInfo, setShowInfo] = useState(false);

  const pages = currentSpreadCount * 2 || productConfig.initialPages;
  const { getPrice: liveGetPrice } = useLivePricing();
  const standardPrice = liveGetPrice ? liveGetPrice(productConfig.format, pages, productConfig.slug) : getPagePrice(productConfig.format, pages, productConfig.slug);
  const price = productConfig._offerId ? (productConfig.basePrice || standardPrice) : standardPrice;

  return (
    <>
      {/* Fixed top bar — like Periodica */}
      <div className="h-12 flex items-center px-2 gap-1 z-50 lg:hidden fixed top-0 left-0 right-0" style={{
        background: 'linear-gradient(135deg, #3D6B5E 0%, #2F5548 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        {/* Back */}
        <button onClick={() => navigate('/')}
          className="w-10 h-10 flex items-center justify-center -ml-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Undo */}
        <button onClick={() => useEditorStore.getState().undo()}
          disabled={useEditorStore.getState().undoStack.length === 0}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 text-white/70 disabled:opacity-30 active:bg-white/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>

        {/* Save */}
        <button onClick={onSave}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 text-white/70 active:bg-white/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
          </svg>
        </button>

        <SaveIndicator />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Info */}
        <button onClick={() => setShowInfo(!showInfo)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${showInfo ? 'bg-white/20' : 'bg-white/10'} text-white/70 active:bg-white/20`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
        </button>

        {/* Comanda — prominent button like Periodica "В корзину" */}
        <button onClick={() => window.dispatchEvent(new Event('editorOrder'))}
          className="h-9 px-4 rounded-lg bg-white text-[#1C1C1E] text-[12px] font-bold active:scale-95 transition-all flex items-center gap-1.5"
          style={{ fontFamily: 'Outfit, sans-serif' }}>
          Comanda
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Info dropdown */}
      {showInfo && (
        <div className="bg-white border-b border-[#E8E4DB] px-4 py-3 lg:hidden animate-[fadeIn_0.15s_ease] z-20">
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-[#8A8078]">Produs</span>
              <span className="font-semibold text-[#1c1c1c]">{productConfig.name || 'Album foto'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A8078]">Format</span>
              <span className="font-semibold text-[#1c1c1c]">{productConfig.format} cm · {pages} pagini</span>
            </div>
            <div className="flex justify-between border-t border-[#E8E4DB] pt-2">
              <span className="text-[#8A8078]">Pret</span>
              <span className="font-bold text-[#1c1c1c]">{formatPrice(price)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
