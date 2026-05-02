# Admin Layout Designer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the team to visually create professional collage layouts in the admin panel and publish them directly to the client-facing layout library.

**Architecture:** A new `AdminLayoutDesigner.jsx` component renders an interactive canvas where the team clicks frames to split them (H/V), drags separators to adjust ratios, and sets orientation hints per frame. The component reuses existing `computeRects`, `computeSeps`, `mkSplit`, `mkLeaf` from `layoutEngine.js`. On publish, it generates a fingerprint via `extractTreeFingerprint`, validates uniqueness via `isNewLayout`, saves to Firestore `settings/layout_approved` with `professional: true`, and calls `reloadApprovedLayouts()` to make it instantly available.

**Tech Stack:** React, Tailwind CSS, existing layoutEngine.js primitives, Firebase Firestore

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/admin/AdminLayoutDesigner.jsx` | CREATE | Visual layout designer — canvas, split/merge, drag separators, orientation picker, publish |
| `src/components/admin/AdminLayouts.jsx` | MODIFY | Add tab navigation (Candidați / Aprobate / Creează) and integrate designer |
| `src/utils/layoutEngine.js` | ALREADY FIXED | Exports `fpToTree`, `reloadApprovedLayouts` — no further changes |
| `src/utils/layoutCollector.js` | ALREADY FIXED | Exports `extractTreeFingerprint`, `isNewLayout` — no further changes |

---

### Task 1: AdminLayoutDesigner — Interactive Canvas Core

**Files:**
- Create: `src/components/admin/AdminLayoutDesigner.jsx`

This is the main component. It renders:
1. A photo count selector (2-10)
2. An interactive canvas showing the current tree as colored rectangles
3. Click a frame → context menu: "Split orizontal" / "Split vertical" / set orientation
4. Drag separators to adjust ratios
5. A "Publică" button that saves to Firestore

- [ ] **Step 1: Create AdminLayoutDesigner.jsx with canvas rendering**

```jsx
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  mkLeaf, mkSplit, getLeaves, computeRects, computeSeps,
  fpToTree, reloadApprovedLayouts,
} from '../../utils/layoutEngine';
import { extractTreeFingerprint, isNewLayout } from '../../utils/layoutCollector';
import { db } from '../../firebase/config';

const ORIENT_COLORS = {
  H: '#4A90D9', // blue — landscape
  V: '#D94A6B', // red — portrait
  S: '#8B8B8B', // gray — square
  A: '#B0A89E', // muted — any
};
const ORIENT_LABELS = { H: 'Landscape', V: 'Portrait', S: 'Pătrat', A: 'Oricare' };
const MIN_RATIO = 0.15;
const MAX_RATIO = 0.85;

