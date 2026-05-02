import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import useProjectStore from '../stores/useProjectStore';
import { getAllCoverTemplates, getAllCoverTemplatesAsync, COVER_CATEGORIES } from '../utils/coverData';

function CameraIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#B0AAA2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

/* ── Realistic album mockup — standing book with shadow and edge ── */
function AlbumMockup({ template, isActive, format }) {
  const [fW, fH] = (format || '20×20').split('×').map(Number);
  const aspectRatio = fW / fH;
  const bg = template.coverStyle?.bg || '#FFFFFF';
  const bgImage = template.coverStyle?.bgImage;
  const accent = template.coverStyle?.accent || '#1A1A2E';

  // Content renderer (shared between cover face)
  const coverContent = (
    <>
      {(template.frames || []).map((f) => (
        <div key={f.id} className="absolute overflow-hidden"
          style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, height: `${f.h}%` }}>
          {f.previewSrc
            ? <img src={f.previewSrc} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-[#F0EFEC] flex items-center justify-center"><CameraIcon size={Math.min(f.w, f.h) > 30 ? 18 : 11} /></div>}
        </div>
      ))}
      {(template.decorImages || []).map((di) => (
        di.src && <div key={di.id} className="absolute overflow-hidden"
          style={{ left: `${di.x}%`, top: `${di.y}%`, width: `${di.w}%`, height: `${di.h}%` }}>
          <img src={di.src} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
      {(template.decorTexts || []).map((dt) => (
        <div key={dt.id} className="absolute flex items-center justify-center overflow-hidden"
          style={{ left: `${dt.x}%`, top: `${dt.y}%`, width: `${dt.w}%`, height: `${dt.h}%` }}>
          <span style={{
            fontSize: `clamp(8px, ${dt.fontSize * 0.6}px, 22px)`,
            fontWeight: dt.fontWeight || 'normal', color: dt.color || accent,
            letterSpacing: dt.fontWeight === 'bold' ? '0.08em' : '0.02em',
            fontFamily: dt.fontFamily || "'DM Serif Display', Georgia, serif",
            whiteSpace: 'nowrap',
          }}>{dt.text}</span>
        </div>
      ))}
      {(template.texts || []).map((t) => (
        <div key={t.id} className="absolute flex items-center justify-center"
          style={{ left: `${t.x}%`, top: `${t.y}%`, width: `${t.w}%`, height: `${t.h}%` }}>
          <span style={{
            fontSize: `clamp(6px, ${(t.fontSize || 12) * 0.45}px, 14px)`,
            color: 'rgba(0,0,0,0.15)', letterSpacing: '0.06em',
            fontFamily: "'DM Serif Display', Georgia, serif",
          }}>{t.placeholder || ''}</span>
        </div>
      ))}
    </>
  );

  return (
    <div className={`relative transition-all duration-200 ${isActive ? 'scale-[1.01]' : 'hover:scale-[1.005]'}`}>
      {/* Single book shape: spine + cover as one piece */}
      <div className={`relative rounded-[4px] overflow-hidden ${isActive ? 'ring-2 ring-[#3D6B5A]' : ''}`}
        style={{
          background: bg,
          boxShadow: '3px 5px 20px rgba(0,0,0,0.12), 1px 2px 6px rgba(0,0,0,0.06)',
        }}>
        {bgImage && <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }} />}

        <div className="relative" style={{ paddingBottom: `${(1 / aspectRatio) * 100}%`, zIndex: 1 }}>
          <div className="absolute inset-0">
            {coverContent}
          </div>
        </div>

        {/* Spine (cotor) — vertical band on left with inner shadow */}
        <div className="absolute top-0 bottom-0 left-0 pointer-events-none" style={{ width: 14, zIndex: 3 }}>
          {/* Spine groove — dark line */}
          <div className="absolute top-0 bottom-0 right-0" style={{
            width: 1.5,
            background: 'rgba(0,0,0,0.1)',
          }} />
          {/* Spine shadow spread */}
          <div className="absolute top-0 bottom-0 right-0" style={{
            width: 8,
            background: 'linear-gradient(270deg, rgba(0,0,0,0.06), transparent)',
          }} />
          {/* Spine highlight (left edge) */}
          <div className="absolute top-0 bottom-0 left-0" style={{
            width: 2,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.15), transparent)',
          }} />
        </div>

        {/* Top edge line */}
        <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{
          height: 1.5,
          background: 'rgba(0,0,0,0.04)',
          zIndex: 3,
        }} />
      </div>
    </div>
  );
}

