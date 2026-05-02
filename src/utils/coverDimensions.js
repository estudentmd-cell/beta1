/**
 * Cover dimensions for print — supports both pagini-groase and pagini-subtiri.
 * Uses dimensions from admin panel (dimensions.js) when available.
 */
import { getDimensions } from './dimensions';

// Fallback spine widths for pagini-groase (hardcover layflat)
const GROASE_SPINE_BY_PAGES = {
  20: 1.8, 30: 2.2, 40: 2.6, 50: 3.0, 60: 3.4, 70: 3.8, 80: 4.2,
};

// Subtiri have a fixed thin spine
const SUBTIRI_SPINE_CM = 1.0; // 10mm

/**
 * Get full cover dimensions for a given format, page count, and product type.
 * Returns dimensions in cm.
 */
export function getCoverDimensions(format, pages = 40, productSlug = 'pagini-groase') {
  const [fW, fH] = format.split('×').map(Number);

  // Try admin-defined dimensions first
  const adminDims = getDimensions(productSlug, format);

  let spineCm, bleedCm;

  if (adminDims?.cover) {
    // Admin dimensions are in mm — convert spine to cm
    spineCm = (adminDims.cover.spine || 26) / 10;
    bleedCm = (adminDims.cover.bleed || 15) / 10;
  } else if (productSlug === 'pagini-subtiri') {
    spineCm = SUBTIRI_SPINE_CM;
    bleedCm = 1.5;
  } else {
    spineCm = GROASE_SPINE_BY_PAGES[pages] || 2.6;
    bleedCm = 1.5;
  }

  return {
    pageW: fW,
    pageH: fH,
    spineW: spineCm,
    bleed: bleedCm,
    totalW: fW * 2 + spineCm,
    totalH: fH,
    totalWBleed: fW * 2 + spineCm + bleedCm * 2,
    totalHBleed: fH + bleedCm * 2,
    frontX: fW + spineCm,
    frontY: 0,
    frontW: fW,
    frontH: fH,
    productSlug,
  };
}

/**
 * Get spread dimensions for rendering interior pages.
 */
export function getSpreadDimensions(format, productSlug = 'pagini-groase') {
  const [fW, fH] = format.split('×').map(Number);
  const adminDims = getDimensions(productSlug, format);

  let bleedMm = 3, cotorMm = 0;

  if (adminDims?.spread) {
    bleedMm = adminDims.spread.bleed || 3;
    cotorMm = adminDims.spread.cotor || 0;
  }

  return {
    pageW: fW,
    pageH: fH,
    spreadW: fW * 2,
    spreadH: fH,
    bleedMm,
    cotorMm, // interior cotor for subtiri (magazine binding)
    productSlug,
  };
}

/**
 * Convert a frame position (% relative to front cover) to absolute position on full spread.
 */
export function frameToAbsolute(frame, coverDims) {
  const { frontX, frontW, frontH } = coverDims;
  return {
    x: frontX + (frame.x / 100) * frontW,
    y: (frame.y / 100) * frontH,
    w: (frame.w / 100) * frontW,
    h: (frame.h / 100) * frontH,
  };
}

export function getCoverAspectRatio(format, pages = 40, productSlug = 'pagini-groase') {
  const dims = getCoverDimensions(format, pages, productSlug);
  return dims.totalW / dims.totalH;
}

export function getFrontCoverAspectRatio(format) {
  const [fW, fH] = format.split('×').map(Number);
  return fW / fH;
}
