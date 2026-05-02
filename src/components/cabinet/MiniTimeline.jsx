import { ORDER_STEPS, getOrderStepIndex } from '../../utils/constants';

export default function MiniTimeline({ status }) {
  const currentIdx = getOrderStepIndex(status);

  return (
    <div className="flex items-center gap-1">
      {ORDER_STEPS.map((step, i) => {
        const isDone = i <= currentIdx;
        return (
          <div key={step.key} className="flex items-center">
            <div className={`w-2.5 h-2.5 rounded-full ${isDone ? 'bg-ac' : 'bg-bg-3'}`} />
            {i < ORDER_STEPS.length - 1 && (
              <div className={`w-4 h-0.5 ${isDone && i < currentIdx ? 'bg-ac' : 'bg-bg-3'}`} />
            )}
          </div>
        );
      })}
      <span className="text-[10px] text-tx-3 ml-1">
        {ORDER_STEPS[currentIdx]?.label || 'Plătit'}
      </span>
    </div>
  );
}
