import { useNavigate } from 'react-router-dom';
import Badge from '../shared/Badge';
import { formatPrice } from '../../utils/format';
import { formatDate } from '../../utils/delivery';
import useUIStore from '../../stores/useUIStore';
import useProjectStore from '../../stores/useProjectStore';

export default function DetailPopup() {
  const { modalData, closeModal } = useUIStore();
  const { setProject } = useProjectStore();
  const navigate = useNavigate();

  if (!modalData) return null;

  const item = modalData;
  const isOrder = !!item.status && item.id?.startsWith('MV');
  const isProject = !isOrder;

  const handleContinue = () => {
    if (isProject) {
      setProject(item.id, item);
      navigate('/app/editor');
    }
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={closeModal}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-card rounded-[16px] shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto animate-[modalIn_0.3s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover */}
        <div className="aspect-[3/2] bg-bg-2 rounded-t-[16px] overflow-hidden flex items-center justify-center">
          {item.thumb_url ? (
            <img src={item.thumb_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl opacity-30">📖</span>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center text-lg hover:bg-black/50 transition-colors"
        >
          ×
        </button>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <h2 className="font-serif text-xl">{item.title || item.product_name || item.id}</h2>
            <Badge status={item.status} />
          </div>

          <div className="space-y-2 text-sm">
            {item.product_name && (
              <div className="flex justify-between">
                <span className="text-tx-3">Produs</span>
                <span className="font-medium">{item.product_name}</span>
              </div>
            )}
            {item.product_format && (
              <div className="flex justify-between">
                <span className="text-tx-3">Format</span>
                <span className="font-medium">{item.product_format}</span>
              </div>
            )}
            {(item.page_count || item.product_pages) && (
              <div className="flex justify-between">
                <span className="text-tx-3">Pagini</span>
                <span className="font-medium">{item.page_count || item.product_pages}</span>
              </div>
            )}
            {item.price_total && (
              <div className="flex justify-between">
                <span className="text-tx-3">Preț</span>
                <span className="font-medium">{formatPrice(item.price_total)}</span>
              </div>
            )}
            {item.created_at && (
              <div className="flex justify-between">
                <span className="text-tx-3">Creat</span>
                <span className="font-medium">{formatDate(item.created_at)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            {isProject && item.status !== 'comandat' && (
              <button
                onClick={handleContinue}
                className="flex-1 bg-tx-1 text-white py-3 rounded font-semibold text-sm hover:bg-tx-2 transition-colors min-h-[44px]"
              >
                Continuă
              </button>
            )}
            {isProject && item.status === 'in_cart' && (
              <button
                onClick={() => { navigate('/app/checkout'); closeModal(); }}
                className="flex-1 bg-ac text-white py-3 rounded font-semibold text-sm hover:bg-ac-2 transition-colors min-h-[44px]"
              >
                Achită
              </button>
            )}
            <button
              onClick={closeModal}
              className="flex-1 bg-bg-2 text-tx-2 py-3 rounded font-semibold text-sm hover:bg-bg-3 transition-colors min-h-[44px]"
            >
              Închide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
