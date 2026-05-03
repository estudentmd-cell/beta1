// ============================================================
// collageLayoutEngine.js — Photo-aware collage layout engine
// Frames adapt to actual photo aspect ratios (like SmartAlbums)
// ============================================================

// ─── TOPOLOGY TABLES ────────────────────────────────────────
// Each entry: array describing row/column structure
// Number = photos in a simple row/column
// Nested array = sub-layout (columns inside a row, or rows inside a column)
const TOPOLOGY_TABLES = {
  '1': {
    'full': [1],
  },
  '2': {
    'side': [2],           // side by side
    'stack': [[1], [1]],   // stacked
  },
  '3': {
    'row':     [3],              // 3 in a row
    'top1-bot2': [[1], [2]],     // 1 top, 2 bottom
    'top2-bot1': [[2], [1]],     // 2 top, 1 bottom
    'left1-right2': [1, [1,1]],  // 1 left, 2 stacked right
    'left2-right1': [[1,1], 1],  // 2 stacked left, 1 right
  },
  '4': {
    'grid':       [[2], [2]],         // 2×2 grid
    'row':        [4],                // 4 in a row
    'top1-bot3':  [[1], [3]],         // 1 top, 3 bottom
    'top3-bot1':  [[3], [1]],         // 3 top, 1 bottom
    'top2-bot2':  [[2], [2]],         // 2+2
    'left1-right3': [1, [1,1,1]],     // 1 left, 3 stacked right
    'left2-right2': [[1,1], [1,1]],   // 2 stacked left, 2 stacked right
    'T-shape':    [[1], [1,2]],       // 1 top, then 1 left + 2 right
  },
  '5': {
    'top2-bot3':  [[2], [3]],         // 2 top, 3 bottom
    'top3-bot2':  [[3], [2]],         // 3 top, 2 bottom
    'top1-bot4':  [[1], [4]],         // 1 hero top, 4 bottom
    'grid-plus':  [[2], [3]],         // asymmetric grid
    'left2-right3': [[1,1], [1,1,1]], // 2 left, 3 right
    'left1-mid2-right2': [1, [1,1], [1,1]], // mosaic
    'row':        [5],                // 5 in a row (rare)
  },
  '6': {
    'grid2x3':    [[3], [3]],         // 3+3
    'grid3x2':    [[2], [2], [2]],    // 2+2+2
    'top1-bot5':  [[1], [5]],         // hero top
    'top2-mid2-bot2': [[2], [2], [2]], // 3 rows
    'top3-bot3':  [[3], [3]],         // symmetric
    'left2-right4': [[1,1], [1,1,1,1]], // 2 left, 4 right
    'mosaic':     [[1], [2], [3]],    // pyramid
  },
};

// ─── UTILS ──────────────────────────────────────────────────
function countPhotos(spec) {
  if (typeof spec === 'number') return spec;
  return spec.reduce((s, el) => s + countPhotos(el), 0);
}

// ─── SOLVER ─────────────────────────────────────────────────
function solveTopology(topo, ratios) {
  if (typeof topo === 'number') {
    return { cells: [{ x: 0, y: 0, width: 1, height: 1 }], aspect: ratios[0] || 1 };
  }
  if (topo.length === 1 && typeof topo[0] === 'number' && topo[0] === 1) {
    return { cells: [{ x: 0, y: 0, width: 1, height: 1 }], aspect: ratios[0] || 1 };
  }

  const isRowMode = topo.every(el => typeof el === 'number' || Array.isArray(el));

  // If first element is array → row mode (rows stacked vertically)
  // If first element is number with siblings → column mode (items side by side)
  if (Array.isArray(topo[0])) {
    return solveRowSpec(topo, ratios);
  }
  if (topo.length === 1) {
    return typeof topo[0] === 'number'
      ? solveColSpec(topo, ratios)
      : solveRowSpec(topo[0], ratios);
  }
  return solveColSpec(topo, ratios);
}

