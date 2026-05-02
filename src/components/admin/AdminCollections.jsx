import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';

const DEFAULT_COLLECTIONS = [
  { id: 'nunti',          slug: 'nunti',          label: 'Album foto de nuntă',           emoji: '💒' },
  { id: 'familie',        slug: 'familie',        label: 'Album foto de familie',          emoji: '👨‍👩‍👧‍👦' },
  { id: 'copii',          slug: 'copii',          label: 'Album pentru copii',             emoji: '👶' },
  { id: 'cumetrie',       slug: 'cumetrie',       label: 'Album foto de cumetrie',         emoji: '👼' },
  { id: 'botez',          slug: 'botez',          label: 'Album foto de botez',            emoji: '✝️' },
  { id: 'calatorie',      slug: 'calatorie',      label: 'Album foto de călătorie',        emoji: '✈️' },
  { id: 'vacanta',        slug: 'vacanta',        label: 'Album foto de vacanță',          emoji: '🌴' },
  { id: 'zi-de-nastere',  slug: 'zi-de-nastere',  label: 'Album foto de zi de naștere',    emoji: '🎂' },
  { id: 'clasa',          slug: 'clasa',          label: 'Album foto de clasă',            emoji: '🎓' },
  { id: 'anual',          slug: 'anual',          label: 'Album foto anual',               emoji: '📅' },
  { id: 'ziua-mamei',     slug: 'ziua-mamei',     label: 'Ziua Mamei',                     emoji: '💐' },
  { id: 'ziua-tatalui',   slug: 'ziua-tatalui',   label: 'Ziua Tatălui',                   emoji: '👔' },
  { id: 'valentines',     slug: 'valentines',     label: 'Ziua Îndrăgostiților',           emoji: '💙' },
];

// Slug-to-theme mapping for template counting
const SLUG_TO_THEMES = {
  nunti: ['wedding'], familie: ['family'], copii: ['kids', 'baby'],
  botez: ['baptism', 'christening'], cumetrie: ['christening'],
  calatorie: ['travel', 'vacation'], vacanta: ['vacation'],
  'zi-de-nastere': ['birthday'], clasa: ['school'], anual: ['yearbook'],
  'ziua-mamei': ['mothers_day'], 'ziua-tatalui': ['fathers_day'],
  valentines: ['valentines'],
};

