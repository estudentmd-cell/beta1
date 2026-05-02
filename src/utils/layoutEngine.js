/* ═══ LAYOUT ENGINE — Rich Collage System ═══
   Diverse layout templates, orientation-aware placement,
   face detection for smart crop, professional album design.
*/

import PRO_TEMPLATES, { getOrientationPattern, getProTemplatesByPattern } from './proTemplateLibrary';

export const DEFAULT_BOUNDS = { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 };
export const FULL_BLEED_BOUNDS = { top: 0, right: 0, bottom: 0, left: 0 };

let _nextFrameId = 0;

export function mkLeaf(slot = 'A') {
  return { type: 'leaf', id: 'f' + (++_nextFrameId), photo: null, slot, cropOffset: { opx: 50, opy: 50 } };
}

export function mkSplit(dir, a, b, ratio = 0.5) {
  return { type: dir, children: [a, b], ratio };
}

export function getLeaves(node) {
  if (!node) return [];
  if (node.type === 'leaf') return [node];
  return node.children.flatMap(getLeaves);
}

export function getSpreadLeaves(spread) {
  if (!spread) return [];
  if (spread.mode === 'spread') return getLeaves(spread.full?.tree);
  return [...getLeaves(spread.left?.tree), ...getLeaves(spread.right?.tree)];
}

export function computeRects(node, x, y, w, h, gap = 0) {
  if (!node) return [];
  if (node.type === 'leaf') return [{ leaf: node, x, y, w, h }];
  const isCol = node.type === 'col';
  const r = node.ratio;
  const g = gap;
  if (isCol) {
    const w1 = w * r - g / 2, w2 = w * (1 - r) - g / 2, x2 = x + w * r + g / 2;
    return [...computeRects(node.children[0], x, y, w1, h, gap), ...computeRects(node.children[1], x2, y, w2, h, gap)];
  } else {
    const h1 = h * r - g / 2, h2 = h * (1 - r) - g / 2, y2 = y + h * r + g / 2;
    return [...computeRects(node.children[0], x, y, w, h1, gap), ...computeRects(node.children[1], x, y2, w, h2, gap)];
  }
}

export function computeSeps(node, x, y, w, h, gap = 0) {
  if (!node || node.type === 'leaf') return [];
  const isCol = node.type === 'col';
  const r = node.ratio;
  const g = gap;
  const seps = [];
  const HIT = 20;

  if (isCol) {
    const sepX = x + w * r - HIT / 2;
    seps.push({ node, dir: 'col', x: sepX, y, w: HIT, h, parentX: x, parentY: y, parentW: w, parentH: h });
    const w1 = w * r - g / 2, w2 = w * (1 - r) - g / 2, x2 = x + w * r + g / 2;
    seps.push(...computeSeps(node.children[0], x, y, w1, h, gap));
    seps.push(...computeSeps(node.children[1], x2, y, w2, h, gap));
  } else {
    const sepY = y + h * r - HIT / 2;
    seps.push({ node, dir: 'row', x, y: sepY, w, h: HIT, parentX: x, parentY: y, parentW: w, parentH: h });
    const h1 = h * r - g / 2, h2 = h * (1 - r) - g / 2, y2 = y + h * r + g / 2;
    seps.push(...computeSeps(node.children[0], x, y, w, h1, gap));
    seps.push(...computeSeps(node.children[1], x, y2, w, h2, gap));
  }
  return seps;
}

export function getOrientation(photo) {
  if (!photo) return 'S';
  const ar = photo.origW / photo.origH;
  if (ar > 1.2) return 'H';
  if (ar < 0.833) return 'V';
  return 'S';
}

/* ═══════════════════════════════════════════════════════════
   RICH LAYOUT TEMPLATE LIBRARY
   Each generator creates a tree. Tags describe frame orientations.
   H = horizontal (wide), V = vertical (tall), S = square/any
   ═══════════════════════════════════════════════════════════ */

// ── 1 photo layouts ──
const L1 = [
  () => mkLeaf('H'),
];

// ── 2 photo layouts ──
const L2 = [
  // VV: 2 portrete coloane
  () => mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5),
  () => mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.6),
  () => mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.4),
  () => mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.55),
  () => mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.45),
  // HH: 2 landscape rânduri (pe pagină pătrată = ratio 2:1, OK)
  () => mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.5),
  () => mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.55),
  () => mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.45),
  () => mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.6),
  // VH: portret + landscape mixt
  () => mkSplit('col', mkLeaf('V'), mkLeaf('H'), 0.45),
  () => mkSplit('col', mkLeaf('H'), mkLeaf('V'), 0.55),
  () => mkSplit('col', mkLeaf('V'), mkLeaf('H'), 0.5),
  () => mkSplit('col', mkLeaf('H'), mkLeaf('V'), 0.5),
  // SS: 2 pătrate coloane
  () => mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5),
  () => mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.55),
  // SV, SH: pătrat + portret/landscape
  () => mkSplit('col', mkLeaf('S'), mkLeaf('V'), 0.45),
  () => mkSplit('col', mkLeaf('V'), mkLeaf('S'), 0.55),
  () => mkSplit('row', mkLeaf('S'), mkLeaf('H'), 0.55),
  () => mkSplit('row', mkLeaf('H'), mkLeaf('S'), 0.45),
  // HH: landscape rows asimetric
  () => mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.4),
];

