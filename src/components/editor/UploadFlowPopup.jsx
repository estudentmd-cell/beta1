import { useState, useEffect, useRef, useCallback } from 'react';
import useEditorStore, { getUploadPct } from '../../stores/useEditorStore';
import useProjectStore from '../../stores/useProjectStore';

/**
 * UploadFlowPopup — popup unificat upload + felicitare + aranjare.
 *
 * Faza 1: Pozele se încarcă (progress live, galerie, buton „Mai adaugă")
 * Faza 2: Ready — clientul decide: continuă sau mai adaugă
 * Faza 3: Opțiuni aranjare (automat / manual / designer)
 */
export default function UploadFlowPopup({ onAutoFill, onManual, onDesigner, onClose }) {
  const photos = useEditorStore(s => s.photos);
  const spreads = useEditorStore(s => s.spreads);
  const isUploading = useEditorStore(s => s.isUploading);
  const uploadBytesSent = useEditorStore(s => s.uploadBytesSent || 0);
  const uploadBytesTotal = useEditorStore(s => s.uploadBytesTotal || 0);
  const uploadSpeed = useEditorStore(s => s.uploadSpeed || 0);
  const _uploadTick = useEditorStore(s => s._uploadTick);

  const photoCount = photos.length;
  const readyCount = photos.filter(p => p.storageUrl).length;
  const pct = uploadBytesTotal > 0 ? Math.round((uploadBytesSent / uploadBytesTotal) * 100) : 0;

  const interiorSpreads = spreads.filter(s => !s.isCover).length;
  const productConfig = useProjectStore(s => s.productConfig);
  const fallbackPages = productConfig?.initialPages || 20;
  const effectiveInterior = interiorSpreads > 0 ? interiorSpreads : Math.max(1, Math.floor(fallbackPages / 2));
  const minPhotos = effectiveInterior * 2;
  const totalPages = effectiveInterior * 2;
  const hasEnough = photoCount >= minPhotos;
  const needMore = minPhotos - photoCount;

  const initialPhase = isUploading ? 'uploading' : (photoCount > 0 ? 'ready' : 'done');
  const [phase, setPhase] = useState(initialPhase);
  const [showButtons, setShowButtons] = useState(!isUploading);
  const [displayCount, setDisplayCount] = useState(isUploading ? 0 : photoCount);
  const fileRef = useRef(null);
  const rafRef = useRef(null);

  const formatSpeed = (bps) => {
    if (bps <= 0) return '';
    if (bps >= 1048576) return `${(bps / 1048576).toFixed(1)} MB/s`;
    return `${Math.round(bps / 1024)} KB/s`;
  };
  const formatEta = (bps, remaining) => {
    if (bps <= 0 || remaining <= 0) return '';
    const secs = Math.round(remaining / bps);
    if (secs < 60) return `~${secs}s`;
    return `~${Math.round(secs / 60)} min`;
  };
  const bytesRemaining = uploadBytesTotal - uploadBytesSent;
  const speedLabel = formatSpeed(uploadSpeed);
  const etaLabel = formatEta(uploadSpeed, bytesRemaining);
  const formatMB = (b) => (b / 1048576).toFixed(1);

  useEffect(() => {
    if (!isUploading && phase === 'uploading' && photoCount > 0) {
      const t = setTimeout(() => setPhase('ready'), 500);
      return () => clearTimeout(t);
    }
  }, [isUploading, phase, photoCount]);

  useEffect(() => {
    if (!isUploading && phase === 'done' && displayCount === 0) {
      setDisplayCount(photoCount);
      setShowButtons(true);
    }
  }, []);

  const handleContinue = () => {
    setPhase('done');
    const duration = 800;
    const start = performance.now();
    const target = photoCount;
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      else setTimeout(() => setShowButtons(true), 300);
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const addPhotos = useEditorStore(s => s.addPhotos);
  const handleAddMore = useCallback((e) => {
    if (e.target.files?.length) {
      addPhotos(e.target.files);
      e.target.value = '';
      setPhase('uploading');
      setShowButtons(false);
    }
  }, [addPhotos]);

  /* ── Galerie reutilizabilă ── */
  const PhotoGallery = ({ showStatus, maxH = '45vh' }) => {
    if (photos.length === 0) return null;

    return (
      <div className="rounded-2xl overflow-hidden bg-[#F5F3F0]">
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: maxH, WebkitOverflowScrolling: 'touch' }}>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-[1.5px]">
          {photos.map((p, i) => {
            const hasSrc = p.thumbData || p.previewUrl;
            const isDone = !!p.storageUrl;
            const filePct = showStatus && !isDone ? (getUploadPct(p.id) || 0) : 0;
            return (
              <div key={p.id || i} className="relative aspect-square overflow-hidden bg-[#EAE6E0]">
                {hasSrc ? (
                  <img src={p.thumbData || p.previewUrl} alt=""
                    className="w-full h-full object-cover" loading="eager" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#3D6B5E]/20 border-t-[#3D6B5E] rounded-full animate-spin" />
                  </div>
                )}
                {/* Overlay încărcare */}
                {showStatus && !isDone && hasSrc && (
                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full border-[2.5px] border-white/30 border-t-white animate-spin" />
                  </div>
                )}
                {/* Checkmark */}
                {showStatus && isDone && (
                  <div className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full bg-[#3D6B5E] flex items-center justify-center">
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                {/* Progress bar */}
                {showStatus && !isDone && filePct > 0 && (
                  <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/20">
                    <div className="h-full bg-white transition-all duration-300" style={{ width: `${filePct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes uf-slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes uf-scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes uf-fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes uf-drawCircle {
          from { stroke-dashoffset: 157; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes uf-drawCheck {
          from { stroke-dashoffset: 36; }
          to   { stroke-dashoffset: 0; }
        }
        .uf-popup {
          animation: uf-slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @media (min-width: 640px) {
          .uf-popup { animation: uf-scaleIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        }
        .uf-btn { opacity: 0; transform: translateY(6px); }
        .uf-btn.show { animation: uf-fadeIn 0.3s ease forwards; }
      `}</style>

      <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">

        {/* Popup — un singur scroll, fără scroll imbricat */}
        <div className="uf-popup bg-white w-full sm:max-w-[420px] max-h-[90vh] overflow-y-auto rounded-t-[24px] sm:rounded-2xl shadow-xl"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>

          {/* Drag handle mobil */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1.5 rounded-full bg-[#DDD]" />
          </div>

          <div className="px-4 pt-3 pb-5 sm:px-8 sm:pt-6 sm:pb-8" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}>

            {/* ═══ FAZA 1: UPLOAD ÎN CURS ═══ */}
            {phase === 'uploading' && (
              <>
                <div className="text-center mb-3">
                  <p className="text-[18px] font-semibold text-[#1C1C1E]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Se încarcă pozele tale...
                  </p>
                  <p className="text-[15px] text-[#888] mt-1">
                    {readyCount} din {photoCount} fotografii
                  </p>
                </div>

                {/* Progress bar */}
                <div className="h-[6px] bg-[#F0EDE6] rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-[#3D6B5E] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(3, pct)}%` }} />
                </div>
                <div className="flex justify-between items-center text-[12px] text-[#B0A89E] mb-4 px-0.5">
                  <span>{formatMB(uploadBytesSent)} / {formatMB(uploadBytesTotal)} MB</span>
                  <span>{speedLabel}{etaLabel ? ` · ${etaLabel}` : ''}</span>
                </div>

                {/* Galerie — toate pozele, cu status, fără scroll propriu */}
                <PhotoGallery showStatus />

                {/* Adaugă mai multe */}
                <button onClick={() => fileRef.current?.click()}
                  className="w-full min-h-[52px] py-3 rounded-xl text-[15px] font-medium text-[#3D6B5E] bg-[#EAF0EC] active:scale-[0.98] transition-all mt-4">
                  + Mai adaugă fotografii
                </button>
                <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic"
                  className="hidden" onChange={handleAddMore} />

                <p className="text-center text-[13px] text-[#B0A89E] mt-3">
                  Nu închide aplicația — pozele se încarcă
                </p>
              </>
            )}

            {/* ═══ FAZA READY ═══ */}
            {phase === 'ready' && (
              <>
                <div className="flex justify-center mb-3">
                  <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="25" stroke="#3D6B5E" strokeWidth="2.5" fill="none"
                      style={{ strokeDasharray: 157, strokeDashoffset: 157, animation: 'uf-drawCircle 0.6s ease forwards' }} />
                    <path d="M22 33 L29 40 L42 25" stroke="#3D6B5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
                      style={{ strokeDasharray: 36, strokeDashoffset: 36, animation: 'uf-drawCheck 0.4s ease 0.5s forwards' }} />
                  </svg>
                </div>

                <h2 className="text-center text-[20px] font-bold text-[#1C1C1E] mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {hasEnough ? 'Super!' : 'Mai ai nevoie de poze'} {photoCount} fotografii încărcate
                </h2>

                {/* Galerie — compact, fără status */}
                <PhotoGallery showStatus={false} maxH="35vh" />

                {/* Info minim necesar */}
                {hasEnough ? (
                  <p className="text-center text-[14px] text-[#888] mt-4 mb-4">
                    Mai ai poze de adăugat sau mergem mai departe?
                  </p>
                ) : (
                  <div className="text-center mt-4 mb-4">
                    <p className="text-[14px] text-[#B54A3A] font-medium mb-2">
                      Pentru {totalPages} pagini ai nevoie de minim {minPhotos} fotografii
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex-1 max-w-[200px] h-[6px] bg-[#F0EDE6] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500 bg-[#F59E0B]"
                          style={{ width: `${Math.min(100, (photoCount / minPhotos) * 100)}%` }} />
                      </div>
                      <span className="text-[13px] text-[#888] font-medium">{photoCount}/{minPhotos}</span>
                    </div>
                    <p className="text-[13px] text-[#888] mt-2">
                      Mai adaugă cel puțin <strong className="text-[#1C1C1E]">{needMore}</strong> fotografii
                    </p>
                  </div>
                )}

                <button onClick={hasEnough ? handleContinue : undefined}
                  disabled={!hasEnough}
                  className={`w-full min-h-[56px] rounded-xl font-bold text-[16px] active:scale-[0.98] transition-all mb-2 ${
                    hasEnough ? 'bg-[#1C1C1E] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}>
                  {hasEnough ? 'Continuă →' : `Mai ai nevoie de ${needMore} poze`}
                </button>

                <button onClick={() => { fileRef.current?.click(); }}
                  className="w-full min-h-[52px] rounded-xl text-[15px] font-medium text-[#3D6B5E] bg-[#EAF0EC] active:scale-[0.98] transition-all">
                  + Mai adaugă fotografii
                </button>
                <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic"
                  className="hidden" onChange={handleAddMore} />
              </>
            )}

            {/* ═══ FAZA 3: ARANJARE ═══ */}
            {phase === 'done' && (
              <>
                <div className="flex justify-center mb-3 sm:mb-4">
                  <svg width="52" height="52" className="sm:w-14 sm:h-14" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="25" stroke="#3D6B5E" strokeWidth="2.5" fill="none"
                      style={{ strokeDasharray: 157, strokeDashoffset: 157, animation: 'uf-drawCircle 0.6s ease forwards' }} />
                    <path d="M22 33 L29 40 L42 25" stroke="#3D6B5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
                      style={{ strokeDasharray: 36, strokeDashoffset: 36, animation: 'uf-drawCheck 0.4s ease 0.5s forwards' }} />
                  </svg>
                </div>

                <h2 className="text-center text-[20px] font-bold text-[#1C1C1E] mb-0.5 sm:mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Gata! {displayCount} fotografii încărcate
                </h2>
                <p className="text-center text-[14px] text-[#888] mb-4 sm:mb-6">
                  Cum vrei să le aranjăm pe pagini?
                </p>

                <div className={`uf-btn ${showButtons ? 'show' : ''}`}>
                  <button onClick={onAutoFill}
                    className="w-full flex items-center gap-4 min-h-[60px] sm:min-h-[56px] p-4 rounded-xl bg-[#1C1C1E] text-white active:scale-[0.98] transition-all text-left">
                    <div className="w-12 h-12 sm:w-11 sm:h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[16px] sm:text-[15px] font-semibold">Aranjează automat</p>
                      <p className="text-[13px] sm:text-[12px] text-white/60 mt-0.5">Recomandat · Gata în 10 secunde</p>
                    </div>
                  </button>
                </div>

                <div className={`uf-btn ${showButtons ? 'show' : ''} mt-2`} style={{ animationDelay: '0.08s' }}>
                  <button onClick={onManual}
                    className="w-full flex items-center gap-4 min-h-[56px] sm:min-h-[52px] p-4 rounded-xl bg-[#F5F3F0] text-[#1C1C1E] active:scale-[0.98] transition-all text-left">
                    <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[15px] font-medium">Aranjez manual</p>
                      <p className="text-[12px] text-[#888] mt-0.5">Plasez fiecare poză unde vreau</p>
                    </div>
                  </button>
                </div>

                <div className={`uf-btn ${showButtons ? 'show' : ''} flex items-center gap-3 my-2 sm:my-3`} style={{ animationDelay: '0.12s' }}>
                  <div className="flex-1 h-px bg-[#E8E4DB]" />
                  <span className="text-[11px] text-[#C0B8AD]">sau</span>
                  <div className="flex-1 h-px bg-[#E8E4DB]" />
                </div>

                <div className={`uf-btn ${showButtons ? 'show' : ''}`} style={{ animationDelay: '0.16s' }}>
                  <button onClick={onDesigner}
                    className="w-full flex items-center gap-4 min-h-[56px] sm:min-h-[52px] p-4 rounded-xl bg-[#EAF0EC] text-[#3D6B5E] active:scale-[0.98] transition-all text-left">
                    <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3D6B5E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold">Designerul face totul</p>
                      <p className="text-[12px] text-[#3D6B5E]/60 mt-0.5">Gratuit · Verificare profesională</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
