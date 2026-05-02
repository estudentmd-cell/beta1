import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import useEditorStore from '../../stores/useEditorStore';
import useUIStore from '../../stores/useUIStore';

export default function WelcomeUploadPopup({ onClose }) {
  const addPhotos = useEditorStore(s => s.addPhotos);
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (e) => {
    if (e.target.files?.length) {
      addPhotos(e.target.files);
      e.target.value = '';
      // Închide welcome → UploadFlowPopup se deschide automat via EditorScreen trigger
      onClose();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files?.length) {
      // Filter only image files (jpg, png, webp, heic)
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
      const imageFiles = Array.from(e.dataTransfer.files).filter(f =>
        validTypes.includes(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)
      );
      if (imageFiles.length === 0) return;
      addPhotos(imageFiles);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="bg-white rounded-2xl w-full max-w-[520px] shadow-2xl overflow-hidden p-8 text-center"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto w-20 h-20 rounded-2xl bg-[#EAF0EC] flex items-center justify-center mb-6">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3D6B5E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
          </svg>
        </motion.div>

        <h2 className="text-[22px] font-bold text-[#1C1C1E] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Începe prin a adăuga fotografii
        </h2>
        <p className="text-[14px] text-[#8E8E93] mb-6 max-w-[360px] mx-auto leading-relaxed">
          Selectează pozele din telefon sau calculator. Le vei putea sorta și organiza înainte de a le plasa în album.
        </p>

        <div className={`border-2 border-dashed rounded-xl p-6 mb-4 transition-all ${
          dragOver ? 'border-[#3D6B5E] bg-[#EAF0EC]' : 'border-[#E5E5EA] hover:border-[#3D6B5E]/30'}`}>
          <button onClick={() => fileRef.current?.click()} className="w-full flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#3D6B5E] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#3D6B5E]">Încarcă fotografii</p>
              <p className="text-[12px] text-[#8E8E93] mt-0.5">sau trage pozele aici</p>
            </div>
          </button>
        </div>

        <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic" onChange={handleFiles} className="hidden" />

        <div className="flex items-center justify-center gap-4 text-[11px] text-[#C7C7CC]">
          <span>JPG, PNG, WebP, HEIC</span><span>·</span><span>Maxim 500 poze</span>
        </div>

        <button onClick={onClose} className="mt-5 text-[13px] text-[#8E8E93] hover:text-[#1C1C1E] transition">
          Treci peste — voi adăuga mai târziu
        </button>
      </motion.div>
    </div>
  );
}
