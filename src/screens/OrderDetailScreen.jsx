import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useOrderStore from '../stores/useOrderStore';
import { getOrder, getOrderTimeline } from '../firebase/orders';
import { getDeliveryRange, formatDate } from '../utils/delivery';

export default function OrderDetailScreen() {
  const navigate = useNavigate();
  const { currentOrderId } = useOrderStore();
  const [order, setOrder] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!currentOrderId) return;
      setLoading(true);
      try {
        const o = await getOrder(currentOrderId);
        setOrder(o);
        const t = await getOrderTimeline(currentOrderId);
        setTimeline(t);
      } catch (e) {
        console.error('Failed to load order', e);
      }
      setLoading(false);
    }
    load();
  }, [currentOrderId]);

  if (!currentOrderId) {
    navigate('/app/cabinet');
    return null;
  }

  if (loading) {
    return (
      <div className="animate-[fadeIn_0.4s_ease] min-h-screen pt-[72px] px-4 flex items-center justify-center">
        <p className="text-tx-3 animate-pulse">Se încarcă...</p>
      </div>
    );
  }

  return (
    <div className="animate-[fadeIn_0.4s_ease] min-h-screen pt-[72px] px-4 pb-8">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate('/app/cabinet')}
          className="flex items-center gap-1 text-sm text-tx-2 hover:text-tx-1 transition-colors mb-4 min-h-[44px]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          Înapoi
        </button>

        <h1 className="font-serif text-2xl mb-1">Comandă {currentOrderId}</h1>

        {order && (
          <>
            <p className="text-sm text-tx-3 mb-1">
              {order.product_name} · {order.product_pages} pagini
            </p>
            <p className="text-sm text-tx-3 mb-6">
              Estimare livrare: {getDeliveryRange()}
            </p>
          </>
        )}

        {/* Timeline */}
        <div className="bg-card rounded-[16px] shadow p-5">
          <h2 className="font-semibold text-sm mb-4">Istoric</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-tx-3">Niciun eveniment încă</p>
          ) : (
            <div className="space-y-4">
              {timeline.map((entry, i) => {
                const isLast = i === timeline.length - 1;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${isLast ? 'bg-ac' : 'bg-bg-3'}`} />
                      {i < timeline.length - 1 && <div className="w-0.5 flex-1 bg-bg-3 mt-1" />}
                    </div>
                    <div className="pb-4">
                      <p className={`text-sm ${isLast ? 'font-semibold' : ''}`}>{entry.event}</p>
                      {entry.detail && <p className="text-xs text-tx-3 mt-0.5">{entry.detail}</p>}
                      {entry.timestamp && (
                        <p className="text-[10px] text-tx-4 mt-0.5">{formatDate(entry.timestamp)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
