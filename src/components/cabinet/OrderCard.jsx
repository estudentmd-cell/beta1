import MiniTimeline from './MiniTimeline';
import { getDeliveryRange } from '../../utils/delivery';

export default function OrderCard({ order, onClick }) {
  return (
    <button
      onClick={() => onClick(order)}
      className="w-full bg-card rounded-[12px] shadow p-4 text-left hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded bg-bg-2 flex items-center justify-center shrink-0">
          <span className="text-xl">📦</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-tx-1">{order.id}</p>
            <p className="text-[10px] text-tx-4">{order.product_format}</p>
          </div>
          <p className="text-xs text-tx-3 mb-2 truncate">{order.product_name} · {order.product_pages} pag</p>
          <MiniTimeline status={order.status} />
          <p className="text-[10px] text-tx-4 mt-1">Estimat: {getDeliveryRange()}</p>
        </div>
      </div>
    </button>
  );
}
