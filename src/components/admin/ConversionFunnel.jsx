/**
 * ConversionFunnel — visual funnel with progress bars and drop-off indicators.
 *
 * Props:
 *   stages: Array<{ name: string, visitors: number, pct: number, drop: number }>
 */
export default function ConversionFunnel({ stages = [] }) {
  if (!stages.length) {
    return <div className="text-sm text-gray-400">Fără date funnel.</div>;
  }

  return (
    <div>
      {stages.map((step, i) => (
        <div key={i} className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">{step.name}</span>
            <span className="text-gray-500">
              {step.visitors} <span className="text-xs">({step.pct}%)</span>
            </span>
          </div>
          <div className="bg-gray-100 rounded-full h-6 overflow-hidden">
            <div className="admin-funnel-bar" style={{ width: `${step.pct}%` }} />
          </div>
          {i > 0 && step.drop > 10 && (
            <div className="text-xs text-red-500 mt-1">↓ -{step.drop}% abandon</div>
          )}
        </div>
      ))}
    </div>
  );
}
