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

// RULE: NO LANDSCAPE — all photos treated as portrait or square
export function getOrientation(photo) {
  if (!photo) return 'S';
  const ar = photo.origW / photo.origH;
  // Never return 'H' (landscape) — treat wide photos as square
  if (ar < 0.833) return 'V';
  return 'S';
}

/* ═══════════════════════════════════════════════════════════
   RICH LAYOUT TEMPLATE LIBRARY
   Each generator creates a tree. Tags describe frame orientations.
   H = horizontal (wide), V = vertical (tall), S = square/any
   ═══════════════════════════════════════════════════════════ */

// ═══ LAYOUT LIBRARY — MASK CONSTRUCTOR SYSTEM ═══
// REGULI:
// - SPREAD mode: doar col splits (zero landscape pe rotație)
// - PAGE mode: col + row permise (măști mixte pe pagină)
// - 4 MĂȘTI STANDARD: S(1:1), V_SHORT(4:5), V_LONG(9:16), H(1.91:1)

// ── Mask aspect ratios (w/h) ──
const MASK_RATIOS = {
  S: 1.0,           // 1:1 square
  V_SHORT: 0.8,     // 4:5 portrait
  V: 0.667,         // 2:3 portrait (format foto clasic)
  V_LONG: 0.75,     // 3:4 portrait (mai lat decât 9:16, mai îngust decât 4:5)
  H: 1.5,           // 3:2 landscape (doar pe pagină!)
};

// ── Mask group builder ──
// Calculează ratio-ul de split bazat pe proporțiile măștilor
function maskRatio(maskA, maskB, dir) {
  const rA = MASK_RATIOS[maskA] || 1;
  const rB = MASK_RATIOS[maskB] || 1;
  if (dir === 'col') {
    // Side by side: lățimea fiecăruia e proporțională cu aspect ratio
    // La aceeași înălțime h: wA = rA*h, wB = rB*h → ratio = wA/(wA+wB) = rA/(rA+rB)
    return rA / (rA + rB);
  } else {
    // Stacked: înălțimea fiecăruia e proporțională cu 1/aspect ratio
    // La aceeași lățime w: hA = w/rA, hB = w/rB → ratio = (1/rA) / (1/rA + 1/rB)
    return (1/rA) / (1/rA + 1/rB);
  }
}

// Shortcut builders
function mCol(a, b, mA, mB) { return mkSplit('col', a, b, maskRatio(mA, mB, 'col')); }
function mRow(a, b, mA, mB) { return mkSplit('row', a, b, maskRatio(mA, mB, 'row')); }

// ═══ SPREAD MODE LAYOUTS (doar col splits — zero landscape pe rotație) ═══

// ── 1 poză ──
const L1 = [
  () => mkLeaf('V'),
];

// ── 2 poze ──
const L2 = [
  // V_LONG + V_SHORT side by side
  () => mCol(mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 'V_LONG', 'V_SHORT'),
  // V_SHORT + V_LONG
  () => mCol(mkLeaf('V_SHORT'), mkLeaf('V_LONG'), 'V_SHORT', 'V_LONG'),
  // V_SHORT + V_SHORT asimetric
  () => mkSplit('col', mkLeaf('V_SHORT'), mkLeaf('V_SHORT'), 0.58),
  // V_LONG + S
  () => mCol(mkLeaf('V_LONG'), mkLeaf('S'), 'V_LONG', 'S'),
  // S + V_LONG
  () => mCol(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'),
  // V_SHORT + S
  () => mCol(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'),
  // S + V_SHORT
  () => mCol(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'),
  // V_LONG + V_LONG
  () => mkSplit('col', mkLeaf('V_LONG'), mkLeaf('V_LONG'), 0.55),
];

// ── 3 poze ──
const L3 = [
  // V_LONG hero stânga + 2 S stivuite dreapta
  () => mCol(mkLeaf('V_LONG'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'V_LONG', 'V_SHORT'),
  // 2 S stivuite stânga + V_LONG hero dreapta
  () => mCol(mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_LONG'), 'V_SHORT', 'V_LONG'),
  // V_LONG + V_SHORT + V_SHORT (3 coloane)
  () => mCol(mkLeaf('V_LONG'), mCol(mkLeaf('V_SHORT'), mkLeaf('V_SHORT'), 'V_SHORT', 'V_SHORT'), 'V_LONG', 'V_SHORT'),
  // V_SHORT + V_LONG + V_SHORT
  () => mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 0.58), 0.28),
  // 3 V_SHORT asimetric
  () => mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mkLeaf('V_SHORT'), mkLeaf('V_SHORT'), 0.55), 0.38),
  // V_LONG hero + H + S stivuite dreapta
  () => mCol(mkLeaf('V_LONG'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 'V_LONG', 'V_SHORT'),
  // S + H stivuite stânga + V_LONG hero dreapta
  () => mCol(mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mkLeaf('V_LONG'), 'V_SHORT', 'V_LONG'),
  // V_SHORT + V_LONG + S (descrescător)
  () => mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mkLeaf('V_LONG'), mkLeaf('S'), 0.55), 0.32),
];

