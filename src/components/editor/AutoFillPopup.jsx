import { useState, useMemo } from 'react';
import useEditorStore from '../../stores/useEditorStore';
import useProjectStore from '../../stores/useProjectStore';
import useAuthStore from '../../stores/useAuthStore';
import useUIStore from '../../stores/useUIStore';
import { useLivePricing } from '../../hooks/usePricingAdmin';
import { getPagePrice } from '../../utils/pricing';
import { saveProject, createProjectSnapshot } from '../../utils/projectStorage';

const MIN_PER_SPREAD = 2;  // minim 1 poză pe pagină = 2 pe rotație
const MAX_PER_SPREAD = 12; // maxim 6 poze pe pagină = 12 pe rotație

/**
 * Generează opțiuni smart bazate pe nr de poze și rotații.
 * Regulă: TOATE rotațiile primesc poze, distribuție egală.
 */
function computeStyles(photoCount, spreadCount) {
  // Prea puține poze? (minim 2 pe rotație = 1 pe pagină)
  if (photoCount < spreadCount * MIN_PER_SPREAD) {
    return { needMore: spreadCount * MIN_PER_SPREAD - photoCount, styles: [] };
  }

  const natural = photoCount / spreadCount;
  const styles = [];
  const seenAvg = new Set();

  // Dacă avg > MAX, trebuie rotații extra ca să nu depășim 12/rotație
  let startExtra = 0;
  if (natural > MAX_PER_SPREAD) {
    const minSpreads = Math.ceil(photoCount / MAX_PER_SPREAD);
    startExtra = Math.ceil((minSpreads - spreadCount) / 5) * 5;
  }

  // Generează opțiuni: 0 extra (cel mai dens), +5, +10... (mai spațios)
  for (let extra = startExtra; styles.length < 3; extra += 5) {
    const totalSpreads = spreadCount + extra;
    const avg = photoCount / totalSpreads;
    if (avg < MIN_PER_SPREAD) break;

    const avgPerPage = Math.max(1, Math.round(avg / 2));

    // Evită opțiuni duplicate (aceeași densitate vizuală)
    if (seenAvg.has(avgPerPage)) {
      if (extra > startExtra + 30) break;
      continue;
    }
    seenAvg.add(avgPerPage);

    styles.push({
      id: `opt-${extra}`,
      addedSpreads: extra,
      totalSpreads,
      totalPages: totalSpreads * 2,
      addedPages: extra * 2,
      avgPerPage,
      avgPerSpread: Math.round(avg * 10) / 10,
      recommended: styles.length === 0,
    });
  }

  return { needMore: 0, styles };
}

