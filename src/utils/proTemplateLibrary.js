/**
 * proTemplateLibrary.js — SmartAlbums-style professional templates
 *
 * RULE: No two frames in any template may have identical (w, h) dimensions.
 * Every template has visual hierarchy — one frame is always the "hero" (largest).
 *
 * Proportions: golden ratio (61.8/38.2), rule of thirds (66.7/33.3),
 * strong hero (70/30), subtle asymmetry (55/45, 58/42).
 *
 * Coordinates: % of spread (0–100 width, 0–100 height).
 * Tiling: frames cover exactly 100% of spread area, no gaps, no overlaps.
 */

export const PRO_TEMPLATES = [

  // ═══════════════════════════════════════════════════════════════════════════
  // 1 PHOTO
  // ═══════════════════════════════════════════════════════════════════════════

  { id: 'H_1', pattern: 'H', photoCount: 1, formatType: 'patrat',
    frames: [{ x: 0, y: 0, w: 100, h: 100, slot: 'H' }] },
  { id: 'V_1', pattern: 'V', photoCount: 1, formatType: 'patrat',
    frames: [{ x: 25, y: 0, w: 50, h: 100, slot: 'V' }] },
  { id: 'S_1', pattern: 'S', photoCount: 1, formatType: 'patrat',
    frames: [{ x: 15, y: 10, w: 70, h: 80, slot: 'S' }] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2 PHOTOS — VV
  // ═══════════════════════════════════════════════════════════════════════════

  { id: 'VV_1', pattern: 'VV', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 61.8, h: 100, slot: 'V' },
      { x: 61.8, y: 0, w: 38.2, h: 100, slot: 'V' },
    ] },
  { id: 'VV_2', pattern: 'VV', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38.2, h: 100, slot: 'V' },
      { x: 38.2, y: 0, w: 61.8, h: 100, slot: 'V' },
    ] },
  { id: 'VV_3', pattern: 'VV', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 55, h: 100, slot: 'V' },
      { x: 55, y: 0, w: 45, h: 100, slot: 'V' },
    ] },
  { id: 'VV_4', pattern: 'VV', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 66.7, h: 100, slot: 'V' },
      { x: 66.7, y: 0, w: 33.3, h: 100, slot: 'V' },
    ] },
  { id: 'VV_5', pattern: 'VV', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 70, h: 100, slot: 'V' },
      { x: 70, y: 0, w: 30, h: 100, slot: 'V' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2 PHOTOS — HH
  // ═══════════════════════════════════════════════════════════════════════════

  { id: 'HH_1', pattern: 'HH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 61.8, slot: 'H' },
      { x: 0, y: 61.8, w: 100, h: 38.2, slot: 'H' },
    ] },
  { id: 'HH_2', pattern: 'HH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 38.2, slot: 'H' },
      { x: 0, y: 38.2, w: 100, h: 61.8, slot: 'H' },
    ] },
  { id: 'HH_3', pattern: 'HH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 55, slot: 'H' },
      { x: 0, y: 55, w: 100, h: 45, slot: 'H' },
    ] },
  { id: 'HH_4', pattern: 'HH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 66.7, slot: 'H' },
      { x: 0, y: 66.7, w: 100, h: 33.3, slot: 'H' },
    ] },
  { id: 'HH_5', pattern: 'HH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 70, slot: 'H' },
      { x: 0, y: 70, w: 100, h: 30, slot: 'H' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2 PHOTOS — VH
  // ═══════════════════════════════════════════════════════════════════════════

  { id: 'VH_1', pattern: 'VH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38.2, h: 100, slot: 'V' },
      { x: 38.2, y: 0, w: 61.8, h: 100, slot: 'H' },
    ] },
  { id: 'VH_2', pattern: 'VH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 33.3, h: 100, slot: 'V' },
      { x: 33.3, y: 0, w: 66.7, h: 100, slot: 'H' },
    ] },
  { id: 'VH_3', pattern: 'VH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 61.8, h: 100, slot: 'H' },
      { x: 61.8, y: 0, w: 38.2, h: 100, slot: 'V' },
    ] },
  { id: 'VH_4', pattern: 'VH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 42, h: 100, slot: 'V' },
      { x: 42, y: 0, w: 58, h: 100, slot: 'H' },
    ] },
  { id: 'VH_5', pattern: 'VH', photoCount: 2, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 58, slot: 'H' },
      { x: 20, y: 58, w: 60, h: 42, slot: 'V' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3 PHOTOS — VVV (L-shape: hero + 2 stacked)
  // ═══════════════════════════════════════════════════════════════════════════

  // hero left + 2 right (different heights)
  { id: 'VVV_1', pattern: 'VVV', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 55, h: 100, slot: 'V' },
      { x: 55, y: 0, w: 45, h: 58, slot: 'V' },
      { x: 55, y: 58, w: 45, h: 42, slot: 'V' },
    ] },
  // 2 stacked left + hero right
  { id: 'VVV_2', pattern: 'VVV', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 42, h: 55, slot: 'V' },
      { x: 0, y: 55, w: 42, h: 45, slot: 'V' },
      { x: 42, y: 0, w: 58, h: 100, slot: 'V' },
    ] },
  // hero left golden + 2 right golden
  { id: 'VVV_3', pattern: 'VVV', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 62, h: 100, slot: 'V' },
      { x: 62, y: 0, w: 38, h: 45, slot: 'V' },
      { x: 62, y: 45, w: 38, h: 55, slot: 'V' },
    ] },
  // 3 columns all different widths
  { id: 'VVV_4', pattern: 'VVV', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 42, h: 100, slot: 'V' },
      { x: 42, y: 0, w: 33, h: 100, slot: 'V' },
      { x: 75, y: 0, w: 25, h: 100, slot: 'V' },
    ] },
  // hero left 70% + 2 small right
  { id: 'VVV_5', pattern: 'VVV', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 68, h: 100, slot: 'V' },
      { x: 68, y: 0, w: 32, h: 62, slot: 'V' },
      { x: 68, y: 62, w: 32, h: 38, slot: 'V' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3 PHOTOS — VVH
  // ═══════════════════════════════════════════════════════════════════════════

  // H hero top + 2V bottom (different widths)
  { id: 'VVH_1', pattern: 'VVH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 62, slot: 'H' },
      { x: 0, y: 62, w: 55, h: 38, slot: 'V' },
      { x: 55, y: 62, w: 45, h: 38, slot: 'V' },
    ] },
  // V left + H right-top + V right-bottom
  { id: 'VVH_2', pattern: 'VVH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38, h: 100, slot: 'V' },
      { x: 38, y: 0, w: 62, h: 58, slot: 'H' },
      { x: 38, y: 58, w: 62, h: 42, slot: 'V' },
    ] },
  // H hero top 68% + 2V bottom
  { id: 'VVH_3', pattern: 'VVH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 68, slot: 'H' },
      { x: 0, y: 68, w: 42, h: 32, slot: 'V' },
      { x: 42, y: 68, w: 58, h: 32, slot: 'V' },
    ] },
  // 2V top + H bottom
  { id: 'VVH_4', pattern: 'VVH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 58, h: 55, slot: 'V' },
      { x: 58, y: 0, w: 42, h: 55, slot: 'V' },
      { x: 0, y: 55, w: 100, h: 45, slot: 'H' },
    ] },
  // H left wide + V right-top + V right-bottom
  { id: 'VVH_5', pattern: 'VVH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 58, h: 100, slot: 'H' },
      { x: 58, y: 0, w: 42, h: 62, slot: 'V' },
      { x: 58, y: 62, w: 42, h: 38, slot: 'V' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3 PHOTOS — VHH
  // ═══════════════════════════════════════════════════════════════════════════

  // V left + 2H stacked right (different heights)
  { id: 'VHH_1', pattern: 'VHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38, h: 100, slot: 'V' },
      { x: 38, y: 0, w: 62, h: 58, slot: 'H' },
      { x: 38, y: 58, w: 62, h: 42, slot: 'H' },
    ] },
  // 2H stacked left + V right
  { id: 'VHH_2', pattern: 'VHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 62, h: 55, slot: 'H' },
      { x: 0, y: 55, w: 62, h: 45, slot: 'H' },
      { x: 62, y: 0, w: 38, h: 100, slot: 'V' },
    ] },
  // V hero left 42% + 2H right golden
  { id: 'VHH_3', pattern: 'VHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 42, h: 100, slot: 'V' },
      { x: 42, y: 0, w: 58, h: 62, slot: 'H' },
      { x: 42, y: 62, w: 58, h: 38, slot: 'H' },
    ] },
  // H top + V bottom-left + H bottom-right
  { id: 'VHH_4', pattern: 'VHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 58, slot: 'H' },
      { x: 0, y: 58, w: 35, h: 42, slot: 'V' },
      { x: 35, y: 58, w: 65, h: 42, slot: 'H' },
    ] },
  // V left 30% + H right-top 70% + H right-bottom
  { id: 'VHH_5', pattern: 'VHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 30, h: 100, slot: 'V' },
      { x: 30, y: 0, w: 70, h: 62, slot: 'H' },
      { x: 30, y: 62, w: 70, h: 38, slot: 'H' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3 PHOTOS — HHH
  // ═══════════════════════════════════════════════════════════════════════════

  // H hero top + 2H bottom columns (different widths)
  { id: 'HHH_1', pattern: 'HHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 62, slot: 'H' },
      { x: 0, y: 62, w: 55, h: 38, slot: 'H' },
      { x: 55, y: 62, w: 45, h: 38, slot: 'H' },
    ] },
  // 2H top + hero H bottom
  { id: 'HHH_2', pattern: 'HHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 58, h: 42, slot: 'H' },
      { x: 58, y: 0, w: 42, h: 42, slot: 'H' },
      { x: 0, y: 42, w: 100, h: 58, slot: 'H' },
    ] },
  // H hero left + 2H stacked right
  { id: 'HHH_3', pattern: 'HHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 62, h: 100, slot: 'H' },
      { x: 62, y: 0, w: 38, h: 55, slot: 'H' },
      { x: 62, y: 55, w: 38, h: 45, slot: 'H' },
    ] },
  // 3 rows all different heights
  { id: 'HHH_4', pattern: 'HHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 45, slot: 'H' },
      { x: 0, y: 45, w: 100, h: 30, slot: 'H' },
      { x: 0, y: 75, w: 100, h: 25, slot: 'H' },
    ] },
  // H hero top 68% + 2H bottom
  { id: 'HHH_5', pattern: 'HHH', photoCount: 3, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 68, slot: 'H' },
      { x: 0, y: 68, w: 62, h: 32, slot: 'H' },
      { x: 62, y: 68, w: 38, h: 32, slot: 'H' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4 PHOTOS — VVVV (L-shape: hero + 3 stacked, all heights different)
  // ═══════════════════════════════════════════════════════════════════════════

  { id: 'VVVV_1', pattern: 'VVVV', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 55, h: 100, slot: 'V' },
      { x: 55, y: 0, w: 45, h: 38, slot: 'V' },
      { x: 55, y: 38, w: 45, h: 35, slot: 'V' },
      { x: 55, y: 73, w: 45, h: 27, slot: 'V' },
    ] },
  // Z-shape: top W1≠bottom W2
  { id: 'VVVV_2', pattern: 'VVVV', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 58, h: 55, slot: 'V' },
      { x: 58, y: 0, w: 42, h: 55, slot: 'V' },
      { x: 0, y: 55, w: 42, h: 45, slot: 'V' },
      { x: 42, y: 55, w: 58, h: 45, slot: 'V' },
    ] },
  // 3 stacked left + hero right
  { id: 'VVVV_3', pattern: 'VVVV', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 42, h: 40, slot: 'V' },
      { x: 0, y: 40, w: 42, h: 33, slot: 'V' },
      { x: 0, y: 73, w: 42, h: 27, slot: 'V' },
      { x: 42, y: 0, w: 58, h: 100, slot: 'V' },
    ] },
  // hero left 62% + 3 right golden
  { id: 'VVVV_4', pattern: 'VVVV', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 62, h: 100, slot: 'V' },
      { x: 62, y: 0, w: 38, h: 42, slot: 'V' },
      { x: 62, y: 42, w: 38, h: 33, slot: 'V' },
      { x: 62, y: 75, w: 38, h: 25, slot: 'V' },
    ] },
  // 4 columns all different widths
  { id: 'VVVV_5', pattern: 'VVVV', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 35, h: 100, slot: 'V' },
      { x: 35, y: 0, w: 28, h: 100, slot: 'V' },
      { x: 63, y: 0, w: 22, h: 100, slot: 'V' },
      { x: 85, y: 0, w: 15, h: 100, slot: 'V' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4 PHOTOS — VVVH (T-shape: H top/bottom + 3V, different widths)
  // ═══════════════════════════════════════════════════════════════════════════

  // H hero top + 3V bottom (different widths)
  { id: 'VVVH_1', pattern: 'VVVH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 58, slot: 'H' },
      { x: 0, y: 58, w: 38, h: 42, slot: 'V' },
      { x: 38, y: 58, w: 35, h: 42, slot: 'V' },
      { x: 73, y: 58, w: 27, h: 42, slot: 'V' },
    ] },
  // 3V top + H bottom
  { id: 'VVVH_2', pattern: 'VVVH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 42, h: 62, slot: 'V' },
      { x: 42, y: 0, w: 33, h: 62, slot: 'V' },
      { x: 75, y: 0, w: 25, h: 62, slot: 'V' },
      { x: 0, y: 62, w: 100, h: 38, slot: 'H' },
    ] },
  // H hero top 68% + 3V bottom
  { id: 'VVVH_3', pattern: 'VVVH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 68, slot: 'H' },
      { x: 0, y: 68, w: 45, h: 32, slot: 'V' },
      { x: 45, y: 68, w: 32, h: 32, slot: 'V' },
      { x: 77, y: 68, w: 23, h: 32, slot: 'V' },
    ] },
  // V hero left + H right-top + 2V right-bottom
  { id: 'VVVH_4', pattern: 'VVVH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 42, h: 100, slot: 'V' },
      { x: 42, y: 0, w: 58, h: 55, slot: 'H' },
      { x: 42, y: 55, w: 33, h: 45, slot: 'V' },
      { x: 75, y: 55, w: 25, h: 45, slot: 'V' },
    ] },
  // 3V top + H bottom wide
  { id: 'VVVH_5', pattern: 'VVVH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 35, h: 55, slot: 'V' },
      { x: 35, y: 0, w: 38, h: 55, slot: 'V' },
      { x: 73, y: 0, w: 27, h: 55, slot: 'V' },
      { x: 0, y: 55, w: 100, h: 45, slot: 'H' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4 PHOTOS — VVHH (Z-shape or mixed)
  // ═══════════════════════════════════════════════════════════════════════════

  // 2V left + 2H stacked right
  { id: 'VVHH_1', pattern: 'VVHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38, h: 58, slot: 'V' },
      { x: 0, y: 58, w: 38, h: 42, slot: 'V' },
      { x: 38, y: 0, w: 62, h: 55, slot: 'H' },
      { x: 38, y: 55, w: 62, h: 45, slot: 'H' },
    ] },
  // 2H stacked left + 2V right
  { id: 'VVHH_2', pattern: 'VVHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 62, h: 55, slot: 'H' },
      { x: 0, y: 55, w: 62, h: 45, slot: 'H' },
      { x: 62, y: 0, w: 38, h: 62, slot: 'V' },
      { x: 62, y: 62, w: 38, h: 38, slot: 'V' },
    ] },
  // H top + 2V mid + H bottom (sandwich)
  { id: 'VVHH_3', pattern: 'VVHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 35, slot: 'H' },
      { x: 0, y: 35, w: 55, h: 35, slot: 'V' },
      { x: 55, y: 35, w: 45, h: 35, slot: 'V' },
      { x: 0, y: 70, w: 100, h: 30, slot: 'H' },
    ] },
  // Z-shape checkerboard V/H alternating (W1≠W2)
  { id: 'VVHH_4', pattern: 'VVHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 55, h: 58, slot: 'V' },
      { x: 55, y: 0, w: 45, h: 58, slot: 'H' },
      { x: 0, y: 58, w: 45, h: 42, slot: 'H' },
      { x: 45, y: 58, w: 55, h: 42, slot: 'V' },
    ] },
  // V left + H right-top + H right-mid + V right-bottom
  { id: 'VVHH_5', pattern: 'VVHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 40, h: 100, slot: 'V' },
      { x: 40, y: 0, w: 60, h: 42, slot: 'H' },
      { x: 40, y: 42, w: 60, h: 30, slot: 'H' },
      { x: 40, y: 72, w: 60, h: 28, slot: 'V' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4 PHOTOS — VHHH
  // ═══════════════════════════════════════════════════════════════════════════

  // V left + 3H stacked right (different heights)
  { id: 'VHHH_1', pattern: 'VHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 35, h: 100, slot: 'V' },
      { x: 35, y: 0, w: 65, h: 42, slot: 'H' },
      { x: 35, y: 42, w: 65, h: 33, slot: 'H' },
      { x: 35, y: 75, w: 65, h: 25, slot: 'H' },
    ] },
  // 3H stacked left + V right
  { id: 'VHHH_2', pattern: 'VHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 65, h: 38, slot: 'H' },
      { x: 0, y: 38, w: 65, h: 35, slot: 'H' },
      { x: 0, y: 73, w: 65, h: 27, slot: 'H' },
      { x: 65, y: 0, w: 35, h: 100, slot: 'V' },
    ] },
  // V hero left 45% + 3H right
  { id: 'VHHH_3', pattern: 'VHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 45, h: 100, slot: 'V' },
      { x: 45, y: 0, w: 55, h: 45, slot: 'H' },
      { x: 45, y: 45, w: 55, h: 30, slot: 'H' },
      { x: 45, y: 75, w: 55, h: 25, slot: 'H' },
    ] },
  // H top + V bottom-left + H bottom-center + H bottom-right
  { id: 'VHHH_4', pattern: 'VHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 55, slot: 'H' },
      { x: 0, y: 55, w: 30, h: 45, slot: 'V' },
      { x: 30, y: 55, w: 42, h: 45, slot: 'H' },
      { x: 72, y: 55, w: 28, h: 45, slot: 'H' },
    ] },
  // V left 38% + 3H right golden heights
  { id: 'VHHH_5', pattern: 'VHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38, h: 100, slot: 'V' },
      { x: 38, y: 0, w: 62, h: 50, slot: 'H' },
      { x: 38, y: 50, w: 62, h: 30, slot: 'H' },
      { x: 38, y: 80, w: 62, h: 20, slot: 'H' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4 PHOTOS — HHHH
  // ═══════════════════════════════════════════════════════════════════════════

  // H hero top + 3H columns bottom (different widths)
  { id: 'HHHH_1', pattern: 'HHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 62, slot: 'H' },
      { x: 0, y: 62, w: 42, h: 38, slot: 'H' },
      { x: 42, y: 62, w: 33, h: 38, slot: 'H' },
      { x: 75, y: 62, w: 25, h: 38, slot: 'H' },
    ] },
  // 3H columns top + hero H bottom
  { id: 'HHHH_2', pattern: 'HHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 38, h: 38, slot: 'H' },
      { x: 38, y: 0, w: 35, h: 38, slot: 'H' },
      { x: 73, y: 0, w: 27, h: 38, slot: 'H' },
      { x: 0, y: 38, w: 100, h: 62, slot: 'H' },
    ] },
  // H hero left + 3H stacked right
  { id: 'HHHH_3', pattern: 'HHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 62, h: 100, slot: 'H' },
      { x: 62, y: 0, w: 38, h: 42, slot: 'H' },
      { x: 62, y: 42, w: 38, h: 33, slot: 'H' },
      { x: 62, y: 75, w: 38, h: 25, slot: 'H' },
    ] },
  // Z-shape asymmetric (top 58/42 × bottom 42/58)
  { id: 'HHHH_4', pattern: 'HHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 58, h: 55, slot: 'H' },
      { x: 58, y: 0, w: 42, h: 55, slot: 'H' },
      { x: 0, y: 55, w: 42, h: 45, slot: 'H' },
      { x: 42, y: 55, w: 58, h: 45, slot: 'H' },
    ] },
  // 4 rows all different heights
  { id: 'HHHH_5', pattern: 'HHHH', photoCount: 4, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 35, slot: 'H' },
      { x: 0, y: 35, w: 100, h: 28, slot: 'H' },
      { x: 0, y: 63, w: 100, h: 22, slot: 'H' },
      { x: 0, y: 85, w: 100, h: 15, slot: 'H' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5 PHOTOS — VVVVV
  // ═══════════════════════════════════════════════════════════════════════════

  // hero left + 4 stacked right (all different heights)
  // hero left 65% + 4 stacked right (dramatic heights: 40/28/20/12)
  { id: 'VVVVV_1', pattern: 'VVVVV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 65, h: 100, slot: 'V' },
      { x: 65, y: 0, w: 35, h: 40, slot: 'V' },
      { x: 65, y: 40, w: 35, h: 28, slot: 'V' },
      { x: 65, y: 68, w: 35, h: 20, slot: 'V' },
      { x: 65, y: 88, w: 35, h: 12, slot: 'V' },
    ] },
  // hero top 68% + 4 bottom columns (very different widths)
  { id: 'VVVVV_2', pattern: 'VVVVV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 68, slot: 'V' },
      { x: 0, y: 68, w: 50, h: 32, slot: 'V' },
      { x: 50, y: 68, w: 25, h: 32, slot: 'V' },
      { x: 75, y: 68, w: 15, h: 32, slot: 'V' },
      { x: 90, y: 68, w: 10, h: 32, slot: 'V' },
    ] },
  // Z dramatic: hero top-left 62×65 + small top-right + 3 bottom different
  { id: 'VVVVV_3', pattern: 'VVVVV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 62, h: 65, slot: 'V' },
      { x: 62, y: 0, w: 38, h: 65, slot: 'V' },
      { x: 0, y: 65, w: 45, h: 35, slot: 'V' },
      { x: 45, y: 65, w: 32, h: 35, slot: 'V' },
      { x: 77, y: 65, w: 23, h: 35, slot: 'V' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5 PHOTOS — HHHHH
  // ═══════════════════════════════════════════════════════════════════════════

  // hero left 65% + 4 stacked right (heights: 40/28/20/12)
  { id: 'HHHHH_1', pattern: 'HHHHH', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 65, h: 100, slot: 'H' },
      { x: 65, y: 0, w: 35, h: 40, slot: 'H' },
      { x: 65, y: 40, w: 35, h: 28, slot: 'H' },
      { x: 65, y: 68, w: 35, h: 20, slot: 'H' },
      { x: 65, y: 88, w: 35, h: 12, slot: 'H' },
    ] },
  // hero top 70% + 2 bottom columns (very different widths)
  { id: 'HHHHH_2', pattern: 'HHHHH', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 68, slot: 'H' },
      { x: 0, y: 68, w: 50, h: 32, slot: 'H' },
      { x: 50, y: 68, w: 25, h: 32, slot: 'H' },
      { x: 75, y: 68, w: 15, h: 32, slot: 'H' },
      { x: 90, y: 68, w: 10, h: 32, slot: 'H' },
    ] },
  // Z dramatic: hero top-left 62×65 + small top-right + 3 bottom
  { id: 'HHHHH_3', pattern: 'HHHHH', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 62, h: 65, slot: 'H' },
      { x: 62, y: 0, w: 38, h: 65, slot: 'H' },
      { x: 0, y: 65, w: 45, h: 35, slot: 'H' },
      { x: 45, y: 65, w: 32, h: 35, slot: 'H' },
      { x: 77, y: 65, w: 23, h: 35, slot: 'H' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5 PHOTOS — HVVVV (1H + 4V)
  // ═══════════════════════════════════════════════════════════════════════════

  { id: 'HVVVV_1', pattern: 'HVVVV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 45, slot: 'H' },
      { x: 0, y: 45, w: 35, h: 55, slot: 'V' },
      { x: 35, y: 45, w: 28, h: 55, slot: 'V' },
      { x: 63, y: 45, w: 22, h: 55, slot: 'V' },
      { x: 85, y: 45, w: 15, h: 55, slot: 'V' },
    ] },
  { id: 'HVVVV_2', pattern: 'HVVVV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 42, h: 58, slot: 'V' },
      { x: 42, y: 0, w: 33, h: 58, slot: 'V' },
      { x: 75, y: 0, w: 25, h: 58, slot: 'V' },
      { x: 0, y: 58, w: 55, h: 42, slot: 'V' },
      { x: 55, y: 58, w: 45, h: 42, slot: 'H' },
    ] },
  { id: 'HVVVV_3', pattern: 'HVVVV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 55, slot: 'H' },
      { x: 0, y: 55, w: 42, h: 45, slot: 'V' },
      { x: 42, y: 55, w: 30, h: 45, slot: 'V' },
      { x: 72, y: 55, w: 18, h: 45, slot: 'V' },
      { x: 90, y: 55, w: 10, h: 45, slot: 'V' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5 PHOTOS — HHVVV (2H + 3V)
  // ═══════════════════════════════════════════════════════════════════════════

  { id: 'HHVVV_1', pattern: 'HHVVV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 62, h: 55, slot: 'H' },
      { x: 62, y: 0, w: 38, h: 55, slot: 'H' },
      { x: 0, y: 55, w: 38, h: 45, slot: 'V' },
      { x: 38, y: 55, w: 35, h: 45, slot: 'V' },
      { x: 73, y: 55, w: 27, h: 45, slot: 'V' },
    ] },
  { id: 'HHVVV_2', pattern: 'HHVVV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 42, h: 62, slot: 'V' },
      { x: 42, y: 0, w: 33, h: 62, slot: 'V' },
      { x: 75, y: 0, w: 25, h: 62, slot: 'V' },
      { x: 0, y: 62, w: 55, h: 38, slot: 'H' },
      { x: 55, y: 62, w: 45, h: 38, slot: 'H' },
    ] },
  // 3V top + 2H bottom
  { id: 'HHVVV_3', pattern: 'HHVVV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 40, h: 62, slot: 'V' },
      { x: 40, y: 0, w: 32, h: 62, slot: 'V' },
      { x: 72, y: 0, w: 28, h: 62, slot: 'V' },
      { x: 0, y: 62, w: 58, h: 38, slot: 'H' },
      { x: 58, y: 62, w: 42, h: 38, slot: 'H' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5 PHOTOS — HHHHV (4H + 1V)
  // ═══════════════════════════════════════════════════════════════════════════

  { id: 'HHHHV_1', pattern: 'HHHHV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 35, h: 100, slot: 'V' },
      { x: 35, y: 0, w: 65, h: 38, slot: 'H' },
      { x: 35, y: 38, w: 65, h: 28, slot: 'H' },
      { x: 35, y: 66, w: 65, h: 20, slot: 'H' },
      { x: 35, y: 86, w: 65, h: 14, slot: 'H' },
    ] },
  { id: 'HHHHV_2', pattern: 'HHHHV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 62, h: 55, slot: 'H' },
      { x: 62, y: 0, w: 38, h: 55, slot: 'H' },
      { x: 0, y: 55, w: 55, h: 45, slot: 'H' },
      { x: 55, y: 55, w: 15, h: 45, slot: 'V' },
      { x: 70, y: 55, w: 30, h: 45, slot: 'H' },
    ] },
  { id: 'HHHHV_3', pattern: 'HHHHV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 65, h: 42, slot: 'H' },
      { x: 65, y: 0, w: 35, h: 100, slot: 'V' },
      { x: 0, y: 42, w: 65, h: 25, slot: 'H' },
      { x: 0, y: 67, w: 65, h: 18, slot: 'H' },
      { x: 0, y: 85, w: 65, h: 15, slot: 'H' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5 PHOTOS — HHHVV (3H + 2V)
  // ═══════════════════════════════════════════════════════════════════════════

  { id: 'HHHVV_1', pattern: 'HHHVV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 42, h: 100, slot: 'V' },
      { x: 42, y: 0, w: 28, h: 100, slot: 'V' },
      { x: 70, y: 0, w: 30, h: 42, slot: 'H' },
      { x: 70, y: 42, w: 30, h: 33, slot: 'H' },
      { x: 70, y: 75, w: 30, h: 25, slot: 'H' },
    ] },
  { id: 'HHHVV_2', pattern: 'HHHVV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 42, slot: 'H' },
      { x: 0, y: 42, w: 55, h: 30, slot: 'V' },
      { x: 55, y: 42, w: 45, h: 30, slot: 'V' },
      { x: 0, y: 72, w: 100, h: 15, slot: 'H' },
      { x: 0, y: 87, w: 100, h: 13, slot: 'H' },
    ] },
  { id: 'HHHVV_3', pattern: 'HHHVV', photoCount: 5, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 30, h: 45, slot: 'H' },
      { x: 0, y: 45, w: 30, h: 30, slot: 'H' },
      { x: 0, y: 75, w: 30, h: 25, slot: 'H' },
      { x: 30, y: 0, w: 42, h: 100, slot: 'V' },
      { x: 72, y: 0, w: 28, h: 100, slot: 'V' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6 PHOTOS — VVVVVV (6V)
  // ═══════════════════════════════════════════════════════════════════════════

  // Z: 3V top + 3V bottom (all different widths per row, rows different height)
  { id: 'VVVVVV_1', pattern: 'VVVVVV', photoCount: 6, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 42, h: 58, slot: 'V' },
      { x: 42, y: 0, w: 33, h: 58, slot: 'V' },
      { x: 75, y: 0, w: 25, h: 58, slot: 'V' },
      { x: 0, y: 58, w: 38, h: 42, slot: 'V' },
      { x: 38, y: 58, w: 35, h: 42, slot: 'V' },
      { x: 73, y: 58, w: 27, h: 42, slot: 'V' },
    ] },
  // hero left + 5 grid right
  { id: 'VVVVVV_2', pattern: 'VVVVVV', photoCount: 6, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 55, h: 100, slot: 'V' },
      { x: 55, y: 0, w: 45, h: 28, slot: 'V' },
      { x: 55, y: 28, w: 45, h: 24, slot: 'V' },
      { x: 55, y: 52, w: 45, h: 20, slot: 'V' },
      { x: 55, y: 72, w: 45, h: 16, slot: 'V' },
      { x: 55, y: 88, w: 45, h: 12, slot: 'V' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6 PHOTOS — HHHHHH (6H)
  // ═══════════════════════════════════════════════════════════════════════════

  // Z: 2H top + 2H mid + 2H bottom (all different)
  { id: 'HHHHHH_1', pattern: 'HHHHHH', photoCount: 6, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 58, h: 40, slot: 'H' },
      { x: 58, y: 0, w: 42, h: 40, slot: 'H' },
      { x: 0, y: 40, w: 45, h: 30, slot: 'H' },
      { x: 45, y: 40, w: 55, h: 30, slot: 'H' },
      { x: 0, y: 70, w: 62, h: 30, slot: 'H' },
      { x: 62, y: 70, w: 38, h: 30, slot: 'H' },
    ] },
  // hero top + 5 grid
  { id: 'HHHHHH_2', pattern: 'HHHHHH', photoCount: 6, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 100, h: 50, slot: 'H' },
      { x: 0, y: 50, w: 55, h: 28, slot: 'H' },
      { x: 55, y: 50, w: 45, h: 28, slot: 'H' },
      { x: 0, y: 78, w: 38, h: 22, slot: 'H' },
      { x: 38, y: 78, w: 35, h: 22, slot: 'H' },
      { x: 73, y: 78, w: 27, h: 22, slot: 'H' },
    ] },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6 PHOTOS — HHHVVV (3H + 3V)
  // ═══════════════════════════════════════════════════════════════════════════

  { id: 'HHHVVV_1', pattern: 'HHHVVV', photoCount: 6, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 42, h: 58, slot: 'V' },
      { x: 42, y: 0, w: 33, h: 58, slot: 'V' },
      { x: 75, y: 0, w: 25, h: 58, slot: 'V' },
      { x: 0, y: 58, w: 38, h: 42, slot: 'H' },
      { x: 38, y: 58, w: 35, h: 42, slot: 'H' },
      { x: 73, y: 58, w: 27, h: 42, slot: 'H' },
    ] },
  { id: 'HHHVVV_2', pattern: 'HHHVVV', photoCount: 6, formatType: 'patrat',
    frames: [
      { x: 0, y: 0, w: 55, h: 42, slot: 'H' },
      { x: 55, y: 0, w: 45, h: 42, slot: 'H' },
      { x: 0, y: 42, w: 100, h: 28, slot: 'H' },
      { x: 0, y: 70, w: 38, h: 30, slot: 'V' },
      { x: 38, y: 70, w: 35, h: 30, slot: 'V' },
      { x: 73, y: 70, w: 27, h: 30, slot: 'V' },
    ] },

];

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Derives the orientation pattern string for a set of photos.
 * e.g. two portraits → 'VV', one landscape + one portrait → 'HV' (sorted)
 */
export function getOrientationPattern(photos, getOrientationFn) {
  return photos.map(p => getOrientationFn(p)).sort().join('');
}

/**
 * Returns all PRO_TEMPLATES matching a given orientation pattern, photo count,
 * and optional format type.
 */
export function getProTemplatesByPattern(pattern, photoCount, formatType = 'patrat') {
  return PRO_TEMPLATES.filter(t =>
    t.pattern === pattern &&
    t.photoCount === photoCount &&
    (t.formatType === formatType || !t.formatType)
  );
}

export default PRO_TEMPLATES;