// ─── ROW MODE (stacked vertically) ─────────────────────────
function solveRowSpec(spec, ratios) {
  let idx = 0;
  const rows = spec.map(rs => {
    const count = countPhotos(rs);
    const rr = ratios.slice(idx, idx + count);
    idx += count;
    if (typeof rs === 'number') {
      const sigma = rr.reduce((s, r) => s + r, 0);
      return { type: 'simple', sigma, naturalH: 1 / sigma, ratios: rr };
    }
    const sub = solveColSpec(rs, rr);
    return { type: 'nested', naturalH: 1 / sub.aspect, subCells: sub.cells };
  });

  const H = rows.reduce((s, r) => s + r.naturalH, 0);
  const cells = [];
  let y = 0;

  for (const row of rows) {
    const h = row.naturalH / H;
    if (row.type === 'simple') {
      let x = 0;
      for (const r of row.ratios) {
        const w = r / row.sigma;
        cells.push({ x, y, width: w, height: h });
        x += w;
      }
    } else {
      for (const sc of row.subCells) {
        cells.push({ x: sc.x, y: y + sc.y * h, width: sc.width, height: sc.height * h });
      }
    }
    y += h;
  }
  return { cells, aspect: 1 / H };
}

// ─── COLUMN MODE (side by side) ─────────────────────────────
function solveColSpec(colSpecs, ratios) {
  let idx = 0;
  const cols = colSpecs.map(cs => {
    const count = countPhotos(cs);
    const cr = ratios.slice(idx, idx + count);
    idx += count;
    if (typeof cs === 'number') {
      const rho = 1 / cr.reduce((s, r) => s + 1 / r, 0);
      return { type: 'simple', rho, ratios: cr };
    }
    const sub = solveRowSpec(cs, cr);
    return { type: 'nested', rho: sub.aspect, subCells: sub.cells };
  });

  const W = cols.reduce((s, c) => s + c.rho, 0);
  const cells = [];
  let x = 0;

  for (const col of cols) {
    const w = col.rho / W;
    if (col.type === 'simple') {
      let y = 0;
      for (const r of col.ratios) {
        const h = (1 / r) * (col.rho / 1);
        const hNorm = h / col.ratios.reduce((s, rr) => s + (1 / rr) * (col.rho / 1), 0);
        cells.push({ x, y, width: w, height: hNorm });
        y += hNorm;
      }
    } else {
      for (const sc of col.subCells) {
        cells.push({ x: x + sc.x * w, y: sc.y, width: sc.width * w, height: sc.height });
      }
    }
    x += w;
  }
  return { cells, aspect: W };
}

// ─── GENERATE LAYOUTS FOR A PAGE ────────────────────────────
/**
 * Generate all possible collage layouts for N photos on a single page.
 * @param {number[]} ratios — aspect ratios of photos (width/height)
 * @param {number} gapFraction — gap between frames as fraction of page (0-0.05)
 * @returns {object[]} — array of { id, topology, cells: [{x,y,width,height}] }
 */
export function generatePageLayouts(ratios, gapFraction = 0.01) {
  const n = ratios.length;
  const table = TOPOLOGY_TABLES[String(n)];
  if (!table) return [];

  const layouts = [];

  for (const [key, topo] of Object.entries(table)) {
    try {
      const { cells } = solveTopology(topo, ratios);

      // Apply gap
      const gapped = cells.map(cell => {
        const eps = 1e-4;
        const iL = cell.x < eps;
        const iR = cell.x + cell.width > 1 - eps;
        const iT = cell.y < eps;
        const iB = cell.y + cell.height > 1 - eps;
        const g = gapFraction;
        return {
          x: cell.x + (iL ? 0 : g / 2),
          y: cell.y + (iT ? 0 : g / 2),
          width: cell.width - (iL ? 0 : g / 2) - (iR ? 0 : g / 2),
          height: cell.height - (iT ? 0 : g / 2) - (iB ? 0 : g / 2),
        };
      });

      layouts.push({ id: `${n}P-${key}`, topology: topo, cells: gapped, photoCount: n });
    } catch (e) {
      // Skip invalid topologies
    }
  }

  return layouts;
}

// ─── GENERATE SPREAD LAYOUTS (2 PAGES) ──────────────────────
/**
 * Generate layouts for a spread (2 pages) by splitting photos between left and right.
 * @param {number[]} allRatios — all photo ratios
 * @param {number} gapFraction — gap
 * @returns {object[]} — array of { id, leftCells, rightCells, splitLeft, splitRight }
 */