export default function AutoFillPopup({ onClose, onDone }) {
  const [animating, setAnimating] = useState(false);
  const photos = useEditorStore(s => s.photos);
  const spreads = useEditorStore(s => s.spreads);
  const autoFillSpreads = useEditorStore(s => s.autoFillSpreads);
  const { productConfig } = useProjectStore();
  const { getPrice: liveGetPrice } = useLivePricing();

  const photoCount = photos.length;
  const interiorSpreads = spreads.filter(s => !s.isCover).length;
  const currentPages = interiorSpreads * 2;
  const format = productConfig?.format || '20×20';
  const slug = productConfig?.slug || 'pagini-groase';

  const { needMore, styles } = useMemo(() => {
    return computeStyles(photoCount, interiorSpreads);
  }, [photoCount, interiorSpreads]);

  const [selectedId, setSelectedId] = useState(() => {
    const rec = styles.find(s => s.recommended);
    return rec?.id || styles[0]?.id || '';
  });

  const selected = styles.find(s => s.id === selectedId) || styles[0];

  // Preț estimat — ofertă: prețul din config, normal: calculat din pricing
  const price = useMemo(() => {
    if (!selected) return 0;
    if (productConfig?._offerId) return productConfig.basePrice || 0;
    const p = liveGetPrice
      ? liveGetPrice(format, selected.totalPages, slug)
      : getPagePrice(format, selected.totalPages, slug);
    return p || 0;
  }, [selected, format, slug, liveGetPrice, productConfig]);

  const isUploading = useEditorStore(s => s.isUploading);

  const handleFill = () => {
    if (!selected) return;
    if (isUploading) return; // Nu aranja în timp ce se încarcă
    setAnimating(true);
    setTimeout(() => {
      try {
        autoFillSpreads(selected.addedSpreads);
        // Actualizează nr pagini în project store dacă s-au adăugat
        if (selected.addedPages > 0) {
          const pc = useProjectStore.getState().productConfig;
          if (pc) {
            useProjectStore.setState({
              productConfig: { ...pc, initialPages: (pc.initialPages || currentPages) + selected.addedPages },
            });
          }
        }
        // Salvare imediată în Firestore — fără debounce
        const projectId = useProjectStore.getState().currentProjectId;
        if (projectId) {
          const snap = createProjectSnapshot(projectId, useProjectStore.getState(), useEditorStore.getState(), useAuthStore.getState());
          saveProject(snap).then(() => useEditorStore.getState().markSaved()).catch(() => {});
        }
      } catch (err) {
        console.error('[AutoFill] error:', err);
      }
      setTimeout(() => {
        setAnimating(false);
        if (onDone) onDone();
      }, 1800);
    }, 400);
  };

  // ── Animație de aranjare ──
  if (animating) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center animate-[fadeIn_0.3s_ease]">
          <div className="mb-6 h-28 flex items-center justify-center">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="w-8 h-10 bg-[#3D6B5E] rounded animate-[cardDrop_0.5s_ease_forwards]"
                    style={{ animationDelay: `${i * 0.12}s`, opacity: 0 }} />
                  <div className="w-8 h-10 bg-[#3D6B5E]/60 rounded animate-[cardDrop_0.5s_ease_forwards]"
                    style={{ animationDelay: `${i * 0.12 + 0.06}s`, opacity: 0 }} />
                </div>
              ))}
            </div>
          </div>
          <p className="text-[17px] font-bold text-[#1A1A1A] mb-1">Aranjăm albumul tău...</p>
          <p className="text-[13px] text-[#888]">{photoCount} fotografii pe {selected?.totalPages || currentPages} pagini</p>
          <style>{`
            @keyframes cardDrop {
              0% { opacity: 0; transform: translateY(-30px) scale(0.7) rotate(-8deg); }
              50% { opacity: 1; transform: translateY(4px) scale(1.05) rotate(2deg); }
              100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // ── Nu sunt destule poze ──
  if (needMore > 0) {
    return (
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white w-full sm:max-w-[420px] sm:rounded-2xl rounded-t-[20px] shadow-2xl animate-[slideUp_0.3s_ease] p-6 text-center"
          onClick={e => e.stopPropagation()}>

          {/* Drag handle mobile */}
          <div className="sm:hidden flex justify-center -mt-3 mb-3">
            <div className="w-10 h-1 rounded-full bg-[#DDD]" />
          </div>

          <button onClick={onClose} className="absolute top-4 right-4 text-[#BBB] hover:text-[#666] text-xl leading-none">&times;</button>

          <div className="w-16 h-16 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
              <path d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14" />
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </div>

          <h2 className="text-[18px] font-bold text-[#1A1A1A] mb-2">Mai ai nevoie de fotografii</h2>
          <p className="text-[14px] text-[#666] leading-relaxed mb-6">
            Ai <strong className="text-[#1A1A1A]">{photoCount}</strong> fotografii
            și <strong className="text-[#1A1A1A]">{currentPages}</strong> pagini.<br />
            Încarcă cel puțin <strong className="text-[#3D6B5E]">{needMore}</strong> fotografii
            în plus ca să umpli toate paginile.
          </p>

          <button onClick={() => { onClose(); setTimeout(() => useUIStore.getState().openModal('upload'), 100); }}
            className="w-full h-[50px] bg-[#3D6B5E] text-white rounded-xl font-bold text-[15px] hover:bg-[#2d5445] active:scale-[0.98] transition-all mb-2">
            Încarcă fotografii
          </button>

          <button onClick={() => {
            useProjectStore.getState().setChosenPath?.('designer');
            useProjectStore.getState().setServiceLevel?.('full_design');
            const { user, authMethod } = useAuthStore.getState();
            const hasAuth = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
            onClose();
            if (!hasAuth) {
              useUIStore.getState().openModal('auth', { returnTo: '/app/checkout' });
            } else {
              import('./../../router').then(m => m.router.navigate('/app/checkout'));
            }
          }}
            className="w-full h-[44px] bg-[#EAF0EC] text-[#3D6B5E] rounded-xl font-semibold text-[13px] hover:bg-[#DCE8E0] active:scale-[0.98] transition-all">
            Designerul aranjează totul pentru mine
          </button>
        </div>

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  const isOffer = !!productConfig?._offerId;
  const avgPerPageOffer = isOffer ? Math.max(1, Math.round(photoCount / currentPages)) : 0;

  // ── OFERTĂ: fără opțiuni, aranjează direct pe paginile fixe ──
  if (isOffer) {
    return (
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white w-full sm:max-w-[420px] sm:rounded-2xl rounded-t-[20px] shadow-2xl animate-[slideUp_0.3s_ease]"
          onClick={e => e.stopPropagation()}>

          <div className="sm:hidden flex justify-center pt-3">
            <div className="w-10 h-1 rounded-full bg-[#DDD]" />
          </div>

          <div className="px-6 pt-5 pb-4">
            <button onClick={onClose} className="absolute top-4 right-4 text-[#BBB] hover:text-[#666] text-xl leading-none">&times;</button>
            <h2 className="text-[18px] font-bold text-[#1A1A1A]">Hai să aranjăm albumul!</h2>
            <p className="text-[13px] text-[#888] mt-1">{photoCount} fotografii · {currentPages} pagini</p>
          </div>

          {/* Info — densitate vizuală */}
          <div className="mx-6 mb-4 bg-[#EAF0EC] rounded-xl px-4 py-3.5 border border-[#3D6B5E]/15">
            <div className="flex items-center gap-3">
              <MiniSpread count={Math.min(Math.round(photoCount / interiorSpreads), 10)} isSelected={true} />
              <div>
                <p className="text-[14px] font-semibold text-[#3D6B5E]">~{avgPerPageOffer} {avgPerPageOffer === 1 ? 'poză' : 'poze'} pe pagină</p>
                <p className="text-[11px] text-[#888]">{currentPages} pagini · aspect plăcut garantat</p>
              </div>
            </div>
          </div>

          <div className="px-6 pb-5 space-y-2">
            <button onClick={() => { setAnimating(true); setTimeout(() => { try { autoFillSpreads(0); const pid = useProjectStore.getState().currentProjectId; if (pid) { const snap = createProjectSnapshot(pid, useProjectStore.getState(), useEditorStore.getState(), useAuthStore.getState()); saveProject(snap).then(() => useEditorStore.getState().markSaved()).catch(() => {}); } } catch(e) { console.error(e); } setTimeout(() => { setAnimating(false); if (onDone) onDone(); }, 1800); }, 400); }} disabled={isUploading}
              className={`w-full h-[50px] rounded-xl font-bold text-[15px] active:scale-[0.98] transition-all ${
                isUploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#1C1C1E] text-white hover:bg-[#333]'
              }`}>
              {isUploading ? 'Așteaptă — pozele se încarcă...' : 'Aranjează automat'}
            </button>

            <button onClick={() => {
              useProjectStore.getState().setChosenPath?.('designer');
              useProjectStore.getState().setServiceLevel?.('full_design');
              const { user, authMethod } = useAuthStore.getState();
              const hasAuth = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
              onClose();
              if (!hasAuth) {
                useUIStore.getState().openModal('auth', { returnTo: '/app/checkout' });
              } else {
                import('./../../router').then(m => m.router.navigate('/app/checkout'));
              }
            }}
              className="w-full h-[44px] bg-[#EAF0EC] text-[#3D6B5E] rounded-xl font-semibold text-[13px] hover:bg-[#DCE8E0] active:scale-[0.98] transition-all">
              Designerul aranjează totul pentru mine
            </button>

            <button onClick={onClose}
              className="w-full h-[36px] text-[12px] text-[#BBB] hover:text-[#888] transition font-medium">
              Vreau să modific pozele mai întâi
            </button>
          </div>
        </div>

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ── NORMAL (fără ofertă): selectare stil cu opțiuni ──
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white w-full sm:max-w-[420px] sm:rounded-2xl rounded-t-[20px] shadow-2xl animate-[slideUp_0.3s_ease]"
        onClick={e => e.stopPropagation()}>

        {/* Drag handle mobile */}
        <div className="sm:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-[#DDD]" />
        </div>

        {/* Header */}
        <div className="px-6 pt-5 pb-3">
          <button onClick={onClose} className="absolute top-4 right-4 text-[#BBB] hover:text-[#666] text-xl leading-none">&times;</button>
          <h2 className="text-[18px] font-bold text-[#1A1A1A]">Hai să aranjăm albumul!</h2>
          <p className="text-[13px] text-[#888] mt-1">{photoCount} fotografii · {currentPages} pagini</p>
        </div>

        {/* Opțiuni */}
        <div className="px-6 pb-3 space-y-2">
          {styles.map(style => {
            const isSelected = selectedId === style.id;
            const vizCount = Math.min(Math.round(style.avgPerSpread), 10);
            return (
              <button key={style.id} onClick={() => setSelectedId(style.id)}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border-2 transition-all text-left ${
                  isSelected ? 'border-[#3D6B5E] bg-[#EAF0EC]' : 'border-[#EBEBEB] hover:border-[#3D6B5E]/30'
                }`}>
                {/* Mini preview — rotație cu poze */}
                <MiniSpread count={vizCount} isSelected={isSelected} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-[14px] font-semibold ${isSelected ? 'text-[#3D6B5E]' : 'text-[#1A1A1A]'}`}>
                      ~{style.avgPerPage} {style.avgPerPage === 1 ? 'poză' : 'poze'} pe pagină
                    </p>
                    {style.recommended && (
                      <span className="text-[10px] font-bold text-[#3D6B5E] bg-[#3D6B5E]/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        Recomandat
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#999]">
                    {style.totalPages} pagini
                    {style.addedPages > 0 && (
                      <span className="text-[#F59E0B]"> (+{style.addedPages} pagini noi)</span>
                    )}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? 'border-[#3D6B5E] bg-[#3D6B5E]' : 'border-[#DDD]'
                }`}>
                  {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Preț estimat */}
        {price > 0 && selected && (
          <div className="mx-6 mb-3 bg-[#F8F7F5] rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[#1A1A1A]">{selected.totalPages} pagini</p>
              <p className="text-[16px] font-bold text-[#1A1A1A]">~{Math.round(price)} lei</p>
            </div>
          </div>
        )}

        {/* Butoane */}
        <div className="px-6 pb-5 pt-1 space-y-2">
          <button onClick={handleFill} disabled={isUploading}
            className={`w-full h-[50px] rounded-xl font-bold text-[15px] active:scale-[0.98] transition-all ${
              isUploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#1C1C1E] text-white hover:bg-[#333]'
            }`}>
            {isUploading ? 'Așteaptă — pozele se încarcă...' : 'Aranjează automat'}
          </button>

          <button onClick={() => {
            useProjectStore.getState().setChosenPath?.('designer');
            useProjectStore.getState().setServiceLevel?.('full_design');
            const { user, authMethod } = useAuthStore.getState();
            const hasAuth = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
            onClose();
            if (!hasAuth) {
              useUIStore.getState().openModal('auth', { returnTo: '/app/checkout' });
            } else {
              import('./../../router').then(m => m.router.navigate('/app/checkout'));
            }
          }}
            className="w-full h-[44px] bg-[#EAF0EC] text-[#3D6B5E] rounded-xl font-semibold text-[13px] hover:bg-[#DCE8E0] active:scale-[0.98] transition-all">
            Designerul aranjează totul pentru mine
          </button>

          <button onClick={onClose}
            className="w-full h-[36px] text-[12px] text-[#BBB] hover:text-[#888] transition font-medium">
            Vreau să modific pozele mai întâi
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/** Mini preview — arată densitatea pe o rotație (2 pagini) */
function MiniSpread({ count, isSelected }) {
  const left = Math.ceil(count / 2);
  const right = count - left;
  const color = isSelected ? 'bg-[#3D6B5E]' : 'bg-[#CCC]';
  const sz = count > 8 ? { w: 4, h: 5 } : count > 4 ? { w: 5, h: 6 } : { w: 7, h: 8 };

  return (
    <div className={`flex gap-px w-14 h-10 rounded-lg items-center justify-center shrink-0 ${
      isSelected ? 'bg-[#3D6B5E]/10' : 'bg-[#F5F3F0]'
    }`}>
      <div className="flex flex-wrap gap-[2px] justify-center items-center" style={{ width: 24 }}>
        {Array.from({ length: Math.min(left, 6) }).map((_, i) => (
          <div key={i} className={`rounded-[1px] ${color}`} style={{ width: sz.w, height: sz.h }} />
        ))}
      </div>
      <div className={`w-px h-6 ${isSelected ? 'bg-[#3D6B5E]/20' : 'bg-[#E5E5EA]'}`} />
      <div className="flex flex-wrap gap-[2px] justify-center items-center" style={{ width: 24 }}>
        {Array.from({ length: Math.min(right, 6) }).map((_, i) => (
          <div key={i} className={`rounded-[1px] ${color}`} style={{ width: sz.w, height: sz.h }} />
        ))}
      </div>
    </div>
  );
}
