// ============================================================
// collageLayoutEngine.js — Photo-aware collage layout engine
// Optimized for PORTRAIT photos (wedding/event photography)
// Frames adapt to actual photo aspect ratios — zero landscape frames
// ============================================================

// ─── TOPOLOGY TABLES ────────────────────────────────────────
// Format: [n] = n photos side by side (columns — each photo gets vertical frame)
//         [[a],[b]] = rows: a photos in top row, b in bottom
//         [a, [b,c]] = columns: a left, b+c stacked right
// RULE: All topologies optimized for portrait/vertical photos
const TOPOLOGY_TABLES = {
  '1': { 'a': [1] },
  '2': {
    'a': [2],                 // 2 side by side (vertical frames)
    'b': [1,[1]],             // 1 big left, 1 smaller right
    'c': [[1],1],             // 1 smaller left, 1 big right
  },
  '3': {
    'a': [3],                 // 3 side by side
    'b': [1,[1,1]],           // 1 hero left, 2 stacked right
    'c': [[1,1],1],           // 2 stacked left, 1 hero right
    'd': [2,1],               // 2 left (side), 1 right
    'e': [1,2],               // 1 left, 2 right (side)
    'f': [1,1,1],             // 3 columns equal-ish
    'g': [[1],[1,1]],         // 1 top wide, 2 bottom side
    'h': [[1,1],[1]],         // 2 top side, 1 bottom wide
  },
  '4': {
    'a': [4],                       // 4 side by side
    'b': [1,[1,1,1]],               // 1 hero left, 3 stacked right
    'c': [[1,1,1],1],               // 3 stacked left, 1 hero right
    'd': [2,[1,1]],                  // 2 side left, 2 stacked right
    'e': [[1,1],2],                  // 2 stacked left, 2 side right
    'f': [1,1,[1,1]],               // 2 singles + 2 stacked
    'g': [[1,1],1,1],               // 2 stacked + 2 singles
    'h': [1,[1,1],1],               // 1 + 2stacked + 1
    'i': [3,1],                     // 3 left, 1 right
    'j': [1,3],                     // 1 left, 3 right
    'k': [2,2],                     // 2+2 columns
    'l': [1,1,1,1],                 // 4 columns
    'm': [[1],[3]],                 // 1 top, 3 bottom side
    'n': [[3],[1]],                 // 3 top side, 1 bottom
    'o': [[1],[1,2]],               // 1 top, 1+2 bottom
    'p': [[2,1],[1]],               // 2+1 top, 1 bottom
    'q': [1,2,[1]],                 // 1 + 2side + 1stacked
    'r': [[1],1,2],                 // 1stacked + 1 + 2side
    's': [[1],[2],[1]],             // 1 top, 2 mid, 1 bot
    't': [1,[1,1],[1]],             // hero-bracket-hero
    'u': [[1,1],[1],[1]],           // 2top + 1mid + 1bot
    'v': [[1],[1],[1,1]],           // 1+1 + 2bot
    'w': [[1,1],[2]],               // 2stacked top, 2side bot
    'x': [[2],[1,1]],               // 2side top, 2stacked bot
    'y': [1,[1],2],                 // asym 3col
    'z': [2,[1],1],                 // asym 3col inv
    'aa': [[1],[1,1,1]],            // 1 top, 3 bottom
    'ab': [[1,1,1],[1]],            // 3 top, 1 bottom
    'ac': [1,1,2],                  // 1+1+2 col
    'ad': [2,1,1],                  // 2+1+1 col
  },
  '5': {
    'a': [5],                         // 5 side by side
    'b': [1,[1,1,1,1]],               // 1 hero + 4 stacked
    'c': [[1,1,1,1],1],               // 4 stacked + 1 hero
    'd': [2,[1,1,1]],                  // 2 side + 3 stacked
    'e': [[1,1,1],2],                  // 3 stacked + 2 side
    'f': [3,[1,1]],                    // 3 side + 2 stacked
    'g': [[1,1],3],                    // 2 stacked + 3 side
    'h': [1,1,[1,1,1]],               // 2 singles + 3 stacked
    'i': [[1,1,1],1,1],               // 3 stacked + 2 singles
    'j': [1,[1,1],2],                  // 1 + 2stacked + 2side
    'k': [2,[1,1],1],                  // 2side + 2stacked + 1
    'l': [1,[1,1],[1,1]],              // 1 + 2stacked + 2stacked
    'm': [[1,1],[1,1],1],              // 2st + 2st + 1
    'n': [1,[1,1,1],[1]],              // 1 + 3st + 1
    'o': [[1],[4]],                    // 1 top, 4 bottom
    'p': [[4],[1]],                    // 4 top, 1 bottom
    'q': [[2],[3]],                    // 2 top, 3 bottom
    'r': [[3],[2]],                    // 3 top, 2 bottom
    's': [[1],[1,3]],                  // 1 top, 1+3 bottom
    't': [[3,1],[1]],                  // 3+1 top, 1 bottom
    'u': [1,1,1,[1,1]],               // 3 singles + 2 stacked
    'v': [[1,1],1,1,1],               // 2 stacked + 3 singles
    'w': [1,2,2],                      // 1+2+2 columns
    'x': [2,2,1],                      // 2+2+1 columns
    'y': [2,1,2],                      // 2+1+2 columns
    'z': [1,1,1,1,1],                  // 5 columns
    'aa': [[1],[2],[2]],               // 1+2+2 rows
    'ab': [[2],[2],[1]],               // 2+2+1 rows
    'ac': [[1],[1],[3]],               // 1+1+3 rows
    'ad': [[3],[1],[1]],               // 3+1+1 rows
  },
  '6': {
    'a': [6],                           // 6 side by side
    'b': [1,[1,1,1,1,1]],               // 1 hero + 5 stacked
    'c': [[1,1,1,1,1],1],               // 5 stacked + 1 hero
    'd': [2,[1,1,1,1]],                  // 2 side + 4 stacked
    'e': [[1,1,1,1],2],                  // 4 stacked + 2 side
    'f': [3,[1,1,1]],                    // 3 side + 3 stacked
    'g': [[1,1,1],3],                    // 3 stacked + 3 side
    'h': [2,2,[1,1]],                    // 2+2+2stacked
    'i': [[1,1],2,2],                    // 2stacked+2+2
    'j': [2,[1,1],2],                    // 2+2stacked+2
    'k': [1,[1,1],[1,1,1]],              // 1+2st+3st
    'l': [[1,1,1],[1,1],1],              // 3st+2st+1
    'm': [1,[1,1,1],[1,1]],              // 1+3st+2st
    'n': [[1,1],[1,1,1],1],              // 2st+3st+1
    'o': [1,1,[1,1],[1,1]],              // 2+2st+2st
    'p': [[1,1],[1,1],1,1],              // 2st+2st+2
    'q': [[1],[5]],                      // 1 top, 5 bottom
    'r': [[5],[1]],                      // 5 top, 1 bottom
    's': [[2],[4]],                      // 2 top, 4 bottom
    't': [[4],[2]],                      // 4 top, 2 bottom
    'u': [[3],[3]],                      // 3+3 (ratios make asym)
    'v': [[1],[2],[3]],                  // pyramid
    'w': [[3],[2],[1]],                  // inv pyramid
    'x': [[1],[3],[2]],                  // 1+3+2
    'y': [[2],[3],[1]],                  // 2+3+1
    'z': [1,1,1,[1,1,1]],               // 3+3stacked
    'aa': [[1,1,1],1,1,1],              // 3stacked+3
    'ab': [2,1,1,2],                     // 2+1+1+2
    'ac': [1,2,2,1],                     // 1+2+2+1
    'ad': [1,1,2,1,1],                   // 1+1+2+1+1
  },
  '7': {
    'a': [1,[1,1,1,1,1,1]],             // 1 hero + 6 stacked
    'b': [[1,1,1,1,1,1],1],             // 6 stacked + 1 hero
    'c': [2,[1,1,1,1,1]],               // 2 + 5 stacked
    'd': [[1,1,1,1,1],2],               // 5 stacked + 2
    'e': [3,[1,1,1,1]],                 // 3 + 4 stacked
    'f': [[1,1,1,1],3],                 // 4 stacked + 3
    'g': [1,[1,1],[1,1],[1,1]],          // 1+2+2+2
    'h': [[1,1],[1,1],[1,1],1],          // 2+2+2+1
    'i': [2,[1,1,1],[1,1]],             // 2+3st+2st
    'j': [[1,1],2,[1,1,1]],             // 2st+2+3st
    'k': [[2],[5]],                      // 2 top, 5 bottom
    'l': [[5],[2]],                      // 5 top, 2 bottom
    'm': [[3],[4]],                      // 3 top, 4 bottom
    'n': [[4],[3]],                      // 4 top, 3 bottom
    'o': [[1],[3],[3]],                  // 1+3+3
    'p': [[3],[3],[1]],                  // 3+3+1
    'q': [[1],[2],[4]],                  // 1+2+4
    'r': [[4],[2],[1]],                  // 4+2+1
    's': [1,2,2,2],                      // 1+2+2+2 columns
    't': [2,2,2,1],                      // 2+2+2+1 columns
    'u': [1,1,1,[1,1,1,1]],             // 3+4st
    'v': [[1,1,1,1],1,1,1],             // 4st+3
    'w': [3,2,[1,1]],                    // 3+2+2st
    'x': [[1,1],3,2],                   // 2st+3+2
    'y': [7],                            // 7 side by side
    'z': [1,1,1,1,[1,1,1]],             // 4+3st
    'aa': [[1,1,1],1,1,1,1],            // 3st+4
    'ab': [[1],[6]],                     // 1 top, 6 bottom
    'ac': [[6],[1]],                     // 6 top, 1 bottom
    'ad': [1,2,[1,1],[1,1]],             // 1+2+2st+2st
  },
  '8': {
    'a': [1,[1,1,1,1,1,1,1]],           // 1 hero + 7 stacked
    'b': [2,[1,1,1,1,1,1]],             // 2 + 6 stacked
    'c': [3,[1,1,1,1,1]],               // 3 + 5 stacked
    'd': [4,[1,1,1,1]],                 // 4 + 4 stacked
    'e': [[1,1],[1,1],[1,1],[1,1]],      // 4 × 2stacked
    'f': [2,2,[1,1],[1,1]],              // 2+2+2st+2st
    'g': [[1,1],[1,1],2,2],              // 2st+2st+2+2
    'h': [2,[1,1,1],2,[1]],             // asym
    'i': [[3],[5]],                      // 3 top, 5 bottom
    'j': [[5],[3]],                      // 5 top, 3 bottom
    'k': [[4],[4]],                      // 4+4 (ratios make asym)
    'l': [[2],[3],[3]],                  // 2+3+3
    'm': [[3],[3],[2]],                  // 3+3+2
    'n': [[1],[3],[4]],                  // 1+3+4
    'o': [[4],[3],[1]],                  // 4+3+1
    'p': [8],                            // 8 side by side
    'q': [2,2,2,2],                      // 4 columns of 2
    'r': [1,1,2,2,2],                    // asym columns
    's': [2,2,2,1,1],                    // asym inv
    't': [1,3,3,1],                      // mirror
    'u': [[2],[6]],                      // 2+6
    'v': [[6],[2]],                      // 6+2
    'w': [[1],[2],[5]],                  // pyramid
    'x': [[5],[2],[1]],                  // inv pyramid
    'y': [1,1,[1,1,1],[1,1,1]],          // 2+3st+3st
    'z': [[1,1,1],[1,1,1],1,1],          // 3st+3st+2
    'aa': [2,[1,1],[1,1],2],             // 2+2st+2st+2
    'ab': [1,[1,1,1,1],[1,1,1]],         // 1+4st+3st
    'ac': [[1,1,1],[1,1,1,1],1],         // 3st+4st+1
    'ad': [3,2,3],                       // 3+2+3
  },
  '9': {
    'a': [[3],[3],[3]],                  // 3+3+3
    'b': [[4],[5]],                      // 4+5
    'c': [[5],[4]],                      // 5+4
    'd': [3,3,3],                        // 3 × 3col
    'e': [1,[1,1,1,1],[1,1,1,1]],        // 1+4st+4st
    'f': [[1,1,1,1],[1,1,1,1],1],        // 4st+4st+1
    'g': [2,[1,1,1],[1,1,1,1]],          // 2+3st+4st
    'h': [[1,1,1,1],[1,1,1],2],          // 4st+3st+2
    'i': [[1],[4],[4]],                  // 1+4+4
    'j': [[4],[4],[1]],                  // 4+4+1
    'k': [[2],[3],[4]],                  // 2+3+4
    'l': [[4],[3],[2]],                  // 4+3+2
    'm': [1,2,3,3],                      // asym columns
    'n': [3,3,2,1],                      // asym inv
    'o': [9],                            // 9 side by side
    'p': [2,2,[1,1,1],[1,1,1]],          // 2+2+3st+3st
    'q': [[1,1,1],[1,1,1],2,2],          // 3st+3st+2+2
    'r': [[1],[3],[5]],                  // 1+3+5
    's': [[5],[3],[1]],                  // 5+3+1
    't': [3,[1,1,1,1,1,1]],             // 3+6st
    'u': [[1,1,1,1,1,1],3],             // 6st+3
    'v': [1,1,1,[1,1,1],[1,1,1]],        // 3+3st+3st
    'w': [[1,1,1],[1,1,1],1,1,1],        // 3st+3st+3
    'x': [2,3,2,2],                      // asym
    'y': [[2],[4],[3]],                  // 2+4+3
    'z': [[3],[4],[2]],                  // 3+4+2
    'aa': [1,2,2,2,2],                   // 1+4×2
    'ab': [2,2,2,2,1],                   // 4×2+1
    'ac': [4,[1,1,1,1,1]],              // 4+5st
    'ad': [[1,1,1,1,1],4],              // 5st+4
  },
  '10': {
    'a': [[5],[5]],                      // 5+5
    'b': [[4],[6]],                      // 4+6
    'c': [[6],[4]],                      // 6+4
    'd': [[3],[3],[4]],                  // 3+3+4
    'e': [[4],[3],[3]],                  // 4+3+3
    'f': [5,5],                          // 2 × 5col
    'g': [2,3,3,2],                      // mirror
    'h': [1,2,4,2,1],                    // diamond
    'i': [[2],[4],[4]],                  // 2+4+4
    'j': [[4],[4],[2]],                  // 4+4+2
    'k': [[1],[4],[5]],                  // 1+4+5
    'l': [[5],[4],[1]],                  // 5+4+1
    'm': [2,2,2,[1,1,1,1]],              // 3×2+4st
    'n': [[1,1,1,1],2,2,2],              // 4st+3×2
    'o': [10],                           // all side by side
    'p': [4,3,3],                        // asym 3col
    'q': [3,4,3],                        // center heavy
    'r': [3,3,4],                        // right heavy
    's': [[2],[3],[5]],                  // pyramid
    't': [[5],[3],[2]],                  // inv pyramid
    'u': [1,[1,1,1,1],[1,1,1,1,1]],      // 1+4st+5st
    'v': [[1,1,1,1,1],[1,1,1,1],1],      // 5st+4st+1
    'w': [2,2,3,3],                      // 2+2+3+3
    'x': [3,3,2,2],                      // 3+3+2+2
    'y': [[1],[5],[4]],                  // asym rows
    'z': [5,[1,1,1,1,1]],               // 5+5st
    'aa': [[1,1,1,1,1],5],              // 5st+5
    'ab': [[3],[4],[3]],                 // center heavy rows
    'ac': [2,4,2,2],                     // asym
    'ad': [2,2,4,2],                     // asym center
  },
  '11': {
    'a': [[5],[6]],                      // 5+6
    'b': [[6],[5]],                      // 6+5
    'c': [[4],[4],[3]],                  // 4+4+3
    'd': [[3],[4],[4]],                  // 3+4+4
    'e': [3,4,4],                        // 3col
    'f': [4,3,4],                        // center heavy
    'g': [4,4,3],                        // right light
    'h': [[2],[4],[5]],                  // 2+4+5
    'i': [[5],[4],[2]],                  // 5+4+2
    'j': [2,3,3,3],                      // 2+3×3
    'k': [3,3,3,2],                      // 3×3+2
    'l': [1,2,3,3,2],                    // pyramid col
    'm': [2,3,3,2,1],                    // inv pyramid
    'n': [5,6],                          // 2 big columns
    'o': [6,5],                          // 2 big columns inv
    'p': [[1],[4],[6]],                  // 1+4+6
    'q': [[6],[4],[1]],                  // 6+4+1
    'r': [[3],[3],[5]],                  // 3+3+5
    's': [[5],[3],[3]],                  // 5+3+3
    't': [11],                           // all side
    'u': [2,3,4,2],                      // asym
    'v': [2,4,3,2],                      // asym
    'w': [[1],[5],[5]],                  // 1+5+5
    'x': [[5],[5],[1]],                  // 5+5+1
    'y': [3,2,3,3],                      // asym
    'z': [3,3,2,3],                      // asym
    'aa': [[2],[3],[6]],                 // pyramid
    'ab': [[6],[3],[2]],                 // inv pyramid
    'ac': [4,3,2,2],                     // desc
    'ad': [2,2,3,4],                     // asc
  },
  '12': {
    'a': [[6],[6]],                      // 6+6
    'b': [[5],[7]],                      // wait, max 6 per row... use columns
    'c': [[4],[4],[4]],                  // 4+4+4
    'd': [[3],[4],[5]],                  // 3+4+5
    'e': [[5],[4],[3]],                  // 5+4+3
    'f': [4,4,4],                        // 3 × 4col
    'g': [3,3,3,3],                      // 4 × 3col
    'h': [6,6],                          // 2 × 6col
    'i': [2,4,4,2],                      // mirror
    'j': [3,2,4,3],                      // asym
    'k': [[3],[3],[3],[3]],              // 4 rows of 3
    'l': [[4],[4],[4]],                  // 3 rows of 4
    'm': [[2],[4],[6]],                  // pyramid
    'n': [[6],[4],[2]],                  // inv pyramid
    'o': [12],                           // all side
    'p': [2,2,4,2,2],                    // center heavy
    'q': [4,2,2,4],                      // edges heavy
    'r': [[1],[5],[6]],                  // 1+5+6
    's': [[6],[5],[1]],                  // 6+5+1
    't': [[2],[4],[3],[3]],              // 4 rows asym
    'u': [[3],[3],[4],[2]],              // 4 rows asym
    'v': [2,3,4,3],                      // asc-desc
    'w': [3,4,3,2],                      // desc-asc
    'x': [1,2,3,3,2,1],                  // diamond
    'y': [4,4,2,2],                      // 4+4+2+2
    'z': [2,2,4,4],                      // 2+2+4+4
    'aa': [[2],[5],[5]],                 // 2+5+5
    'ab': [[5],[5],[2]],                 // 5+5+2
    'ac': [3,3,6],                       // 3+3+6
    'ad': [6,3,3],                       // 6+3+3
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
    if (topo === 1) return { cells: [{ x: 0, y: 0, width: 1, height: 1 }], aspect: ratios[0] || 0.67 };
    // n photos side by side
    return solveSimpleRow(topo, ratios);
  }
  if (topo.length === 1 && typeof topo[0] === 'number') {
    if (topo[0] === 1) return { cells: [{ x: 0, y: 0, width: 1, height: 1 }], aspect: ratios[0] || 0.67 };
    return solveSimpleRow(topo[0], ratios);
  }
  // All arrays → stacked rows
  if (topo.every(el => Array.isArray(el))) {
    return solveRowSpec(topo, ratios);
  }
  // All numbers → columns with stacked photos
  if (topo.every(el => typeof el === 'number')) {
    return solveColSpec(topo, ratios);
  }
  // Mixed → columns
  return solveColSpec(topo, ratios);
}

