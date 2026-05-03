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

// Leaf cu mask fitting — cadru cu aspect ratio fix, spațiu alb automat
function mkMask(slot) {
  return { type: 'leaf', id: 'f' + (++_nextFrameId), photo: null, slot, cropOffset: { opx: 50, opy: 50 }, _useMaskFitting: true };
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
// REGULA: H, H, STORY = DOAR nested pe pagină, NICIODATĂ pe rotație!
export const MASK_RATIOS = {
  S: 1.0,           // 1:1 square
  V_SHORT: 0.8,     // 4:5 portrait
  V: 0.667,         // 2:3 portrait (format foto clasic)
  V_LONG: 0.75,     // 3:4 portrait
  CARD: 0.714,      // 5:7 carte poștală / print clasic
  GOLDEN: 0.618,    // 1:1.618 proporția de aur (cel mai estetic)
  STORY: 0.5625,    // 9:16 ultra-vertical (doar în cluster, niciodată singur!)
  H: 1.5,           // 3:2 landscape (doar nested pe pagină!)
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
  // --- FORMAT FIX PER PAGINĂ (split 50%, mask fitting cu spațiu alb) ---
  () => mkSplit('col', mkMask('S'), mkMask('V_SHORT'), 0.5),
  () => mkSplit('col', mkMask('S'), mkMask('V'), 0.5),
  () => mkSplit('col', mkMask('S'), mkMask('V_LONG'), 0.5),
  () => mkSplit('col', mkMask('S'), mkMask('STORY'), 0.5),
  () => mkSplit('col', mkMask('V_SHORT'), mkMask('S'), 0.5),
  () => mkSplit('col', mkMask('V_SHORT'), mkMask('V'), 0.5),
  () => mkSplit('col', mkMask('V_SHORT'), mkMask('STORY'), 0.5),
  () => mkSplit('col', mkMask('V'), mkMask('S'), 0.5),
  () => mkSplit('col', mkMask('V'), mkMask('V_LONG'), 0.5),
  () => mkSplit('col', mkMask('V'), mkMask('STORY'), 0.5),
  () => mkSplit('col', mkMask('V_LONG'), mkMask('S'), 0.5),
  () => mkSplit('col', mkMask('V_LONG'), mkMask('STORY'), 0.5),
  () => mkSplit('col', mkMask('STORY'), mkMask('S'), 0.5),
  () => mkSplit('col', mkMask('STORY'), mkMask('V_SHORT'), 0.5),
  () => mkSplit('col', mkMask('STORY'), mkMask('V'), 0.5),

  // --- PROPORȚIONAL PE FORMAT (mCol — ratio calculat din mască) ---
  () => mCol(mkLeaf('V'), mkLeaf('S'), 'V', 'S'),
  () => mCol(mkLeaf('S'), mkLeaf('V'), 'S', 'V'),
  () => mCol(mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 'V_LONG', 'V_SHORT'),
  () => mCol(mkLeaf('V_SHORT'), mkLeaf('V_LONG'), 'V_SHORT', 'V_LONG'),
  () => mCol(mkLeaf('V'), mkLeaf('V_LONG'), 'V', 'V_LONG'),
  () => mCol(mkLeaf('V_LONG'), mkLeaf('V'), 'V_LONG', 'V'),
  () => mCol(mkLeaf('STORY'), mkLeaf('S'), 'STORY', 'S'),
  () => mCol(mkLeaf('S'), mkLeaf('STORY'), 'S', 'STORY'),
  () => mCol(mkLeaf('STORY'), mkLeaf('V_SHORT'), 'STORY', 'V_SHORT'),
  () => mCol(mkLeaf('V_SHORT'), mkLeaf('STORY'), 'V_SHORT', 'STORY'),

  // --- HERO DOMINANT (asimetric) ---
  () => mkSplit('col', mkLeaf('V'), mkLeaf('V_SHORT'), 0.65),
  () => mkSplit('col', mkLeaf('V_SHORT'), mkLeaf('V'), 0.35),
  () => mkSplit('col', mkLeaf('V_LONG'), mkLeaf('S'), 0.62),
  () => mkSplit('col', mkLeaf('S'), mkLeaf('V_LONG'), 0.38),
  () => mkSplit('col', mkLeaf('V'), mkLeaf('STORY'), 0.65),
  () => mkSplit('col', mkLeaf('STORY'), mkLeaf('V'), 0.35),
];

// ── 3 poze ──
const L3 = [
  // --- HERO STÂNGA + CLUSTER DREAPTA ---
  // 1. V hero 58% + S peste V_SHORT dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.58),
  // 2. V hero 62% + H peste S dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.62),
  // 3. V_LONG hero 52% + V_SHORT peste S dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.52),
  // 4. V hero 55% + S peste H dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), 0.55),
  // 5. V_LONG hero 48% + H peste V_SHORT dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), 0.48),
  // 6. V hero 60% + V_SHORT peste H dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), 0.60),
  // 7. V hero 65% + S peste S micro dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.65),

  // --- HERO DREAPTA + CLUSTER STÂNGA ---
  // 8. V_SHORT peste S stânga + V hero 58% dreapta
  () => mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkLeaf('V'), 0.42),
  // 9. H peste S stânga + V_LONG hero 55% dreapta
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mkLeaf('V_LONG'), 0.45),
  // 10. S peste V_SHORT stânga + V hero 62% dreapta
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkLeaf('V'), 0.38),
  // 11. H peste V_SHORT stânga + V hero 60% dreapta
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), mkLeaf('V'), 0.40),
  // 12. S peste H stânga + V_LONG hero 52% dreapta
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mkLeaf('V_LONG'), 0.48),
  // 13. V_SHORT peste H stânga + V hero 58% dreapta
  () => mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), mkLeaf('V'), 0.42),
  // 14. S peste S stânga + V hero 55% dreapta
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V'), 0.45),

  // --- HERO CENTRU + ACCENT LATERALE ---
  // 15. S stânga + V hero centru + V_SHORT dreapta
  () => mkSplit('col', mkLeaf('S'), mkSplit('col', mkLeaf('V'), mkLeaf('V_SHORT'), 0.65), 0.20),
  // 16. V_SHORT stânga + V_LONG hero centru + S dreapta
  () => mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mkLeaf('V_LONG'), mkLeaf('S'), 0.62), 0.25),
  // 17. V_LONG stânga + V hero centru + S dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mkLeaf('V'), mkLeaf('S'), 0.65), 0.22),
  // 18. V_SHORT stânga + V hero centru + H peste S cluster dreapta
  () => mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.6), 0.22),

  // --- FULL PAGE (~30%) ---
  // 19. V hero + S peste V_SHORT (FULL)
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.52),
  // 20. S peste V_SHORT + V hero (FULL)
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkLeaf('V'), 0.48),
  // 21. V_LONG hero + H peste S (FULL)
  () => mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.50),
  // 22. V_SHORT hero + S peste V_LONG cluster (FULL)
  () => mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mkLeaf('S'), mkLeaf('V_LONG'), 0.42), 0.55),
  // 23. V hero + S peste S (FULL)
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.55),
  // 24. S peste S + V hero (FULL)
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V'), 0.45),
  // 25. V hero + V_SHORT peste H (FULL)
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), 0.50),

  // ═══ 30 VARIANTE NOI — mixuri cu STORY, H, clustere variate ═══

  // --- HERO + CLUSTER CU STORY ---
  // 26. V hero 55% + STORY peste S dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('STORY'), mkLeaf('S'), 'STORY', 'S'), 0.55),
  // 27. STORY peste S stânga + V hero 58% dreapta
  () => mkSplit('col', mRow(mkLeaf('STORY'), mkLeaf('S'), 'STORY', 'S'), mkLeaf('V'), 0.42),
  // 28. V_LONG hero 52% + STORY peste V_SHORT dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('STORY'), mkLeaf('V_SHORT'), 'STORY', 'V_SHORT'), 0.52),
  // 29. STORY peste V_SHORT stânga + V_LONG hero 55% dreapta
  () => mkSplit('col', mRow(mkLeaf('STORY'), mkLeaf('V_SHORT'), 'STORY', 'V_SHORT'), mkLeaf('V_LONG'), 0.45),
  // 30. V hero 60% + S peste STORY dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('STORY'), 'S', 'STORY'), 0.60),
  // 31. S peste STORY stânga + V hero 58% dreapta
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('STORY'), 'S', 'STORY'), mkLeaf('V'), 0.42),

  // --- HERO + CLUSTER CU H ---
  // 32. V hero 55% + H peste V_SHORT dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), 0.55),
  // 33. H peste V_SHORT stânga + V hero dreapta
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), mkLeaf('V'), 0.42),
  // 34. V_LONG hero 50% + H peste S dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.50),
  // 35. H peste S stânga + V_LONG hero dreapta
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mkLeaf('V_LONG'), 0.48),
  // 36. V hero 58% + V_SHORT peste H dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), 0.58),
  // 37. V_SHORT peste H stânga + V hero dreapta
  () => mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), mkLeaf('V'), 0.40),

  // --- COMBINAȚII EXOTICE ---
  // 38. STORY hero 42% + H peste S dreapta
  () => mkSplit('col', mkLeaf('STORY'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.42),
  // 39. H peste S stânga + STORY hero dreapta
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mkLeaf('STORY'), 0.58),
  // 40. V hero 62% + STORY peste H dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('STORY'), mkLeaf('H'), 'STORY', 'H'), 0.62),
  // 41. STORY peste H stânga + V hero 60% dreapta
  () => mkSplit('col', mRow(mkLeaf('STORY'), mkLeaf('H'), 'STORY', 'H'), mkLeaf('V'), 0.40),

  // --- HERO CENTRU CU FORMATE NOI ---
  // 42. S stânga + V hero centru + STORY dreapta
  () => mkSplit('col', mkLeaf('S'), mkSplit('col', mkLeaf('V'), mkLeaf('STORY'), 0.62), 0.22),
  // 43. STORY stânga + V hero centru + S dreapta
  () => mkSplit('col', mkLeaf('STORY'), mkSplit('col', mkLeaf('V'), mkLeaf('S'), 0.65), 0.18),
  // 44. V_SHORT stânga + V_LONG hero centru + STORY dreapta
  () => mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mkLeaf('V_LONG'), mkLeaf('STORY'), 0.62), 0.25),
  // 45. STORY stânga + V hero centru + V_SHORT dreapta
  () => mkSplit('col', mkLeaf('STORY'), mkSplit('col', mkLeaf('V'), mkLeaf('V_SHORT'), 0.60), 0.20),

  // --- FULL PAGE MIXURI ---
  // 46. V hero + STORY peste S (FULL)
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('STORY'), mkLeaf('S'), 'STORY', 'S'), 0.50),
  // 47. STORY peste S + V hero (FULL)
  () => mkSplit('col', mRow(mkLeaf('STORY'), mkLeaf('S'), 'STORY', 'S'), mkLeaf('V'), 0.50),
  // 48. V_LONG hero + H peste V_SHORT (FULL)
  () => mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), 0.48),
  // 49. H peste V_SHORT + V_LONG hero (FULL)
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), mkLeaf('V_LONG'), 0.52),
  // 50. V hero + STORY peste V_LONG (FULL)
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('STORY'), mkLeaf('V_LONG'), 'STORY', 'V_LONG'), 0.48),
  // 51. STORY peste V_LONG + V hero (FULL)
  () => mkSplit('col', mRow(mkLeaf('STORY'), mkLeaf('V_LONG'), 'STORY', 'V_LONG'), mkLeaf('V'), 0.52),
  // 52. V hero + H peste STORY (FULL)
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('H'), mkLeaf('STORY'), 'H', 'STORY'), 0.52),
  // 53. H peste STORY + V hero (FULL)
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('STORY'), 'H', 'STORY'), mkLeaf('V'), 0.48),
  // 54. V_SHORT hero + S peste STORY (FULL)
  () => mkSplit('col', mkLeaf('V_SHORT'), mRow(mkLeaf('S'), mkLeaf('STORY'), 'S', 'STORY'), 0.52),
  // 55. S peste STORY + V_SHORT hero (FULL)
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('STORY'), 'S', 'STORY'), mkLeaf('V_SHORT'), 0.48),

  // ═══ MASK CONSTRUCTOR — pietre de mozaic pe rotație ═══
  // Fiecare cadru cu formă fixă, spațiul alb creează compoziția

  // --- STORY stânga + 2 forme dreapta ---
  // 56. STORY centrat stânga | S + V_SHORT stivuite dreapta
  () => mkSplit('col', mkMask('STORY'), mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), 0.5),
  // 57. STORY centrat stânga | V_SHORT + S stivuite dreapta
  () => mkSplit('col', mkMask('STORY'), mRow(mkMask('V_SHORT'), mkMask('S'), 'V_SHORT', 'S'), 0.5),
  // 58. STORY centrat stânga | V_LONG + S stivuite dreapta
  () => mkSplit('col', mkMask('STORY'), mRow(mkMask('V_LONG'), mkMask('S'), 'V_LONG', 'S'), 0.5),
  // 59. STORY centrat stânga | S + H stivuite dreapta
  () => mkSplit('col', mkMask('STORY'), mRow(mkMask('S'), mkMask('H'), 'S', 'H'), 0.5),

  // --- 2 forme stânga + STORY dreapta ---
  // 60. S + V_SHORT stivuite stânga | STORY centrat dreapta
  () => mkSplit('col', mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), mkMask('STORY'), 0.5),
  // 61. V_LONG + S stivuite stânga | STORY centrat dreapta
  () => mkSplit('col', mRow(mkMask('V_LONG'), mkMask('S'), 'V_LONG', 'S'), mkMask('STORY'), 0.5),
  // 62. H + S stivuite stânga | STORY centrat dreapta
  () => mkSplit('col', mRow(mkMask('H'), mkMask('S'), 'H', 'S'), mkMask('STORY'), 0.5),
  // 63. V_SHORT + H stivuite stânga | STORY centrat dreapta
  () => mkSplit('col', mRow(mkMask('V_SHORT'), mkMask('H'), 'V_SHORT', 'H'), mkMask('STORY'), 0.5),

  // --- V hero stânga + 2 forme dreapta ---
  // 64. V centrat stânga | S + STORY stivuite dreapta
  () => mkSplit('col', mkMask('V'), mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), 0.5),
  // 65. V centrat stânga | STORY + V_SHORT stivuite dreapta
  () => mkSplit('col', mkMask('V'), mRow(mkMask('STORY'), mkMask('V_SHORT'), 'STORY', 'V_SHORT'), 0.5),
  // 66. V centrat stânga | H + STORY stivuite dreapta
  () => mkSplit('col', mkMask('V'), mRow(mkMask('H'), mkMask('STORY'), 'H', 'STORY'), 0.5),

  // --- 2 forme stânga + V hero dreapta ---
  // 67. S + STORY stivuite stânga | V centrat dreapta
  () => mkSplit('col', mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), mkMask('V'), 0.5),
  // 68. STORY + V_SHORT stivuite stânga | V centrat dreapta
  () => mkSplit('col', mRow(mkMask('STORY'), mkMask('V_SHORT'), 'STORY', 'V_SHORT'), mkMask('V'), 0.5),
  // 69. H + STORY stivuite stânga | V centrat dreapta
  () => mkSplit('col', mRow(mkMask('H'), mkMask('STORY'), 'H', 'STORY'), mkMask('V'), 0.5),

  // --- 3 forme diferite per pagină (toate mask) ---
  // 70. S centrat stânga | V_SHORT centrat centru | STORY centrat dreapta
  () => mkSplit('col', mkMask('S'), mkSplit('col', mkMask('V_SHORT'), mkMask('STORY'), 0.5), 0.33),
  // 71. STORY centrat stânga | S centrat centru | V_LONG centrat dreapta
  () => mkSplit('col', mkMask('STORY'), mkSplit('col', mkMask('S'), mkMask('V_LONG'), 0.5), 0.33),
  // 72. V_LONG centrat stânga | STORY centrat centru | S centrat dreapta
  () => mkSplit('col', mkMask('V_LONG'), mkSplit('col', mkMask('STORY'), mkMask('S'), 0.5), 0.33),
  // 73. V_SHORT centrat stânga | S centrat centru | V centrat dreapta
  () => mkSplit('col', mkMask('V_SHORT'), mkSplit('col', mkMask('S'), mkMask('V'), 0.48), 0.35),
  // 74. V centrat stânga | STORY centrat centru | V_SHORT centrat dreapta
  () => mkSplit('col', mkMask('V'), mkSplit('col', mkMask('STORY'), mkMask('V_SHORT'), 0.45), 0.38),

  // --- V_LONG stânga + mixuri dreapta ---
  // 75. V_LONG centrat stânga | S + V_SHORT stivuite dreapta
  () => mkSplit('col', mkMask('V_LONG'), mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), 0.5),
  // 76. V_LONG centrat stânga | H + V stivuite dreapta
  () => mkSplit('col', mkMask('V_LONG'), mRow(mkMask('H'), mkMask('V'), 'H', 'V'), 0.5),
  // 77. S + V_SHORT stivuite stânga | V_LONG centrat dreapta
  () => mkSplit('col', mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), mkMask('V_LONG'), 0.5),

  // --- Asimetric mask (hero mai mare) ---
  // 78. V hero 60% centrat | S + STORY stivuite mic dreapta
  () => mkSplit('col', mkMask('V'), mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), 0.6),
  // 79. S + STORY stivuite mic stânga | V hero 60% centrat
  () => mkSplit('col', mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), mkMask('V'), 0.4),
  // 80. V_LONG hero 58% centrat | H + S stivuite dreapta
  () => mkSplit('col', mkMask('V_LONG'), mRow(mkMask('H'), mkMask('S'), 'H', 'S'), 0.58),
  // 81. H + S stivuite stânga | V_LONG hero 58% centrat
  () => mkSplit('col', mRow(mkMask('H'), mkMask('S'), 'H', 'S'), mkMask('V_LONG'), 0.42),
  // 82. STORY hero stânga | V + S stivuite dreapta asimetric
  () => mkSplit('col', mkMask('STORY'), mRow(mkMask('V'), mkMask('S'), 'V', 'S'), 0.42),
  // 83. V + S stivuite stânga asimetric | STORY hero dreapta
  () => mkSplit('col', mRow(mkMask('V'), mkMask('S'), 'V', 'S'), mkMask('STORY'), 0.58),
  // 84. V_SHORT hero 55% | STORY + H stivuite dreapta
  () => mkSplit('col', mkMask('V_SHORT'), mRow(mkMask('STORY'), mkMask('H'), 'STORY', 'H'), 0.55),
  // 85. STORY + H stivuite stânga | V_SHORT hero 55%
  () => mkSplit('col', mRow(mkMask('STORY'), mkMask('H'), 'STORY', 'H'), mkMask('V_SHORT'), 0.45),

  // ═══ MASK CONSTRUCTOR — câte 2-3 de același format combinat ═══

  // --- 2x V_LONG + 1x altul ---
  // 86. 2x V_LONG stivuite stânga | 1x S dreapta
  () => mkSplit('col', mRow(mkMask('V_LONG'), mkMask('V_LONG'), 'V_LONG', 'V_LONG'), mkMask('S'), 0.5),
  // 87. 1x S stânga | 2x V_LONG stivuite dreapta
  () => mkSplit('col', mkMask('S'), mRow(mkMask('V_LONG'), mkMask('V_LONG'), 'V_LONG', 'V_LONG'), 0.5),
  // 88. 2x V_LONG stivuite stânga | 1x V_SHORT dreapta
  () => mkSplit('col', mRow(mkMask('V_LONG'), mkMask('V_LONG'), 'V_LONG', 'V_LONG'), mkMask('V_SHORT'), 0.5),
  // 89. 1x V_SHORT stânga | 2x V_LONG stivuite dreapta
  () => mkSplit('col', mkMask('V_SHORT'), mRow(mkMask('V_LONG'), mkMask('V_LONG'), 'V_LONG', 'V_LONG'), 0.5),
  // 90. 2x V_LONG stivuite stânga | 1x STORY dreapta
  () => mkSplit('col', mRow(mkMask('V_LONG'), mkMask('V_LONG'), 'V_LONG', 'V_LONG'), mkMask('STORY'), 0.5),
  // 91. 1x STORY stânga | 2x V_LONG stivuite dreapta
  () => mkSplit('col', mkMask('STORY'), mRow(mkMask('V_LONG'), mkMask('V_LONG'), 'V_LONG', 'V_LONG'), 0.5),

  // --- 2x S + 1x altul ---
  // 92. 2x S stivuite stânga | 1x V dreapta
  () => mkSplit('col', mRow(mkMask('S'), mkMask('S'), 'S', 'S'), mkMask('V'), 0.5),
  // 93. 1x V stânga | 2x S stivuite dreapta
  () => mkSplit('col', mkMask('V'), mRow(mkMask('S'), mkMask('S'), 'S', 'S'), 0.5),
  // 94. 2x S stivuite stânga | 1x STORY dreapta
  () => mkSplit('col', mRow(mkMask('S'), mkMask('S'), 'S', 'S'), mkMask('STORY'), 0.5),
  // 95. 1x STORY stânga | 2x S stivuite dreapta
  () => mkSplit('col', mkMask('STORY'), mRow(mkMask('S'), mkMask('S'), 'S', 'S'), 0.5),
  // 96. 2x S stivuite stânga | 1x V_LONG dreapta
  () => mkSplit('col', mRow(mkMask('S'), mkMask('S'), 'S', 'S'), mkMask('V_LONG'), 0.5),
  // 97. 1x V_LONG stânga | 2x S stivuite dreapta
  () => mkSplit('col', mkMask('V_LONG'), mRow(mkMask('S'), mkMask('S'), 'S', 'S'), 0.5),

  // --- 2x V_SHORT + 1x altul ---
  // 98. 2x V_SHORT stivuite stânga | 1x S dreapta
  () => mkSplit('col', mRow(mkMask('V_SHORT'), mkMask('V_SHORT'), 'V_SHORT', 'V_SHORT'), mkMask('S'), 0.5),
  // 99. 1x S stânga | 2x V_SHORT stivuite dreapta
  () => mkSplit('col', mkMask('S'), mRow(mkMask('V_SHORT'), mkMask('V_SHORT'), 'V_SHORT', 'V_SHORT'), 0.5),
  // 100. 2x V_SHORT stivuite stânga | 1x STORY dreapta
  () => mkSplit('col', mRow(mkMask('V_SHORT'), mkMask('V_SHORT'), 'V_SHORT', 'V_SHORT'), mkMask('STORY'), 0.5),
  // 101. 1x STORY stânga | 2x V_SHORT stivuite dreapta
  () => mkSplit('col', mkMask('STORY'), mRow(mkMask('V_SHORT'), mkMask('V_SHORT'), 'V_SHORT', 'V_SHORT'), 0.5),
  // 102. 2x V_SHORT stivuite stânga | 1x V dreapta
  () => mkSplit('col', mRow(mkMask('V_SHORT'), mkMask('V_SHORT'), 'V_SHORT', 'V_SHORT'), mkMask('V'), 0.5),
  // 103. 1x V stânga | 2x V_SHORT stivuite dreapta
  () => mkSplit('col', mkMask('V'), mRow(mkMask('V_SHORT'), mkMask('V_SHORT'), 'V_SHORT', 'V_SHORT'), 0.5),

  // --- 2x STORY + 1x altul ---
  // 104. 2x STORY stivuite stânga | 1x S dreapta
  () => mkSplit('col', mRow(mkMask('STORY'), mkMask('STORY'), 'STORY', 'STORY'), mkMask('S'), 0.5),
  // 105. 1x S stânga | 2x STORY stivuite dreapta
  () => mkSplit('col', mkMask('S'), mRow(mkMask('STORY'), mkMask('STORY'), 'STORY', 'STORY'), 0.5),
  // 106. 2x STORY stivuite stânga | 1x V_SHORT dreapta
  () => mkSplit('col', mRow(mkMask('STORY'), mkMask('STORY'), 'STORY', 'STORY'), mkMask('V_SHORT'), 0.5),
  // 107. 1x V_SHORT stânga | 2x STORY stivuite dreapta
  () => mkSplit('col', mkMask('V_SHORT'), mRow(mkMask('STORY'), mkMask('STORY'), 'STORY', 'STORY'), 0.5),

  // --- 2x V + 1x altul ---
  // 108. 2x V stivuite stânga | 1x S dreapta
  () => mkSplit('col', mRow(mkMask('V'), mkMask('V'), 'V', 'V'), mkMask('S'), 0.5),
  // 109. 1x S stânga | 2x V stivuite dreapta
  () => mkSplit('col', mkMask('S'), mRow(mkMask('V'), mkMask('V'), 'V', 'V'), 0.5),
  // 110. 2x V stivuite stânga | 1x STORY dreapta
  () => mkSplit('col', mRow(mkMask('V'), mkMask('V'), 'V', 'V'), mkMask('STORY'), 0.5),
  // 111. 1x STORY stânga | 2x V stivuite dreapta
  () => mkSplit('col', mkMask('STORY'), mRow(mkMask('V'), mkMask('V'), 'V', 'V'), 0.5),

  // --- 2x H + 1x altul ---
  // 112. 2x H stivuite stânga | 1x V dreapta
  () => mkSplit('col', mRow(mkMask('H'), mkMask('H'), 'H', 'H'), mkMask('V'), 0.5),
  // 113. 1x V stânga | 2x H stivuite dreapta
  () => mkSplit('col', mkMask('V'), mRow(mkMask('H'), mkMask('H'), 'H', 'H'), 0.5),
  // 114. 2x H stivuite stânga | 1x STORY dreapta
  () => mkSplit('col', mRow(mkMask('H'), mkMask('H'), 'H', 'H'), mkMask('STORY'), 0.5),
  // 115. 1x STORY stânga | 2x H stivuite dreapta
  () => mkSplit('col', mkMask('STORY'), mRow(mkMask('H'), mkMask('H'), 'H', 'H'), 0.5),
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

  // ═══ 50 VARIANTE NOI — toate cu cluster stivuit (row nested), zero bețe ═══

  // --- HERO STÂNGA + CLUSTER STIVUIT DREAPTA ---
  // 1. V hero 55% + V_SHORT peste S dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.55),
  // 2. V hero 60% + H peste V_SHORT dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), 0.60),
  // 3. V hero 48% + S peste H dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), 0.48),
  // 4. V_LONG hero 52% + V_SHORT peste S dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.52),
  // 5. V hero 58% + S peste V_SHORT dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.58),
  // 6. V hero 62% + H peste S dreapta
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.62),
  // 7. V_LONG hero 45% + H peste V_SHORT dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), 0.45),
  // 8. V hero 65% + 3 S stivuite micro dreapta
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.33), 0.65),
  // 9. V hero 55% + H peste S + V_SHORT col dreapta
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mkLeaf('V_SHORT'), 0.55), 0.55),
  // 10. V_LONG hero 50% + S peste V_SHORT + V_SHORT col dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkLeaf('V_SHORT'), 0.55), 0.50),

  // --- HERO DREAPTA + CLUSTER STIVUIT STÂNGA ---
  // 11. V_SHORT peste S stânga + V hero 58% dreapta
  () => mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkLeaf('V'), 0.42),
  // 12. H peste V_SHORT stânga + V hero 60% dreapta
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), mkLeaf('V'), 0.40),
  // 13. S peste H stânga + V_LONG hero 55% dreapta
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mkLeaf('V_LONG'), 0.45),
  // 14. V_SHORT peste H stânga + V hero 62% dreapta
  () => mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), mkLeaf('V'), 0.38),
  // 15. S peste V_SHORT stânga + V_LONG hero 52% dreapta
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkLeaf('V_LONG'), 0.48),
  // 16. 3 S stivuite stânga + V hero 58% dreapta
  () => mkSplit('col', mkSplit('row', mkLeaf('S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.33), mkLeaf('V'), 0.42),
  // 17. H peste S stânga + V_SHORT col + V hero dreapta
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mkSplit('col', mkLeaf('V_SHORT'), mkLeaf('V'), 0.42), 0.35),
  // 18. V_SHORT + S stivuite stânga + V_LONG hero dreapta
  () => mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkLeaf('V_LONG'), 0.38),
  // 19. S + V_SHORT stivuite + V_SHORT col stânga + V hero dreapta
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkLeaf('V_SHORT'), 0.55), mkLeaf('V'), 0.45),
  // 20. H peste S stânga + V_LONG hero 55% dreapta
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mkLeaf('V_LONG'), 0.45),

  // --- HERO CENTRU + CLUSTER LATERALE ---
  // 21. S stânga + V hero + H peste S cluster dreapta
  () => mkSplit('col', mkLeaf('S'), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.6), 0.18),
  // 22. V_SHORT stânga + V_LONG hero + S peste V_SHORT dreapta
  () => mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.58), 0.25),
  // 23. S mic stânga + V hero centru + H peste V_SHORT dreapta
  () => mkSplit('col', mkLeaf('S'), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), 0.55), 0.20),
  // 24. V_LONG stânga + V hero centru + S peste H dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), 0.6), 0.25),
  // 25. S + V_SHORT stivuit stânga + V hero + V_SHORT dreapta
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkSplit('col', mkLeaf('V'), mkLeaf('V_SHORT'), 0.65), 0.30),

  // --- MOZAIC COMPLEX (FULL PAGE ~30%) ---
  // 26. V hero 55% + S peste S dreapta (FULL)
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.55),
  // 27. S peste S stânga + V hero 55% (FULL)
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V'), 0.45),
  // 28. V_LONG hero + H peste S dreapta (FULL)
  () => mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.50),
  // 29. S peste H stânga + V_LONG hero (FULL)
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mkLeaf('V_LONG'), 0.50),
  // 30. V hero + V_SHORT peste H dreapta (FULL)
  () => mkSplit('col', mkLeaf('V'), mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), 0.52),
  // 31. H peste V_SHORT stânga + V hero (FULL)
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), mkLeaf('V'), 0.48),
  // 32. V hero + 3 S stivuite (FULL)
  () => mkSplit('col', mkLeaf('V'), mkSplit('row', mkLeaf('S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.33), 0.55),
  // 33. 3 S stivuite + V hero (FULL)
  () => mkSplit('col', mkSplit('row', mkLeaf('S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.33), mkLeaf('V'), 0.45),
  // 34. V hero + H + S coloane + V_SHORT (FULL mozaic)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mkLeaf('V_SHORT'), 0.52), 0.45),
  // 35. V_SHORT + S peste H + V hero (FULL mozaic inv)
  () => mkSplit('col', mkSplit('col', mkLeaf('V_SHORT'), mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), 0.48), mkLeaf('V'), 0.55),

  // --- VARIANTE CU H NESTED PE PAGINĂ ---
  // 36. V hero + col(H peste V_SHORT, V_LONG)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), mkLeaf('V_LONG'), 0.48), 0.52),
  // 37. col(V_LONG, H peste S) + V hero
  () => mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.52), mkLeaf('V'), 0.48),
  // 38. V hero + col(S peste H, S peste V_SHORT)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.48), 0.45),
  // 39. col(V_SHORT peste H, S peste V_SHORT) + V hero
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.52), mkLeaf('V'), 0.52),
  // 40. V hero + col(V_SHORT, H peste S) dreapta
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V_SHORT'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.55), 0.48),

  // --- CLUSTER DUBLU (2 clustere stivuite) ---
  // 41. V hero + cluster dublu: (S peste S) + (H peste V_SHORT)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), 0.48), 0.48),
  // 42. cluster dublu stânga + V hero
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), 0.52), mkLeaf('V'), 0.52),
  // 43. V_LONG hero + cluster: (V_SHORT peste H) + S
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), mkLeaf('S'), 0.6), 0.50),
  // 44. S + cluster: (H peste S) + V_LONG hero
  () => mkSplit('col', mkSplit('col', mkLeaf('S'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.4), mkLeaf('V_LONG'), 0.50),
  // 45. V hero + cluster: (S peste V_SHORT) + (H peste S)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.52), 0.50),

  // --- FULL PAGE EDITORIAL ---
  // 46. V_LONG hero 45% + S peste S + V_SHORT (FULL)
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_SHORT'), 0.52), 0.45),
  // 47. V_SHORT + S peste S + V_LONG hero (FULL)
  () => mkSplit('col', mkSplit('col', mkLeaf('V_SHORT'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.48), mkLeaf('V_LONG'), 0.55),
  // 48. V hero + V_SHORT peste S + V_LONG (FULL 3 zone)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkLeaf('V_LONG'), 0.48), 0.38),
  // 49. V_LONG + S peste V_SHORT + V hero (FULL 3 zone)
  () => mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.52), mkLeaf('V'), 0.62),
  // 50. V hero + H peste V_LONG + S (FULL mozaic)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('H'), mkLeaf('V_LONG'), 'H', 'V_LONG'), mkLeaf('S'), 0.58), 0.42),

  // --- FORMAT FIX PER PAGINĂ (split 50%, 2 poze pe fiecare pagină cu mask fitting) ---
  // Pagina stânga: 2 formate stivuite, Pagina dreapta: 2 formate stivuite
  // 51. (S + V_SHORT) stânga | (V + STORY) dreapta — MASK FITTING
  () => mkSplit('col', mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), mRow(mkMask('V'), mkMask('STORY'), 'V', 'STORY'), 0.5),
  // 52. (V + S) stânga | (V_LONG + V_SHORT) dreapta
  () => mkSplit('col', mRow(mkMask('V'), mkMask('S'), 'V', 'S'), mRow(mkMask('V_LONG'), mkMask('V_SHORT'), 'V_LONG', 'V_SHORT'), 0.5),
  // 53. (STORY + S) stânga | (V + V_LONG) dreapta
  () => mkSplit('col', mRow(mkMask('STORY'), mkMask('S'), 'STORY', 'S'), mRow(mkMask('V'), mkMask('V_LONG'), 'V', 'V_LONG'), 0.5),
  // 54. (V_SHORT + STORY) stânga | (S + V) dreapta
  () => mkSplit('col', mRow(mkMask('V_SHORT'), mkMask('STORY'), 'V_SHORT', 'STORY'), mRow(mkMask('S'), mkMask('V'), 'S', 'V'), 0.5),
  // 55. (V_LONG + S) stânga | (STORY + V_SHORT) dreapta
  () => mkSplit('col', mRow(mkMask('V_LONG'), mkMask('S'), 'V_LONG', 'S'), mRow(mkMask('STORY'), mkMask('V_SHORT'), 'STORY', 'V_SHORT'), 0.5),
  // 56. (S + STORY) stânga | (V_SHORT + V_LONG) dreapta
  () => mkSplit('col', mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), mRow(mkMask('V_SHORT'), mkMask('V_LONG'), 'V_SHORT', 'V_LONG'), 0.5),
  // 57. (V + V_SHORT) stânga | (S + STORY) dreapta
  () => mkSplit('col', mRow(mkMask('V'), mkMask('V_SHORT'), 'V', 'V_SHORT'), mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), 0.5),
  // 58. (V_LONG + STORY) stânga | (V + S) dreapta
  () => mkSplit('col', mRow(mkMask('V_LONG'), mkMask('STORY'), 'V_LONG', 'STORY'), mRow(mkMask('V'), mkMask('S'), 'V', 'S'), 0.5),
  // 59. (STORY + V) stânga | (V_SHORT + S) dreapta
  () => mkSplit('col', mRow(mkMask('STORY'), mkMask('V'), 'STORY', 'V'), mRow(mkMask('V_SHORT'), mkMask('S'), 'V_SHORT', 'S'), 0.5),
  // 60. (S + V_LONG) stânga | (STORY + V) dreapta
  () => mkSplit('col', mRow(mkMask('S'), mkMask('V_LONG'), 'S', 'V_LONG'), mRow(mkMask('STORY'), mkMask('V'), 'STORY', 'V'), 0.5),

  // ═══ MASK — combinații cu GOLDEN și CARD (4 poze) ═══

  // --- 2x GOLDEN + 2x altul ---
  // 61. (GOLDEN + GOLDEN) stânga | (S + V_SHORT) dreapta
  () => mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('GOLDEN'), 'GOLDEN', 'GOLDEN'), mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), 0.5),
  // 62. (S + V_SHORT) stânga | (GOLDEN + GOLDEN) dreapta
  () => mkSplit('col', mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), mRow(mkMask('GOLDEN'), mkMask('GOLDEN'), 'GOLDEN', 'GOLDEN'), 0.5),
  // 63. (GOLDEN + GOLDEN) stânga | (STORY + V) dreapta
  () => mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('GOLDEN'), 'GOLDEN', 'GOLDEN'), mRow(mkMask('STORY'), mkMask('V'), 'STORY', 'V'), 0.5),
  // 64. (STORY + V) stânga | (GOLDEN + GOLDEN) dreapta
  () => mkSplit('col', mRow(mkMask('STORY'), mkMask('V'), 'STORY', 'V'), mRow(mkMask('GOLDEN'), mkMask('GOLDEN'), 'GOLDEN', 'GOLDEN'), 0.5),

  // --- 2x CARD + 2x altul ---
  // 65. (CARD + CARD) stânga | (S + STORY) dreapta
  () => mkSplit('col', mRow(mkMask('CARD'), mkMask('CARD'), 'CARD', 'CARD'), mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), 0.5),
  // 66. (S + STORY) stânga | (CARD + CARD) dreapta
  () => mkSplit('col', mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), mRow(mkMask('CARD'), mkMask('CARD'), 'CARD', 'CARD'), 0.5),
  // 67. (CARD + CARD) stânga | (V + V_LONG) dreapta
  () => mkSplit('col', mRow(mkMask('CARD'), mkMask('CARD'), 'CARD', 'CARD'), mRow(mkMask('V'), mkMask('V_LONG'), 'V', 'V_LONG'), 0.5),
  // 68. (V + V_LONG) stânga | (CARD + CARD) dreapta
  () => mkSplit('col', mRow(mkMask('V'), mkMask('V_LONG'), 'V', 'V_LONG'), mRow(mkMask('CARD'), mkMask('CARD'), 'CARD', 'CARD'), 0.5),

  // --- GOLDEN + CARD mixate ---
  // 69. (GOLDEN + CARD) stânga | (S + V_SHORT) dreapta
  () => mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('CARD'), 'GOLDEN', 'CARD'), mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), 0.5),
  // 70. (S + V_SHORT) stânga | (CARD + GOLDEN) dreapta
  () => mkSplit('col', mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), mRow(mkMask('CARD'), mkMask('GOLDEN'), 'CARD', 'GOLDEN'), 0.5),
  // 71. (GOLDEN + S) stânga | (CARD + STORY) dreapta
  () => mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('S'), 'GOLDEN', 'S'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 0.5),
  // 72. (CARD + STORY) stânga | (GOLDEN + S) dreapta
  () => mkSplit('col', mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), mRow(mkMask('GOLDEN'), mkMask('S'), 'GOLDEN', 'S'), 0.5),

  // --- GOLDEN/CARD + cluster hero ---
  // 73. GOLDEN hero stânga + (CARD + S + V_SHORT) cluster dreapta
  () => mkSplit('col', mkMask('GOLDEN'), mkSplit('col', mkMask('CARD'), mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), 0.45), 0.45),
  // 74. (S + V_SHORT + CARD) cluster stânga + GOLDEN hero dreapta
  () => mkSplit('col', mkSplit('col', mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), mkMask('CARD'), 0.55), mkMask('GOLDEN'), 0.55),
  // 75. CARD hero stânga + (GOLDEN + STORY + S) cluster dreapta
  () => mkSplit('col', mkMask('CARD'), mkSplit('col', mkMask('GOLDEN'), mRow(mkMask('STORY'), mkMask('S'), 'STORY', 'S'), 0.48), 0.42),
  // 76. (STORY + S + GOLDEN) cluster stânga + CARD hero dreapta
  () => mkSplit('col', mkSplit('col', mRow(mkMask('STORY'), mkMask('S'), 'STORY', 'S'), mkMask('GOLDEN'), 0.52), mkMask('CARD'), 0.58),

  // --- Toate 4 formate diferite ---
  // 77. (GOLDEN + CARD) stânga | (V + STORY) dreapta
  () => mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('CARD'), 'GOLDEN', 'CARD'), mRow(mkMask('V'), mkMask('STORY'), 'V', 'STORY'), 0.5),
  // 78. (V + STORY) stânga | (GOLDEN + CARD) dreapta
  () => mkSplit('col', mRow(mkMask('V'), mkMask('STORY'), 'V', 'STORY'), mRow(mkMask('GOLDEN'), mkMask('CARD'), 'GOLDEN', 'CARD'), 0.5),
  // 79. (GOLDEN + V_SHORT) stânga | (CARD + H) dreapta
  () => mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('V_SHORT'), 'GOLDEN', 'V_SHORT'), mRow(mkMask('CARD'), mkMask('H'), 'CARD', 'H'), 0.5),
  // 80. (CARD + H) stânga | (GOLDEN + V_SHORT) dreapta
  () => mkSplit('col', mRow(mkMask('CARD'), mkMask('H'), 'CARD', 'H'), mRow(mkMask('GOLDEN'), mkMask('V_SHORT'), 'GOLDEN', 'V_SHORT'), 0.5),
];

