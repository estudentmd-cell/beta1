import { useState, useMemo, useEffect, useRef } from 'react';
import useEditorStore from '../../stores/useEditorStore';
import useAuthStore from '../../stores/useAuthStore';
import useUIStore from '../../stores/useUIStore';

const MONTHS_RO = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

function getDateKey(photo) {
  if (photo.exifDate) return photo.exifDate.slice(0, 10);
  const fnMatch = (photo.fileName || '').match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
  if (fnMatch) {
    const [, y, m, d] = fnMatch;
    if (Number(y) > 2000 && Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) return `${y}-${m}-${d}`;
  }
  return null;
}

function formatDateLabel(key) {
  if (!key) return 'Fără dată';
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS_RO[m - 1]} ${y}`;
}

function formatExifFull(photo) {
  if (!photo.exifDate) return null;
  try {
    const d = new Date(photo.exifDate);
    return `${d.getDate()} ${MONTHS_RO[d.getMonth()]} ${d.getFullYear()}, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  } catch { return null; }
}

function groupByDate(photos) {
  const groups = {};
  photos.forEach(p => {
    const key = getDateKey(p) || '_nodate';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  return Object.entries(groups)
    .sort((a, b) => {
      if (a[0] === '_nodate') return 1;
      if (b[0] === '_nodate') return -1;
      return a[0].localeCompare(b[0]);
    })
    .map(([key, items]) => ({
      key,
      label: key === '_nodate' ? 'Fără dată' : formatDateLabel(key),
      photos: items,
      usedCount: items.filter(p => p.used).length,
    }));
}

function getQuality(photo) {
  if (!photo.origW || !photo.origH) return null;
  const min = Math.min(photo.origW, photo.origH);
  if (min < 600) return { level: 'low', text: 'Calitate slabă — va fi neclară', color: '#FF3B30' };
  if (min < 1200) return { level: 'med', text: 'Calitate medie', color: '#FF9500' };
  return null;
}

const SORT_OPTIONS = [
  { id: null, label: 'Fără sortare' },
  { id: 'name', label: 'Pe nume' },
  { id: 'upload', label: 'După data încărcării' },
  { id: 'exif', label: 'După data fotografiei' },
  { id: 'used', label: 'Prin utilizare' },
  { id: 'orient', label: 'Prin orientare' },
];
const SORT_LABELS = { name: 'Pe nume', upload: 'Încărcare', exif: 'Data foto', used: 'Utilizare', orient: 'Orientare' };

export default function PhotoGalleryPopup({ onClose }) {
  const photos = useEditorStore(s => s.photos);
  const addPhotos = useEditorStore(s => s.addPhotos);
  const reorderPhotos = useEditorStore(s => s.reorderPhotos);
  const uploadRef = useRef(null);

  const handleGalleryUpload = (e) => {
    if (!e.target.files?.length) return;
    const { user, authMethod } = useAuthStore.getState();
    const hasRealAuth = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
    if (!hasRealAuth) {
      useUIStore.getState().openModal('auth', {
        stayOnPage: true, hideSkip: true,
        title: 'Conectează-te pentru a încărca poze',
        subtitle: 'Pozele tale sunt protejate — doar tu le poți accesa',
      });
      e.target.value = '';
      return;
    }
    addPhotos(e.target.files);
    e.target.value = '';
  };

  const [viewMode, setViewMode] = useState('all');
  const [activeSort, setActiveSort] = useState(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [hideUsed, setHideUsed] = useState(false);
  const [search, setSearch] = useState('');
  const [lightbox, setLightbox] = useState(null); // photo object
  const [collapsed, setCollapsed] = useState(new Set());

  // Force recalc when photos array reference changes (after reorder)
  const ready = useMemo(() => photos.filter(p => p.storageUrl || p.thumbData || p.previewUrl), [photos, photos.length]);
  const usedTotal = ready.filter(p => p.used).length;

  // Filter
  const filtered = useMemo(() => {
    let list = ready;
    if (hideUsed) list = list.filter(p => !p.used);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => (p.fileName || '').toLowerCase().includes(q));
    }
    return list;
  }, [ready, hideUsed, search]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const applySort = (sortId) => {
    setActiveSort(sortId);
    if (!sortId) return; // "Fără sortare" — nu schimbă ordinea
    const all = useEditorStore.getState().photos;
    let sorted;
    switch (sortId) {
      case 'name':
        sorted = [...all].sort((a, b) => (a.fileName || '').localeCompare(b.fileName || '', undefined, { numeric: true }));
        break;
      case 'upload':
        // Ordinea originală de upload = ordinea ID-urilor (p1, p2, p3...)
        sorted = [...all].sort((a, b) => {
          const na = parseInt(a.id.replace('p', '')) || 0;
          const nb = parseInt(b.id.replace('p', '')) || 0;
          return nb - na; // cel mai nou primul
        });
        break;
      case 'exif':
        sorted = [...all].sort((a, b) => {
          const da = a.exifDate || '';
          const db = b.exifDate || '';
          if (da && db) return db.localeCompare(da); // cel mai nou primul
          if (da) return -1;
          if (db) return 1;
          return (b.fileName || '').localeCompare(a.fileName || '', undefined, { numeric: true });
        });
        break;
      case 'used':
        sorted = [...all].sort((a, b) => {
          if (a.used === b.used) return 0;
          return a.used ? 1 : -1; // neplasate primele
        });
        break;
      case 'orient':
        sorted = [...all].sort((a, b) => {
          const oa = a.origW && a.origH ? (a.origH > a.origW ? 0 : a.origH === a.origW ? 1 : 2) : 3;
          const ob = b.origW && b.origH ? (b.origH > b.origW ? 0 : b.origH === b.origW ? 1 : 2) : 3;
          return oa - ob; // portrait → pătrat → landscape → necunoscut
        });
        break;
      default:
        return;
    }
    useEditorStore.getState().reorderPhotos(sorted.map(p => p.id));
  };

  // Lightbox nav
  const lbIdx = lightbox ? ready.findIndex(p => p.id === lightbox.id) : -1;
  const lbPrev = () => { if (lbIdx > 0) setLightbox(ready[lbIdx - 1]); };
  const lbNext = () => { if (lbIdx < ready.length - 1) setLightbox(ready[lbIdx + 1]); };

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { lightbox ? setLightbox(null) : onClose(); }
      if (lightbox && e.key === 'ArrowLeft') lbPrev();
      if (lightbox && e.key === 'ArrowRight') lbNext();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [lightbox, lbIdx]);

  const toggleCollapse = (key) => setCollapsed(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;
  });

  return (
    <>
      {/* ═══ POPUP ═══ */}
      <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-stretch sm:items-center sm:justify-center sm:p-4">
        <div className="bg-white w-full sm:rounded-2xl sm:max-w-[1000px] sm:max-h-[90vh] flex flex-col sm:shadow-2xl overflow-hidden">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F2F7] shrink-0">
            <div>
              <h2 className="text-[16px] font-bold text-[#1C1C1E]">Galerie fotografii</h2>
              <p className="text-[11px] text-[#8E8E93]">
                {ready.length} poze · <span className="text-[#3D6B5E] font-medium">{usedTotal} plasate</span> · {ready.length - usedTotal} disponibile
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => uploadRef.current?.click()}
                className="flex items-center gap-1.5 px-3 h-[32px] rounded-lg text-[11px] font-semibold bg-[#3D6B5E] text-white hover:bg-[#2d5445] active:scale-[0.97] transition-all">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Încarcă poze
              </button>
              <input ref={uploadRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={handleGalleryUpload} />
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center hover:bg-[#E5E5EA] transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[#F2F2F7] shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {/* View */}
            <div className="flex bg-[#F2F2F7] rounded-lg p-0.5 shrink-0">
              <button onClick={() => setViewMode('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${viewMode === 'all' ? 'bg-white shadow-sm text-[#1C1C1E]' : 'text-[#8E8E93]'}`}>
                Toate
              </button>
              <button onClick={() => setViewMode('grouped')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${viewMode === 'grouped' ? 'bg-white shadow-sm text-[#1C1C1E]' : 'text-[#8E8E93]'}`}>
                Pe zile
              </button>
            </div>

            <div className="w-px h-4 bg-[#E5E5EA] shrink-0" />

            {/* Sort dropdown */}
            <div className="relative shrink-0">
              <button onClick={() => setSortOpen(!sortOpen)}
                className={`flex items-center gap-1 px-2.5 h-[26px] rounded-full text-[10px] font-semibold transition ${
                  activeSort ? 'bg-[#3D6B5E] text-white' : 'text-[#8E8E93] bg-[#F2F2F7] hover:bg-[#E5E5EA]'}`}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h12M3 18h6"/></svg>
                {activeSort ? SORT_LABELS[activeSort] : 'Sortare'}
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-[10]" onClick={() => setSortOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-[#E5E5EA] py-1 z-[20] min-w-[180px]">
                    {SORT_OPTIONS.map(opt => (
                      <button key={opt.id} onClick={() => { applySort(opt.id); setSortOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 transition ${
                          activeSort === opt.id ? 'text-[#3D6B5E] font-semibold bg-[#EAF0EC]' : 'text-[#1C1C1E] hover:bg-[#F2F2F7]'}`}>
                        {activeSort === opt.id && <span className="text-[#3D6B5E]">✓</span>}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 min-w-2" />

            {/* Search */}
            <div className="relative shrink-0">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#C7C7CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Caută..."
                className="w-[130px] sm:w-[160px] h-[26px] pl-7 pr-6 rounded-full text-[10px] bg-[#F2F2F7] outline-none focus:ring-1 focus:ring-[#3D6B5E]/30 text-[#1C1C1E] placeholder-[#C7C7CC]" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#C7C7CC]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-2">{search ? '🔍' : hideUsed ? '✓' : '📷'}</p>
                <p className="text-[13px] text-[#8E8E93]">
                  {search ? `Nicio poză cu "${search}"` : hideUsed ? 'Toate pozele sunt plasate!' : 'Nicio fotografie'}
                </p>
              </div>
            ) : viewMode === 'all' ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
                {filtered.map((photo, idx) => (
                  <Card key={photo.id} photo={photo} idx={idx} onClick={() => setLightbox(photo)} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map(g => (
                  <div key={g.key}>
                    <button onClick={() => toggleCollapse(g.key)}
                      className="flex items-center gap-2 mb-1.5 w-full text-left sticky top-0 bg-white/95 backdrop-blur-sm py-1 z-10">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" strokeWidth="3"
                        className={`transition-transform shrink-0 ${collapsed.has(g.key) ? '' : 'rotate-90'}`}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                      <span className="text-[12px] font-semibold text-[#1C1C1E]">{g.label}</span>
                      <span className="text-[10px] text-[#C7C7CC]">{g.photos.length} poze</span>
                      {g.usedCount > 0 && (
                        <span className="text-[9px] text-[#3D6B5E] bg-[#EAF0EC] px-1.5 py-0.5 rounded-full font-medium">{g.usedCount} plasate</span>
                      )}
                    </button>
                    {!collapsed.has(g.key) && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
                        {g.photos.map(p => (
                          <Card key={p.id} photo={p} idx={ready.indexOf(p)} onClick={() => setLightbox(p)} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[#F2F2F7] bg-[#FAFAFA] shrink-0">
            <p className="text-[10px] text-[#8E8E93]">Click pe poză — previzualizare · ← → navigare</p>
            <button onClick={onClose}
              className="px-4 h-[32px] rounded-lg text-[11px] font-semibold bg-[#3D6B5E] text-white hover:bg-[#2d5445] active:scale-[0.97] transition-all">
              Închide
            </button>
          </div>
        </div>
      </div>

      {/* ═══ LIGHTBOX ═══ */}
      {lightbox && <Lightbox photo={lightbox} idx={lbIdx} total={ready.length} onClose={() => setLightbox(null)} onPrev={lbPrev} onNext={lbNext} />}
    </>
  );
}

/* ── Card ── */
function Card({ photo, idx, onClick }) {
  const src = photo.thumbData || photo.previewUrl || photo.storageUrl;
  const q = getQuality(photo);
  return (
    <div className="relative group cursor-pointer" onClick={onClick}>
      <div className={`relative rounded-md overflow-hidden transition-all active:scale-[0.95] ${photo.used ? 'opacity-30' : 'hover:brightness-[0.92]'}`}>
        <img src={src} alt="" className="w-full aspect-square object-cover" draggable={false} loading="lazy" />
        <span className="absolute top-0.5 left-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-black/50 text-white text-[7px] font-bold px-0.5">{idx + 1}</span>
        {q && <div className="absolute top-0.5 right-0.5 w-[14px] h-[14px] rounded-full flex items-center justify-center" style={{ background: q.color }}><span className="text-white text-[7px] font-bold">!</span></div>}
        {photo.used && <div className="absolute bottom-0 inset-x-0 bg-black/50 text-center py-px"><span className="text-white text-[6px] font-bold">✓ plasată</span></div>}
      </div>
      <p className="text-[7px] text-[#8E8E93] text-center truncate mt-0.5 px-0.5 leading-tight">{photo.fileName}</p>
    </div>
  );
}

/* ── Lightbox ── */
function Lightbox({ photo, idx, total, onClose, onPrev, onNext }) {
  const src = photo.previewUrl || photo.storageUrl || photo.thumbData;
  const q = getQuality(photo);
  const exifFull = formatExifFull(photo);

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center" onClick={onClose}>
      {/* Close */}
      <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition z-20" onClick={onClose}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>

      {/* Nav */}
      {idx > 0 && (
        <button className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition z-20"
          onClick={e => { e.stopPropagation(); onPrev(); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      {idx < total - 1 && (
        <button className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition z-20"
          onClick={e => { e.stopPropagation(); onNext(); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      )}

      {/* Image */}
      <img src={src} alt={photo.fileName} className="max-w-[92vw] max-h-[82vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />

      {/* Info */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-3 text-white text-[11px] max-w-[90vw]">
        <span className="font-semibold truncate">{photo.fileName}</span>
        {photo.origW > 0 && <span className="text-white/50 shrink-0">{photo.origW}×{photo.origH}</span>}
        {exifFull && <span className="text-white/50 shrink-0">{exifFull}</span>}
        {q && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white shrink-0" style={{ background: q.color }}>{q.text}</span>}
        <span className="text-white/30 shrink-0">{idx + 1}/{total}</span>
      </div>
    </div>
  );
}