function slugify(text) {
  return text.toLowerCase()
    .replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i')
    .replace(/ș/g, 's').replace(/ț/g, 't')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function AdminCollections() {
  const [collections, setCollections] = useState([]);
  const [active, setActive] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mockupCounts, setMockupCounts] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('📚');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const editRef = useRef(null);

  // Load from Firestore
  useEffect(() => {
    (async () => {
      try {
        if (!db) { setLoading(false); return; }
        const { doc, getDoc, collection, getDocs } = await import('firebase/firestore');

        const snap = await getDoc(doc(db, 'settings', 'collections'));
        if (snap.exists()) {
          const data = snap.data();
          setActive(data.active || {});
          // Load custom collections list (or fall back to defaults)
          if (data.items && data.items.length > 0) {
            setCollections(data.items);
          } else {
            setCollections(DEFAULT_COLLECTIONS);
          }
        } else {
          setCollections(DEFAULT_COLLECTIONS);
        }

        // Count cover templates per theme
        const tplSnap = await getDocs(collection(db, 'cover-templates'));
        const counts = {};
        tplSnap.forEach(d => {
          const theme = d.data().theme || 'other';
          counts[theme] = (counts[theme] || 0) + 1;
        });
        setMockupCounts(counts);
      } catch (e) {
        console.warn('Load collections failed:', e);
        setCollections(DEFAULT_COLLECTIONS);
      }
      setLoading(false);
    })();
  }, []);

  const toggle = (id) => {
    setActive(prev => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  };

  const enableAll = () => {
    const all = {};
    collections.forEach(c => { all[c.id] = true; });
    setActive(all);
    setSaved(false);
  };

  const disableAll = () => {
    setActive({});
    setSaved(false);
  };

  // Start editing a collection
  const startEdit = (col) => {
    setEditingId(col.id);
    setEditLabel(col.label);
    setEditEmoji(col.emoji);
    setTimeout(() => editRef.current?.focus(), 50);
  };

  // Save edit
  const saveEdit = () => {
    if (!editLabel.trim()) return;
    setCollections(prev => prev.map(c =>
      c.id === editingId ? { ...c, label: editLabel.trim(), emoji: editEmoji } : c
    ));
    setEditingId(null);
    setSaved(false);
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
  };

  // Add new collection
  const addCollection = () => {
    if (!newLabel.trim()) return;
    const slug = slugify(newLabel);
    if (collections.some(c => c.id === slug)) return;
    const newCol = { id: slug, slug, label: newLabel.trim(), emoji: newEmoji };
    setCollections(prev => [...prev, newCol]);
    setActive(prev => ({ ...prev, [slug]: true }));
    setNewLabel('');
    setNewEmoji('📚');
    setShowAdd(false);
    setSaved(false);
  };

  // Delete collection
  const deleteCollection = (id) => {
    setCollections(prev => prev.filter(c => c.id !== id));
    setActive(prev => { const next = { ...prev }; delete next[id]; return next; });
    setConfirmDelete(null);
    setSaved(false);
  };

  // Move up/down
  const move = (id, dir) => {
    setCollections(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
    setSaved(false);
  };

  // Save all to Firestore
  const save = async () => {
    setSaving(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'collections'), {
        active,
        items: collections,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  };

  const activeCount = collections.filter(c => active[c.id]).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Se incarca...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#2C2520]">Colectii / Ocazii</h2>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} din {collections.length} active pe site
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={enableAll}
            className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition">
            Activeaza toate
          </button>
          <button onClick={disableAll}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
            Dezactiveaza toate
          </button>
        </div>
      </div>

      {/* Collection list */}
      <div className="space-y-2">
        {collections.map((col, idx) => {
          const isActive = !!active[col.id];
          const themes = SLUG_TO_THEMES[col.id] || [];
          const tplCount = themes.reduce((sum, t) => sum + (mockupCounts[t] || 0), 0);
          const isEditing = editingId === col.id;
          const isDeleting = confirmDelete === col.id;

          return (
            <div
              key={col.id}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                isActive
                  ? 'bg-white border-[#3D6B5E]/20 shadow-sm'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              {/* Reorder arrows */}
              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                <button onClick={() => move(col.id, -1)} disabled={idx === 0}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-[10px] leading-none">▲</button>
                <button onClick={() => move(col.id, 1)} disabled={idx === collections.length - 1}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-[10px] leading-none">▼</button>
              </div>

              {/* Emoji (editable in edit mode) */}
              {isEditing ? (
                <input
                  value={editEmoji}
                  onChange={e => setEditEmoji(e.target.value)}
                  className="w-10 text-2xl text-center bg-transparent border-b-2 border-[#3D6B5E] outline-none"
                  maxLength={4}
                />
              ) : (
                <span className="text-2xl w-10 text-center shrink-0">{col.emoji}</span>
              )}

              {/* Info / Edit mode */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={editRef}
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      className="flex-1 text-sm font-medium border-b-2 border-[#3D6B5E] outline-none bg-transparent py-0.5"
                    />
                    <button onClick={saveEdit} className="text-xs px-2 py-1 rounded bg-[#3D6B5E] text-white hover:bg-[#2d5246]">OK</button>
                    <button onClick={cancelEdit} className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300">Anuleaza</button>
                  </div>
                ) : isDeleting ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600 font-medium">Stergi "{col.label}"?</span>
                    <button onClick={() => deleteCollection(col.id)} className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">Da, sterge</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300">Nu</button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${isActive ? 'text-[#2C2520]' : 'text-gray-400'}`}>
                        {col.label}
                      </span>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                          ACTIV
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">/colectie/{col.slug}</span>
                      <span className="text-xs text-gray-400">
                        {tplCount} {tplCount === 1 ? 'template' : 'template-uri'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Action buttons (visible on hover) */}
              {!isEditing && !isDeleting && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button onClick={() => startEdit(col)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition" title="Redenumeste">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => setConfirmDelete(col.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Sterge">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Toggle */}
              <button
                onClick={() => toggle(col.id)}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                  isActive ? 'bg-[#3D6B5E]' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  isActive ? 'left-[26px]' : 'left-0.5'
                }`} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add new collection */}
      {showAdd ? (
        <div className="mt-3 p-4 rounded-xl border-2 border-dashed border-[#3D6B5E]/30 bg-[#3D6B5E]/5">
          <p className="text-xs text-gray-500 mb-3 font-medium">Colectie noua</p>
          <div className="flex items-center gap-3">
            <input
              value={newEmoji}
              onChange={e => setNewEmoji(e.target.value)}
              className="w-12 text-2xl text-center bg-white border border-gray-200 rounded-lg py-1 outline-none focus:border-[#3D6B5E]"
              maxLength={4}
              placeholder="📚"
            />
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCollection(); }}
              className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#3D6B5E]"
              placeholder="Numele colectiei (ex: Album foto de absolvire)"
              autoFocus
            />
            <button onClick={addCollection} disabled={!newLabel.trim()}
              className="px-4 py-2 rounded-lg bg-[#3D6B5E] text-white text-sm font-semibold hover:bg-[#2d5246] disabled:opacity-40 transition">
              Adauga
            </button>
            <button onClick={() => { setShowAdd(false); setNewLabel(''); }}
              className="px-3 py-2 rounded-lg bg-gray-200 text-gray-600 text-sm hover:bg-gray-300 transition">
              Anuleaza
            </button>
          </div>
          {newLabel.trim() && (
            <p className="text-[10px] text-gray-400 mt-2">
              URL: /colectie/{slugify(newLabel)}
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="mt-3 w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-[#3D6B5E] hover:text-[#3D6B5E] transition-all"
        >
          + Adauga colectie noua
        </button>
      )}

      {/* Save button */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-[#3D6B5E] text-white hover:bg-[#2d5246] active:scale-[0.98]'
          } disabled:opacity-50`}
        >
          {saving ? 'Se salveaza...' : saved ? 'Salvat!' : 'Salveaza modificarile'}
        </button>
        {saved && (
          <span className="text-sm text-green-600">Schimbarile sunt live pe site</span>
        )}
      </div>

      {/* Info box */}
      <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <p className="font-semibold mb-1">Cum functioneaza?</p>
        <ul className="space-y-1 text-xs text-amber-700">
          <li>Apasa pe toggle pentru a activa/dezactiva o colectie pe site</li>
          <li>Hover pe rand si apasa creionul pentru a redenumi titlul sau emoji</li>
          <li>Hover pe rand si apasa cosul pentru a sterge colectia</li>
          <li>Sagetile sus/jos schimba ordinea in meniu</li>
          <li>Colectiile dezactivate nu apar in meniu, homepage, sau pagini /colectie</li>
        </ul>
      </div>
    </div>
  );
}

// Export for other components to check active state + items
export async function getActiveCollections() {
  if (!db) return null;
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'settings', 'collections'));
    if (snap.exists()) return snap.data().active || {};
    return null; // no settings = show all
  } catch { return null; }
}

export async function getCollectionItems() {
  if (!db) return null;
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'settings', 'collections'));
    if (snap.exists() && snap.data().items) return snap.data().items;
    return null;
  } catch { return null; }
}