// ── 3 photo layouts (20+ variants) ──
const L3 = [
  // --- EXISTING 10 ---
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.55),
  () => mkSplit('row', mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), mkLeaf('H'), 0.45),
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.5), 0.45),
  () => mkSplit('col', mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.5), mkLeaf('V'), 0.55),
  () => mkSplit('row', mkSplit('col', mkLeaf('S'), mkLeaf('V'), 0.6), mkLeaf('H'), 0.6),
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.4), 0.4),
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('S'), mkLeaf('S'), 0.5), 0.5),
  () => mkSplit('row', mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), mkLeaf('H'), 0.5),
  // --- NEW: SmartAlbums-style (10+ more) ---
  // HVV: H top 60% + 2V bottom (from cap4-left)
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.6),
  // HVV: H top 40% + 2V bottom large
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.4),
  // VVH: 2V top + H bottom (from cap)
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkLeaf('H'), 0.55),
  // VVH: 2V top equal + H bottom 40%
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkLeaf('H'), 0.6),
  // VHH: V tall left 55% + 2H stacked right (from cap10-left)
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.5), 0.55),
  // VHH: V tall left 65% + 2H stacked right (from cap7-left)
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.5), 0.65),
  // HHV: 2H stacked left + V tall right
  () => mkSplit('col', mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.5), mkLeaf('V'), 0.45),
  // HVV: H top + V left 60% + V right 40% (asimetric bottom)
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.6), 0.55),
  // --- EXTRA: orientation mix combos ---
  // HSS: H top 50% + 2 pătrate jos
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.5),
  // SSH: 2 pătrate sus + H jos
  () => mkSplit('row', mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), mkLeaf('H'), 0.5),
  // VVV: V stânga 50% + 2V stacked dreapta (nu 3 cols înguste!)
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5),
  // VVV: 2V stacked stânga + V dreapta 50%
  () => mkSplit('col', mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.5), mkLeaf('V'), 0.5),
  // VSH: V stânga + S dreapta-sus + H dreapta-jos
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('S'), mkLeaf('H'), 0.55), 0.5),
  // HSV: H stânga-sus + S stânga-jos + V dreapta
  () => mkSplit('col', mkSplit('row', mkLeaf('H'), mkLeaf('S'), 0.5), mkLeaf('V'), 0.5),
  // HVS: H sus + col(V, S) jos
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('V'), mkLeaf('S'), 0.5), 0.5),
  // SVH: S sus + col(V, H) jos
  () => mkSplit('row', mkLeaf('S'), mkSplit('col', mkLeaf('V'), mkLeaf('H'), 0.5), 0.5),
  // VHS: col(V left, row(H top, S bottom))
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('H'), mkLeaf('S'), 0.5), 0.45),
  // SHV: row(S top, col(H, V) bottom)
  () => mkSplit('row', mkLeaf('S'), mkSplit('col', mkLeaf('H'), mkLeaf('V'), 0.5), 0.45),
];

// ── 4 photo layouts (20+ variants) ──
const L4 = [
  // --- EXISTING 10 ---
  () => mkSplit('row', mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.5),
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('S'), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.33), 0.5),
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('H'), mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.5), 0.33), 0.45),
  () => mkSplit('row', mkSplit('col', mkLeaf('S'), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.33), mkLeaf('H'), 0.5),
  () => mkSplit('col', mkSplit('row', mkLeaf('H'), mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.5), 0.33), mkLeaf('V'), 0.55),
  () => mkSplit('row', mkSplit('col', mkLeaf('S'), mkLeaf('V'), 0.6), mkSplit('col', mkLeaf('V'), mkLeaf('S'), 0.4), 0.5),
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.45), 0.5),
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('S'), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.33), 0.45),
  // --- NEW: SmartAlbums-style (12+ more) ---
  // VVVH: 3V top 45% + 1H bottom (from cap1-left)
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkLeaf('H'), 0.45),
  // HVVV: 1H top 55% + 3V bottom (from cap3-left)
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.55),
  // V+3sidebar: heroV 75% + 3 small stacked (from cap5-right)
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('S'), mkSplit('row', mkLeaf('S'), mkLeaf('S'), 0.5), 0.33), 0.75),
  // V+3sidebar: heroV 65% + 3 stacked (from cap7-left)
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('S'), mkSplit('row', mkLeaf('S'), mkLeaf('S'), 0.5), 0.33), 0.65),
  // 3sidebar+V: 3 stacked left + heroV right 65%
  () => mkSplit('col', mkSplit('row', mkLeaf('S'), mkSplit('row', mkLeaf('S'), mkLeaf('S'), 0.5), 0.33), mkLeaf('V'), 0.35),
  // Pinwheel: asymmetric 2×2 (from cap12-left)
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.35), 0.5),
  // 2V top + V35% H65% bottom
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('H'), 0.35), 0.5),
  // H top 40% + 3V bottom
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.4),
  // 3V top + H bottom 40%
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkLeaf('H'), 0.6),
  // 2×2 asymmetric (60/40 both axes)
  () => mkSplit('row', mkSplit('col', mkLeaf('S'), mkLeaf('V'), 0.6), mkSplit('col', mkLeaf('V'), mkLeaf('S'), 0.4), 0.6),
  // V big left + H + 2S grid right (mosaic)
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.5), 0.45),
  // VSHH: V stânga + S dreapta-sus + 2H stacked dreapta-jos
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('S'), mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.5), 0.45), 0.45),
  // HVSH: H sus + col(V, S, H) jos → row(H, col(V, col(S, H)))
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('S'), mkLeaf('H'), 0.5), 0.45), 0.45),
  // VHVH: alternating col(V, row(H, col(V, H)))
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('V'), mkLeaf('H'), 0.5), 0.5), 0.45),
];

