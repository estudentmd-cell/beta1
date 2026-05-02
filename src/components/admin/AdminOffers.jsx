import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase/config';
import { ACTIVE_OFFERS } from '../../utils/offers';
import { loadActiveFormatsFromFirestore } from '../../utils/dimensions';
import { getAllCoverTemplatesAsync, COVER_CATEGORIES } from '../../utils/coverData';

const PRODUCT_OPTIONS = [
  { value: 'pagini-groase', label: 'Pagini Groase' },
  { value: 'pagini-subtiri', label: 'Pagini Subțiri' },
];
const ALL_FORMATS = ['20×20', '20×30', '23×23', '30×30'];
const THEME_OPTIONS = [
  { value: 'wedding', label: 'Nuntă', emoji: '💒' },
  { value: 'family', label: 'Familie', emoji: '👨‍👩‍👧‍👦' },
  { value: 'kids', label: 'Copii', emoji: '👶' },
  { value: 'travel', label: 'Călătorie', emoji: '✈️' },
  { value: 'birthday', label: 'Zi de naștere', emoji: '🎂' },
  { value: 'christening', label: 'Cumetrie', emoji: '👼' },
  { value: 'other', label: 'Altele', emoji: '🎁' },
];

function daysLeft(deadline) {
  const diff = new Date(deadline) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

async function loadOffers() {
  if (!db) return null;
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'settings', 'offers'));
    if (snap.exists() && snap.data().items) return snap.data().items;
  } catch {}
  return null;
}

async function saveOffers(offers) {
  // Update localStorage cache instantly (prevents flash on homepage)
  try { localStorage.setItem('momentive-offers', JSON.stringify(offers)); } catch {}
  if (!db) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'settings', 'offers'), { items: offers, updatedAt: new Date().toISOString() });
}

