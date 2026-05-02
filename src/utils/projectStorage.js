/* ═══ PROJECT PERSISTENCE ═══
   Firestore = SINGURA sursă de adevăr
   ZERO localStorage — toate datele din Firestore
*/
import { db } from '../firebase/config';

function generateId() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/* ── Serialize helpers ── */

function serializeSpreads(spreads) {
  return spreads.map((sp) => ({
    id: sp.id,
    mode: sp.mode,
    isCover: sp.isCover || false,
    coverTemplate: sp.coverTemplate || null,
    coverFrames: sp.coverFrames ? sp.coverFrames.map((f) => ({
      ...f,
      photo: f.photo ? { id: f.photo.id, cropOffset: f.photo.cropOffset } : null,
    })) : null,
    coverTexts: sp.coverTexts || null,
    photoIds: (sp.photos || []).map((p) => p.id),
    proTemplateId: sp.full?._proTemplate?.id || null,
    fullVi: sp.full?._vi ?? 0,
    leftVi: sp.left?._vi ?? 0,
    rightVi: sp.right?._vi ?? 0,
    fullBounds: sp.full?.bounds || null,
    leftBounds: sp.left?.bounds || null,
    rightBounds: sp.right?.bounds || null,
    fullPhotoIds: sp.full?.photos?.map((p) => p.id) || [],
    leftPhotoIds: sp.left?.photos?.map((p) => p.id) || [],
    rightPhotoIds: sp.right?.photos?.map((p) => p.id) || [],
    // Save crop offsets per leaf — critical for exact export
    // Also save ordered leaf IDs per section so restore can map by position
    leafCrops: (() => {
      const crops = {};
      const walkTree = (node) => {
        if (!node) return;
        if (node.type === 'leaf' && node.cropOffset) {
          crops[node.id] = { opx: node.cropOffset.opx, opy: node.cropOffset.opy };
        }
        node.children?.forEach(walkTree);
      };
      if (sp.full?.tree) walkTree(sp.full.tree);
      if (sp.left?.tree) walkTree(sp.left.tree);
      if (sp.right?.tree) walkTree(sp.right.tree);
      return Object.keys(crops).length > 0 ? crops : null;
    })(),
    // Ordered leaf IDs per tree section — needed for positional crop restore
    fullLeafIds: (() => { const ids = []; const walk = (n) => { if (!n) return; if (n.type === 'leaf') ids.push(n.id); n.children?.forEach(walk); }; walk(sp.full?.tree); return ids; })(),
    leftLeafIds: (() => { const ids = []; const walk = (n) => { if (!n) return; if (n.type === 'leaf') ids.push(n.id); n.children?.forEach(walk); }; walk(sp.left?.tree); return ids; })(),
    rightLeafIds: (() => { const ids = []; const walk = (n) => { if (!n) return; if (n.type === 'leaf') ids.push(n.id); n.children?.forEach(walk); }; walk(sp.right?.tree); return ids; })(),
    // Separator ratios — custom frame proportions (user-dragged dividers)
    fullRatios: (() => { const r = []; const walk = (n) => { if (!n || n.type === 'leaf') return; r.push(n.ratio ?? 0.5); n.children?.forEach(walk); }; walk(sp.full?.tree); return r.length > 0 ? r : null; })(),
    leftRatios: (() => { const r = []; const walk = (n) => { if (!n || n.type === 'leaf') return; r.push(n.ratio ?? 0.5); n.children?.forEach(walk); }; walk(sp.left?.tree); return r.length > 0 ? r : null; })(),
    rightRatios: (() => { const r = []; const walk = (n) => { if (!n || n.type === 'leaf') return; r.push(n.ratio ?? 0.5); n.children?.forEach(walk); }; walk(sp.right?.tree); return r.length > 0 ? r : null; })(),
  }));
}

function serializePhotos(photos) {
  return photos.map((p) => ({
    id: p.id,
    fileName: p.fileName,
    origW: p.origW,
    origH: p.origH,
    orient: p.orient,
    used: p.used,
    // Save Cloudinary thumb URL (300px) — never blob: or data: URLs
    thumbData: (p.thumbData && !p.thumbData.startsWith('blob:') && !p.thumbData.startsWith('data:'))
      ? p.thumbData
      : (p.previewUrl || null),
    hasFace: p.hasFace || false,
    cropOffset: p.cropOffset || { opx: 50, opy: 50 },
    storageUrl: p.storageUrl || null,
    storagePath: p.storagePath || null,
    previewUrl: p.previewUrl || null,
    cloudinaryId: p.cloudinaryId || null,
  }));
}