// ── 5 photo layouts (20+ variants) ──
const L5 = [
  // --- EXISTING 7 ---
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.5), 0.45),
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.5), 0.4),
  () => mkSplit('row', mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), mkSplit('col', mkLeaf('S'), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.33), 0.45),
  () => mkSplit('row', mkSplit('col', mkLeaf('S'), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.33), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.55),
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('S'), mkLeaf('S'), 0.5), 0.5), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.6),
  // --- NEW: SmartAlbums-style (15+ more) ---
  // 2V top 60% + 3V bottom (from cap6-left)
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.6),
  // 3V top 45% + 2V bottom (from cap8-right)
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.45),
  // 3V top + 2 asim bottom 40/60 (from cap9-left)
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.4), 0.45),
  // heroV+2V top + 2V bottom (from cap2-right)
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.5), 0.55), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.58),
  // 3V top + 2V bottom equal (from cap13-right)
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.47),
  // 2V top + 3V bottom (inverted)
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.55),
  // H top + 4V bottom cols
  () => mkSplit('row', mkLeaf('H'), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.5),
  // heroV 40% + 2×2 grid right
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.4),
  // 2×2 grid left + heroV right 40%
  () => mkSplit('col', mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkLeaf('V'), 0.6),
  // heroV + 2H + 2V mosaic (from cap2-right style)
  () => mkSplit('col', mkSplit('row', mkLeaf('V'), mkLeaf('H'), 0.6), mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.45), 0.5),
  // 2V top 50% + 3V bottom asim 45/30/25
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.45), 0.5),
  // --- EXTRA: orientation mixes ---
  // VVHHS: 2V top + H+H+S bottom
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('H'), mkSplit('col', mkLeaf('H'), mkLeaf('S'), 0.5), 0.45), 0.5),
  // VSHHS: V left + row(S, row(H, col(H, S)))
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('S'), mkSplit('col', mkLeaf('H'), mkSplit('row', mkLeaf('H'), mkLeaf('S'), 0.5), 0.5), 0.45), 0.45),
  // VHSHV: mosaic mixt complet
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('H'), 0.45), mkSplit('col', mkLeaf('S'), mkSplit('row', mkLeaf('H'), mkLeaf('V'), 0.5), 0.45), 0.5),
];

// ── 6 photo layouts (20+ variants) ──
const L6 = [
  // --- EXISTING 5 ---
  () => mkSplit('row', mkSplit('col', mkLeaf('S'), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.33), mkSplit('col', mkLeaf('S'), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.33), 0.5),
  () => mkSplit('col', mkSplit('row', mkLeaf('S'), mkLeaf('S'), 0.5), mkSplit('row', mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.5), 0.45),
  // --- NEW: SmartAlbums-style (17+ more) ---
  // 3V×2 grid (from cap2-left)
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.45),
  // 3V×2 grid equal rows
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5),
  // 2V big top + 4V small bottom
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.55),
  // 4V small top + 2V big bottom
  () => mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.45),
  // heroV + 5 sidebar (from cap7-right style)
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.55),
  // 5 sidebar + heroV
  () => mkSplit('col', mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), mkLeaf('V'), 0.45),
  // 2H left + 4V grid right (from cap7-right)
  () => mkSplit('col', mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.5), mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.45),
  // heroV left + 2V+3V stacked right
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.45), 0.45),
  // VSVSSS: mixt pag stânga V+S, dreapta V+S+S+S
  () => mkSplit('col', mkSplit('row', mkLeaf('V'), mkLeaf('S'), 0.55), mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('S'), 0.5), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.5), 0.4),
];

