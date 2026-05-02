/**
 * Cloudinary signed browser upload — uses Firebase Function for signature.
 * File goes directly from browser to Cloudinary (no server proxy).
 * Returns: { publicId, url, width, height }
 */

const CLOUD_NAME = 'dqmygw2zz';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // Cloudinary Plus: 20MB

async function compressIfNeeded(file) {
  if (file.size <= MAX_FILE_SIZE) return file;
  // Compress to fit under 10MB — resize to 5000px max, JPEG 92%
  const bmp = await createImageBitmap(file);
  const scale = Math.min(5000 / bmp.width, 5000 / bmp.height, 1);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  console.log(`[CLOUDINARY] Compressed ${file.name}: ${(file.size/1048576).toFixed(1)}MB → ${(blob.size/1048576).toFixed(1)}MB`);
  return new File([blob], file.name, { type: 'image/jpeg' });
}

// Cache signature per folder (valid ~10min, we cache for 5min)
let signatureCache = { folder: null, data: null, ts: 0 };

async function getSignature(folder) {
  const now = Date.now();
  // Reuse cached signature for same folder if < 5 min old
  if (signatureCache.folder === folder && now - signatureCache.ts < 5 * 60 * 1000) {
    return signatureCache.data;
  }

  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const functions = getFunctions(undefined, 'europe-west1');
  const signFn = httpsCallable(functions, 'signCloudinaryUpload');
  const result = await signFn({ folder });

  signatureCache = { folder, data: result.data, ts: now };
  return result.data;
}

export async function uploadToCloudinary(file, folder, onProgress) {
  const uploadFile = await compressIfNeeded(file);

  // Get signature from server (cached, ~50ms first time)
  const { signature, timestamp, apiKey } = await getSignature(folder);

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('folder', folder);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('api_key', apiKey);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', UPLOAD_URL, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress?.(pct, e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          publicId: data.public_id,
          url: data.secure_url,
          width: data.width,
          height: data.height,
        });
      } else {
        reject(new Error(`Cloudinary upload failed: ${xhr.status} ${xhr.responseText?.substring(0, 200)}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Upload timeout'));
    xhr.timeout = 120000;
    xhr.send(formData);
  });
}

/**
 * Build a Cloudinary transformation URL.
 * @param {string} publicId — from upload response
 * @param {object} opts — { width, height, quality, format }
 * @returns {string} transformed image URL
 */
export function cloudinaryUrl(publicId, { width, height, quality = 'auto', format = 'webp', crop = 'limit' } = {}) {
  const transforms = [];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  transforms.push(`q_${quality}`);
  transforms.push(`f_${format}`);
  if (crop) transforms.push(`c_${crop}`);
  const transformStr = transforms.join(',');
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformStr}/${publicId}`;
}

/**
 * Get common URLs for a photo.
 */
export function getPhotoUrls(publicId) {
  return {
    thumb: cloudinaryUrl(publicId, { width: 300, quality: 70 }),
    preview: cloudinaryUrl(publicId, { width: 1500, quality: 'auto' }),
    full: cloudinaryUrl(publicId, { quality: 100, format: 'jpg' }),
    original: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}`,
  };
}