function stripUndefined(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) clean[k] = stripUndefined(v);
    }
    return clean;
  }
  return obj;
}

/* ── Firestore data ── */

function toFirestoreData(project) {
  return stripUndefined({
    id: project.id,
    status: project.status || 'draft',
    productConfig: project.productConfig || null,
    coverTemplate: project.coverTemplate || null,
    currentSpread: project.currentSpread || 0,
    totalPhotos: project.totalPhotos || 0,
    usedPhotos: project.usedPhotos || 0,
    totalSpreads: project.totalSpreads || 0,
    filledSpreads: project.filledSpreads || 0,
    progress: project.progress || 0,
    clientName: project.clientName || '',
    clientPhone: project.clientPhone || '',
    clientEmail: project.clientEmail || '',
    activeClientId: project.activeClientId || null,
    client_id: project.client_id || null,
    deviceType: project.deviceType || 'desktop',
    updatedAt: project.updatedAt || new Date().toISOString(),
    createdAt: project.createdAt || new Date().toISOString(),
    spreads: (project.spreads || []).map((sp) => ({
      id: sp.id, mode: sp.mode, isCover: sp.isCover || false,
      coverTemplate: sp.coverTemplate || null,
      coverTexts: sp.coverTexts || null,
      coverFrames: sp.coverFrames ? sp.coverFrames.map((f) => ({
        ...f,
        photo: f.photo ? { id: f.photo.id, cropOffset: f.photo.cropOffset } : null,
      })) : null,
      photoIds: sp.photoIds || [],
      leafCrops: sp.leafCrops || null,
      fullVi: sp.fullVi ?? 0, leftVi: sp.leftVi ?? 0, rightVi: sp.rightVi ?? 0,
      fullBounds: sp.fullBounds || null, leftBounds: sp.leftBounds || null, rightBounds: sp.rightBounds || null,
      fullPhotoIds: sp.fullPhotoIds || [], leftPhotoIds: sp.leftPhotoIds || [], rightPhotoIds: sp.rightPhotoIds || [],
      fullLeafIds: sp.fullLeafIds || [], leftLeafIds: sp.leftLeafIds || [], rightLeafIds: sp.rightLeafIds || [],
      fullRatios: sp.fullRatios || null, leftRatios: sp.leftRatios || null, rightRatios: sp.rightRatios || null,
    })),
    photos: (project.photos || []).map((p) => ({
      id: p.id, fileName: p.fileName || '', origW: p.origW || 0, origH: p.origH || 0,
      orient: p.orient || 'S', used: p.used || false, hasFace: p.hasFace || false,
      cropOffset: p.cropOffset || { opx: 50, opy: 50 },
      storageUrl: p.storageUrl || null, storagePath: p.storagePath || null, previewUrl: p.previewUrl || null,
      thumbData: (p.thumbData && !p.thumbData.startsWith('blob:') && !p.thumbData.startsWith('data:')) ? p.thumbData : null,
      cloudinaryId: p.cloudinaryId || null,
    })),
  });
}

/* ═══ PUBLIC API ═══ */

/**
 * Get all projects — Firestore ONLY
 */
export function getProjects() {
  return []; // Sync call returns empty — use getProjectsAsync() instead
}

/**
 * Get all projects — Firestore ONLY
 */
export async function getProjectsAsync(clientFilter) {
  if (!db) return [];

  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, 'projects'));
    const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (clientFilter) {
      const { email, phone, clientId } = clientFilter;
      const norm = (ph) => (ph || '').replace(/\D/g, '').slice(-8);
      const normEmail = (e) => (e || '').toLowerCase().trim();
      return projects.filter(p => {
        if (clientId && (p.client_id === clientId || p.activeClientId === clientId)) return true;
        if (email && normEmail(p.clientEmail) === normEmail(email)) return true;
        if (phone && norm(p.clientPhone) === norm(phone)) return true;
        return false;
      });
    }

    return projects;
  } catch (e) {
    console.warn('Firestore getProjectsAsync failed:', e);
    return [];
  }
}

/**
 * Get single project — Firestore ONLY (async)
 */
export function getProject(projectId) {
  return null; // Sync call returns null — use getProjectAsync() instead
}

/**
 * Get single project — Firestore ONLY
 */
export async function getProjectAsync(projectId) {
  if (!db) return null;

  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'projects', projectId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (e) {
    console.warn('Firestore getProjectAsync failed:', e);
    return null;
  }
}

/**
 * Save/update project — FIRESTORE FIRST (source of truth)
 */
