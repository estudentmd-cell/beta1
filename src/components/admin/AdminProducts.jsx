import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase/config';
import { useLivePricing, savePricing } from '../../hooks/usePricingAdmin';

const FORMATS = ['20×20', '20×30', '23×23', '30×30'];

const DEFAULT_PRODUCTS = [
  { slug: 'pagini-groase', name: 'Pagini Groase', badge: 'Popular', desc: 'Rigide · Deschidere 180°', minPages: 20, defaultPages: 40, deliveryDays: 18, gallery: [], active: true },
  { slug: 'pagini-subtiri', name: 'Pagini Subțiri', badge: 'Economie', desc: 'Flexibile · Stil revistă', minPages: 32, defaultPages: 52, deliveryDays: 18, gallery: [], active: true },
];

/* ── Firebase helpers ── */
async function loadProducts() {
  if (!db) return null;
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'settings', 'products'));
    if (snap.exists() && snap.data().items) return snap.data().items;
  } catch {}
  return null;
}

async function saveProductsToFirestore(products) {
  if (!db) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'settings', 'products'), { items: products, updatedAt: new Date().toISOString() });
}

async function uploadProductImage(slug, file) {
  if (!storage) return null;
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const path = `products/${slug}/${Date.now()}.${file.name?.split('.').pop() || 'jpg'}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: 'public, max-age=86400' });
  return await getDownloadURL(storageRef);
}

/* ── Delivery preview ── */
function DeliveryPreview({ days }) {
  const date = new Date();
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  const formatted = date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="text-[10px] text-[#3D6B5E] mt-1">
      ≈ {formatted} (dacă s-ar comanda azi)
    </div>
  );
}

/* ── Gallery image ── */
function GalleryImage({ src, index, total, onRemove, onMove }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F5F3F0]">
          <div className="w-5 h-5 border-2 border-[#3D6B5E]/20 border-t-[#3D6B5E] rounded-full animate-spin" />
        </div>
      )}
      <img key={src} src={src} alt="" className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)} />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
        {index > 0 && <button onClick={() => onMove(-1)} className="w-7 h-7 rounded-full bg-white/90 text-gray-700 text-[10px] font-bold flex items-center justify-center">←</button>}
        {index < total - 1 && <button onClick={() => onMove(1)} className="w-7 h-7 rounded-full bg-white/90 text-gray-700 text-[10px] font-bold flex items-center justify-center">→</button>}
        <button onClick={onRemove} className="w-7 h-7 rounded-full bg-red-500/90 text-white text-[10px] font-bold flex items-center justify-center">×</button>
      </div>
      <span className="absolute top-1 left-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">{index + 1}</span>
    </div>
  );
}

/* ── Price table inline ── */
function PriceTable({ slug, prices, pageOptions, onPriceChange, onOptionsChange }) {
  const currentPrices = prices || {};
  const currentOptions = pageOptions || [];
  const [newPages, setNewPages] = useState('');

  const addOption = () => {
    const num = parseInt(newPages);
    if (!num || num < 2 || currentOptions.includes(num)) return;
    onOptionsChange([...currentOptions, num].sort((a, b) => a - b));
    setNewPages('');
  };

  const removeOption = (p) => {
    if (!confirm(`Ștergi opțiunea de ${p} pagini?`)) return;
    onOptionsChange(currentOptions.filter(x => x !== p));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase w-24">Format</th>
              {currentOptions.map(p => (
                <th key={p} className="px-2 py-2 text-center">
                  <div className="text-[10px] font-bold text-gray-700">{p} pag</div>
                  <button onClick={() => removeOption(p)} className="text-[8px] text-red-400 hover:text-red-600">șterge</button>
                </th>
              ))}
              <th className="px-2 py-2 text-center w-20">
                <div className="flex items-center gap-1">
                  <input type="number" value={newPages} onChange={e => setNewPages(e.target.value)}
                    placeholder="Nr" className="w-10 text-[10px] border border-gray-300 rounded px-1 py-0.5 text-center"
                    onKeyDown={e => e.key === 'Enter' && addOption()} />
                  <button onClick={addOption} className="text-[10px] bg-[#3D6B5E] text-white px-1.5 py-0.5 rounded font-bold">+</button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {FORMATS.map((fmt, fi) => (
              <tr key={fmt} className={`border-b border-gray-100 ${fi % 2 ? 'bg-gray-50/50' : ''}`}>
                <td className="px-3 py-2">
                  <span className="text-xs font-bold text-gray-900">{fmt}</span>
                  <span className="text-[9px] text-gray-400 block">cm</span>
                </td>
                {currentOptions.map(p => (
                  <td key={p} className="px-1 py-1.5 text-center">
                    <input type="number" value={currentPrices[fmt]?.[p] ?? 0}
                      onChange={e => onPriceChange(fmt, p, parseInt(e.target.value) || 0)}
                      className="w-14 text-center text-xs font-semibold border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#3D6B5E]/30" />
                    <div className="text-[8px] text-gray-400">MDL</div>
                  </td>
                ))}
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Single product editor ── */
function ProductEditor({ product, onChange, onDelete, onAutoSave, prices, pageOptions, onPriceChange, onOptionsChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const update = (key, val) => onChange({ ...product, [key]: val });

  const handleGalleryUpload = async (files) => {
    setUploading(true);
    const newGallery = [...(product.gallery || [])];
    for (const file of files) {
      try {
        const url = await uploadProductImage(product.slug, file);
        if (url) newGallery.push({ id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, src: url });
      } catch (err) {
        console.error('Gallery upload error:', err);
        alert('Eroare la încărcare: ' + (err.message || 'Verifică permisiunile'));
      }
    }
    update('gallery', newGallery);
    setUploading(false);
    // Auto-save după upload
    if (onAutoSave) onAutoSave();
  };

  const removeImage = (idx) => {
    const g = [...(product.gallery || [])];
    g.splice(idx, 1);
    update('gallery', g);
    if (onAutoSave) setTimeout(onAutoSave, 300);
  };

  const moveImage = (idx, dir) => {
    const g = [...(product.gallery || [])];
    const ni = idx + dir;
    if (ni < 0 || ni >= g.length) return;
    [g[idx], g[ni]] = [g[ni], g[idx]];
    update('gallery', g);
  };

  return (
    <div className={`rounded-xl border transition-all ${product.active ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900">{product.name}</h3>
            {product.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">ACTIV</span>}
            <span className="text-[10px] text-gray-400">{(product.gallery || []).length} poze</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{product.desc} · {product.badge}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); update('active', !product.active); }}
          className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${product.active ? 'bg-[#3D6B5E]' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${product.active ? 'left-[26px]' : 'left-0.5'}`} />
        </button>
        <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Nume</label>
              <input value={product.name} onChange={e => update('name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E]" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Badge</label>
              <input value={product.badge || ''} onChange={e => update('badge', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E]" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Descriere</label>
              <input value={product.desc || ''} onChange={e => update('desc', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E]" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Pagini minim</label>
              <input type="number" value={product.minPages || 20} onChange={e => update('minPages', parseInt(e.target.value) || 20)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E] text-center" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Pagini default</label>
              <input type="number" value={product.defaultPages || 40} onChange={e => update('defaultPages', parseInt(e.target.value) || 40)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E] text-center" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-medium block mb-1">Termen livrare (zile lucrătoare)</label>
              <input type="number" value={product.deliveryDays || 18} onChange={e => update('deliveryDays', parseInt(e.target.value) || 18)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#3D6B5E] text-center" />
              <DeliveryPreview days={product.deliveryDays || 18} />
            </div>
          </div>

          {/* Imagine principală — cea care apare pe cardul din configurator */}
          <div className="bg-[#F9F8F6] rounded-xl p-4 border border-gray-100">
            <label className="text-[11px] text-gray-600 uppercase font-bold tracking-wide block mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Imagine principală card — {product.name}
            </label>
            <div className="flex items-start gap-4">
              <div className="relative w-40 aspect-[4/3] bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm shrink-0">
                {product.heroImage ? (
                  <img src={product.heroImage} alt="" className="w-full h-full object-cover" />
                ) : (product.gallery?.[0]?.src) ? (
                  <img src={product.gallery[0].src} alt="" className="w-full h-full object-cover opacity-40" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                    <svg className="w-8 h-8 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                    <span className="text-[10px]">Fără imagine</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1C1C1E] text-white rounded-lg text-[12px] font-semibold cursor-pointer hover:bg-[#333] transition">
                  📷 {product.heroImage ? 'Schimbă imaginea' : 'Încarcă imagine'}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return; e.target.value = '';
                    try {
                      const url = await uploadProductImage(product.slug, f);
                      if (url) { update('heroImage', url); if (onAutoSave) setTimeout(onAutoSave, 500); }
                    } catch (err) { alert('Eroare: ' + err.message); }
                  }} />
                </label>
                <p className="text-[10px] text-gray-400 leading-relaxed max-w-[200px]">
                  Această imagine apare pe cardul „{product.name}" din pagina de configurare album.
                </p>
              </div>
            </div>
          </div>

          {/* Gallery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-gray-400 uppercase font-medium">Galerie configurator ({(product.gallery || []).length} poze)</label>
              <label className={`px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition ${uploading ? 'opacity-50' : ''}`}>
                {uploading ? 'Se incarca...' : '+ Adauga poze'}
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => { if (e.target.files?.length) handleGalleryUpload(Array.from(e.target.files)); e.target.value = ''; }} />
              </label>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
              {(product.gallery || []).map((img, idx) => (
                <GalleryImage key={img.id || idx} src={img.src} index={idx} total={(product.gallery || []).length}
                  onRemove={() => removeImage(idx)} onMove={(dir) => moveImage(idx, dir)} />
              ))}
              {(product.gallery || []).length === 0 && (
                <div className="col-span-full text-center py-6 text-gray-300 text-xs">Nicio poza. Adauga poze pentru galeria configuratorului.</div>
              )}
            </div>
          </div>

          {/* Prices */}
          <div>
            <label className="text-[10px] text-gray-400 uppercase font-medium block mb-2">Prețuri ({product.name})</label>
            <PriceTable
              slug={product.slug}
              prices={prices}
              pageOptions={pageOptions}
              onPriceChange={onPriceChange}
              onOptionsChange={onOptionsChange}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <a href="/admin_panel/dimensions" className="text-xs text-[#3D6B5E] hover:underline">Dimensiuni (globale) →</a>
            <div className="flex-1" />
            <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600 transition">Sterge produsul</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main ── */
export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  // Pricing state (shared across products)
  const { pricing, loading: pricingLoading } = useLivePricing();
  const [prices, setPrices] = useState(null);
  const [pageOptions, setPageOptions] = useState(null);

  useEffect(() => {
    loadProducts().then(items => {
      setProducts(items || DEFAULT_PRODUCTS);
      setLoading(false);
    });
  }, []);

  // Init pricing from Firestore
  useEffect(() => {
    if (!pricingLoading && pricing) {
      setPrices({
        'pagini-groase': JSON.parse(JSON.stringify(pricing['pagini-groase']?.prices || {})),
        'pagini-subtiri': JSON.parse(JSON.stringify(pricing['pagini-subtiri']?.prices || {})),
      });
      setPageOptions({
        'pagini-groase': [...(pricing['pagini-groase']?.pageOptions || [])],
        'pagini-subtiri': [...(pricing['pagini-subtiri']?.pageOptions || [])],
      });
    }
  }, [pricingLoading, pricing]);

  const handleChange = (idx, updated) => {
    setProducts(prev => prev.map((p, i) => i === idx ? updated : p));
    setSaved(false);
  };

  const handleDelete = (idx) => {
    if (!confirm(`Stergi produsul "${products[idx].name}"?`)) return;
    setProducts(prev => prev.filter((_, i) => i !== idx));
    setSaved(false);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const slug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setProducts(prev => [...prev, {
      slug, name: newName.trim(), badge: '', desc: '', defaultPages: 40, gallery: [], active: false,
    }]);
    setNewName('');
    setShowAdd(false);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProductsToFirestore(products);
      // Save pricing too
      if (prices && pageOptions) {
        await savePricing(
          prices['pagini-groase'], prices['pagini-subtiri'],
          pageOptions['pagini-groase'], pageOptions['pagini-subtiri'],
        );
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Eroare: ' + e.message);
    }
    setSaving(false);
  };

  if (loading || pricingLoading) return <div className="flex items-center justify-center py-20 text-gray-400">Se incarca...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#2C2520]">Produse</h2>
          <p className="text-sm text-gray-500 mt-1">{products.length} produse · {products.filter(p => p.active).length} active</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600">Salvat!</span>}
          <button onClick={handleSave} disabled={saving}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              saved ? 'bg-green-500 text-white' : 'bg-[#3D6B5E] text-white hover:bg-[#2d5246]'
            } disabled:opacity-50`}>
            {saving ? 'Se salveaza...' : saved ? 'Salvat!' : 'Salveaza tot'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {products.map((product, idx) => (
          <ProductEditor
            key={product.slug}
            product={product}
            onChange={(updated) => handleChange(idx, updated)}
            onDelete={() => handleDelete(idx)}
            onAutoSave={() => setTimeout(handleSave, 500)}
            prices={prices?.[product.slug] || {}}
            pageOptions={pageOptions?.[product.slug] || []}
            onPriceChange={(fmt, pg, val) => {
              setPrices(prev => ({
                ...prev,
                [product.slug]: { ...prev[product.slug], [fmt]: { ...(prev[product.slug]?.[fmt] || {}), [pg]: val } },
              }));
              setSaved(false);
            }}
            onOptionsChange={(opts) => {
              setPageOptions(prev => ({ ...prev, [product.slug]: opts }));
              setSaved(false);
            }}
          />
        ))}
      </div>

      {showAdd ? (
        <div className="mt-3 p-4 rounded-xl border-2 border-dashed border-[#3D6B5E]/30 bg-[#3D6B5E]/5">
          <div className="flex items-center gap-3">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#3D6B5E]"
              placeholder="Numele produsului (ex: Album Copertă din Piele)" autoFocus />
            <button onClick={handleAdd} disabled={!newName.trim()}
              className="px-4 py-2 rounded-lg bg-[#3D6B5E] text-white text-sm font-semibold disabled:opacity-40">Adauga</button>
            <button onClick={() => { setShowAdd(false); setNewName(''); }}
              className="px-3 py-2 rounded-lg bg-gray-200 text-gray-600 text-sm">Anuleaza</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="mt-3 w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-[#3D6B5E] hover:text-[#3D6B5E] transition-all">
          + Adauga produs nou
        </button>
      )}
    </div>
  );
}

export async function getProducts() {
  if (!db) return null;
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'settings', 'products'));
    if (snap.exists() && snap.data().items) return snap.data().items;
  } catch {}
  return null;
}
