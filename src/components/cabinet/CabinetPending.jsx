import { useState, useEffect } from 'react';
import useAuthStore from '../../stores/useAuthStore';
import { db } from '../../firebase/config';

export default function CabinetPending({ onNavigate }) {
  const [pending, setPending] = useState([]);
  const { activeClientId, clientEmail } = useAuthStore();

  useEffect(() => {
    if (!db) return;
    (async () => {
      try {
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const queries = [];
        if (activeClientId) {
          queries.push(getDocs(query(collection(db, 'orders'), where('client_id', '==', activeClientId), where('status', '==', 'awaiting_payment'))).catch(() => ({ docs: [] })));
        }
        if (clientEmail) {
          queries.push(getDocs(query(collection(db, 'orders'), where('clientEmail', '==', clientEmail.toLowerCase().trim()), where('status', '==', 'awaiting_payment'))).catch(() => ({ docs: [] })));
        }
        const snaps = await Promise.all(queries);
        const map = new Map();
        snaps.forEach(s => s.docs?.forEach(d => map.set(d.id, { id: d.id, ...d.data() })));
        setPending(Array.from(map.values()));
      } catch {}
    })();
  }, [activeClientId, clientEmail]);

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease]">
      <div className="hidden md:flex items-center gap-3">
        <button onClick={() => onNavigate('account')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F0F0F0] transition-colors">
          <svg className="w-5 h-5 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-serif text-[24px] text-[#1A1A1A]">În așteptarea plății</h1>
        <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-2 text-[12px] font-bold rounded-full bg-[#FDF6E3] text-[#C49A3C]">
          {pending.length}
        </span>
      </div>

      {pending.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl block mb-3">&#127881;</span>
          <p className="text-[15px] font-semibold text-[#1A1A1A]">Totul plătit!</p>
          <p className="text-[13px] text-[#888] mt-1">Nu ai nicio comandă în așteptarea plății.</p>
        </div>
      )}

      {pending.map((order) => {
        const config = order.productConfig || {};
        return (
          <div key={order.id} className="bg-[#FDF6E3] border border-[#E8D9A8] rounded-[14px] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] text-[#A8862E] font-mono font-bold">{order.orderNumber || order.id}</p>
                <p className="text-[15px] font-semibold text-[#1A1A1A] mt-0.5">{config.name || 'Album foto'}</p>
                <p className="text-[13px] text-[#777] mt-0.5">{config.format || '20×20'} · {config.initialPages || 40} pagini</p>
              </div>
              <p className="font-serif text-[20px] text-[#1A1A1A] shrink-0">{Math.round(order.priceTotal || config.basePrice || 0)} lei</p>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#E8D9A8]">
              <span className="text-[12px] text-[#A8862E]">Managerul te va contacta</span>
              <a href="tel:+37360595984"
                className="px-5 py-2 bg-[#3D6B5E] text-white text-[13px] font-semibold rounded-lg hover:bg-[#2d5246] transition-colors">
                Sună-ne
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
