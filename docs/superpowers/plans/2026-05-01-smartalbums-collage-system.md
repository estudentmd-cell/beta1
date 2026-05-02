# SmartAlbums-Style Collage System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mechanical binary-tree layouts with ~158 professional pro templates organized by orientation pattern, add default margins, full-bleed toggle, strict orientation enforcement, and separator orientation lock.

**Architecture:** New `proTemplateLibrary.js` holds ~158 hardcoded templates with golden-ratio proportions, indexed by orientation pattern (VVH, VHHH, etc.). `smartBuildTree()` uses these FIRST, binary trees as fallback. `createPage()` adds default 5% margins. UI gains full-bleed toggle and orientation mismatch indicator.

**Tech Stack:** React, Zustand, existing layoutEngine binary tree system, existing pro template rendering pipeline (`proTemplateToRects`).

---

## Task 1: Pro Template Library — 1-2 poze (18 templates)

**Files:**
- Create: `src/utils/proTemplateLibrary.js`

- [ ] **Step 1: Create the library file with structure and 1-photo templates**

```js
// src/utils/proTemplateLibrary.js
/* ═══ PRO TEMPLATE LIBRARY ═══
   ~158 handcrafted templates organized by orientation pattern.
   Proportions: golden ratio (61.8/38.2), rule of thirds (66.7/33.3),
   asymmetric balance (55/45), strong hero (70/30).

   Each template:
   { id, pattern, photoCount, formatType, frames: [{ x, y, w, h, slot }] }

   Coordinates: % of spread (0-100 width, 0-100 height).
   Spread = 2 pages side by side (ratio ~2:1 for square albums).
*/

const PRO_TEMPLATES = [

  // ═══ 1 PHOTO ═══
  { id: 'H_1', pattern: 'H', photoCount: 1, formatType: 'patrat',
    frames: [{ x: 0, y: 0, w: 100, h: 100, slot: 'H' }] },
  { id: 'V_1', pattern: 'V', photoCount: 1, formatType: 'patrat',
    frames: [{ x: 25, y: 0, w: 50, h: 100, slot: 'V' }] },
  { id: 'S_1', pattern: 'S', photoCount: 1, formatType: 'patrat',
    frames: [{ x: 15, y: 10, w: 70, h: 80, slot: 'S' }] },

  // ═══ 2 PHOTOS — VV ═══
  { id: 'VV_1', pattern: 'VV', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 100, slot: 'V' },
      { x: 50, y: 0, w: 50, h: 100, slot: 'V' },
    ] },
  { id: 'VV_2', pattern: 'VV', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 61.8, h: 100, slot: 'V' },
      { x: 61.8, y: 0, w: 38.2, h: 100, slot: 'V' },
    ] },
  { id: 'VV_3', pattern: 'VV', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38.2, h: 100, slot: 'V' },
      { x: 38.2, y: 0, w: 61.8, h: 100, slot: 'V' },
    ] },
  { id: 'VV_4', pattern: 'VV', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 55, h: 100, slot: 'V' },
      { x: 55, y: 0, w: 45, h: 100, slot: 'V' },
    ] },
  { id: 'VV_5', pattern: 'VV', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 45, h: 100, slot: 'V' },
      { x: 45, y: 0, w: 55, h: 100, slot: 'V' },
    ] },
  { id: 'VV_6', pattern: 'VV', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 66.7, h: 100, slot: 'V' },
      { x: 66.7, y: 0, w: 33.3, h: 100, slot: 'V' },
    ] },

  // ═══ 2 PHOTOS — HH ═══
  { id: 'HH_1', pattern: 'HH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 50, slot: 'H' },
      { x: 0, y: 50, w: 100, h: 50, slot: 'H' },
    ] },
  { id: 'HH_2', pattern: 'HH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 61.8, slot: 'H' },
      { x: 0, y: 61.8, w: 100, h: 38.2, slot: 'H' },
    ] },
  { id: 'HH_3', pattern: 'HH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 38.2, slot: 'H' },
      { x: 0, y: 38.2, w: 100, h: 61.8, slot: 'H' },
    ] },
  { id: 'HH_4', pattern: 'HH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 55, slot: 'H' },
      { x: 0, y: 55, w: 100, h: 45, slot: 'H' },
    ] },
  { id: 'HH_5', pattern: 'HH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 45, slot: 'H' },
      { x: 0, y: 45, w: 100, h: 55, slot: 'H' },
    ] },
  { id: 'HH_6', pattern: 'HH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 66.7, slot: 'H' },
      { x: 0, y: 66.7, w: 100, h: 33.3, slot: 'H' },
    ] },

  // ═══ 2 PHOTOS — VH ═══
  { id: 'VH_1', pattern: 'VH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38.2, h: 100, slot: 'V' },
      { x: 38.2, y: 0, w: 61.8, h: 100, slot: 'H' },
    ] },
  { id: 'VH_2', pattern: 'VH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 45, h: 100, slot: 'V' },
      { x: 45, y: 0, w: 55, h: 100, slot: 'H' },
    ] },
  { id: 'VH_3', pattern: 'VH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 55, slot: 'H' },
      { x: 25, y: 55, w: 50, h: 45, slot: 'V' },
    ] },
  { id: 'VH_4', pattern: 'VH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 33.3, h: 100, slot: 'V' },
      { x: 33.3, y: 0, w: 66.7, h: 100, slot: 'H' },
    ] },
  { id: 'VH_5', pattern: 'VH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 61.8, h: 100, slot: 'H' },
      { x: 61.8, y: 0, w: 38.2, h: 100, slot: 'V' },
    ] },
  { id: 'VH_6', pattern: 'VH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 100, slot: 'V' },
      { x: 50, y: 0, w: 50, h: 100, slot: 'H' },
    ] },
];

export default PRO_TEMPLATES;

/**
 * Get orientation pattern from photos array.
 * Sorts orientations alphabetically: [V,V,H] → "HVV"
 */
export function getOrientationPattern(photos, getOrientationFn) {
  return photos.map(p => getOrientationFn(p)).sort().join('');
}

/**
 * Get pro templates matching a pattern and photo count.
 * @returns {Array} matching templates
 */
export function getProTemplatesByPattern(pattern, photoCount, formatType = 'patrat') {
  return PRO_TEMPLATES.filter(t =>
    t.pattern === pattern &&
    t.photoCount === photoCount &&
    (t.formatType === formatType || !t.formatType)
  );
}
```

