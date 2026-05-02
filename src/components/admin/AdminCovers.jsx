import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCoverTemplates, getAllCoverTemplatesAsync, deleteCoverTemplate, resetCoverTemplates, updateCoverTemplate, addCoverTemplate, saveCoverTemplates, COVER_CATEGORIES } from '../../utils/coverData';
import { storage, db } from '../../firebase/config';

// Emoji-urile vin din COVER_CATEGORIES
function getCategoryIcon(catId) {
  const cat = COVER_CATEGORIES.find(c => c.id === catId);
  return cat?.emoji || '📁';
}

/* ── Mini cover preview — mockup pătrat ── */
function CoverPreview({ template }) {
  const { coverStyle } = template;
  const mockup = coverStyle?.mockupImage || coverStyle?.previewImage;
  const bgImage = coverStyle?.bgImage || coverStyle?.designSquare;
  const bg = coverStyle?.bg || '#F0EDE8';
  const image = mockup || bgImage;

  return (
    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#F0EDE6] flex items-center justify-center">
      {image ? (
        <img src={image} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full" style={{ background: bg }} />
      )}
    </div>
  );
}

export default function AdminCovers() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [uploading, setUploading] = useState(null);
  const fileInputRef = useRef(null);
  const uploadTargetRef = useRef(null);
  const newCoverInputRef = useRef(null);

  // Collection management state
  const [collectionActive, setCollectionActive] = useState({});
  const [collectionItems, setCollectionItems] = useState(null); // null = not loaded yet
  const [editingCat, setEditingCat] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('📚');
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(null);
  const [collSaving, setCollSaving] = useState(false);
  const [collSaved, setCollSaved] = useState(false);
  const editLabelRef = useRef(null);

  useEffect(() => {
    setTemplates(getAllCoverTemplates());
    getAllCoverTemplatesAsync().then(setTemplates).catch(() => {});

    // Load collection settings
    if (db) {
      (async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const snap = await getDoc(doc(db, 'settings', 'collections'));
          if (snap.exists()) {
            const data = snap.data();
            setCollectionActive(data.active || {});
            if (data.items) setCollectionItems(data.items);
          }
        } catch {}
      })();
    }
  }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Stergi template-ul "${name}"?`)) return;
    const updated = await deleteCoverTemplate(id);
    setTemplates(updated);
  };

  const moveTemplate = async (id, dir) => {
    const all = [...templates];
    const idx = all.findIndex(t => t.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= all.length) return;
    [all[idx], all[newIdx]] = [all[newIdx], all[idx]];
    all.forEach((t, i) => { t.order = i; });
    await saveCoverTemplates(all);
    setTemplates(all);
  };

  const handleReset = () => {
    if (!confirm('Resetezi toate template-urile la valorile implicite?')) return;
    resetCoverTemplates();
    setTemplates(getAllCoverTemplates());
  };

  // Upload cover image to Firebase Storage
  const handleUploadImage = async (coverId, file) => {
    if (!file || !storage) return;
    setUploading(coverId);
    try {
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const ext = file.name.split('.').pop() || 'webp';
      const storageRef = ref(storage, `covers/${coverId}.${ext}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const updated = await updateCoverTemplate(coverId, {
        coverStyle: { ...(templates.find(t => t.id === coverId)?.coverStyle || {}), bgImage: url },
      });
      setTemplates(updated);
    } catch (err) {
      console.error('Cover upload failed:', err);
      alert('Eroare la upload: ' + (err.message || 'Necunoscută'));
    } finally {
      setUploading(null);
    }
  };

  const triggerUpload = (coverId) => {
    uploadTargetRef.current = coverId;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && uploadTargetRef.current) {
      handleUploadImage(uploadTargetRef.current, file);
    }
    e.target.value = '';
  };

  // Create new cover with just an image
  const handleCreateWithImage = async (file, category) => {
    if (!file || !storage) return;
    const id = `cover_${Date.now()}`;
    setUploading(id);
    try {
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const ext = file.name.split('.').pop() || 'webp';
      const storageRef = ref(storage, `covers/${id}.${ext}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const newTemplate = {
        id,
        name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        desc: '',
        theme: category || 'classic',
        frames: [], texts: [], decorTexts: [], decorImages: [],
        coverStyle: { bg: '#F5F1EB', accent: '#2C2520', bgImage: url },
      };
      const updated = await addCoverTemplate(newTemplate);
      setTemplates(updated);
    } catch (err) {
      console.error('Cover create failed:', err);
      alert('Eroare: ' + (err.message || 'Necunoscută'));
    } finally {
      setUploading(null);
    }
  };

  // ── Collection management helpers ──
  const slugify = (text) => text.toLowerCase()
    .replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i')
    .replace(/ș/g, 's').replace(/ț/g, 't')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Map COVER_CATEGORIES id → collection slug
  const THEME_TO_SLUG = {
    wedding: 'nunti', family: 'familie', kids: 'copii', christening: 'cumetrie',
    baptism: 'botez', travel: 'calatorie', vacation: 'vacanta', birthday: 'zi-de-nastere',
    school: 'clasa', yearbook: 'anual', mothers_day: 'ziua-mamei', fathers_day: 'ziua-tatalui',
    valentines: 'valentines', classic: 'clasic', minimal: 'minimal',
  };

  const getCollSlug = (catId) => THEME_TO_SLUG[catId] || catId;

  const toggleCollection = (catId) => {
    const slug = getCollSlug(catId);
    const newActive = { ...collectionActive, [slug]: !collectionActive[slug] };
    setCollectionActive(newActive);
    // Auto-save to Firestore immediately
    (async () => {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const items = collectionItems || COVER_CATEGORIES.filter(c => c.id !== 'all').map(c => ({
          id: getCollSlug(c.id), slug: getCollSlug(c.id), label: c.label, emoji: c.emoji || '📁',
        }));
        await setDoc(doc(db, 'settings', 'collections'), {
          active: newActive, items, updatedAt: new Date().toISOString(),
        });
        setCollectionItems(items);
        setCollSaved(true);
        setTimeout(() => setCollSaved(false), 2000);
      } catch (e) { console.error('Auto-save toggle failed:', e); }
    })();
  };

  const startEditCat = (cat) => {
    setEditingCat(cat.id);
    // Try to find custom label
    const slug = getCollSlug(cat.id);
    const custom = collectionItems?.find(c => c.id === slug);
    setEditLabel(custom?.label || cat.label);
    setEditEmoji(custom?.emoji || cat.emoji || '📁');
    setTimeout(() => editLabelRef.current?.focus(), 50);
  };

  const saveEditCat = () => {
    if (!editLabel.trim()) return;
    const cat = COVER_CATEGORIES.find(c => c.id === editingCat);
    const slug = getCollSlug(editingCat);

    // Update or create in items list
    setCollectionItems(prev => {
      const items = prev ? [...prev] : COVER_CATEGORIES.filter(c => c.id !== 'all').map(c => ({
        id: getCollSlug(c.id), slug: getCollSlug(c.id), label: c.label, emoji: c.emoji || '📁',
      }));
      const idx = items.findIndex(c => c.id === slug);
      if (idx >= 0) {
        items[idx] = { ...items[idx], label: editLabel.trim(), emoji: editEmoji };
      } else {
        items.push({ id: slug, slug, label: editLabel.trim(), emoji: editEmoji });
      }
      return items;
    });
    setEditingCat(null);
    setCollSaved(false);
  };

  const deleteCat = (catId) => {
    const slug = getCollSlug(catId);
    setCollectionItems(prev => {
      if (!prev) return prev;
      return prev.filter(c => c.id !== slug);
    });
    setCollectionActive(prev => { const next = { ...prev }; delete next[slug]; return next; });
    setConfirmDeleteCat(null);
    setCollSaved(false);
  };

  const addNewCategory = () => {
    if (!newCatLabel.trim()) return;
    const slug = slugify(newCatLabel);
    setCollectionItems(prev => {
      const items = prev ? [...prev] : COVER_CATEGORIES.filter(c => c.id !== 'all').map(c => ({
        id: getCollSlug(c.id), slug: getCollSlug(c.id), label: c.label, emoji: c.emoji || '📁',
      }));
      if (items.some(c => c.id === slug)) return items;
      return [...items, { id: slug, slug, label: newCatLabel.trim(), emoji: newCatEmoji }];
    });
    setCollectionActive(prev => ({ ...prev, [slug]: true }));
    setNewCatLabel('');
    setNewCatEmoji('📚');
    setShowAddCat(false);
    setCollSaved(false);
  };

  const saveCollections = async () => {
    setCollSaving(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const items = collectionItems || COVER_CATEGORIES.filter(c => c.id !== 'all').map(c => ({
        id: getCollSlug(c.id), slug: getCollSlug(c.id), label: c.label, emoji: c.emoji || '📁',
      }));
      await setDoc(doc(db, 'settings', 'collections'), {
        active: collectionActive,
        items,
        updatedAt: new Date().toISOString(),
      });
      setCollectionItems(items);
      setCollSaved(true);
      setTimeout(() => setCollSaved(false), 3000);
    } catch (e) {
      console.error('Save collections failed:', e);
    }
    setCollSaving(false);
  };

  // Templates filtered by active category
  const filtered = activeCategory
    ? templates.filter((t) => t.theme === activeCategory)
    : templates;

  // Count per category
  const countByCategory = {};
  templates.forEach((t) => {
    const cat = t.theme || 'uncategorized';
    countByCategory[cat] = (countByCategory[cat] || 0) + 1;
  });

  // Hidden file input for cover upload
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/webp,image/jpeg,image/png"
      className="hidden"
      onChange={handleFileChange}
    />
  );

  // Get display label for a category (custom or default)
  const getCatLabel = (cat) => {
    const slug = getCollSlug(cat.id);
    const custom = collectionItems?.find(c => c.id === slug);
    return custom?.label || cat.label;
  };
  const getCatEmoji = (cat) => {
    const slug = getCollSlug(cat.id);
    const custom = collectionItems?.find(c => c.id === slug);
    return custom?.emoji || cat.emoji || '📁';
  };

  const activeCollCount = Object.values(collectionActive).filter(Boolean).length;

  // ═══ CATEGORIES VIEW (no category selected) ═══
  if (!activeCategory) {
    return (
      <div>
        {fileInput}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Coverte</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {templates.length} template-uri in {Object.keys(countByCategory).length} categorii
              {activeCollCount > 0 && <span className="ml-2 text-green-600">({activeCollCount} active pe site)</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleReset} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
              Reseteaza
            </button>
          </div>
        </div>

        {/* Category cards with edit/delete/toggle controls */}
        <div className="space-y-2">
          {COVER_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
            const count = countByCategory[cat.id] || 0;
            const slug = getCollSlug(cat.id);
            const isActive = !!collectionActive[slug];
            const isEditing = editingCat === cat.id;
            const isDeleting = confirmDeleteCat === cat.id;

            return (
              <div
                key={cat.id}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-white border-[#3D6B5E]/20 shadow-sm'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                {/* Emoji */}
                {isEditing ? (
                  <input value={editEmoji} onChange={e => setEditEmoji(e.target.value)}
                    className="w-10 text-2xl text-center bg-transparent border-b-2 border-[#3D6B5E] outline-none shrink-0" maxLength={4} />
                ) : (
                  <span className="text-2xl w-10 text-center shrink-0">{getCatEmoji(cat)}</span>
                )}

                {/* Info / Edit */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input ref={editLabelRef} value={editLabel} onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEditCat(); if (e.key === 'Escape') setEditingCat(null); }}
                        className="flex-1 text-sm font-medium border-b-2 border-[#3D6B5E] outline-none bg-transparent py-0.5" />
                      <button onClick={saveEditCat} className="text-xs px-2 py-1 rounded bg-[#3D6B5E] text-white hover:bg-[#2d5246]">OK</button>
                      <button onClick={() => setEditingCat(null)} className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">Anuleaza</button>
                    </div>
                  ) : isDeleting ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 font-medium">Stergi "{getCatLabel(cat)}"?</span>
                      <button onClick={() => deleteCat(cat.id)} className="text-xs px-2 py-1 rounded bg-red-500 text-white">Da, sterge</button>
                      <button onClick={() => setConfirmDeleteCat(null)} className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">Nu</button>
                    </div>
                  ) : (
                    <button onClick={() => setActiveCategory(cat.id)} className="text-left w-full">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${isActive ? 'text-[#2C2520]' : 'text-gray-400'}`}>
                          {getCatLabel(cat)}
                        </span>
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">ACTIV</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-400">{count} {count === 1 ? 'template' : 'template-uri'}</span>
                        {count > 0 && (
                          <div className="flex gap-0.5">
                            {templates.filter(t => t.theme === cat.id).slice(0, 4).map(t => (
                              <div key={t.id} className="w-5 h-6 rounded overflow-hidden" style={{ background: t.coverStyle?.bg || '#F0EDE8' }}>
                                {t.coverStyle?.bgImage && <img src={t.coverStyle.bgImage} alt="" className="w-full h-full object-cover" />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  )}
                </div>

                {/* Edit/Delete buttons (on hover) */}
                {!isEditing && !isDeleting && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); startEditCat(cat); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition" title="Redenumeste">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteCat(cat.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Sterge">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Toggle active on site */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCollection(cat.id); }}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                    isActive ? 'bg-[#3D6B5E]' : 'bg-gray-300'
                  }`}
                  title={isActive ? 'Dezactiveaza pe site' : 'Activeaza pe site'}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    isActive ? 'left-[26px]' : 'left-0.5'
                  }`} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add new category */}
        {showAddCat ? (
          <div className="mt-3 p-4 rounded-xl border-2 border-dashed border-[#3D6B5E]/30 bg-[#3D6B5E]/5">
            <p className="text-xs text-gray-500 mb-3 font-medium">Categorie noua</p>
            <div className="flex items-center gap-3">
              <input value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)}
                className="w-12 text-2xl text-center bg-white border border-gray-200 rounded-lg py-1 outline-none focus:border-[#3D6B5E]" maxLength={4} />
              <input value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addNewCategory(); }}
                className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#3D6B5E]"
                placeholder="Numele categoriei (ex: Album de absolvire)" autoFocus />
              <button onClick={addNewCategory} disabled={!newCatLabel.trim()}
                className="px-4 py-2 rounded-lg bg-[#3D6B5E] text-white text-sm font-semibold hover:bg-[#2d5246] disabled:opacity-40">
                Adauga
              </button>
              <button onClick={() => { setShowAddCat(false); setNewCatLabel(''); }}
                className="px-3 py-2 rounded-lg bg-gray-200 text-gray-600 text-sm hover:bg-gray-300">Anuleaza</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddCat(true)}
            className="mt-3 w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-[#3D6B5E] hover:text-[#3D6B5E] transition-all">
            + Adauga categorie noua
          </button>
        )}

        {/* Save collections button */}
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveCollections} disabled={collSaving}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              collSaved ? 'bg-green-500 text-white' : 'bg-[#3D6B5E] text-white hover:bg-[#2d5246] active:scale-[0.98]'
            } disabled:opacity-50`}>
            {collSaving ? 'Se salveaza...' : collSaved ? 'Salvat!' : 'Salveaza colectiile'}
          </button>
          {collSaved && <span className="text-sm text-green-600">Live pe site</span>}
        </div>

        {/* All templates link */}
        <div className="mt-6 text-center">
          <button onClick={() => setActiveCategory('__all__')} className="text-sm text-[#3D6B5E] hover:underline">
            Arata toate template-urile ({templates.length}) →
          </button>
        </div>
      </div>
    );
  }

  // ═══ TEMPLATES LIST (category selected) ═══
  const isAll = activeCategory === '__all__';
  const categoryLabel = isAll ? 'Toate' : (COVER_CATEGORIES.find((c) => c.id === activeCategory)?.label || activeCategory);
  const displayTemplates = isAll ? templates : filtered;

  return (
    <div>
      {fileInput}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveCategory(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{getCategoryIcon(activeCategory)}</span>
              <h2 className="text-xl font-bold text-gray-900">{categoryLabel}</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{displayTemplates.length} template-uri</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer">
            Adauga cover
            <input
              ref={newCoverInputRef}
              type="file"
              accept="image/webp,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCreateWithImage(file, isAll ? 'classic' : activeCategory);
                e.target.value = '';
              }}
            />
          </label>
          <button
            onClick={() => navigate(`/admin_panel/covers/new?category=${isAll ? '' : activeCategory}`)}
            className="px-4 py-2 bg-[#3D6B5E] text-white rounded-lg text-sm font-medium hover:bg-[#2d5445] transition-colors"
          >
            + Template nou
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayTemplates.map((tpl, idx) => (
          <div key={tpl.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative group">
            {/* Reorder arrows */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => moveTemplate(tpl.id, -1)} disabled={idx === 0}
                className="w-6 h-6 rounded bg-white/90 shadow text-gray-400 hover:text-gray-700 flex items-center justify-center text-[10px] disabled:opacity-20">▲</button>
              <button onClick={() => moveTemplate(tpl.id, 1)} disabled={idx === displayTemplates.length - 1}
                className="w-6 h-6 rounded bg-white/90 shadow text-gray-400 hover:text-gray-700 flex items-center justify-center text-[10px] disabled:opacity-20">▼</button>
            </div>
            {/* Position badge */}
            <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/40 text-white text-[10px] font-bold flex items-center justify-center">
              {idx + 1}
            </div>
            <div className="p-4 pb-3 bg-gray-50">
              <CoverPreview template={tpl} />
            </div>
            <div className="p-4">
              <h3 className="text-sm font-bold text-gray-900">{tpl.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{tpl.desc}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
                  {tpl.frames?.length || 0} foto
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-medium">
                  {tpl.texts?.length || 0} text
                </span>
                {tpl.theme && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded font-medium">
                    {COVER_CATEGORIES.find((c) => c.id === tpl.theme)?.label || tpl.theme}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <button onClick={() => triggerUpload(tpl.id)}
                  disabled={uploading === tpl.id}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50">
                  {uploading === tpl.id ? 'Upload...' : 'Imagine'}
                </button>
                <button onClick={() => navigate(`/admin_panel/covers/${tpl.id}`)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-[#3D6B5E] border border-[#3D6B5E]/30 rounded-lg hover:bg-[#3D6B5E]/5 transition-colors">
                  Editeaza
                </button>
                <button onClick={() => handleDelete(tpl.id, tpl.name)}
                  className="px-3 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {displayTemplates.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">{getCategoryIcon(activeCategory)}</div>
          <p className="text-sm">Niciun template in aceasta categorie</p>
          <button onClick={() => navigate(`/admin_panel/covers/new?category=${activeCategory}`)}
            className="mt-3 text-sm text-[#3D6B5E] hover:underline">
            + Creeaza primul template
          </button>
        </div>
      )}
    </div>
  );
}
