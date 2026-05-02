import { useState, useEffect, useRef } from 'react';
import useEditorStore from '../../stores/useEditorStore';

function fmtBytes(b) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function UploadProgressBar() {
  const isUploading = useEditorStore(s => s.isUploading);
  const uploadedCount = useEditorStore(s => s.uploadedCount);
  const uploadTotalCount = useEditorStore(s => s.uploadTotalCount);
  const uploadProgress = useEditorStore(s => s.uploadProgress);
  const uploadBytesSent = useEditorStore(s => s.uploadBytesSent);
  const uploadBytesTotal = useEditorStore(s => s.uploadBytesTotal);
  const uploadSpeed = useEditorStore(s => s.uploadSpeed);
  const initialLoadReady = useEditorStore(s => s.initialLoadReady);

  const [dismissed, setDismissed] = useState(false);
  const [autoHidden, setAutoHidden] = useState(false);
  const prevUploading = useRef(false);

  const justCompleted = !isUploading && uploadTotalCount > 0 && uploadedCount >= uploadTotalCount;
  const pct = uploadProgress || 0;

  useEffect(() => {
    if (isUploading && !prevUploading.current) {
      setDismissed(false);
      setAutoHidden(false);
    }
    prevUploading.current = isUploading;
  }, [isUploading]);

  useEffect(() => {
    if (justCompleted && !dismissed) {
      const timer = setTimeout(() => setAutoHidden(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [justCompleted, dismissed]);

  if (!initialLoadReady) return null;
  if (dismissed || autoHidden) return null;
  if (!isUploading && !justCompleted) return null;

  const speedStr = uploadSpeed > 0 ? (uploadSpeed < 1024 * 1024 ? (uploadSpeed / 1024).toFixed(0) + ' KB/s' : (uploadSpeed / (1024 * 1024)).toFixed(1) + ' MB/s') : '';

  return (
    <div className="shrink-0 z-30 sm:hidden">
      <div className="bg-[#F5F1EB] border-t border-[#E8E4DB]">
        <div className="h-[3px] bg-[#E8E4DB]">
          <div
            className={`h-full transition-all duration-500 ${justCompleted ? 'bg-[#3D8B5E]' : 'bg-[#3D6B5E]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            {justCompleted ? (
              <span className="text-[11px] text-[#3D8B5E] font-medium">✓ Gata</span>
            ) : (
              <span className="text-[11px] text-[#8A8078]">
                {fmtBytes(uploadBytesSent)}/{fmtBytes(uploadBytesTotal)} · {pct}%{speedStr ? ` · ${speedStr}` : ''}
              </span>
            )}
          </div>
          <button onClick={() => setDismissed(true)} className="w-11 h-8 flex items-center justify-center text-[14px] text-[#B0A89E] -mr-2">×</button>
        </div>
      </div>
    </div>
  );
}
