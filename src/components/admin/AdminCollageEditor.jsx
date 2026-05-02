import { useState, useRef, useCallback, useEffect } from 'react';
import { db } from '../../firebase/config';

/* ═══════════════════════════════════════════════════════════
   ADMIN COLLAGE EDITOR — Free-form template designer (LAYFLAT)

   Masa de lucru = ROTAȚIA completă layflat (o suprafață continuă)
   Linia centrală = ghid vizual, NU barieră
   Frame-urile pot traversa centrul (panoramă)

   Coordonate: % relativ la SPREAD-ul complet (0-100 width, 0-100 height)
   Centrul paginilor = 50% pe axa X

   Universal: template pătrat → 20×20, 23×23, 30×30
   Separat: template portret → 20×30
   ═══════════════════════════════════════════════════════════ */

const MASKS = [
  { id: 'rect', label: 'Dreptunghi', clip: 'none' },
  { id: 'rounded', label: 'Rotunjit', clip: 'inset(0 round 6%)' },
  { id: 'circle', label: 'Cerc', clip: 'ellipse(50% 50% at 50% 50%)' },
  { id: 'arch', label: 'Arc sus', clip: 'inset(0 0 0 0 round 50% 50% 0 0)' },
  { id: 'diamond', label: 'Romb', clip: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
  { id: 'hexagon', label: 'Hexagon', clip: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' },
];

const SLOT_COLORS = { H: '#3b82f6', V: '#ef4444', S: '#9ca3af', A: '#a8a29e' };
const SLOT_LABELS = { H: 'Landscape', V: 'Portrait', S: 'Pătrat', A: 'Orice' };

const HANDLES = [
  { id: 'tl', style: { top: 0, left: 0, transform: 'translate(-50%,-50%)' }, cursor: 'nwse-resize' },
  { id: 't',  style: { top: 0, left: '50%', transform: 'translate(-50%,-50%)' }, cursor: 'ns-resize' },
  { id: 'tr', style: { top: 0, right: 0, transform: 'translate(50%,-50%)' }, cursor: 'nesw-resize' },
  { id: 'r',  style: { top: '50%', right: 0, transform: 'translate(50%,-50%)' }, cursor: 'ew-resize' },
  { id: 'br', style: { bottom: 0, right: 0, transform: 'translate(50%,50%)' }, cursor: 'nwse-resize' },
  { id: 'b',  style: { bottom: 0, left: '50%', transform: 'translate(-50%,50%)' }, cursor: 'ns-resize' },
  { id: 'bl', style: { bottom: 0, left: 0, transform: 'translate(-50%,50%)' }, cursor: 'nesw-resize' },
  { id: 'l',  style: { top: '50%', left: 0, transform: 'translate(-50%,-50%)' }, cursor: 'ew-resize' },
];

const FORMAT_TYPES = {
  patrat:  { label: 'Pătrat', spreadRatio: 0.5, formats: ['20×20', '23×23', '30×30'] },
  portret: { label: 'Portret', spreadRatio: 0.75, formats: ['20×30'] },
};

/* ═══ SMART GUIDES + ANTI-OVERLAP + DISTANCE MEASUREMENT ═══
   - All measurements shown in mm (converted from % using spread width)
   - Snap to edges, centers, and canvas reference lines
   - Anti-overlap with configurable minimum gap
   - Distance labels on all 4 sides between frames
   ═══════════════════════════════════════════════════════════ */
const SNAP_THRESHOLD = 1.0; // snap within 1% of spread
const SPREAD_MM_W = 400; // spread width in mm (for % → mm conversion)

function pctToMm(pct, axis = 'x', spreadRatio = 0.5) {
  if (axis === 'x') return (pct / 100) * SPREAD_MM_W;
  return (pct / 100) * SPREAD_MM_W * spreadRatio;
}

function computeGuides(movingFrame, allFrames, spreadRatio) {
  const guides = { lines: [], distances: [], sizeMatch: [] };
  if (!movingFrame) return guides;

  const m = {
    l: movingFrame.x, t: movingFrame.y,
    r: movingFrame.x + movingFrame.w, b: movingFrame.y + movingFrame.h,
    cx: movingFrame.x + movingFrame.w / 2, cy: movingFrame.y + movingFrame.h / 2,
    w: movingFrame.w, h: movingFrame.h,
  };

  const others = allFrames.filter(f => f.id !== movingFrame.id);

  // ── 1. Edge + center alignment lines (all 4 sides × all combinations) ──
  for (const f of others) {
    const o = { l: f.x, t: f.y, r: f.x + f.w, b: f.y + f.h, cx: f.x + f.w / 2, cy: f.y + f.h / 2 };

    // X-axis pairs (generate vertical guide lines)
    for (const [mp, op] of [[m.l,o.l],[m.l,o.r],[m.r,o.l],[m.r,o.r],[m.cx,o.cx],[m.l,o.cx],[m.r,o.cx],[m.cx,o.l],[m.cx,o.r]]) {
      if (Math.abs(mp - op) < SNAP_THRESHOLD) {
        guides.lines.push({ dir: 'v', pos: op, from: Math.min(m.t, o.t), to: Math.max(m.b, o.b) });
      }
    }

    // Y-axis pairs (generate horizontal guide lines)
    for (const [mp, op] of [[m.t,o.t],[m.t,o.b],[m.b,o.t],[m.b,o.b],[m.cy,o.cy],[m.t,o.cy],[m.b,o.cy],[m.cy,o.t],[m.cy,o.b]]) {
      if (Math.abs(mp - op) < SNAP_THRESHOLD) {
        guides.lines.push({ dir: 'h', pos: op, from: Math.min(m.l, o.l), to: Math.max(m.r, o.r) });
      }
    }

    // ── 2. Size match ──
    if (Math.abs(m.w - f.w) < SNAP_THRESHOLD) guides.sizeMatch.push({ type: 'w', valPct: f.w, valMm: pctToMm(f.w, 'x') });
    if (Math.abs(m.h - f.h) < SNAP_THRESHOLD) guides.sizeMatch.push({ type: 'h', valPct: f.h, valMm: pctToMm(f.h, 'y', spreadRatio) });
  }

  // ── 3. Canvas reference lines ──
  for (const rp of [0, 25, 50, 75, 100]) {
    if (Math.abs(m.l - rp) < SNAP_THRESHOLD || Math.abs(m.r - rp) < SNAP_THRESHOLD || Math.abs(m.cx - rp) < SNAP_THRESHOLD) {
      guides.lines.push({ dir: 'v', pos: rp, from: 0, to: 100, canvas: true });
    }
  }
  for (const rp of [0, 50, 100]) {
    if (Math.abs(m.t - rp) < SNAP_THRESHOLD || Math.abs(m.b - rp) < SNAP_THRESHOLD || Math.abs(m.cy - rp) < SNAP_THRESHOLD) {
      guides.lines.push({ dir: 'h', pos: rp, from: 0, to: 100, canvas: true });
    }
  }

  // ── 4. Distances to ALL neighbours (all 4 directions) ──
  for (const f of others) {
    const o = { l: f.x, t: f.y, r: f.x + f.w, b: f.y + f.h };

    // Horizontal: frame is to the RIGHT of other
    if (m.l >= o.r && m.t < o.b && m.b > o.t) {
      const midY = (Math.max(m.t, o.t) + Math.min(m.b, o.b)) / 2;
      const gapPct = m.l - o.r;
      guides.distances.push({ dir: 'h', pct: gapPct, mm: pctToMm(gapPct, 'x'), x1: o.r, x2: m.l, y: midY });
    }
    // Horizontal: frame is to the LEFT of other
    if (o.l >= m.r && m.t < o.b && m.b > o.t) {
      const midY = (Math.max(m.t, o.t) + Math.min(m.b, o.b)) / 2;
      const gapPct = o.l - m.r;
      guides.distances.push({ dir: 'h', pct: gapPct, mm: pctToMm(gapPct, 'x'), x1: m.r, x2: o.l, y: midY });
    }
    // Vertical: frame is BELOW other
    if (m.t >= o.b && m.l < o.r && m.r > o.l) {
      const midX = (Math.max(m.l, o.l) + Math.min(m.r, o.r)) / 2;
      const gapPct = m.t - o.b;
      guides.distances.push({ dir: 'v', pct: gapPct, mm: pctToMm(gapPct, 'y', spreadRatio), y1: o.b, y2: m.t, x: midX });
    }
    // Vertical: frame is ABOVE other
    if (o.t >= m.b && m.l < o.r && m.r > o.l) {
      const midX = (Math.max(m.l, o.l) + Math.min(m.r, o.r)) / 2;
      const gapPct = o.t - m.b;
      guides.distances.push({ dir: 'v', pct: gapPct, mm: pctToMm(gapPct, 'y', spreadRatio), y1: m.b, y2: o.t, x: midX });
    }
  }

  // Deduplicate lines
  const seen = new Set();
  guides.lines = guides.lines.filter(l => {
    const key = `${l.dir}_${Math.round(l.pos * 10)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return guides;
}

function applySnap(frame, allFrames) {
  let { x, y, w, h } = frame;

  const refX = [0, 25, 50, 75, 100];
  const refY = [0, 50, 100];
  for (const f of allFrames) {
    if (f.id === frame.id) continue;
    refX.push(f.x, f.x + f.w, f.x + f.w / 2);
    refY.push(f.y, f.y + f.h, f.y + f.h / 2);
  }

  // Pick the closest snap on each axis
  let bestXD = SNAP_THRESHOLD, bestXS = 0;
  const r = x + w, cx = x + w / 2;
  for (const rp of refX) {
    const dL = Math.abs(x - rp); if (dL < bestXD) { bestXD = dL; bestXS = rp - x; }
    const dR = Math.abs(r - rp); if (dR < bestXD) { bestXD = dR; bestXS = rp - r; }
    const dC = Math.abs(cx - rp); if (dC < bestXD) { bestXD = dC; bestXS = rp - cx; }
  }
  if (bestXD < SNAP_THRESHOLD) x += bestXS;

  let bestYD = SNAP_THRESHOLD, bestYS = 0;
  const b = y + h, cy = y + h / 2;
  for (const rp of refY) {
    const dT = Math.abs(y - rp); if (dT < bestYD) { bestYD = dT; bestYS = rp - y; }
    const dB = Math.abs(b - rp); if (dB < bestYD) { bestYD = dB; bestYS = rp - b; }
    const dC = Math.abs(cy - rp); if (dC < bestYD) { bestYD = dC; bestYS = rp - cy; }
  }
  if (bestYD < SNAP_THRESHOLD) y += bestYS;

  return { x, y };
}

/**
 * Anti-overlap: prevent frame from overlapping others. Uses minGapPct.
 * Runs multiple passes to handle cascading pushes.
 */
function enforceNoOverlap(frame, allFrames, minGapPct) {
  let { x, y } = frame;
  const { w, h } = frame;

  // Up to 3 passes to resolve cascading overlaps
  for (let pass = 0; pass < 3; pass++) {
    let pushed = false;
    for (const f of allFrames) {
      if (f.id === frame.id) continue;
      const ol = x, ot = y, or2 = x + w, ob = y + h;
      const fl = f.x, ft = f.y, fr = f.x + f.w, fb = f.y + f.h;

      // Is there overlap (including gap)?
      if (ol < fr + minGapPct && or2 > fl - minGapPct && ot < fb + minGapPct && ob > ft - minGapPct) {
        // 4 possible pushes to resolve
        const pushes = [
          { a: 'x', d: fr + minGapPct - ol },  // push right
          { a: 'x', d: fl - minGapPct - or2 }, // push left
          { a: 'y', d: fb + minGapPct - ot },  // push down
          { a: 'y', d: ft - minGapPct - ob },  // push up
        ];
        pushes.sort((a, b) => Math.abs(a.d) - Math.abs(b.d));
        if (pushes[0].a === 'x') x += pushes[0].d;
        else y += pushes[0].d;
        pushed = true;
      }
    }
    if (!pushed) break;
  }

  return { x, y };
}

/**
 * Anti-overlap for resize: clamp each edge to not intrude past neighbour + gap.
 */
function enforceNoOverlapResize(frame, allFrames, minGapPct) {
  let { x, y, w, h } = frame;

  for (const f of allFrames) {
    if (f.id === frame.id) continue;
    const fl = f.x, ft = f.y, fr = f.x + f.w, fb = f.y + f.h;

    // Is there overlap?
    if (x < fr + minGapPct && (x + w) > fl - minGapPct &&
        y < fb + minGapPct && (y + h) > ft - minGapPct) {
      // Clamp the intruding edge
      const rEdge = x + w;
      const bEdge = y + h;

      // Right edge intruding into other's left?
      if (rEdge > fl - minGapPct && x < fl) { w = fl - minGapPct - x; }
      // Left edge intruding into other's right?
      else if (x < fr + minGapPct && rEdge > fr) { const newX = fr + minGapPct; w = w - (newX - x); x = newX; }
      // Bottom edge intruding into other's top?
      if (bEdge > ft - minGapPct && y < ft) { h = ft - minGapPct - y; }
      // Top edge intruding into other's bottom?
      else if (y < fb + minGapPct && bEdge > fb) { const newY = fb + minGapPct; h = h - (newY - y); y = newY; }

      w = Math.max(3, w);
      h = Math.max(3, h);
    }
  }

  return { x, y, w, h };
}

/* ═══ Guide Lines Overlay — all 4 sides ═══ */
function GuidesOverlay({ guides, spreadW, spreadH }) {
  if (!guides) return null;
  const P = (v, total) => (v / 100) * total; // percent to px

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 500 }}>
      {/* Alignment lines */}
      {guides.lines.map((line, i) => {
        if (line.dir === 'v') {
          return (
            <div key={'gl' + i} style={{
              position: 'absolute',
              left: P(line.pos, spreadW), top: P(line.from, spreadH),
              width: 0, height: P(line.to - line.from, spreadH),
              borderLeft: line.canvas ? '1px dashed rgba(59,130,246,0.4)' : '1px solid rgba(236,72,153,0.8)',
            }} />
          );
        }
        return (
          <div key={'gl' + i} style={{
            position: 'absolute',
            left: P(line.from, spreadW), top: P(line.pos, spreadH),
            width: P(line.to - line.from, spreadW), height: 0,
            borderTop: line.canvas ? '1px dashed rgba(59,130,246,0.4)' : '1px solid rgba(236,72,153,0.8)',
          }} />
        );
      })}

      {/* Distance labels */}
      {guides.distances.map((d, i) => {
        if (d.dir === 'h') {
          const lx = P(d.x1, spreadW), rx = P(d.x2, spreadW), cy = P(d.y, spreadH);
          const w = rx - lx;
          if (w < 3) return null;
          return (
            <div key={'gd' + i}>
              <div style={{ position: 'absolute', left: lx, top: cy, width: w, height: 0, borderTop: '1px dashed rgba(236,72,153,0.5)' }} />
              <div style={{ position: 'absolute', left: lx, top: cy - 1, width: 1, height: 3, background: 'rgba(236,72,153,0.7)' }} />
              <div style={{ position: 'absolute', left: rx - 1, top: cy - 1, width: 1, height: 3, background: 'rgba(236,72,153,0.7)' }} />
              <div style={{ position: 'absolute', left: (lx + rx) / 2, top: cy - 14, transform: 'translateX(-50%)',
                background: 'rgba(236,72,153,0.9)', color: '#fff', fontSize: 9, fontWeight: 700,
                padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                {d.mm.toFixed(1)} mm
              </div>
            </div>
          );
        } else {
          const ty = P(d.y1, spreadH), by = P(d.y2, spreadH), cx = P(d.x, spreadW);
          const h = by - ty;
          if (h < 3) return null;
          return (
            <div key={'gd' + i}>
              <div style={{ position: 'absolute', left: cx, top: ty, width: 0, height: h, borderLeft: '1px dashed rgba(236,72,153,0.5)' }} />
              <div style={{ position: 'absolute', left: cx - 1, top: ty, width: 3, height: 1, background: 'rgba(236,72,153,0.7)' }} />
              <div style={{ position: 'absolute', left: cx - 1, top: by - 1, width: 3, height: 1, background: 'rgba(236,72,153,0.7)' }} />
              <div style={{ position: 'absolute', left: cx + 6, top: (ty + by) / 2, transform: 'translateY(-50%)',
                background: 'rgba(236,72,153,0.9)', color: '#fff', fontSize: 9, fontWeight: 700,
                padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                {d.mm.toFixed(1)} mm
              </div>
            </div>
          );
        }
      })}

      {/* Size match indicators */}
      {guides.sizeMatch.length > 0 && (
        <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {guides.sizeMatch.map((sm, i) => (
            <div key={'sm' + i} style={{
              background: 'rgba(16,185,129,0.85)', color: '#fff', fontSize: 9, fontWeight: 700,
              padding: '2px 6px', borderRadius: 4,
            }}>
              = {sm.type === 'w' ? 'lățime' : 'înălțime'} ({sm.valMm.toFixed(1)} mm)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

let _nextId = 0;
function newFrame(x = 5, y = 5, w = 20, h = 40) {
  return { id: 'pf' + (++_nextId), x, y, w, h, slot: 'S', mask: 'rect', zIndex: _nextId };
}

/* ── Single Frame on Spread Canvas ── */
function TemplateFrame({ frame, selected, spreadW, spreadH, gapPx, allFrames, minGapPct, spreadRatio, onSelect, onUpdate, onDelete, onDragStateChange }) {
  const halfGap = gapPx / 2;
  const px = (frame.x / 100) * spreadW + halfGap;
  const py = (frame.y / 100) * spreadH + halfGap;
  const pw = Math.max(4, (frame.w / 100) * spreadW - gapPx);
  const ph = Math.max(4, (frame.h / 100) * spreadH - gapPx);
  const mask = MASKS.find(m => m.id === frame.mask) || MASKS[0];
  const slotColor = SLOT_COLORS[frame.slot] || SLOT_COLORS.A;

  // Does this frame cross the center?
  const crossesCenter = frame.x < 50 && (frame.x + frame.w) > 50;

  const handleMoveStart = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation(); e.preventDefault();
    onSelect(frame.id);
    const startMX = e.clientX, startMY = e.clientY;
    const startX = frame.x, startY = frame.y;
    const onMove = (ev) => {
      const dx = ((ev.clientX - startMX) / spreadW) * 100;
      const dy = ((ev.clientY - startMY) / spreadH) * 100;
      const rawFrame = { ...frame, x: startX + dx, y: startY + dy };
      const snapped = applySnap(rawFrame, allFrames);
      const safe = enforceNoOverlap({ ...rawFrame, x: snapped.x, y: snapped.y }, allFrames, minGapPct);
      onUpdate(frame.id, { x: safe.x, y: safe.y });
      if (onDragStateChange) onDragStateChange(computeGuides({ ...rawFrame, x: safe.x, y: safe.y }, allFrames, spreadRatio));
    };
    const onUp = () => {
      if (onDragStateChange) onDragStateChange(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleResizeStart = (e, handle) => {
    e.stopPropagation(); e.preventDefault();
    const startMX = e.clientX, startMY = e.clientY;
    const sX = frame.x, sY = frame.y, sW = frame.w, sH = frame.h;
    const onMove = (ev) => {
      const dx = ((ev.clientX - startMX) / spreadW) * 100;
      const dy = ((ev.clientY - startMY) / spreadH) * 100;
      let nx = sX, ny = sY, nw = sW, nh = sH;
      if (handle.includes('l')) { nx = sX + dx; nw = sW - dx; }
      if (handle.includes('r')) { nw = sW + dx; }
      if (handle.includes('t')) { ny = sY + dy; nh = sH - dy; }
      if (handle.includes('b')) { nh = sH + dy; }
      if (nw < 3) { if (handle.includes('l')) nx = sX + sW - 3; nw = 3; }
      if (nh < 3) { if (handle.includes('t')) ny = sY + sH - 3; nh = 3; }
      // Enforce no overlap during resize
      const safe = enforceNoOverlapResize({ ...frame, x: nx, y: ny, w: nw, h: nh }, allFrames, minGapPct);
      onUpdate(frame.id, { x: safe.x, y: safe.y, w: safe.w, h: safe.h });
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div
      style={{
        position: 'absolute', left: px, top: py, width: pw, height: ph,
        zIndex: frame.zIndex || 0,
        clipPath: mask.clip !== 'none' ? mask.clip : undefined,
        WebkitClipPath: mask.clip !== 'none' ? mask.clip : undefined,
      }}
      onMouseDown={handleMoveStart}
    >
      <div style={{
        width: '100%', height: '100%',
        background: slotColor + '18',
        border: selected ? '2.5px solid #3D6B5E' : `1.5px solid ${slotColor}55`,
        borderRadius: frame.mask === 'rounded' ? '6%' : (frame.mask === 'rect' ? 4 : 0),
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'move', userSelect: 'none',
        boxShadow: selected ? '0 0 0 2px rgba(61,107,94,0.3)' : 'none',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: slotColor }}>{frame.slot}</span>
        {crossesCenter && <span style={{ fontSize: 8, color: '#3D6B5E', fontWeight: 600 }}>PANORAMĂ</span>}
        {frame.mask !== 'rect' && <span style={{ fontSize: 8, color: '#888' }}>{mask.label}</span>}
        <span style={{ fontSize: 7, color: '#bbb', marginTop: 1 }}>{Math.round(frame.w)}% × {Math.round(frame.h)}%</span>
      </div>

      {selected && HANDLES.map(h => (
        <div key={h.id} style={{ position: 'absolute', ...h.style, width: 10, height: 10, background: '#fff', border: '2px solid #3D6B5E', borderRadius: 2, cursor: h.cursor, zIndex: 100 }}
          onMouseDown={(e) => handleResizeStart(e, h.id)} />
      ))}
      {selected && (
        <button style={{ position: 'absolute', top: -8, right: -8, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }}
          onMouseDown={(e) => { e.stopPropagation(); onDelete(frame.id); }}>×</button>
      )}
    </div>
  );
}

/* ═══ MAIN EDITOR ═══ */
export default function AdminCollageEditor({ editTemplate = null, onSaved, onCancel }) {
  const [name, setName] = useState(editTemplate?.name || '');
  const [category, setCategory] = useState(editTemplate?.category || 'clasic');
  const [formatType, setFormatType] = useState(editTemplate?.formatType || 'patrat');
  const [frames, setFrames] = useState(editTemplate?.frames || []);
  const [gapMm, setGapMm] = useState(editTemplate?.gapMm ?? 0.5);
  const [selectedId, setSelectedId] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeGuides, setActiveGuides] = useState(null);
  const canvasRef = useRef(null);

  // ── Canvas: full layflat spread ──
  const fmt = FORMAT_TYPES[formatType];
  const SPREAD_W = 820;
  const SPREAD_H = Math.round(SPREAD_W * fmt.spreadRatio);

  // Gap in canvas px (spread = ~400mm wide for square)
  const spreadMmW = formatType === 'portret' ? 400 : 400;
  const gapPx = (gapMm / spreadMmW) * SPREAD_W;
  const minGapPct = (Math.max(0.75, gapMm) / SPREAD_MM_W) * 100; // min gap in % (at least 0.75mm)

  const CATEGORIES = [
    { id: 'clasic', label: 'Clasic' },
    { id: 'artistic', label: 'Artistic' },
    { id: 'minimalist', label: 'Minimalist' },
    { id: 'modern', label: 'Modern' },
    { id: 'overlap', label: 'Suprapunere' },
  ];

  // ── Frame operations ──
  const addFrame = useCallback((preset) => {
    let f;
    if (preset === 'left') f = newFrame(3, 5, 44, 90);
    else if (preset === 'right') f = newFrame(53, 5, 44, 90);
    else if (preset === 'panorama') f = newFrame(5, 10, 90, 80);
    else if (preset === 'small') f = newFrame(10 + Math.random() * 30, 10 + Math.random() * 30, 20, 25);
    else f = newFrame(5 + Math.random() * 40, 5 + Math.random() * 40, 25 + Math.random() * 15, 30 + Math.random() * 15);
    setFrames(prev => [...prev, f]);
    setSelectedId(f.id);
  }, []);

  const updateFrame = useCallback((id, patch) => {
    setFrames(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }, []);

  const deleteFrame = useCallback((id) => {
    setFrames(prev => prev.filter(f => f.id !== id));
    setSelectedId(null);
  }, []);

  const duplicateFrame = useCallback((id) => {
    setFrames(prev => {
      const src = prev.find(f => f.id === id);
      if (!src) return prev;
      return [...prev, { ...src, id: 'pf' + (++_nextId), x: src.x + 2, y: src.y + 2, zIndex: (src.zIndex || 0) + 1 }];
    });
  }, []);

  const bringForward = useCallback((id) => {
    setFrames(prev => { const maxZ = Math.max(0, ...prev.map(f => f.zIndex || 0)); return prev.map(f => f.id === id ? { ...f, zIndex: maxZ + 1 } : f); });
  }, []);

  const sendBackward = useCallback((id) => {
    setFrames(prev => { const minZ = Math.min(0, ...prev.map(f => f.zIndex || 0)); return prev.map(f => f.id === id ? { ...f, zIndex: minZ - 1 } : f); });
  }, []);

  const handleCanvasClick = useCallback((e) => {
    if (e.target === canvasRef.current || e.target.dataset?.canvas) setSelectedId(null);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!selectedId) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement?.tagName !== 'INPUT') deleteFrame(selectedId);
      if (e.key === 'd' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); duplicateFrame(selectedId); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, deleteFrame, duplicateFrame]);

  const flash = useCallback((text, type = 'ok') => { setMessage({ text, type }); setTimeout(() => setMessage(null), 4000); }, []);

  useEffect(() => { if (!editTemplate) { setFrames([]); setSelectedId(null); } }, [formatType]);

  // ── Publish ──
  const handlePublish = useCallback(async () => {
    if (!name.trim()) { flash('Adaugă un nume', 'err'); return; }
    if (frames.length === 0) { flash('Adaugă cel puțin un frame', 'err'); return; }

    setPublishing(true);
    try {
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const ref = doc(db, 'settings', 'pro_templates');
      const snap = await getDoc(ref);
      const existing = snap.exists() ? (snap.data().items || []) : [];

      const template = {
        id: editTemplate?.id || ('tpl_' + Date.now()),
        name: name.trim(),
        category,
        formatType,
        gapMm,
        photoCount: frames.length,
        frames: frames.map(f => ({
          x: Math.round(f.x * 100) / 100,
          y: Math.round(f.y * 100) / 100,
          w: Math.round(f.w * 100) / 100,
          h: Math.round(f.h * 100) / 100,
          slot: f.slot, mask: f.mask, zIndex: f.zIndex || 0,
        })),
        professional: true,
        createdBy: 'team',
        createdAt: editTemplate?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let newItems;
      if (editTemplate?.id) {
        newItems = existing.map(t => t.id === editTemplate.id ? template : t);
        if (!existing.find(t => t.id === editTemplate.id)) newItems.push(template);
      } else {
        newItems = [...existing, template];
      }

      await setDoc(ref, { items: newItems, updatedAt: new Date().toISOString() });
      flash(`Template "${name}" salvat!`, 'ok');
      if (onSaved) onSaved(template);
    } catch (e) { flash('Eroare: ' + e.message, 'err'); }
    setPublishing(false);
  }, [name, category, formatType, gapMm, frames, editTemplate, flash, onSaved]);

  const selectedFrame = frames.find(f => f.id === selectedId);

  // Detect panorama frames
  const panoramaCount = frames.filter(f => f.x < 50 && (f.x + f.w) > 50).length;

  return (
    <div className="flex gap-6">
      {/* ═══ LEFT: Spread Canvas ═══ */}
      <div className="flex-shrink-0">
        {/* Format selector */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#888] font-semibold">Format:</span>
            {Object.entries(FORMAT_TYPES).map(([key, ft]) => (
              <button key={key} onClick={() => setFormatType(key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                  formatType === key ? 'bg-[#3D6B5E] text-white' : 'bg-[#F0EDE6] text-[#666]'
                }`}>{ft.label} <span className="text-[9px] opacity-70">({ft.formats.join(', ')})</span></button>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-[#999] mb-2">
          Layflat — frame-urile pot traversa centrul (panoramă). Coordonate în % relativ la spread.
        </div>

        {/* ═══ LAYFLAT SPREAD CANVAS ═══ */}
        <div
          ref={canvasRef}
          data-canvas="true"
          onClick={handleCanvasClick}
          style={{
            width: SPREAD_W, height: SPREAD_H,
            position: 'relative', overflow: 'hidden',
            background: '#fff',
            border: '2px solid #E0D8D0', borderRadius: 12,
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            userSelect: 'none',
          }}
        >
          {/* Center line — ghid vizual, nu barieră */}
          <div style={{
            position: 'absolute', left: '50%', top: 0, bottom: 0, width: 0,
            borderLeft: '1.5px dashed rgba(200,190,180,0.5)',
            pointerEvents: 'none', zIndex: 300,
          }} />
          <span style={{
            position: 'absolute', left: '50%', top: 6, transform: 'translateX(-50%)',
            fontSize: 9, color: 'rgba(180,170,160,0.6)', pointerEvents: 'none', zIndex: 300,
            background: 'rgba(255,255,255,0.8)', padding: '0 4px', borderRadius: 3,
          }}>centru</span>

          {/* Bleed guides */}
          <div style={{ position: 'absolute', inset: SPREAD_W * 0.015, border: '1px dashed rgba(239,68,68,0.2)', borderRadius: 4, pointerEvents: 'none', zIndex: 300 }} />
          <span style={{ position: 'absolute', top: 4, left: 8, fontSize: 8, color: 'rgba(239,68,68,0.3)', pointerEvents: 'none', zIndex: 300 }}>bleed 3mm</span>

          {/* Page labels */}
          <span style={{ position: 'absolute', bottom: 6, left: SPREAD_W * 0.25, transform: 'translateX(-50%)', fontSize: 10, color: '#ddd', pointerEvents: 'none', zIndex: 300 }}>Pagina stânga</span>
          <span style={{ position: 'absolute', bottom: 6, left: SPREAD_W * 0.75, transform: 'translateX(-50%)', fontSize: 10, color: '#ddd', pointerEvents: 'none', zIndex: 300 }}>Pagina dreapta</span>

          {/* Permanent alignment lines between frames (top↔top, bottom↔bottom) */}
          {frames.length >= 2 && !activeGuides && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 250 }}>
              {(() => {
                const lines = [];
                const ALIGN_THRESH = 0.5; // 0.5% = considered aligned
                for (let i = 0; i < frames.length; i++) {
                  for (let j = i + 1; j < frames.length; j++) {
                    const a = frames[i], b = frames[j];
                    const al = a.x, at2 = a.y, ar = a.x + a.w, ab = a.y + a.h;
                    const bl = b.x, bt = b.y, br = b.x + b.w, bb = b.y + b.h;
                    // Top aligned
                    if (Math.abs(at2 - bt) < ALIGN_THRESH) {
                      lines.push({ dir: 'h', pos: at2, from: Math.min(al, bl), to: Math.max(ar, br) });
                    }
                    // Bottom aligned
                    if (Math.abs(ab - bb) < ALIGN_THRESH) {
                      lines.push({ dir: 'h', pos: ab, from: Math.min(al, bl), to: Math.max(ar, br) });
                    }
                    // Left aligned
                    if (Math.abs(al - bl) < ALIGN_THRESH) {
                      lines.push({ dir: 'v', pos: al, from: Math.min(at2, bt), to: Math.max(ab, bb) });
                    }
                    // Right aligned
                    if (Math.abs(ar - br) < ALIGN_THRESH) {
                      lines.push({ dir: 'v', pos: ar, from: Math.min(at2, bt), to: Math.max(ab, bb) });
                    }
                    // Center X aligned
                    if (Math.abs((al + ar) / 2 - (bl + br) / 2) < ALIGN_THRESH) {
                      lines.push({ dir: 'v', pos: (al + ar) / 2, from: Math.min(at2, bt), to: Math.max(ab, bb) });
                    }
                    // Center Y aligned
                    if (Math.abs((at2 + ab) / 2 - (bt + bb) / 2) < ALIGN_THRESH) {
                      lines.push({ dir: 'h', pos: (at2 + ab) / 2, from: Math.min(al, bl), to: Math.max(ar, br) });
                    }
                  }
                }
                // Deduplicate
                const seen = new Set();
                return lines.filter(l => {
                  const k = `${l.dir}_${Math.round(l.pos * 10)}`;
                  if (seen.has(k)) return false;
                  seen.add(k); return true;
                }).map((l, i) => {
                  if (l.dir === 'h') {
                    return <div key={'pa' + i} style={{ position: 'absolute', left: (l.from / 100) * SPREAD_W, top: (l.pos / 100) * SPREAD_H, width: ((l.to - l.from) / 100) * SPREAD_W, height: 0, borderTop: '1px dashed rgba(16,185,129,0.35)' }} />;
                  }
                  return <div key={'pa' + i} style={{ position: 'absolute', left: (l.pos / 100) * SPREAD_W, top: (l.from / 100) * SPREAD_H, width: 0, height: ((l.to - l.from) / 100) * SPREAD_H, borderLeft: '1px dashed rgba(16,185,129,0.35)' }} />;
                });
              })()}
            </div>
          )}

          {/* Smart guides overlay (active during drag) */}
          <GuidesOverlay guides={activeGuides} spreadW={SPREAD_W} spreadH={SPREAD_H} />

          {/* Frames */}
          {frames.map(frame => (
            <TemplateFrame
              key={frame.id} frame={frame} selected={frame.id === selectedId}
              spreadW={SPREAD_W} spreadH={SPREAD_H} gapPx={gapPx}
              allFrames={frames} minGapPct={minGapPct} spreadRatio={fmt.spreadRatio}
              onSelect={setSelectedId} onUpdate={updateFrame}
              onDelete={deleteFrame} onDragStateChange={setActiveGuides}
            />
          ))}

          {/* Empty state */}
          {frames.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
              <span style={{ fontSize: 36, marginBottom: 8 }}>+</span>
              <span style={{ fontSize: 13 }}>Adaugă frame-uri cu butoanele din dreapta</span>
            </div>
          )}
        </div>

        <div className="text-[10px] text-[#999] mt-2 flex gap-4">
          <span>Drag = mută</span>
          <span>Handle-uri = resize</span>
          <span>Delete/Backspace = șterge</span>
          <span>Cmd+D = duplică</span>
        </div>
      </div>

      {/* ═══ RIGHT: Controls ═══ */}
      <div className="w-[250px] flex flex-col gap-3 flex-shrink-0">
        {/* Name */}
        <div>
          <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Nume template</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Panoramă 3 foto"
            className="w-full px-3 py-2 border border-[#E0D8D0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
        </div>

        {/* Category */}
        <div>
          <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Categorie</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  category === c.id ? 'bg-[#3D6B5E] text-white' : 'bg-[#F0EDE6] text-[#666]'
                }`}>{c.label}</button>
            ))}
          </div>
        </div>

        {/* Add frame presets */}
        <div>
          <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Adaugă frame</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => addFrame('left')} className="py-2 bg-[#3D6B5E] text-white text-[11px] font-semibold rounded-lg hover:bg-[#2d5445] transition">Pagina stânga</button>
            <button onClick={() => addFrame('right')} className="py-2 bg-[#3D6B5E] text-white text-[11px] font-semibold rounded-lg hover:bg-[#2d5445] transition">Pagina dreapta</button>
            <button onClick={() => addFrame('panorama')} className="col-span-2 py-2 bg-[#3D6B5E]/80 text-white text-[11px] font-semibold rounded-lg hover:bg-[#3D6B5E] transition">Panoramă (peste centru)</button>
            <button onClick={() => addFrame('small')} className="col-span-2 py-1.5 bg-[#F0EDE6] text-[#666] text-[11px] font-semibold rounded-lg hover:bg-[#E8E4DB] transition">+ Frame mic</button>
          </div>
        </div>

        {/* Gap */}
        <div>
          <label className="block text-[11px] font-semibold text-[#888] uppercase mb-1">Gap vizual (spațiu)</label>
          <div className="flex items-center gap-2">
            <input type="range" min="0.75" max="5" step="0.25" value={gapMm}
              onChange={(e) => setGapMm(parseFloat(e.target.value))}
              className="flex-1 h-1.5 accent-[#3D6B5E]" />
            <span className="text-[12px] font-semibold text-[#3D6B5E] w-14 text-right">{gapMm} mm</span>
          </div>
          <div className="text-[9px] text-[#B0A89E] mt-1">
            Min 0.75mm · Frame-urile nu se pot suprapune
          </div>
        </div>

        {/* Stats */}
        <div className="text-[12px] text-[#666] bg-[#F8F6F3] rounded-lg px-3 py-2">
          <div>{frames.length} frame-uri = {frames.length} poze</div>
          {panoramaCount > 0 && <div className="text-[#3D6B5E] font-semibold">{panoramaCount} panoramă</div>}
        </div>

        {/* ── Selected frame controls ── */}
        {selectedFrame && (
          <div className="bg-[#F8F6F3] rounded-xl p-3 border border-[#E8E4DB] space-y-3">
            <div className="text-[11px] font-bold text-[#3D6B5E] uppercase">Frame selectat</div>

            {/* Orientation */}
            <div>
              <label className="block text-[10px] text-[#888] mb-1">Orientare</label>
              <div className="flex gap-1">
                {['V', 'H', 'S', 'A'].map(s => (
                  <button key={s} onClick={() => updateFrame(selectedId, { slot: s })}
                    className="px-2.5 py-1 rounded text-[11px] font-bold transition"
                    style={selectedFrame.slot === s ? { background: SLOT_COLORS[s], color: '#fff' } : { background: '#fff', color: SLOT_COLORS[s], border: '1px solid #E0D8D0' }}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="text-[9px] text-[#aaa] mt-0.5">{SLOT_LABELS[selectedFrame.slot]}</div>
            </div>

            {/* Mask */}
            <div>
              <label className="block text-[10px] text-[#888] mb-1">Mască</label>
              <div className="flex flex-wrap gap-1">
                {MASKS.map(m => (
                  <button key={m.id} onClick={() => updateFrame(selectedId, { mask: m.id })}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                      selectedFrame.mask === m.id ? 'bg-[#3D6B5E] text-white' : 'bg-white text-[#666] border border-[#E0D8D0]'
                    }`}>{m.label}</button>
                ))}
              </div>
            </div>

            {/* Position/Size inputs */}
            <div className="grid grid-cols-2 gap-2">
              {[{ key: 'x', label: 'X %' }, { key: 'y', label: 'Y %' }, { key: 'w', label: 'W %' }, { key: 'h', label: 'H %' }].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[9px] text-[#888]">{label}</label>
                  <input type="number" step="0.5" value={Math.round(selectedFrame[key] * 10) / 10}
                    onChange={(e) => updateFrame(selectedId, { [key]: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 border border-[#E0D8D0] rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-[#3D6B5E]/30" />
                </div>
              ))}
            </div>

            {/* Layer + Actions */}
            <div className="flex gap-1.5">
              <button onClick={() => bringForward(selectedId)} className="flex-1 py-1.5 bg-white border border-[#E0D8D0] rounded text-[10px] font-semibold text-[#666] hover:bg-[#F0EDE6]">Față</button>
              <button onClick={() => sendBackward(selectedId)} className="flex-1 py-1.5 bg-white border border-[#E0D8D0] rounded text-[10px] font-semibold text-[#666] hover:bg-[#F0EDE6]">Spate</button>
              <button onClick={() => duplicateFrame(selectedId)} className="flex-1 py-1.5 bg-white border border-[#E0D8D0] rounded text-[10px] font-semibold text-[#666] hover:bg-[#F0EDE6]">Duplică</button>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`px-3 py-2 rounded-lg text-[12px] font-medium ${
            message.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>{message.text}</div>
        )}

        {/* Publish */}
        <div className="flex gap-2 mt-auto">
          <button onClick={handlePublish} disabled={publishing}
            className="flex-1 py-2.5 bg-[#3D6B5E] text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-[#2d5445] transition">
            {publishing ? 'Se salvează...' : (editTemplate ? 'Actualizează' : 'Publică')}
          </button>
          {onCancel && (
            <button onClick={onCancel} className="px-4 py-2.5 bg-[#F0EDE6] text-[#666] text-sm font-semibold rounded-lg hover:bg-[#E8E4DB] transition">Anulează</button>
          )}
        </div>
      </div>
    </div>
  );
}