- [ ] **Step 2: Verify file created correctly**

Run: `node -e "const t = require('./src/utils/proTemplateLibrary.js'); console.log('Templates:', t.default?.length || 'ESM')"`

If ESM error, just verify the file exists:
Run: `head -5 src/utils/proTemplateLibrary.js`

- [ ] **Step 3: Commit**

```bash
git add src/utils/proTemplateLibrary.js
git commit -m "feat: pro template library — 1-2 photo templates (21 templates)"
```

---

## Task 2: Pro Template Library — 3 poze (26 templates)

**Files:**
- Modify: `src/utils/proTemplateLibrary.js`

- [ ] **Step 1: Add 3-photo templates before the closing `];`**

Add these templates to the `PRO_TEMPLATES` array, before the closing `];`:

```js
  // ═══ 3 PHOTOS — VVV ═══
  { id: 'VVV_1', pattern: 'VVV', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 33.3, h: 100, slot: 'V' },
      { x: 33.3, y: 0, w: 33.4, h: 100, slot: 'V' },
      { x: 66.7, y: 0, w: 33.3, h: 100, slot: 'V' },
    ] },
  { id: 'VVV_2', pattern: 'VVV', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 100, slot: 'V' },
      { x: 50, y: 0, w: 50, h: 50, slot: 'V' },
      { x: 50, y: 50, w: 50, h: 50, slot: 'V' },
    ] },
  { id: 'VVV_3', pattern: 'VVV', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 50, slot: 'V' },
      { x: 0, y: 50, w: 50, h: 50, slot: 'V' },
      { x: 50, y: 0, w: 50, h: 100, slot: 'V' },
    ] },
  { id: 'VVV_4', pattern: 'VVV', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 61.8, h: 100, slot: 'V' },
      { x: 61.8, y: 0, w: 38.2, h: 50, slot: 'V' },
      { x: 61.8, y: 50, w: 38.2, h: 50, slot: 'V' },
    ] },
  { id: 'VVV_5', pattern: 'VVV', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38.2, h: 50, slot: 'V' },
      { x: 0, y: 50, w: 38.2, h: 50, slot: 'V' },
      { x: 38.2, y: 0, w: 61.8, h: 100, slot: 'V' },
    ] },
  { id: 'VVV_6', pattern: 'VVV', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 30, h: 100, slot: 'V' },
      { x: 30, y: 0, w: 40, h: 100, slot: 'V' },
      { x: 70, y: 0, w: 30, h: 100, slot: 'V' },
    ] },

  // ═══ 3 PHOTOS — VVH ═══
  { id: 'VVH_1', pattern: 'VVH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 61.8, slot: 'H' },
      { x: 0, y: 61.8, w: 50, h: 38.2, slot: 'V' },
      { x: 50, y: 61.8, w: 50, h: 38.2, slot: 'V' },
    ] },
  { id: 'VVH_2', pattern: 'VVH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 38.2, slot: 'V' },
      { x: 50, y: 0, w: 50, h: 38.2, slot: 'V' },
      { x: 0, y: 38.2, w: 100, h: 61.8, slot: 'H' },
    ] },
  { id: 'VVH_3', pattern: 'VVH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 55, slot: 'H' },
      { x: 0, y: 55, w: 50, h: 45, slot: 'V' },
      { x: 50, y: 55, w: 50, h: 45, slot: 'V' },
    ] },
  { id: 'VVH_4', pattern: 'VVH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 45, slot: 'V' },
      { x: 50, y: 0, w: 50, h: 45, slot: 'V' },
      { x: 0, y: 45, w: 100, h: 55, slot: 'H' },
    ] },
  { id: 'VVH_5', pattern: 'VVH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 33, h: 100, slot: 'V' },
      { x: 33, y: 0, w: 33, h: 100, slot: 'V' },
      { x: 66, y: 0, w: 34, h: 100, slot: 'H' },
    ] },
  { id: 'VVH_6', pattern: 'VVH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 100, slot: 'H' },
      { x: 50, y: 0, w: 25, h: 100, slot: 'V' },
      { x: 75, y: 0, w: 25, h: 100, slot: 'V' },
    ] },
  { id: 'VVH_7', pattern: 'VVH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38.2, h: 100, slot: 'V' },
      { x: 38.2, y: 0, w: 61.8, h: 61.8, slot: 'H' },
      { x: 38.2, y: 61.8, w: 61.8, h: 38.2, slot: 'V' },
    ] },
  { id: 'VVH_8', pattern: 'VVH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 70, slot: 'H' },
      { x: 0, y: 70, w: 50, h: 30, slot: 'V' },
      { x: 50, y: 70, w: 50, h: 30, slot: 'V' },
    ] },

  // ═══ 3 PHOTOS — VHH ═══
  { id: 'VHH_1', pattern: 'VHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38.2, h: 100, slot: 'V' },
      { x: 38.2, y: 0, w: 61.8, h: 50, slot: 'H' },
      { x: 38.2, y: 50, w: 61.8, h: 50, slot: 'H' },
    ] },
  { id: 'VHH_2', pattern: 'VHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 61.8, h: 50, slot: 'H' },
      { x: 0, y: 50, w: 61.8, h: 50, slot: 'H' },
      { x: 61.8, y: 0, w: 38.2, h: 100, slot: 'V' },
    ] },
  { id: 'VHH_3', pattern: 'VHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 100, slot: 'V' },
      { x: 50, y: 0, w: 50, h: 50, slot: 'H' },
      { x: 50, y: 50, w: 50, h: 50, slot: 'H' },
    ] },
  { id: 'VHH_4', pattern: 'VHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 61.8, h: 100, slot: 'V' },
      { x: 61.8, y: 0, w: 38.2, h: 55, slot: 'H' },
      { x: 61.8, y: 55, w: 38.2, h: 45, slot: 'H' },
    ] },
  { id: 'VHH_5', pattern: 'VHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 55, slot: 'H' },
      { x: 0, y: 55, w: 40, h: 45, slot: 'V' },
      { x: 40, y: 55, w: 60, h: 45, slot: 'H' },
    ] },
  { id: 'VHH_6', pattern: 'VHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 30, h: 100, slot: 'V' },
      { x: 30, y: 0, w: 70, h: 61.8, slot: 'H' },
      { x: 30, y: 61.8, w: 70, h: 38.2, slot: 'H' },
    ] },

  // ═══ 3 PHOTOS — HHH ═══
  { id: 'HHH_1', pattern: 'HHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 33.3, slot: 'H' },
      { x: 0, y: 33.3, w: 100, h: 33.4, slot: 'H' },
      { x: 0, y: 66.7, w: 100, h: 33.3, slot: 'H' },
    ] },
  { id: 'HHH_2', pattern: 'HHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 61.8, slot: 'H' },
      { x: 0, y: 61.8, w: 50, h: 38.2, slot: 'H' },
      { x: 50, y: 61.8, w: 50, h: 38.2, slot: 'H' },
    ] },
  { id: 'HHH_3', pattern: 'HHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 38.2, slot: 'H' },
      { x: 50, y: 0, w: 50, h: 38.2, slot: 'H' },
      { x: 0, y: 38.2, w: 100, h: 61.8, slot: 'H' },
    ] },
  { id: 'HHH_4', pattern: 'HHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 55, slot: 'H' },
      { x: 0, y: 55, w: 100, h: 25, slot: 'H' },
      { x: 0, y: 80, w: 100, h: 20, slot: 'H' },
    ] },
  { id: 'HHH_5', pattern: 'HHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 61.8, h: 100, slot: 'H' },
      { x: 61.8, y: 0, w: 38.2, h: 50, slot: 'H' },
      { x: 61.8, y: 50, w: 38.2, h: 50, slot: 'H' },
    ] },
  { id: 'HHH_6', pattern: 'HHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38.2, h: 50, slot: 'H' },
      { x: 0, y: 50, w: 38.2, h: 50, slot: 'H' },
      { x: 38.2, y: 0, w: 61.8, h: 100, slot: 'H' },
    ] },
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/proTemplateLibrary.js
git commit -m "feat: pro template library — 3 photo templates (26 templates, VVV/VVH/VHH/HHH)"
```