// ── 7 photo layouts (20+ variants) ── NEW
const L7 = [
  // 3V top + 4V bottom
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.45),
  // 4V top + 3V bottom
  () => mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.45),
  // heroV + 2×3 grid (from cap5-left style)
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.33), 0.35),
  // 2×3 grid + heroV right
  () => mkSplit('col', mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.33), mkLeaf('V'), 0.65),
  // heroV left + 3V + 3V stacked right (cap1-right style)
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.4),
  // 2V big + 5V small filmstrip
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.2), 0.6),
  // 5V filmstrip top + 2V big bottom
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.2), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.4),
  // heroV tall left + 3V col + 3V col right (from cap3-right, cap4-right)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mkSplit('row', mkLeaf('V'), mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('row', mkLeaf('V'), mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.35),
  // Masonry 3 col: V+V | V+H | V+V
  () => mkSplit('col', mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.6), mkSplit('col', mkSplit('row', mkLeaf('V'), mkLeaf('H'), 0.55), mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.4), 0.5), 0.33),
  // heroV 50% + 2V + 2V + 2V
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.33), 0.5),
  // VVVSSHH: 3V left + 2S center + 2H right
  () => mkSplit('col', mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkSplit('col', mkSplit('row', mkLeaf('S'), mkLeaf('S'), 0.5), mkSplit('row', mkLeaf('H'), mkLeaf('H'), 0.5), 0.5), 0.4),
  // VVHSVVS: mosaic complex balanced
  () => mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('H'), mkLeaf('S'), 0.55), 0.5), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkLeaf('S'), 0.6), 0.5),
];

// ── 8 photo layouts (20+ variants) ── NEW
const L8 = [
  // 4×2 grid
  () => mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.5),
  // 4V + 4V stacked
  () => mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.45),
  // 3V + 3V + 2V big bottom
  () => mkSplit('row', mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.6),
  // heroV + 7 grid (from cap5-left style)
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.4), 0.35),
  // Masonry 4 col: 2+2+2+2
  () => mkSplit('col', mkSplit('col', mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.6), mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.4), 0.5), mkSplit('col', mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.55), mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.45), 0.5), 0.5),
  // heroV + 3V sidebar + 4V bottom
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.5),
  // 2V + 2V left + heroV + 3sidebar right
  () => mkSplit('col', mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('V'), mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.6), 0.55),
  // 4V top asim + 4V bottom asim
  () => mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.6), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.4), 0.5),
  // heroV + 3×3 minus 2 grid
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.6), 0.35),
  // VVSSVVSS: alternating V+S blocks
  () => mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.5), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.5), 0.5),
];

// ── 9 photo layouts (20+ variants) ── NEW
const L9 = [
  // 3×3 grid
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.33),
  // 4V + 5V quilt
  () => mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.2), 0.45),
  // 5V + 4V quilt
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.2), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.55),
  // 3V + 3V + 3V rows
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.33),
  // heroV + 8 grid (4+4)
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.5), 0.3),
  // 3V asim top + 3V mid + 3V bottom
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.4), mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.33),
  // Masonry 3 col: 3+3+3
  () => mkSplit('col', mkSplit('row', mkLeaf('V'), mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkSplit('row', mkLeaf('V'), mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('row', mkLeaf('V'), mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.33),
  // heroV + 4V + 4V stacked
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.5), 0.35),
  // 3×3 grid asim (40/30/30 cols)
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.4), mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.4), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.4), 0.5), 0.33),
  // 3V + heroV + 3V + 2V
  () => mkSplit('col', mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkLeaf('V'), 0.4), mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.5),
  // 3V + 2V + 2V + 2V mosaic
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('row', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.33), 0.33),
];

// ── 10 photo layouts (20+ variants) ── NEW
const L10 = [
  // 3V + 4V + 3V
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.33),
  // 2V hero + 4V + 4V
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.5), 0.45),
  // heroV + 3×3 grid
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.33), 0.3),
  // 3×3 grid + heroV right
  () => mkSplit('col', mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.33), mkLeaf('V'), 0.7),
  // 3V + 2V big + 3V + 2V
  () => mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.6), mkSplit('col', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.6), 0.5),
  // 3V + 3V asim + 2V + 2V
  () => mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.4), mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), 0.45), 0.35),
  // 4V top + 3V mid + 3V bottom
  () => mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.5), mkSplit('row', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.5), 0.45),
  // 2V + 3V + 3V + 2V balanced
  () => mkSplit('row', mkSplit('col', mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), 0.4), mkSplit('col', mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.33), mkSplit('col', mkLeaf('V'), mkLeaf('V'), 0.5), 0.6), 0.5),
];

const VARIANT_GENERATORS = {
  0: L1,
  1: L1,
  2: L2,
  3: L3,
  4: L4,
  5: L5,
  6: L6,
  7: L7,
  8: L8,
  9: L9,
  10: L10,
};

/* ═══ Approved layouts from Firestore (auto-learned) ═══ */
const _approvedGenerators = {}; // photoCount -> [() => tree, ...]
let _approvedLoaded = false;

