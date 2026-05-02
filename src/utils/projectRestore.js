/**
 * Restores a saved project snapshot into editor stores.
 * Preserves EXACT layout as customer left it (variant index + photo order).
 */
import { buildTree, assignPhotos, createSpread, getProTemplates, getLeaves, DEFAULT_BOUNDS, smartBuildTree, getOrientation } from './layoutEngine';
import { getOrientationPattern, getProTemplatesByPattern } from './proTemplateLibrary';

/**
 * Rebuild a page from saved state using the exact variant index and photo order.
 */
function restorePage(photoIds, vi, photoMap) {
  const photos = photoIds.map((id) => photoMap[id]).filter(Boolean);
  if (photos.length === 0) {
    return { photos: [], tree: { type: 'leaf', slot: 'A', photo: null }, _vi: 0, bounds: DEFAULT_BOUNDS };
  }

  // Try pro templates first (SmartAlbums-style)
  const result = smartBuildTree(photos, -1);
  if (result._proTemplate) {
    return {
      photos,
      tree: result.tree,
      _vi: result.vi,
      _proTemplate: result._proTemplate,
      bounds: DEFAULT_BOUNDS,
    };
  }

  // Fallback to binary tree with saved variant
  const tree = buildTree(photos.length, vi || 0);
  assignPhotos(tree, photos);
  return { photos, tree, _vi: vi || 0, bounds: DEFAULT_BOUNDS };
}

/**
 * Restore spreads from serialized snapshot data.
 * Uses saved variant indices (fullVi, leftVi, rightVi) and photo order
 * to reconstruct the exact same layout the user saw.
 */
