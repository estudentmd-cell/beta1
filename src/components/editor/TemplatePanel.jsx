import { useMemo } from 'react';
import useEditorStore from '../../stores/useEditorStore';
import { buildTree, getVariantCount, assignPhotos, computeRects } from '../../utils/layoutEngine';

function LayoutPreview({ photos, variantIndex, size = 50, bounds }) {
  const w = size * 2, h = size;
  const n = photos.length;
  if (n === 0) return <div className="bg-[#E8E4DB] rounded" style={{ width: w, height: h }} />;

  const b = bounds || { top: 0, right: 0, bottom: 0, left: 0 };
  const innerX = w * b.left, innerY = h * b.top;
  const innerW = w * (1 - b.left - b.right), innerH = h * (1 - b.top - b.bottom);

  const tree = buildTree(n, variantIndex);
  assignPhotos(tree, photos);
  const rects = computeRects(tree, innerX, innerY, innerW, innerH, 0.5);

  return (
    <div className="relative bg-white rounded overflow-hidden" style={{ width: w, height: h, border: '1px solid #E0D8D0' }}>
      {rects.map((rect, i) => {
        const photo = rect.leaf?.photo;
        const src = photo?.thumbData || photo?.previewUrl;
        const crop = photo?.cropOffset || { opx: 50, opy: 50 };
        return (
          <div key={rect.leaf?.id || i} className="absolute overflow-hidden" style={{
            left: rect.x, top: rect.y,
            width: Math.max(rect.w - 1, 0), height: Math.max(rect.h - 1, 0),
          }}>
            {src ? (
              <img src={src} alt="" className="w-full h-full object-cover"
                style={{ objectPosition: `${crop.opx}% ${crop.opy}%` }}
                draggable={false} loading="lazy" />
            ) : (
              <div className="w-full h-full bg-[#E8E4DB]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TemplatePanel() {
  const spreads = useEditorStore(s => s.spreads);
  const currentSpread = useEditorStore(s => s.currentSpread);
  const _tick = useEditorStore(s => s._tick);

  const spread = spreads[currentSpread];
  const spreadPhotos = spread?.photos || [];
  const photoCount = spreadPhotos.length;
  const variantCount = useMemo(() => photoCount > 0 ? getVariantCount(photoCount) : 0, [photoCount]);

  // Margini variabile per variantă — spațiu alb diferit
  const BOUNDS_PRESETS = [
    { top: 0.06, right: 0.05, bottom: 0.06, left: 0.05 },
    { top: 0.08, right: 0.06, bottom: 0.08, left: 0.06 },
    { top: 0.05, right: 0.08, bottom: 0.05, left: 0.08 },
    { top: 0.10, right: 0.05, bottom: 0.10, left: 0.05 },
    { top: 0.06, right: 0.10, bottom: 0.06, left: 0.10 },
    { top: 0.08, right: 0.08, bottom: 0.08, left: 0.08 },
    { top: 0.05, right: 0.06, bottom: 0.05, left: 0.06 },
    { top: 0.12, right: 0.06, bottom: 0.12, left: 0.06 },
    { top: 0.06, right: 0.12, bottom: 0.06, left: 0.12 },
    { top: 0.10, right: 0.10, bottom: 0.10, left: 0.10 },
  ];

  const applyVariant = (vi) => {
    const state = useEditorStore.getState();
    const sp = state.spreads[state.currentSpread];
    if (!sp || sp.photos.length === 0) return;
    state._pushUndo();
    const tree = buildTree(sp.photos.length, vi);
    assignPhotos(tree, sp.photos);
    const bounds = BOUNDS_PRESETS[vi % BOUNDS_PRESETS.length];
    const newSpreads = [...state.spreads];
    newSpreads[state.currentSpread] = {
      ...sp, mode: 'spread',
      full: { photos: sp.photos, tree, _vi: vi, bounds },
    };
    useEditorStore.setState({ spreads: newSpreads, _dirty: true, saveStatus: 'idle', _tick: state._tick + 1 });
  };

  return (
    <div className="w-[240px] shrink-0 bg-[#FAF8F5] border-r border-[#E8E4DB] flex flex-col h-full overflow-hidden">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <h3 className="text-[13px] font-bold text-[#1A1A1A]">Colaje</h3>
        <p className="text-[10px] text-[#888] mt-0.5">
          {photoCount > 0
            ? `${variantCount} variante pentru ${photoCount} poze`
            : 'Selecteaza o pagina cu poze'
          }
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {photoCount === 0 ? (
          <div className="text-center py-8 text-[12px] text-[#888]">
            Plaseaza poze pe o pagina, apoi alege un colaj
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: variantCount }, (_, vi) => (
              <button key={vi}
                onClick={() => applyVariant(vi)}
                className="w-full text-left bg-white rounded-lg p-1.5 border border-[#E8E4DB] hover:border-[#3D6B5E] hover:shadow-sm transition-all active:scale-[0.98]">
                <LayoutPreview photos={spreadPhotos} variantIndex={vi} size={50} bounds={BOUNDS_PRESETS[vi % BOUNDS_PRESETS.length]} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
