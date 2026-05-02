import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { computeRects } from '../../utils/layoutEngine';
import AdminCollageEditor from './AdminCollageEditor';

/**
 * Admin panel — Layout management:
 * Tab 1: Creează colaj (free-form template designer)
 * Tab 2: Template-uri PRO (saved professional templates)
 * Tab 3: Colaje auto (binary tree — candidates + approved)
 */

/* ── Preview for binary-tree layouts ── */
function TreeLayoutPreview({ fingerprint, photoCount, size = 120 }) {
  function fpToTree(fp) {
    if (!fp) return null;
    if (fp.t === 'L') return { type: 'leaf', id: 'p' + Math.random(), photo: null, slot: fp.s };
    return { type: fp.t, ratio: fp.r, children: (fp.c || []).map(fpToTree) };
  }
  const tree = fpToTree(fingerprint);
  if (!tree) return <div className="w-full h-full bg-[#F0EDE8]" />;
  const isSpread = photoCount > 5;
  const w = isSpread ? size * 2 : size;
  const rects = computeRects(tree, 4, 4, w - 8, size - 8, 2);
  return (
    <div style={{ width: w, height: size, background: '#fff', borderRadius: 8, position: 'relative', overflow: 'hidden', border: '1px solid #E0D8D0' }}>
      {rects.map((r, i) => (
        <div key={i} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, background: '#D5D0CA', borderRadius: 2 }} />
      ))}
    </div>
  );
}

/* ── Preview for free-form templates ── */
const MASK_CLIPS = {
  rect: 'none', rounded: 'inset(0 round 8%)',
  circle: 'ellipse(50% 50% at 50% 50%)', arch: 'inset(0 0 0 0 round 50% 50% 0 0)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
};

function TemplatePreview({ template, size = 120 }) {
  const w = size;
  const h = size;
  return (
    <div style={{ width: w, height: h, background: '#fff', borderRadius: 8, position: 'relative', overflow: 'hidden', border: '1px solid #E0D8D0' }}>
      {(template.frames || []).map((f, i) => {
        const clip = MASK_CLIPS[f.mask] || 'none';
        return (
          <div key={i} style={{
            position: 'absolute',
            left: (f.x / 100) * w, top: (f.y / 100) * h,
            width: (f.w / 100) * w, height: (f.h / 100) * h,
            background: '#D5D0CA', borderRadius: f.mask === 'rounded' ? '8%' : 2,
            clipPath: clip !== 'none' ? clip : undefined,
            zIndex: f.zIndex || 0,
          }} />
        );
      })}
    </div>
  );
}