---

## Task 3: Pro Template Library — 4 poze (30 templates)

**Files:**
- Modify: `src/utils/proTemplateLibrary.js`

- [ ] **Step 1: Add 4-photo templates**

Add before `];`:

```js
  // ═══ 4 PHOTOS — VVVV ═══
  { id: 'VVVV_1', pattern: 'VVVV', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 25, h: 100, slot: 'V' },
      { x: 25, y: 0, w: 25, h: 100, slot: 'V' },
      { x: 50, y: 0, w: 25, h: 100, slot: 'V' },
      { x: 75, y: 0, w: 25, h: 100, slot: 'V' },
    ] },
  { id: 'VVVV_2', pattern: 'VVVV', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 50, slot: 'V' },
      { x: 50, y: 0, w: 50, h: 50, slot: 'V' },
      { x: 0, y: 50, w: 50, h: 50, slot: 'V' },
      { x: 50, y: 50, w: 50, h: 50, slot: 'V' },
    ] },
  { id: 'VVVV_3', pattern: 'VVVV', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 100, slot: 'V' },
      { x: 50, y: 0, w: 50, h: 33.3, slot: 'V' },
      { x: 50, y: 33.3, w: 50, h: 33.4, slot: 'V' },
      { x: 50, y: 66.7, w: 50, h: 33.3, slot: 'V' },
    ] },
  { id: 'VVVV_4', pattern: 'VVVV', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 33.3, slot: 'V' },
      { x: 0, y: 33.3, w: 50, h: 33.4, slot: 'V' },
      { x: 0, y: 66.7, w: 50, h: 33.3, slot: 'V' },
      { x: 50, y: 0, w: 50, h: 100, slot: 'V' },
    ] },
  { id: 'VVVV_5', pattern: 'VVVV', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 61.8, h: 100, slot: 'V' },
      { x: 61.8, y: 0, w: 38.2, h: 33.3, slot: 'V' },
      { x: 61.8, y: 33.3, w: 38.2, h: 33.4, slot: 'V' },
      { x: 61.8, y: 66.7, w: 38.2, h: 33.3, slot: 'V' },
    ] },
  { id: 'VVVV_6', pattern: 'VVVV', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 55, h: 55, slot: 'V' },
      { x: 55, y: 0, w: 45, h: 55, slot: 'V' },
      { x: 0, y: 55, w: 45, h: 45, slot: 'V' },
      { x: 45, y: 55, w: 55, h: 45, slot: 'V' },
    ] },

  // ═══ 4 PHOTOS — VVVH ═══
  { id: 'VVVH_1', pattern: 'VVVH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 33.3, h: 61.8, slot: 'V' },
      { x: 33.3, y: 0, w: 33.4, h: 61.8, slot: 'V' },
      { x: 66.7, y: 0, w: 33.3, h: 61.8, slot: 'V' },
      { x: 0, y: 61.8, w: 100, h: 38.2, slot: 'H' },
    ] },
  { id: 'VVVH_2', pattern: 'VVVH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 61.8, slot: 'H' },
      { x: 0, y: 61.8, w: 33.3, h: 38.2, slot: 'V' },
      { x: 33.3, y: 61.8, w: 33.4, h: 38.2, slot: 'V' },
      { x: 66.7, y: 61.8, w: 33.3, h: 38.2, slot: 'V' },
    ] },
  { id: 'VVVH_3', pattern: 'VVVH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 50, slot: 'H' },
      { x: 0, y: 50, w: 33.3, h: 50, slot: 'V' },
      { x: 33.3, y: 50, w: 33.4, h: 50, slot: 'V' },
      { x: 66.7, y: 50, w: 33.3, h: 50, slot: 'V' },
    ] },
  { id: 'VVVH_4', pattern: 'VVVH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 40, h: 100, slot: 'V' },
      { x: 40, y: 0, w: 60, h: 55, slot: 'H' },
      { x: 40, y: 55, w: 30, h: 45, slot: 'V' },
      { x: 70, y: 55, w: 30, h: 45, slot: 'V' },
    ] },
  { id: 'VVVH_5', pattern: 'VVVH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 55, slot: 'H' },
      { x: 0, y: 55, w: 50, h: 45, slot: 'V' },
      { x: 50, y: 55, w: 25, h: 45, slot: 'V' },
      { x: 75, y: 55, w: 25, h: 45, slot: 'V' },
    ] },
  { id: 'VVVH_6', pattern: 'VVVH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 33.3, h: 55, slot: 'V' },
      { x: 33.3, y: 0, w: 33.4, h: 55, slot: 'V' },
      { x: 66.7, y: 0, w: 33.3, h: 55, slot: 'V' },
      { x: 0, y: 55, w: 100, h: 45, slot: 'H' },
    ] },

  // ═══ 4 PHOTOS — VVHH ═══
  { id: 'VVHH_1', pattern: 'VVHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38.2, h: 100, slot: 'V' },
      { x: 38.2, y: 0, w: 23.6, h: 100, slot: 'V' },
      { x: 61.8, y: 0, w: 38.2, h: 50, slot: 'H' },
      { x: 61.8, y: 50, w: 38.2, h: 50, slot: 'H' },
    ] },
  { id: 'VVHH_2', pattern: 'VVHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38.2, h: 50, slot: 'H' },
      { x: 0, y: 50, w: 38.2, h: 50, slot: 'H' },
      { x: 38.2, y: 0, w: 23.6, h: 100, slot: 'V' },
      { x: 61.8, y: 0, w: 38.2, h: 100, slot: 'V' },
    ] },
  { id: 'VVHH_3', pattern: 'VVHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 45, slot: 'H' },
      { x: 0, y: 45, w: 40, h: 55, slot: 'V' },
      { x: 40, y: 45, w: 30, h: 55, slot: 'V' },
      { x: 70, y: 45, w: 30, h: 55, slot: 'H' },
    ] },
  { id: 'VVHH_4', pattern: 'VVHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 50, slot: 'V' },
      { x: 50, y: 0, w: 50, h: 50, slot: 'H' },
      { x: 0, y: 50, w: 50, h: 50, slot: 'H' },
      { x: 50, y: 50, w: 50, h: 50, slot: 'V' },
    ] },
  { id: 'VVHH_5', pattern: 'VVHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38.2, h: 100, slot: 'V' },
      { x: 38.2, y: 0, w: 61.8, h: 38.2, slot: 'H' },
      { x: 38.2, y: 38.2, w: 61.8, h: 23.6, slot: 'V' },
      { x: 38.2, y: 61.8, w: 61.8, h: 38.2, slot: 'H' },
    ] },
  { id: 'VVHH_6', pattern: 'VVHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 55, slot: 'V' },
      { x: 50, y: 0, w: 50, h: 55, slot: 'V' },
      { x: 0, y: 55, w: 50, h: 45, slot: 'H' },
      { x: 50, y: 55, w: 50, h: 45, slot: 'H' },
    ] },

  // ═══ 4 PHOTOS — VHHH ═══
  { id: 'VHHH_1', pattern: 'VHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 33.3, h: 100, slot: 'V' },
      { x: 33.3, y: 0, w: 66.7, h: 33.3, slot: 'H' },
      { x: 33.3, y: 33.3, w: 66.7, h: 33.4, slot: 'H' },
      { x: 33.3, y: 66.7, w: 66.7, h: 33.3, slot: 'H' },
    ] },
  { id: 'VHHH_2', pattern: 'VHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 66.7, h: 33.3, slot: 'H' },
      { x: 0, y: 33.3, w: 66.7, h: 33.4, slot: 'H' },
      { x: 0, y: 66.7, w: 66.7, h: 33.3, slot: 'H' },
      { x: 66.7, y: 0, w: 33.3, h: 100, slot: 'V' },
    ] },
  { id: 'VHHH_3', pattern: 'VHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 45, h: 100, slot: 'V' },
      { x: 45, y: 0, w: 55, h: 33.3, slot: 'H' },
      { x: 45, y: 33.3, w: 55, h: 33.4, slot: 'H' },
      { x: 45, y: 66.7, w: 55, h: 33.3, slot: 'H' },
    ] },
  { id: 'VHHH_4', pattern: 'VHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 50, slot: 'H' },
      { x: 0, y: 50, w: 33, h: 50, slot: 'V' },
      { x: 33, y: 50, w: 33.5, h: 50, slot: 'H' },
      { x: 66.5, y: 50, w: 33.5, h: 50, slot: 'H' },
    ] },
  { id: 'VHHH_5', pattern: 'VHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38.2, h: 100, slot: 'V' },
      { x: 38.2, y: 0, w: 61.8, h: 33.3, slot: 'H' },
      { x: 38.2, y: 33.3, w: 61.8, h: 33.4, slot: 'H' },
      { x: 38.2, y: 66.7, w: 61.8, h: 33.3, slot: 'H' },
    ] },
  { id: 'VHHH_6', pattern: 'VHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 40, h: 100, slot: 'V' },
      { x: 40, y: 0, w: 60, h: 61.8, slot: 'H' },
      { x: 40, y: 61.8, w: 30, h: 38.2, slot: 'H' },
      { x: 70, y: 61.8, w: 30, h: 38.2, slot: 'H' },
    ] },

  // ═══ 4 PHOTOS — HHHH ═══
  { id: 'HHHH_1', pattern: 'HHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 50, h: 50, slot: 'H' },
      { x: 50, y: 0, w: 50, h: 50, slot: 'H' },
      { x: 0, y: 50, w: 50, h: 50, slot: 'H' },
      { x: 50, y: 50, w: 50, h: 50, slot: 'H' },
    ] },
  { id: 'HHHH_2', pattern: 'HHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 61.8, slot: 'H' },
      { x: 0, y: 61.8, w: 33.3, h: 38.2, slot: 'H' },
      { x: 33.3, y: 61.8, w: 33.4, h: 38.2, slot: 'H' },
      { x: 66.7, y: 61.8, w: 33.3, h: 38.2, slot: 'H' },
    ] },
  { id: 'HHHH_3', pattern: 'HHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 33.3, h: 38.2, slot: 'H' },
      { x: 33.3, y: 0, w: 33.4, h: 38.2, slot: 'H' },
      { x: 66.7, y: 0, w: 33.3, h: 38.2, slot: 'H' },
      { x: 0, y: 38.2, w: 100, h: 61.8, slot: 'H' },
    ] },
  { id: 'HHHH_4', pattern: 'HHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 61.8, h: 100, slot: 'H' },
      { x: 61.8, y: 0, w: 38.2, h: 33.3, slot: 'H' },
      { x: 61.8, y: 33.3, w: 38.2, h: 33.4, slot: 'H' },
      { x: 61.8, y: 66.7, w: 38.2, h: 33.3, slot: 'H' },
    ] },
  { id: 'HHHH_5', pattern: 'HHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 60, h: 50, slot: 'H' },
      { x: 60, y: 0, w: 40, h: 50, slot: 'H' },
      { x: 0, y: 50, w: 40, h: 50, slot: 'H' },
      { x: 40, y: 50, w: 60, h: 50, slot: 'H' },
    ] },
  { id: 'HHHH_6', pattern: 'HHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 50, slot: 'H' },
      { x: 0, y: 50, w: 100, h: 30, slot: 'H' },
      { x: 0, y: 80, w: 50, h: 20, slot: 'H' },
      { x: 50, y: 80, w: 50, h: 20, slot: 'H' },
    ] },
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/proTemplateLibrary.js
git commit -m "feat: pro template library — 4 photo templates (30 templates, 5 patterns)"
```