export function fpToTree(fp) {
  if (!fp) return mkLeaf('S');
  if (fp.t === 'L') return mkLeaf(fp.s || 'S');
  return mkSplit(fp.t, fpToTree((fp.c || [])[0]), fpToTree((fp.c || [])[1]), fp.r || 0.5);
}

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

export async function reloadApprovedLayouts() {
  // Clear existing approved generators and reload from Firestore
  for (const key of Object.keys(_approvedGenerators)) delete _approvedGenerators[key];
  _approvedLoaded = false;
  _slotCache.clear(); // Invalidate slot cache when generators change
  await loadApprovedLayouts();
}

// Try loading at module init (non-blocking)
loadApprovedLayouts();

function getAllGenerators(count) {
  const base = VARIANT_GENERATORS[count] || [];
  const extra = _approvedGenerators[count] || [];
  return [...base, ...extra];
}

export function buildTree(n, vi = 0) {
  const count = Math.max(0, Math.min(n, 10));
  const generators = getAllGenerators(count);
  if (generators.length === 0) return mkLeaf('A');
  const idx = ((vi % generators.length) + generators.length) % generators.length;
  return generators[idx]();
}

export function getVariantCount(n) {
  const count = Math.max(0, Math.min(n, 10));
  return getAllGenerators(count).length || 1;
}

/* ═══════════════════════════════════════════════════════════
   ORIENTATION-AWARE PHOTO ASSIGNMENT
   Matches photos to frames based on aspect ratio compatibility.
   V photos → tall frames, H photos → wide frames.
   ═══════════════════════════════════════════════════════════ */

function getFrameOrientation(rect) {
  const ar = rect.w / rect.h;
  if (ar > 1.25) return 'H';
  if (ar < 0.8) return 'V';
  return 'S';
}

function orientationScore(photoOrient, frameOrient) {
  if (photoOrient === frameOrient) return 3; // perfect match
  if (frameOrient === 'S' || photoOrient === 'S') return 2; // square is flexible
  return 0; // mismatch: V in H or H in V = bad
}