// ── 5 poze ──
const L5 = [
  // ═══ mkLeaf — CLUSTERE FULL SPACE ═══

  // --- HERO STÂNGA + 4 CLUSTER DREAPTA ---
  // 1. V hero 55% + (S+S stivuite) + (V_SHORT+S stivuite) dreapta
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.48), 0.55),
  // 2. V hero 52% + (H+V_SHORT stivuite) + (S+S stivuite) dreapta
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.52), 0.52),
  // 3. V_LONG hero 48% + (S+H stivuite) + (V_SHORT+S stivuite) dreapta
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.48), 0.48),
  // 4. V hero 58% + V_SHORT + (S+S stivuite) + V_LONG dreapta
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_LONG'), 0.5), 0.38), 0.58),
  // 5. V hero 60% + (STORY+S stivuite) + (V_SHORT+H stivuite) dreapta
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('STORY'), mkLeaf('S'), 'STORY', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), 0.48), 0.60),

  // --- HERO DREAPTA + 4 CLUSTER STÂNGA ---
  // 6. (S+S stivuite) + (V_SHORT+H stivuite) stânga + V hero 55% dreapta
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), 0.48), mkLeaf('V'), 0.45),
  // 7. (H+S stivuite) + (S+V_SHORT stivuite) stânga + V_LONG hero dreapta
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.52), mkLeaf('V_LONG'), 0.48),
  // 8. (STORY+V_SHORT stivuite) + (S+S stivuite) stânga + V hero 58%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('STORY'), mkLeaf('V_SHORT'), 'STORY', 'V_SHORT'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.48), mkLeaf('V'), 0.42),

  // --- HERO CENTRU + 2 LATERALE ---
  // 9. (S+V_SHORT stivuite) stânga + V hero centru + (H+S stivuite) dreapta
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.6), 0.3),
  // 10. (H+S stivuite) stânga + V hero centru + (V_SHORT+S stivuite) dreapta
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.6), 0.3),
  // 11. S stânga + V_LONG hero + (S+V_SHORT stivuite) + V_SHORT dreapta
  () => mkSplit('col', mkLeaf('S'), mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkLeaf('V_SHORT'), 0.48), 0.55), 0.18),

  // --- 3 COLOANE CU CLUSTERE ---
  // 12. V_LONG + (V_SHORT+S stivuite) + (S+V_SHORT stivuite)
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.48), 0.38),
  // 13. (S+H stivuite) + V hero + (V_SHORT+S stivuite)
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.58), 0.32),
  // 14. (V_SHORT+S stivuite) + (S+H stivuite) + V_LONG hero
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), 0.52), mkLeaf('V_LONG'), 0.55),

  // --- FULL PAGE ---
  // 15. V hero + (S+S stivuite) + (V_SHORT+H stivuite) FULL
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), 0.5), 0.50),
  // 16. (S+H stivuite) + (V_SHORT+S stivuite) + V hero FULL
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.5), mkLeaf('V'), 0.50),
  // 17. V hero + V_SHORT + (S+S stivuite) + V_LONG FULL
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_LONG'), 0.5), 0.4), 0.42),
  // 18. V_LONG + (S+S stivuite) + V_SHORT + V hero FULL
  () => mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_SHORT'), 0.5), 0.6), mkLeaf('V'), 0.58),

  // --- 42 VARIANTE NOI mkLeaf ---

  // HERO STÂNGA + CLUSTERE VARIATE
  // 19. V hero 55% + (V_SHORT+H stivuite) + (S+V_LONG stivuite) dreapta
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), 0.52), 0.55),
  // 20. V hero 58% + (H+S stivuite) + (V_SHORT+V_LONG stivuite) dreapta
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('V_LONG'), 'V_SHORT', 'V_LONG'), 0.48), 0.58),
  // 21. V_LONG hero 50% + (S+V_SHORT stivuite) + (H+S stivuite)
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.5), 0.50),
  // 22. V hero 52% + V_SHORT + (S+H stivuite) + V_LONG
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mkLeaf('V_LONG'), 0.48), 0.4), 0.52),
  // 23. V hero 62% + (S+S stivuite) + (V_SHORT+V_LONG stivuite) micro
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('V_LONG'), 'V_SHORT', 'V_LONG'), 0.5), 0.62),
  // 24. V_LONG hero 45% + (H+V_SHORT stivuite) + (S+S stivuite)
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.55), 0.45),
  // 25. V hero 48% + (V_LONG+S stivuite) + (H+V_SHORT stivuite)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('V_LONG'), mkLeaf('S'), 'V_LONG', 'S'), mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), 0.48), 0.48),

  // HERO DREAPTA + CLUSTERE VARIATE
  // 26. (V_SHORT+S stivuite) + (H+V_LONG stivuite) + V hero 55%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('H'), mkLeaf('V_LONG'), 'H', 'V_LONG'), 0.52), mkLeaf('V'), 0.45),
  // 27. (S+H stivuite) + (V_SHORT+S stivuite) + V_LONG hero 52%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.48), mkLeaf('V_LONG'), 0.48),
  // 28. (H+V_SHORT stivuite) + (S+V_LONG stivuite) + V hero 58%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), 0.5), mkLeaf('V'), 0.42),
  // 29. (S+S stivuite) + (V_SHORT+H stivuite) + V hero 55%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), 0.48), mkLeaf('V'), 0.45),
  // 30. (V_LONG+S stivuite) + (H+S stivuite) + V hero 52%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_LONG'), mkLeaf('S'), 'V_LONG', 'S'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.52), mkLeaf('V'), 0.48),

  // HERO CENTRU + LATERALE
  // 31. (S+V_SHORT stivuite) + V hero centru + (H+V_LONG stivuite)
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('H'), mkLeaf('V_LONG'), 'H', 'V_LONG'), 0.62), 0.28),
  // 32. (H+S stivuite) + V_LONG hero centru + (V_SHORT+S stivuite)
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.58), 0.3),
  // 33. (V_SHORT+H stivuite) + V hero centru + (S+V_LONG stivuite)
  () => mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), 0.6), 0.32),

  // 3 COLOANE CU CLUSTERE
  // 34. (S+H stivuite) + V hero + (V_SHORT+V_LONG stivuite)
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('V_SHORT'), mkLeaf('V_LONG'), 'V_SHORT', 'V_LONG'), 0.55), 0.3),
  // 35. (V_SHORT+S stivuite) + (H+V_LONG stivuite) + V hero
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('H'), mkLeaf('V_LONG'), 'H', 'V_LONG'), 0.5), mkLeaf('V'), 0.55),
  // 36. V hero + (S+V_SHORT stivuite) + (V_LONG+H stivuite)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mRow(mkLeaf('V_LONG'), mkLeaf('H'), 'V_LONG', 'H'), 0.5), 0.42),
  // 37. (H+S stivuite) + V_LONG + (V_SHORT+S stivuite)
  () => mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.55), 0.35),

  // FULL PAGE VARIATE
  // 38. V hero + (H+S stivuite) + (V_SHORT+V_LONG stivuite) FULL
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('V_LONG'), 'V_SHORT', 'V_LONG'), 0.5), 0.48),
  // 39. (H+S stivuite) + (V_SHORT+V_LONG stivuite) + V hero FULL
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('V_LONG'), 'V_SHORT', 'V_LONG'), 0.5), mkLeaf('V'), 0.52),
  // 40. V_LONG hero + (S+V_SHORT stivuite) + (H+S stivuite) FULL
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.48), 0.45),
  // 41. (S+V_SHORT stivuite) + (H+S stivuite) + V_LONG hero FULL
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), 0.52), mkLeaf('V_LONG'), 0.55),

  // CLUSTERE TRIPLE
  // 42. V hero + (S+V_SHORT stivuite) + (V_LONG+H stivuite) + S
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkSplit('col', mRow(mkLeaf('V_LONG'), mkLeaf('H'), 'V_LONG', 'H'), mkLeaf('S'), 0.55), 0.42), 0.45),
  // 43. S + (V_LONG+H stivuite) + (S+V_SHORT stivuite) + V hero
  () => mkSplit('col', mkSplit('col', mkLeaf('S'), mkSplit('col', mRow(mkLeaf('V_LONG'), mkLeaf('H'), 'V_LONG', 'H'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.45), 0.4), mkLeaf('V'), 0.55),

  // HERO + 4 CLUSTER COMPACT
  // 44. V hero 55% + 2 coloane x 2 stivuite
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mRow(mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 'V_LONG', 'V_SHORT'), 0.48), 0.55),
  // 45. 2 coloane x 2 stivuite + V hero 55%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mRow(mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 'V_LONG', 'V_SHORT'), 0.52), mkLeaf('V'), 0.45),
  // 46. V_LONG hero 48% + 2 coloane x 2 stivuite (mix diferit)
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), 0.52), 0.48),
  // 47. 2 coloane x 2 stivuite + V_LONG hero 48%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), 0.48), mkLeaf('V_LONG'), 0.52),

  // COMBINAȚII CU STORY
  // 48. V hero 52% + (STORY+S stivuite) + (V_SHORT+H stivuite)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('STORY'), mkLeaf('S'), 'STORY', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), 0.48), 0.52),
  // 49. (STORY+S stivuite) + (V_SHORT+H stivuite) + V hero 52%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('STORY'), mkLeaf('S'), 'STORY', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('H'), 'V_SHORT', 'H'), 0.52), mkLeaf('V'), 0.48),
  // 50. V_LONG hero 45% + (S+STORY stivuite) + (V_SHORT+S stivuite)
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('STORY'), 'S', 'STORY'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.48), 0.45),

  // MIXURI ASIMETRICE
  // 51. V hero 60% + V_SHORT + (S+H stivuite) + S
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mkLeaf('S'), 0.55), 0.42), 0.60),
  // 52. S + (S+H stivuite) + V_SHORT + V hero 60%
  () => mkSplit('col', mkSplit('col', mkLeaf('S'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), mkLeaf('V_SHORT'), 0.45), 0.38), mkLeaf('V'), 0.40),
  // 53. V hero 50% + (V_LONG+S stivuite) + (S+V_SHORT stivuite)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('V_LONG'), mkLeaf('S'), 'V_LONG', 'S'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.52), 0.50),
  // 54. (V_LONG+S stivuite) + (S+V_SHORT stivuite) + V hero 50%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_LONG'), mkLeaf('S'), 'V_LONG', 'S'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.48), mkLeaf('V'), 0.50),

  // HERO + 3 + 1 ACCENT
  // 55. V hero 48% + (H+S stivuite) + V_SHORT + V_LONG
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('H'), mkLeaf('S'), 'H', 'S'), mkSplit('col', mkLeaf('V_SHORT'), mkLeaf('V_LONG'), 0.48), 0.45), 0.48),
  // 56. V_LONG + V_SHORT + (S+H stivuite) + V hero 48%
  () => mkSplit('col', mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 0.52), mRow(mkLeaf('S'), mkLeaf('H'), 'S', 'H'), 0.55), mkLeaf('V'), 0.52),
  // 57. V hero 55% + (V_SHORT+S stivuite) + (V_LONG+H stivuite)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('V_LONG'), mkLeaf('H'), 'V_LONG', 'H'), 0.52), 0.55),
  // 58. (V_LONG+H stivuite) + (V_SHORT+S stivuite) + V hero 55%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_LONG'), mkLeaf('H'), 'V_LONG', 'H'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.48), mkLeaf('V'), 0.45),
  // 59. V hero 52% + (S+V_LONG stivuite) + (H+V_SHORT stivuite)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), 0.5), 0.52),
  // 60. (H+V_SHORT stivuite) + (S+V_LONG stivuite) + V hero 52%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('H'), mkLeaf('V_SHORT'), 'H', 'V_SHORT'), mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), 0.5), mkLeaf('V'), 0.48),

  // ═══ mkMask — FORMATE FIXE CU SPAȚIU ALB ═══

  // --- 3 stânga + 2 dreapta (format fix per pagină) ---
  // 19. (GOLDEN+S+V_SHORT stivuite) stânga | (CARD+STORY stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkMask('GOLDEN'), mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), 'GOLDEN', 'V_SHORT'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 0.5),
  // 20. (CARD+STORY stivuite) stânga | (GOLDEN+S+V_SHORT stivuite) dreapta
  () => mkSplit('col', mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), mkSplit('row', mkMask('GOLDEN'), mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), 'GOLDEN', 'V_SHORT'), 0.5),
  // 21. (S+S stivuite) stânga | (GOLDEN+CARD+STORY stivuite) dreapta
  () => mkSplit('col', mRow(mkMask('S'), mkMask('S'), 'S', 'S'), mkSplit('row', mkMask('GOLDEN'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 'GOLDEN', 'V_SHORT'), 0.5),
  // 22. (GOLDEN+CARD+STORY stivuite) stânga | (S+S stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkMask('GOLDEN'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 'GOLDEN', 'V_SHORT'), mRow(mkMask('S'), mkMask('S'), 'S', 'S'), 0.5),

  // --- 2 stânga + 3 dreapta ---
  // 23. (V+GOLDEN stivuite) stânga | (S+CARD+STORY stivuite) dreapta
  () => mkSplit('col', mRow(mkMask('V'), mkMask('GOLDEN'), 'V', 'GOLDEN'), mkSplit('row', mkMask('S'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 'S', 'V_SHORT'), 0.5),
  // 24. (S+CARD+STORY stivuite) stânga | (V+GOLDEN stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkMask('S'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 'S', 'V_SHORT'), mRow(mkMask('V'), mkMask('GOLDEN'), 'V', 'GOLDEN'), 0.5),

  // --- GOLDEN hero + 4 mask ---
  // 25. GOLDEN hero stânga + (S+V_SHORT stivuite) + (CARD+STORY stivuite) dreapta
  () => mkSplit('col', mkMask('GOLDEN'), mkSplit('col', mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 0.48), 0.45),
  // 26. (S+V_SHORT stivuite) + (CARD+STORY stivuite) stânga + GOLDEN hero dreapta
  () => mkSplit('col', mkSplit('col', mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 0.52), mkMask('GOLDEN'), 0.55),

  // --- CARD hero + 4 mask ---
  // 27. CARD hero stânga + (GOLDEN+S stivuite) + (V_SHORT+STORY stivuite) dreapta
  () => mkSplit('col', mkMask('CARD'), mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('S'), 'GOLDEN', 'S'), mRow(mkMask('V_SHORT'), mkMask('STORY'), 'V_SHORT', 'STORY'), 0.48), 0.42),
  // 28. (GOLDEN+S stivuite) + (V_SHORT+STORY stivuite) stânga + CARD hero dreapta
  () => mkSplit('col', mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('S'), 'GOLDEN', 'S'), mRow(mkMask('V_SHORT'), mkMask('STORY'), 'V_SHORT', 'STORY'), 0.52), mkMask('CARD'), 0.58),

  // --- 5 formate diferite ---
  // 29. GOLDEN stânga | V centru | (S+CARD+STORY stivuite) dreapta
  () => mkSplit('col', mkMask('GOLDEN'), mkSplit('col', mkMask('V'), mkSplit('row', mkMask('S'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 'S', 'V_SHORT'), 0.55), 0.3),
  // 30. (S+CARD+STORY stivuite) stânga | V centru | GOLDEN dreapta
  () => mkSplit('col', mkSplit('row', mkMask('S'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 'S', 'V_SHORT'), mkSplit('col', mkMask('V'), mkMask('GOLDEN'), 0.6), 0.4),

  // --- 2x același + 3x mix ---
  // 31. (GOLDEN+GOLDEN stivuite) stânga | (S+CARD+V_SHORT stivuite) dreapta
  () => mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('GOLDEN'), 'GOLDEN', 'GOLDEN'), mkSplit('row', mkMask('S'), mRow(mkMask('CARD'), mkMask('V_SHORT'), 'CARD', 'V_SHORT'), 'S', 'V_SHORT'), 0.5),
  // 32. (S+CARD+V_SHORT stivuite) stânga | (GOLDEN+GOLDEN stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkMask('S'), mRow(mkMask('CARD'), mkMask('V_SHORT'), 'CARD', 'V_SHORT'), 'S', 'V_SHORT'), mRow(mkMask('GOLDEN'), mkMask('GOLDEN'), 'GOLDEN', 'GOLDEN'), 0.5),
  // 33. (CARD+CARD stivuite) stânga | (GOLDEN+S+STORY stivuite) dreapta
  () => mkSplit('col', mRow(mkMask('CARD'), mkMask('CARD'), 'CARD', 'CARD'), mkSplit('row', mkMask('GOLDEN'), mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), 'GOLDEN', 'V_SHORT'), 0.5),
  // 34. (GOLDEN+S+STORY stivuite) stânga | (CARD+CARD stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkMask('GOLDEN'), mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), 'GOLDEN', 'V_SHORT'), mRow(mkMask('CARD'), mkMask('CARD'), 'CARD', 'CARD'), 0.5),

  // --- 2+3 mixuri variate ---
  // 35. (V+STORY stivuite) stânga | (GOLDEN+CARD+S stivuite) dreapta
  () => mkSplit('col', mRow(mkMask('V'), mkMask('STORY'), 'V', 'STORY'), mkSplit('row', mkMask('GOLDEN'), mRow(mkMask('CARD'), mkMask('S'), 'CARD', 'S'), 'GOLDEN', 'V_SHORT'), 0.5),
  // 36. (GOLDEN+CARD+S stivuite) stânga | (V+STORY stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkMask('GOLDEN'), mRow(mkMask('CARD'), mkMask('S'), 'CARD', 'S'), 'GOLDEN', 'V_SHORT'), mRow(mkMask('V'), mkMask('STORY'), 'V', 'STORY'), 0.5),
  // 37. (V_SHORT+H stivuite) stânga | (GOLDEN+S+CARD stivuite) dreapta
  () => mkSplit('col', mRow(mkMask('V_SHORT'), mkMask('H'), 'V_SHORT', 'H'), mkSplit('row', mkMask('GOLDEN'), mRow(mkMask('S'), mkMask('CARD'), 'S', 'CARD'), 'GOLDEN', 'V_SHORT'), 0.5),
  // 38. (GOLDEN+S+CARD stivuite) stânga | (V_SHORT+H stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkMask('GOLDEN'), mRow(mkMask('S'), mkMask('CARD'), 'S', 'CARD'), 'GOLDEN', 'V_SHORT'), mRow(mkMask('V_SHORT'), mkMask('H'), 'V_SHORT', 'H'), 0.5),

  // --- Asimetric hero mask ---
  // 39. V hero 55% + (GOLDEN+S stivuite) + (CARD+STORY stivuite) dreapta
  () => mkSplit('col', mkMask('V'), mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('S'), 'GOLDEN', 'S'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 0.48), 0.55),
  // 40. (GOLDEN+S stivuite) + (CARD+STORY stivuite) stânga + V hero 55%
  () => mkSplit('col', mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('S'), 'GOLDEN', 'S'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 0.52), mkMask('V'), 0.45),

  // --- STORY hero + 4 mask ---
  // 41. STORY hero 40% + (GOLDEN+S stivuite) + (CARD+V_SHORT stivuite) dreapta
  () => mkSplit('col', mkMask('STORY'), mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('S'), 'GOLDEN', 'S'), mRow(mkMask('CARD'), mkMask('V_SHORT'), 'CARD', 'V_SHORT'), 0.48), 0.40),
  // 42. (GOLDEN+S stivuite) + (CARD+V_SHORT stivuite) stânga + STORY hero dreapta
  () => mkSplit('col', mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('S'), 'GOLDEN', 'S'), mRow(mkMask('CARD'), mkMask('V_SHORT'), 'CARD', 'V_SHORT'), 0.52), mkMask('STORY'), 0.60),

  // --- V_LONG hero mask + 4 ---
  // 43. V_LONG hero 48% + (S+STORY stivuite) + (GOLDEN+CARD stivuite) dreapta
  () => mkSplit('col', mkMask('V_LONG'), mkSplit('col', mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), mRow(mkMask('GOLDEN'), mkMask('CARD'), 'GOLDEN', 'CARD'), 0.48), 0.48),
  // 44. (S+STORY stivuite) + (GOLDEN+CARD stivuite) stânga + V_LONG hero dreapta
  () => mkSplit('col', mkSplit('col', mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), mRow(mkMask('GOLDEN'), mkMask('CARD'), 'GOLDEN', 'CARD'), 0.52), mkMask('V_LONG'), 0.52),

  // --- 3+2 cu H ---
  // 45. (H+S+V_SHORT stivuite) stânga | (GOLDEN+CARD stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkMask('H'), mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), 'H', 'V_SHORT'), mRow(mkMask('GOLDEN'), mkMask('CARD'), 'GOLDEN', 'CARD'), 0.5),
  // 46. (GOLDEN+CARD stivuite) stânga | (H+S+V_SHORT stivuite) dreapta
  () => mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('CARD'), 'GOLDEN', 'CARD'), mkSplit('row', mkMask('H'), mRow(mkMask('S'), mkMask('V_SHORT'), 'S', 'V_SHORT'), 'H', 'V_SHORT'), 0.5),

  // --- 2x2 + 1 hero ---
  // 47. (GOLDEN+S stivuite) + (CARD+V_SHORT stivuite) | V hero centru mare
  () => mkSplit('col', mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('S'), 'GOLDEN', 'S'), mRow(mkMask('CARD'), mkMask('V_SHORT'), 'CARD', 'V_SHORT'), 0.5), mkMask('V'), 0.45),
  // 48. V hero centru mare | (GOLDEN+S stivuite) + (CARD+V_SHORT stivuite)
  () => mkSplit('col', mkMask('V'), mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('S'), 'GOLDEN', 'S'), mRow(mkMask('CARD'), mkMask('V_SHORT'), 'CARD', 'V_SHORT'), 0.5), 0.55),

  // --- Combinații ritmate ---
  // 49. (S+GOLDEN stivuite) + STORY centru + (CARD+V_SHORT stivuite) dreapta
  () => mkSplit('col', mRow(mkMask('S'), mkMask('GOLDEN'), 'S', 'GOLDEN'), mkSplit('col', mkMask('STORY'), mRow(mkMask('CARD'), mkMask('V_SHORT'), 'CARD', 'V_SHORT'), 0.45), 0.35),
  // 50. (CARD+V_SHORT stivuite) stânga + STORY centru + (S+GOLDEN stivuite) dreapta
  () => mkSplit('col', mRow(mkMask('CARD'), mkMask('V_SHORT'), 'CARD', 'V_SHORT'), mkSplit('col', mkMask('STORY'), mRow(mkMask('S'), mkMask('GOLDEN'), 'S', 'GOLDEN'), 0.55), 0.35),

  // --- Full page mask ---
  // 51. (V+GOLDEN stivuite) + CARD centru + (S+STORY stivuite) FULL
  () => mkSplit('col', mRow(mkMask('V'), mkMask('GOLDEN'), 'V', 'GOLDEN'), mkSplit('col', mkMask('CARD'), mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), 0.5), 0.38),
  // 52. (S+STORY stivuite) + CARD centru + (V+GOLDEN stivuite) FULL
  () => mkSplit('col', mRow(mkMask('S'), mkMask('STORY'), 'S', 'STORY'), mkSplit('col', mkMask('CARD'), mRow(mkMask('V'), mkMask('GOLDEN'), 'V', 'GOLDEN'), 0.5), 0.38),
  // 53. GOLDEN hero + (S+S stivuite) + (CARD+STORY stivuite) FULL
  () => mkSplit('col', mkMask('GOLDEN'), mkSplit('col', mRow(mkMask('S'), mkMask('S'), 'S', 'S'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 0.5), 0.38),
  // 54. (S+S stivuite) + (CARD+STORY stivuite) + GOLDEN hero FULL
  () => mkSplit('col', mkSplit('col', mRow(mkMask('S'), mkMask('S'), 'S', 'S'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 0.5), mkMask('GOLDEN'), 0.62),

  // --- Combinații cu V_LONG + GOLDEN ---
  // 55. (V_LONG+GOLDEN stivuite) stânga | (S+CARD+STORY stivuite) dreapta
  () => mkSplit('col', mRow(mkMask('V_LONG'), mkMask('GOLDEN'), 'V_LONG', 'GOLDEN'), mkSplit('row', mkMask('S'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 'S', 'V_SHORT'), 0.5),
  // 56. (S+CARD+STORY stivuite) stânga | (V_LONG+GOLDEN stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkMask('S'), mRow(mkMask('CARD'), mkMask('STORY'), 'CARD', 'STORY'), 'S', 'V_SHORT'), mRow(mkMask('V_LONG'), mkMask('GOLDEN'), 'V_LONG', 'GOLDEN'), 0.5),

  // --- 3 coloane mask ---
  // 57. GOLDEN stânga | CARD centru | (S+STORY+V_SHORT stivuite) dreapta
  () => mkSplit('col', mkMask('GOLDEN'), mkSplit('col', mkMask('CARD'), mkSplit('row', mkMask('S'), mRow(mkMask('STORY'), mkMask('V_SHORT'), 'STORY', 'V_SHORT'), 'S', 'V_SHORT'), 0.45), 0.3),
  // 58. (S+STORY+V_SHORT stivuite) stânga | CARD centru | GOLDEN dreapta
  () => mkSplit('col', mkSplit('row', mkMask('S'), mRow(mkMask('STORY'), mkMask('V_SHORT'), 'STORY', 'V_SHORT'), 'S', 'V_SHORT'), mkSplit('col', mkMask('CARD'), mkMask('GOLDEN'), 0.55), 0.4),
  // 59. V_SHORT stânga | (GOLDEN+CARD stivuite) centru | STORY dreapta
  () => mkSplit('col', mkMask('V_SHORT'), mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('CARD'), 'GOLDEN', 'CARD'), mkMask('STORY'), 0.55), 0.25),
  // 60. STORY stânga | (GOLDEN+CARD stivuite) centru | V_SHORT dreapta
  () => mkSplit('col', mkMask('STORY'), mkSplit('col', mRow(mkMask('GOLDEN'), mkMask('CARD'), 'GOLDEN', 'CARD'), mkMask('V_SHORT'), 0.55), 0.25),
];

