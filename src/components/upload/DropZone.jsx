import { useState, useRef } from 'react';

export default function DropZone({ onFiles }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-[16px] p-8 text-center cursor-pointer transition-colors
        ${dragOver ? 'border-ac bg-ac-light' : 'border-bdr-2 hover:border-ac/50 hover:bg-bg-2'}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/heic"
        onChange={(e) => { if (e.target.files.length) onFiles(e.target.files); }}
        className="hidden"
      />
      <span className="text-4xl mb-3 block">⬆️</span>
      <p className="text-sm font-semibold text-tx-1 mb-1">Trage fotografiile aici</p>
      <p className="text-xs text-tx-3 mb-3">sau</p>
      <span className="inline-block bg-ac text-white px-4 py-2 rounded text-sm font-semibold hover:bg-ac-2 transition-colors">
        Selectează fotografii
      </span>
    </div>
  );
}
