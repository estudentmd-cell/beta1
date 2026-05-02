/* ═══ RENDER ENGINE — Export pages to JPG at 300 DPI ═══
   Renders each PAGE separately (not spreads) at print resolution.
   Uses LOCAL sources only (File objects, data URLs) to avoid CORS.
   No guides, no spine lines — print-ready, edge-to-edge.
*/

import JSZip from 'jszip';
import { computeRects, proTemplateToRects, getLeaves } from './layoutEngine';

const DPI = 300;
const CM_TO_INCH = 1 / 2.54;

function applyBounds(w, h, bounds) {
  if (!bounds) return { x: 0, y: 0, w, h };
  const pL = w * (bounds.left || 0), pR = w * (bounds.right || 0);
  const pT = h * (bounds.top || 0), pB = h * (bounds.bottom || 0);
  return { x: pL, y: pT, w: w - pL - pR, h: h - pT - pB };
}

function cmToPx(cm) {
  return Math.round(cm * CM_TO_INCH * DPI);
}

/* ═══ sRGB IEC61966-2.1 ICC Profile (3144 bytes) ═══
   Standard profile required by print factories.
   Embedded into every exported JPEG via APP2 marker. */
const SRGB_ICC_PROFILE_B64 = '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';

/* Decode base64 to Uint8Array */
function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/* Pre-decode the ICC profile once at module load */
const srgbIccProfile = base64ToBytes(SRGB_ICC_PROFILE_B64);

/* Inject sRGB IEC61966-2.1 ICC profile into a JPEG blob via APP2 marker */
async function embedIccProfile(jpegBlob) {
  const buf = await jpegBlob.arrayBuffer();
  const jpeg = new Uint8Array(buf);
  if (jpeg[0] !== 0xFF || jpeg[1] !== 0xD8) return jpegBlob; // not JPEG

  // Build APP2 segment: FF E2 + length + "ICC_PROFILE\0" + chunk 1/1 + data
  const id = [0x49,0x43,0x43,0x5F,0x50,0x52,0x4F,0x46,0x49,0x4C,0x45,0x00]; // ICC_PROFILE\0
  const segLen = 2 + 12 + 1 + 1 + srgbIccProfile.length; // length field + id + chunks + data
  const seg = new Uint8Array(2 + segLen);
  let o = 0;
  seg[o++] = 0xFF; seg[o++] = 0xE2; // APP2 marker
  seg[o++] = (segLen >> 8) & 0xFF; seg[o++] = segLen & 0xFF; // length
  for (let i = 0; i < 12; i++) seg[o++] = id[i]; // identifier
  seg[o++] = 1; seg[o++] = 1; // chunk 1 of 1
  seg.set(srgbIccProfile, o);

  // Assemble: SOI + APP2 + rest of original JPEG
  const result = new Uint8Array(2 + seg.length + jpeg.length - 2);
  result[0] = 0xFF; result[1] = 0xD8;
  result.set(seg, 2);
  result.set(jpeg.subarray(2), 2 + seg.length);

  return new Blob([result], { type: 'image/jpeg' });
}

/* Load image from local source only — never remote URLs (CORS-free) */
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* Download from Firebase Storage using SDK (avoids CORS issues with fetch) */
async function downloadFromStorage(storagePath) {
  try {
    const { storage } = await import('../firebase/config');
    if (!storage) return null;
    const { ref, getBlob } = await import('firebase/storage');
    const storageRef = ref(storage, storagePath);
    const blob = await getBlob(storageRef);
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn('[Render] Firebase SDK download failed:', e.message);
    return null;
  }
}

