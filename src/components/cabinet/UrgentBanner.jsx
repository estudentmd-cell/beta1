export default function UrgentBanner({ count, onSwitch }) {
  if (!count || count <= 0) return null;

  return (
    <div
      className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-[12px] p-4 mb-4 flex items-center justify-between animate-[cabUrgentPulse_2s_infinite]"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        <p className="text-sm font-semibold text-orange-800">
          Ai {count} album{count > 1 ? 'e' : ''} de achitat
        </p>
      </div>
      <button
        onClick={onSwitch}
        className="bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-orange-600 transition-colors min-h-[36px]"
      >
        Vezi
      </button>
    </div>
  );
}
