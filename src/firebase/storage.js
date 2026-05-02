import { storage } from './config';

/**
 * Upload raw original to /uploaded/ path on DEFAULT bucket.
 * Resize Extension triggers on /uploaded/ → produces WebP in /resized/.
 * Uses uploadBytesResumable with real bytesTransferred progress.
 */
export async function uploadPhoto(clientId, projectId, file, photoId, onProgress) {
  if (!storage) {
    console.error('[upload] storage is null!');
    return null;
  }

  const path = `uploads/${clientId}/${projectId}/${photoId}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const metadata = {
    contentType: file.type || 'image/jpeg',
    cacheControl: 'public, max-age=31536000',
  };

  console.log(`%c[upload] IMPORT firebase/storage...`, 'color: gray');
  const t_import = Date.now();
  const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
  console.log(`%c[upload] IMPORT done in ${Date.now() - t_import}ms`, 'color: gray');

  const storageRef = ref(storage, path);
  console.log(`%c[upload] START ${file.name} (${(file.size / 1048576).toFixed(1)}MB) → bucket: ${storage.app?.options?.storageBucket}`, 'color: #3D6B5E; font-weight: bold');
  console.log(`%c[upload]   path: ${path}`, 'color: #3D6B5E');
  console.log(`%c[upload]   contentType: ${metadata.contentType}`, 'color: #3D6B5E');
  console.log(`%c[upload]   file.size: ${file.size} bytes, file.type: ${file.type}, file.name: ${file.name}`, 'color: #3D6B5E');

  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    let firstProgressAt = 0;
    let lastProgressAt = 0;
    let progressCount = 0;
    let lastPct = -1;

    console.log(`%c[upload] CREATING uploadBytesResumable task...`, 'color: orange');
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);
    console.log(`%c[upload] TASK CREATED. State: ${uploadTask.snapshot.state}. Waiting for events...`, 'color: orange');

    // Watchdog: if no progress after 10s, log warning
    const watchdog = setTimeout(() => {
      console.error(`%c[upload] ⚠️ WATCHDOG: No progress for 10s! ${file.name} — state: ${uploadTask.snapshot.state}, transferred: ${uploadTask.snapshot.bytesTransferred}/${uploadTask.snapshot.totalBytes}`, 'color: red; font-weight: bold');
      console.error(`[upload] Task metadata:`, { state: uploadTask.snapshot.state, bytesTransferred: uploadTask.snapshot.bytesTransferred, totalBytes: uploadTask.snapshot.totalBytes });
    }, 10000);

    // Second watchdog at 30s
    const watchdog2 = setTimeout(() => {
      console.error(`%c[upload] 🚨 CRITICAL: 30s no completion! ${file.name} — state: ${uploadTask.snapshot.state}, bytes: ${uploadTask.snapshot.bytesTransferred}/${uploadTask.snapshot.totalBytes}`, 'color: red; font-weight: bold; font-size: 14px');
      // Try to cancel and retry info
      console.error(`[upload] Attempting to read task state...`, uploadTask);
    }, 30000);

    uploadTask.on('state_changed',
      (snap) => {
        const now = Date.now();
        progressCount++;
        if (firstProgressAt === 0) {
          firstProgressAt = now;
          console.log(`%c[upload] FIRST PROGRESS at +${now - t0}ms: ${snap.bytesTransferred}/${snap.totalBytes} (state: ${snap.state})`, 'color: green; font-weight: bold');
        }
        lastProgressAt = now;

        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        // Log every 10% change
        if (pct !== lastPct && (pct % 10 === 0 || pct >= 99 || pct <= 2)) {
          const elapsed = (now - t0) / 1000;
          const speedNow = snap.bytesTransferred / 1048576 / elapsed;
          console.log(`[upload] ${file.name}: ${pct}% (${(snap.bytesTransferred/1048576).toFixed(1)}/${(snap.totalBytes/1048576).toFixed(1)}MB) ${speedNow.toFixed(1)} MB/s [${progressCount} events in ${elapsed.toFixed(1)}s]`);
          lastPct = pct;
        }
        onProgress?.(pct, snap.bytesTransferred, snap.totalBytes);
      },
      (error) => {
        clearTimeout(watchdog);
        clearTimeout(watchdog2);
        console.error(`%c[upload] FAIL ${file.name}: ${error.code} — ${error.message}`, 'color: red; font-weight: bold');
        console.error('[upload] Error details:', error);
        reject(error);
      },
      async () => {
        clearTimeout(watchdog);
        clearTimeout(watchdog2);
        const ms = Date.now() - t0;
        const speed = (file.size / 1048576) / (ms / 1000);
        console.log(`%c[upload] ✅ DONE ${file.name} ${(file.size / 1048576).toFixed(1)}MB in ${(ms / 1000).toFixed(1)}s = ${speed.toFixed(1)} MB/s (${progressCount} progress events)`, 'color: green; font-weight: bold');
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ path, url });
        } catch (e) {
          console.error('[upload] getDownloadURL failed:', e);
          reject(e);
        }
      }
    );
  });
}

export async function getResizedUrl(originalPath, size = '1500x1500') {
  if (!storage) return null;
  const lastSlash = originalPath.lastIndexOf('/');
  const dir = originalPath.substring(0, lastSlash);
  const filename = originalPath.substring(lastSlash + 1).replace(/\.[^.]+$/, '');
  const resizedPath = `${dir}/resized/${filename}_${size}.webp`;
  try {
    const { ref, getDownloadURL } = await import('firebase/storage');
    return await getDownloadURL(ref(storage, resizedPath));
  } catch {
    return null;
  }
}

export async function waitForResized(originalPath, size = '1500x1500', maxAttempts = 20) {
  await new Promise(r => setTimeout(r, 4000));
  for (let i = 0; i < maxAttempts; i++) {
    const url = await getResizedUrl(originalPath, size);
    if (url) return url;
    await new Promise(r => setTimeout(r, Math.min(2000 * Math.pow(1.3, i), 8000)));
  }
  return null;
}

export async function uploadPreview(clientId, projectId, photoId, dataUrl) {
  if (!storage || !dataUrl || dataUrl.startsWith('blob:')) return null;
  try {
    const { ref, uploadString, getDownloadURL } = await import('firebase/storage');
    const path = `uploads/${clientId}/${projectId}/previews/${photoId}.jpg`;
    const storageRef = ref(storage, path);
    await uploadString(storageRef, dataUrl, 'data_url');
    return { path, url: await getDownloadURL(storageRef) };
  } catch (e) {
    console.warn('Preview upload failed', e);
    return null;
  }
}

export async function getPhotoUrl(path) {
  if (!storage) return null;
  try {
    const { ref, getDownloadURL } = await import('firebase/storage');
    return await getDownloadURL(ref(storage, path));
  } catch (e) {
    return null;
  }
}
