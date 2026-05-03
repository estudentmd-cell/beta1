/**
 * Smart crop utility — uses smartcrop.js to find optimal crop offset
 * so faces/subjects are never cut when photo fills a frame.
 * Returns { opx, opy } as percentage (0-100) for objectPosition.
 */
import smartcrop from 'smartcrop';

/**
 * Calculate optimal crop offset for a photo.
 * @param {string} imageSrc — URL of the image (thumb or preview)
 * @param {number} frameW — frame width in pixels
 * @param {number} frameH — frame height in pixels
 * @returns {Promise<{opx: number, opy: number}>}
 */
export async function getSmartCropOffset(imageSrc, frameW, frameH) {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageSrc;
    });

    const result = await smartcrop.crop(img, {
      width: Math.round(frameW) || 200,
      height: Math.round(frameH) || 200,
      minScale: 0.5,
    });

    const crop = result.topCrop;
    if (!crop) return { opx: 50, opy: 50 };

    // Convert crop center to objectPosition percentage
    const centerX = crop.x + crop.width / 2;
    const centerY = crop.y + crop.height / 2;
    const opx = Math.round((centerX / img.naturalWidth) * 100);
    const opy = Math.round((centerY / img.naturalHeight) * 100);

    return {
      opx: Math.max(10, Math.min(90, opx)),
      opy: Math.max(10, Math.min(90, opy)),
    };
  } catch (e) {
    return { opx: 50, opy: 50 };
  }
}

/**
 * Batch process — calculate smart crop for all photos.
 * Runs in background, doesn't block UI.
 * @param {object[]} photos — [{id, thumbData, previewUrl, origW, origH}]
 * @param {function} onUpdate — callback(photoId, cropOffset)
 */
export async function batchSmartCrop(photos, onUpdate) {
  for (const photo of photos) {
    if (photo._smartCropped) continue;
    const src = photo.thumbData || photo.previewUrl;
    if (!src || src.startsWith('blob:') || src.startsWith('data:')) continue;

    try {
      // Use photo's natural dimensions as frame (square-ish target)
      const targetW = Math.min(photo.origW || 300, 300);
      const targetH = Math.min(photo.origH || 300, 300);
      const offset = await getSmartCropOffset(src, targetW, targetH);
      if (onUpdate) onUpdate(photo.id, offset);
    } catch (e) {
      // Skip failed photos
    }
  }
}
