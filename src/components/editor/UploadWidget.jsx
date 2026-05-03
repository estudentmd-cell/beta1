import { useState, useEffect, useRef } from 'react';
import useEditorStore, { getUploadPctMap } from '../../stores/useEditorStore';

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatSpeed(bytesPerSec) {
  if (bytesPerSec <= 0) return '...';
  if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(0) + ' KB/s';
  return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
}

function formatETA(bytesRemaining, speed) {
  if (speed <= 0) return '';
  const sec = Math.ceil(bytesRemaining / speed);
  if (sec < 60) return `~${sec}s`;
  if (sec < 3600) return `~${Math.ceil(sec / 60)}min`;
  return `~${(sec / 3600).toFixed(1)}h`;
}

const TIER_LABELS = {
  micro: 'Original',
  small: 'Calitate maximă',
  medium: 'Calitate înaltă',
  large: 'Optimizat',
  bulk: 'Comprimat',
};

/**
 * Upload widget — bottom-right floating card with real-time MB/speed/ETA.
 */
export default function UploadWidget() {
  const isUploading = useEditorStore(s => s.isUploading);
  const uploadedCount = useEditorStore(s => s.uploadedCount);
  const uploadTotalCount = useEditorStore(s => s.uploadTotalCount);
  const uploadProgress = useEditorStore(s => s.uploadProgress);
  const uploadBytesTotal = useEditorStore(s => s.uploadBytesTotal);
  const uploadBytesSent = useEditorStore(s => s.uploadBytesSent);
  const uploadSpeed = useEditorStore(s => s.uploadSpeed);
  const uploadTier = useEditorStore(s => s.uploadTier);
  const _uploadTick = useEditorStore(s => s._uploadTick);
  const photos = useEditorStore(s => s.photos);

  const [minimized, setMinimized] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevUploadingRef = useRef(false);

  useEffect(() => {
    if (isUploading && !prevUploadingRef.current) {
      setDismissed(false);
      setMinimized(false);
    }
    prevUploadingRef.current = isUploading;
  }, [isUploading]);

  const justCompleted = !isUploading && uploadTotalCount > 0 && uploadedCount >= uploadTotalCount;
  useEffect(() => {
    if (justCompleted && !dismissed) {
      const t = setTimeout(() => setDismissed(true), 5000);
      return () => clearTimeout(t);
    }
  }, [justCompleted, dismissed]);

  if (dismissed) return null;
  if (!isUploading && !justCompleted) return null;

  const pctMap = getUploadPctMap();
  const activePhotos = photos
    .filter(p => pctMap.has(p.id) && pctMap.get(p.id) >= 0)
    .slice(-5)
    .reverse();

  const pct = uploadProgress || 0;
  const bytesRemaining = Math.max(0, uploadBytesTotal - uploadBytesSent);
  const eta = formatETA(bytesRemaining, uploadSpeed);
  const tierLabel = TIER_LABELS[uploadTier] || '';

  // Minimized: compact bar
  if (minimized) {
    return (
      <div
        className="fixed right-3 z-[70] bg-white rounded-xl shadow-lg border border-[#E8E4DB] px-3 py-2 flex items-center gap-2 cursor-pointer hover:shadow-xl transition-all animate-[fadeIn_0.2s_ease] bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] lg:bottom-4 lg:right-4"
        onClick={() => setMinimized(false)}
      >
        <div className="w-20 h-1.5 bg-[#E8E4DB] rounded-full overflow-hidden">
          <div className="h-full bg-[#3D6B5E] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-[#8A8078] font-medium whitespace-nowrap">
          {justCompleted ? '✓ Gata' : `${formatBytes(uploadBytesSent)} · ${formatSpeed(uploadSpeed)}`}
        </span>
      </div>
    );
  }

  return (
    <div
      className="fixed right-3 z-[70] w-[280px] bg-white rounded-2xl shadow-xl border border-[#E8E4DB] overflow-hidden animate-[fadeIn_0.25s_ease] bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] lg:bottom-4 lg:right-4 lg:w-[300px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#FAF8F5] border-b border-[#E8E4DB]">
        <div className="flex items-center gap-2 min-w-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3D6B5E" strokeWidth="2" className="shrink-0">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div className="min-w-0">
            <span className="text-[12px] font-semibold text-[#1c1c1c] block truncate">
              {justCompleted
                ? `✓ ${uploadTotalCount} fotografii încărcate`
                : `${pct}% · ${uploadedCount}/${uploadTotalCount} gata`}
            </span>
            {tierLabel && !justCompleted && (
              <span className="text-[9px] text-[#3D6B5E] font-medium">{tierLabel}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setMinimized(true)}
            className="w-9 h-9 flex items-center justify-center rounded text-[#B0A89E] hover:text-[#5C544B] hover:bg-[#E8E4DB] transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button onClick={() => setDismissed(true)}
            className="w-9 h-9 flex items-center justify-center rounded text-[#B0A89E] hover:text-[#5C544B] hover:bg-[#E8E4DB] transition-colors">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Real-time stats bar */}
      <div className="px-3 py-1.5 bg-white border-b border-[#E8E4DB]">
        {/* Progress bar */}
        <div className="h-1.5 bg-[#E8E4DB] rounded-full overflow-hidden mb-1.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${justCompleted ? 'bg-[#3D8B5E]' : 'bg-[#3D6B5E]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Bytes + Speed + ETA */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#5C544B] font-medium">
            {formatBytes(uploadBytesSent)} / {formatBytes(uploadBytesTotal)}
          </span>
          {!justCompleted && (
            <span className="text-[10px] text-[#8A8078]">
              {formatSpeed(uploadSpeed)}{eta ? ` · ${eta}` : ''}
            </span>
          )}
          {justCompleted && (
            <span className="text-[10px] text-[#3D8B5E] font-medium">Complet</span>
          )}
        </div>
      </div>

      {/* Photo thumbnails with individual progress */}
      {activePhotos.length > 0 && (
        <div className="px-2 py-1.5 space-y-1 max-h-[180px] overflow-y-auto">
          {activePhotos.map((photo) => {
            const filePct = pctMap.get(photo.id) ?? 0;
            return (
              <div key={photo.id} className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#F5F1EB] shrink-0 relative">
                  {(photo.thumbData || photo.blob) ? (
                    <img src={photo.thumbData || photo.blob} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#F5F1EB] to-[#E8E4DB] relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite]"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)' }} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-[#8A8078] truncate">{photo.fileName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex-1 h-1 bg-[#E8E4DB] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          filePct >= 100 ? 'bg-[#3D8B5E]' : filePct < 0 ? 'bg-[#B54A3A]' : 'bg-[#3D6B5E]'
                        }`}
                        style={{ width: `${Math.max(filePct, 0)}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-[#B0A89E] w-6 text-right shrink-0">
                      {filePct >= 100 ? '✓' : filePct < 0 ? '✗' : `${filePct}%`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!justCompleted && (
        <div className="px-3 py-1 bg-[#FAF8F5] border-t border-[#E8E4DB]">
          <p className="text-[9px] text-[#B0A89E] text-center">
            Poți continua să lucrezi la album
          </p>
        </div>
      )}
    </div>
  );
}