export async function saveProject(projectData) {
  const project = {
    ...projectData,
    updatedAt: new Date().toISOString(),
    createdAt: projectData.createdAt || new Date().toISOString(),
  };

  // Firestore = source of truth
  if (db && project.id) {
    try {
      await pushToFirestore(project);
    } catch (e) {
      console.warn('Firestore save failed:', e);
    }
  }

  // Layout auto-learning — defer to idle time so it doesn't block UI
  try {
    const runCollect = () => {
      import('./layoutCollector').then(({ collectLayouts }) => {
        const editorStore = require('../stores/useEditorStore').default;
        const spreads = editorStore?.getState?.()?.spreads;
        if (spreads) collectLayouts(spreads);
      }).catch(() => {});
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(runCollect, { timeout: 5000 });
    else setTimeout(runCollect, 3000);
  } catch {}

  return project;
}

async function pushToFirestore(project) {
  if (!db) return;
  const { doc, setDoc, getDoc } = await import('firebase/firestore');
  const data = toFirestoreData(project);

  // CRITICAL: Never overwrite order status from auto-save.
  // If an order exists with a non-draft status, preserve it.
  const PROTECTED_STATUSES = [
    'awaiting_payment',
    'paid_pending_designer', 'paid_pending_verification',
    'designer_working', 'revision_requested',
    'pending_client_approval', 'pending_approval',
    'approved_print', 'in_print', 'shipped', 'delivered',
  ];

  try {
    const orderSnap = await getDoc(doc(db, 'orders', project.id));
    if (orderSnap.exists()) {
      const existingStatus = orderSnap.data().status;
      if (PROTECTED_STATUSES.includes(existingStatus)) {
        // Preserve the existing order status — don't overwrite with 'draft'
        data.status = existingStatus;
      }
    }
  } catch {}

  // Save to projects collection (always safe)
  await setDoc(doc(db, 'projects', project.id), data, { merge: true });
  // Save layout data to orders (but with protected status)
  setDoc(doc(db, 'orders', project.id), data, { merge: true }).catch(() => {});
}

/**
 * Delete project — Firestore ONLY
 */
export async function deleteProject(projectId) {
  if (!db) return;
  const { doc, deleteDoc } = await import('firebase/firestore');
  await Promise.all([
    deleteDoc(doc(db, 'projects', projectId)).catch(() => {}),
    deleteDoc(doc(db, 'orders', projectId)).catch(() => {}),
    deleteDoc(doc(db, 'project_data', projectId)).catch(() => {}),
  ]);
}

/**
 * Create snapshot of editor state
 */
export function createProjectSnapshot(projectId, projectStore, editorStore, authStore) {
  const { productConfig, coverTemplate } = projectStore;
  const { spreads, photos, currentSpread } = editorStore;

  const totalPhotos = photos.length;
  const usedPhotos = photos.filter(p => p.used).length;
  const totalSpreads = spreads.filter(s => !s.isCover).length;
  const filledSpreads = spreads.filter(s => !s.isCover && s.photos?.length > 0).length;

  const snapshot = {
    id: projectId || generateId(),
    status: 'draft',
    productConfig: { ...productConfig },
    coverTemplate: coverTemplate ? { ...coverTemplate } : null,
    currentSpread,
    spreads: serializeSpreads(spreads),
    photos: serializePhotos(photos),
    totalPhotos, usedPhotos, totalSpreads, filledSpreads,
    progress: totalSpreads > 0 ? Math.round((filledSpreads / totalSpreads) * 100) : 0,
    clientName: authStore?.clientName || authStore?.user?.displayName || '',
    clientPhone: authStore?.clientPhone || authStore?.user?.phoneNumber || '',
    clientEmail: authStore?.clientEmail || authStore?.user?.email || '',
    client_id: authStore?.activeClientId || authStore?.userId || '',
    activeClientId: authStore?.activeClientId || authStore?.userId || '',
    deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
  };

  // Link invite slug to project (for tracking invite → project conversion)
  try {
    const inviteSlug = localStorage.getItem('fc_invite_slug');
    if (inviteSlug) snapshot.inviteSlug = inviteSlug;
  } catch {}

  // Save offer info if project was started from an offer
  if (productConfig?._offerId) {
    snapshot.fromOffer = true;
    snapshot.offerId = productConfig._offerId;
    snapshot.offerPrice = productConfig.basePrice;
    snapshot.offerDeadline = productConfig._offerDeadline;
    snapshot.offerOldPrice = productConfig._offerOldPrice;
  }

  return snapshot;
}

export { generateId };
