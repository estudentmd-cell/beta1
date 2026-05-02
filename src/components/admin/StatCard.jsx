const BORDER_COLORS = {
  green:  'border-l-green-500',
  blue:   'border-l-blue-500',
  purple: 'border-l-purple-500',
  amber:  'border-l-amber-500',
  red:    'border-l-red-500',
};

export default function StatCard({ icon, label, value, sub, color = 'blue', onClick }) {
  const borderClass = BORDER_COLORS[color] || 'border-l-gray-400';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border-l-4 ${borderClass} p-4 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