export function generateSpreadLayouts(allRatios, gapFraction = 0.01) {
  const n = allRatios.length;
  if (n === 0) return [];

  const layouts = [];

  // Generate all possible splits: [n,0], [n-1,1], ..., [1,n-1], [0,n]
  for (let leftCount = 0; leftCount <= n; leftCount++) {
    const rightCount = n - leftCount;
    if (leftCount > 6 || rightCount > 6) continue; // Max 6 per page

    const leftRatios = allRatios.slice(0, leftCount);
    const rightRatios = allRatios.slice(leftCount);

    const leftLayouts = leftCount > 0 ? generatePageLayouts(leftRatios, gapFraction) : [{ id: 'empty', cells: [] }];
    const rightLayouts = rightCount > 0 ? generatePageLayouts(rightRatios, gapFraction) : [{ id: 'empty', cells: [] }];

    // Combine — limit to avoid explosion
    const maxPerSide = 3;
    for (const ll of leftLayouts.slice(0, maxPerSide)) {
      for (const rl of rightLayouts.slice(0, maxPerSide)) {
        layouts.push({
          id: `spread-${leftCount}L${rightCount}R-${ll.id}-${rl.id}`,
          leftCells: ll.cells,
          rightCells: rl.cells,
          splitLeft: leftCount,
          splitRight: rightCount,
        });
      }
    }
  }

  return layouts;
}

// ─── CONVERT CELLS TO PIXEL RECTS ───────────────────────────
/**
 * Convert normalized cells (0-1) to pixel coordinates on a canvas.
 * @param {object[]} cells — [{x, y, width, height}] normalized
 * @param {number} offsetX — pixel offset X
 * @param {number} offsetY — pixel offset Y
 * @param {number} pageW — page width in pixels
 * @param {number} pageH — page height in pixels
 * @param {object[]} photos — array of photo objects to assign
 * @returns {object[]} — [{leaf: {id, photo, ...}, x, y, w, h}]
 */
export function cellsToRects(cells, offsetX, offsetY, pageW, pageH, photos = []) {
  return cells.map((cell, i) => ({
    leaf: {
      id: photos[i]?.id || `cell-${i}`,
      photo: photos[i] || null,
      cropOffset: photos[i]?.cropOffset || { opx: 50, opy: 50 },
    },
    x: offsetX + cell.x * pageW,
    y: offsetY + cell.y * pageH,
    w: cell.width * pageW,
    h: cell.height * pageH,
  }));
}

// ─── GET PHOTO RATIOS ───────────────────────────────────────
/**
 * Extract aspect ratios from photo objects.
 * @param {object[]} photos — [{origW, origH, ...}]
 * @returns {number[]} — width/height ratios
 */
export function getPhotoRatios(photos) {
  return photos.map(p => {
    const w = p.origW || 1;
    const h = p.origH || 1;
    return w / h;
  });
}

// ─── CONVERT CELLS TO BINARY TREE ───────────────────────────
/**
 * Convert normalized cells to a binary tree compatible with layoutEngine.
 * The tree stores _collageCells so computeRects returns photo-aware positions.
 * @param {object[]} cells — [{x, y, width, height}] normalized 0-1
 * @param {object[]} photos — photo objects to assign to leaves
 * @returns {object} — binary tree with { type: 'leaf', photo, _collageCell, ... }
 */
export function cellsToTree(cells, photos) {
  if (!cells || cells.length === 0) {
    return { type: 'leaf', id: 'empty', slot: 'A', photo: null };
  }
  if (cells.length === 1) {
    return {
      type: 'leaf',
      id: photos[0]?.id || 'cell-0',
      slot: 'A',
      photo: photos[0] || null,
      cropOffset: photos[0]?.cropOffset || { opx: 50, opy: 50 },
      _collageCell: cells[0],
    };
  }

  // Build a simple flat tree — each leaf stores its cell position
  // We use a chain of col splits for simplicity
  const leaves = cells.map((cell, i) => ({
    type: 'leaf',
    id: photos[i]?.id || `cell-${i}`,
    slot: String.fromCharCode(65 + i),
    photo: photos[i] || null,
    cropOffset: photos[i]?.cropOffset || { opx: 50, opy: 50 },
    _collageCell: cell,
  }));

  // Mark tree as collage-based so computeRects uses _collageCell
  const tree = { type: 'col', ratio: 0.5, children: [], _isCollage: true, _collageCells: cells, _leaves: leaves };

  // Build binary tree structure (needed for compatibility)
  function buildChain(leafArr) {
    if (leafArr.length === 1) return leafArr[0];
    if (leafArr.length === 2) return { type: 'col', ratio: 0.5, children: [leafArr[0], leafArr[1]] };
    const mid = Math.ceil(leafArr.length / 2);
    return { type: 'col', ratio: 0.5, children: [buildChain(leafArr.slice(0, mid)), buildChain(leafArr.slice(mid))] };
  }

  return buildChain(leaves);
}

export { TOPOLOGY_TABLES, solveTopology };