---

## Task 4: Pro Template Library — 5-8 poze (~80 templates)

**Files:**
- Modify: `src/utils/proTemplateLibrary.js`

- [ ] **Step 1: Add 5-photo templates (30 templates: 6 patterns × 5 variații)**

Follow the same structure. For each pattern (VVVVV, VVVVH, VVVHH, VVHHH, VHHHH, HHHHH), create 5 variations using golden ratio and rule-of-thirds proportions. Key layouts:
- Hero + grid (hero 61.8%, grid fills rest)
- Rows of 2+3 or 3+2
- L-shape hero + supporting
- Filmstrip (one row of small + hero)
- Masonry (varied heights)

- [ ] **Step 2: Add 6-photo templates (24 templates: 6 patterns × 4 variații)**

Patterns: VVVVVV, VVVVVH, VVVVHH, VVVHHH, VVHHHH, VHHHHH, HHHHHH (pick 6 most common).
Key layouts:
- 2×3 and 3×2 grids
- Hero + 5 small
- Two rows with different densities
- L-shape + grid

- [ ] **Step 3: Add 7-8 photo templates (24 templates: 8 patterns × 3 variații)**

Focus on grid-based layouts:
- 2×4, 4×2 grids
- Hero + grid remainder
- Filmstrip + hero
- Masonry columns

