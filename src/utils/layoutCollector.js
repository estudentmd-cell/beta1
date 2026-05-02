/**
 * Layout Collector — Auto-learning from client behavior
 *
 * When a client saves their project, this module:
 * 1. Extracts the layout tree structure (splits + ratios) from each page
 * 2. Compares with existing layouts in the system
 * 3. If different enough (>10% ratio change), saves to Firestore as candidate
 * 4. Admin approves candidates → they enter rotation for new clients
 */

import { db } from '../firebase/config';
import { getVariantCount, buildTree, computeRects } from './layoutEngine';

const MIN_RATIO_DIFF = 0.10; // 10% minimum difference to be considered new
const MAX_CANDIDATES_PER_COUNT = 50; // max stored candidates per photo count

/**
 * Extract the tree structure (without photos) as a serializable fingerprint
 */
export function extractTreeFingerprint(tree) {
  if (!tree) return null;
  if (tree.type === 'leaf') return { t: 'L', s: tree.slot || 'S' };
  return {
    t: tree.type, // 'col' or 'row'
    r: Math.round((tree.ratio || 0.5) * 1000) / 1000, // ratio rounded to 3 decimals
    c: (tree.children || []).map(extractTreeFingerprint),
  };
}

/**
 * Compare two tree fingerprints — returns true if they differ by more than threshold
 */
function treesAreDifferent(fp1, fp2) {
  if (!fp1 || !fp2) return true;
  if (fp1.t !== fp2.t) return true; // different type (leaf vs split, or col vs row)
  if (fp1.t === 'L') return fp1.s !== fp2.s; // different slot orientation
  // Both are splits — compare ratio
  if (Math.abs((fp1.r || 0.5) - (fp2.r || 0.5)) > MIN_RATIO_DIFF) return true;
  // Compare children recursively
  if ((fp1.c || []).length !== (fp2.c || []).length) return true;
  for (let i = 0; i < (fp1.c || []).length; i++) {
    if (treesAreDifferent(fp1.c[i], fp2.c[i])) return true;
  }
  return false;
}

/**
 * Check if a fingerprint is different from ALL existing layouts for this photo count
 */
export function isNewLayout(fingerprint, photoCount) {
  const varCount = getVariantCount(photoCount);
  for (let vi = 0; vi < varCount; vi++) {
    const existingTree = buildTree(photoCount, vi);
    const existingFp = extractTreeFingerprint(existingTree);
    if (!treesAreDifferent(fingerprint, existingFp)) return false; // too similar
  }
  return true; // different from all existing
}

/**
 * Validate that a layout has reasonable frame proportions (max 2.8:1)
 */
function isValidLayout(fingerprint, photoCount) {
  // Rebuild a tree from fingerprint to validate
  // We can't easily rebuild, so we check the existing tree from the spread
  return true; // validated at collection time from actual rects
}

/**
 * Collect layouts from a saved project — called after each save
 */
export async function collectLayouts(spreads) {
  if (!db || !spreads || spreads.length === 0) return;

  const candidates = [];

  for (const sp of spreads) {
    if (sp.isCover) continue;

    // Check each page section
    const sections = [
      { tree: sp.full?.tree, photoCount: sp.full?.photos?.length || 0, bounds: sp.full?.bounds },
      { tree: sp.left?.tree, photoCount: sp.left?.photos?.length || 0, bounds: sp.left?.bounds },
      { tree: sp.right?.tree, photoCount: sp.right?.photos?.length || 0, bounds: sp.right?.bounds },
    ];

    for (const section of sections) {
      if (!section.tree || section.photoCount < 2) continue; // need at least 2 photos

      const fingerprint = extractTreeFingerprint(section.tree);
      if (!fingerprint) continue;

      // Check if this layout is genuinely different from what we already have
      if (isNewLayout(fingerprint, section.photoCount)) {
        // Validate proportions — check actual rects
        const PAGE = 500;
        const isSpread = section.photoCount > 5;
        const w = isSpread ? PAGE * 2 : PAGE;
        const rects = computeRects(section.tree, 0, 0, w, PAGE, 3);
        let valid = true;
        for (const r of rects) {
          const ar = Math.max(r.w / r.h, r.h / r.w);
          if (ar > 2.8) { valid = false; break; }
        }
        if (!valid) continue;

        candidates.push({
          photoCount: section.photoCount,
          fingerprint,
          bounds: section.bounds || null,
          collectedAt: new Date().toISOString(),
        });
      }
    }
  }

  if (candidates.length === 0) return;

  // Save candidates to Firestore
  try {
    const { doc, getDoc, setDoc } = await import('firebase/firestore');
    const ref = doc(db, 'settings', 'layout_candidates');
    const snap = await getDoc(ref);
    const existing = snap.exists() ? (snap.data().items || []) : [];

    // Deduplicate — don't save if we already have a very similar candidate
    const newCandidates = candidates.filter(c => {
      return !existing.some(e =>
        e.photoCount === c.photoCount &&
        !treesAreDifferent(e.fingerprint, c.fingerprint)
      );
    });

    if (newCandidates.length === 0) return;

    // Append, respecting max per category
    const merged = [...existing, ...newCandidates];

    // Trim per category
    const byCount = {};
    for (const item of merged) {
      const key = item.photoCount;
      if (!byCount[key]) byCount[key] = [];
      byCount[key].push(item);
    }
    const trimmed = [];
    for (const [, items] of Object.entries(byCount)) {
      trimmed.push(...items.slice(-MAX_CANDIDATES_PER_COUNT)); // keep newest
    }

    await setDoc(ref, {
      items: trimmed,
      updatedAt: new Date().toISOString(),
      totalCount: trimmed.length,
    });

    console.log(`[LayoutCollector] Saved ${newCandidates.length} new layout candidates`);
  } catch (e) {
    console.warn('[LayoutCollector] Failed to save candidates:', e);
  }
}