export function assignPhotos(tree, photos) {
  const leaves = getLeaves(tree);
  if (photos.length <= 1 || leaves.length <= 1) {
    leaves.forEach((leaf, i) => { leaf.photo = i < photos.length ? photos[i] : null; });
    return tree;
  }

  const rects = computeRects(tree, 0, 0, 1000, 500, 0);
  const frameOrients = rects.map((r) => getFrameOrientation(r));
  const photoOrients = photos.map((p) => getOrientation(p));

  // Strict: never assign V to H or H to V (score 0 = skip)
  const used = new Set();
  const assignment = new Array(leaves.length).fill(null);

  // First pass: assign only compatible matches
  for (let fi = 0; fi < leaves.length; fi++) {
    let bestScore = -1, bestPi = -1;
    for (let pi = 0; pi < photos.length; pi++) {
      if (used.has(pi)) continue;
      const score = orientationScore(photoOrients[pi], frameOrients[fi]);
      if (score === 0) continue; // STRICT: skip mismatches entirely
      if (score > bestScore) { bestScore = score; bestPi = pi; }
    }
    if (bestPi >= 0) {
      assignment[fi] = bestPi;
      used.add(bestPi);
    }
  }

  // Second pass: fill remaining frames only with S-compatible photos
  for (let fi = 0; fi < leaves.length; fi++) {
    if (assignment[fi] !== null) continue;
    for (let pi = 0; pi < photos.length; pi++) {
      if (used.has(pi)) continue;
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

/**
 * Check if a ratio change would flip frame orientation.
 * Returns the clamped ratio that preserves original orientation classes.
 */
export function clampRatioForOrientation(node, newRatio, parentX, parentY, parentW, parentH, gap) {
  if (!node || node.type === 'leaf') return newRatio;

  const testNode = { ...node, ratio: newRatio, children: node.children };
  const origRects = computeRects(node, parentX, parentY, parentW, parentH, gap);
  const newRects = computeRects(testNode, parentX, parentY, parentW, parentH, gap);

  if (origRects.length < 2 || newRects.length < 2) return newRatio;

  for (let i = 0; i < Math.min(origRects.length, newRects.length); i++) {
    const origAR = origRects[i].w / origRects[i].h;
    const newAR = newRects[i].w / newRects[i].h;
    const origOrient = origAR > 1.2 ? 'H' : origAR < 0.83 ? 'V' : 'S';
    const newOrient = newAR > 1.2 ? 'H' : newAR < 0.83 ? 'V' : 'S';

    if (origOrient !== 'S' && newOrient !== origOrient) {
      return node.ratio; // Would flip — keep original
    }
  }
  return newRatio;
}

export function autoLayout(photos) {
  const n = photos.length;
  if (n === 0) return mkLeaf('A');
  const tree = buildTree(n, 0);
  assignPhotos(tree, photos);
  return tree;
}

/* ═══════════════════════════════════════════════════════════
   SMART LAYOUT SELECTION
   Picks the best template variant based on photo orientations.
   ═══════════════════════════════════════════════════════════ */

// Cache for variant slot patterns — avoids rebuilding trees just to read orientations
const _slotCache = new Map();

function getVariantSlots(generators, vi, count) {
  const key = `${count}_${vi}`;
  if (_slotCache.has(key)) return _slotCache.get(key);
  const tree = generators[vi]();
  const rects = computeRects(tree, 0, 0, 1000, 500, 0);
  const slots = rects.map(r => getFrameOrientation(r));
  _slotCache.set(key, slots);
  return slots;
}

export function smartBuildTree(photos, avoidVariant = -1) {
  const n = photos.length;
  if (n === 0) return { tree: mkLeaf('A'), vi: 0 };

  // ── Step 1: Try pro templates by orientation pattern ──
  const pattern = getOrientationPattern(photos, getOrientation);
  const proMatches = getProTemplatesByPattern(pattern, n);

  console.log('[SmartLayout] pattern:', pattern, 'matches:', proMatches.length, 'photos:', n);

  if (proMatches.length > 0) {
    // Pick pro template, avoiding previous if possible
    let idx = 0;
    if (avoidVariant >= 0 && avoidVariant < proMatches.length && proMatches.length > 1) {
      idx = (avoidVariant + 1) % proMatches.length;
    } else if (avoidVariant < 0) {
      // First time: pick random for variety
      idx = Math.floor(Math.random() * proMatches.length);
    }
    const template = proMatches[idx];
    console.log('[SmartLayout] selected:', template.id, 'frames:', template.frames.map(f => f.w + 'x' + f.h));
    const result = applyProTemplate(template, photos);
    console.log('[SmartLayout] applyProTemplate result:', result ? 'OK' : 'NULL');
    if (result) {
      return { tree: result.tree, vi: idx, _proTemplate: template };
    }
  } else {
    console.log('[SmartLayout] NO pro templates found, falling back to binary tree');
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

/* ═══════════════════════════════════════════════════════════
   FACE DETECTION — Smart Crop Offset
   Uses face-api.js Tiny Face Detector (ALL browsers incl. iOS Safari).
   Model: ~190KB, loaded once, cached by browser.
   ═══════════════════════════════════════════════════════════ */

let _faceApiLoaded = false;
let _faceApiLoading = null;

async function ensureFaceApi() {
  if (_faceApiLoaded) return true;
  if (_faceApiLoading) return _faceApiLoading;
  _faceApiLoading = (async () => {
    try {
      const faceapi = await import('face-api.js');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      _faceApiLoaded = true;
      return true;
    } catch (e) {
      console.warn('[FaceDetect] Failed to load:', e);
      return false;
    }
  })();
  return _faceApiLoading;
}

export async function detectFace(photo) {
  try {
    const ready = await ensureFaceApi();
    if (!ready) return { hasFace: false, opx: 50, opy: 45 };

    const faceapi = await import('face-api.js');

    // Încearcă toate sursele disponibile
    const sources = [photo.thumbData, photo.blob, photo.previewUrl].filter(Boolean);

    for (const src of sources) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          setTimeout(reject, 5000); // timeout 5s
        });

        // Încercăm cu inputSize mai mare pentru fețe mici, apoi mai mic
        for (const inputSize of [416, 320, 224]) {
          const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({
            inputSize,
            scoreThreshold: 0.3, // mai permisiv — prinde și fețe din profil/mici
          }));

          if (detections.length > 0) {
            let cx = 0, cy = 0;
            detections.forEach((d) => { cx += d.box.x + d.box.width / 2; cy += d.box.y + d.box.height / 2; });
            cx /= detections.length;
            cy /= detections.length;
            return { hasFace: true, opx: Math.round((cx / img.width) * 100), opy: Math.round((cy / img.height) * 100) };
          }
        }
      } catch (e) { continue; } // încearcă următoarea sursă
    }
  } catch (e) { /* silent */ }

  return { hasFace: false, opx: 50, opy: 45 };
}

/* ═══════════════════════════════════════════════════════════
   SPREAD / PAGE HELPERS
   ═══════════════════════════════════════════════════════════ */

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

let _nextSpreadId = 0;

export function createSpread(photos = []) {
  const mid = Math.ceil(photos.length / 2);
  const leftPhotos = photos.slice(0, mid);
  const rightPhotos = photos.slice(mid);
  return {
    id: 's' + (++_nextSpreadId),
    mode: 'spread',
    isCover: false,
    full: createPage(photos),
    left: createPage(leftPhotos),
    right: createPage(rightPhotos),
    photos: [...photos],
  };
}

export function distributePhotos(photos, perSpread = 4) {
  const spreads = [];
  for (let i = 0; i < photos.length; i += perSpread) {
    spreads.push(createSpread(photos.slice(i, i + perSpread)));
  }
  if (spreads.length === 0) spreads.push(createSpread([]));
  return spreads;
}