export default function AdminLayoutDesigner({ onPublished }) {
  const [photoCount, setPhotoCount] = useState(3);
  const [tree, setTree] = useState(() => mkLeaf('S'));
  const [selectedLeafId, setSelectedLeafId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, leafId }
  const [draggingSep, setDraggingSep] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const canvasRef = useRef(null);

  const CANVAS_W = 600;
  const CANVAS_H = 300;
  const GAP = 4;

  const leafCount = getLeaves(tree).length;
  const rects = computeRects(tree, 0, 0, CANVAS_W, CANVAS_H, GAP);
  const seps = computeSeps(tree, 0, 0, CANVAS_W, CANVAS_H, GAP);

  // Reset tree when photo count changes
  useEffect(() => {
    setTree(mkLeaf('S'));
    setSelectedLeafId(null);
    setContextMenu(null);
    setError(null);
    setSuccess(null);
  }, [photoCount]);

  // ── Split a leaf into two ──
  const splitLeaf = useCallback((leafId, direction) => {
    function walk(node) {
      if (!node) return node;
      if (node.type === 'leaf' && node.id === leafId) {
        return mkSplit(direction, mkLeaf(node.slot), mkLeaf('S'), 0.5);
      }
      if (node.children) {
        return { ...node, children: node.children.map(walk) };
      }
      return node;
    }
    setTree(prev => walk(prev));
    setContextMenu(null);
    setSelectedLeafId(null);
  }, []);

  // ── Set orientation on a leaf ──
  const setOrientation = useCallback((leafId, orient) => {
    function walk(node) {
      if (!node) return node;
      if (node.type === 'leaf' && node.id === leafId) {
        return { ...node, slot: orient };
      }
      if (node.children) {
        return { ...node, children: node.children.map(walk) };
      }
      return node;
    }
    setTree(prev => walk(prev));
  }, []);

  // ── Merge: replace a split node with a single leaf (undo split) ──
  const mergeNode = useCallback((nodeRef) => {
    function walk(node) {
      if (!node) return node;
      if (node === nodeRef && node.children) {
        return mkLeaf('S');
      }
      if (node.children) {
        return { ...node, children: node.children.map(walk) };
      }
      return node;
    }
    setTree(prev => walk(prev));
    setContextMenu(null);
  }, []);

  // ── Drag separator to change ratio ──
  const handleMouseDown = useCallback((sep, e) => {
    e.preventDefault();
    setDraggingSep(sep);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!draggingSep || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const sep = draggingSep;
    let newRatio;
    if (sep.dir === 'col') {
      const localX = e.clientX - rect.left - sep.parentX;
      newRatio = Math.max(MIN_RATIO, Math.min(MAX_RATIO, localX / sep.parentW));
    } else {
      const localY = e.clientY - rect.top - sep.parentY;
      newRatio = Math.max(MIN_RATIO, Math.min(MAX_RATIO, localY / sep.parentH));
    }
    // Update the node's ratio in-place and re-render
    setTree(prev => {
      function walk(node) {
        if (!node) return node;
        if (node === sep.node) return { ...node, ratio: Math.round(newRatio * 1000) / 1000 };
        if (node.children) return { ...node, children: node.children.map(walk) };
        return node;
      }
      return walk(prev);
    });
  }, [draggingSep]);

  const handleMouseUp = useCallback(() => {
    setDraggingSep(null);
  }, []);

  useEffect(() => {
    if (draggingSep) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingSep, handleMouseMove, handleMouseUp]);

  // ── Canvas click — select leaf or show context menu ──
  const handleCanvasClick = useCallback((e) => {
    if (!canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - bounds.left;
    const my = e.clientY - bounds.top;

    // Find which leaf rect was clicked
    for (const r of rects) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        setSelectedLeafId(r.leaf.id);
        setContextMenu(null);
        return;
      }
    }
    setSelectedLeafId(null);
    setContextMenu(null);
  }, [rects]);

  const handleCanvasRightClick = useCallback((e) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - bounds.left;
    const my = e.clientY - bounds.top;

    for (const r of rects) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        setContextMenu({ x: e.clientX - bounds.left, y: e.clientY - bounds.top, leafId: r.leaf.id });
        setSelectedLeafId(r.leaf.id);
        return;
      }
    }
  }, [rects]);

  // ── Validate layout ──
  const validate = useCallback(() => {
    if (leafCount !== photoCount) {
      return `Trebuie exact ${photoCount} frame-uri. Acum ai ${leafCount}. ${leafCount < photoCount ? 'Dă split pe un frame.' : 'Mergi un frame și fă merge.'}`;
    }
    // Check aspect ratios
    for (const r of rects) {
      const ar = Math.max(r.w / r.h, r.h / r.w);
      if (ar > 2.8) {
        return `Un frame are proporție extremă (${ar.toFixed(1)}:1). Ajustează separatoarele.`;
      }
    }
    return null;
  }, [leafCount, photoCount, rects]);

  // ── Publish to Firestore ──
  const handlePublish = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setPublishing(true);
    setError(null);
    setSuccess(null);

    try {
      const fingerprint = extractTreeFingerprint(tree);

      // Check for duplicates
      if (!isNewLayout(fingerprint, photoCount)) {
        setError('Acest layout este prea similar cu unul existent. Modifică-l mai mult.');
        setPublishing(false);
        return;
      }

      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const ref = doc(db, 'settings', 'layout_approved');
      const snap = await getDoc(ref);
      const existing = snap.exists() ? (snap.data().items || []) : [];

      // Check duplicate in approved too
      const isDuplicate = existing.some(e =>
        e.photoCount === photoCount &&
        JSON.stringify(e.fingerprint) === JSON.stringify(fingerprint)
      );
      if (isDuplicate) {
        setError('Acest layout exact există deja în lista aprobată.');
        setPublishing(false);
        return;
      }

      const newItem = {
        photoCount,
        fingerprint,
        professional: true,
        createdAt: new Date().toISOString(),
        createdBy: 'team',
      };

      const newApproved = [...existing, newItem];
      await setDoc(ref, { items: newApproved, updatedAt: new Date().toISOString() });

      // Reload so it's instantly available
      await reloadApprovedLayouts();

      setSuccess(`Layout cu ${photoCount} poze publicat! Acum e disponibil pentru toți clienții.`);
      setTree(mkLeaf('S'));
      setSelectedLeafId(null);

      if (onPublished) onPublished();
    } catch (e) {
      setError('Eroare la publicare: ' + e.message);
    }
    setPublishing(false);
  }, [tree, photoCount, validate, onPublished]);

  const validationError = validate();

  return (
    <div>
      {/* Photo count selector */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm font-semibold text-[#666]">Nr. poze:</span>
        <div className="flex gap-1.5">
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <button key={n} onClick={() => setPhotoCount(n)}
              className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                photoCount === n
                  ? 'bg-[#3D6B5E] text-white shadow-md'
                  : 'bg-white border border-[#E0D8D0] text-[#666] hover:border-[#3D6B5E] hover:text-[#3D6B5E]'
              }`}>
              {n}
            </button>
          ))}
        </div>
        <span className={`text-xs font-semibold ml-2 ${leafCount === photoCount ? 'text-[#3D8B5E]' : 'text-[#B54A3A]'}`}>
          {leafCount}/{photoCount} frame-uri
        </span>
      </div>

      {/* Instructions */}
      <div className="text-xs text-[#888] mb-3 flex items-center gap-4">
        <span>Click stânga = selectează</span>
        <span>Click dreapta = split/merge</span>
        <span>Trage separatoarele = ajustează ratio</span>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative bg-[#F5F1EB] rounded-xl border-2 border-[#E0D8D0] overflow-hidden select-none"
        style={{ width: CANVAS_W, height: CANVAS_H, cursor: draggingSep ? (draggingSep.dir === 'col' ? 'col-resize' : 'row-resize') : 'default' }}
        onClick={handleCanvasClick}
        onContextMenu={handleCanvasRightClick}
      >
        {/* Frame rects */}
        {rects.map((r) => {
          const leaf = r.leaf;
          const isSelected = leaf.id === selectedLeafId;
          const color = ORIENT_COLORS[leaf.slot] || ORIENT_COLORS.A;
          return (
            <div
              key={leaf.id}
              className="absolute flex items-center justify-center transition-all"
              style={{
                left: r.x, top: r.y, width: r.w, height: r.h,
                background: color + '22',
                border: `2px solid ${isSelected ? '#3D6B5E' : color + '66'}`,
                borderRadius: 6,
                boxShadow: isSelected ? '0 0 0 2px #3D6B5E44' : 'none',
              }}
            >
              <div className="text-center pointer-events-none">
                <div className="text-[11px] font-bold" style={{ color }}>{ORIENT_LABELS[leaf.slot]}</div>
                <div className="text-[9px] text-[#999] mt-0.5">{Math.round(r.w)}x{Math.round(r.h)}</div>
              </div>
            </div>
          );
        })}

        {/* Draggable separators */}
        {seps.map((sep, i) => (
          <div
            key={i}
            className="absolute z-10 group"
            style={{
              left: sep.dir === 'col' ? sep.x : sep.x,
              top: sep.dir === 'col' ? sep.y : sep.y,
              width: sep.dir === 'col' ? sep.w : sep.w,
              height: sep.dir === 'col' ? sep.h : sep.h,
              cursor: sep.dir === 'col' ? 'col-resize' : 'row-resize',
            }}
            onMouseDown={(e) => handleMouseDown(sep, e)}
          >
            <div className={`absolute ${
              sep.dir === 'col'
                ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-[#B0A89E] group-hover:bg-[#3D6B5E] group-hover:w-1.5 transition-all'
                : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-8 rounded-full bg-[#B0A89E] group-hover:bg-[#3D6B5E] group-hover:h-1.5 transition-all'
            }`} />
          </div>
        ))}

        {/* Context menu */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setContextMenu(null)} />
            <div className="absolute z-30 bg-white rounded-xl shadow-xl border border-[#E5E5EA] py-1 min-w-[160px]"
              style={{ left: Math.min(contextMenu.x, CANVAS_W - 170), top: Math.min(contextMenu.y, CANVAS_H - 200) }}>

              {leafCount < photoCount && (
                <>
                  <button onClick={() => splitLeaf(contextMenu.leafId, 'col')}
                    className="w-full text-left px-3 py-2 text-[12px] text-[#1C1C1E] hover:bg-[#F2F2F7] flex items-center gap-2">
                    <span className="text-[#4A90D9]">┃</span> Split vertical
                  </button>
                  <button onClick={() => splitLeaf(contextMenu.leafId, 'row')}
                    className="w-full text-left px-3 py-2 text-[12px] text-[#1C1C1E] hover:bg-[#F2F2F7] flex items-center gap-2">
                    <span className="text-[#D94A6B]">━</span> Split orizontal
                  </button>
                  <div className="border-t border-[#E5E5EA] my-1" />
                </>
              )}

              <div className="px-3 py-1 text-[10px] text-[#999] uppercase font-semibold">Orientare frame</div>
              {['V', 'H', 'S', 'A'].map(o => (
                <button key={o} onClick={() => { setOrientation(contextMenu.leafId, o); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#F2F2F7] flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: ORIENT_COLORS[o] }} />
                  {ORIENT_LABELS[o]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Orientation legend + selected frame controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3">
          {Object.entries(ORIENT_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ORIENT_COLORS[key] }} />
              <span className="text-[10px] text-[#888]">{label}</span>
            </div>
          ))}
        </div>

        {/* Selected frame quick controls */}
        {selectedLeafId && leafCount < photoCount && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#888]">Split rapid:</span>
            <button onClick={() => splitLeaf(selectedLeafId, 'col')}
              className="px-2 py-1 text-[11px] bg-[#4A90D9]/10 text-[#4A90D9] font-semibold rounded-md hover:bg-[#4A90D9]/20 transition">
              ┃ Vertical
            </button>
            <button onClick={() => splitLeaf(selectedLeafId, 'row')}
              className="px-2 py-1 text-[11px] bg-[#D94A6B]/10 text-[#D94A6B] font-semibold rounded-md hover:bg-[#D94A6B]/20 transition">
              ━ Orizontal
            </button>
          </div>
        )}
      </div>

      {/* Error / Success messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>
      )}

      {/* Publish bar */}
      <div className="flex items-center justify-between mt-5 p-4 bg-[#F8F6F3] rounded-xl border border-[#E8E4DB]">
        <div>
          <span className="text-sm font-semibold text-[#1A1A1A]">
            {leafCount === photoCount
              ? `Layout gata — ${photoCount} frame-uri`
              : `${leafCount}/${photoCount} frame-uri — ${leafCount < photoCount ? 'mai dă split' : 'prea multe, fă merge'}`
            }
          </span>
          {validationError && <p className="text-[11px] text-[#B54A3A] mt-0.5">{validationError}</p>}
        </div>
        <button
          onClick={handlePublish}
          disabled={!!validationError || publishing}
          className="px-6 py-2.5 bg-[#3D6B5E] text-white text-sm font-bold rounded-lg disabled:opacity-30 hover:bg-[#2d5445] transition-colors"
        >
          {publishing ? 'Se publică...' : 'Publică layout'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `head -5 src/components/admin/AdminLayoutDesigner.jsx`
Expected: Sees the import statement at top

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminLayoutDesigner.jsx
git commit -m "feat: add AdminLayoutDesigner component — visual layout builder for team"
```

---

### Task 2: Integrate Designer into AdminLayouts with Tabs

**Files:**
- Modify: `src/components/admin/AdminLayouts.jsx`

Replace the flat layout with a 3-tab view: "Candidați" (existing approval flow), "Aprobate" (existing approved list), "Creează" (new designer).

- [ ] **Step 1: Add import and tab state to AdminLayouts**

At top of file, add import:
```jsx
import AdminLayoutDesigner from './AdminLayoutDesigner';
```

Replace the component body — wrap existing content in tabs. Replace the full `return (...)` block (lines 124-191) with:

```jsx
  const [tab, setTab] = useState('approved');

  // Professional layouts count
  const proCount = approved.filter(a => a.professional).length;
  const clientCount = approved.filter(a => !a.professional).length;

  return (
    <div className="p-6 max-w-[1200px]">
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Colaje</h1>
      <p className="text-sm text-[#888] mb-5">Creează layout-uri profesionale sau aprobă cele colectate de la clienți.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F0EDE6] rounded-xl p-1 w-fit">
        {[
          { id: 'create', label: 'Creează layout', count: null },
          { id: 'approved', label: 'Aprobate', count: approved.length },
          { id: 'candidates', label: 'Candidați', count: candidates.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              tab === t.id
                ? 'bg-white text-[#1A1A1A] shadow-sm'
                : 'text-[#888] hover:text-[#555]'
            }`}>
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-[#3D6B5E]/10 text-[#3D6B5E]' : 'bg-[#E0D8D0] text-[#888]'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Create */}
      {tab === 'create' && (
        <AdminLayoutDesigner onPublished={() => { loadData(); setTab('approved'); }} />
      )}

      {/* Tab: Approved */}
      {tab === 'approved' && (
        <>
          {approved.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-[#EBEBEB]">
              <span className="text-4xl block mb-3">📐</span>
              <p className="text-[15px] font-semibold text-[#1A1A1A]">Niciun layout aprobat</p>
              <p className="text-[13px] text-[#888] mt-1">Creează primul layout sau aprobă din candidați.</p>
            </div>
          ) : (
            <>
              {/* Professional layouts */}
              {proCount > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-[#3D6B5E] mb-3">Profesionale ({proCount})</h3>
                  <p className="text-[11px] text-[#888] mb-3">Create de echipă — prioritate maximă pentru clienți noi.</p>
                  <div className="flex flex-wrap gap-4">
                    {approved.map((item, i) => item.professional && (
                      <div key={i} className="relative bg-white border-2 border-[#3D6B5E]/20 rounded-xl p-2 group">
                        <LayoutPreview fingerprint={item.fingerprint} photoCount={item.photoCount} />
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[9px] text-[#3D6B5E] font-semibold">{item.photoCount}P PRO</p>
                          <p className="text-[9px] text-[#999]">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('ro-RO') : ''}</p>
                        </div>
                        <button onClick={() => removeApproved(i)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold hidden group-hover:flex items-center justify-center">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Client-sourced layouts */}
              {clientCount > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-[#888] mb-3">De la clienți ({clientCount})</h3>
                  <div className="flex flex-wrap gap-4">
                    {approved.map((item, i) => !item.professional && (
                      <div key={i} className="relative bg-white border border-[#EBEBEB] rounded-xl p-2 group">
                        <LayoutPreview fingerprint={item.fingerprint} photoCount={item.photoCount} />
                        <p className="text-[9px] text-[#999] mt-1 text-center">{item.photoCount}P</p>
                        <button onClick={() => removeApproved(i)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold hidden group-hover:flex items-center justify-center">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Tab: Candidates */}
      {tab === 'candidates' && (
        <>
          {/* Action bar */}
          {candidates.length > 0 && (
            <div className="flex items-center gap-3 mb-6 p-3 bg-[#F8F6F3] rounded-xl border border-[#E8E4DB]">
              <span className="text-sm text-[#666]">{selected.size} selectate din {candidates.length}</span>
              <button onClick={approveSelected} disabled={selected.size === 0}
                className="px-4 py-2 bg-[#3D6B5E] text-white text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-[#2d5445] transition-colors">
                Aprobă selectate
              </button>
              <button onClick={approveAll}
                className="px-4 py-2 bg-[#3D6B5E]/10 text-[#3D6B5E] text-xs font-bold rounded-lg hover:bg-[#3D6B5E]/20 transition-colors">
                Aprobă toate ({candidates.length})
              </button>
              <button onClick={rejectSelected} disabled={selected.size === 0}
                className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-red-100 transition-colors">
                Respinge selectate
              </button>
            </div>
          )}

          {candidates.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-[#EBEBEB]">
              <span className="text-4xl block mb-3">📐</span>
              <p className="text-[15px] font-semibold text-[#1A1A1A]">Niciun layout nou de aprobat</p>
              <p className="text-[13px] text-[#888] mt-1">Când clienții creează layout-uri unice, vor apărea aici.</p>
            </div>
          ) : (
            Object.entries(grouped).sort(([a], [b]) => a - b).map(([count, items]) => (
              <div key={count} className="mb-8">
                <h3 className="text-sm font-bold text-[#3D6B5E] mb-3">{count} poze — {items.length} candidați noi</h3>
                <div className="flex flex-wrap gap-4">
                  {items.map((item) => (
                    <div key={item._idx}
                      onClick={() => toggleSelect(item._idx)}
                      className={`cursor-pointer rounded-xl p-2 transition-all ${selected.has(item._idx) ? 'ring-2 ring-[#3D6B5E] bg-[#3D6B5E]/5' : 'bg-white border border-[#EBEBEB] hover:shadow-md'}`}>
                      <LayoutPreview fingerprint={item.fingerprint} photoCount={item.photoCount} />
                      <p className="text-[9px] text-[#999] mt-1 text-center">{new Date(item.collectedAt).toLocaleDateString('ro-RO')}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
```

- [ ] **Step 2: Add `tab` state declaration after existing state**

Insert `const [tab, setTab] = useState('approved');` inside the component, after line 38 (`const [selected, setSelected]`).

- [ ] **Step 3: Verify build compiles**

Run: `npx vite build --logLevel error`
Expected: No output (clean build)

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminLayouts.jsx
git commit -m "feat: add tab navigation to AdminLayouts — integrate layout designer"
```

---

### Task 3: Prioritize Professional Layouts in getAllGenerators

**Files:**
- Modify: `src/utils/layoutEngine.js:419-423`

Professional layouts should appear BEFORE client-approved ones in the generator list. This means `smartBuildTree` will naturally score them alongside hardcoded ones.

- [ ] **Step 1: Update loadApprovedLayouts to separate professional vs client**

Replace the `loadApprovedLayouts` function (lines 397-414) with:

```javascript
export async function loadApprovedLayouts() {
  if (_approvedLoaded) return;
  try {
    const { db } = await import('../firebase/config');
    if (!db) return;
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'settings', 'layout_approved'));
    if (snap.exists() && snap.data().items) {
      // Professional layouts first, then client-sourced
      const items = snap.data().items;
      const professional = items.filter(i => i.professional);
      const clientSourced = items.filter(i => !i.professional);
      for (const item of [...professional, ...clientSourced]) {
        const n = item.photoCount;
        if (!_approvedGenerators[n]) _approvedGenerators[n] = [];
        const fp = item.fingerprint;
        _approvedGenerators[n].push(() => fpToTree(fp));
      }
      _approvedLoaded = true;
    }
  } catch {}
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx vite build --logLevel error`
Expected: No output (clean build)

- [ ] **Step 3: Commit**

```bash
git add src/utils/layoutEngine.js
git commit -m "feat: prioritize professional layouts in generator order"
```

---

### Task 4: Visual Validation — End-to-End Smoke Test

**Files:** No changes — manual verification

- [ ] **Step 1: Start dev server**

Run: `npx vite dev`

- [ ] **Step 2: Open admin panel in browser**

Navigate to: `http://localhost:5173/admin_panel/layouts`
Expected: See 3 tabs — "Creează layout", "Aprobate", "Candidați"

- [ ] **Step 3: Test layout designer**

1. Click "Creează layout" tab
2. Select "4" in photo count selector → shows "1/4 frame-uri"
3. Right-click the single frame → see context menu with "Split vertical" / "Split orizontal"
4. Click "Split vertical" → now 2 frames, counter shows "2/4"
5. Right-click left frame → "Split orizontal" → 3 frames
6. Right-click any remaining large frame → split → 4 frames, counter shows "4/4"
7. Drag a separator → ratio changes visually
8. Right-click a frame → change orientation (should change color)
9. Click "Publică layout" → should save and switch to "Aprobate" tab
10. New layout should appear with "PRO" badge

- [ ] **Step 4: Verify layout appears in editor**

1. Open editor in a new tab
2. Upload 4 photos
3. Cycle through layouts (arrow buttons) → should eventually reach the new professional layout

- [ ] **Step 5: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: address issues found in smoke test"
```

---

## Integration Verification Checklist

- [ ] `smartBuildTree()` uses `getAllGenerators()` → professional layouts are scored for auto-selection
- [ ] `buildTree(n, vi)` uses `getAllGenerators()` → professional layouts reachable by cycling
- [ ] `cyclePageLayout()` calls `buildTree()` → professional layouts accessible via cycle arrows
- [ ] `extractTreeFingerprint()` is exported → designer can generate fingerprints
- [ ] `isNewLayout()` is exported → designer validates uniqueness before publish
- [ ] `reloadApprovedLayouts()` clears cache → new layouts instantly available
- [ ] `fpToTree()` is exported → AdminLayouts preview can render any fingerprint
- [ ] `loadApprovedLayouts()` prioritizes professional → team layouts appear first
- [ ] `collectLayouts()` deduplicates against approved → client won't re-collect a professional layout as candidate
- [ ] Firestore structure `{ items: [..., { photoCount, fingerprint, professional, createdBy, createdAt }] }` is backwards compatible