/* Fetch remote image as blob URL (fallback for URLs without storagePath) */
async function fetchAsBlob(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/* Get the best source for a photo for render/export.
   Priority: File → Firebase Storage (SDK) → storageUrl (fetch) → preview → thumb */
async function getRenderSrc(photo) {
  // 1. Original File object — best quality, always local
  if (photo.file) {
    console.log(`[Render] ${photo.fileName}: using File object (original)`);
    return { src: URL.createObjectURL(photo.file), needsRevoke: true };
  }
  // 2. Firebase Storage via SDK (storagePath) — full-res, no CORS issues
  if (photo.storagePath) {
    const blobUrl = await downloadFromStorage(photo.storagePath);
    if (blobUrl) {
      console.log(`[Render] ${photo.fileName}: using Firebase SDK (full-res)`);
      return { src: blobUrl, needsRevoke: true };
    }
  }
  // 3. Firebase Storage URL via fetch (fallback)
  if (photo.storageUrl) {
    const blobUrl = await fetchAsBlob(photo.storageUrl);
    if (blobUrl) {
      console.log(`[Render] ${photo.fileName}: using storageUrl fetch (full-res)`);
      return { src: blobUrl, needsRevoke: true };
    }
  }
  // 4. Preview blob/data URL (2400px)
  if (photo.blob && (photo.blob.startsWith('data:') || photo.blob.startsWith('blob:'))) {
    console.log(`[Render] ${photo.fileName}: using preview blob (2400px)`);
    return { src: photo.blob, needsRevoke: false };
  }
  // 5. Firebase preview URL
  if (photo.previewUrl) {
    const blobUrl = await fetchAsBlob(photo.previewUrl);
    if (blobUrl) {
      console.log(`[Render] ${photo.fileName}: using previewUrl (2400px)`);
      return { src: blobUrl, needsRevoke: true };
    }
  }
  // 6. Thumb data URL — LAST RESORT (300px, low quality!)
  if (photo.thumbData) {
    console.warn(`[Render] ⚠️ ${photo.fileName}: using thumbData (300px — LOW QUALITY)`);
    return { src: photo.thumbData, needsRevoke: false };
  }
  console.error(`[Render] ❌ ${photo.fileName}: NO source available`);
  return { src: null, needsRevoke: false };
}

/* Draw a photo into a rect on a canvas context with crop offset */
async function drawPhoto(ctx, photo, rect, offsetX = 0, offsetY = 0) {
  if (!photo) {
    ctx.fillStyle = '#F0EDE6';
    ctx.fillRect(rect.x - offsetX, rect.y - offsetY, rect.w, rect.h);
    return;
  }

  const { src, needsRevoke } = await getRenderSrc(photo);
  if (!src) return;

  const img = await loadImage(src);
  if (needsRevoke) URL.revokeObjectURL(src);
  if (!img) return;

  const crop = photo.cropOffset || rect.leaf?.cropOffset || { opx: 50, opy: 50 };
  const imgAR = img.width / img.height;
  const frameAR = rect.w / rect.h;

  let sx, sy, sw, sh;
  if (imgAR > frameAR) {
    sh = img.height; sw = sh * frameAR;
    sx = (crop.opx / 100) * (img.width - sw); sy = 0;
  } else {
    sw = img.width; sh = sw / frameAR;
    sx = 0; sy = (crop.opy / 100) * (img.height - sh);
  }
  sx = Math.max(0, Math.min(sx, img.width - sw));
  sy = Math.max(0, Math.min(sy, img.height - sh));

  // Apply pro template mask clipping if present
  const mask = rect.leaf?._proMask;
  const dx = rect.x - offsetX, dy = rect.y - offsetY, dw = rect.w, dh = rect.h;

  if (mask && mask !== 'rect') {
    ctx.save();
    ctx.beginPath();
    if (mask === 'circle') {
      ctx.ellipse(dx + dw / 2, dy + dh / 2, dw / 2, dh / 2, 0, 0, Math.PI * 2);
    } else if (mask === 'rounded') {
      const r = Math.min(dw, dh) * 0.06;
      ctx.moveTo(dx + r, dy); ctx.lineTo(dx + dw - r, dy); ctx.quadraticCurveTo(dx + dw, dy, dx + dw, dy + r);
      ctx.lineTo(dx + dw, dy + dh - r); ctx.quadraticCurveTo(dx + dw, dy + dh, dx + dw - r, dy + dh);
      ctx.lineTo(dx + r, dy + dh); ctx.quadraticCurveTo(dx, dy + dh, dx, dy + dh - r);
      ctx.lineTo(dx, dy + r); ctx.quadraticCurveTo(dx, dy, dx + r, dy);
    } else if (mask === 'arch') {
      ctx.moveTo(dx, dy + dh); ctx.lineTo(dx, dy + dh / 2);
      ctx.quadraticCurveTo(dx, dy, dx + dw / 2, dy);
      ctx.quadraticCurveTo(dx + dw, dy, dx + dw, dy + dh / 2);
      ctx.lineTo(dx + dw, dy + dh); ctx.closePath();
    } else if (mask === 'diamond') {
      ctx.moveTo(dx + dw / 2, dy); ctx.lineTo(dx + dw, dy + dh / 2);
      ctx.lineTo(dx + dw / 2, dy + dh); ctx.lineTo(dx, dy + dh / 2); ctx.closePath();
    } else if (mask === 'hexagon') {
      ctx.moveTo(dx + dw * 0.25, dy); ctx.lineTo(dx + dw * 0.75, dy);
      ctx.lineTo(dx + dw, dy + dh * 0.5); ctx.lineTo(dx + dw * 0.75, dy + dh);
      ctx.lineTo(dx + dw * 0.25, dy + dh); ctx.lineTo(dx, dy + dh * 0.5); ctx.closePath();
    }
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }
}

/* Convert canvas to JPG blob with embedded sRGB IEC61966-2.1 ICC profile */
function canvasToBlob(canvas, quality = 0.92) {
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      canvas.width = 0;
      canvas.height = 0;
      // Embed sRGB ICC profile for print factory compatibility
      const tagged = await embedIccProfile(blob);
      resolve(tagged);
    }, 'image/jpeg', quality);
  });
}

