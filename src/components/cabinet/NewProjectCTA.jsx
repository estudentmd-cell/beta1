export default function NewProjectCTA({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-[#C45A4A] text-white rounded-[12px] p-5 mb-6 text-left hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-[0.99] group"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">✨</span>
        <div>
          <p className="font-semibold text-base">Creează Fotocarte Nouă</p>
          <p className="text-xs text-white/70 mt-0.5">Magic Book — albumul tău în 60 secunde</p>
        </div>
        <svg className="ml-auto w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </button>
  );
}
