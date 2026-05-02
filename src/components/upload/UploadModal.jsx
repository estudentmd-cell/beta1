import { useRef } from 'react';
import useUIStore from '../../stores/useUIStore';
import useUploadEngine from '../../hooks/useUploadEngine';
import DropZone from './DropZone';
import PhotoGrid from './PhotoGrid';
import UploadProgress from './UploadProgress';

export default function UploadModal({ onComplete }) {
  const { closeModal } = useUIStore();
  const { items, selectedCount, selectedItems, progress, progressLabel, isUploading, handleFiles, toggleSelect } = useUploadEngine();
  const fileInputRef = useRef(null);

  const hasItems = items.length > 0;

  const handleClose = () => {
    if (isUploading) {
      if (!window.confirm('Încărcarea este în curs. Ești sigur că vrei să închizi?')) return;
    }
    closeModal();
  };

  const handleContinue = () => {
    if (onComplete) onComplete(selectedItems);
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-[90] bg-card flex flex-col animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bdr">
        <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center text-tx-2 hover:text-tx-1 text-xl">
          ×
        </button>
        <div className="text-center">
          <h2 className="text-sm font-semibold">Încarcă fotografii</h2>
          <p className="text-[10px] text-tx-3">Max 50 MB per fotografie · JPG, PNG, HEIC</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasItems && <DropZone onFiles={handleFiles} />}

        {hasItems && isUploading && <UploadProgress progress={progress} label={progressLabel} />}

        {hasItems && <PhotoGrid items={items} onToggle={toggleSelect} />}
      </div>

      {/* Bottom bar */}
      {hasItems && (
        <div className="border-t border-bdr px-4 py-3 flex items-center justify-between bg-card safe-bottom">
          <div className="text-sm text-tx-2">
            {isUploading
              ? <span>{items.length} gata <span className="animate-pulse">...</span></span>
              : <span>{selectedCount} selectate · {items.length} total</span>
            }
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm font-medium text-ac border border-ac rounded hover:bg-ac-light transition-colors min-h-[40px]"
            >
              Adaugă mai multe
            </button>
            <button
              onClick={handleContinue}
              disabled={isUploading || selectedCount === 0}
              className={`px-4 py-2 text-sm font-semibold rounded min-h-[40px] transition-colors
                ${isUploading || selectedCount === 0
                  ? 'bg-bg-3 text-tx-4 cursor-not-allowed'
                  : 'bg-ac text-white hover:bg-ac-2'}`}
            >
              Continuă
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/heic"
            onChange={(e) => { if (e.target.files.length) handleFiles(e.target.files); }}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
