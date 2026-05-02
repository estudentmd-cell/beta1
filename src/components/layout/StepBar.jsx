import { useLocation, useNavigate } from 'react-router-dom';
import { SCREEN_STEP } from '../../utils/constants';

const STEPS = [
  { num: 1, label: 'Produs' },
  { num: 2, label: 'Identificare' },
  { num: 3, label: 'Editor' },
  { num: 4, label: 'Comandă' },
  { num: 5, label: 'Confirmare' },
];

const STEP_ROUTES = {
  1: null,
  2: '/app/phone',
  3: '/app/editor',
  4: '/app/checkout',
  5: null,
};

const HIDDEN_ROUTES = ['editor', 'cabinet', 'order-detail'];

export default function StepBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const segment = location.pathname.split('/').pop();
  if (HIDDEN_ROUTES.includes(segment)) return null;

  const currentStep = SCREEN_STEP[segment] || 2;

  const handleClick = (stepNum) => {
    if (stepNum < currentStep && STEP_ROUTES[stepNum]) {
      navigate(STEP_ROUTES[stepNum]);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-b border-bdr">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
        {STEPS.map((step, i) => {
          const isDone = step.num < currentStep;
          const isActive = step.num === currentStep;
          const isPending = step.num > currentStep;

          return (
            <div key={step.num} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => handleClick(step.num)}
                disabled={isPending}
                className={`flex flex-col items-center gap-1 ${isDone ? 'cursor-pointer' : isActive ? 'cursor-default' : 'cursor-not-allowed'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                  ${isDone ? 'bg-ac text-white' : isActive ? 'bg-ac text-white ring-2 ring-ac/30' : 'bg-bg-2 text-tx-4'}
                `}>
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : step.num}
                </div>
                <span className={`text-[10px] font-medium ${isDone || isActive ? 'text-tx-1' : 'text-tx-4'}`}>
                  {step.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mt-[-12px] ${isDone ? 'bg-ac' : 'bg-bg-3'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