export default function AdminLayouts() {
  const [candidates, setCandidates] = useState([]);
  const [approved, setApproved] = useState([]);
  const [proTemplates, setProTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [tab, setTab] = useState('create');
  const [editingTemplate, setEditingTemplate] = useState(null); // null = new, object = editing

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const [candSnap, apprSnap, proSnap] = await Promise.all([
        getDoc(doc(db, 'settings', 'layout_candidates')),
        getDoc(doc(db, 'settings', 'layout_approved')),
        getDoc(doc(db, 'settings', 'pro_templates')),
      ]);
      if (candSnap.exists()) setCandidates(candSnap.data().items || []);
      if (apprSnap.exists()) setApproved(apprSnap.data().items || []);
      if (proSnap.exists()) setProTemplates(proSnap.data().items || []);
    } catch (e) { console.warn('Failed to load layouts:', e); }
    setLoading(false);
  }

  // ── Binary tree approval actions ──
  async function approveSelected() {
    if (selected.size === 0) return;
    const toApprove = candidates.filter((_, i) => selected.has(i));
    const remaining = candidates.filter((_, i) => !selected.has(i));
    const newApproved = [...approved, ...toApprove];
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'layout_approved'), { items: newApproved, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'settings', 'layout_candidates'), { items: remaining, updatedAt: new Date().toISOString(), totalCount: remaining.length });
      setCandidates(remaining); setApproved(newApproved); setSelected(new Set());
    } catch (e) { alert('Eroare: ' + e.message); }
  }

  async function approveAll() {
    const newApproved = [...approved, ...candidates];
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'layout_approved'), { items: newApproved, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'settings', 'layout_candidates'), { items: [], updatedAt: new Date().toISOString(), totalCount: 0 });
      setApproved(newApproved); setCandidates([]); setSelected(new Set());
    } catch (e) { alert('Eroare: ' + e.message); }
  }

  async function rejectSelected() {
    if (selected.size === 0) return;
    const remaining = candidates.filter((_, i) => !selected.has(i));
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'layout_candidates'), { items: remaining, updatedAt: new Date().toISOString(), totalCount: remaining.length });
      setCandidates(remaining); setSelected(new Set());
    } catch (e) { alert('Eroare: ' + e.message); }
  }

  async function removeApproved(idx) {
    const newApproved = approved.filter((_, i) => i !== idx);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'layout_approved'), { items: newApproved, updatedAt: new Date().toISOString() });
      setApproved(newApproved);
    } catch (e) { alert('Eroare: ' + e.message); }
  }

  // ── Pro template actions ──
  async function deleteProTemplate(id) {
    if (!confirm('Șterge template-ul profesional?')) return;
    const newItems = proTemplates.filter(t => t.id !== id);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'pro_templates'), { items: newItems, updatedAt: new Date().toISOString() });
      setProTemplates(newItems);
    } catch (e) { alert('Eroare: ' + e.message); }
  }

  function toggleSelect(idx) {
    setSelected(prev => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next; });
  }

  // Group candidates by photo count
  const grouped = {};
  candidates.forEach((c, i) => { const key = c.photoCount; if (!grouped[key]) grouped[key] = []; grouped[key].push({ ...c, _idx: i }); });

  // Group pro templates by category
  const proByCategory = {};
  proTemplates.forEach(t => { const cat = t.category || 'clasic'; if (!proByCategory[cat]) proByCategory[cat] = []; proByCategory[cat].push(t); });

  if (loading) return <div className="p-8 text-center text-[#888]">Se încarcă...</div>;

  return (
    <div className="p-6 max-w-[1400px]">
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Colaje</h1>
      <p className="text-sm text-[#888] mb-5">Creează template-uri profesionale sau gestionează layout-urile auto-generate.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F0EDE6] rounded-xl p-1 w-fit">
        {[
          { id: 'create', label: 'Creează colaj' },
          { id: 'templates', label: 'Template-uri PRO', count: proTemplates.length },
          { id: 'auto', label: 'Colaje auto', count: candidates.length + approved.length },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setEditingTemplate(null); }}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              tab === t.id ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#888] hover:text-[#555]'
            }`}>
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-[#3D6B5E]/10 text-[#3D6B5E]' : 'bg-[#E0D8D0] text-[#888]'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ Tab: Create / Edit collage ═══ */}
      {(tab === 'create' || editingTemplate) && (
        <AdminCollageEditor
          editTemplate={editingTemplate}
          onSaved={(tpl) => {
            loadData();
            setEditingTemplate(null);
            setTab('templates');
          }}
          onCancel={editingTemplate ? () => { setEditingTemplate(null); setTab('templates'); } : undefined}
        />
      )}

      {/* ═══ Tab: Pro Templates ═══ */}
      {tab === 'templates' && !editingTemplate && (
        <>
          {proTemplates.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-[#EBEBEB]">
              <span className="text-4xl block mb-3">🎨</span>
              <p className="text-[15px] font-semibold text-[#1A1A1A]">Niciun template profesional</p>
              <p className="text-[13px] text-[#888] mt-1">Creează primul template din tab-ul "Creează colaj".</p>
            </div>
          ) : (
            Object.entries(proByCategory).map(([cat, items]) => (
              <div key={cat} className="mb-8">
                <h3 className="text-sm font-bold text-[#3D6B5E] mb-3 capitalize">{cat} ({items.length})</h3>
                <div className="flex flex-wrap gap-4">
                  {items.map(tpl => (
                    <div key={tpl.id} className="relative bg-white border border-[#EBEBEB] rounded-xl p-2 group cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => { setEditingTemplate(tpl); setTab('create'); }}>
                      <TemplatePreview template={tpl} />
                      <div className="mt-1.5">
                        <p className="text-[11px] font-semibold text-[#1A1A1A] truncate">{tpl.name}</p>
                        <p className="text-[9px] text-[#999]">{tpl.photoCount} poze · {tpl.category}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteProTemplate(tpl.id); }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold hidden group-hover:flex items-center justify-center">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ═══ Tab: Auto layouts (binary tree) ═══ */}
      {tab === 'auto' && !editingTemplate && (
        <>
          {/* Candidates */}
          {candidates.length > 0 && (
            <>
              <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">Candidați ({candidates.length})</h2>
              <div className="flex items-center gap-3 mb-4 p-3 bg-[#F8F6F3] rounded-xl border border-[#E8E4DB]">
                <span className="text-sm text-[#666]">{selected.size} selectate</span>
                <button onClick={approveSelected} disabled={selected.size === 0}
                  className="px-4 py-2 bg-[#3D6B5E] text-white text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-[#2d5445] transition-colors">
                  Aprobă selectate
                </button>
                <button onClick={approveAll}
                  className="px-4 py-2 bg-[#3D6B5E]/10 text-[#3D6B5E] text-xs font-bold rounded-lg hover:bg-[#3D6B5E]/20 transition-colors">
                  Aprobă toate
                </button>
                <button onClick={rejectSelected} disabled={selected.size === 0}
                  className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-red-100 transition-colors">
                  Respinge
                </button>
              </div>
              {Object.entries(grouped).sort(([a], [b]) => a - b).map(([count, items]) => (
                <div key={count} className="mb-6">
                  <h3 className="text-sm font-bold text-[#3D6B5E] mb-2">{count} poze — {items.length} candidați</h3>
                  <div className="flex flex-wrap gap-3">
                    {items.map(item => (
                      <div key={item._idx} onClick={() => toggleSelect(item._idx)}
                        className={`cursor-pointer rounded-xl p-2 transition-all ${selected.has(item._idx) ? 'ring-2 ring-[#3D6B5E] bg-[#3D6B5E]/5' : 'bg-white border border-[#EBEBEB] hover:shadow-md'}`}>
                        <TreeLayoutPreview fingerprint={item.fingerprint} photoCount={item.photoCount} />
                        <p className="text-[9px] text-[#999] mt-1 text-center">{new Date(item.collectedAt).toLocaleDateString('ro-RO')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Approved auto-layouts */}
          {approved.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">Aprobate auto ({approved.length})</h2>
              <div className="flex flex-wrap gap-3">
                {approved.map((item, i) => (
                  <div key={i} className="relative bg-white border border-[#EBEBEB] rounded-xl p-2 group">
                    <TreeLayoutPreview fingerprint={item.fingerprint} photoCount={item.photoCount} />
                    <p className="text-[9px] text-[#999] mt-1 text-center">{item.photoCount}P</p>
                    <button onClick={() => removeApproved(i)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold hidden group-hover:flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {candidates.length === 0 && approved.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-[#EBEBEB]">
              <span className="text-4xl block mb-3">📐</span>
              <p className="text-[15px] font-semibold text-[#1A1A1A]">Niciun layout auto-generat</p>
              <p className="text-[13px] text-[#888] mt-1">Când clienții creează layout-uri unice, vor apărea aici.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
