import { useLocation, useNavigate } from 'react-router-dom';
import { ORDER_STEPS } from '../utils/constants';

export default function ConfirmSelfScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = location.state?.orderId || '—';

  return (
    <div className="animate-[fadeIn_0.4s_ease] min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md text-center">
        <div className="animate-[confirmBounce_0.6s_ease] mb-6">
          <span className="text-6xl">✅</span>
        </div>

        <h1 className="font-serif text-2xl mb-2">Comanda ta a fost plasată!</h1>
        <p className="text-sm text-tx-2 mb-6">
          Echipa noastră va verifica albumul și te va contacta prin SMS.
        </p>

        {/* Timeline */}
        <div className="bg-card rounded-[16px] shadow p-5 mb-6 text-left">
          <div className="space-y-3">
            {ORDER_STEPS.map((step, i) => {
              const isDone = i <= 1;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isDone ? 'bg-ac text-white' : 'bg-bg-2 text-tx-4'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm ${isDone ? 'font-medium' : 'text-tx-3'}`}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-tx-3 mb-6">Comanda: <span className="font-semibold">{orderId}</span></p>

        <button
          onClick={() => navigate('/app/cabinet')}
          className="bg-tx-1 text-white px-6 py-3 rounded font-semibold text-sm hover:bg-tx-2 transition-colors min-h-[44px]"
        >
          Mergi la Cabinet
        </button>
      </div>
    </div>
  );
}