export function restoreSpreads(savedSpreads, allPhotos) {
  // Build photo lookup
  const photoMap = {};
  allPhotos.forEach((p) => { photoMap[p.id] = p; });

  return savedSpreads.map((sp) => {
    // Get photos for this spread
    const spreadPhotos = (sp.photoIds || []).map((id) => photoMap[id]).filter(Boolean);

    const spread = {
      ...createSpread([]),
      id: sp.id,
      mode: sp.mode || 'spread',
      isCover: sp.isCover || false,
      coverTemplate: sp.coverTemplate || null,
      photos: spreadPhotos,
    };

    // Restore pages with exact variant index and photo order
    if (sp.fullPhotoIds?.length > 0) {
      spread.full = restorePage(sp.fullPhotoIds, sp.fullVi, photoMap);
    } else if (spreadPhotos.length > 0) {
      // Fallback: old format without per-page photo IDs
      spread.full = restorePage(sp.photoIds || [], sp.fullVi || 0, photoMap);
    }

    if (sp.leftPhotoIds?.length > 0) {
      spread.left = restorePage(sp.leftPhotoIds, sp.leftVi, photoMap);
    } else {
      const mid = Math.ceil(spreadPhotos.length / 2);
      const leftPhotos = spreadPhotos.slice(0, mid);
      spread.left = restorePage(leftPhotos.map((p) => p.id), sp.leftVi || 0, photoMap);
    }

    if (sp.rightPhotoIds?.length > 0) {
      spread.right = restorePage(sp.rightPhotoIds, sp.rightVi, photoMap);
    } else {
      const mid = Math.ceil(spreadPhotos.length / 2);
      const rightPhotos = spreadPhotos.slice(mid);
      spread.right = restorePage(rightPhotos.map((p) => p.id), sp.rightVi || 0, photoMap);
    }

    // Restore separator ratios (user-dragged divider positions)
    const applyRatios = (tree, savedRatios) => {
      if (!tree || !savedRatios || savedRatios.length === 0) return;
      let idx = 0;
      const walk = (n) => {
        if (!n || n.type === 'leaf') return;
        if (idx < savedRatios.length) n.ratio = savedRatios[idx++];
        n.children?.forEach(walk);
      };
      walk(tree);
    };
    applyRatios(spread.full?.tree, sp.fullRatios);
    applyRatios(spread.left?.tree, sp.leftRatios);
    applyRatios(spread.right?.tree, sp.rightRatios);

    // Restore pro template if this spread used one
    if (sp.proTemplateId && spread.full) {
      try {
        const proTpl = getProTemplates().find(t => t.id === sp.proTemplateId);
        if (proTpl) {
          spread.full._proTemplate = proTpl;
          spread.full._vi = -1;
          const leaves = getLeaves(spread.full.tree);
          proTpl.frames.forEach((frame, i) => {
            if (leaves[i]) {
              leaves[i]._proFrame = frame;
              leaves[i]._proMask = frame.mask || 'rect';
            }
          });
        }
      } catch {}
    }

    // Restore bounds (layout margins per page)
    if (sp.fullBounds && spread.full) spread.full.bounds = sp.fullBounds;
    if (sp.leftBounds && spread.left) spread.left.bounds = sp.leftBounds;
    if (sp.rightBounds && spread.right) spread.right.bounds = sp.rightBounds;

    // Default bounds if missing (old projects)
    if (spread.full && !spread.full.bounds) spread.full.bounds = { ...DEFAULT_BOUNDS };
    if (spread.left && !spread.left.bounds) spread.left.bounds = { ...DEFAULT_BOUNDS };
    if (spread.right && !spread.right.bounds) spread.right.bounds = { ...DEFAULT_BOUNDS };

    // Restore leaf crop offsets from saved leafCrops map
    // IDs change across sessions (auto-increment), so map by position using saved leaf order
    if (sp.leafCrops) {
      const getLeaves = (tree) => {
        const leaves = [];
        const walk = (n) => { if (!n) return; if (n.type === 'leaf') leaves.push(n); n.children?.forEach(walk); };
        walk(tree);
        return leaves;
      };
      const applySection = (tree, savedLeafIds) => {
        if (!tree) return;
        const newLeaves = getLeaves(tree);
        if (savedLeafIds && savedLeafIds.length > 0) {
          // Map by position: saved leaf i → new leaf i
          newLeaves.forEach((leaf, i) => {
            const savedId = savedLeafIds[i];
            if (savedId && sp.leafCrops[savedId]) {
              leaf.cropOffset = sp.leafCrops[savedId];
            }
          });
        } else {
          // Fallback: try by ID (same session, IDs match)
          newLeaves.forEach(leaf => {
            if (sp.leafCrops[leaf.id]) {
              leaf.cropOffset = sp.leafCrops[leaf.id];
            }
          });
        }
      };
      applySection(spread.full?.tree, sp.fullLeafIds);
      applySection(spread.left?.tree, sp.leftLeafIds);
      applySection(spread.right?.tree, sp.rightLeafIds);

      // Legacy fallback: old data without per-section leaf IDs
      // Apply all crops by position across all leaves combined
      if (!sp.fullLeafIds && !sp.leftLeafIds && !sp.rightLeafIds) {
        const allNewLeaves = [
          ...getLeaves(spread.full?.tree),
          ...getLeaves(spread.left?.tree),
          ...getLeaves(spread.right?.tree),
        ];
        const allSavedIds = Object.keys(sp.leafCrops);
        // Check if any new leaf ID matches a saved ID
        const hasMatch = allNewLeaves.some(l => sp.leafCrops[l.id]);
        if (!hasMatch && allSavedIds.length > 0) {
          // No ID matches — apply by global position
          allNewLeaves.forEach((leaf, i) => {
            if (i < allSavedIds.length && sp.leafCrops[allSavedIds[i]]) {
              leaf.cropOffset = sp.leafCrops[allSavedIds[i]];
            }
          });
        }
      }
    }

    // Restore cover frames
    if (sp.isCover && sp.coverFrames) {
      spread.coverFrames = sp.coverFrames.map((f) => ({
        ...f,
        photo: f.photo?.id ? photoMap[f.photo.id] || null : null,
        cropOffset: f.photo?.cropOffset || f.cropOffset || { opx: 50, opy: 50 },
      }));
    }
    if (sp.coverTexts) spread.coverTexts = sp.coverTexts;

    return spread;
  });
}

/**
 * Restore photos from serialized data.
 * Editor display: previewUrl (2400px, fast) > thumbData (300px backup) > storageUrl (original, slow)
 * storageUrl is kept on photo for 300dpi export only — NOT used for editor display.
 */
export function restorePhotos(savedPhotos) {
  return (savedPhotos || []).map((p) => {
    // If has cloudinaryId but no previewUrl, rebuild it
    let previewUrl = p.previewUrl;
    let thumbData = p.thumbData;
    if (p.cloudinaryId && !previewUrl) {
      previewUrl = `https://res.cloudinary.com/dqmygw2zz/image/upload/w_1500,q_auto,f_webp,c_limit/${p.cloudinaryId}`;
    }
    if (p.cloudinaryId && !thumbData) {
      thumbData = `https://res.cloudinary.com/dqmygw2zz/image/upload/w_300,q_70,f_webp,c_limit/${p.cloudinaryId}`;
    }
    return {
      ...p,
      previewUrl,
      thumbData,
      blob: previewUrl || thumbData || p.storageUrl,
      loading: !previewUrl && !p.storageUrl,
      file: null,
    };
  });
}
