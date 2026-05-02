/**
 * Image Optimizer Web Worker — generates thumbnails OFF main thread.
 * Receives: { id, bitmap } (ImageBitmap from main thread)
 * Returns: { id, thumbBlob } (Blob for sidebar thumbnail)
 */

self.onmessage = async (e) => {
  const { id, bitmap, thumbSize = 300, thumbQuality = 0.7 } = e.data;

  try {
    // Create OffscreenCanvas for thumbnail
    const scale = Math.min(thumbSize / bitmap.width, thumbSize / bitmap.height, 1);
    const tw = Math.round(bitmap.width * scale);
    const th = Math.round(bitmap.height * scale);

    const canvas = new OffscreenCanvas(tw, th);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, tw, th);
    bitmap.close(); // free memory

    const thumbBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: thumbQuality });

    self.postMessage({ id, thumbBlob });
  } catch (err) {
    self.postMessage({ id, thumbBlob: null, error: err.message });
  }
};
