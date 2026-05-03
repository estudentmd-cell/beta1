import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import Confetti from '../components/shared/Confetti';
import { formatPrice } from '../utils/format';
import { calculateDeliveryDate, formatDate } from '../utils/delivery';

// ── SVG Icons ──
const CheckCircle = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const Palette = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12" r="0.5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);
const Eye = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const Printer = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);
const Truck = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);
const Mail = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
  </svg>
);
const Phone = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const ArrowRight = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

export default function ConfirmDesignerScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  // Restore from location.state or localStorage (survives page refresh)
  const locationState = location.state || {};
  const stored = (() => { try { return JSON.parse(localStorage.getItem('fc_last_order') || '{}'); } catch { return {}; } })();
  const s = locationState.orderId ? locationState : stored;

  const orderId = s.orderId || '';
  const orderNumber = s.orderNumber || orderId;
  const clientName = s.clientName || useAuthStore.getState().clientName || '';
  const clientEmail = s.clientEmail || useAuthStore.getState().clientEmail || '';
  const productName = s.productName || 'Album foto';
  const format = s.format || '20×20';
  const pages = s.pages || 40;
  const coverName = s.coverName || '';
  const price = s.price || 0;
  const service = s.service || 'Design complet';
  const isSelfService = service === 'Verificare' || service === 'Verificare album' || s.orderType === 'self';
  const estimateDate = formatDate(calculateDeliveryDate(18));

  // No order found — redirect home
  useEffect(() => {
    if (!orderId) navigate('/', { replace: true });
  }, [orderId, navigate]);

  if (!orderId) return null;

  const [showConfetti, setShowConfetti] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShowConfetti(false), 4000); return () => clearTimeout(t); }, []);

  const details = [
    { label: 'Produs', value: productName },
    { label: 'Format', value: `${format} cm` },
    { label: 'Pagini', value: `${pages} pagini` },
    ...(coverName ? [{ label: 'Copertă', value: coverName }] : []),
    { label: 'Serviciu', value: service, accent: true },
    { label: 'Estimare livrare', value: estimateDate },
  ];

  return (
    <div className="animate-[fadeIn_0.4s_ease] min-h-screen flex items-center justify-center px-4 py-6 bg-[#F7F7F7]">
      <Confetti active={showConfetti} duration={4000} />

      <div className="w-full max-w-[760px]">

        {/* ═══ SUCCESS HEADER — inline ═══ */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#3D6B5E] flex items-center justify-center shrink-0 animate-[confirmBounce_0.6s_ease]">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[18px] md:text-[22px] font-bold text-[#1A1A1A] leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Comanda a fost plasată!
            </h1>
            <p className="text-[12px] text-[#999]">Mulțumim, {clientName || 'dragă client'}!</p>
          </div>
        </div>

        {/* ═══ TWO COLUMN LAYOUT (desktop) ═══ */}
        <div className="md:grid md:grid-cols-2 md:gap-3 space-y-3 md:space-y-0">

          {/* LEFT — Order details */}
          <div className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* Black header */}
            <div className="bg-[#1C1C1E] px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-white/40 uppercase tracking-[0.12em]">Nr. comandă</p>
                <p className="text-[17px] text-white font-bold tracking-wide font-mono">{orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-white/40 uppercase tracking-[0.12em]">Total</p>
                <p className="text-[19px] text-white font-bold">{formatPrice(price)}</p>
              </div>
            </div>
            {/* Detail rows */}
            <div className="px-4 py-1.5">
              {details.map((d, i) => (
                <div key={i} className={`flex items-center justify-between py-[7px] ${i < details.length - 1 ? 'border-b border-[#F5F3F0]' : ''}`}>
                  <span className="text-[11px] text-[#AAA]">{d.label}</span>
                  <span className={`text-[12px] font-semibold ${d.accent ? 'text-[#3D6B5E]' : 'text-[#1A1A1A]'}`}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Timeline */}
          <div className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] px-4 py-3.5 flex flex-col">
            <h3 className="text-[10px] font-bold text-[#BBB] uppercase tracking-[0.1em] mb-2.5">Ce urmează</h3>

            <div className="relative flex-1">
              <div className="absolute left-[11px] top-3 bottom-3 w-[1.5px] bg-[#F0EDEA]" />
              <div className="space-y-2">
                <TimelineStep icon={<CheckCircle className="w-3 h-3" />} title="Comanda inregistrata" status="done" />
                <TimelineStep icon={<Phone className="w-3 h-3" />} title="Managerul te contacteaza" subtitle="Confirmare comanda si factura" status="active" />
                {!isSelfService && <TimelineStep icon={<Palette className="w-3 h-3" />} title="Designerul lucreaza" status="upcoming" />}
                {!isSelfService && <TimelineStep icon={<Eye className="w-3 h-3" />} title="Verifici si aprobi" status="upcoming" />}
                <TimelineStep icon={<Printer className="w-3 h-3" />} title="Trimis la tipar" status="upcoming" />
                <TimelineStep icon={<Truck className="w-3 h-3" />} title="Livrat la usa ta" status="upcoming" />
              </div>
            </div>

            {/* Email — bottom of timeline */}
            {clientEmail && (
              <div className="mt-2.5 pt-2.5 border-t border-[#F2F0ED] flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#3D6B5E] shrink-0" />
                <p className="text-[11px] text-[#999]">Confirmare pe <span className="font-medium text-[#666]">{clientEmail}</span></p>
              </div>
            )}
          </div>
        </div>

        {/* ═══ CTA — row on desktop ═══ */}
        <div className="flex gap-2 mt-4">
          <button onClick={() => navigate('/app/cabinet')}
            className="group flex-1 bg-[#1C1C1E] text-white h-[44px] rounded-xl font-bold text-[13px] hover:bg-[#333] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            Cabinetul meu
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </button>
          <button onClick={() => navigate('/')}
            className="h-[44px] px-5 rounded-xl text-[12px] text-[#999] hover:text-[#666] hover:bg-white transition">
            Pagina principală
          </button>
        </div>
      </div>
    </div>
  );
}

function TimelineStep({ icon, title, subtitle, status }) {
  const isDone = status === 'done';
  const isActive = status === 'active';

  return (
    <div className="flex items-center gap-2.5 relative z-10">
      <div className={`w-[24px] h-[24px] rounded-full flex items-center justify-center shrink-0 ${
        isDone ? 'bg-[#3D6B5E] text-white' :
        isActive ? 'bg-[#3D6B5E]/10 text-[#3D6B5E] ring-[1.5px] ring-[#3D6B5E]/25' :
        'bg-[#F5F3F0] text-[#CCC]'
      }`}>
        {icon}
      </div>
      <div>
        <p className={`text-[12px] leading-tight ${
          isDone ? 'text-[#BBB] line-through decoration-[#DDD]' :
          isActive ? 'font-semibold text-[#1A1A1A]' :
          'text-[#CCC]'
        }`}>
          {title}
        </p>
        {subtitle && (
          <p className={`text-[10px] ${isActive ? 'text-[#3D6B5E]' : 'text-[#DDD]'}`}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}