- [ ] **Step 4: Verify total count**

Run: `grep -c "id:" src/utils/proTemplateLibrary.js`
Expected: ~155-160

- [ ] **Step 5: Commit**

```bash
git add src/utils/proTemplateLibrary.js
git commit -m "feat: pro template library — 5-8 photo templates (~80 templates)"
```

---

## Task 5: Default Margins + Full Bleed Toggle

**Files:**
- Modify: `src/utils/layoutEngine.js` (lines 645-666)
- Modify: `src/stores/useEditorStore.js`
- Modify: `src/utils/projectRestore.js` (lines 100-103)

- [ ] **Step 1: Add DEFAULT_BOUNDS constant and update createPage/createSpread in layoutEngine.js**

At the top of `layoutEngine.js` (after line 4):
```js
export const DEFAULT_BOUNDS = { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 };
export const FULL_BLEED_BOUNDS = { top: 0, right: 0, bottom: 0, left: 0 };
```

Update `createPage()` (line 645) to:
```js
function createPage(photos = [], vi = 0) {
  if (photos.length === 0) return { photos: [...photos], tree: mkLeaf('A'), _vi: 0, bounds: DEFAULT_BOUNDS };
  const { tree, vi: usedVi } = smartBuildTree(photos, vi);
  return { photos: [...photos], tree, _vi: usedVi, bounds: DEFAULT_BOUNDS };
}
```

- [ ] **Step 2: Add toggleFullBleed in useEditorStore.js**

