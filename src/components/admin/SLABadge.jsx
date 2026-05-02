export default function SLABadge({ hours }) {
  if (hours == null) return <span className="text-gray-300">&mdash;</span>;

  let bg, text, label;

  if (hours <= 24) {
    bg = 'bg-green-100';
    text = 'text-green-700';
    label = `\u23F1 ${hours}h / 48h`;
  } else if (hours <= 42) {
    bg = 'bg-amber-100';
    text = 'text-amber-700';
    label = `\u23F1 ${hours}h / 48h`;
  } else {
    bg = 'bg-red-100';
    text = 'text-red-700';
    label = `\u26A0\uFE0F ${hours}h / 48h \u2014 DEP\u0102\u015EIT`;
  }

  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}