export default function CoverScreen() {
  const navigate = useNavigate();
  const { productConfig } = useProjectStore();
  const [selected, setSelected] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  // Load templates — instant from localStorage, then fetch Firestore
  const [allTemplates, setAllTemplates] = useState([]);
  useEffect(() => {
    getAllCoverTemplatesAsync().then(setAllTemplates).catch(() => {});
  }, []);

  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'all') return allTemplates;
    return allTemplates.filter((t) => t.theme === activeCategory);
  }, [activeCategory, allTemplates]);

  const handleContinue = () => {
    if (!selected) return;
    const { id, name, frames, texts, coverStyle, decorTexts, decorImages } = selected;
    useProjectStore.getState().setCoverTemplate({ id, name, frames, texts, coverStyle, decorTexts, decorImages });
    navigate('/app/editor');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header — now in RootLayout globally */}

      <div className="max-w-5xl xl:max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-serif text-2xl md:text-3xl mb-2">Alege designul copertei</h1>
          <p className="text-sm text-tx-2">
            {productConfig.name} · {productConfig.format} · {productConfig.initialPages} pagini
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 justify-center flex-wrap">
          {COVER_CATEGORIES.map((cat) => {
            const count = cat.id === 'all'
              ? allTemplates.length
              : allTemplates.filter((t) => t.theme === cat.id).length;
            if (cat.id !== 'all' && count === 0) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-[#3D6B5A] text-white shadow-sm'
                    : 'bg-white text-[#666] border border-[#E0DDD8] hover:border-[#3D6B5A]/30'
                }`}
              >
                {cat.label}
                {count > 0 && <span className="ml-1.5 text-xs opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Cover grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 mb-10 max-w-[1400px] mx-auto">
          {filteredTemplates.map((tpl) => {
            const isActive = selected?.id === tpl.id;
            return (
              <button
                key={tpl.id}
                onClick={() => setSelected(tpl)}
                className="text-left group"
              >
                <div className="mb-2">
                  <AlbumMockup template={tpl} isActive={isActive} format={productConfig.format} />
                </div>
                <div className="flex items-center gap-1.5 px-0.5">
                  <svg className="w-4 h-4 text-[#B0AAA2] shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isActive ? '#3D6B5A' : 'none'} stroke={isActive ? '#3D6B5A' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                  <h3 className={`text-sm font-semibold ${isActive ? 'text-[#3D6B5A]' : 'text-[#333]'}`}>
                    {tpl.name}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 text-tx-3">
            <p className="text-3xl mb-2">🎨</p>
            <p className="text-sm">Nicio coperta in aceasta categorie</p>
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={handleContinue}
            disabled={!selected}
            className={`px-8 py-4 rounded-[12px] font-bold text-sm transition-all ${
              selected
                ? 'bg-[#3D6B5A] text-white hover:bg-[#2d5445] active:scale-[0.98] shadow-lg'
                : 'bg-[#E0DDD8] text-[#B0AAA2] cursor-not-allowed'
            }`}
          >
            CONTINUA CU ACEASTA COPERTA →
          </button>
          {!selected && (
            <p className="text-xs text-tx-3 mt-2">Selecteaza un design de coperta pentru a continua</p>
          )}
        </div>
      </div>
    </div>
  );
}
