import useEditorStore from '../../stores/useEditorStore';

export default function MobileColajBar() {
  const spreads = useEditorStore((s) => s.spreads);
  const currentSpread = useEditorStore((s) => s.currentSpread);
  const sbarLN = useEditorStore((s) => s.sbarLN);
  const sbarMN = useEditorStore((s) => s.sbarMN);
  const sbarRN = useEditorStore((s) => s.sbarRN);
  const toggleMode = useEditorStore((s) => s.toggleMode);

  const spread = spreads[currentSpread];
  const isCover = spread?.isCover;
  const hasPhotos = spread?.photos?.length > 0;
  const isSpreadMode = spread?.mode === 'spread';

  // Don't show on cover
  if (isCover) return null;

  return (
    <div className="bg-white border-t border-[#E8E4DB] px-3 py-2 sm:hidden shrink-0">
      {/* Mode toggle */}
      <div className="flex items-center justify-center gap-1 mb-2">
        <button
          onClick={toggleMode}
          className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-colors ${
            isSpreadMode
              ? 'bg-[#1c1c1c] text-white'
              : 'bg-[#F0EDE6] text-[#8A8078]'
          }`}
        >
          Panoramă
        </button>
        <button
          onClick={toggleMode}
          className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-colors ${
            !isSpreadMode
              ? 'bg-[#1c1c1c] text-white'
              : 'bg-[#F0EDE6] text-[#8A8078]'
          }`}
        >
          Pagini
        </button>
      </div>

      {/* Colaj controls */}
      <div className="flex items-center justify-between gap-2">
        {/* Left page */}
        <button
          onClick={sbarLN}
          disabled={!hasPhotos || isSpreadMode}
          className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.95] disabled:opacity-25 bg-[#F0EDE6] text-[#5C544B]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
          ◀ St
        </button>

        {/* Center MIX */}
        <button
          onClick={sbarMN}
          disabled={!hasPhotos}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold transition-all active:scale-[0.96] disabled:opacity-25 bg-[#1c1c1c] text-white"
        >
          <span className="text-lg">🎲</span>
          MIX COLAJ
        </button>

        {/* Right page */}
        <button
          onClick={sbarRN}
          disabled={!hasPhotos || isSpreadMode}
          className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.95] disabled:opacity-25 bg-[#F0EDE6] text-[#5C544B]"
        >
          Dr ▶
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="18" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
        </button>
      </div>

      {/* Hint when no photos */}
      {!hasPhotos && (
        <p className="text-[11px] text-[#B0A89E] text-center mt-1.5">
          Adaugă poze pe această rotație mai întâi
        </p>
      )}
    </div>
  );
}