// ── 4 poze ──
const L4 = [
  // V hero stânga + 2 S stivuite + V_SHORT dreapta (APROBAT)
  () => mCol(mkLeaf('V'), mCol(mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_SHORT'), 'V_SHORT', 'V_SHORT'), 'V', 'V_SHORT'),
  // V_SHORT + 2 S stivuite + V hero dreapta (APROBAT)
  () => mCol(mCol(mkLeaf('V_SHORT'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'V_SHORT', 'V_SHORT'), mkLeaf('V'), 'V_SHORT', 'V'),
  // V hero + S side + H sub + V_SHORT (APROBAT)
  () => mCol(mkLeaf('V'), mCol(mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mkLeaf('V_SHORT'), 'V_SHORT', 'V_SHORT'), 'V', 'V_SHORT'),
  // V_LONG hero stânga + V_SHORT peste S dreapta
  () => mCol(mkLeaf('V_LONG'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 'V_LONG', 'V_SHORT'),
  // S peste V_SHORT stânga + V_LONG hero dreapta
  () => mCol(mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkLeaf('V_LONG'), 'V_SHORT', 'V_LONG'),
  // V hero stânga 42% + S centru + 2 V_SHORT stivuite dreapta
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('S'), mRow(mkLeaf('V_SHORT'), mkLeaf('V_SHORT'), 'V_SHORT', 'V_SHORT'), 0.42), 0.42),
  // 2 V_SHORT stivuite stânga + S centru + V hero dreapta
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('V_SHORT'), 'V_SHORT', 'V_SHORT'), mkLeaf('S'), 0.58), mkLeaf('V'), 0.58),
  // V hero stânga 45% + 2 S stivuite + V_SHORT dreapta
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_SHORT'), 0.55), 0.45),
  // V_SHORT stânga + V_LONG hero centru 40% + 2 S stivuite dreapta
  () => mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.6), 0.25),
  // V_LONG hero stânga + V_SHORT + S stivuite centru + V dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkLeaf('V'), 0.45), 0.4),
  // V hero stânga 43% + V_LONG peste H stivuite + V_SHORT dreapta
  () => mkSplit('col', mkLeaf('V'), mCol(mRow(mkLeaf('V_LONG'), mkLeaf('H'), 'V_LONG', 'H'), mkLeaf('V_SHORT'), 'V_SHORT', 'V_SHORT'), 0.43),
  // S + V_SHORT stivuite stânga 32% + V_LONG hero centru + V_SHORT dreapta
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkSplit('col', mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 0.62), 0.32),
  // V_LONG hero stânga + H peste V_SHORT stivuite + V dreapta
  () => mCol(mkLeaf('V_LONG'), mCol(mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), mkLeaf('V'), 'V_SHORT', 'V'), 'V_LONG', 'V_SHORT'),
  // PREMIUM V1: Hero V_LONG stânga 60% + cluster H & S dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.4), 0.6),
  // PREMIUM V2: V_SHORT stânga + cluster H peste S centru + V_LONG dreapta
  () => mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mkLeaf('V_LONG'), 0.45), 0.3),
  // PREMIUM V3: Cluster 3 S stivuite stânga 40% + hero V_LONG dreapta
  () => mkSplit('col', mkSplit('row', mkLeaf('S'), mkSplit('row', mkLeaf('S'), mkLeaf('S'), 0.5), 0.33), mkLeaf('V_LONG'), 0.4),
  // PREMIUM V4: V_SHORT stânga + 2 S sus + H jos dreapta
  () => mkSplit('col', mkLeaf('V_SHORT'), mkSplit('row', mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), mkLeaf('H'), 0.45), 0.4),
];