// ── 6 poze ──
const L6 = [
  // ═══ HERO STÂNGA + 5 CLUSTER DREAPTA ═══
  // 1. V hero 52% + (S+V_SHORT stivuite) + (H+S stivuite) + V_LONG
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_LONG'), 0.5), 0.42), 0.52),
  // 2. V hero 55% + (V_SHORT+S stivuite) + (S+H stivuite) + V_SHORT
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_SHORT'), 0.48), 0.42), 0.55),
  // 3. V_LONG hero 48% + (S+S stivuite) + (V_SHORT+H stivuite) + S
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkLeaf('S'), 0.52), 0.45), 0.48),
  // 4. V hero 58% + (H+V_SHORT stivuite) + (S+V_LONG stivuite) + S
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), mkLeaf('S'), 0.55), 0.4), 0.58),
  // 5. V hero 50% + 2col x 2stivuite + V_LONG
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.5), mkLeaf('V_LONG'), 0.6), 0.50),

  // ═══ HERO DREAPTA + 5 CLUSTER STÂNGA ═══
  // 6. (S+V_SHORT stivuite) + (H+S stivuite) + V_LONG + V hero 52%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_LONG'), 0.5), 0.42), mkLeaf('V'), 0.48),
  // 7. (V_SHORT+S stivuite) + (S+H stivuite) + V_SHORT + V hero 55%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_SHORT'), 0.48), 0.42), mkLeaf('V'), 0.45),
  // 8. (S+S stivuite) + (V_SHORT+H stivuite) + S + V_LONG hero 48%
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkLeaf('S'), 0.52), 0.45), mkLeaf('V_LONG'), 0.52),
  // 9. 2col x 2stivuite + V_LONG + V hero 50%
  () => mkSplit('col', mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.5), mkLeaf('V_LONG'), 0.6), mkLeaf('V'), 0.50),
  // 10. (H+S stivuite) + (V_SHORT+V_LONG stivuite) + S + V hero
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('V_LONG'), 'V_SHORT', 'V_LONG'), mkLeaf('S'), 0.55), 0.45), mkLeaf('V'), 0.45),

  // ═══ 3 COLOANE CU CLUSTERE ═══
  // 11. (S+V_SHORT stivuite) + V hero + (H+S stivuite) + (V_LONG+V_SHORT stivuite)
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 'V_LONG', 'V_SHORT'), 0.48), 0.5), 0.28),
  // 12. (H+S stivuite) + (V_SHORT+S stivuite) + V hero + (V_LONG+S stivuite)
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.5), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('V_LONG'), mkLeaf('S'), 'V_LONG', 'S'), 0.6), 0.42),
  // 13. V_LONG + (S+V_SHORT stivuite) + (S+H stivuite) + V + S
  () => mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.55), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkSplit('col', mkLeaf('V'), mkLeaf('S'), 0.55), 0.45), 0.42),
  // 14. (V_SHORT+H stivuite) + V hero + (S+S stivuite) + V_LONG
  () => mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_LONG'), 0.48), 0.55), 0.3),
  // 15. V + (S+V_SHORT stivuite) + V_LONG + (H+S stivuite)
  () => mkSplit('col', mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.55), mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.55), 0.48),

  // ═══ 2 COLOANE x 3 STIVUITE ═══
  // 16. (S+V_SHORT+H stivuite) stânga + (V_LONG+S+V_SHORT stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkLeaf('S'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 'S', 'V_SHORT'), mkSplit('row', mkLeaf('V_LONG'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 'V_LONG', 'V_SHORT'), 0.48),
  // 17. (V_LONG+S+V_SHORT stivuite) stânga + (S+H+V_SHORT stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkLeaf('V_LONG'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 'V_LONG', 'V_SHORT'), mkSplit('row', mkLeaf('S'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 'S', 'V_SHORT'), 0.52),
  // 18. (H+V_SHORT+S stivuite) stânga + (V+S+V_LONG stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkLeaf('S'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 'S', 'V_SHORT'), mkSplit('row', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), 'V', 'V_SHORT'), 0.48),
  // 19. (V+S+H stivuite) stânga + (V_SHORT+V_LONG+S stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 'V', 'V_SHORT'), mkSplit('row', mkLeaf('V_SHORT'), mRow(mkLeaf('V_LONG'), mkLeaf('S'), 'V_LONG', 'S'), 'V_SHORT', 'V_SHORT'), 0.52),
  // 20. (S+V_LONG+V_SHORT stivuite) stânga + (H+S+V stivuite) dreapta
  () => mkSplit('col', mkSplit('row', mkLeaf('S'), mRow(mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 'V_LONG', 'V_SHORT'), 'S', 'V_SHORT'), mkSplit('row', mkLeaf('S'), mRow(mkLeaf('S'), mkLeaf('V'), 'S', 'V'), 'S', 'V_SHORT'), 0.48),

  // ═══ HERO CENTRU + 2 LATERALE ═══
  // 21. (S+H stivuite) + V hero centru + (V_SHORT+S stivuite) + (V_LONG+S stivuite)
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('V_LONG'), mkLeaf('S'), 'V_LONG', 'S'), 0.5), 0.55), 0.28),
  // 22. (V_SHORT+S stivuite) + (S+H stivuite) + V_LONG hero + (S+V_SHORT stivuite)
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.5), mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.6), 0.42),
  // 23. S + (V_SHORT+H stivuite) + V hero + (S+V_LONG stivuite)
  () => mkSplit('col', mkSplit('col', mkLeaf('S'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.42), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), 0.58), 0.4),
  // 24. (H+V_SHORT stivuite) + V hero + S + (V_LONG+S stivuite)
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('S'), mRow(mkLeaf('V_LONG'), mkLeaf('S'), 'V_LONG', 'S'), 0.48), 0.55), 0.3),
  // 25. (S+S stivuite) + V_LONG hero + (V_SHORT+H stivuite) + V
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkLeaf('V'), 0.45), 0.52), 0.3),

  // ═══ FULL PAGE ═══
  // 26. V hero + (S+V_SHORT stivuite) + (H+S stivuite) + (V_LONG+V_SHORT stivuite) FULL
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 'V_LONG', 'V_SHORT'), 0.5), 0.42), 0.45),
  // 27. (V_LONG+V_SHORT stivuite) + (H+S stivuite) + (S+V_SHORT stivuite) + V hero FULL
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 'V_LONG', 'V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.5), 0.42), mkLeaf('V'), 0.55),
  // 28. 3col x 2stivuite FULL
  () => mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 'V_LONG', 'V_SHORT'), 0.48), 0.35),
  // 29. 3col x 2stivuite FULL invers
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 'V_LONG', 'V_SHORT'), 0.52), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.65),
  // 30. V hero + (S+H stivuite) col + (V_SHORT+S stivuite) col + V_LONG FULL
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkLeaf('V_LONG'), 0.5), 0.4), 0.42),

  // ═══ MIXURI VARIATE ═══
  // 31. V hero 55% + (STORY+S stivuite) + (V_SHORT+H stivuite) + V_LONG
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('STORY'), mkLeaf('S'), 'STORY', 'S'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkLeaf('V_LONG'), 0.5), 0.42), 0.55),
  // 32. V_LONG + (V_SHORT+H stivuite) + (STORY+S stivuite) + V hero 55%
  () => mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('STORY'), mkLeaf('S'), 'STORY', 'S'), 0.5), 0.42), mkLeaf('V'), 0.45),
  // 33. (S+STORY stivuite) + V hero + (V_SHORT+H stivuite) + V_LONG
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('STORY'), 'S', 'STORY'), mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkLeaf('V_LONG'), 0.48), 0.55), 0.3),
  // 34. V_LONG + (H+V_SHORT stivuite) + V hero + (STORY+S stivuite)
  () => mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.55), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('STORY'), mkLeaf('S'), 'STORY', 'S'), 0.6), 0.45),
  // 35. V hero + V_SHORT + (S+H stivuite) + (V_LONG+S stivuite)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_LONG'), mkLeaf('S'), 'V_LONG', 'S'), 0.5), 0.38), 0.48),

  // ═══ HERO + 2col x 2stivuite + 1 ACCENT ═══
  // 36. V hero 52% + 2col x 2stivuite + V_LONG accent
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.5), mkLeaf('V_LONG'), 0.6), 0.52),
  // 37. V_LONG accent + 2col x 2stivuite + V hero 52%
  () => mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.5), 0.4), mkLeaf('V'), 0.48),
  // 38. V hero + (V_SHORT+S stivuite) + (S+V_LONG stivuite) + (H+S stivuite)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.5), 0.4), 0.45),
  // 39. (H+S stivuite) + (S+V_LONG stivuite) + (V_SHORT+S stivuite) + V hero
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.5), 0.4), mkLeaf('V'), 0.55),
  // 40. V_LONG hero + (S+S stivuite) + V_SHORT + (H+S stivuite)
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkSplit('col', mkLeaf('V_SHORT'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.52), 0.45), 0.45),

  // ═══ COMBINAȚII CU STORY + H ═══
  // 41. V hero + (STORY+V_SHORT stivuite) + (S+H stivuite) + V_LONG
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('STORY'), mkLeaf('V_SHORT'), 'STORY', 'V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_LONG'), 0.48), 0.42), 0.48),
  // 42. V_LONG + (S+H stivuite) + (STORY+V_SHORT stivuite) + V hero
  () => mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('STORY'), mkLeaf('V_SHORT'), 'STORY', 'V_SHORT'), 0.52), 0.45), mkLeaf('V'), 0.52),
  // 43. (S+STORY stivuite) + V hero + V_SHORT + (H+V_LONG stivuite)
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('STORY'), 'S', 'STORY'), mkSplit('col', mkLeaf('V'), mkSplit('col', mkLeaf('V_SHORT'), mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), 0.48), 0.55), 0.28),
  // 44. (H+V_LONG stivuite) + V_SHORT + V hero + (STORY+S stivuite)
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), mkSplit('col', mkLeaf('V_SHORT'), mkLeaf('V'), 0.42), 0.42), mRow(mkLeaf('STORY'), mkLeaf('S'), 'STORY', 'S'), 0.72),
  // 45. V hero + (V_LONG+H stivuite) + (S+STORY stivuite) + V_SHORT
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('V_LONG'), mkLeaf('S'), 'V_LONG', 'S'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('STORY'), 'S', 'STORY'), mkLeaf('V_SHORT'), 0.55), 0.42), 0.48),

  // ═══ MOZAIC COMPLEX ═══
  // 46. V + (S+V_SHORT stivuite) + V_LONG + (H+S stivuite)
  () => mkSplit('col', mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.55), mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.55), 0.48),
  // 47. (H+S stivuite) + V_LONG + (V_SHORT+S stivuite) + V
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_LONG'), 0.45), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkLeaf('V'), 0.45), 0.52),
  // 48. V_LONG + V + (S+V_SHORT stivuite) + (H+S stivuite)
  () => mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mkLeaf('V'), 0.48), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.52), 0.52),
  // 49. (S+H stivuite) + (V_SHORT+S stivuite) + V + V_LONG
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.48), mkSplit('col', mkLeaf('V'), mkLeaf('V_LONG'), 0.52), 0.48),
  // 50. V + (H+V_SHORT stivuite) + (S+S stivuite) + V_LONG
  () => mkSplit('col', mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.58), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkLeaf('V_LONG'), 0.48), 0.5),

  // ═══ HERO + 5 COMPACTE ═══
  // 51. V hero 50% + (S+V_SHORT stivuite) col + (H+S stivuite) col + (V_LONG+V_SHORT stivuite) col
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 'V_LONG', 'V_SHORT'), 0.5), 0.4), 0.50),
  // 52. (V_LONG+V_SHORT stivuite) col + (H+S stivuite) col + (S+V_SHORT stivuite) col + V hero
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('V_LONG'), mkLeaf('V_SHORT'), 'V_LONG', 'V_SHORT'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.5), 0.4), mkLeaf('V'), 0.50),
  // 53. V_LONG hero + (V_SHORT+S stivuite) + V + (S+H stivuite)
  () => mkSplit('col', mkLeaf('V_LONG'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.55), 0.42), 0.42),
  // 54. (S+H stivuite) + V + (V_SHORT+S stivuite) + V_LONG hero
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.55), 0.42), mkLeaf('V_LONG'), 0.58),
  // 55. V hero + (S+V_LONG stivuite) + (V_SHORT+H stivuite) + (S+S stivuite)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.5), 0.4), 0.48),
  // 56. (S+S stivuite) + (V_SHORT+H stivuite) + (S+V_LONG stivuite) + V hero
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mRow(mkLeaf('S'), mkLeaf('V_LONG'), 'S', 'V_LONG'), 0.5), 0.4), mkLeaf('V'), 0.52),
  // 57. V hero + (V_SHORT+S stivuite) + V_LONG + (H+S stivuite)
  () => mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.55), 0.42), 0.45),
  // 58. (H+S stivuite) + V_LONG + (V_SHORT+S stivuite) + V hero
  () => mkSplit('col', mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('V_SHORT'), mkLeaf('S'), 'V_SHORT', 'S'), 0.55), 0.42), mkLeaf('V'), 0.55),
  // 59. V_LONG + (S+V_SHORT stivuite) + V hero + (H+S stivuite)
  () => mkSplit('col', mkSplit('col', mkLeaf('V_LONG'), mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), 0.55), mkSplit('col', mkLeaf('V'), mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), 0.6), 0.45),
  // 60. (H+S stivuite) + V hero + (S+V_SHORT stivuite) + V_LONG
  () => mkSplit('col', mRow(mkLeaf('S'), mkLeaf('S'), 'S', 'S'), mkSplit('col', mkLeaf('V'), mkSplit('col', mRow(mkLeaf('S'), mkLeaf('V_SHORT'), 'S', 'V_SHORT'), mkLeaf('V_LONG'), 0.48), 0.55), 0.3),
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

// Clonează un tree și convertește leaf-urile la mask fitting
function cloneWithMask(node) {
  if (!node) return null;
  if (node.type === 'leaf') {
    return { ...node, id: 'f' + (++_nextFrameId), _useMaskFitting: true };
  }
  return { ...node, children: node.children.map(cloneWithMask) };
}

// NU mai clonăm automat — variantele mask sunt create manual ca un constructor de piatră

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

// REGULA: niciun cadru sub 15% din lățime sau 12% din înălțime = eliminat
function hasStickFrames(gen) {
  try {
    const tree = gen();
    const rects = computeRects(tree, 0, 0, 1000, 500, 0);
    return rects.some(r => r.w < 150 || r.h < 130); // 15% lățime, 26% înălțime — elimină orice bandă
  } catch { return true; }
}

function getAllGenerators(count) {
  const base = VARIANT_GENERATORS[count] || [];
  const extra = _approvedGenerators[count] || [];
  const all = [...base, ...extra];
  return all.filter(gen => !hasStickFrames(gen));
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