/* Render a spread as 2 separate page blobs (left + right)
   Each page file includes bleed + cotor zones (white) at full print dimensions.

   LEFT page file:  [bleed | photo content | cotor]  × [bleed | content | bleed]
   RIGHT page file: [cotor | photo content | bleed]  × [bleed | content | bleed]
*/
async function renderSpreadPages(spread, format, gapMM = 1.5, productSlug = 'pagini-groase') {
  const { getDimensions } = await import('./dimensions.js');
  const adminDims = getDimensions(productSlug, format.replace('×', 'x'));
  const [fW, fH] = format.split('×').map(Number);

  // Admin spread dimensions ALREADY INCLUDE bleed + cotor
  // Factory expects exactly spreadW/2 × spreadH per page file
  const spreadW = adminDims?.spread?.width || cmToPx(fW * 2);
  const spreadH = adminDims?.spread?.height || cmToPx(fH);
  const pageW = Math.round(spreadW / 2);  // exact factory page width
  const pageH = spreadH;                   // exact factory page height
  const gapPx = Math.round(gapMM * (spreadW / (fW * 20)));

  // Bleed and cotor for photo inset (mm → px at admin scale)
  const bleedMm = adminDims?.spread?.bleed || 3;
  const cotorMm = adminDims?.spread?.cotor || 0;
  const mmToPxH = spreadH / (fH * 10);
  const mmToPxW = spreadW / (fW * 20);
  const bleedPxV = Math.round(bleedMm * mmToPxH);
  const bleedPxH = Math.round(bleedMm * mmToPxW);
  const cotorPx = Math.round(cotorMm * mmToPxW);

  // Content area (where photos go) = page minus bleed/cotor margins
  const contentW = pageW - bleedPxH - cotorPx;
  const contentH = pageH - bleedPxV * 2;

  console.log(`[Render] Page file: ${pageW}×${pageH}px (content ${contentW}×${contentH}, bleed ${bleedMm}mm, cotor ${cotorMm}mm)`);

  // Compute layout rects within content area
  const isSpreadMode = spread.mode === 'spread';
  let leftRects = [];
  let rightRects = [];

  if (isSpreadMode && spread.full?.tree) {
    const fullContentW = contentW * 2;
    const fb = applyBounds(fullContentW, contentH, spread.full.bounds);
    const rects = spread.full._proTemplate
      ? proTemplateToRects(spread.full._proTemplate, fb.x, fb.y, fullContentW, contentH, gapPx, spread.full.tree)
      : computeRects(spread.full.tree, fb.x, fb.y, fb.w, fb.h, gapPx);
    for (const rect of rects) {
      if (rect.x + rect.w / 2 < contentW) leftRects.push(rect);
      else rightRects.push(rect);
    }
  } else {
    if (spread.left?.tree) {
      const lb = applyBounds(contentW, contentH, spread.left.bounds);
      leftRects = computeRects(spread.left.tree, lb.x, lb.y, lb.w, lb.h, gapPx);
    }
    if (spread.right?.tree) {
      const rb = applyBounds(contentW, contentH, spread.right.bounds);
      rightRects = computeRects(spread.right.tree, rb.x, rb.y, rb.w, rb.h, gapPx);
    }
  }

  // ── LEFT PAGE: [bleed | content | cotor] — total = pageW × pageH ──
  const leftCanvas = document.createElement('canvas');
  leftCanvas.width = pageW;
  leftCanvas.height = pageH;
  const leftCtx = leftCanvas.getContext('2d');
  leftCtx.fillStyle = '#FFFFFF';
  leftCtx.fillRect(0, 0, pageW, pageH);

  for (const rect of leftRects) {
    const shifted = { ...rect, x: rect.x + bleedPxH, y: rect.y + bleedPxV };
    await drawPhoto(leftCtx, rect.leaf?.photo, shifted, 0, 0);
  }
  const leftBlob = await canvasToBlob(leftCanvas);

  // ── RIGHT PAGE: [cotor | content | bleed] — total = pageW × pageH ──
  const rightCanvas = document.createElement('canvas');
  rightCanvas.width = pageW;
  rightCanvas.height = pageH;
  const rightCtx = rightCanvas.getContext('2d');
  rightCtx.fillStyle = '#FFFFFF';
  rightCtx.fillRect(0, 0, pageW, pageH);

  const rightOffsetBase = isSpreadMode ? contentW : 0;
  for (const rect of rightRects) {
    const shifted = { ...rect, x: rect.x - rightOffsetBase + cotorPx, y: rect.y + bleedPxV };
    await drawPhoto(rightCtx, rect.leaf?.photo, shifted, 0, 0);
  }
  const rightBlob = await canvasToBlob(rightCanvas);

  return { left: leftBlob, right: rightBlob };
}