// ── 5 poze ──
const L5 = [
  // V_LONG hero + 4 cluster (2x2 S)
  () => mCol(mkLeaf('V_LONG'), mCol(mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'V_SHORT', 'V_SHORT'), 'V_LONG', 'S'),
  // 4 cluster + V_LONG hero
  () => mCol(mCol(mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'V_SHORT', 'V_SHORT'), mkLeaf('V_LONG'), 'S', 'V_LONG'),
  // V_LONG + V_SHORT + V_SHORT + V_LONG + V_SHORT (5 coloane)
  () => mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 0.42), mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 0.55), 0.38), 0.45),
  // V_LONG hero + V_SHORT + 3 S stivuite
  () => mCol(mkLeaf('V_LONG'), mCol(mkLeaf('V_SHORT'), mRow(mkLeaf('S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'S', 'V_SHORT'), 'V_SHORT', 'V_SHORT'), 'V_LONG', 'S'),
  // 3 coloane: V_LONG + V_SHORT+S + V_SHORT+S
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.48), 0.35),
  // PREMIUM V1: Hero V_LONG stânga 55% + H sus + 3 V_SHORT jos dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('row', mkLeaf('H'), mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mkLeaf('V_SHORT'), mkLeaf('V_SHORT'), 0.5), 0.33), 0.4), 0.55),
  // PREMIUM V2: V_LONG hero stânga + 2 S stivuite + 2 V_SHORT stivuite dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('V_SHORT'), 'V_SHORT', 'V_SHORT'), 0.48), 0.42),
  // PREMIUM V3: 4 S grid stânga 40% + hero V_LONG dreapta
  () => mkSplit('col', mkSplit('row', mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), mkSplit('col', mkLeaf('S'), mkLeaf('S'), 0.5), 0.5), mkLeaf('V_LONG'), 0.4),
  // PREMIUM V4: V_LONG hero stânga + V_SHORT + cluster H peste S dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mkLeaf('V_SHORT'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.55), 0.45),
];

// ── 6 poze ──
const L6 = [
  // V_LONG hero + 5 cluster
  () => mCol(mkLeaf('V_LONG'), mCol(mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'S', 'V_SHORT'), 'V_SHORT', 'V_SHORT'), 'V_LONG', 'S'),
  // 3 coloane x 2 stivuite
  () => mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.48), 0.35),
  // V_LONG + V_LONG + 4 S cluster
  () => mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mkLeaf('V_LONG'), 0.55), mCol(mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'V_SHORT', 'V_SHORT'), 0.55),
  // 6 coloane asimetrice
  () => mkSplit('col', mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 0.42), mkLeaf('S'), 0.65), mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mkLeaf('V_LONG'), mkLeaf('S'), 0.55), 0.4), 0.52),
];

// ── 7 poze ──
const L7 = [
  // V_LONG hero + 6 cluster (3+3 stivuite)
  () => mCol(mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'S', 'V_SHORT'), mRow(mkLeaf('S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'S', 'V_SHORT'), 0.48), 'V_LONG', 'S'),
  // 3 coloane: V_LONG + 2x2 + 2stivuite
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mCol(mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'V_SHORT', 'V_SHORT'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.55), 0.35),
  // 7 coloane mixte
  () => mkSplit('col', mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 0.42), mkLeaf('S'), 0.62), mkSplit('col', mkSplit('col', mkLeaf('V_SHORT'), mkLeaf('V_LONG'), 0.55), mkSplit('col', mkLeaf('S'), mkLeaf('V_SHORT'), 0.45), 0.52), 0.45),
];

