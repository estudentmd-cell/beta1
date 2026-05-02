import { useState, useEffect } from 'react';
import useEditorStore from '../../stores/useEditorStore';
import { getProTemplates, loadProTemplates, getMatchingProTemplates } from '../../utils/layoutEngine';

/* ═══════════════════════════════════════════════════════════
   TEMPLATE PICKER — Shows available pro templates
   Works on desktop (dropdown) and mobile (bottom sheet)
   ═══════════════════════════════════════════════════════════ */

const MASK_CLIPS = {
  rect: 'none', rounded: 'inset(0 round 8%)',
  circle: 'ellipse(50% 50% at 50% 50%)', arch: 'inset(0 0 0 0 round 50% 50% 0 0)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
};

function MiniPreview({ template, size = 80 }) {
  const w = size * 2; // spread is 2:1 for square
  const h = size;
  return (
    <div style={{ width: w, height: h, background: '#fff', borderRadius: 6, position: 'relative', overflow: 'hidden', border: '1px solid #E0D8D0' }}>
      {/* Center line */}
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px dashed #E8E4DB', pointerEvents: 'none' }} />
      {(template.frames || []).map((f, i) => {
        const clip = MASK_CLIPS[f.mask] || 'none';
        return (
          <div key={i} style={{
            position: 'absolute',
            left: (f.x / 100) * w + 1, top: (f.y / 100) * h + 1,
            width: (f.w / 100) * w - 2, height: (f.h / 100) * h - 2,
            background: '#D5D0CA', borderRadius: f.mask === 'rounded' ? '8%' : 2,
            clipPath: clip !== 'none' ? clip : undefined,
            zIndex: f.zIndex || 0,
          }} />
        );
      })}
    </div>
  );
}

export default function TemplatePicker({ isOpen, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const spreads = useEditorStore(s => s.spreads);
  const currentSpread = useEditorStore(s => s.currentSpread);
  const applyProTemplate = useEditorStore(s => s.applyProTemplate);

  const spread = spreads[currentSpread];
  const photoCount = spread?.photos?.length || 0;

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    loadProTemplates().then(() => {
      setTemplates(getProTemplates());
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = async (tpl) => {
    await applyProTemplate(tpl);
    onClose();
  };

  // Group by category
  const byCategory = {};
  templates.forEach(t => {
    const cat = t.category || 'clasic';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(t);
  });

  // Matching templates (same photo count)
  const matching = photoCount > 0 ? templates.filter(t => t.photoCount === photoCount) : [];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose} />

      {/* ── Desktop: center popup ── */}
      <div className="hidden sm:block fixed inset-x-0 top-16 bottom-16 z-[61] pointer-events-none">
        <div className="max-w-[680px] mx-auto h-full pointer-events-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#E8E4DB] flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A]">Template-uri profesionale</h3>
              <p className="text-[11px] text-[#888]">
                {photoCount > 0
                  ? `${matching.length} template-uri pentru ${photoCount} poze · ${templates.length} total`
                  : `${templates.length} template-uri disponibile`
                }
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F0EDE6] text-[#888] text-lg">×</button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center py-8 text-[#888]">Se încarcă...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[14px] font-semibold text-[#1A1A1A]">Niciun template disponibil</p>
                <p className="text-[12px] text-[#888] mt-1">Echipa nu a creat încă template-uri profesionale.</p>
              </div>
            ) : (
              <>
                {/* Matching templates first */}
                {matching.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-[12px] font-bold text-[#3D6B5E] mb-2 uppercase">
                      Recomandate pentru {photoCount} poze
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {matching.map(tpl => (
                        <button key={tpl.id} onClick={() => handleApply(tpl)}
                          className="text-left bg-[#F8F6F3] rounded-xl p-2 border border-[#E8E4DB] hover:border-[#3D6B5E] hover:shadow-md transition-all group">
                          <MiniPreview template={tpl} size={55} />
                          <p className="text-[10px] font-semibold text-[#1A1A1A] mt-1 truncate max-w-[110px]">{tpl.name}</p>
                          <p className="text-[8px] text-[#999]">{tpl.photoCount} poze · {tpl.category}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* All templates by category */}
                {Object.entries(byCategory).map(([cat, items]) => (
                  <div key={cat} className="mb-5">
                    <h4 className="text-[11px] font-bold text-[#888] mb-2 uppercase capitalize">{cat}</h4>
                    <div className="flex flex-wrap gap-3">
                      {items.map(tpl => (
                        <button key={tpl.id} onClick={() => handleApply(tpl)}
                          className="text-left bg-white rounded-xl p-2 border border-[#EBEBEB] hover:border-[#3D6B5E] hover:shadow-md transition-all">
                          <MiniPreview template={tpl} size={50} />
                          <p className="text-[10px] font-semibold text-[#1A1A1A] mt-1 truncate max-w-[100px]">{tpl.name}</p>
                          <p className="text-[8px] text-[#999]">{tpl.photoCount}P</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile: bottom sheet ── */}
      <div className="sm:hidden fixed left-0 right-0 bottom-0 z-[61] bg-white rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '70vh' }}>
        {/* Handle + Header */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-[#D0CAC0] rounded-full" />
        </div>
        <div className="px-4 pb-3 border-b border-[#E8E4DB] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-[14px] font-bold text-[#1A1A1A]">Template-uri</h3>
            <p className="text-[11px] text-[#888]">
              {photoCount > 0 ? `${matching.length} pentru ${photoCount} poze` : `${templates.length} disponibile`}
            </p>
          </div>
          <button onClick={onClose} className="text-[13px] text-[#3D6B5E] font-semibold px-2 py-1">Gata</button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="text-center py-6 text-[#888] text-sm">Se încarcă...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[13px] text-[#888]">Niciun template disponibil</p>
            </div>
          ) : (
            <>
              {/* Matching first */}
              {matching.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[11px] font-bold text-[#3D6B5E] mb-2">
                    Recomandate ({matching.length})
                  </h4>
                  <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    {matching.map(tpl => (
                      <button key={tpl.id} onClick={() => handleApply(tpl)}
                        className="text-left bg-[#F8F6F3] rounded-xl p-2 border border-[#E8E4DB] active:scale-95 transition-all shrink-0">
                        <MiniPreview template={tpl} size={45} />
                        <p className="text-[9px] font-semibold text-[#1A1A1A] mt-1 truncate" style={{ maxWidth: 90 }}>{tpl.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All by category */}
              {Object.entries(byCategory).map(([cat, items]) => (
                <div key={cat} className="mb-3">
                  <h4 className="text-[10px] font-bold text-[#888] mb-1.5 uppercase">{cat}</h4>
                  <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    {items.map(tpl => (
                      <button key={tpl.id} onClick={() => handleApply(tpl)}
                        className="text-left bg-white rounded-lg p-1.5 border border-[#EBEBEB] active:scale-95 transition-all shrink-0">
                        <MiniPreview template={tpl} size={40} />
                        <p className="text-[8px] font-semibold text-[#1A1A1A] mt-0.5 truncate" style={{ maxWidth: 80 }}>{tpl.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