// n photos side by side — widths proportional to ratio
function solveSimpleRow(n, ratios) {
  const rs = ratios.slice(0, n);
  const sigma = rs.reduce((s, r) => s + r, 0);
  const cells = [];
  let x = 0;
  for (const r of rs) {
    cells.push({ x, y: 0, width: r / sigma, height: 1 });
    x += r / sigma;
  }
  return { cells, aspect: sigma };
}

// Rows stacked vertically: [[a],[b],[c]]
function solveRowSpec(spec, ratios) {
  let idx = 0;
  const rows = spec.map(rs => {
    const count = countPhotos(rs);
    const rr = ratios.slice(idx, idx + count);
    idx += count;
    if (rs.length === 1 && typeof rs[0] === 'number') {
      const n = rs[0];
      const sigma = rr.reduce((s, r) => s + r, 0);
      return { type: 'simple', sigma, naturalH: 1 / sigma, ratios: rr };
    }
    if (typeof rs === 'number') {
      return { type: 'simple', sigma: rr[0] || 1, naturalH: 1 / (rr[0] || 1), ratios: rr };
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

// Columns side by side: [a, [b,c], d]
function solveColSpec(colSpecs, ratios) {
  let idx = 0;
  const cols = colSpecs.map(cs => {
    const count = countPhotos(cs);
    const cr = ratios.slice(idx, idx + count);
    idx += count;
    if (typeof cs === 'number') {
      // cs photos stacked vertically
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
      const invSum = col.ratios.reduce((s, r) => s + 1 / r, 0);
      let y = 0;
      for (const r of col.ratios) {
        const h = (1 / r) / invSum;
        cells.push({ x, y, width: w, height: h });
        y += h;
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
export function generatePageLayouts(ratios, gapFraction = 0.008) {
  const n = ratios.length;
  const table = TOPOLOGY_TABLES[String(n)];
  if (!table) return [];

  const layouts = [];
  for (const [key, topo] of Object.entries(table)) {
    try {
      const { cells } = solveTopology(topo, ratios);
      // Apply gap
      const g = gapFraction;
      const eps = 1e-4;
      const gapped = cells.map(cell => ({
        x:      cell.x      + (cell.x < eps ? 0 : g / 2),
        y:      cell.y      + (cell.y < eps ? 0 : g / 2),
        width:  cell.width  - (cell.x < eps ? 0 : g / 2) - (cell.x + cell.width > 1 - eps ? 0 : g / 2),
        height: cell.height - (cell.y < eps ? 0 : g / 2) - (cell.y + cell.height > 1 - eps ? 0 : g / 2),
      }));
      layouts.push({ id: `${n}P-${key}`, topology: topo, cells: gapped, photoCount: n });
    } catch (e) { /* skip invalid */ }
  }
  return layouts;
}

// ─── GET PHOTO RATIOS ───────────────────────────────────────
export function getPhotoRatios(photos) {
  return photos.map(p => {
    const w = p.origW || 1;
    const h = p.origH || 1;
    return w / h;
  });
}

// ─── CONVERT CELLS TO TREE ──────────────────────────────────
export function cellsToTree(cells, photos) {
  if (!cells || cells.length === 0) {
    return { type: 'leaf', id: 'empty', slot: 'A', photo: null };
  }
  const leaves = cells.map((cell, i) => ({
    type: 'leaf',
    id: photos[i]?.id || `cell-${i}`,
    slot: String.fromCharCode(65 + i),
    photo: photos[i] || null,
    cropOffset: photos[i]?.cropOffset || { opx: 50, opy: 50 },
    _collageCell: cell,
  }));
  function buildChain(arr) {
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return { type: 'col', ratio: 0.5, children: [arr[0], arr[1]] };
    const mid = Math.ceil(arr.length / 2);
    return { type: 'col', ratio: 0.5, children: [buildChain(arr.slice(0, mid)), buildChain(arr.slice(mid))] };
  }
  return buildChain(leaves);
}

export { TOPOLOGY_TABLES, solveTopology };
