export default function UploadProgress({ progress, label }) {
  return (
    <div className="mb-4 bg-bg-2 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-ac/10 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-ac animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-tx-1">{label || 'Se optimizeaza...'}</p>
          <p className="text-[10px] text-tx-3">Fotografiile apar pe masura ce sunt gata</p>
        </div>
        <span className="text-sm font-bold text-ac shrink-0">{progress}%</span>
      </div>
      <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
        <div
          className="h-full bg-ac rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