async function uploadOfferImage(offerId, file, idx) {
  if (!storage) return null;
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const ext = file.name?.split('.').pop() || 'webp';
  const storageRef = ref(storage, `homepage/offers/${offerId}_${idx}_${Date.now()}.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: 'public, max-age=86400' });
  return await getDownloadURL(storageRef);
}

/** Calculeaza formatele permise per tip de pagini, conform Firestore activeFormats */
function getFormatsForProduct(product, activeFormatsData) {
  if (!activeFormatsData) return ALL_FORMATS;
  const productActive = activeFormatsData[product];
  if (!productActive) return ALL_FORMATS;
  return ALL_FORMATS.filter(f => {
    const key = f.replace('×', 'x');
    return productActive[key] !== false;
  });
}

function OfferEditor({ offer, onChange, onDelete, activeFormatsData, templates }) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const update = (key, val) => onChange({ ...offer, [key]: val });
  const images = offer.images || (offer.image ? [offer.image] : []);

  // Formatele permise din Firestore activeFormats (per tip pagini)
  const formatsForProduct = getFormatsForProduct(offer.product, activeFormatsData);

  // Avertisment dacă formatul curent nu e disponibil pentru tipul selectat
  const formatInvalid = !formatsForProduct.includes(offer.format);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';
    setUploading(true);
    try {
      const urls = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadOfferImage(offer.id, files[i], images.length + i);
        if (url) urls.push(url);
      }
      update('images', [...images, ...urls]);
    } catch (err) { console.error('Upload failed:', err); }
    setUploading(false);
  };

  const removeImage = (idx) => {
    update('images', images.filter((_, i) => i !== idx));
  };

  const moveImage = (idx, dir) => {
    const arr = [...images];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    update('images', arr);
  };
  const days = daysLeft(offer.deadline);
  const expired = days <= 0;
  const discount = offer.oldPrice > 0 ? Math.round((1 - offer.newPrice / offer.oldPrice) * 100) : 0;

  // Schimbare tip pagini — auto-corectează formatul dacă nu mai e valid
  const handleProductChange = (newProduct) => {
    const newFormats = getFormatsForProduct(newProduct, activeFormatsData);
    const updated = { ...offer, product: newProduct };
    if (!newFormats.includes(offer.format)) {
      updated.format = newFormats[0] || '20×20';
    }
    onChange(updated);
  };

  return (
    <div className={`rounded-xl border transition-all ${expired ? 'border-red-200 opacity-60' : offer.active !== false ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-2xl">{offer.emoji || '🎁'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900">{offer.name}</h3>
            {offer.active !== false && !expired && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">ACTIV</span>}
            {expired && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">EXPIRAT</span>}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold">{offer.badge || `-${discount}%`}</span>
            {formatInvalid && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">⚠ Format invalid</span>}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {offer.format} · {offer.pages} pag · {PRODUCT_OPTIONS.find(p => p.value === offer.product)?.label || offer.product} · <span className="line-through text-gray-400">{offer.oldPrice}</span> → <span className="font-bold text-green-700">{offer.newPrice} MDL</span>
            {!expired && <span className="ml-2 text-amber-600">· {days} zile rămase</span>}
          </p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); update('active', offer.active === false ? true : false); }}
          className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${offer.active !== false && !expired ? 'bg-[#3D6B5E]' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${offer.active !== false && !expired ? 'left-[26px]' : 'left-0.5'}`} />
        </button>
        <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
          {/* Row 1: Name + Theme + Emoji */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Nume ofertă</label>
              <input value={offer.name} onChange={e => update('name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E]" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Temă</label>
              <select value={offer.theme || 'other'} onChange={e => {
                const t = THEME_OPTIONS.find(x => x.value === e.target.value);
                update('theme', e.target.value);
                if (t) update('emoji', t.emoji);
              }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E]">
                {THEME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Tagline</label>
              <input value={offer.tagline || ''} onChange={e => update('tagline', e.target.value)}
                placeholder="Amintirile tale, pentru totdeauna"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E]" />
            </div>
          </div>

          {/* Row 2: Product config */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Tip pagini</label>
              <select value={offer.product} onChange={e => handleProductChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E]">
                {PRODUCT_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Format</label>
              <select value={offer.format} onChange={e => update('format', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-[#3D6B5E] ${formatInvalid ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
                {formatsForProduct.map(f => <option key={f} value={f}>{f} cm</option>)}
                {/* Arată formatul curent invalid cu avertisment */}
                {formatInvalid && (
                  <option value={offer.format} disabled>⚠ {offer.format} cm (indisponibil)</option>
                )}
              </select>
              {formatInvalid && (
                <p className="text-[9px] text-amber-600 mt-0.5">Formatul {offer.format} nu e disponibil pentru {PRODUCT_OPTIONS.find(p => p.value === offer.product)?.label}</p>
              )}
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Nr. pagini</label>
              <input type="number" value={offer.pages} onChange={e => update('pages', parseInt(e.target.value) || 20)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E] text-center" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Deadline</label>
              <input type="date" value={(offer.deadline || '').split('T')[0]} onChange={e => update('deadline', e.target.value + 'T23:59:59')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E]" />
            </div>
          </div>

          {/* Formatele disponibile — info din admin */}
          <div className="flex flex-wrap gap-1.5">
            {ALL_FORMATS.map(f => {
              const available = formatsForProduct.includes(f);
              return (
                <span key={f} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  available
                    ? f === offer.format ? 'bg-[#3D6B5E] text-white' : 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-400 line-through'
                }`}>
                  {f}
                </span>
              );
            })}
            <span className="text-[9px] text-gray-400 self-center ml-1">
              Formate active pentru {PRODUCT_OPTIONS.find(p => p.value === offer.product)?.label}
            </span>
          </div>

          {/* Row 3: Pricing */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Preț normal (MDL)</label>
              <input type="number" value={offer.oldPrice} onChange={e => update('oldPrice', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E] text-center" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Preț ofertă (MDL)</label>
              <input type="number" value={offer.newPrice} onChange={e => update('newPrice', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E] text-center font-bold text-green-700" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Badge reducere</label>
              <input value={offer.badge || `-${discount}%`} onChange={e => update('badge', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E] text-center font-bold text-red-600" />
            </div>
          </div>

          {/* Imagini ofertă — carusel pe homepage */}
          <div>
            <label className="text-[10px] text-gray-400 uppercase font-medium block mb-2">
              Imagini ofertă — carusel pe homepage ({images.length} {images.length === 1 ? 'imagine' : 'imagini'})
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {images.map((url, idx) => (
                <div key={idx} className="relative w-28 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {/* Overlay controls */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                    {idx > 0 && (
                      <button type="button" onClick={() => moveImage(idx, -1)}
                        className="w-6 h-6 rounded-full bg-white/90 text-[10px] flex items-center justify-center hover:bg-white">←</button>
                    )}
                    <button type="button" onClick={() => removeImage(idx)}
                      className="w-6 h-6 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center hover:bg-red-600">✕</button>
                    {idx < images.length - 1 && (
                      <button type="button" onClick={() => moveImage(idx, 1)}
                        className="w-6 h-6 rounded-full bg-white/90 text-[10px] flex items-center justify-center hover:bg-white">→</button>
                    )}
                  </div>
                  {idx === 0 && (
                    <span className="absolute top-1 left-1 text-[8px] bg-white/80 text-gray-600 px-1 rounded font-medium">COVER</span>
                  )}
                </div>
              ))}
              {/* Add button */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-28 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-[#3D6B5E] hover:text-[#3D6B5E] transition disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span className="text-[9px] font-medium">Adauga</span>
                  </>
                )}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            <p className="text-[10px] text-gray-400">Prima imagine = cover. Clientul vede caruselul pe homepage. Poți selecta mai multe simultan.</p>
          </div>

          {/* Summary */}
          <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between text-xs">
            <span className="text-gray-500">Economie client: <strong className="text-green-700">{offer.oldPrice - offer.newPrice} MDL</strong></span>
            <span className="text-gray-500">Reducere: <strong className="text-red-600">{discount}%</strong></span>
            <button onClick={onDelete} className="text-red-400 hover:text-red-600 transition">Șterge oferta</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeFormatsData, setActiveFormatsData] = useState(null);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    // Încarcă ofertele, formatele active din Firestore, și cover templates
    Promise.all([
      loadOffers(),
      loadActiveFormatsFromFirestore(),
      getAllCoverTemplatesAsync(),
    ]).then(([items, formatsData, tpls]) => {
      setOffers(items || ACTIVE_OFFERS.map(o => ({ ...o, active: true })));
      setActiveFormatsData(formatsData);
      setTemplates(tpls || []);
      setLoading(false);
    });
  }, []);

  const handleChange = (idx, updated) => {
    setOffers(prev => prev.map((o, i) => i === idx ? updated : o));
    setSaved(false);
  };

  const handleDelete = (idx) => {
    if (!confirm(`Ștergi oferta "${offers[idx].name}"?`)) return;
    setOffers(prev => prev.filter((_, i) => i !== idx));
    setSaved(false);
  };

  const handleAdd = () => {
    // Determină formatele valide pentru pagini-groase (default)
    const defaultFormats = getFormatsForProduct('pagini-groase', activeFormatsData);
    setOffers(prev => [...prev, {
      id: `offer_${Date.now()}`,
      product: 'pagini-groase',
      name: 'Ofertă nouă',
      format: defaultFormats[0] || '20×20',
      pages: 40,
      oldPrice: 160,
      newPrice: 120,
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] + 'T23:59:59',
      badge: '-25%',
      theme: 'other',
      emoji: '🎁',
      tagline: '',
      active: true,
    }]);
    setSaved(false);
  };

  const handleSave = async () => {
    // Verifică dacă există oferte cu format invalid
    const invalidOffers = offers.filter(o => {
      const validFormats = getFormatsForProduct(o.product, activeFormatsData);
      return !validFormats.includes(o.format);
    });
    if (invalidOffers.length > 0) {
      const names = invalidOffers.map(o => `"${o.name}"`).join(', ');
      if (!confirm(`Ofertele ${names} au formate incompatibile cu tipul de pagini. Salvezi oricum?`)) return;
    }

    setSaving(true);
    try {
      await saveOffers(offers);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Eroare: ' + e.message);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Se incarca...</div>;

  const activeCount = offers.filter(o => o.active !== false && daysLeft(o.deadline) > 0).length;

  // Verifică oferte cu formate invalide
  const invalidCount = offers.filter(o => {
    const validFormats = getFormatsForProduct(o.product, activeFormatsData);
    return !validFormats.includes(o.format);
  }).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#2C2520]">Oferte</h2>
          <p className="text-sm text-gray-500 mt-1">
            {offers.length} oferte · {activeCount} active pe site
            {invalidCount > 0 && <span className="text-amber-600 ml-2">· {invalidCount} cu format invalid</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600">Salvat!</span>}
          <button onClick={handleSave} disabled={saving}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              saved ? 'bg-green-500 text-white' : 'bg-[#3D6B5E] text-white hover:bg-[#2d5246]'
            } disabled:opacity-50`}>
            {saving ? 'Se salveaza...' : 'Salveaza'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {offers.map((offer, idx) => (
          <OfferEditor
            key={offer.id}
            offer={offer}
            onChange={(updated) => handleChange(idx, updated)}
            onDelete={() => handleDelete(idx)}
            activeFormatsData={activeFormatsData}
            templates={templates}
          />
        ))}
      </div>

      <button onClick={handleAdd}
        className="mt-3 w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-[#3D6B5E] hover:text-[#3D6B5E] transition-all">
        + Adaugă ofertă nouă
      </button>

      <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <p className="font-semibold mb-1">Cum funcționează ofertele:</p>
        <ul className="space-y-1 text-xs text-blue-700">
          <li>Oferta = Format + Nr pagini + Tip pagini → Preț redus</li>
          <li>Formatele se sincronizează din Admin → Dimensiuni (ex: 20×30 doar la pagini subțiri)</li>
          <li>Tematica (nuntă, copii) e doar emoțională — clientul alege orice cover</li>
          <li>În editor paginile sunt blocate la nr. din ofertă</li>
          <li>Ofertele expirate dispar automat de pe site</li>
          <li>Toggle ON/OFF pentru a activa/dezactiva manual</li>
        </ul>
      </div>
    </div>
  );
}
