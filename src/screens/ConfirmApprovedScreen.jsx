import { useNavigate } from 'react-router-dom';
import { getDeliveryRange } from '../utils/delivery';
import { ORDER_STEPS } from '../utils/constants';

export default function ConfirmApprovedScreen() {
  const navigate = useNavigate();

  return (
    <div className="animate-[fadeIn_0.4s_ease] min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md text-center">
        {/* WOW animation */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-ac/10 animate-[confirmBounce_0.8s_ease]" />
          <div className="absolute inset-4 rounded-full bg-ac/20 animate-[confirmBounce_0.8s_ease_0.1s]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl animate-[albumOpen_0.8s_ease_0.2s_both]">📖</span>
          </div>
          <div className="absolute -top-1 -right-1 animate-[checkAppear_0.4s_ease_0.6s_both]">
            <div className="w-8 h-8 rounded-full bg-ac text-white flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="font-serif text-2xl mb-2">Superb! Albumul tău merge la confecționare</h1>
        <p className="text-sm text-tx-2 mb-2">
          Estimare livrare: <span className="font-semibold">{getDeliveryRange()}</span>
        </p>
        <p className="text-xs text-tx-3 mb-6">
          Albumul tău va fi tipărit pe hârtie fotografică premium și livrat gratuit.
        </p>

        {/* Timeline */}
        <div className="bg-card rounded-[16px] shadow p-5 mb-6 text-left">
          <div className="space-y-3">
            {ORDER_STEPS.map((step, i) => {
              const isDone = i <= 2;
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
