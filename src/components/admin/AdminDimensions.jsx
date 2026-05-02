import { useState, useEffect } from 'react';
import { getAllDimensions, saveDimensions, resetDimensions, getActiveFormats, saveActiveFormats, syncActiveFormatsToFirestore, loadActiveFormatsFromFirestore } from '../../utils/dimensions';

/* ── Product display names ── */
const PRODUCT_NAMES = {
  'pagini-groase': 'Album Pagini Groase',
  'pagini-subtiri': 'Album Pagini Subțiri',
};

/* ── Editable number input ── */
function NumInput({ value, onChange, label, unit = 'px', width = 'w-20' }) {
  return (
    <label className="flex items-center gap-1">
      <span className="text-[10px] text-gray-500 font-medium uppercase">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className={`${width} px-2 py-1 text-xs font-mono border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E] outline-none text-center`}
      />
      <span className="text-[10px] text-gray-400">{unit}</span>
    </label>
  );
}

/* ── Visual spread preview ── */
function SpreadPreview({ dims, label, color }) {
  if (!dims) return null;
  const aspect = dims.width / dims.height;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`border-2 rounded flex items-center justify-center ${color}`}
        style={{ width: `${Math.min(120, 50 * aspect)}px`, height: `${Math.min(120, 50 * aspect) / aspect}px` }}
      >
        <div className="w-px h-full bg-current opacity-20" />
      </div>
      <span className="text-[9px] text-gray-400">{label}</span>
    </div>
  );
}