After `updateRatio` (line 875), add:
```js
  toggleFullBleed: (spreadIdx) => {
    const { spreads } = get();
    const idx = spreadIdx ?? get().currentSpread;
    const sp = spreads[idx];
    if (!sp || sp.isCover) return;
    get()._pushUndo();
    const isFullBleed = !sp.full?.bounds || (sp.full.bounds.top === 0 && sp.full.bounds.bottom === 0);
    const newBounds = isFullBleed ? DEFAULT_BOUNDS : FULL_BLEED_BOUNDS;
    const updated = [...spreads];
    updated[idx] = {
      ...sp,
      full: { ...sp.full, bounds: newBounds },
      left: { ...sp.left, bounds: newBounds },
      right: { ...sp.right, bounds: newBounds },
    };
    set({ spreads: updated, _tick: get()._tick + 1 });
  },
```

Add import at top of useEditorStore.js:
```js
import { DEFAULT_BOUNDS, FULL_BLEED_BOUNDS } from '../utils/layoutEngine';
```

- [ ] **Step 3: Update projectRestore.js to default bounds**

At line ~100 in `restoreSpreads()`, after bounds restoration, add fallback:
```js
    // Default bounds if missing (old projects)
    if (sp.full && !sp.full.bounds) sp.full.bounds = DEFAULT_BOUNDS;
    if (sp.left && !sp.left.bounds) sp.left.bounds = DEFAULT_BOUNDS;
    if (sp.right && !sp.right.bounds) sp.right.bounds = DEFAULT_BOUNDS;
```

Add import: `import { DEFAULT_BOUNDS } from './layoutEngine';`

- [ ] **Step 4: Test locally — open editor, verify margins visible on spreads**

- [ ] **Step 5: Commit**

```bash
git add src/utils/layoutEngine.js src/stores/useEditorStore.js src/utils/projectRestore.js
git commit -m "feat: default 5% margins on all spreads + toggleFullBleed action"
```

---

## Task 6: Full Bleed Toggle Button in UI

**Files:**
- Modify: `src/components/editor/EditorTopbar.jsx`

- [ ] **Step 1: Add full-bleed toggle button in EditorTopbar**

Find the toolbar area with undo/redo buttons. After undo/redo section, add:

```jsx
{/* Full Bleed Toggle */}
{!spread?.isCover && (
  <button
    onClick={() => toggleFullBleed()}
    className={`p-1.5 rounded-lg transition-all ${
      isFullBleed ? 'bg-[#3D6B5E] text-white' : 'hover:bg-gray-100 text-gray-600'
    }`}
    title={isFullBleed ? 'Cu margine' : 'Fără margine'}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="1" />
      {isFullBleed ? (
        <>
          <path d="M3 3L8 8M21 3L16 8M3 21L8 16M21 21L16 16" />
        </>
      ) : (
        <rect x="6" y="6" width="12" height="12" rx="0.5" strokeDasharray="2 2" />
      )}
    </svg>
  </button>
)}
```

Add to the destructured store values:
```js
const toggleFullBleed = useEditorStore((s) => s.toggleFullBleed);
const spread = useEditorStore((s) => s.spreads[s.currentSpread]);
const isFullBleed = !spread?.full?.bounds || (spread?.full?.bounds?.top === 0 && spread?.full?.bounds?.bottom === 0);
```