export function cyclePageLayout(page, dir = 1) {
  if (!page || page.photos.length === 0) return page;
  const n = page.photos.length;

  // ── Try pro templates first ──
  const pattern = getOrientationPattern(page.photos, getOrientation);
  const proMatches = getProTemplatesByPattern(pattern, n);

  if (proMatches.length > 0) {
    const currentProIdx = page._proTemplate
      ? proMatches.findIndex(t => t.id === page._proTemplate.id)
      : -1;

    let nextIdx;
    if (currentProIdx >= 0) {
      // Currently on a pro template — cycle within pro templates
      nextIdx = ((currentProIdx + dir) % proMatches.length + proMatches.length) % proMatches.length;
    } else {
      // Not on a pro template — start with first pro template
      nextIdx = dir > 0 ? 0 : proMatches.length - 1;
    }

    const template = proMatches[nextIdx];
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

export function shufflePage(page) {
  if (!page || page.photos.length <= 1) return page;
  const shuffled = [...page.photos].sort(() => Math.random() - 0.5);
  const { tree } = smartBuildTree(shuffled);
  return { ...page, tree, photos: shuffled, _vi: 0 };
}

/* ═══════════════════════════════════════════════════════════
   PROFESSIONAL TEMPLATES — Free-form frame system
   Templates use percentage-based coordinates (0-100% of spread).
   Loaded from Firestore `settings/pro_templates`.
   ═══════════════════════════════════════════════════════════ */

let _proTemplates = []; // all loaded pro templates
let _proTemplatesLoaded = false;

export async function loadProTemplates() {
  if (_proTemplatesLoaded) return _proTemplates;
  try {
    const { db } = await import('../firebase/config');
    if (!db) return [];
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'settings', 'pro_templates'));
    if (snap.exists() && snap.data().items) {
      _proTemplates = snap.data().items;
      _proTemplatesLoaded = true;
    }
  } catch {}
  return _proTemplates;
}

export function getProTemplates() {
  return _proTemplates;
}

export async function reloadProTemplates() {
  _proTemplatesLoaded = false;
  _proTemplates = [];
  return loadProTemplates();
}

/**
 * Get pro templates that match a photo count and format type.
 * formatType: 'patrat' | 'portret'
 */
export function getMatchingProTemplates(photoCount, formatType = 'patrat') {
  return _proTemplates.filter(t =>
    t.photoCount === photoCount && (t.formatType === formatType || !t.formatType)
  );
}

/**
 * Convert a pro template's frames into computeRects-compatible output.
 * This bridges pro templates with the existing rendering pipeline.
 *
 * @param template - A pro template object with `frames` array
 * @param x, y, w, h - The target area in pixels (spread or page)
 * @param gapPx - Gap between frames in pixels
 * @returns Array of { leaf, x, y, w, h } — same format as computeRects output
 */
export function proTemplateToRects(template, x, y, w, h, gapPx = 0, existingTree = null) {
  if (!template || !template.frames) return [];
  const halfGap = gapPx / 2;

  // If we have an existing tree (with photos), use its leaves
  const treeLeaves = existingTree ? getLeaves(existingTree) : null;

  return template.frames.map((frame, i) => {
    const fx = x + (frame.x / 100) * w + halfGap;
    const fy = y + (frame.y / 100) * h + halfGap;
    const fw = Math.max(1, (frame.w / 100) * w - gapPx);
    const fh = Math.max(1, (frame.h / 100) * h - gapPx);

    // Reuse leaf from tree (has photo assigned) or create placeholder
    let leaf;
    if (treeLeaves && treeLeaves[i]) {
      leaf = treeLeaves[i];
    } else {
      leaf = mkLeaf(frame.slot || 'S');
    }
    // Always mark with pro frame data
    leaf._proFrame = frame;
    leaf._proMask = frame.mask || 'rect';

    return { leaf, x: fx, y: fy, w: fw, h: fh };
  });
}

/**
 * Build a tree structure from a pro template for compatibility with
 * the existing spread system. Photos are assigned via orientation matching.
 *
 * Returns a page-like object: { photos, tree, _vi: -1, _proTemplate: template }
 */
