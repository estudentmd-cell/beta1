import { STATUSES } from '../data/mock';

export default function StatusBadge({ status }) {
  const s = STATUSES[status] || { label: status, color: 'bg-gray-100 text-gray-600', icon: '' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${s.color}`}>
      {s.icon} {s.label}
    </span>
  );
}

export function ScoreBadge({ score }) {
  const map = {
    hot:  { label: 'HOT',  cls: 'bg-red-100 text-red-600' },
    warm: { label: 'WARM', cls: 'bg-amber-100 text-amber-600' },
    cold: { label: 'COLD', cls: 'bg-blue-100 text-blue-600' },
    lost: { label: 'LOST', cls: 'bg-gray-100 text-gray-500' },
  };
  const s = map[score] || map.cold;
  return <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${s.cls}`}>{s.label}</span>;
}
