import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase/config';

async function loadSlides() {
  if (!db) return [];
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'settings', 'hero_slides'));
    return snap.exists() ? (snap.data().slides || []) : [];
  } catch { return []; }
}

async function saveSlides(slides) {
  if (!db) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'settings', 'hero_slides'), { slides, updatedAt: new Date().toISOString() });
}

async function uploadSlideImage(slideId, file) {
  if (!storage) return null;
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const ext = file.name?.split('.').pop() || 'webp';
  const storageRef = ref(storage, `homepage/hero-slides/${slideId}_${Date.now()}.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: 'public, max-age=86400' });
  return await getDownloadURL(storageRef);
}

const EMPTY_SLIDE = {
  id: '',
  title: '',
  subtitle: '',
  cta: 'ÎNCEPE ALBUMUL',
  ctaLink: '/colectie/toate',
  image: '',
  bgColor: '#FAF8F5',
  textColor: '#1c1c1c',
  active: true,
};

export default function AdminHeroSlides() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(null);
  const fileRefs = useRef({});

  useEffect(() => {
    loadSlides().then(s => { setSlides(s); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await saveSlides(slides);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addSlide = () => {
    setSlides(prev => [...prev, { ...EMPTY_SLIDE, id: `slide_${Date.now()}` }]);
  };

  const updateSlide = (id, field, value) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSlide = (id) => {
    if (!confirm('Ștergi acest slide?')) return;
    setSlides(prev => prev.filter(s => s.id !== id));
  };

  const moveSlide = (id, dir) => {
    setSlides(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const handleUpload = async (slideId, file) => {
    setUploading(slideId);
    try {
      const url = await uploadSlideImage(slideId, file);
      if (url) updateSlide(slideId, 'image', url);
    } catch (err) { alert('Eroare upload: ' + err.message); }
    setUploading(null);
  };

  if (loading) return <div className="p-8 text-gray-400">Se încarcă...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Hero Slideshow</h2>
          <p className="text-sm text-gray-500 mt-0.5">{slides.length} slide-uri · Pagina principală</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={addSlide}
            className="px-4 py-2 bg-[#3D6B5E] text-white rounded-lg text-sm font-medium hover:bg-[#2d5445] transition">
            + Slide nou
          </button>
          <button onClick={handleSave} disabled={saving}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition ${
              saved ? 'bg-green-500 text-white' : 'bg-[#3D6B5E] text-white hover:bg-[#2d5445]'
            } disabled:opacity-50`}>
            {saving ? 'Se salvează...' : saved ? '✓ Salvat!' : 'Salvează'}
          </button>
        </div>
      </div>

      {slides.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-3">🖼️</p>
          <p className="text-sm text-gray-500">Niciun slide. Adaugă primul slide pentru hero.</p>
        </div>
      )}

      {slides.map((slide, idx) => (
        <div key={slide.id} className={`bg-white rounded-xl border ${slide.active ? 'border-gray-200' : 'border-gray-200 opacity-50'} overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
              <div className="flex gap-1">
                <button onClick={() => moveSlide(slide.id, -1)} disabled={idx === 0}
                  className="w-6 h-6 rounded bg-white border text-gray-400 hover:text-gray-700 flex items-center justify-center text-[10px] disabled:opacity-20">▲</button>
                <button onClick={() => moveSlide(slide.id, 1)} disabled={idx === slides.length - 1}
                  className="w-6 h-6 rounded bg-white border text-gray-400 hover:text-gray-700 flex items-center justify-center text-[10px] disabled:opacity-20">▼</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={slide.active} onChange={e => updateSlide(slide.id, 'active', e.target.checked)}
                  className="w-4 h-4 rounded text-[#3D6B5E]" />
                Activ
              </label>
              <button onClick={() => removeSlide(slide.id)}
                className="text-xs text-red-400 hover:text-red-600 px-2 py-1">Șterge</button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Image */}
            <div>
              <p className="text-[10px] text-gray-500 font-medium uppercase mb-1.5">Imagine</p>
              <div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                {slide.image ? (
                  <img src={slide.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-gray-400">
                    <p className="text-3xl mb-1">📷</p>
                    <p className="text-xs">Încarcă imagine</p>
                  </div>
                )}
                <button onClick={() => fileRefs.current[slide.id]?.click()}
                  className={`absolute top-2 right-2 px-3 py-1.5 bg-white/90 rounded-lg text-xs font-medium shadow hover:bg-white transition ${uploading === slide.id ? 'animate-pulse' : ''}`}>
                  {uploading === slide.id ? 'Se încarcă...' : slide.image ? 'Schimbă' : 'Încarcă'}
                </button>
                <input ref={el => fileRefs.current[slide.id] = el} type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleUpload(slide.id, e.target.files[0]); e.target.value = ''; }} />
              </div>
            </div>

            {/* Right: Text fields */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-gray-500 font-medium uppercase mb-1">Titlu</p>
                <textarea value={slide.title} onChange={e => updateSlide(slide.id, 'title', e.target.value)}
                  placeholder="Momentele care contează merită mai mult decât un telefon"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]/30 resize-none" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium uppercase mb-1">Subtitlu</p>
                <textarea value={slide.subtitle} onChange={e => updateSlide(slide.id, 'subtitle', e.target.value)}
                  placeholder="Creează albumul foto pe care copiii tăi îl vor răsfoi și la 30 de ani"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]/30 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-gray-500 font-medium uppercase mb-1">Text buton</p>
                  <input value={slide.cta} onChange={e => updateSlide(slide.id, 'cta', e.target.value)}
                    placeholder="ÎNCEPE ALBUMUL"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]/30" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium uppercase mb-1">Link buton</p>
                  <input value={slide.ctaLink} onChange={e => updateSlide(slide.id, 'ctaLink', e.target.value)}
                    placeholder="/colectie/toate"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-gray-500 font-medium uppercase mb-1">Culoare fundal text</p>
                  <div className="flex items-center gap-2">
                    <input type="color" value={slide.bgColor || '#FAF8F5'} onChange={e => updateSlide(slide.id, 'bgColor', e.target.value)}
                      className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                    <input value={slide.bgColor || '#FAF8F5'} onChange={e => updateSlide(slide.id, 'bgColor', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]/30 font-mono" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium uppercase mb-1">Culoare text</p>
                  <div className="flex items-center gap-2">
                    <input type="color" value={slide.textColor || '#1c1c1c'} onChange={e => updateSlide(slide.id, 'textColor', e.target.value)}
                      className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                    <input value={slide.textColor || '#1c1c1c'} onChange={e => updateSlide(slide.id, 'textColor', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]/30 font-mono" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          {slide.image && slide.title && (
            <div className="mx-4 mb-4 rounded-lg overflow-hidden border border-gray-100">
              <p className="text-[9px] text-gray-400 px-3 py-1 bg-gray-50">Previzualizare</p>
              <div className="flex items-stretch h-[120px]">
                <div className="flex-1 flex flex-col justify-center px-4" style={{ background: slide.bgColor || '#FAF8F5' }}>
                  <p className="text-[13px] font-bold leading-tight line-clamp-2" style={{ fontFamily: 'Amiri, serif', color: slide.textColor || '#1c1c1c' }}>{slide.title}</p>
                  <p className="text-[10px] mt-1 line-clamp-2" style={{ color: slide.textColor ? slide.textColor + '99' : '#8A8078' }}>{slide.subtitle}</p>
                  <span className="mt-2 inline-block text-[8px] uppercase tracking-[0.15em] font-semibold px-2 py-1 self-start"
                    style={{ background: slide.textColor || '#1c1c1c', color: slide.bgColor || '#FAF8F5' }}>{slide.cta}</span>
                </div>
                <div className="w-[160px] shrink-0">
                  <img src={slide.image} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