/* Render cover as 1 spread file: [back + spine + front] at real dimensions.
   Full spread with bleed on all 4 outer edges. */
async function renderCoverSpread(spread, format, pages = 40, productSlug = 'pagini-groase') {
  const { getDimensions } = await import('./dimensions.js');
  const adminDims = getDimensions(productSlug, format.replace('×', 'x'));
  const [fW, fH] = format.split('×').map(Number);

  // Admin cover dimensions ALREADY INCLUDE bleed — use exact values
  const adminCover = adminDims?.cover;
  const totalW = adminCover?.width || cmToPx(fW * 2 + 2.6);
  const totalH = adminCover?.height || cmToPx(fH + 3);
  const bleedMm = adminCover?.bleed || 15;
  const spineMm = adminCover?.spine || 26;

  // Calculate sub-zones proportionally within admin dimensions
  const mmToPxW = totalW / ((fW * 2 + spineMm / 10 + bleedMm / 10 * 2) * 10);
  const mmToPxH = totalH / ((fH + bleedMm / 10 * 2) * 10);
  const bleedPxH = Math.round(bleedMm * mmToPxW);
  const bleedPxV = Math.round(bleedMm * mmToPxH);
  const spineW = Math.round(spineMm * mmToPxW);
  const backW = Math.round(fW * 10 * mmToPxW);
  const frontW = totalW - bleedPxH * 2 - backW - spineW;
  const frontH = totalH - bleedPxV * 2;

  // Front cover content starts after: bleed + back + spine
  const frontStartX = bleedPxH + backW + spineW;

  console.log(`[Render] Cover: ${totalW}×${totalH}px (exact from admin)`);

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  // Cover background color from template (back + spine + front all same color)
  const coverTpl = spread.coverTemplate;
  const coverBg = coverTpl?.coverStyle?.bg || '#FFFFFF';
  ctx.fillStyle = coverBg;
  ctx.fillRect(0, 0, totalW, totalH);

  // Cover background image (if set)
  const coverBgImage = coverTpl?.coverStyle?.bgImage;
  if (coverBgImage) {
    const bgImg = await loadImage(coverBgImage);
    if (bgImg) {
      // Back cover bg
      ctx.drawImage(bgImg, 0, 0, bleedPxH + backW, totalH);
      // Front cover bg
      ctx.drawImage(bgImg, frontStartX, 0, frontW + bleedPxH, totalH);
    }
  }

  // Cover frames (photo slots — with rotation support)
  if (spread.coverFrames) {
    for (const frame of spread.coverFrames) {
      const x = frontStartX + (frame.x / 100) * frontW;
      const y = bleedPxV + (frame.y / 100) * frontH;
      const w = (frame.w / 100) * frontW;
      const h = (frame.h / 100) * frontH;

      ctx.save();
      if (frame.rotation) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.translate(cx, cy);
        ctx.rotate((frame.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }
      const rect = { x, y, w, h, leaf: { photo: frame.photo, cropOffset: frame.cropOffset } };
      await drawPhoto(ctx, frame.photo, rect, 0, 0);
      ctx.restore();
    }
  }

  // Cover texts — positioned relative to front cover (with rotation support)
  if (spread.coverTexts) {
    for (const txt of spread.coverTexts) {
      if (!txt.text && !txt.placeholder) continue;
      const tx = frontStartX + (txt.x / 100) * frontW;
      const ty = bleedPxV + (txt.y / 100) * frontH;
      const tw = ((txt.w || 0) / 100) * frontW;
      const th = ((txt.h || 10) / 100) * frontH;
      const fontSize = Math.round((txt.fontSize || txt.size || 14) * (frontH / 800));
      const fontStyle = txt.italic || txt.fontStyle === 'italic' ? 'italic ' : '';
      const fontWeight = txt.fontWeight === 'bold' || txt.bold ? 'bold ' : '';

      ctx.save();
      if (txt.rotation) {
        const cx = tx + tw / 2;
        const cy = ty + th / 2;
        ctx.translate(cx, cy);
        ctx.rotate((txt.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }
      ctx.fillStyle = txt.color || '#2C2520';
      ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${txt.font || txt.fontFamily || "'DM Serif Display', Georgia, serif"}`;
      ctx.textAlign = txt.align || txt.textAlign || 'center';
      const textX = ctx.textAlign === 'left' ? tx : ctx.textAlign === 'right' ? tx + tw : tx + tw / 2;
      ctx.fillText(txt.text || '', textX, ty + fontSize);
      ctx.restore();
    }
  }

  // Decorative texts from admin cover design (with rotation support)
  if (coverTpl?.decorTexts) {
    for (const dt of coverTpl.decorTexts) {
      if (!dt.text) continue;
      const dx = frontStartX + (dt.x / 100) * frontW;
      const dy = bleedPxV + (dt.y / 100) * frontH;
      const dw = (dt.w / 100) * frontW;
      const dh = (dt.h / 100) * frontH;
      const fontSize = Math.round((dt.fontSize || 16) * (frontH / 800));
      const fontStyle = dt.fontStyle === 'italic' ? 'italic ' : '';
      const fontWeight = dt.fontWeight === 'bold' ? 'bold ' : '';

      ctx.save();
      if (dt.rotation) {
        const cx = dx + dw / 2;
        const cy = dy + dh / 2;
        ctx.translate(cx, cy);
        ctx.rotate((dt.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }
      ctx.fillStyle = dt.color || '#333333';
      ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${dt.fontFamily || dt.font || 'sans-serif'}`;
      ctx.textAlign = dt.textAlign || 'center';
      const textX = ctx.textAlign === 'left' ? dx : ctx.textAlign === 'right' ? dx + dw : dx + dw / 2;
      ctx.fillText(dt.text, textX, dy + fontSize);
      ctx.restore();
    }
  }

  // Decorative images from admin cover design (with rotation support)
  if (coverTpl?.decorImages) {
    for (const di of coverTpl.decorImages) {
      if (!di.src) continue;
      const img = await loadImage(di.src);
      if (!img) continue;
      const dx = frontStartX + (di.x / 100) * frontW;
      const dy = bleedPxV + (di.y / 100) * frontH;
      const dw = (di.w / 100) * frontW;
      const dh = (di.h / 100) * frontH;
      ctx.save();
      if (di.rotation) {
        const cx = dx + dw / 2;
        const cy = dy + dh / 2;
        ctx.translate(cx, cy);
        ctx.rotate((di.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    }
  }

  return canvasToBlob(canvas, 0.95);
}

/* Render all spreads → ZIP file download (per-page export) */
/* Render a full spread (both pages as one image) for thick pages */
async function renderFullSpread(spread, format, gapMM = 1.5, productSlug = 'pagini-groase') {
  const { getDimensions } = await import('./dimensions.js');
  const adminDims = getDimensions(productSlug, format.replace('×', 'x'));
  const [fW, fH] = format.split('×').map(Number);

  const spreadW = adminDims?.spread?.width || cmToPx(fW * 2);
  const spreadH = adminDims?.spread?.height || cmToPx(fH);
  const gapPx = Math.round(gapMM * (spreadW / (fW * 20)));

  const bleedMm = adminDims?.spread?.bleed || 3;
  const mmToPxH = spreadH / (fH * 10);
  const mmToPxW = spreadW / (fW * 20);
  const bleedPxV = Math.round(bleedMm * mmToPxH);
  const bleedPxH = Math.round(bleedMm * mmToPxW);

  const contentW = spreadW - bleedPxH * 2;
  const contentH = spreadH - bleedPxV * 2;

  console.log(`[Render] Full spread: ${spreadW}×${spreadH}px (content ${contentW}×${contentH})`);

  const isSpreadMode = spread.mode === 'spread';
  let rects = [];

  if (isSpreadMode && spread.full?.tree) {
    const fb = applyBounds(contentW, contentH, spread.full?.bounds);
    if (spread.full._proTemplate) {
      rects = proTemplateToRects(spread.full._proTemplate, fb.x, fb.y, contentW, contentH, gapPx, spread.full.tree);
    } else {
      rects = computeRects(spread.full.tree, fb.x, fb.y, fb.w, fb.h, gapPx);
    }
  } else {
    const halfW = Math.round(contentW / 2);
    if (spread.left?.tree) {
      const lb = applyBounds(halfW, contentH, spread.left?.bounds);
      rects.push(...computeRects(spread.left.tree, lb.x, lb.y, lb.w, lb.h, gapPx));
    }
    if (spread.right?.tree) {
      const rb = applyBounds(halfW, contentH, spread.right?.bounds);
      const rightRects = computeRects(spread.right.tree, rb.x, rb.y, rb.w, rb.h, gapPx);
      rects.push(...rightRects.map(r => ({ ...r, x: r.x + halfW })));
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = spreadW;
  canvas.height = spreadH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, spreadW, spreadH);

  for (const rect of rects) {
    const shifted = { ...rect, x: rect.x + bleedPxH, y: rect.y + bleedPxV };
    await drawPhoto(ctx, rect.leaf?.photo, shifted, 0, 0);
  }

  return await canvasToBlob(canvas);
}

export async function renderAllSpreads(spreads, format, gapMM, onProgress, pages = 40, productSlug = 'pagini-groase') {
  const zip = new JSZip();
  const total = spreads.length;
  let pageNum = 0;
  const isThickPages = productSlug === 'pagini-groase';
  console.log(`[Render] Starting ${total} spreads (${isThickPages ? 'per-spread' : 'per-page'} export) at 300 DPI, format: ${format}`);

  for (let i = 0; i < spreads.length; i++) {
    const spread = spreads[i];
    const label = spread.isCover ? 'cover' : `spread ${i + 1}/${total}`;
    console.log(`[Render] ${label} — ${spread.photos?.length || 0} photos`);
    if (onProgress) onProgress(i, total, label);

    try {
      if (spread.isCover) {
        const blob = await renderCoverSpread(spread, format, pages, productSlug);
        if (blob) {
          zip.file(`${String(pageNum++).padStart(2, '0')}_cover.jpg`, blob);
          console.log(`[Render] cover spread → ${(blob.size / 1024).toFixed(0)} KB`);
        }
      } else if (isThickPages) {
        // PAGINI GROASE — export per rotation (full spread, one file)
        const blob = await renderFullSpread(spread, format, gapMM, productSlug);
        if (blob) {
          zip.file(`${String(pageNum++).padStart(2, '0')}_spread.jpg`, blob);
          console.log(`[Render] spread ${pageNum - 1} (full) → ${(blob.size / 1024).toFixed(0)} KB`);
        }
      } else {
        // PAGINI SUBȚIRI — export per page (left + right separate)
        const { left, right } = await renderSpreadPages(spread, format, gapMM, productSlug);
        if (right) {
          zip.file(`${String(pageNum++).padStart(2, '0')}_page.jpg`, right);
          console.log(`[Render] page ${pageNum - 1} (odd) → ${(right.size / 1024).toFixed(0)} KB`);
        }
        if (left) {
          zip.file(`${String(pageNum++).padStart(2, '0')}_page.jpg`, left);
          console.log(`[Render] page ${pageNum - 1} (even) → ${(left.size / 1024).toFixed(0)} KB`);
        }
      }
    } catch (e) {
      console.error(`[Render] ${label} FAILED:`, e.message);
    }

    await new Promise((r) => setTimeout(r, 50));
  }

  console.log(`[Render] All done, generating ZIP...`);
  if (onProgress) onProgress(total, total, 'zipping');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  console.log(`[Render] ZIP ready: ${(zipBlob.size / 1024 / 1024).toFixed(1)} MB`);

  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `album_${format}_${Date.now()}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
