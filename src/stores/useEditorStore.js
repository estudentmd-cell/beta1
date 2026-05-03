import { create } from 'zustand';
import {
  createSpread, distributePhotos, autoLayout, assignPhotos,
  buildTree, getVariantCount, getLeaves, getSpreadLeaves,
  cyclePageLayout, shufflePage, smartBuildTree, getOrientation,
  detectFace, autoFillBook, DEFAULT_BOUNDS, FULL_BLEED_BOUNDS,
} from '../utils/layoutEngine';

let _photoId = Date.now() % 100000; // unique across reloads — avoids key collisions with restored photos
const MAX_UNDO = 15;

// Per-file upload progress lives OUTSIDE Zustand to avoid 200-item .map() on every progress tick.
// Widget reads this directly. Only a lightweight _uploadTick bumps Zustand for re-render.
const _uploadPctMap = new Map(); // photoId -> 0-100 (or -1 for failed)
export function getUploadPct(photoId) { return _uploadPctMap.get(photoId) ?? null; }
export function getUploadPctMap() { return _uploadPctMap; }

function cloneSpreads(spreads) {
  try { return structuredClone(spreads); }
  catch { return JSON.parse(JSON.stringify(spreads)); }
}

// Rebuild a page tree from its photos + variant index
function rebuildPage(page) {
  if (!page || page.photos.length === 0) return page;
  const tree = buildTree(page.photos.length, page._vi || 0);
  assignPhotos(tree, page.photos);
  return { ...page, tree };
}