// ── 8 poze ──
const L8 = [
  // 4 coloane x 2 stivuite
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.52), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.48), 0.52),
  // V_LONG hero + 7 grid
  () => mCol(mkLeaf('V_LONG'), mkSplit('col', mCol(mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'V_SHORT', 'V_SHORT'), mCol(mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_SHORT'), 'V_SHORT', 'V_SHORT'), 0.52), 'V_LONG', 'S'),
];

// ── 9 poze ──
const L9 = [
  // 3 coloane x 3 stivuite
  () => mkSplit('col', mRow(mkLeaf('V_SHORT'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'V_SHORT', 'V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 'S', 'V_SHORT'), mRow(mkLeaf('V_SHORT'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'V_SHORT', 'V_SHORT'), 0.48), 0.35),
];

// ── 10 poze ──
const L10 = [
  // 5 coloane x 2 stivuite
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.52), mkSplit('col', mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.48), mRow(mkLeaf('V_LONG'), mkLeaf('S'), 'V_LONG', 'S'), 0.62), 0.48),
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

// RULE: NO LANDSCAPE
function getFrameOrientation(rect) {
  const ar = rect.w / rect.h;
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

  // 1. Etichetare poze — detectare orientare reală
  function getPhotoTag(p) {
    if (!p) return 'S';
    const r = (p.origW || 1) / (p.origH || 1);
    if (r < 0.95) return 'V';
    if (r > 1.05) return 'H';
    return 'S';
  }

  // 2. Etichetare frame-uri — bazat pe dimensiunile din tree
  const rects = computeRects(tree, 0, 0, 1000, 500, 0);
  function getFrameTag(rect) {
    const r = rect.w / rect.h;
    if (r < 0.8) return 'V';   // frame vertical (înalt)
    if (r > 1.25) return 'H';  // frame orizontal (lat)
    return 'S';                 // frame pătrat
  }

  const frameTags = rects.map(getFrameTag);
  const photoTags = photos.map(getPhotoTag);

  // 3. Smart Match — scoring
  function matchScore(photoTag, frameTag) {
    if (photoTag === frameTag) return 10;          // perfect match
    if (photoTag === 'S' || frameTag === 'S') return 5; // S e compatibil cu orice
    if (photoTag === 'V' && frameTag === 'V') return 10;
    if (photoTag === 'H' && frameTag === 'H') return 10;
    return 1; // mismatch V↔H — penalizat dar nu interzis
  }

  const used = new Set();
  const assignment = new Array(leaves.length).fill(null);

  // Pass 1: potriviri perfecte (V→V, H→H, S→S)
  for (let fi = 0; fi < leaves.length; fi++) {
    let bestScore = -1, bestPi = -1;
    for (let pi = 0; pi < photos.length; pi++) {
      if (used.has(pi)) continue;
      const score = matchScore(photoTags[pi], frameTags[fi]);
      if (score >= 10 && score > bestScore) { bestScore = score; bestPi = pi; }
    }
    if (bestPi >= 0) { assignment[fi] = bestPi; used.add(bestPi); }
  }

  // Pass 2: potriviri S-compatibile
  for (let fi = 0; fi < leaves.length; fi++) {
    if (assignment[fi] !== null) continue;
    let bestScore = -1, bestPi = -1;
    for (let pi = 0; pi < photos.length; pi++) {
      if (used.has(pi)) continue;
      const score = matchScore(photoTags[pi], frameTags[fi]);
      if (score >= 5 && score > bestScore) { bestScore = score; bestPi = pi; }
    }
    if (bestPi >= 0) { assignment[fi] = bestPi; used.add(bestPi); }
  }

  // Pass 3: fallback — orice poză rămasă în orice frame liber
  for (let fi = 0; fi < leaves.length; fi++) {
    if (assignment[fi] !== null) continue;
    for (let pi = 0; pi < photos.length; pi++) {
      if (used.has(pi)) continue;
      assignment[fi] = pi;
      used.add(pi);
      break;
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
    // RULE: NO LANDSCAPE
    const origOrient = origAR < 0.83 ? 'V' : 'S';
    const newOrient = newAR < 0.83 ? 'V' : 'S';

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