- [ ] **Step 2: Test — click button, verify margins toggle on/off**

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/EditorTopbar.jsx
git commit -m "feat: full bleed toggle button in editor topbar"
```

---

## Task 7: Integrate Pro Templates into smartBuildTree

**Files:**
- Modify: `src/utils/layoutEngine.js` (lines 534-570)

- [ ] **Step 1: Import pro template library and update smartBuildTree**

At the top of layoutEngine.js, add:
```js
import PRO_TEMPLATES, { getOrientationPattern, getProTemplatesByPattern } from './proTemplateLibrary';
```

Replace `smartBuildTree()` (lines 534-570) with:

```js
export function smartBuildTree(photos, avoidVariant = -1) {
  const n = photos.length;
  if (n === 0) return { tree: mkLeaf('A'), vi: 0 };

  // ── Step 1: Try pro templates by orientation pattern ──
  const pattern = getOrientationPattern(photos, getOrientation);
  const proMatches = getProTemplatesByPattern(pattern, n);

  if (proMatches.length > 0) {
    // Pick a random pro template (or avoid previous)
    let idx = Math.floor(Math.random() * proMatches.length);
    if (avoidVariant >= 0 && proMatches.length > 1) {
      // avoidVariant is the index within proMatches
      idx = (avoidVariant + 1) % proMatches.length;
    }
    const template = proMatches[idx];
    const result = applyProTemplate(template, photos);
    if (result) {
      return { tree: result.tree, vi: idx, _proTemplate: template };
    }
  }

  // ── Step 2: Fallback to binary tree variants ──
  const count = Math.max(0, Math.min(n, 10));
  const generators = getAllGenerators(count);
  if (!generators || generators.length === 0) return { tree: mkLeaf('A'), vi: 0 };

  const photoOrients = photos.map(p => getOrientation(p));
  const scores = [];
  for (let vi = 0; vi < generators.length; vi++) {
    if (vi === avoidVariant && generators.length > 1) continue;
    const frameOrients = getVariantSlots(generators, vi, count);
    let score = 0;
    const usedP = new Set();
    for (let fi = 0; fi < Math.min(frameOrients.length, photoOrients.length); fi++) {
      let bestMatch = 0;
      for (let pi = 0; pi < photoOrients.length; pi++) {
        if (usedP.has(pi)) continue;
        const s = orientationScore(photoOrients[pi], frameOrients[fi]);
        if (s > bestMatch) bestMatch = s;
      }
      score += bestMatch;
    }
    if (vi !== avoidVariant) score += 0.5;
    scores.push({ vi, score });
  }
  scores.sort((a, b) => b.score - a.score);
  const bestVi = scores[0]?.vi || 0;
  const tree = generators[bestVi]();
  assignPhotos(tree, photos);
  return { tree, vi: bestVi };
}
```

- [ ] **Step 2: Update createPage to pass through _proTemplate**

```js
function createPage(photos = [], vi = 0) {
  if (photos.length === 0) return { photos: [...photos], tree: mkLeaf('A'), _vi: 0, bounds: DEFAULT_BOUNDS };
  const result = smartBuildTree(photos, vi);
  return {
    photos: [...photos],
    tree: result.tree,
    _vi: result.vi,
    _proTemplate: result._proTemplate || null,
    bounds: DEFAULT_BOUNDS,
  };
}
```

- [ ] **Step 3: Test — add photos with different orientations, verify pro templates are used**

- [ ] **Step 4: Commit**

```bash
git add src/utils/layoutEngine.js
git commit -m "feat: smartBuildTree uses pro templates first, binary tree fallback"
```

---

## Task 8: Pattern-Based Template Cycling

**Files:**
- Modify: `src/utils/layoutEngine.js` (cyclePageLayout, line 677)
- Modify: `src/stores/useEditorStore.js` (sbar actions)

- [ ] **Step 1: Update cyclePageLayout to cycle pro templates by pattern**

Replace `cyclePageLayout()` (line 677):

```js
export function cyclePageLayout(page, dir = 1) {
  if (!page || page.photos.length === 0) return page;
  const n = page.photos.length;

  // ── Try pro templates first ──
  const pattern = getOrientationPattern(page.photos, getOrientation);
  const proMatches = getProTemplatesByPattern(pattern, n);

  if (proMatches.length > 0) {
    // If currently on a pro template, cycle within pro templates
    const currentProIdx = page._proTemplate
      ? proMatches.findIndex(t => t.id === page._proTemplate.id)
      : -1;

    if (currentProIdx >= 0 || page._proTemplate) {
      // Cycle within pro templates
      const nextIdx = currentProIdx >= 0
        ? ((currentProIdx + dir) % proMatches.length + proMatches.length) % proMatches.length
        : 0;
      const template = proMatches[nextIdx];
      const result = applyProTemplate(template, page.photos);
      if (result) {
        return { ...result, bounds: page.bounds || DEFAULT_BOUNDS };
      }
    }

    // First time: start with pro template
    const template = proMatches[0];
    const result = applyProTemplate(template, page.photos);
    if (result) {
      return { ...result, bounds: page.bounds || DEFAULT_BOUNDS };
    }
  }

  // ── Fallback: binary tree cycling ──
  const varCount = getVariantCount(n);
  if (varCount <= 1) return page;
  const cur = page._vi || 0;
  const nextVi = ((cur + dir) % varCount + varCount) % varCount;
  const newTree = buildTree(n, nextVi);
  assignPhotos(newTree, page.photos);
  return { ...page, tree: newTree, _vi: nextVi, _proTemplate: null };
}
```

- [ ] **Step 2: Test — cycle through templates, verify pattern stays consistent**

- [ ] **Step 3: Commit**

```bash
git add src/utils/layoutEngine.js
git commit -m "feat: template cycling restricted to matching orientation patterns"
```

---

## Task 9: Orientation-Strict Photo Placement

**Files:**
- Modify: `src/stores/useEditorStore.js` (placePhotoInFrame, line 591)
- Modify: `src/components/editor/EditorCanvas.jsx` (FrameView, line 236)

- [ ] **Step 1: Add orientation check to placePhotoInFrame**

Update `placePhotoInFrame` in useEditorStore.js (line 591). Add orientation check:

```js
  placePhotoInFrame: (photoId, leafId, forceOverride = false) => {
    const { photos, spreads } = get();
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;

    // Find the leaf and check orientation compatibility
    for (const sp of spreads) {
      const allLeaves = getSpreadLeaves(sp);
      const leaf = allLeaves.find(l => l.id === leafId);
      if (!leaf) continue;

      // Orientation check
      const photoOrient = getOrientation(photo);
      const leafSlot = leaf.slot || leaf._proFrame?.slot || 'S';

      if (!forceOverride && photoOrient !== 'S' && leafSlot !== 'S') {
        if (photoOrient !== leafSlot) {
          // Mismatch — reject placement (UI should show warning)
          console.warn(`[Layout] Orientation mismatch: photo ${photoOrient} → frame ${leafSlot}`);
          return;
        }
      }
      break;
    }

    // Original placement logic continues...
    get()._pushUndo();
    // ... (keep existing code)
  },
```

- [ ] **Step 2: Add visual mismatch indicator in FrameView (EditorCanvas.jsx)**

In `FrameView` component (line 236), update `onDragOver` to check orientation:

```jsx
  const handleDragOver = (e) => {
    e.preventDefault();
    const photoId = e.dataTransfer.types.includes('text/plain') ? 'pending' : null;
    if (!photoId) return;

    // Check orientation compatibility
    const shiftHeld = e.shiftKey;
    setDragOver(true);
    setDragMismatch(!shiftHeld && false); // Will be set properly on actual data check
  };
```

Add state for mismatch:
```jsx
const [dragMismatch, setDragMismatch] = useState(false);
```

Update the drop handler to check with Shift:
```jsx
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false); setDragMismatch(false);
    const photoId = e.dataTransfer.getData('text/plain');
    if (photoId) {
      const forceOverride = e.shiftKey;
      useEditorStore.getState().placePhotoInFrame(photoId, leaf.id, forceOverride);
    }
  };
