import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';
import { getPagePrice } from '../../utils/pricing';
import { formatPrice } from '../../utils/format';

export default function CheckoutSummary({ onPay, loading }) {
  const { productConfig, currentSpreadCount, chosenPath, selectedServiceLevel } = useProjectStore();
  const { openModal } = useUIStore();

  const pages = currentSpreadCount * 2 || productConfig.initialPages;
  const albumPrice = productConfig.isOffer ? productConfig.basePrice : getPagePrice(productConfig.format, pages, productConfig.slug);
  const designPrice = chosenPath === 'designer' ? (productConfig.designPrice || 0) : 0;
  const total = albumPrice + designPrice;
  const isOffer = productConfig.isOffer;

  const serviceLabels = {
    full_design: 'Designerii creează albumul',
    finish_started: 'Finalizează ce am început',
    verify_only: 'Verifică albumul meu',
  };

  return (
    <div className="bg-white rounded-[16px] shadow-lg border border-[#EBEBEB] p-5 lg:sticky lg:top-6">
      {/* Product info */}
      <div className="flex items-start gap-3 mb-4 pb-4 border-b border-[#F0F0F0]">
        <span className="text-3xl">📖</span>
        <div>
          <p className="font-bold text-[14px] text-[#1A1A1A]">{productConfig.name}</p>
          <p className="text-[12px] text-[#888]">{productConfig.format} · {pages} pagini</p>
          {isOffer && (
            <span className="text-[9px] font-bold bg-[#C0392B]/10 text-[#C0392B] px-1.5 py-0.5 rounded-full uppercase mt-1 inline-block">Ofertă</span>
          )}
        </div>
      </div>

      {/* Service chosen */}
      {selectedServiceLevel && (
        <div className="mb-4 pb-4 border-b border-[#F0F0F0]">
          <p className="text-[11px] text-[#888] mb-1">Serviciu ales</p>
          <p className="text-[13px] font-semibold text-[#3D6B5E]">{serviceLabels[selectedServiceLevel] || selectedServiceLevel}</p>
          <p className="text-[10px] text-[#999]">Inclus gratuit</p>
        </div>
      )}

      {/* Price lines */}
      <div className="space-y-2 mb-4 pb-4 border-b border-[#F0F0F0] text-[13px]">
        <div className="flex justify-between">
          <span className="text-[#666]">Album</span>
          <div className="text-right">
            {isOffer && productConfig.offerOldPrice > 0 && (
              <span className="text-[11px] text-[#BBB] line-through mr-1">{formatPrice(productConfig.offerOldPrice)}</span>
            )}
            <span className="font-medium">{formatPrice(albumPrice)}</span>
          </div>
        </div>
        {designPrice > 0 && (
          <div className="flex justify-between">
            <span className="text-[#666]">Design profesional</span>
            <span className="font-medium">{formatPrice(designPrice)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[#666]">Livrare</span>
          <span className="text-[#3D6B5E] font-semibold">Gratuită</span>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center mb-5">
        <span className="font-bold text-[15px]">Total</span>
        <span className="font-bold text-[20px] text-[#1A1A1A]">{formatPrice(total)}</span>
      </div>

      {/* Pay button */}
      <button
        onClick={onPay}
        disabled={loading}
        className={`w-full py-3.5 rounded-[12px] font-bold text-[14px] transition-all bg-[#3D6B5E] text-white hover:bg-[#2d5445] ${
          loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
        }`}
      >
        {loading ? 'Se procesează...' : `Plătește ${formatPrice(total)}`}
      </button>

      {/* Security */}
      <p className="text-center text-[10px] text-[#BBB] mt-3 flex items-center justify-center gap-1">
        🔒 Plată securizată · Datele tale sunt protejate
      </p>

      {/* Change service */}
      <button
        onClick={() => openModal('servicePicker')}
        className="w-full mt-2 text-[11px] text-[#888] hover:text-[#3D6B5E] transition-colors py-1"
      >
        Schimbă serviciul
      </button>
    </div>
  );
}