const useEditorStore = create((set, get) => ({
  photos: [],
  spreads: [createSpread([])],
  currentSpread: 0,
  gapMM: 0.5,
  boundsEditing: null,
  guides: false,
  readOnly: false,
  selectedFrame: null,
  swapSource: null,
  // Upload progress tracking — real bytes
  uploadProgress: 0,
  uploadLabel: '',
  isProcessingUpload: false,
  isUploading: false,
  uploadedCount: 0,
  uploadTotalCount: 0,
  uploadBytesTotal: 0,       // total bytes to upload
  uploadBytesSent: 0,        // bytes transferred so far
  uploadSpeed: 0,            // bytes/second (rolling average)
  uploadTier: null,
  initialLoadReady: true,
  _uploadTick: 0,           // bumped to trigger widget re-render without mapping photos array
  panActive: false,
  panLeaf: null,
  undoStack: [],
  redoStack: [],

  // ── Undo/Redo ──
  _pushUndo: () => {
    const { spreads, undoStack } = get();
    const snapshot = cloneSpreads(spreads);
    const newUndo = [...undoStack, snapshot].slice(-MAX_UNDO);
    set({ undoStack: newUndo, redoStack: [], _dirty: true, saveStatus: 'idle' });
  },

  undo: () => {
    const { undoStack, redoStack, spreads, photos } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    const newRedo = [...redoStack, cloneSpreads(spreads)];
    const restored = _relinkPhotos(prev, photos);
    set({ spreads: restored, undoStack: newUndo, redoStack: newRedo, selectedFrame: null, swapSource: null });
  },

  redo: () => {
    const { undoStack, redoStack, spreads, photos } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    const newUndo = [...undoStack, cloneSpreads(spreads)];
    const restored = _relinkPhotos(next, photos);
    set({ spreads: restored, undoStack: newUndo, redoStack: newRedo, selectedFrame: null, swapSource: null });
  },

  // ── Photo management — Instant Upload + Web Worker Thumbs ──
  // 1. Create photo entry instantly (no main thread processing)
  // 2. Upload raw original IMMEDIATELY (maximum bandwidth)
  // 3. Web Worker generates thumb in parallel (off main thread)
  // 4. Extension generates 1500px WebP on server
  // Canvas shows placeholder until 1500px ready. Sidebar shows shimmer → thumb.
  addPhotos: (files) => {
    const extractExifDate = async (file) => {
      try {
        const buf = await file.slice(0, 65536).arrayBuffer();
        const view = new DataView(buf);
        if (view.getUint16(0) === 0xFFD8) {
          let offset = 2;
          while (offset < view.byteLength - 2) {
            const marker = view.getUint16(offset);
            if (marker === 0xFFE1) {
              const exifStr = new TextDecoder().decode(new Uint8Array(buf, offset + 10, Math.min(500, view.byteLength - offset - 10)));
              const match = exifStr.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
              if (match) return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`;
              break;
            }
            if ((marker & 0xFF00) !== 0xFF00) break;
            offset += 2 + view.getUint16(offset + 2);
          }
        }
      } catch {}
      return file.lastModified ? new Date(file.lastModified).toISOString() : null;
    };

    const fileArr = Array.from(files);
    const total = fileArr.length;

    // Detect mobile — reduce concurrency to prevent freezing
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const TIERS = {
      micro:  { concurrent: isMobile ? 2 : 4 },
      small:  { concurrent: isMobile ? 3 : 6 },
      medium: { concurrent: isMobile ? 3 : 8 },
      large:  { concurrent: isMobile ? 3 : 10 },
      bulk:   { concurrent: isMobile ? 3 : 10 },
    };
    const tierName = total <= 5 ? 'micro' : total <= 20 ? 'small' : total <= 60 ? 'medium' : total <= 150 ? 'large' : 'bulk';
    const tier = TIERS[tierName];
    const totalRawBytes = fileArr.reduce((sum, f) => sum + f.size, 0);

    // ── PERF LOG ──
    const _perf = { startTime: Date.now(), tier: tierName, totalFiles: total, totalRawBytes, perFile: [], peakConcurrent: 0 };
    const _fmtMB = (b) => (b / (1024 * 1024)).toFixed(2) + ' MB';
    const _fmtSpeed = (bps) => (bps / (1024 * 1024)).toFixed(2) + ' MB/s';
    console.log(`%c[UPLOAD] Starting: ${total} files, ${_fmtMB(totalRawBytes)} raw, tier="${tierName}", concurrent=${tier.concurrent}`, 'color: #3D6B5E; font-weight: bold');

    // Funnel tracking
    import('../utils/errorTracker').then(({ trackStep }) => trackStep('upload_photos', { count: total })).catch(() => {});

    // Always reset counters on new upload batch
    set({
      isProcessingUpload: false, uploadProgress: 0,
      uploadLabel: `0/${total}`,
      isUploading: true, initialLoadReady: true,
      uploadTotalCount: total,
      uploadedCount: 0,
      uploadBytesTotal: totalRawBytes,
      uploadBytesSent: 0,
      uploadSpeed: 0, uploadTier: tierName,
    });

    // Immediate Firestore save + create order + IP logging — admin sees INSTANTLY
    (async () => {
      try {
        const { createProjectSnapshot, saveProject } = await import('../utils/projectStorage');
        const ps = (await import('../stores/useProjectStore')).default.getState();
        const as = (await import('../stores/useAuthStore')).default.getState();
        const snap = createProjectSnapshot(ps.currentProjectId, ps, get(), as);
        saveProject(snap);

        // Fetch IP
        let clientIp = 'unknown';
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipRes.json();
          clientIp = ipData.ip;
        } catch {}

        const { db } = await import('../firebase/config');
        if (db) {
          const { doc, setDoc } = await import('firebase/firestore');
          const projectId = ps.currentProjectId;

          // Create/update order — auto-created on first upload
          await setDoc(doc(db, 'orders', projectId), {
            id: projectId,
            status: 'draft',
            clientName: as.clientName || as.user?.displayName || '',
            clientEmail: as.clientEmail || as.user?.email || '',
            clientPhone: as.clientPhone || '',
            client_id: as.activeClientId || as.userId || '',
            deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            clientIp,
            userAgent: navigator.userAgent.substring(0, 200),
            totalPhotos: total,
            productConfig: ps.productConfig || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, { merge: true });

          console.log(`%c[SYNC] Order created/updated: #${projectId} | IP: ${clientIp}`, 'color: #B8860B');

          // Notify admin via email when 10+ photos uploaded (once per project)
          if (total >= 10 && !sessionStorage.getItem(`admin_notified_${projectId}`)) {
            sessionStorage.setItem(`admin_notified_${projectId}`, '1');
            try {
              const { getFunctions, httpsCallable } = await import('firebase/functions');
              const functions = getFunctions(undefined, 'europe-west1');
              httpsCallable(functions, 'sendOrderEmail')({
                to: 'fotocartemd@gmail.com',
                templateId: '_admin_new_upload',
                variables: {
                  clientName: as.clientName || 'Client necunoscut',
                  clientEmail: as.clientEmail || '—',
                  clientPhone: as.clientPhone || '—',
                  photoCount: String(total),
                  device: /Mobi|Android/i.test(navigator.userAgent) ? 'Telefon' : 'Calculator',
                  projectId,
                },
              }).catch(() => {});
            } catch {}
          }
        }

        console.log(`%c[SYNC] Instant save on upload start — admin notified`, 'color: #B8860B');
      } catch (syncErr) {
        console.warn('[SYNC] Failed:', syncErr.message);
      }
    })();

    // ── STEP 1: Create photo entries INSTANTLY — no image processing ──
    const photos = [];
    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      const photo = {
        id: 'p' + (++_photoId),
        file,
        fileSize: file.size,
        blob: null,
        thumbData: null,
        loading: true,
        origW: 0, origH: 0, orient: 'S',
        used: false,
        fileName: file.name,
        exifDate: null,
      };
      photos.push(photo);
      _perf.perFile.push({ id: photo.id, name: file.name, rawBytes: file.size, compBytes: file.size, ratio: '0%', compressMs: 0 });
      set((s) => ({ photos: [...s.photos, photo] }));
      // Extract EXIF date in background
      extractExifDate(file).then(date => {
        if (date) {
          photo.exifDate = date;
          set((s) => ({ photos: [...s.photos] }));
        }
      });
    }
    console.log(`%c[UPLOAD] ${photos.length} entries created instantly`, 'color: #B8860B');

    (async () => {

      // ── STEP 3: Upload to CLOUDINARY (instant previews via URL transforms) ──
      const { uploadToCloudinary, getPhotoUrls } = await import('../utils/cloudinaryUpload');
      const [projModule, authModule] = await Promise.all([
        import('../stores/useProjectStore'),
        import('../stores/useAuthStore'),
      ]);
      const projectId = projModule.default?.getState?.()?.currentProjectId || 'draft';
      const authState = authModule.default.getState();
      const clientId = authState.activeClientId || authState.userId || 'anon';
      const folder = `momentive/${clientId}/${projectId}`;

      let active = 0;
      const MAX_CONCURRENT = tier.concurrent;
      const uploadQueue = [...photos];
      const fileProgress = new Map();

      // Throttled Firestore save — saves at most once per 3s during uploads
      let _lastSaveTime = 0;
      let _saveTimer = null;
      const saveThrottled = () => {
        const now = Date.now();
        const elapsed = now - _lastSaveTime;
        if (elapsed >= 3000) {
          _lastSaveTime = now;
          import('../utils/projectStorage').then(async ({ createProjectSnapshot, saveProject }) => {
            const ps = (await import('../stores/useProjectStore')).default.getState();
            const as = (await import('../stores/useAuthStore')).default.getState();
            const snap = createProjectSnapshot(ps.currentProjectId, ps, get(), as);
            await saveProject(snap);
            console.log(`%c[SYNC] Incremental save during upload`, 'color: #B8860B');
          }).catch(() => {});
        } else if (!_saveTimer) {
          _saveTimer = setTimeout(() => { _saveTimer = null; saveThrottled(); }, 3000 - elapsed);
        }
      };

      // Speed tracking
      let speedSamples = [];
      const trackSpeed = (bytesNow) => {
        const now = Date.now();
        speedSamples.push({ time: now, bytes: bytesNow });
        speedSamples = speedSamples.filter(s => now - s.time < 3000);
        if (speedSamples.length >= 2) {
          const oldest = speedSamples[0];
          const elapsed = (now - oldest.time) / 1000;
          if (elapsed > 0) set({ uploadSpeed: Math.round((bytesNow - oldest.bytes) / elapsed) });
        }
      };

      let progressTimer = null;
      const scheduleProgressUpdate = () => {
        if (progressTimer) return;
        progressTimer = setTimeout(() => {
          progressTimer = null;
          const sent = get().uploadBytesSent;
          const tot = get().uploadBytesTotal;
          if (tot > 0) {
            set({ uploadProgress: Math.min(Math.round((sent / tot) * 100), 99) });
            trackSpeed(sent);
          }
        }, 100);
      };

      const processNext = async () => {
        if (uploadQueue.length === 0) {
          if (active === 0) {
            const totalTime = (Date.now() - _perf.startTime) / 1000;
            const totalBytes = _perf.perFile.reduce((s, f) => s + (f.compBytes || 0), 0);
            const avgSpeed = totalTime > 0 ? totalBytes / totalTime : 0;
            console.log(`%c[UPLOAD] ═══ CLOUDINARY PERFORMANCE REPORT ═══`, 'color: #3D6B5E; font-weight: bold; font-size: 13px');
            console.log(`%c Files: ${_perf.totalFiles} | Total: ${_fmtMB(totalBytes)} | Time: ${totalTime.toFixed(1)}s | Speed: ${_fmtSpeed(avgSpeed)}`, 'color: #3D6B5E');
            console.table(_perf.perFile.map(f => ({
              file: f.name?.substring(0, 20), raw: _fmtMB(f.rawBytes),
              'upload(ms)': f.uploadMs || '?',
              'speed': f.uploadMs > 0 ? _fmtSpeed(f.compBytes / (f.uploadMs / 1000)) : '?',
            })));
            set({ isUploading: false, uploadLabel: '', uploadProgress: 100, _uploadTick: get()._uploadTick + 1, uploadSpeed: 0 });
            fileProgress.clear();
            setTimeout(() => _uploadPctMap.clear(), 6000);
            // Save to Firestore once — after ALL photos are done
            try {
              const { createProjectSnapshot, saveProject } = await import('../utils/projectStorage');
              const ps = (await import('../stores/useProjectStore')).default.getState();
              const as = (await import('../stores/useAuthStore')).default.getState();
              const snap = createProjectSnapshot(ps.currentProjectId, ps, get(), as);
              saveProject(snap);
              console.log(`%c[SYNC] Final save (all ${_perf.totalFiles} photos done)`, 'color: #B8860B; font-weight: bold');
            } catch {}
          }
          return;
        }
        if (active >= MAX_CONCURRENT) return;

        active++;
        if (active > _perf.peakConcurrent) _perf.peakConcurrent = active;
        const photo = uploadQueue.shift();

        try {
          if (photo.file) {
            const fileBytes = photo.fileSize || photo.file.size;
            fileProgress.set(photo.id, 0);
            _uploadPctMap.set(photo.id, 0);
            const t0 = Date.now();

            console.log(`%c[CLOUDINARY] Uploading ${photo.fileName} (${_fmtMB(fileBytes)}) slot ${active}/${MAX_CONCURRENT}`, 'color: #3D6B5E');

            let lastBytesReported = 0;
            let actualFileTotal = fileBytes; // may differ after compression
            const result = await uploadToCloudinary(photo.file, folder, (pct, loaded, total) => {
              fileProgress.set(photo.id, pct);
              _uploadPctMap.set(photo.id, pct);
              // Adjust total on first progress if file was compressed
              if (total && total !== actualFileTotal && actualFileTotal === fileBytes) {
                const diff = fileBytes - total;
                if (diff > 0) set((s) => ({ uploadBytesTotal: s.uploadBytesTotal - diff }));
                actualFileTotal = total;
              }
              if (loaded !== undefined) {
                const delta = loaded - lastBytesReported;
                if (delta > 0) { lastBytesReported = loaded; set((s) => ({ uploadBytesSent: s.uploadBytesSent + delta })); }
              }
              if (pct % 5 === 0 || pct >= 99) set((s) => ({ _uploadTick: s._uploadTick + 1 }));
              scheduleProgressUpdate();
            });

            const ms = Date.now() - t0;
            const pe = _perf.perFile.find(f => f.id === photo.id);
            if (pe) { pe.uploadMs = ms; }
            console.log(`%c[CLOUDINARY] ✅ ${photo.fileName} → ${_fmtMB(fileBytes)} in ${(ms/1000).toFixed(1)}s = ${_fmtSpeed(fileBytes/(ms/1000))}`, 'color: #3D6B5E; font-weight: bold');

            // No per-photo sync — save once at the end for max speed

            // Cloudinary returns publicId — generate all URLs instantly
            const urls = getPhotoUrls(result.publicId);
            fileProgress.delete(photo.id);
            _uploadPctMap.set(photo.id, 100);
            const n = get().uploadedCount + 1;

            set((s) => ({
              uploadedCount: n, _uploadTick: s._uploadTick + 1,
              uploadLabel: `${n}/${s.uploadTotalCount}`,
              _dirty: true, saveStatus: 'idle',
              photos: s.photos.map(p => {
                if (p.id !== photo.id) return p;
                if (p.thumbData?.startsWith('blob:')) URL.revokeObjectURL(p.thumbData);
                return {
                  ...p,
                  file: null,
                  storageUrl: urls.original,     // full quality for print
                  previewUrl: urls.preview,       // 1500px WebP for canvas — INSTANT
                  thumbData: urls.thumb,          // 300px for sidebar — INSTANT
                  blob: urls.preview,
                  cloudinaryId: result.publicId,
                  loading: false,                 // READY immediately — no polling needed
                };
              }),
            }));
            saveThrottled();
            scheduleProgressUpdate();
          }
        } catch (e) {
          console.error(`%c[CLOUDINARY] FAILED: ${photo.fileName} — retrying once`, 'color: red; font-weight: bold', e.message);
          // Retry once
          try {
            const retryResult = await uploadToCloudinary(photo.file, folder, () => {});
            const urls = getPhotoUrls(retryResult.publicId);
            console.log(`%c[CLOUDINARY] ✅ RETRY OK: ${photo.fileName}`, 'color: green');
            fileProgress.delete(photo.id);
            _uploadPctMap.set(photo.id, 100);
            const n = get().uploadedCount + 1;
            set((s) => ({
              uploadedCount: n, _uploadTick: s._uploadTick + 1,
              uploadLabel: `${n}/${s.uploadTotalCount}`,
              _dirty: true, saveStatus: 'idle',
              photos: s.photos.map(p => p.id !== photo.id ? p : {
                ...p, file: null, storageUrl: urls.original, previewUrl: urls.preview,
                thumbData: urls.thumb, blob: urls.preview, cloudinaryId: retryResult.publicId, loading: false,
              }),
            }));
            saveThrottled();
          } catch (retryErr) {
            console.error(`%c[CLOUDINARY] PERMANENT FAIL: ${photo.fileName}`, 'color: red; font-weight: bold', retryErr.message);
            fileProgress.delete(photo.id);
            _uploadPctMap.set(photo.id, -1);
            const n = get().uploadedCount + 1;
            set((s) => ({ uploadedCount: n, _uploadTick: s._uploadTick + 1, uploadLabel: `${n}/${s.uploadTotalCount}`, photos: s.photos.map(p => p.id === photo.id ? { ...p, file: null } : p) }));
          }
          scheduleProgressUpdate();
        }

        active--;
        processNext();
      };

      // Kick off uploads immediately
      console.log(`%c[CLOUDINARY] Queue: ${uploadQueue.length} photos → ${MAX_CONCURRENT} concurrent`, 'color: orange; font-weight: bold');
      for (let i = 0; i < MAX_CONCURRENT; i++) processNext();

      // Face detection in background — QUEUED (max 1-2 concurrent to prevent mobile freeze)
      const FACE_CONCURRENT = isMobile ? 1 : 2;
      let faceActive = 0;
      const faceQueue = photos.map(p => p.id);
      const runNextFace = () => {
        if (faceActive >= FACE_CONCURRENT || faceQueue.length === 0) return;
        const photoId = faceQueue.shift();
        // Get fresh photo data (thumbData may have arrived since queueing)
        const freshPhoto = get().photos.find(p => p.id === photoId);
        if (!freshPhoto || freshPhoto.hasFace) { runNextFace(); return; }
        // Wait for thumbData if not ready yet (better detection quality)
        if (!freshPhoto.thumbData && !freshPhoto.previewUrl) {
          faceQueue.push(photoId); // re-queue
          setTimeout(runNextFace, 1000);
          return;
        }
        faceActive++;
        detectFace(freshPhoto).then((r) => {
          if (r.hasFace) set((s) => ({ photos: s.photos.map(p => p.id === photoId ? { ...p, cropOffset: { opx: r.opx, opy: r.opy }, hasFace: true } : p) }));
        }).finally(() => { faceActive--; runNextFace(); });
      };
      // Start face detection after uploads have a head start
      setTimeout(() => { for (let i = 0; i < FACE_CONCURRENT; i++) runNextFace(); }, isMobile ? 3000 : 1000);
    })();
  },

  // ── Reorder photos in gallery (drag & drop) ──
  reorderPhoto: (fromIdx, toIdx) => {
    const { photos } = get();
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(fromIdx, 1);
    newPhotos.splice(toIdx, 0, moved);
    set({ photos: newPhotos });
  },

  // ── Reorder photos by array of IDs ──
  reorderPhotos: (ids) => {
    const { photos } = get();
    const map = new Map(photos.map(p => [p.id, p]));
    const idSet = new Set(ids);
    const reordered = ids.map(id => map.get(id)).filter(Boolean);
    // Add any photos not in ids at the end (e.g. still uploading)
    photos.forEach(p => { if (!idSet.has(p.id)) reordered.push(p); });
    set({ photos: [...reordered], _dirty: true, saveStatus: 'idle' });
  },

  // ── Sort photos by EXIF date (chronological) ──
  sortByDate: () => {
    const { photos } = get();
    const sorted = [...photos].sort((a, b) => {
      const da = a.exifDate || a.fileName || '';
      const db = b.exifDate || b.fileName || '';
      return da < db ? -1 : da > db ? 1 : 0;
    });
    set({ photos: sorted });
  },

  // ── Sort photos by filename ──
  sortByName: () => {
    const { photos } = get();
    const sorted = [...photos].sort((a, b) =>
      (a.fileName || '').localeCompare(b.fileName || '', undefined, { numeric: true })
    );
    set({ photos: sorted });
  },

  // ── Remove photo from gallery entirely ──
  removePhoto: (photoId) => {
    const { photos, spreads } = get();
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;
    // If used in a spread, remove from frames first
    if (photo.used) {
      spreads.forEach((sp) => {
        // Regular spreads
        ['full', 'left', 'right'].forEach((key) => {
          if (sp[key]?.tree) {
            getLeaves(sp[key].tree).forEach((leaf) => {
              if (leaf.photo?.id === photoId) leaf.photo = null;
            });
          }
        });
        if (sp.photos) sp.photos = sp.photos.filter((p) => p.id !== photoId);
        // Cover frames
        if (sp.coverFrames) {
          sp.coverFrames.forEach((f) => {
            if (f.photo?.id === photoId) f.photo = null;
          });
        }
      });
    }
    // Revoke blob URL
    if (photo.blob) URL.revokeObjectURL(photo.blob);
    const newPhotos = photos.filter((p) => p.id !== photoId);
    set({ photos: newPhotos, spreads: [...spreads], _dirty: true, saveStatus: 'idle' });
  },

  // ── Place photo into first empty frame on current spread (click from sidebar) ──
  placePhoto: (photoId) => {
    const state = get();
    const { spreads, currentSpread, photos } = state;
    const photo = photos.find((p) => p.id === photoId);
    if (!photo || photo.used) return;

    const sp = spreads[currentSpread];

    // If on cover spread, use cover frame system
    if (sp?.isCover) {
      state.placeCoverPhotoAuto(photoId);
      return;
    }
    const leaves = getSpreadLeaves(sp);
    const emptyLeaf = leaves.find((l) => !l.photo);

    if (emptyLeaf) {
      // Place into existing empty frame
      state._pushUndo();
      emptyLeaf.photo = photo;
      photo.used = true;
      // Track in spread photos
      if (!sp.photos.find((p) => p.id === photoId)) sp.photos.push(photo);
      const newSpreads = [...spreads];
      newSpreads[currentSpread] = { ...sp };
      set({ spreads: newSpreads, photos: [...photos], _dirty: true, saveStatus: 'idle' });
    } else {
      // No empty frame — add photo to spread and rebuild layout with N+1 photos
      state._pushUndo();
      photo.used = true;
      const newPhotos = [...sp.photos, photo];
      const mid = Math.ceil(newPhotos.length / 2);
      const lp = newPhotos.slice(0, mid);
      const rp = newPhotos.slice(mid);

      // Active mode gets smartBuildTree (best variant), inactive mode gets fast buildTree
      const isPageMode = sp.mode === 'page';
      let fullTree, leftTree, rightTree;
      if (isPageMode) {
        // Page mode: client sees left/right → those get smart layout
        leftTree = autoLayout(lp);
        rightTree = autoLayout(rp);
        fullTree = buildTree(newPhotos.length, 0);
        assignPhotos(fullTree, newPhotos);
      } else {
        // Spread mode: client sees full → that gets smart layout
        fullTree = autoLayout(newPhotos);
        leftTree = buildTree(lp.length, 0);
        assignPhotos(leftTree, lp);
        rightTree = buildTree(rp.length, 0);
        assignPhotos(rightTree, rp);
      }

      const newSpreads = [...spreads];
      newSpreads[currentSpread] = {
        ...sp, photos: newPhotos,
        full: { photos: newPhotos, tree: fullTree, _vi: 0 },
        left: { photos: lp, tree: leftTree, _vi: 0 },
        right: { photos: rp, tree: rightTree, _vi: 0 },
      };
      set({ spreads: newSpreads, photos: [...photos], _dirty: true, saveStatus: 'idle' });
    }
  },

  // ── Place photo into a specific frame by leaf id (drag & drop) ──
  placePhotoInFrame: (photoId, leafId, forceOverride = false) => {
    const state = get();
    const { spreads, currentSpread, photos } = state;
    const photo = photos.find((p) => p.id === photoId);
    if (!photo || photo.used) return;

    // ── Orientation check ──
    if (!forceOverride) {
      const photoOrient = getOrientation(photo);
      for (const sp of spreads) {
        const allLeaves = getSpreadLeaves(sp);
        const targetLeaf = allLeaves.find(l => l.id === leafId);
        if (targetLeaf) {
          const leafSlot = targetLeaf._proFrame?.slot || targetLeaf.slot || 'S';
          if (photoOrient !== 'S' && leafSlot !== 'S' && photoOrient !== leafSlot) {
            return; // Blocked — orientation mismatch
          }
          break;
        }
      }
    }

    const sp = spreads[currentSpread];
    const leaves = getSpreadLeaves(sp);
    const leaf = leaves.find((l) => l.id === leafId);
    if (!leaf) return;

    state._pushUndo();
    // If frame already has a photo, mark old one as unused
    if (leaf.photo) {
      const oldPhoto = photos.find((p) => p.id === leaf.photo.id);
      if (oldPhoto) oldPhoto.used = false;
    }
    leaf.photo = photo;
    leaf.cropOffset = { opx: 50, opy: 50 };
    photo.used = true;
    if (!sp.photos.find((p) => p.id === photoId)) sp.photos.push(photo);
    const newSpreads = [...spreads];
    newSpreads[currentSpread] = { ...sp };
    set({ spreads: newSpreads, photos: [...photos], _dirty: true, saveStatus: 'idle' });
  },

  // ── Navigation ──
  goToSpread: (idx) => {
    const { spreads } = get();
    if (idx >= 0 && idx < spreads.length)
      set({ currentSpread: idx, selectedFrame: null, swapSource: null, panActive: false });
  },
  nextSpread: () => {
    const { currentSpread, spreads } = get();
    if (currentSpread < spreads.length - 1)
      set({ currentSpread: currentSpread + 1, selectedFrame: null, swapSource: null, panActive: false });
  },
  prevSpread: () => {
    const { currentSpread } = get();
    if (currentSpread > 0)
      set({ currentSpread: currentSpread - 1, selectedFrame: null, swapSource: null, panActive: false });
  },

  // ═══ V10 EXACT SBAR LOGIC ═══
  //
  // sbarLP/sbarLN (Left ‹/›):
  //   If spread mode → auto-switch to page mode first
  //   Then cycle LEFT page layout (prev/next)
  //
  // sbarMP/sbarMN (Center ‹/›):
  //   If page mode → auto-switch to spread mode first
  //   ‹ = mixRotatePrev (rotate photos: move last→first + next variant)
  //   › = mixRotate (full shuffle: randomize photos + random variant)
  //
  // sbarRP/sbarRN (Right ‹/›):
  //   If spread mode → auto-switch to page mode first
  //   Then cycle RIGHT page layout (prev/next)

  // Helper: ensure spread is in page mode, splitting photos if needed
  _ensurePageMode: (sp) => {
    if (sp.mode === 'page') return sp;
    // Convert from spread to page: split photos left/right
    const allPhotos = sp.photos || [];
    const mid = Math.ceil(allPhotos.length / 2);
    const lp = allPhotos.slice(0, mid);
    const rp = allPhotos.slice(mid);
    return {
      ...sp,
      mode: 'page',
      left: { photos: lp, tree: autoLayout(lp), _vi: 0 },
      right: { photos: rp, tree: autoLayout(rp), _vi: 0 },
    };
  },

  // Helper: ensure spread is in spread mode
  _ensureSpreadMode: (sp) => {
    if (sp.mode === 'spread') return sp;
    return { ...sp, mode: 'spread' };
  },

  // LEFT ‹ — switch to page mode if needed, cycle left page layout BACKWARD
  sbarLP: () => {
    const state = get();
    let sp = { ...state.spreads[state.currentSpread] };
    if (!sp || sp.photos.length === 0) return;
    state._pushUndo();
    sp = state._ensurePageMode(sp);
    if (sp.left && sp.left.photos.length > 0) {
      sp.left = cyclePageLayout(sp.left, -1);
    }
    const newSpreads = [...state.spreads];
    newSpreads[state.currentSpread] = sp;
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },

  // LEFT › — switch to page mode if needed, cycle left page layout FORWARD
  sbarLN: () => {
    const state = get();
    let sp = { ...state.spreads[state.currentSpread] };
    if (!sp || sp.photos.length === 0) return;
    state._pushUndo();
    sp = state._ensurePageMode(sp);
    if (sp.left && sp.left.photos.length > 0) {
      sp.left = cyclePageLayout(sp.left, 1);
    }
    const newSpreads = [...state.spreads];
    newSpreads[state.currentSpread] = sp;
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },

  // CENTER ‹ — switch to spread mode if needed, then mixRotatePrev
  // (rotate: move last photo to front + increment variant)
  sbarMP: () => {
    // Block spread mode for subtiri
    try {
      const projStore = require('../stores/useProjectStore').default;
      if (projStore?.getState?.()?.productConfig?.slug === 'pagini-subtiri') return;
    } catch {}
    const state = get();
    let sp = { ...state.spreads[state.currentSpread] };
    if (!sp || sp.photos.length < 2) return;
    state._pushUndo();
    sp = state._ensureSpreadMode(sp);
    const pg = sp.full;
    if (pg && pg.photos.length >= 2) {
      // Rotate: move last photo to front
      const last = pg.photos.pop();
      pg.photos.unshift(last);
      pg._vi = ((pg._vi || 0) + 1) % Math.max(getVariantCount(pg.photos.length), 1);
      const newTree = buildTree(pg.photos.length, pg._vi);
      assignPhotos(newTree, pg.photos);
      sp.full = { ...pg, tree: newTree };
    }
    const newSpreads = [...state.spreads];
    newSpreads[state.currentSpread] = sp;
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },

  // CENTER › — switch to spread mode if needed, then mixRotate
  // (shuffle: randomize all photos + random variant)
  sbarMN: () => {
    const state = get();
    let sp = { ...state.spreads[state.currentSpread] };
    if (!sp || sp.photos.length < 2) return;
    state._pushUndo();
    sp = state._ensureSpreadMode(sp);
    const pg = sp.full;
    if (pg && pg.photos.length >= 2) {
      // Fisher-Yates shuffle
      for (let i = pg.photos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pg.photos[i], pg.photos[j]] = [pg.photos[j], pg.photos[i]];
      }
      pg._vi = Math.floor(Math.random() * 10);
      const newTree = buildTree(pg.photos.length, pg._vi);
      assignPhotos(newTree, pg.photos);
      sp.full = { ...pg, tree: newTree };
    }
    const newSpreads = [...state.spreads];
    newSpreads[state.currentSpread] = sp;
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },

  // RIGHT ‹ — switch to page mode if needed, cycle right page layout BACKWARD
  sbarRP: () => {
    const state = get();
    let sp = { ...state.spreads[state.currentSpread] };
    if (!sp || sp.photos.length === 0) return;
    state._pushUndo();
    sp = state._ensurePageMode(sp);
    if (sp.right && sp.right.photos.length > 0) {
      sp.right = cyclePageLayout(sp.right, -1);
    }
    const newSpreads = [...state.spreads];
    newSpreads[state.currentSpread] = sp;
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },

  // RIGHT › — switch to page mode if needed, cycle right page layout FORWARD
  sbarRN: () => {
    const state = get();
    let sp = { ...state.spreads[state.currentSpread] };
    if (!sp || sp.photos.length === 0) return;
    state._pushUndo();
    sp = state._ensurePageMode(sp);
    if (sp.right && sp.right.photos.length > 0) {
      sp.right = cyclePageLayout(sp.right, 1);
    }
    const newSpreads = [...state.spreads];
    newSpreads[state.currentSpread] = sp;
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },

  // ── Auto-layout current spread ──
  autoLayoutCurrent: () => {
    const state = get();
    const sp = state.spreads[state.currentSpread];
    if (!sp || sp.photos.length === 0) return;
    state._pushUndo();
    const mid = Math.ceil(sp.photos.length / 2);
    const lp = sp.photos.slice(0, mid);
    const rp = sp.photos.slice(mid);
    const isPageMode = sp.mode === 'page';

    let fullTree, leftTree, rightTree;
    if (isPageMode) {
      leftTree = autoLayout(lp);
      rightTree = autoLayout(rp);
      fullTree = buildTree(sp.photos.length, 0);
      assignPhotos(fullTree, sp.photos);
    } else {
      fullTree = autoLayout(sp.photos);
      leftTree = buildTree(lp.length, 0);
      assignPhotos(leftTree, lp);
      rightTree = buildTree(rp.length, 0);
      assignPhotos(rightTree, rp);
    }

    const newSpreads = [...state.spreads];
    newSpreads[state.currentSpread] = {
      ...sp,
      full: { photos: sp.photos, tree: fullTree, _vi: 0 },
      left: { photos: lp, tree: leftTree, _vi: 0 },
      right: { photos: rp, tree: rightTree, _vi: 0 },
    };
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },

  // ── Apply collage layout (photo-aware, from collageLayoutEngine) ──
  applyCollageLayout: (cells) => {
    const state = get();
    const sp = state.spreads[state.currentSpread];
    if (!sp || sp.isCover || sp.photos.length === 0) return;
    state._pushUndo();
    const { cellsToTree } = require('../utils/collageLayoutEngine');
    const tree = cellsToTree(cells, sp.photos);
    const newSpreads = [...state.spreads];
    newSpreads[state.currentSpread] = {
      ...sp,
      mode: 'spread',
      full: { photos: sp.photos, tree, _vi: 0, bounds: sp.full?.bounds },
      left: { ...sp.left },
      right: { ...sp.right },
    };
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle', _tick: state._tick + 1 });
  },

  // ── Apply a professional template to current spread ──
  applyProTemplate: async (template) => {
    if (!template) return;
    const state = get();
    const sp = state.spreads[state.currentSpread];
    if (!sp) return;
    state._pushUndo();
    const { applyProTemplate } = await import('../utils/layoutEngine');
    const photos = sp.photos.length > 0 ? sp.photos : [];
    const proPage = applyProTemplate(template, photos);
    if (!proPage) return;
    const newSpreads = [...state.spreads];
    newSpreads[state.currentSpread] = {
      ...sp,
      mode: 'spread',
      full: proPage,
      left: { ...sp.left },
      right: { ...sp.right },
    };
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },

  // ── Toggle spread/page mode ──
  toggleMode: () => {
    // Block spread mode for subtiri — always page mode
    try {
      const projStore = require('../stores/useProjectStore').default;
      if (projStore?.getState?.()?.productConfig?.slug === 'pagini-subtiri') return;
    } catch {}

    const state = get();
    const sp = state.spreads[state.currentSpread];
    if (!sp) return;
    state._pushUndo();
    const newSpreads = [...state.spreads];
    if (sp.mode === 'spread') {
      newSpreads[state.currentSpread] = state._ensurePageMode({ ...sp });
    } else {
      newSpreads[state.currentSpread] = state._ensureSpreadMode({ ...sp });
    }
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },

  _tick: 0,
  _dirty: false,  // true = unsaved changes exist
  saveStatus: 'idle', // 'idle' | 'saving' | 'saved'
  markDirty: () => set({ _dirty: true, saveStatus: 'idle' }),
  markSaved: () => set({ _dirty: false, saveStatus: 'saved' }),
  markSaving: () => set({ saveStatus: 'saving' }),

  // ── Separator ratio update (live during drag) ──
  updateRatio: (node, newRatio) => {
    const MIN_RATIO = 0.15;
    node.ratio = Math.max(MIN_RATIO, Math.min(1 - MIN_RATIO, newRatio));
    // Increment tick to force re-render — the tree is mutated in-place
    set((s) => ({ _tick: s._tick + 1, _dirty: true, saveStatus: 'idle' }));
  },

  toggleFullBleed: (spreadIdx) => {
    const { spreads } = get();
    const idx = spreadIdx ?? get().currentSpread;
    const sp = spreads[idx];
    if (!sp || sp.isCover) return;
    get()._pushUndo();
    const isCurrentlyFullBleed = !sp.full?.bounds ||
      (sp.full.bounds.top === 0 && sp.full.bounds.right === 0 && sp.full.bounds.bottom === 0 && sp.full.bounds.left === 0);
    const newBounds = isCurrentlyFullBleed ? DEFAULT_BOUNDS : FULL_BLEED_BOUNDS;
    const updated = [...spreads];
    updated[idx] = {
      ...sp,
      full: { ...sp.full, bounds: newBounds },
      left: { ...sp.left, bounds: newBounds },
      right: { ...sp.right, bounds: newBounds },
    };
    set({ spreads: updated, _tick: get()._tick + 1 });
  },

  // Push undo once at start of separator drag
  pushUndoForSep: () => { get()._pushUndo(); },

  // ── Frame selection ──
  selectFrame: (leafId) => {
    const { swapSource } = get();
    if (swapSource) { get().completeSwap(leafId); }
    else { set({ selectedFrame: leafId, panActive: false, boundsEditing: null }); }
  },
  clearSelection: () => set({ selectedFrame: null, swapSource: null, panActive: false }),

  // ── Swap ──
  startSwap: (leafId) => set({ swapSource: leafId, selectedFrame: null }),
  completeSwap: (targetLeafId) => {
    const state = get();
    const { swapSource, spreads, currentSpread } = state;
    if (!swapSource || swapSource === targetLeafId) { set({ swapSource: null }); return; }
    state._pushUndo();
    const sp = spreads[currentSpread];
    const leaves = getSpreadLeaves(sp);
    const srcLeaf = leaves.find((l) => l.id === swapSource);
    const tgtLeaf = leaves.find((l) => l.id === targetLeafId);
    if (srcLeaf && tgtLeaf) {
      const tmpPhoto = srcLeaf.photo;
      const tmpCrop = { ...srcLeaf.cropOffset };
      srcLeaf.photo = tgtLeaf.photo;
      srcLeaf.cropOffset = { ...tgtLeaf.cropOffset };
      tgtLeaf.photo = tmpPhoto;
      tgtLeaf.cropOffset = tmpCrop;
    }
    const newSpreads = [...spreads];
    newSpreads[currentSpread] = { ...sp };
    set({ spreads: newSpreads, swapSource: null, selectedFrame: null, _dirty: true, saveStatus: 'idle' });
  },
  cancelSwap: () => set({ swapSource: null }),

  // ── Remove photo from frame → auto-rebuild layout ──
  removeFromFrame: (leafId) => {
    const state = get();
    const { spreads, currentSpread, photos } = state;
    state._pushUndo();
    const sp = spreads[currentSpread];
    const leaves = getSpreadLeaves(sp);
    const leaf = leaves.find((l) => l.id === leafId);
    if (leaf && leaf.photo) {
      const photoId = leaf.photo.id;
      const found = photos.find((p) => p.id === photoId);
      if (found) found.used = false;
      const remainingPhotos = sp.photos.filter((p) => p.id !== photoId);
      const mid = Math.ceil(remainingPhotos.length / 2);
      const lp = remainingPhotos.slice(0, mid);
      const rp = remainingPhotos.slice(mid);
      const newSpreads = [...spreads];
      newSpreads[currentSpread] = {
        ...sp, photos: remainingPhotos,
        full: { photos: remainingPhotos, tree: autoLayout(remainingPhotos), _vi: 0 },
        left: { photos: lp, tree: autoLayout(lp), _vi: 0 },
        right: { photos: rp, tree: autoLayout(rp), _vi: 0 },
      };
      set({ spreads: newSpreads, photos: [...photos], selectedFrame: null, _dirty: true, saveStatus: 'idle' });
    }
  },

  // ── Pan/crop ──
  enterPan: (leafId) => set({ panActive: true, panLeaf: leafId, selectedFrame: null }),
  updateCropOffset: (leafId, opx, opy) => {
    const { spreads, currentSpread } = get();
    const sp = spreads[currentSpread];
    const leaves = getSpreadLeaves(sp);
    const leaf = leaves.find((l) => l.id === leafId);
    if (leaf) {
      leaf.cropOffset = { opx: Math.max(0, Math.min(100, opx)), opy: Math.max(0, Math.min(100, opy)) };
      const newSpreads = [...spreads];
      newSpreads[currentSpread] = { ...sp };
      set((s) => ({ spreads: newSpreads, _tick: s._tick + 1, _dirty: true, saveStatus: 'idle' }));
    }
  },
  exitPan: () => set({ panActive: false, panLeaf: null }),

  // ── Gap / Guides ──
  setGap: (mm) => set({ gapMM: mm }),
  toggleGuides: () => set((s) => ({ guides: !s.guides })),
  startBoundsEdit: (side) => set({ boundsEditing: side, selectedFrame: null }),
  stopBoundsEdit: () => set({ boundsEditing: null }),
  updatePageBounds: (spreadIdx, side, bounds) => { const spreads = cloneSpreads(get().spreads); const sp = spreads[spreadIdx]; if (!sp) return; const page = side === 'full' ? sp.full : side === 'left' ? sp.left : sp.right; if (page) page.bounds = { ...page.bounds, ...bounds }; set({ spreads, _dirty: true, saveStatus: 'idle' }); },

  // ── Initialize spreads from product config ──
  initSpreads: (totalSpreads, coverTemplate) => {
    // Check if product is subtiri — force page mode
    let isSubtiri = false;
    try {
      const projStore = require('../stores/useProjectStore').default;
      isSubtiri = projStore?.getState?.()?.productConfig?.slug === 'pagini-subtiri';
    } catch {}

    const newSpreads = [];
    for (let i = 0; i < totalSpreads; i++) {
      const sp = createSpread([]);
      // Subtiri: force page mode (left/right independent, not spread)
      if (isSubtiri && !sp.isCover) {
        sp.mode = 'page';
      }
      if (i === 0 && coverTemplate) {
        sp.isCover = true;
        sp.coverTemplate = coverTemplate;

        // Pick elements for the selected format (perFormat), fallback to flat fields
        let format = '20×20';
        try {
          const projStore = require('../stores/useProjectStore').default;
          format = projStore?.getState?.()?.productConfig?.format || '20×20';
        } catch {}

        const pfMap = coverTemplate.perFormat || {};
        // Robust format lookup: exact match → normalized match → first available → flat fallback
        const normalizedFormat = format.replace('×', 'x').replace('x', '×');
        const pfKeys = Object.keys(pfMap);
        let pf = pfMap[format] || pfMap[normalizedFormat] || null;
        // Try matching without special chars
        if (!pf && pfKeys.length > 0) {
          const fmtClean = format.replace(/[×x]/g, '');
          const match = pfKeys.find(k => k.replace(/[×x]/g, '') === fmtClean);
          if (match) pf = pfMap[match];
        }
        // Last resort: pick first available perFormat entry
        if (!pf && pfKeys.length > 0) {
          pf = pfMap[pfKeys[0]];
        }

        const tplFrames = pf?.frames || coverTemplate.frames || [];
        const tplTexts = pf?.texts || coverTemplate.texts || [];
        const tplDecorTexts = pf?.decorTexts || coverTemplate.decorTexts || [];
        const tplDecorImages = pf?.decorImages || coverTemplate.decorImages || [];

        // Always sync coverTemplate with resolved format data
        sp.coverTemplate = {
          ...coverTemplate,
          frames: tplFrames,
          texts: tplTexts,
          decorTexts: tplDecorTexts,
          decorImages: tplDecorImages,
        };

        sp.coverFrames = tplFrames.map((f) => ({
          ...f,
          photo: null,
          cropOffset: { opx: 50, opy: 50 },
        }));
        sp.coverTexts = tplTexts.map((t) => ({
          ...t,
          text: t.placeholder || '',
          fontSize: (t.fontSize && t.fontSize <= 12) ? t.fontSize : 7,
        }));
      }
      newSpreads.push(sp);
    }
    set({
      spreads: newSpreads,
      currentSpread: 0,
      photos: [],
      undoStack: [],
      redoStack: [],
      selectedFrame: null,
      swapSource: null,
      _dirty: true,
      saveStatus: 'idle',
    });
  },

  // ── Cover: place photo in a specific cover frame ──
  placeCoverPhoto: (frameId, photoId) => {
    const state = get();
    const { spreads, currentSpread, photos } = state;
    const sp = spreads[currentSpread];
    if (!sp?.isCover) return;
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    state._pushUndo();
    const frame = sp.coverFrames.find((f) => f.id === frameId);
    if (!frame) return;
    // If frame already has photo, mark old as unused
    if (frame.photo) {
      const old = photos.find((p) => p.id === frame.photo.id);
      if (old) old.used = false;
    }
    frame.photo = photo;
    photo.used = true;
    const newSpreads = [...spreads];
    newSpreads[currentSpread] = { ...sp };
    set({ spreads: newSpreads, photos: [...photos], _dirty: true, saveStatus: 'idle' });
  },

  // ── Cover: place photo in first empty cover frame, or replace first frame ──
  placeCoverPhotoAuto: (photoId) => {
    const state = get();
    const { spreads, currentSpread } = state;
    const sp = spreads[currentSpread];
    if (!sp?.isCover || !sp.coverFrames?.length) return false;
    const emptyFrame = sp.coverFrames.find((f) => !f.photo);
    const targetFrame = emptyFrame || sp.coverFrames[0];
    state.placeCoverPhoto(targetFrame.id, photoId);
    return true;
  },

  // ── Cover: remove photo from cover frame ──
  removeCoverPhoto: (frameId) => {
    const state = get();
    const { spreads, currentSpread, photos } = state;
    const sp = spreads[currentSpread];
    if (!sp?.isCover) return;
    state._pushUndo();
    const frame = sp.coverFrames.find((f) => f.id === frameId);
    if (frame?.photo) {
      const found = photos.find((p) => p.id === frame.photo.id);
      if (found) found.used = false;
      frame.photo = null;
    }
    const newSpreads = [...spreads];
    newSpreads[currentSpread] = { ...sp };
    set({ spreads: newSpreads, photos: [...photos], _dirty: true, saveStatus: 'idle' });
  },

  // ── Cover: update crop offset (pan photo in frame) ──
  updateCoverCrop: (frameId, opx, opy) => {
    const { spreads, currentSpread } = get();
    const sp = spreads[currentSpread];
    if (!sp?.isCover) return;
    const frame = sp.coverFrames.find((f) => f.id === frameId);
    if (frame) {
      frame.cropOffset = {
        opx: Math.max(0, Math.min(100, opx)),
        opy: Math.max(0, Math.min(100, opy)),
      };
      const newSpreads = [...spreads];
      newSpreads[currentSpread] = { ...sp };
      set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
    }
  },

  // ── Cover: resize frame (client can adjust photo frame dimensions) ──
  updateCoverFrameSize: (frameId, x, y, w, h) => {
    const { spreads, currentSpread } = get();
    const sp = spreads[currentSpread];
    if (!sp?.isCover) return;
    const frame = sp.coverFrames.find((f) => f.id === frameId);
    if (frame) {
      frame.x = Math.max(0, Math.min(100, x));
      frame.y = Math.max(0, Math.min(100, y));
      frame.w = Math.max(5, Math.min(100, w));  // min 5% so frame doesn't disappear
      frame.h = Math.max(5, Math.min(100, h));
      const newSpreads = [...spreads];
      newSpreads[currentSpread] = { ...sp };
      set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
    }
  },

  // ── Cover: move/resize text zone ──
  updateCoverTextSize: (textId, x, y, w, h) => {
    const { spreads, currentSpread } = get();
    const sp = spreads[currentSpread];
    if (!sp?.isCover) return;
    const tz = sp.coverTexts.find((t) => t.id === textId);
    if (tz) {
      tz.x = Math.max(-50, Math.min(100, x));
      tz.y = Math.max(-10, Math.min(110, y));
      tz.w = Math.max(5, Math.min(150, w));
      tz.h = Math.max(3, Math.min(150, h));
      const newSpreads = [...spreads];
      newSpreads[currentSpread] = { ...sp };
      set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
    }
  },

  // ── Cover: update text ──
  setCoverText: (textId, text) => {
    const { spreads, currentSpread } = get();
    const sp = spreads[currentSpread];
    if (!sp?.isCover) return;
    const newCoverTexts = sp.coverTexts.map(t => t.id === textId ? { ...t, text } : t);
    const newSpreads = [...spreads];
    newSpreads[currentSpread] = { ...sp, coverTexts: newCoverTexts };
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },

  updateCoverTextStyle: (textId, prop, value) => {
    const { spreads, currentSpread } = get();
    const sp = spreads[currentSpread];
    if (!sp?.isCover) return;
    const newCoverTexts = sp.coverTexts.map((t) =>
      t.id === textId ? { ...t, [prop]: value } : t
    );
    const newSpreads = [...spreads];
    newSpreads[currentSpread] = { ...sp, coverTexts: newCoverTexts };
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },

  // ── Move decorative elements (images + texts from PSD) ──
  moveCoverDecorImage: (decorId, x, y) => {
    const { spreads, currentSpread } = get();
    const sp = spreads[currentSpread];
    if (!sp?.isCover || !sp.coverTemplate?.decorImages) return;
    const di = sp.coverTemplate.decorImages.find(d => d.id === decorId);
    if (di) { di.x = Math.max(0, Math.min(100, x)); di.y = Math.max(0, Math.min(100, y)); }
    const newSpreads = [...spreads];
    newSpreads[currentSpread] = { ...sp, coverTemplate: { ...sp.coverTemplate } };
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },
  resizeCoverDecorImage: (decorId, x, y, w, h) => {
    const { spreads, currentSpread } = get();
    const sp = spreads[currentSpread];
    if (!sp?.isCover || !sp.coverTemplate?.decorImages) return;
    const di = sp.coverTemplate.decorImages.find(d => d.id === decorId);
    if (di) { di.x = Math.max(0, x); di.y = Math.max(0, y); di.w = Math.max(2, w); di.h = Math.max(2, h); }
    const newSpreads = [...spreads];
    newSpreads[currentSpread] = { ...sp, coverTemplate: { ...sp.coverTemplate } };
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },
  moveCoverDecorText: (decorId, x, y) => {
    const { spreads, currentSpread } = get();
    const sp = spreads[currentSpread];
    if (!sp?.isCover || !sp.coverTemplate?.decorTexts) return;
    const dt = sp.coverTemplate.decorTexts.find(d => d.id === decorId);
    if (dt) { dt.x = Math.max(0, Math.min(100, x)); dt.y = Math.max(0, Math.min(100, y)); }
    const newSpreads = [...spreads];
    newSpreads[currentSpread] = { ...sp, coverTemplate: { ...sp.coverTemplate } };
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },
  resizeCoverDecorText: (decorId, x, y, w, h) => {
    const { spreads, currentSpread } = get();
    const sp = spreads[currentSpread];
    if (!sp?.isCover || !sp.coverTemplate?.decorTexts) return;
    const dt = sp.coverTemplate.decorTexts.find(d => d.id === decorId);
    if (dt) { dt.x = Math.max(0, x); dt.y = Math.max(0, y); dt.w = Math.max(2, w); dt.h = Math.max(2, h); }
    const newSpreads = [...spreads];
    newSpreads[currentSpread] = { ...sp, coverTemplate: { ...sp.coverTemplate } };
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },

  // ── Update cover background color ──
  updateCoverBg: (color) => {
    const { spreads } = get();
    const coverIdx = spreads.findIndex(s => s.isCover);
    if (coverIdx < 0) return;
    const sp = spreads[coverIdx];
    const newSpreads = [...spreads];
    newSpreads[coverIdx] = {
      ...sp,
      coverTemplate: {
        ...sp.coverTemplate,
        coverStyle: { ...(sp.coverTemplate?.coverStyle || {}), bg: color },
      },
    };
    set({ spreads: newSpreads, _dirty: true, saveStatus: 'idle' });
  },

  // ── Add/Remove spreads ──
  addSpread: () => {
    const { spreads } = get();
    set({ spreads: [...spreads, createSpread([])], _dirty: true, saveStatus: 'idle' });
  },
  removeSpread: (idx) => {
    const { spreads, currentSpread, photos } = get();
    if (spreads.length <= 1) return;
    get()._pushUndo();
    const removed = spreads[idx];
    if (removed.photos) {
      removed.photos.forEach((p) => {
        const found = photos.find((ph) => ph.id === p.id);
        if (found) found.used = false;
      });
    }
    const newSpreads = spreads.filter((_, i) => i !== idx);
    const newCurrent = currentSpread >= newSpreads.length ? newSpreads.length - 1 : currentSpread;
    set({ spreads: newSpreads, currentSpread: newCurrent, photos: [...photos] });
  },

  // ── Clear all photos from a spread (photos return to gallery as unused) ──
  clearSpread: (idx) => {
    const state = get();
    const { spreads, photos } = state;
    const sp = spreads[idx];
    if (!sp || sp.isCover) return;
    if (!sp.photos || sp.photos.length === 0) return;
    state._pushUndo();
    sp.photos.forEach((p) => {
      const found = photos.find((ph) => ph.id === p.id);
      if (found) found.used = false;
    });
    const newSpreads = [...spreads];
    newSpreads[idx] = createSpread([]);
    newSpreads[idx].id = sp.id; // keep same id
    set({ spreads: newSpreads, photos: [...photos], _dirty: true, saveStatus: 'idle' });
  },

  // ── Move/reorder a spread from one position to another ──
  moveSpread: (fromIdx, toIdx) => {
    const { spreads } = get();
    if (fromIdx === toIdx) return;
    // Don't move cover
    if (spreads[fromIdx]?.isCover || spreads[toIdx]?.isCover) return;
    if (fromIdx < 0 || fromIdx >= spreads.length || toIdx < 0 || toIdx >= spreads.length) return;
    get()._pushUndo();
    const newSpreads = [...spreads];
    const [moved] = newSpreads.splice(fromIdx, 1);
    newSpreads.splice(toIdx, 0, moved);
    set({ spreads: newSpreads, currentSpread: toIdx });
  },

  // ── Resize spreads: add/remove from the end to match new page count ──
  resizeSpreads: (newPageCount) => {
    const state = get();
    const { spreads, photos } = state;
    const hasCover = spreads[0]?.isCover;
    const newInterior = Math.max(1, Math.floor(newPageCount / 2));
    const newTotal = newInterior + (hasCover ? 1 : 0);
    const currentTotal = spreads.length;

    if (newTotal === currentTotal) return;
    state._pushUndo();

    const newSpreads = [...spreads];

    if (newTotal > currentTotal) {
      // Add empty spreads at the end
      for (let i = 0; i < newTotal - currentTotal; i++) {
        newSpreads.push(createSpread([]));
      }
    } else {
      // Remove spreads from the end, returning photos to gallery
      while (newSpreads.length > newTotal) {
        const removed = newSpreads.pop();
        if (removed.photos) {
          removed.photos.forEach((p) => {
            const found = photos.find((ph) => ph.id === p.id);
            if (found) found.used = false;
          });
        }
      }
    }

    const newCurrent = state.currentSpread >= newSpreads.length ? newSpreads.length - 1 : state.currentSpread;
    set({ spreads: newSpreads, currentSpread: newCurrent, photos: [...photos] });
  },

  // ── Auto-fill: applies one spread at a time with requestAnimationFrame ──
  // Each spread = tiny state update + browser paint. No freeze on any device.
  autoFill: () => {
    const { photos, spreads } = get();
    const unused = photos.filter((p) => !p.used);
    if (unused.length === 0) return;

    // Find empty rotations (not cover)
    const emptyIndices = [];
    spreads.forEach((sp, i) => {
      if (!sp.isCover && (!sp.photos || sp.photos.length === 0)) emptyIndices.push(i);
    });
    if (emptyIndices.length === 0) return;

    // Check if subtiri
    let isSubtiri = false;
    try {
      const projStore = require('../stores/useProjectStore').default;
      isSubtiri = projStore?.getState?.()?.productConfig?.slug === 'pagini-subtiri';
    } catch {}

    // Create balanced chunks (pure math, instant)
    const chunks = [];
    const pool = [...unused];
    const targetCount = emptyIndices.length;
    const patterns = isSubtiri ? [2, 2, 2, 2, 2] : [3, 2, 4, 3, 2, 4, 3, 4, 2, 3];
    let patIdx = 0;

    while (pool.length > 0 && chunks.length < targetCount) {
      const remaining = targetCount - chunks.length;
      const remainingPhotos = pool.length;
      const minForRest = remaining - 1;
      const maxForThis = Math.min(6, remainingPhotos - minForRest);
      let count = Math.min(patterns[patIdx % patterns.length], maxForThis);
      count = Math.max(1, count);
      const chunk = [];
      for (let i = 0; i < count && pool.length > 0; i++) chunk.push(pool.shift());
      chunks.push(chunk);
      patIdx++;
    }
    while (pool.length > 0 && chunks.length > 0) {
      for (let i = 0; i < chunks.length && pool.length > 0; i++) {
        if (chunks[i].length < 6) chunks[i].push(pool.shift());
      }
    }

    // Pre-compute all layouts (pure math, no DOM, ~1ms total)
    let prevVariant = -1;
    const computed = chunks.map((chunk, ci) => {
      if (ci >= emptyIndices.length) return null;
      const allPhotos = chunk;
      const mid = Math.ceil(allPhotos.length / 2);
      const lp = allPhotos.slice(0, mid);
      const rp = allPhotos.slice(mid);
      const fullResult = smartBuildTree(allPhotos, prevVariant);
      const leftResult = smartBuildTree(lp, -1);
      const rightResult = smartBuildTree(rp, -1);
      prevVariant = fullResult.vi;
      return { spreadIdx: emptyIndices[ci], allPhotos, lp, rp, fullResult, leftResult, rightResult };
    }).filter(Boolean);

    // Apply one spread per animation frame — browser stays responsive
    let i = 0;
    function applyNext() {
      if (i >= computed.length) return;
      const { spreadIdx, allPhotos, lp, rp, fullResult, leftResult, rightResult } = computed[i];
      allPhotos.forEach((p) => { p.used = true; });

      const { spreads: currentSpreads, photos: currentPhotos } = get();
      const updatedSpreads = [...currentSpreads];
      const sp = updatedSpreads[spreadIdx];
      updatedSpreads[spreadIdx] = {
        ...sp,
        photos: allPhotos,
        full: { photos: allPhotos, tree: fullResult.tree, _vi: fullResult.vi },
        left: { photos: lp, tree: leftResult.tree, _vi: leftResult.vi },
        right: { photos: rp, tree: rightResult.tree, _vi: rightResult.vi },
      };
      set({ spreads: updatedSpreads, photos: [...currentPhotos] });

      i++;
      if (i < computed.length) {
        requestAnimationFrame(applyNext);
      }
    }
    requestAnimationFrame(applyNext);
  },

  // ── Auto-fill all spreads with photos (even distribution) ──
  autoFillSpreads: (extraSpreads = 0) => {
    const { photos, spreads } = get();
    const { spreads: newSpreads, usedIds, addedPages } = autoFillBook(spreads, photos, extraSpreads);

    // Mark photos as used/unused
    const updatedPhotos = photos.map(p => ({ ...p, used: usedIds.has(p.id) }));

    set({
      spreads: newSpreads,
      photos: updatedPhotos,
      currentSpread: Math.max(0, newSpreads.findIndex(s => !s.isCover)),
      _dirty: true,
      _tick: get()._tick + 1,
    });
    return { addedPages };
  },
}));

function _markUsed(spreads, photos) {
  const usedIds = new Set();
  spreads.forEach((sp) => sp.photos.forEach((p) => usedIds.add(p.id)));
  photos.forEach((p) => { p.used = usedIds.has(p.id); });
}

function _relinkPhotos(spreads, photos) {
  const photoMap = {};
  photos.forEach((p) => { photoMap[p.id] = p; });
  spreads.forEach((sp) => {
    if (sp.photos) sp.photos = sp.photos.map((p) => photoMap[p.id] || p);
    ['full', 'left', 'right'].forEach((key) => {
      if (sp[key]?.tree) {
        getLeaves(sp[key].tree).forEach((leaf) => {
          if (leaf.photo?.id) leaf.photo = photoMap[leaf.photo.id] || leaf.photo;
        });
      }
      if (sp[key]?.photos) sp[key].photos = sp[key].photos.map((p) => photoMap[p.id] || p);
    });
  });
  return spreads;
}

export default useEditorStore;
