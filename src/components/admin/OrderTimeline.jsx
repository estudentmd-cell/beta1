const DOT_COLORS = {
  created:       'bg-green-500',
  status_change: 'bg-blue-500',
  revision:      'bg-amber-500',
  note:          'bg-gray-400',
  error:         'bg-red-500',
};

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Acum';
  if (m < 60) return `Acum ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Acum ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Acum ${d} zile`;
  return new Date(ts).toLocaleDateString('ro-RO');
}

export default function OrderTimeline({ events = [] }) {
  if (!events.length) return null;

  const sorted = [...events].sort((a, b) => b.ts - a.ts);

  return (
    <div className="admin-tl relative">
      {sorted.map((ev, i) => {
        const dotColor = DOT_COLORS[ev.type] || 'bg-gray-400';
        const isLast = i === sorted.length - 1;

        return (
          <div key={i} className="admin-tl-item relative flex gap-3 pb-4">
            {/* Vertical line */}
            <div className="flex flex-col items-center">
              <div className={`admin-tl-dot w-2.5 h-2.5 rounded-full ${dotColor} shrink-0 mt-1 z-10`} />
              {!isLast && (
                <div className="admin-tl-line w-px flex-1 bg-gray-200" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 pb-1">
              <div className="font-semibold text-sm text-gray-900">{ev.event}</div>
              {ev.detail && (
                <div className="text-xs text-gray-500 mt-0.5">{ev.detail}</div>
              )}
              <div className="text-xs text-gray-400 mt-0.5">{timeAgo(ev.ts)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { timeAgo };