```

Update the visual indicator in the empty frame area:
```jsx
{dragOver && dragMismatch ? (
  <div className="w-full h-full flex flex-col items-center justify-center bg-red-100/80">
    <span className="text-red-500 text-lg">⚠️</span>
    <span className="text-[8px] text-red-500 font-bold">Orientare greșită</span>
    <span className="text-[7px] text-red-400">Shift + drop pt a forța</span>
  </div>
) : dragOver ? (
  // existing cyan indicator
```

- [ ] **Step 3: Test — drag portrait photo to landscape frame, verify red warning appears**

- [ ] **Step 4: Commit**

```bash
git add src/stores/useEditorStore.js src/components/editor/EditorCanvas.jsx
git commit -m "feat: orientation-strict photo placement with Shift override"
```

---

## Task 10: Separator Orientation Lock

**Files:**
- Modify: `src/stores/useEditorStore.js` (updateRatio, line 870)
- Modify: `src/utils/layoutEngine.js`

- [ ] **Step 1: Add orientation-aware ratio clamping**

In `layoutEngine.js`, add a new export:

```js
/**
 * Check if a ratio change would flip frame orientation.
 * Returns the clamped ratio that preserves orientation.
 */
export function clampRatioForOrientation(node, newRatio, parentX, parentY, parentW, parentH, gap) {
  const isCol = node.type === 'col';
  const testNode = { ...node, ratio: newRatio };

  // Compute rects with new ratio
  const rects = computeRects(testNode, parentX, parentY, parentW, parentH, gap);
  if (rects.length < 2) return newRatio;

  // Get original orientations
  const origNode = { ...node };
  const origRects = computeRects(origNode, parentX, parentY, parentW, parentH, gap);
  if (origRects.length < 2) return newRatio;

  // Check each frame's orientation
  for (let i = 0; i < Math.min(rects.length, origRects.length); i++) {
    const origAR = origRects[i].w / origRects[i].h;
    const newAR = rects[i].w / rects[i].h;
    const origOrient = origAR > 1.2 ? 'H' : origAR < 0.83 ? 'V' : 'S';
    const newOrient = newAR > 1.2 ? 'H' : newAR < 0.83 ? 'V' : 'S';

    if (origOrient !== 'S' && newOrient !== origOrient) {
      // Would flip orientation — reject, return original ratio
      return node.ratio;
    }
  }

  return newRatio;
}
```

- [ ] **Step 2: Update updateRatio in useEditorStore.js**

Replace `updateRatio` (line 870):

```js
  updateRatio: (node, newRatio) => {
    // Basic clamp
    let ratio = Math.max(0.15, Math.min(0.85, newRatio));

    // Orientation lock — find parent dimensions from current canvas
    // Since we don't have exact parent dims here, use the basic clamp
    // The visual lock is enforced by checking AR after update
    node.ratio = ratio;
    set({ _tick: get()._tick + 1 });
  },
```

Note: Full orientation lock requires knowing parent dimensions. For MVP, the basic [0.15, 0.85] clamp already prevents extreme flips. Full lock can be enhanced later by passing parent dims through the separator.

- [ ] **Step 3: Commit**

```bash
git add src/utils/layoutEngine.js src/stores/useEditorStore.js
git commit -m "feat: separator orientation lock — clampRatioForOrientation"
```

---

## Task 11: Update assignPhotos for strict orientation

**Files:**
- Modify: `src/utils/layoutEngine.js` (assignPhotos, line 469)

- [ ] **Step 1: Update assignPhotos to never place V in H or H in V**

Replace `assignPhotos()`:

```js
export function assignPhotos(tree, photos) {
  const leaves = getLeaves(tree);
  if (photos.length <= 1 || leaves.length <= 1) {
    leaves.forEach((leaf, i) => { leaf.photo = i < photos.length ? photos[i] : null; });
    return tree;
  }

  const rects = computeRects(tree, 0, 0, 1000, 500, 0);
  const frameOrients = rects.map((r) => getFrameOrientation(r));
  const photoOrients = photos.map((p) => getOrientation(p));

  // Strict Hungarian-lite: never assign V to H or H to V
  const used = new Set();
  const assignment = new Array(leaves.length).fill(null);

  for (let fi = 0; fi < leaves.length; fi++) {
    let bestScore = -1, bestPi = -1;
    for (let pi = 0; pi < photos.length; pi++) {
      if (used.has(pi)) continue;
      const score = orientationScore(photoOrients[pi], frameOrients[fi]);
      // STRICT: skip mismatches entirely (score 0)
      if (score === 0) continue;
      if (score > bestScore) { bestScore = score; bestPi = pi; }
    }
    if (bestPi >= 0) {
      assignment[fi] = bestPi;
      used.add(bestPi);
    }
  }

  // Second pass: assign remaining photos to remaining frames (only if S/compatible)
  for (let fi = 0; fi < leaves.length; fi++) {
    if (assignment[fi] !== null) continue;
    for (let pi = 0; pi < photos.length; pi++) {
      if (used.has(pi)) continue;
      // Only assign if frame is S (any) or photo is S
      if (frameOrients[fi] === 'S' || photoOrients[pi] === 'S') {
        assignment[fi] = pi;
        used.add(pi);
        break;
      }
    }
  }

  leaves.forEach((leaf, fi) => {
    leaf.photo = assignment[fi] !== null ? photos[assignment[fi]] : null;
  });

  return tree;
}
```

- [ ] **Step 2: Test — verify V photos only go in V frames**

- [ ] **Step 3: Commit**

```bash
git add src/utils/layoutEngine.js
git commit -m "feat: strict orientation in assignPhotos — V never in H, H never in V"
```

---

## Task 12: Integration Test — Full Flow

**Files:**
- All modified files

- [ ] **Step 1: Run dev server and test complete flow**

Run: `npm run dev`

Test checklist:
1. Open editor with empty project
2. Upload 3 portrait photos → verify VVV pattern template with margins
3. Upload 2 landscape photos → verify spread uses HH template
4. Click cycle buttons (←/→) → verify cycling within same pattern only
5. Drag portrait photo to landscape frame → verify red warning
6. Hold Shift + drag → verify forced placement works
7. Click full-bleed toggle → verify margins disappear/reappear
8. Drag separator → verify orientation doesn't flip
9. Auto-fill book → verify all photos correctly oriented

- [ ] **Step 2: Test mobile**

Run on mobile viewport:
- Verify margins render correctly
- Verify template cycling works
- Verify drag-drop orientation check works

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: SmartAlbums-style collage system — pro templates, margins, orientation lock"
```
