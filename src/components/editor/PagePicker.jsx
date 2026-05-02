import { GROASE_PAGE_OPTIONS, SUBTIRI_PAGE_OPTIONS, getPagePrice } from '../../utils/pricing';
import { formatPrice } from '../../utils/format';
import useProjectStore from '../../stores/useProjectStore';
import { useLivePricing } from '../../hooks/usePricingAdmin';

export default function PagePicker({ onClose, onSelect }) {
  const { productConfig, currentSpreadCount } = useProjectStore();
  const currentPages = currentSpreadCount * 2 || productConfig.initialPages;
  const { getPrice: liveGetPrice, loading } = useLivePricing();
  const pageOptions = productConfig.slug === 'pagini-subtiri' ? SUBTIRI_PAGE_OPTIONS : GROASE_PAGE_OPTIONS;

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-card rounded shadow-lg border border-bdr z-50 animate-[modalIn_0.2s_ease] overflow-hidden">
      {pageOptions.map((pages) => {
        const price = liveGetPrice
          ? liveGetPrice(productConfig.format, pages, productConfig.slug)
          : getPagePrice(productConfig.format, pages, productConfig.slug);
        const isActive = pages === currentPages;

        return (
          <button
            key={pages}
            onClick={() => { onSelect(pages); onClose(); }}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-bg transition-colors
              ${isActive ? 'bg-ac-light font-semibold' : ''}`}
          >
            <span>{pages} pagini</span>
            <span className="flex items-center gap-2">
              <span className="text-tx-3">{formatPrice(price)}</span>
              {isActive && <span className="text-ac">✓</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
