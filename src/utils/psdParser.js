/**
 * PSD Parser — importă design din Photoshop AUTOMAT
 *
 * REGULI SIMPLE:
 * 1. Text layers (T în Photoshop) → text editabil de client (automat, fără prefix)
 * 2. Shape/rectangle layers goale sau cu imagine placeholder → cadru foto (clientul pune poza)
 * 3. Tot restul → background (composite din Photoshop)
 *
 * Workflow designer:
 * - Faci designul complet în Photoshop (cu text, cu foto placeholder, cu background)
 * - Ascunzi layerele interactive (text + foto) — eye off
 * - Salvezi PSD → uploadezi în admin → parser-ul face totul automat
 *
 * SAU (dacă nu asunzi):
 * - Lași totul vizibil → composite-ul include textul
 * - Parser-ul detectează text layers și creează zone editabile PESTE composite
 * - Clientul vede designul tău, textul lui înlocuiește textul din background
 */

let initialized = false;

async function init() {
  if (initialized) return;
  try {
    const agPsd = await import('ag-psd');
    if (agPsd.initializeCanvas) {
      agPsd.initializeCanvas(
        (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; },
      );
    }
  } catch (e) { console.warn('[PSD] init failed:', e); }
  initialized = true;
}

export async function parsePSD(file, format = '30×30', spineWidthCm = 2.6) {
  await init();
  const { readPsd } = await import('ag-psd');

  const buffer = await file.arrayBuffer();
  const psd = readPsd(new Uint8Array(buffer), {
    skipCompositeImageData: false,
    skipLayerImageData: false,
    skipThumbnail: true,
  });

  const W = psd.width;
  const H = psd.height;

  // Calculate front cover area
  const [pageW] = format.split('×').map(Number);
  const totalWcm = pageW * 2 + spineWidthCm;
  const frontStartPct = ((pageW + spineWidthCm) / totalWcm) * 100;
  const frontWidthPct = (pageW / totalWcm) * 100;
  const frontStartPx = (frontStartPct / 100) * W;
  const frontWidthPx = (frontWidthPct / 100) * W;

  const frames = [];
  const texts = [];
  const decorImages = [];

  function identifyLayers(layer) {
    try {
      if (!layer) return;
      const name = (layer.name || '').trim();
      const nameLower = name.toLowerCase();

      // Groups — recurse into children
      if (layer.children && layer.children.length > 0) {
        layer.children.forEach(identifyLayers);
        return;
      }

      // Get bounding box
      const l = layer.left || 0;
      const t = layer.top || 0;
      const r = layer.right || l;
      const b = layer.bottom || t;
      const lw = r - l;
      const lh = b - t;
      if (lw <= 2 || lh <= 2) return;

      // Convert to % relative to front cover
      const xOnFront = ((l - frontStartPx) / frontWidthPx) * 100;
      const yPct = (t / H) * 100;
      const wPct = (lw / frontWidthPx) * 100;
      const hPct = (lh / H) * 100;

      // Skip if entirely on back cover
      if (xOnFront + wPct < -5) return;

      // ═══ DETECTION RULES ═══

      // ── 1. TEXT LAYERS — Any Photoshop text layer → editable text ──
      // Detected by: layer.text exists (Photoshop marks text layers with T icon)
      // Works with: visible OR hidden layers
      const isPsdText = !!layer.text;
      const hasTextPrefix = nameLower.startsWith('text_') || nameLower.startsWith('text ');

      if (isPsdText || hasTextPrefix) {
        let textContent = '';
        let fontSize = 24;
        let fontWeight = 'normal';
        let fontStyle = 'normal';
        let color = '#2C2520';
        let fontFamily = 'sans-serif';
        let rotation = 0;

        if (layer.text) {
          textContent = layer.text.text || name || 'Text';

          // Read font style from PSD text data
          const st = layer.text.style || {};
          if (st.fontSize) fontSize = st.fontSize;
          if (st.fauxBold || st.fontWeight === 'bold') fontWeight = 'bold';
          if (st.fauxItalic || st.fontStyle === 'italic') fontStyle = 'italic';
          if (st.font?.name) fontFamily = st.font.name;
          if (st.fillColor) color = rgbToHex(st.fillColor);

          // Read rotation from transform matrix
          if (layer.text.transform && layer.text.transform.length >= 4) {
            const m = layer.text.transform;
            const angle = Math.atan2(m[1], m[0]) * (180 / Math.PI);
            if (Math.abs(angle) > 3) rotation = Math.round(angle);
          }

          // Also try layer-level transform
          if (rotation === 0 && layer.transform) {
            const m = layer.transform;
            if (m.length >= 4) {
              const angle = Math.atan2(m[1], m[0]) * (180 / Math.PI);
              if (Math.abs(angle) > 3) rotation = Math.round(angle);
            }
          }
        } else {
          textContent = name.replace(/^text[_ ]/i, '') || 'Text';
        }

        // Auto-detect vertical: tall bounding box = vertical text
        if (rotation === 0 && lh > lw * 1.5) {
          rotation = -90;
        }

        // PSD bounding box is post-rotation (AABB of rotated text).
        // For CSS rotation to work correctly, we need PRE-rotation dimensions.
        // When rotation != 0: swap w/h and adjust position so center stays the same.
        let finalX = Math.max(0, xOnFront);
        let finalY = Math.max(0, yPct);
        let finalW = Math.max(wPct, 5);
        let finalH = Math.max(hPct, 3);

        if (rotation === -90 || rotation === 90) {
          // PSD gives: narrow width, tall height (post-rotation AABB)
          // CSS needs: wide width, short height (pre-rotation) + rotate(-90deg)
          // Center stays the same: cx = x + w/2, cy = y + h/2
          const cx = finalX + finalW / 2;
          const cy = finalY + finalH / 2;
          // Swap dimensions
          const swappedW = finalH;  // height becomes width
          const swappedH = finalW;  // width becomes height
          // Recalculate position to keep center
          finalX = cx - swappedW / 2;
          finalY = cy - swappedH / 2;
          finalW = swappedW;
          finalH = swappedH;
        }

        const fontSizePct = rotation !== 0 ? finalH * 0.7 : finalH * 0.7;

        console.log(`[PSD] Text "${textContent}" — PSD bounds: l=${l} t=${t} r=${r} b=${b} (${lw}×${lh}px) → %: x=${xOnFront.toFixed(1)} y=${yPct.toFixed(1)} w=${wPct.toFixed(1)} h=${hPct.toFixed(1)} → final: x=${finalX.toFixed(1)} y=${finalY.toFixed(1)} w=${finalW.toFixed(1)} h=${finalH.toFixed(1)} rot=${rotation}`);

        texts.push({
          id: `t_${texts.length}`,
          x: finalX, y: finalY,
          w: finalW, h: finalH,
          placeholder: textContent.replace(/\r?\n/g, ' ').trim(),
          text: textContent.replace(/\r?\n/g, ' ').trim(),
          fontSize: fontSizePct,
          fontWeight, fontStyle, fontFamily, color, rotation,
        });
        return;
      }

      // ── 2. FOTO FRAMES — Shape layers, rectangles, placeholders ──
      // Detected by: prefix foto_ OR name contains rectangle/shape/mask/photo/placeholder
      // OR: layer is a shape (no text, no meaningful image content, has bounds)
      const hasFotoPrefix = nameLower.startsWith('foto_') || nameLower.startsWith('foto ');
      const isFotoName = nameLower.includes('photo') || nameLower.includes('poza')
        || nameLower.includes('placeholder') || nameLower.includes('mask')
        || nameLower.includes('foto');

      // Detect shape/rectangle layers by name pattern
      const isRectangle = nameLower.startsWith('rectangle') || nameLower.startsWith('rect ')
        || nameLower.startsWith('shape') || nameLower.startsWith('cadru')
        || nameLower.startsWith('frame');

      // Detect smart object / placed image layers (often used as photo placeholders)
      const isPlacedImage = layer.placedLayer || (layer.type === 'placedLayer');

      if (hasFotoPrefix || isFotoName || isRectangle || isPlacedImage) {
        frames.push({
          id: `f_${frames.length}`,
          x: Math.max(0, xOnFront), y: Math.max(0, yPct),
          w: wPct, h: hPct, rotation: 0,
        });
        return;
      }

      // ── 3. MOVEABLE DECORATIVE ELEMENTS ──
      const hasMovePrefix = nameLower.startsWith('move_') || nameLower.startsWith('move ');
      if (hasMovePrefix) {
        let imgSrc = null;
        try { if (layer.canvas) imgSrc = layer.canvas.toDataURL('image/png'); } catch {}
        decorImages.push({
          id: `di_${decorImages.length}`,
          x: Math.max(0, xOnFront), y: Math.max(0, yPct),
          w: wPct, h: hPct,
          src: imgSrc,
          name: name.replace(/^move[_ ]/i, ''),
        });
        return;
      }

      // ── 4. EVERYTHING ELSE → stays in composite (background) ──

    } catch (e) {
      console.warn('[PSD] Layer error:', layer?.name, e.message);
    }
  }

  if (psd.children) psd.children.forEach(identifyLayers);

  // Use Photoshop's composite as background
  let bgDataUrl = null;
  try {
    if (psd.canvas) {
      const MAX = 3000;
      if (W > MAX) {
        const scale = MAX / W;
        const c = document.createElement('canvas');
        c.width = Math.round(W * scale);
        c.height = Math.round(H * scale);
        c.getContext('2d').drawImage(psd.canvas, 0, 0, c.width, c.height);
        bgDataUrl = c.toDataURL('image/jpeg', 0.90);
      } else {
        bgDataUrl = psd.canvas.toDataURL('image/jpeg', 0.92);
      }
    }
  } catch (e) { console.warn('[PSD] Composite export failed:', e); }

  console.log(`[PSD Import] ${W}×${H}px | Front: ${frontStartPct.toFixed(1)}%–${(frontStartPct + frontWidthPct).toFixed(1)}% | ${frames.length} foto, ${texts.length} text, ${decorImages.length} decor`);

  return {
    width: W, height: H, bgDataUrl,
    frames, texts, decorImages, decorTexts: [],
  };
}

function rgbToHex(c) {
  if (!c) return '#2C2520';
  const r = Math.round(c.r ?? 0);
  const g = Math.round(c.g ?? 0);
  const b = Math.round(c.b ?? 0);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