/* ── Format row — editable with delete button + toggle ── */
function FormatRow({ format, dims, onChange, onDelete, isActive, onToggle }) {
  const cover = dims?.cover;
  const spread = dims?.spread;

  const updateCover = (key, val) => {
    onChange({
      ...dims,
      cover: { ...cover, [key]: val },
    });
  };

  const updateSpread = (key, val) => {
    onChange({
      ...dims,
      spread: { ...spread, [key]: val },
    });
  };

  return (
    <div className={`bg-white rounded-xl border p-4 transition-all ${isActive ? 'border-gray-200' : 'border-gray-200 opacity-50'}`}>
      {/* Format header */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-sm font-bold ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{format.replace('x', ' × ')} cm</span>
        {isActive && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">ACTIV</span>
        )}
        <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded transition-colors">
          Șterge format
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <div className="flex items-end gap-3">
            {cover && <SpreadPreview dims={cover} label="Cover" color="border-amber-300 text-amber-400" />}
            {spread && <SpreadPreview dims={spread} label="Rotație" color="border-blue-300 text-blue-400" />}
          </div>
          <button
            onClick={onToggle}
            className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
              isActive ? 'bg-[#3D6B5E]' : 'bg-gray-300'
            }`}
            title={isActive ? 'Dezactivează pe site' : 'Activează pe site'}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              isActive ? 'left-[26px]' : 'left-0.5'
            }`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cover section */}
        {cover && (
          <div className="p-3 rounded-lg bg-amber-50/40 border border-amber-100">
            <h4 className="text-xs font-semibold text-amber-800 mb-2.5">Cover (copertă)</h4>
            <div className="flex flex-wrap items-center gap-3">
              <NumInput label="Lățime" value={cover.width} onChange={(v) => updateCover('width', v)} />
              <span className="text-gray-300 text-xs">×</span>
              <NumInput label="Înălțime" value={cover.height} onChange={(v) => updateCover('height', v)} />
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <NumInput label="Bleed" value={cover.bleed} onChange={(v) => updateCover('bleed', v)} unit="mm" width="w-14" />
              <NumInput label="Cotor" value={cover.spine} onChange={(v) => updateCover('spine', v)} unit="mm" width="w-14" />
            </div>
          </div>
        )}

        {/* Spread section */}
        {spread && (
          <div className="p-3 rounded-lg bg-blue-50/40 border border-blue-100">
            <h4 className="text-xs font-semibold text-blue-800 mb-2.5">Rotație (spread)</h4>
            <div className="flex flex-wrap items-center gap-3">
              <NumInput label="Lățime" value={spread.width} onChange={(v) => updateSpread('width', v)} />
              <span className="text-gray-300 text-xs">×</span>
              <NumInput label="Înălțime" value={spread.height} onChange={(v) => updateSpread('height', v)} />
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <NumInput label="Bleed" value={spread.bleed} onChange={(v) => updateSpread('bleed', v)} unit="mm" width="w-14" />
              <NumInput label="Cotor" value={spread.cotor || 0} onChange={(v) => updateSpread('cotor', v)} unit="mm" width="w-14" />
            </div>
            {(spread.cotor || 0) > 0 && (
              <div className="mt-2 text-[10px] text-amber-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Cotor {spread.cotor}mm pe marginea interioară (pagini subțiri / revistă)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDimensions() {
  const [activeProduct, setActiveProduct] = useState('pagini-groase');
  const [dimensions, setDimensions] = useState({});
  const [activeFormats, setActiveFormats] = useState({}); // { product: { format: true/false } }
  const [saved, setSaved] = useState(true);
  const [showAddFormat, setShowAddFormat] = useState(false);
  const [newFormatName, setNewFormatName] = useState('');

  useEffect(() => {
    setDimensions(getAllDimensions());
    // Load active formats from Firestore first, then localStorage fallback
    loadActiveFormatsFromFirestore().then(remote => {
      if (remote) {
        setActiveFormats(remote);
        saveActiveFormats(remote); // cache locally
      } else {
        const local = getActiveFormats();
        if (local) setActiveFormats(local);
      }
    });
  }, []);

  const products = Object.keys(dimensions);
  const productData = dimensions[activeProduct] || {};
  const formats = Object.keys(productData);

  const handleFormatChange = (format, newDims) => {
    setDimensions(prev => ({
      ...prev,
      [activeProduct]: {
        ...prev[activeProduct],
        [format]: newDims,
      },
    }));
    setSaved(false);
  };

  const handleDeleteFormat = (format) => {
    if (!confirm(`Ștergi formatul ${format.replace('x', '×')} din ${PRODUCT_NAMES[activeProduct] || activeProduct}?`)) return;
    setDimensions(prev => {
      const updated = { ...prev };
      const product = { ...updated[activeProduct] };
      delete product[format];
      updated[activeProduct] = product;
      return updated;
    });
    setSaved(false);
  };

  const handleAddFormat = () => {
    // Normalize: "20x25" or "20×25" or "20 x 25" → "20x25"
    const fmt = newFormatName.trim().replace(/\s/g, '').replace('×', 'x').toLowerCase();
    if (!fmt || !fmt.includes('x')) { alert('Format invalid. Exemplu: 20x25'); return; }
    if (productData[fmt]) { alert('Acest format există deja'); return; }

    setDimensions(prev => ({
      ...prev,
      [activeProduct]: {
        ...prev[activeProduct],
        [fmt]: {
          cover: { width: 0, height: 0, bleed: 15, spine: 26 },
          spread: { width: 0, height: 0, bleed: 3 },
        },
      },
    }));
    setNewFormatName('');
    setShowAddFormat(false);
    setSaved(false);
  };

  const handleToggleFormat = (format) => {
    setActiveFormats(prev => {
      const product = prev[activeProduct] || {};
      // Default: if no entry exists, format is active
      const current = product[format] !== undefined ? product[format] : true;
      return { ...prev, [activeProduct]: { ...product, [format]: !current } };
    });
    setSaved(false);
  };

  const isFormatActive = (format) => {
    const product = activeFormats[activeProduct];
    if (!product) return true; // default: all active
    return product[format] !== false;
  };

  const handleSave = () => {
    saveDimensions(dimensions);
    saveActiveFormats(activeFormats);
    syncActiveFormatsToFirestore(activeFormats);
    setSaved(true);
  };

  const handleReset = () => {
    if (!confirm('Resetezi toate dimensiunile la valorile implicite?')) return;
    resetDimensions();
    setDimensions(getAllDimensions());
    setSaved(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dimensiuni produse</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Dimensiunile exacte la 300 DPI pentru cover și rotații — editabile
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!saved && (
            <span className="text-xs text-amber-600 font-medium">Modificări nesalvate</span>
          )}
          {saved && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Salvat
            </span>
          )}
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Resetează
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              saved
                ? 'bg-gray-100 text-gray-400 cursor-default'
                : 'bg-[#3D6B5E] text-white hover:bg-[#2d5445]'
            }`}
          >
            Salvează
          </button>
        </div>
      </div>

      {/* Product tabs */}
      <div className="flex items-center gap-2 mb-5">
        {products.map(slug => (
          <button
            key={slug}
            onClick={() => setActiveProduct(slug)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeProduct === slug
                ? 'bg-[#3D6B5E] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {PRODUCT_NAMES[slug] || slug}
          </button>
        ))}
      </div>

      {/* Format cards — editable */}
      <div className="space-y-4">
        {formats.map(format => (
          <FormatRow
            key={`${activeProduct}-${format}`}
            format={format}
            dims={productData[format]}
            onChange={(newDims) => handleFormatChange(format, newDims)}
            onDelete={() => handleDeleteFormat(format)}
            isActive={isFormatActive(format)}
            onToggle={() => handleToggleFormat(format)}
          />
        ))}
      </div>

      {/* Add format */}
      <div className="mt-4">
        {showAddFormat ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <input type="text" value={newFormatName} onChange={(e) => setNewFormatName(e.target.value)}
              placeholder="ex: 15x20" onKeyDown={(e) => e.key === 'Enter' && handleAddFormat()}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none w-32" autoFocus />
            <span className="text-xs text-gray-400">cm</span>
            <button onClick={handleAddFormat}
              className="px-4 py-2 bg-[#3D6B5E] text-white rounded-lg text-sm font-medium hover:bg-[#2d5445]">Adaugă</button>
            <button onClick={() => { setShowAddFormat(false); setNewFormatName(''); }}
              className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">Anulează</button>
          </div>
        ) : (
          <button onClick={() => setShowAddFormat(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-[#3D6B5E] hover:text-[#3D6B5E] transition-colors">
            + Adaugă format nou
          </button>
        )}
      </div>

      {/* Structure info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Structura cover-ului</h3>
          <div className="flex items-center gap-1 text-[11px] flex-wrap">
            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-mono">bleed</span>
            <span className="text-gray-300">+</span>
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">spate</span>
            <span className="text-gray-300">+</span>
            <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-mono">cotor</span>
            <span className="text-gray-300">+</span>
            <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded font-mono">față</span>
            <span className="text-gray-300">+</span>
            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-mono">bleed</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Structura rotației</h3>
          <div className="flex items-center gap-1 text-[11px] flex-wrap">
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-mono">bleed</span>
            <span className="text-gray-300">+</span>
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">stânga</span>
            <span className="text-gray-300">+</span>
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">dreapta</span>
            <span className="text-gray-300">+</span>
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-mono">bleed</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] flex-wrap mt-2">
            <span className="text-[10px] text-gray-400">Cu cotor:</span>
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-mono">bleed</span>
            <span className="text-gray-300">+</span>
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">stânga</span>
            <span className="text-gray-300">+</span>
            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-mono">cotor</span>
            <span className="text-gray-300">|</span>
            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-mono">cotor</span>
            <span className="text-gray-300">+</span>
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">dreapta</span>
            <span className="text-gray-300">+</span>
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-mono">bleed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
