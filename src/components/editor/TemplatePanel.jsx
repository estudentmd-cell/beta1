import { useMemo } from 'react';
import useEditorStore from '../../stores/useEditorStore';
import { generatePageLayouts, getPhotoRatios } from '../../utils/collageLayoutEngine';

function CollagePreview({ cells, photos, size = 50 }) {
  const w = size * 2, h = size;
  return (
    <div className="relative bg-white rounded overflow-hidden" style={{ width: w, height: h, border: '1px solid #E0D8D0' }}>
      {cells.map((cell, i) => {
        const photo = photos[i];
        const src = photo?.thumbData || photo?.previewUrl;
        const crop = photo?.cropOffset || { opx: 50, opy: 50 };
        return (
          <div key={i} className="absolute overflow-hidden" style={{
            left: cell.x * w, top: cell.y * h,
            width: cell.width * w, height: cell.height * h,
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
  const applyCollageLayout = useEditorStore(s => s.applyCollageLayout);

  const spread = spreads[currentSpread];
  const spreadPhotos = spread?.photos || [];
  const photoCount = spreadPhotos.length;

  const ratios = useMemo(() => getPhotoRatios(spreadPhotos), [spreadPhotos, _tick]);

  const layouts = useMemo(() => {
    if (photoCount === 0) return [];
    return generatePageLayouts(ratios);
  }, [ratios, photoCount]);

  return (
    <div className="w-[240px] shrink-0 bg-[#FAF8F5] border-r border-[#E8E4DB] flex flex-col h-full overflow-hidden">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <h3 className="text-[13px] font-bold text-[#1A1A1A]">Colaje</h3>
        <p className="text-[10px] text-[#888] mt-0.5">
          {photoCount > 0
            ? `${layouts.length} variante pentru ${photoCount} poze`
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
            {layouts.map((layout) => (
              <button key={layout.id}
                onClick={() => applyCollageLayout(layout.cells)}
                className="w-full text-left bg-white rounded-lg p-1.5 border border-[#E8E4DB] hover:border-[#3D6B5E] hover:shadow-sm transition-all active:scale-[0.98]">
                <CollagePreview cells={layout.cells} photos={spreadPhotos} size={50} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