export function applyProTemplate(template, photos) {
  if (!template || !template.frames || photos.length === 0) return null;

  // Build a synthetic tree with leaves matching the template frames
  // For compatibility, we create a flat chain of col splits
  const leaves = template.frames.map(f => {
    const leaf = mkLeaf(f.slot || 'S');
    leaf._proFrame = f;
    leaf._proMask = f.mask || 'rect';
    return leaf;
  });

  let tree;
  if (leaves.length === 1) {
    tree = leaves[0];
  } else {
    // Build a right-leaning chain: col(leaf0, col(leaf1, col(leaf2, leaf3)))
    tree = leaves[leaves.length - 1];
    for (let i = leaves.length - 2; i >= 0; i--) {
      tree = mkSplit('col', leaves[i], tree, 1 / (leaves.length - i));
    }
  }

  // Assign photos using orientation matching
  // Use proTemplateToRects to determine frame orientations
  const rects = proTemplateToRects(template, 0, 0, 1000, 500, 0);
  const frameOrients = rects.map(r => getFrameOrientation(r));
  const photoOrients = photos.map(p => getOrientation(p));

  // Greedy best-match assignment
  const used = new Set();
  const assignment = new Array(leaves.length).fill(null);
  for (let fi = 0; fi < Math.min(leaves.length, photos.length); fi++) {
    let bestScore = -1, bestPi = -1;
    for (let pi = 0; pi < photos.length; pi++) {
      if (used.has(pi)) continue;
      const score = orientationScore(photoOrients[pi], frameOrients[fi]);
      if (score > bestScore) { bestScore = score; bestPi = pi; }
    }
    if (bestPi >= 0) { assignment[fi] = bestPi; used.add(bestPi); }
  }

  leaves.forEach((leaf, fi) => {
    leaf.photo = assignment[fi] !== null ? photos[assignment[fi]] : null;
  });

  return {
    photos: [...photos],
    tree,
    _vi: -1, // special marker: pro template
    _proTemplate: template,
  };
}

/**
 * Auto-fill existing spreads with photos.
 * @param {Array} spreads - existing spreads array
 * @param {Array} photos - all photos to distribute
 * @param {number} photosPerSpread - target photos per spread (2-8)
 * @returns {Object} { spreads, usedIds }
 */
/**
 * Auto-fill book with photos. Adds extra spreads (in batches of 5 = 10 pages)
 * if photos don't fit. Max 12 photos per spread.
 *
 * @param {Array} spreads - existing spreads
 * @param {Array} photos - all photos
 * @param {number} photosPerSpread - target per spread (2-10)
 * @returns {{ spreads, usedIds, addedPages }}
 */
export function autoFillBook(spreads, photos, extraSpreads = 0) {
  // Sort by EXIF date, then filename
  const sorted = [...photos].sort((a, b) => {
    if (a.exifDate && b.exifDate) return a.exifDate.localeCompare(b.exifDate);
    if (a.exifDate) return -1;
    if (b.exifDate) return 1;
    return (a.fileName || '').localeCompare(b.fileName || '');
  });

  const coverSpread = spreads.find(s => s.isCover);
  const interiorSpreads = [...spreads.filter(s => !s.isCover)];
  let addedPages = 0;

  // Add extra spreads (caller already batched in 5s)
  for (let i = 0; i < extraSpreads; i++) {
    const sp = createSpread([]);
    if (interiorSpreads.length > 0 && interiorSpreads[0].mode === 'page') {
      sp.mode = 'page';
    }
    interiorSpreads.push(sp);
    addedPages += 2;
  }

  // ── Distribute photos EVENLY across ALL spreads ──
  const totalSpreads = interiorSpreads.length;
  if (totalSpreads === 0 || sorted.length === 0) {
    // Edge case: fără rotații interioare sau fără poze
    const result = coverSpread ? [coverSpread, ...interiorSpreads] : interiorSpreads;
    return { spreads: result, usedIds: new Set(), addedPages };
  }

  const base = Math.floor(sorted.length / totalSpreads);
  const remainder = sorted.length % totalSpreads;
  let photoIdx = 0;

  const newSpreads = interiorSpreads.map((sp, i) => {
    const count = base + (i < remainder ? 1 : 0);
    const chunk = sorted.slice(photoIdx, photoIdx + count);
    photoIdx += count;

    if (chunk.length === 0) {
      return { ...sp, full: createPage([]), left: createPage([]), right: createPage([]), photos: [] };
    }

    const mid = Math.ceil(chunk.length / 2);
    return {
      ...sp,
      full: createPage(chunk),
      left: createPage(chunk.slice(0, mid)),
      right: createPage(chunk.slice(mid)),
      photos: [...chunk],
    };
  });

  const usedIds = new Set();
  newSpreads.forEach(sp => sp.photos.forEach(p => usedIds.add(p.id)));

  // Pune o poză aleatorie pe cover dacă are frame-uri goale (fără duplicat)
  if (coverSpread?.coverFrames) {
    const emptyFrame = coverSpread.coverFrames.find(f => !f.photo);
    if (emptyFrame && sorted.length > 0) {
      const randomPhoto = sorted[Math.floor(Math.random() * sorted.length)];
      if (randomPhoto) {
        emptyFrame.photo = { ...randomPhoto };
        emptyFrame.cropOffset = { opx: 50, opy: 50 };
        usedIds.add(randomPhoto.id);
      }
    }
  }

  const result = coverSpread ? [coverSpread, ...newSpreads] : newSpreads;
  return { spreads: result, usedIds, addedPages };
}

// Load pro templates at module init (non-blocking)
loadProTemplates();
