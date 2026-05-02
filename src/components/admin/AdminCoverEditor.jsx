import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCoverTemplate, getAllCoverTemplates, saveCoverTemplates, addCoverTemplate, COVER_CATEGORIES } from '../../utils/coverData';
import { getAvailableFonts, addFont } from '../../utils/fontManager';
import { getCoverDimensions } from '../../utils/coverDimensions';
import { storage } from '../../firebase/config';

const FORMATS = ['20×20', '20×30', '23×23', '30×30'];
const BLEED_MM = 15;
const SAFE_MM = 5;

/* ═══ VISUAL CANVAS ═══ */
function CoverCanvas({ template, format, pages, selectedId, onSelect, onMove, onResize, onImageUpload, onTextChange }) {
  const canvasRef = useRef(null);
  const dims = getCoverDimensions(format, pages);
  const totalWmm = dims.totalW * 10;
  const totalHmm = dims.totalH * 10;
  const pageWmm = dims.pageW * 10;
  const spineWmm = dims.spineW * 10;
  const frontStartMm = (dims.pageW + dims.spineW) * 10;

  // Responsive canvas — takes full available width
  const [containerW, setContainerW] = useState(900);
  const wrapRef = useRef(null);
  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setContainerW(Math.floor(w));
    });
    if (wrapRef.current) obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, []);

  const RULER = 22;
  const MAX_H = 380; // max canvas height — everything fits on screen without scroll
  const rawW = Math.max(500, containerW - RULER - 4);
  const rawScale = rawW / totalWmm;
  const rawH = Math.round(totalHmm * rawScale);
  // If too tall, cap height and recalculate width
  const CANVAS_H = Math.min(rawH, MAX_H);
  const scale = CANVAS_H / totalHmm;
  const CANVAS_W = Math.round(totalWmm * scale);

  const imgInputRef = useRef(null);
  const [uploadTargetId, setUploadTargetId] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null); // { id, handle, startX, startY, origX, origY, origW, origH }
  const [rotating, setRotating] = useState(null); // { id, centerX, centerY, startAngle, origRotation }
  const [snapLines, setSnapLines] = useState({ x: null, y: null });

  // 8-point resize handles — bigger for easier grabbing
  const HS = 8;
  const HO = -HS / 2;
  const HANDLES = [
    { key: 'nw', cursor: 'nwse-resize', style: { top: HO, left: HO } },
    { key: 'n',  cursor: 'ns-resize',   style: { top: HO, left: '50%', marginLeft: HO } },
    { key: 'ne', cursor: 'nesw-resize', style: { top: HO, right: HO } },
    { key: 'w',  cursor: 'ew-resize',   style: { top: '50%', left: HO, marginTop: HO } },
    { key: 'e',  cursor: 'ew-resize',   style: { top: '50%', right: HO, marginTop: HO } },
    { key: 'sw', cursor: 'nesw-resize', style: { bottom: HO, left: HO } },
    { key: 's',  cursor: 'ns-resize',   style: { bottom: HO, left: '50%', marginLeft: HO } },
    { key: 'se', cursor: 'nwse-resize', style: { bottom: HO, right: HO } },
  ];

  function renderHandles(id, color, elW, elH) {
    return (
      <>
        {HANDLES.map((h) => (
          <div key={h.key} className="absolute rounded-[2px] z-20"
            style={{ ...h.style, width: HS, height: HS, cursor: h.cursor, background: color, border: '1px solid white' }}
            onMouseDown={(e) => handleMouseDown(e, id, h.key)} />
        ))}
        {/* Rotation handle — circle on the left */}
        <div
          className="absolute z-20 flex items-center justify-center"
          style={{
            left: -28, top: '50%', marginTop: -10,
            width: 20, height: 20, borderRadius: '50%',
            background: color, cursor: 'grab', opacity: 0.85,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            const rect = canvasRef.current.getBoundingClientRect();
            const el = [...(template.frames || []), ...(template.texts || []), ...(template.decorTexts || []), ...(template.decorImages || [])].find(f => f.id === id);
            if (!el) return;
            // Center of element in canvas pixels
            const frontX = RULER + (dims.pageW + dims.spineW) * 10 * scale;
            const cx = frontX + ((el.x + el.w / 2) / 100) * pageWmm * scale;
            const cy = RULER + ((el.y + el.h / 2) / 100) * totalHmm * scale;
            const startAngle = Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) * (180 / Math.PI);
            setRotating({ id, centerX: rect.left + cx, centerY: rect.top + cy, startAngle, origRotation: el.rotation || 0 });
            onSelect(id);
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
        </div>
      </>
    );
  }

  const handleDoubleClick = (e, id) => {
    e.stopPropagation();
    setUploadTargetId(id);
    imgInputRef.current?.click();
  };

  const handleImageSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;
    e.target.value = '';
    if (onImageUpload) onImageUpload(uploadTargetId, file);
    setUploadTargetId(null);
  }; // visible guide lines

  // Snap thresholds and targets (all in % of front cover)
  const SNAP_THRESHOLD = 0.5; // snap within 0.5% (~1.5mm on 300mm page)
  const safeMarginPct = ((BLEED_MM + SAFE_MM) / (dims.pageW * 10)) * 100; // safe zone margin in %
  const safeMarginYPct = ((BLEED_MM + SAFE_MM) / (dims.totalH * 10)) * 100;

  function snapValue(val, elSize, targets) {
    // Check: element left edge, center, right edge against each target
    const edges = [val, val + elSize / 2, val + elSize]; // left/center/right or top/center/bottom
    for (const target of targets) {
      for (let i = 0; i < edges.length; i++) {
        if (Math.abs(edges[i] - target) < SNAP_THRESHOLD) {
          // Snap: adjust val so this edge aligns to target
          return { val: target - (i === 0 ? 0 : i === 1 ? elSize / 2 : elSize), snapped: target };
        }
      }
    }
    return { val, snapped: null };
  }

  function getSnapTargets(axis, excludeId) {
    const targets = [];
    if (axis === 'x') {
      targets.push(50); // center of front cover
      targets.push(safeMarginPct); // left safe margin
      targets.push(100 - safeMarginPct); // right safe margin
      targets.push(0); // left edge
      targets.push(100); // right edge
    } else {
      targets.push(50); // vertical center
      targets.push(safeMarginYPct); // top safe
      targets.push(100 - safeMarginYPct); // bottom safe
      targets.push(0);
      targets.push(100);
    }
    // Add edges of other elements
    const allEls = [...(template.frames || []), ...(template.texts || []), ...(template.decorTexts || []), ...(template.decorImages || [])].filter(e => e.id !== excludeId);
    for (const el of allEls) {
      if (axis === 'x') { targets.push(el.x); targets.push(el.x + el.w); targets.push(el.x + el.w / 2); }
      else { targets.push(el.y); targets.push(el.y + el.h); targets.push(el.y + el.h / 2); }
    }
    return targets;
  }

  const handleMouseDown = (e, id, type) => {
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const el = [...(template.frames || []), ...(template.texts || []), ...(template.decorTexts || []), ...(template.decorImages || [])].find(f => f.id === id);
    if (!el) return;
    onSelect(id);
    if (type === 'move') {
      setDragging({ id, startX: x, startY: y, origX: el.x, origY: el.y, elW: el.w, elH: el.h });
    } else {
      // type = handle direction: 'n','s','e','w','ne','nw','se','sw'
      setResizing({ id, handle: type, startX: x, startY: y, origX: el.x, origY: el.y, origW: el.w, origH: el.h, rotation: el.rotation || 0 });
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (rotating) {
      const angle = Math.atan2(e.clientY - rotating.centerY, e.clientX - rotating.centerX) * (180 / Math.PI);
      let newRot = rotating.origRotation + (angle - rotating.startAngle);
      // Snap to 0, 90, 180, 270 within 5 degrees
      for (const snap of [0, 90, -90, 180, -180, 270, -270]) {
        if (Math.abs(newRot - snap) < 5) { newRot = snap; break; }
      }
      newRot = Math.round(newRot);
      // Update rotation on the element
      if (onTextChange) {
        const el = [...(template.frames || []), ...(template.texts || []), ...(template.decorTexts || []), ...(template.decorImages || [])].find(f => f.id === rotating.id);
        if (el) onTextChange(rotating.id, 'rotation', newRot);
      }
      return;
    }
    if (!dragging && !resizing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (dragging) {
      const dx = (x - dragging.startX) / scale / pageWmm * 100;
      const dy = (y - dragging.startY) / scale / totalHmm * 100;
      // No clamping — allow text/elements to move across entire cover (back, spine, front)
      let rawX = dragging.origX + dx;
      let rawY = dragging.origY + dy;

      // Snap
      const sx = snapValue(rawX, dragging.elW, getSnapTargets('x', dragging.id));
      const sy = snapValue(rawY, dragging.elH, getSnapTargets('y', dragging.id));
      setSnapLines({ x: sx.snapped, y: sy.snapped });
      onMove(dragging.id, sx.val, sy.val);
      return;
    }
    if (resizing) {
      const rawDx = (x - resizing.startX) / scale / pageWmm * 100;
      const rawDy = (y - resizing.startY) / scale / totalHmm * 100;

      // Compensate for element rotation — rotate mouse delta by negative rotation
      const rot = (resizing.rotation || 0) * Math.PI / 180;
      const cosR = Math.cos(-rot), sinR = Math.sin(-rot);
      const dxPct = rawDx * cosR - rawDy * sinR;
      const dyPct = rawDx * sinR + rawDy * cosR;

      const h = resizing.handle;
      let newX = resizing.origX, newY = resizing.origY, newW = resizing.origW, newH = resizing.origH;

      if (h.includes('e')) newW = Math.max(3, resizing.origW + dxPct);
      if (h.includes('w')) { newX = resizing.origX + dxPct; newW = Math.max(3, resizing.origW - dxPct); }
      if (h.includes('s')) newH = Math.max(3, resizing.origH + dyPct);
      if (h.includes('n')) { newY = resizing.origY + dyPct; newH = Math.max(3, resizing.origH - dyPct); }

      onMove(resizing.id, newX, newY);
      onResize(resizing.id, newW, newH);
    }
  }, [dragging, resizing, rotating, scale, pageWmm, totalHmm, onMove, onResize, onTextChange, template]);

  const handleMouseUp = useCallback(() => { setDragging(null); setResizing(null); setRotating(null); setSnapLines({ x: null, y: null }); }, []);
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  const bg = template.coverStyle?.bg || '#D6E4F0';
  // Pick design image based on selected format
  const isPortraitFormat = format === '20×30';
  const designImage = isPortraitFormat
    ? (template.coverStyle?.designPortrait || template.coverStyle?.bgImage)
    : (template.coverStyle?.designSquare || template.coverStyle?.bgImage);
  const bgImage = designImage || template.coverStyle?.bgImage;

  return (
    <div ref={wrapRef} className="w-full">
      <div
        ref={canvasRef}
        className="relative bg-white border border-gray-200 rounded-lg overflow-hidden select-none mx-auto"
        style={{ width: CANVAS_W + RULER, height: CANVAS_H + RULER }}
        onClick={() => onSelect(null)}
      >
        {/* Top ruler — tick every 1mm, small mark every 5mm, label every 10mm */}
        <div className="absolute top-0 bg-gray-50 border-b border-gray-200 overflow-hidden" style={{ left: RULER, right: 0, height: RULER }}>
          {Array.from({ length: Math.ceil(totalWmm) + 1 }, (_, i) => i).map((mm) => {
            const pct = (mm / totalWmm) * 100;
            const is10 = mm % 10 === 0;
            const is5 = mm % 5 === 0;
            return (
              <div key={mm} className="absolute top-0 h-full flex flex-col items-center justify-end" style={{ left: `${pct}%` }}>
                {is10 && <span className="text-[6px] text-gray-400 font-mono leading-none">{mm}</span>}
                <div className={`w-px ${is10 ? 'h-2.5 bg-gray-400' : is5 ? 'h-1.5 bg-gray-300' : 'h-0.5 bg-gray-200'}`} />
              </div>
            );
          })}
        </div>
        {/* Left ruler — tick every 1mm, small mark every 5mm, label every 10mm */}
        <div className="absolute left-0 bg-gray-50 border-r border-gray-200 overflow-hidden" style={{ top: RULER, bottom: 0, width: RULER }}>
          {Array.from({ length: Math.ceil(totalHmm) + 1 }, (_, i) => i).map((mm) => {
            const pct = (mm / totalHmm) * 100;
            const is10 = mm % 10 === 0;
            const is5 = mm % 5 === 0;
            return (
              <div key={mm} className="absolute left-0 w-full flex items-center justify-end" style={{ top: `${pct}%` }}>
                {is10 && <span className="text-[6px] text-gray-400 font-mono leading-none pr-0.5">{mm}</span>}
                <div className={`${is10 ? 'w-2.5 bg-gray-400' : is5 ? 'w-1.5 bg-gray-300' : 'w-0.5 bg-gray-200'}`} style={{ height: 1 }} />
              </div>
            );
          })}
        </div>

        {/* Canvas area */}
        <div className="absolute" style={{ left: RULER, top: RULER, width: CANVAS_W, height: CANVAS_H }}>
          {/* Background */}
          <div className="absolute inset-0" style={{ background: bg }}>
            {bgImage && <img src={bgImage} alt="" style={{ width: '100%', height: '100%', display: 'block' }} />}
          </div>
          {/* Bleed */}
          <div className="absolute border-[1.5px] border-dashed border-red-400/60 pointer-events-none" style={{
            left: BLEED_MM * scale, top: BLEED_MM * scale,
            width: CANVAS_W - BLEED_MM * 2 * scale, height: CANVAS_H - BLEED_MM * 2 * scale,
          }}><span className="absolute -top-0.5 left-1 text-[7px] text-red-400 font-mono">BLEED {BLEED_MM}mm</span></div>
          {/* Safe zone */}
          <div className="absolute border-[1.5px] border-dashed border-green-400/60 pointer-events-none" style={{
            left: (BLEED_MM + SAFE_MM) * scale, top: (BLEED_MM + SAFE_MM) * scale,
            width: CANVAS_W - (BLEED_MM + SAFE_MM) * 2 * scale, height: CANVAS_H - (BLEED_MM + SAFE_MM) * 2 * scale,
          }}><span className="absolute -top-0.5 left-1 text-[7px] text-green-500 font-mono">SAFE ZONE</span></div>
          {/* Cotor */}
          <div className="absolute bg-gray-400/20 pointer-events-none" style={{ left: pageWmm * scale, top: 0, width: spineWmm * scale, height: CANVAS_H }}>
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[7px] text-gray-500 font-mono whitespace-nowrap">COTOR {spineWmm.toFixed(0)}mm</span>
          </div>

          {/* Foto frames */}
          {(template.frames || []).map((f, i) => {
            const sel = selectedId === f.id;
            const fx = frontStartMm * scale + (f.x / 100) * pageWmm * scale;
            const fy = (f.y / 100) * CANVAS_H;
            const fw = (f.w / 100) * pageWmm * scale;
            const fh = (f.h / 100) * CANVAS_H;
            const frot = f.rotation || 0;
            const hasBorder = f.borderWidth > 0;
            const borderPx = hasBorder ? Math.max(2, f.borderWidth * scale * 0.3) : 0;
            return (
              <div key={f.id} className={`absolute cursor-move flex items-center justify-center ${sel ? 'ring-2 ring-blue-500 z-10' : 'hover:ring-1 hover:ring-blue-300'}`}
                style={{ left: fx, top: fy, width: fw, height: fh, background: hasBorder ? (f.borderColor || '#FFFFFF') : (f.previewSrc ? 'transparent' : 'rgba(59,130,246,.12)'), border: hasBorder ? 'none' : '1.5px dashed rgba(59,130,246,.5)', transform: frot ? `rotate(${frot}deg)` : undefined, transformOrigin: 'center center', padding: borderPx }}
                onMouseDown={(e) => handleMouseDown(e, f.id, 'move')} onClick={(e) => { e.stopPropagation(); onSelect(f.id); }}
                onDoubleClick={(e) => handleDoubleClick(e, f.id)}>
                <div className="w-full h-full overflow-hidden relative">
                  {f.previewSrc ? (
                    <img src={f.previewSrc} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: hasBorder ? 'rgba(59,130,246,.12)' : 'transparent' }}>
                      <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        {hasBorder ? `Foto+chenar ${i + 1}` : `Foto ${i + 1}`}
                      </span>
                    </div>
                  )}
                </div>
                {sel && !f.previewSrc && <div className="absolute inset-0 flex items-end justify-center pb-1"><span className="text-[7px] text-blue-400">Dublu-click = incarca poza</span></div>}
                {sel && renderHandles(f.id, '#3B82F6')}
              </div>
            );
          })}
          {/* Text zones */}
          {(template.texts || []).map((t, i) => {
            const sel = selectedId === t.id;
            const tx = frontStartMm * scale + (t.x / 100) * pageWmm * scale;
            const ty = (t.y / 100) * CANVAS_H;
            const tw = (t.w / 100) * pageWmm * scale;
            const th = (t.h / 100) * CANVAS_H;
            const trot = t.rotation || 0;
            return (
              <div key={t.id} className={`absolute cursor-move flex items-center justify-center ${sel ? 'ring-2 ring-purple-500 z-10' : 'hover:ring-1 hover:ring-purple-300'}`}
                style={{ left: tx, top: ty, width: tw, height: th, background: 'rgba(168,85,247,.12)', border: '1.5px dashed rgba(168,85,247,.5)', transform: trot ? `rotate(${trot}deg)` : undefined, transformOrigin: 'center center' }}
                onMouseDown={(e) => { if (editingTextId !== t.id) handleMouseDown(e, t.id, 'move'); }}
                onClick={(e) => { e.stopPropagation(); onSelect(t.id); }}
                onDoubleClick={(e) => { e.stopPropagation(); setEditingTextId(t.id); }}>
                {editingTextId === t.id ? (
                  <input autoFocus value={t.placeholder || ''} className="w-full h-full bg-white/80 text-center text-xs outline-none px-1"
                    onChange={(e) => onTextChange(t.id, 'placeholder', e.target.value)}
                    onBlur={() => setEditingTextId(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setEditingTextId(null); }} />
                ) : (
                  <span className="bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    {t.placeholder || `Text ${i + 1}`}
                  </span>
                )}
                {sel && renderHandles(t.id, '#8B5CF6')}
              </div>
            );
          })}
          {/* Decorative texts (orange — fixed design text visible to client) */}
          {(template.decorTexts || []).map((dt, i) => {
            const sel = selectedId === dt.id;
            const dx = frontStartMm * scale + (dt.x / 100) * pageWmm * scale;
            const dy = (dt.y / 100) * CANVAS_H;
            const dw = (dt.w / 100) * pageWmm * scale;
            const dh = (dt.h / 100) * CANVAS_H;
            const dtrot = dt.rotation || 0;
            return (
              <div key={dt.id} className={`absolute cursor-move flex items-center justify-center ${sel ? 'ring-2 ring-amber-500 z-10' : 'hover:ring-1 hover:ring-amber-300'}`}
                style={{ left: dx, top: dy, width: dw, height: dh, background: 'rgba(245,158,11,.1)', border: '1.5px dashed rgba(245,158,11,.5)', transform: dtrot ? `rotate(${dtrot}deg)` : undefined, transformOrigin: 'center center' }}
                onMouseDown={(e) => { if (editingTextId !== dt.id) handleMouseDown(e, dt.id, 'move'); }}
                onClick={(e) => { e.stopPropagation(); onSelect(dt.id); }}
                onDoubleClick={(e) => { e.stopPropagation(); setEditingTextId(dt.id); }}>
                {editingTextId === dt.id ? (
                  <input autoFocus value={dt.text || ''} className="w-full h-full bg-white/80 text-center text-xs outline-none px-1"
                    onChange={(e) => onTextChange(dt.id, 'text', e.target.value)}
                    onBlur={() => setEditingTextId(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setEditingTextId(null); }} />
                ) : (
                  <span className="bg-amber-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded truncate max-w-full">
                    {dt.text || `Decor ${i + 1}`}
                  </span>
                )}
                {sel && renderHandles(dt.id, '#F59E0B')}
              </div>
            );
          })}
          {/* Decorative images (green — fixed images on cover) */}
          {(template.decorImages || []).map((di, i) => {
            const sel = selectedId === di.id;
            const dx = frontStartMm * scale + (di.x / 100) * pageWmm * scale;
            const dy = (di.y / 100) * CANVAS_H;
            const dw = (di.w / 100) * pageWmm * scale;
            const dh = (di.h / 100) * CANVAS_H;
            const dirot = di.rotation || 0;
            return (
              <div key={di.id} className={`absolute cursor-move flex items-center justify-center overflow-hidden ${sel ? 'ring-2 ring-emerald-500 z-10' : 'hover:ring-1 hover:ring-emerald-300'}`}
                style={{ left: dx, top: dy, width: dw, height: dh, background: di.src ? 'transparent' : 'rgba(16,185,129,.1)', border: '1.5px dashed rgba(16,185,129,.5)', transform: dirot ? `rotate(${dirot}deg)` : undefined, transformOrigin: 'center center' }}
                onMouseDown={(e) => handleMouseDown(e, di.id, 'move')} onClick={(e) => { e.stopPropagation(); onSelect(di.id); }}
                onDoubleClick={(e) => handleDoubleClick(e, di.id)}>
                {di.src ? (
                  <img src={di.src} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">Img {i + 1}</span>
                )}
                {sel && !di.src && <div className="absolute inset-0 flex items-end justify-center pb-1"><span className="text-[7px] text-emerald-400">Dublu-click = incarca poza</span></div>}
                {sel && renderHandles(di.id, '#10B981')}
              </div>
            );
          })}
        </div>
        {/* Snap guide lines (inside the outer wrapper, not canvas area) */}
        {snapLines.x !== null && (
          <div className="absolute pointer-events-none z-20"
            style={{ left: RULER + frontStartMm * scale + (snapLines.x / 100) * pageWmm * scale, top: RULER, width: 1, height: CANVAS_H, background: '#3B82F6', opacity: 0.7 }} />
        )}
        {snapLines.y !== null && (
          <div className="absolute pointer-events-none z-20"
            style={{ left: RULER, top: RULER + (snapLines.y / 100) * CANVAS_H, width: CANVAS_W, height: 1, background: '#3B82F6', opacity: 0.7 }} />
        )}
        {/* Compact legend — inline at bottom of canvas */}
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[7px] text-gray-400 bg-white/80 px-2 py-0.5 rounded">
          <span className="flex items-center gap-0.5"><span className="w-2 h-1 border border-dashed border-blue-400" />Foto</span>
          <span className="flex items-center gap-0.5"><span className="w-2 h-1 border border-dashed border-purple-400" />Text</span>
          <span className="flex items-center gap-0.5"><span className="w-2 h-1 border border-dashed border-amber-400" />Decor</span>
          <span>Del=sterge · Esc=desel · 2x=poza</span>
        </div>
        {/* Hidden file input for image upload */}
        <input ref={imgInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelected} />
      </div>
    </div>
  );
}

/* ── Upload field reusable ── */
function UploadField({ image, onUpload, onRemove, uploading, label, hint, aspect = '3/4' }) {
  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-2 flex items-center gap-3">
      {image ? (
        <div className="relative shrink-0 rounded overflow-hidden bg-[#F5F1EB]" style={{ width: 72, aspectRatio: aspect }}>
          <img src={image} alt="" className="w-full h-full object-cover" />
          <button onClick={onRemove}
            className="absolute top-0 right-0 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">×</button>
        </div>
      ) : (
        <div className="shrink-0 rounded flex items-center justify-center bg-gray-100 text-gray-300 text-xl" style={{ width: 72, aspectRatio: aspect }}>📷</div>
      )}
      <div>
        <label className={`text-xs font-medium hover:underline cursor-pointer ${uploading ? 'text-gray-400' : 'text-blue-600'}`}>
          {uploading ? '⏳ Se încarcă...' : label}
          <input type="file" accept="image/webp,image/jpeg,image/png" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        </label>
        <p className="text-[9px] text-gray-400 mt-0.5">{hint}</p>
      </div>
    </div>
  );
}

/* ═══ MAIN EDITOR — redesigned layout ═══ */
export default function AdminCoverEditor() {
  const { coverId } = useParams();
  const navigate = useNavigate();
  const isNew = coverId === 'new';
  const urlCategory = new URLSearchParams(window.location.search).get('category') || '';
  const bgInputRef = useRef(null);

  const [template, setTemplate] = useState({
    id: '', name: '', desc: '', theme: urlCategory,
    frames: [], texts: [], decorTexts: [], decorImages: [],
    perFormat: {},
    coverStyle: { bg: '#D6E4F0', accent: '#333', bgImage: null },
  });
  const [selectedFormat, setSelectedFormat] = useState('30×30');
  const [selectedId, setSelectedId] = useState(null);
  const [saved, setSaved] = useState(true);
  const [fonts, setFonts] = useState([]);
  const [newFont, setNewFont] = useState('');
  const [uploading, setUploading] = useState(false);
  const pages = 40;

  // ── Per-format element helpers ──
  // Read elements for the currently selected format
  const getEls = useCallback((tpl) => {
    const pf = tpl.perFormat?.[selectedFormat];
    if (pf) return pf;
    // Fallback: old flat structure (backward compat)
    return {
      frames: tpl.frames || [],
      texts: tpl.texts || [],
      decorTexts: tpl.decorTexts || [],
      decorImages: tpl.decorImages || [],
    };
  }, [selectedFormat]);

  // Write elements for the currently selected format
  const setEls = useCallback((updater) => {
    setTemplate((p) => {
      const current = getEls(p);
      const updated = typeof updater === 'function' ? updater(current) : updater;
      const newPerFormat = { ...p.perFormat, [selectedFormat]: { ...current, ...updated } };

      // Sync borderWidth + borderColor across ALL formats for matching frame IDs
      if (updated.frames) {
        for (const frame of updated.frames) {
          for (const fmt of FORMATS) {
            if (fmt === selectedFormat) continue;
            const fmtData = newPerFormat[fmt];
            if (!fmtData?.frames) continue;
            const match = fmtData.frames.find(f => f.id === frame.id);
            if (match) {
              if (frame.borderWidth !== undefined) match.borderWidth = frame.borderWidth;
              if (frame.borderColor !== undefined) match.borderColor = frame.borderColor;
            }
          }
        }
      }

      return { ...p, perFormat: newPerFormat };
    });
    setSaved(false);
  }, [selectedFormat, getEls]);

  // Current format elements (derived)
  const els = getEls(template);

  useEffect(() => {
    // Sync fonts from Firebase then update list
    import('../../utils/fontManager').then(({ syncFontsFromFirestore, getAvailableFonts: getFonts }) => {
      syncFontsFromFirestore().then(() => setFonts(getFonts()));
    }).catch(() => {});
    setFonts(getAvailableFonts());
    if (!isNew) {
      // Only load from cache on FIRST mount — not after save
      const existing = getCoverTemplate(coverId);
      if (existing) {
        setTemplate({ ...existing, perFormat: existing.perFormat || {} });
      } else {
        // Template not found — might not be loaded from Firestore yet, retry once
        setTimeout(() => {
          const retry = getCoverTemplate(coverId);
          if (retry) setTemplate({ ...retry, perFormat: retry.perFormat || {} });
          else navigate('/admin_panel/covers');
        }, 2000);
      }
    }
  }, [coverId]); // Only re-run when coverId changes (URL navigation), NOT on re-renders

  // Clear selection when switching formats
  useEffect(() => { setSelectedId(null); }, [selectedFormat]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedId(null);
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
        setEls((cur) => ({
          frames: cur.frames.filter((f) => f.id !== selectedId),
          texts: cur.texts.filter((t) => t.id !== selectedId),
          decorTexts: cur.decorTexts.filter((d) => d.id !== selectedId),
          decorImages: cur.decorImages.filter((d) => d.id !== selectedId),
        }));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  const update = (key, val) => { setTemplate((p) => ({ ...p, [key]: val })); setSaved(false); };
  const updateStyle = (key, val) => { setTemplate((p) => ({ ...p, coverStyle: { ...p.coverStyle, [key]: val } })); setSaved(false); };

  const moveElement = useCallback((id, x, y) => {
    setEls((cur) => ({
      frames: cur.frames.map((f) => f.id === id ? { ...f, x, y } : f),
      texts: cur.texts.map((t) => t.id === id ? { ...t, x, y } : t),
      decorTexts: cur.decorTexts.map((d) => d.id === id ? { ...d, x, y } : d),
      decorImages: cur.decorImages.map((d) => d.id === id ? { ...d, x, y } : d),
    }));
  }, [setEls]);
  const resizeElement = useCallback((id, w, h) => {
    setEls((cur) => ({
      frames: cur.frames.map((f) => f.id === id ? { ...f, w, h } : f),
      texts: cur.texts.map((t) => t.id === id ? { ...t, w, h } : t),
      decorTexts: cur.decorTexts.map((d) => d.id === id ? { ...d, w, h } : d),
      decorImages: cur.decorImages.map((d) => d.id === id ? { ...d, w, h } : d),
    }));
  }, [setEls]);

  // Handle text change for text zones and decor texts
  const handleTextChange = useCallback((id, field, value) => {
    setEls((cur) => ({
      frames: (cur.frames || []).map((f) => f.id === id ? { ...f, [field]: value } : f),
      texts: cur.texts.map((t) => t.id === id ? { ...t, [field]: value } : t),
      decorTexts: cur.decorTexts.map((d) => d.id === id ? { ...d, [field]: value } : d),
      decorImages: (cur.decorImages || []).map((d) => d.id === id ? { ...d, [field]: value } : d),
    }));
  }, [setEls]);

  // Handle image upload for frames and decor images
  const handleElementImageUpload = async (elementId, file) => {
    if (!file?.type?.startsWith('image/')) return;

    // Upload to Firebase Storage
    let url;
    if (storage) {
      try {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const path = `covers/elements/${template.id || 'new'}/${elementId}_${Date.now()}.jpg`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        url = await getDownloadURL(storageRef);
      } catch (e) {
        console.warn('Upload failed:', e);
      }
    }
    // Fallback: compressed data URL (max 600px to fit in localStorage)
    if (!url) {
      url = await new Promise((resolve) => {
        const img = new Image();
        const objUrl = URL.createObjectURL(file);
        img.onload = () => {
          const MAX = 600;
          const scale = Math.min(MAX / img.width, MAX / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(objUrl);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(null); };
        img.src = objUrl;
      });
    }

    // Update the element with the image (per-format)
    setEls((cur) => ({
      frames: cur.frames.map((f) => f.id === elementId ? { ...f, previewSrc: url } : f),
      decorImages: cur.decorImages.map((d) => d.id === elementId ? { ...d, src: url } : d),
    }));
  };

  // Add element to ALL formats at once (reduces manual work)
  const addToAllFormats = useCallback((key, newEl) => {
    setTemplate((p) => {
      const updated = { ...p, perFormat: { ...p.perFormat } };
      for (const fmt of FORMATS) {
        const pf = updated.perFormat[fmt] || {
          frames: p.frames || [],
          texts: p.texts || [],
          decorTexts: p.decorTexts || [],
          decorImages: p.decorImages || [],
        };
        updated.perFormat[fmt] = { ...pf, [key]: [...(pf[key] || []), { ...newEl }] };
      }
      return updated;
    });
    setSaved(false);
  }, []);

  const addFrame = () => { addToAllFormats('frames', { id: `f${Date.now()}`, x: 10, y: 8, w: 80, h: 55, rotation: 0 }); };
  const addFrameBorder = () => { addToAllFormats('frames', { id: `f${Date.now()}`, x: 10, y: 8, w: 80, h: 55, rotation: 0, borderWidth: 3, borderColor: '#FFFFFF' }); };
  const addText = () => { addToAllFormats('texts', { id: `t${Date.now()}`, x: 10, y: 70, w: 80, h: 10, placeholder: 'Text', fontSize: 14, fontWeight: 'bold', rotation: 0 }); };
  const addDecorText = () => { addToAllFormats('decorTexts', { id: `dt${Date.now()}`, x: 10, y: 70, w: 80, h: 10, text: 'Decor text', fontSize: 16, fontWeight: 'bold', color: '#333', rotation: 0 }); };
  const addDecorImage = () => { addToAllFormats('decorImages', { id: `di${Date.now()}`, x: 10, y: 10, w: 30, h: 30, src: '', rotation: 0 }); };

  const [saveFlash, setSaveFlash] = useState(false);

  const handleSave = async () => {
    if (!template.name.trim()) { alert('Numele este obligatoriu'); return; }
    try {
      // Sync flat fallback fields with first available perFormat entry
      // This ensures client always gets correct data even without perFormat lookup
      const pfMap = template.perFormat || {};
      const pfKeys = Object.keys(pfMap);
      if (pfKeys.length > 0) {
        const firstPf = pfMap[pfKeys[0]];
        template.frames = firstPf.frames || [];
        template.texts = firstPf.texts || [];
        template.decorTexts = firstPf.decorTexts || [];
        template.decorImages = firstPf.decorImages || [];
      }

      if (isNew) {
        const id = template.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const newTemplate = { ...template, id };
        await addCoverTemplate(newTemplate);
        navigate(`/admin_panel/covers/${id}`, { replace: true });
      } else {
        const all = getAllCoverTemplates();
        const idx = all.findIndex((t) => t.id === coverId);
        if (idx !== -1) { all[idx] = template; await saveCoverTemplates(all); }
      }
      setSaved(true);
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 2000);
      console.log('[CoverEditor] Saved successfully:', template.id, '— perFormat:', Object.keys(template.perFormat || {}));
    } catch (e) {
      console.error('[CoverEditor] Save failed:', e);
      alert('Eroare la salvare: ' + e.message + '. Probabil localStorage este plin. Imaginile trebuie uploadate in Firebase Storage.');
    }
  };

  const handleBgUpload = async (file) => {
    if (!file?.type?.startsWith('image/')) return;
    setUploading(true);

    // Upload to Firebase Storage for high quality export
    if (storage) {
      try {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const path = `covers/backgrounds/${template.id || 'new'}_${Date.now()}.jpg`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        updateStyle('bgImage', url);
        updateStyle('bgImagePath', path);
        setUploading(false);
        return;
      } catch (e) { console.warn('Firebase upload failed:', e); }
    }
    // Fallback: data URL
    const reader = new FileReader();
    reader.onload = () => { updateStyle('bgImage', reader.result); setUploading(false); };
    reader.readAsDataURL(file);
  };

  // ═══ EXPORT COVER AS PNG — real print dimensions (300 DPI) ═══
  const [exporting, setExporting] = useState(false);
  const handleExportCover = async () => {
    setExporting(true);
    try {
      const DPI = 300;
      const coverDims = getCoverDimensions(selectedFormat, pages);
      // Front cover only — real dimensions in pixels at 300 DPI
      const pxW = Math.round((coverDims.pageW * 10 / 25.4) * DPI); // mm → inches → px
      const pxH = Math.round((coverDims.totalH * 10 / 25.4) * DPI);
      const pageWmm2 = coverDims.pageW * 10;
      const totalHmm2 = coverDims.totalH * 10;

      const canvas = document.createElement('canvas');
      canvas.width = pxW;
      canvas.height = pxH;
      const ctx = canvas.getContext('2d');

      // 1. Fill background color
      ctx.fillStyle = template.coverStyle?.bg || '#E8E4D8';
      ctx.fillRect(0, 0, pxW, pxH);

      // 2. Draw background image (front cover portion — right half of spread)
      const bgImg = template.coverStyle?.bgImage;
      if (bgImg) {
        await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // bgImage is full spread — draw only the right half (front cover)
            const totalW = coverDims.totalW * 10; // mm
            const frontStart = (coverDims.pageW + coverDims.spineW) * 10; // mm
            const srcX = (frontStart / totalW) * img.width;
            const srcW = (pageWmm2 / totalW) * img.width;
            ctx.drawImage(img, srcX, 0, srcW, img.height, 0, 0, pxW, pxH);
            resolve();
          };
          img.onerror = resolve;
          img.src = bgImg;
        });
      }

      // 3. Draw decor images
      for (const di of els.decorImages) {
        if (!di.src) continue;
        await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const dx = (di.x / 100) * pxW;
            const dy = (di.y / 100) * pxH;
            const dw = (di.w / 100) * pxW;
            const dh = (di.h / 100) * pxH;
            ctx.save();
            if (di.rotation) {
              ctx.translate(dx + dw / 2, dy + dh / 2);
              ctx.rotate((di.rotation * Math.PI) / 180);
              ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
            } else {
              ctx.drawImage(img, dx, dy, dw, dh);
            }
            ctx.restore();
            resolve();
          };
          img.onerror = resolve;
          img.src = di.src;
        });
      }

      // 4. Draw photo frames (placeholder gray)
      for (const f of els.frames) {
        const fx = (f.x / 100) * pxW;
        const fy = (f.y / 100) * pxH;
        const fw = (f.w / 100) * pxW;
        const fh = (f.h / 100) * pxH;
        ctx.save();
        if (f.rotation) {
          ctx.translate(fx + fw / 2, fy + fh / 2);
          ctx.rotate((f.rotation * Math.PI) / 180);
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
          ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
          ctx.fillRect(fx, fy, fw, fh);
        }
        ctx.restore();
      }

      // 5. Draw decor texts
      for (const dt of els.decorTexts) {
        const dx = (dt.x / 100) * pxW;
        const dy = (dt.y / 100) * pxH;
        const dw = (dt.w / 100) * pxW;
        const dh = (dt.h / 100) * pxH;
        const fontSize = Math.round((dt.fontSize || 14) * (pxW / 400));
        ctx.save();
        ctx.translate(dx + dw / 2, dy + dh / 2);
        if (dt.rotation) ctx.rotate((dt.rotation * Math.PI) / 180);
        ctx.font = `${dt.fontWeight || 'normal'} ${fontSize}px ${dt.fontFamily || '"DM Serif Display", serif'}`;
        ctx.fillStyle = dt.color || '#2C2520';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dt.text || '', 0, 0);
        ctx.restore();
      }

      // 6. Draw text zone placeholders
      for (const t of els.texts) {
        const tx = (t.x / 100) * pxW;
        const ty = (t.y / 100) * pxH;
        const tw = (t.w / 100) * pxW;
        const th = (t.h / 100) * pxH;
        const fontSize = Math.round((t.fontSize || 14) * (pxW / 400));
        ctx.save();
        ctx.translate(tx + tw / 2, ty + th / 2);
        if (t.rotation) ctx.rotate((t.rotation * Math.PI) / 180);
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(-tw / 2, -th / 2, tw, th);
        ctx.font = `${t.fontWeight || 'bold'} ${fontSize}px sans-serif`;
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.placeholder || 'Text', 0, 0);
        ctx.restore();
      }

      // Download
      const link = document.createElement('a');
      link.download = `${template.name || 'cover'}_${selectedFormat}_${pxW}x${pxH}_300dpi.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      console.log(`[Export] Cover exported: ${pxW}x${pxH}px (${pageWmm2}x${totalHmm2}mm @ 300 DPI)`);
    } catch (e) {
      console.error('[Export] Failed:', e);
      alert('Eroare la export: ' + e.message);
    }
    setExporting(false);
  };

  // ═══ PSD IMPORT ═══
  const [psdLoading, setPsdLoading] = useState(false);
  const handlePSDImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPsdLoading(true);
    try {
      const { parsePSD } = await import('../../utils/psdParser');
      const coverDimsForPsd = getCoverDimensions(selectedFormat, pages);
      const result = await parsePSD(file, selectedFormat, coverDimsForPsd.spineW);
      console.log('[PSD Import]', result.width, '×', result.height, '—', result.frames.length, 'foto', result.texts.length, 'text');
      console.log('[PSD] Frames:', JSON.stringify(result.frames, null, 2));
      console.log('[PSD] Texts:', JSON.stringify(result.texts, null, 2));

      // Upload composite bg to Firebase Storage
      let bgUrl = result.bgDataUrl;
      if (bgUrl && storage) {
        try {
          const { ref, uploadString, getDownloadURL } = await import('firebase/storage');
          const path = `covers/backgrounds/${template.id || 'psd'}_${Date.now()}.jpg`;
          const storageRef = ref(storage, path);
          await uploadString(storageRef, bgUrl, 'data_url');
          bgUrl = await getDownloadURL(storageRef);
        } catch (err) { console.warn('BG upload failed, using dataURL:', err); }
      }

      // Update template — bg covers full spread, foto/text are on front cover
      setTemplate((p) => ({
        ...p,
        coverStyle: { ...p.coverStyle, bgImage: bgUrl, bg: p.coverStyle?.bg || '#FFFFFF' },
        perFormat: {
          ...p.perFormat,
          [selectedFormat]: {
            frames: result.frames,
            texts: result.texts,
            decorTexts: [],
            decorImages: [],
          },
        },
      }));
      setSaved(false);
      alert(`PSD importat!\n\nComposite → background (tot spread-ul)\n${result.frames.length} zone foto (front cover)\n${result.texts.length} zone text (front cover)\n\nVerifică pozițiile și salvează.`);
    } catch (err) {
      console.error('[PSD Import] Failed:', err);
      alert('Eroare la import PSD: ' + err.message);
    }
    setPsdLoading(false);
  };

  const handleAddFont = async () => {
    if (!newFont.trim()) return;
    await addFont(newFont.trim());
    setFonts(getAvailableFonts());
    setNewFont('');
  };

  const dims = getCoverDimensions(selectedFormat, pages);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin_panel/covers')} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-lg font-bold">{isNew ? 'Template nou' : template.name}</h2>
        </div>
        <div className="flex items-center gap-3">
          {!saved && <span className="text-xs text-amber-600 font-medium">Nesalvat</span>}
          {saveFlash && <span className="text-xs text-green-600 font-medium flex items-center gap-1">✓ Salvat!</span>}
          <label className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${
            psdLoading ? 'bg-gray-100 text-gray-400' : 'border border-purple-200 text-purple-600 hover:bg-purple-50'
          }`}>
            {psdLoading ? '⏳ Import PSD...' : '📂 Import PSD'}
            <input type="file" accept=".psd" className="hidden" disabled={psdLoading} onChange={handlePSDImport} />
          </label>
          <button onClick={handleSave} className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
            saveFlash ? 'bg-green-600 text-white' :
            saved && !isNew ? 'bg-gray-100 text-gray-400' : 'bg-[#3D6B5E] text-white hover:bg-[#2d5445]'
          }`}>
            {saveFlash ? '✓ Salvat' : isNew ? 'Creeaza' : 'Salveaza'}
          </button>
        </div>
      </div>

      {/* ═══ TOP TOOLBAR — format + elemente + butoane (acces rapid) ═══ */}
      <div className="flex items-start gap-4 mb-3">
        {/* Formate */}
        <div className="flex items-center gap-1.5">
          {FORMATS.map((fmt) => (
            <button key={fmt} onClick={() => setSelectedFormat(fmt)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${selectedFormat === fmt ? 'bg-[#3D6B5E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {fmt}
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-gray-200" />

        {/* Elemente lista — per format */}
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {els.frames.map((f, i) => (
            <button key={f.id} onClick={() => setSelectedId(f.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition ${selectedId === f.id ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'bg-gray-50 text-gray-600 hover:bg-blue-50'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Foto {i + 1}
              <span className="text-[9px] text-gray-400 font-mono">{((f.w / 100) * dims.pageW * 10).toFixed(0)}×{((f.h / 100) * dims.totalH * 10).toFixed(0)}</span>
            </button>
          ))}
          {els.texts.map((t, i) => (
            <button key={t.id} onClick={() => setSelectedId(t.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition ${selectedId === t.id ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300' : 'bg-gray-50 text-gray-600 hover:bg-purple-50'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Text {i + 1}
            </button>
          ))}
          {els.decorTexts.map((dt, i) => (
            <button key={dt.id} onClick={() => setSelectedId(dt.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition ${selectedId === dt.id ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' : 'bg-gray-50 text-gray-600 hover:bg-amber-50'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="truncate max-w-[80px]">{dt.text || `Decor ${i + 1}`}</span>
            </button>
          ))}
          {els.decorImages.map((di, i) => (
            <button key={di.id} onClick={() => setSelectedId(di.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition ${selectedId === di.id ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300' : 'bg-gray-50 text-gray-600 hover:bg-emerald-50'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Img {i + 1}
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-gray-200" />

        {/* Add buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={addFrame} className="px-2.5 py-1.5 text-[10px] font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">+ Foto</button>
          <button onClick={addFrameBorder} className="px-2.5 py-1.5 text-[10px] font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 ring-1 ring-blue-200">+ Foto chenar</button>
          <button onClick={addText} className="px-2.5 py-1.5 text-[10px] font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100">+ Text</button>
          <button onClick={addDecorText} className="px-2.5 py-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100">+ Decor text</button>
          <button onClick={addDecorImage} className="px-2.5 py-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100">+ Decor img</button>
        </div>
      </div>

      {/* ═══ CANVAS ═══ */}
      <CoverCanvas
        template={{ ...template, frames: els.frames, texts: els.texts, decorTexts: els.decorTexts, decorImages: els.decorImages }}
        format={selectedFormat} pages={pages}
        selectedId={selectedId} onSelect={setSelectedId}
        onMove={moveElement} onResize={resizeElement}
        onImageUpload={handleElementImageUpload}
        onTextChange={handleTextChange}
      />

      {/* ═══ PRECISE POSITIONING — mm inputs for selected element ═══ */}
      {selectedId && (() => {
        const allEls = [...els.frames, ...els.texts, ...els.decorTexts, ...els.decorImages];
        const el = allEls.find((e) => e.id === selectedId);
        if (!el) return null;

        // Convert % → mm (relative to front cover page)
        const pageWmm = dims.pageW * 10;
        const pageHmm = dims.totalH * 10;
        const xMm = (el.x / 100) * pageWmm;
        const yMm = (el.y / 100) * pageHmm;
        const wMm = (el.w / 100) * pageWmm;
        const hMm = (el.h / 100) * pageHmm;

        const setMm = (field, mmVal) => {
          const pct = field === 'x' || field === 'w'
            ? (mmVal / pageWmm) * 100
            : (mmVal / pageHmm) * 100;
          if (field === 'x' || field === 'y') {
            moveElement(selectedId,
              field === 'x' ? pct : el.x,
              field === 'y' ? pct : el.y,
            );
          } else {
            resizeElement(selectedId,
              field === 'w' ? pct : el.w,
              field === 'h' ? pct : el.h,
            );
          }
        };

        const isFrame = !!els.frames.find(f => f.id === selectedId);
        const elType = isFrame ? (el.borderWidth > 0 ? 'Foto+B' : 'Foto')
          : els.texts.find(t => t.id === selectedId) ? 'Text'
          : els.decorTexts.find(d => d.id === selectedId) ? 'Decor'
          : 'Img';

        return (
          <div className="flex items-center gap-4 mt-2 mb-1 px-2 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-[11px] font-bold text-gray-500 w-12">{elType}</span>
            {[
              { label: 'X', val: xMm, field: 'x' },
              { label: 'Y', val: yMm, field: 'y' },
              { label: 'W', val: wMm, field: 'w' },
              { label: 'H', val: hMm, field: 'h' },
            ].map(({ label, val, field }) => (
              <div key={field} className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 font-mono w-3">{label}</span>
                <input
                  type="number"
                  step="0.5"
                  value={Math.round(val * 10) / 10}
                  onChange={(e) => setMm(field, parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-1 text-xs font-mono text-center border border-gray-200 rounded outline-none focus:ring-1 focus:ring-blue-300"
                />
                <span className="text-[9px] text-gray-300">mm</span>
              </div>
            ))}
            {/* Rotation */}
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[10px] text-gray-400 font-mono">↻</span>
              <input
                type="number"
                step="1"
                value={el.rotation || 0}
                onChange={(e) => {
                  const rot = parseFloat(e.target.value) || 0;
                  setEls((cur) => ({
                    frames: cur.frames.map(f => f.id === selectedId ? { ...f, rotation: rot } : f),
                    texts: cur.texts.map(t => t.id === selectedId ? { ...t, rotation: rot } : t),
                    decorTexts: cur.decorTexts.map(d => d.id === selectedId ? { ...d, rotation: rot } : d),
                    decorImages: cur.decorImages.map(d => d.id === selectedId ? { ...d, rotation: rot } : d),
                  }));
                }}
                className="w-14 px-1.5 py-1 text-xs font-mono text-center border border-gray-200 rounded outline-none focus:ring-1 focus:ring-blue-300"
              />
              <span className="text-[9px] text-gray-300">°</span>
              {/* Quick rotation buttons */}
              <div className="flex gap-0.5 ml-1">
                {[0, 90, -90, 180].map(deg => (
                  <button key={deg} onClick={() => {
                    setEls((cur) => ({
                      frames: cur.frames.map(f => f.id === selectedId ? { ...f, rotation: deg } : f),
                      texts: cur.texts.map(t => t.id === selectedId ? { ...t, rotation: deg } : t),
                      decorTexts: cur.decorTexts.map(d => d.id === selectedId ? { ...d, rotation: deg } : d),
                      decorImages: cur.decorImages.map(d => d.id === selectedId ? { ...d, rotation: deg } : d),
                    }));
                  }}
                    className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition ${
                      (el.rotation || 0) === deg ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {deg}°
                  </button>
                ))}
              </div>
            </div>
            {/* Border controls for frames */}
            {isFrame && (
              <>
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400 font-mono">Chenar</span>
                  <input
                    type="number" step="0.5" min="0" max="20"
                    value={el.borderWidth || 0}
                    onChange={(e) => {
                      const bw = parseFloat(e.target.value) || 0;
                      setEls((cur) => ({
                        ...cur,
                        frames: cur.frames.map(f => f.id === selectedId ? { ...f, borderWidth: bw } : f),
                      }));
                    }}
                    className="w-12 px-1 py-1 text-xs font-mono text-center border border-gray-200 rounded outline-none focus:ring-1 focus:ring-blue-300"
                  />
                  <span className="text-[9px] text-gray-300">mm</span>
                  {(el.borderWidth || 0) > 0 && (
                    <input
                      type="color"
                      value={el.borderColor || '#FFFFFF'}
                      onChange={(e) => {
                        setEls((cur) => ({
                          ...cur,
                          frames: cur.frames.map(f => f.id === selectedId ? { ...f, borderColor: e.target.value } : f),
                        }));
                      }}
                      className="w-6 h-6 rounded border border-gray-200 cursor-pointer"
                      title="Culoare chenar"
                    />
                  )}
                </div>
              </>
            )}
            <span className="text-[9px] text-gray-300 ml-2">
              Pagină: {pageWmm.toFixed(0)}×{pageHmm.toFixed(0)}mm
            </span>
          </div>
        );
      })()}

      {/* ═══ BOTTOM CONTROLS — setari (mai rar folosite) ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">

        {/* Col 1: Info + Categorie */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <input value={template.name} onChange={(e) => update('name', e.target.value)} placeholder="Numele templateului"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]/30" />
          <input value={template.desc} onChange={(e) => update('desc', e.target.value)} placeholder="Scurta descriere"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#3D6B5E]/30" />
          <div>
            <span className="text-[10px] text-gray-500 font-medium uppercase">Categorie</span>
            <select value={template.theme || ''} onChange={(e) => update('theme', e.target.value)}
              className="w-full mt-0.5 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none">
              <option value="">— fara —</option>
              {COVER_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}
            </select>
          </div>

          {/* Tip hârtie */}
          <div>
            <span className="text-[10px] text-gray-500 font-medium uppercase">Tip hârtie</span>
            <div className="flex flex-col gap-1.5 mt-1">
              {[
                { value: 'pagini-groase', label: 'Pagini groase' },
                { value: 'pagini-subtiri', label: 'Pagini subțiri' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                    checked={(template.pageTypes || []).includes(opt.value)}
                    onChange={(e) => {
                      const current = template.pageTypes || [];
                      const next = e.target.checked
                        ? [...current, opt.value]
                        : current.filter(v => v !== opt.value);
                      update('pageTypes', next);
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#3D6B5E] focus:ring-[#3D6B5E]" />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
            {(!template.pageTypes || template.pageTypes.length === 0) && (
              <p className="text-[9px] text-amber-500 mt-1">Nebifat = disponibil pentru toate tipurile</p>
            )}
          </div>

          {/* Formate disponibile */}
          <div>
            <span className="text-[10px] text-gray-500 font-medium uppercase">Formate disponibile</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {FORMATS.map(fmt => (
                <label key={fmt} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox"
                    checked={(template.formats || []).includes(fmt)}
                    onChange={(e) => {
                      const current = template.formats || [];
                      const next = e.target.checked
                        ? [...current, fmt]
                        : current.filter(v => v !== fmt);
                      update('formats', next);
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#3D6B5E] focus:ring-[#3D6B5E]" />
                  <span className="text-sm text-gray-700">{fmt}</span>
                </label>
              ))}
            </div>
            {(!template.formats || template.formats.length === 0) && (
              <p className="text-[9px] text-amber-500 mt-1">Nebifat = disponibil pentru toate formatele</p>
            )}
          </div>

        </div>

        {/* Col 2: Mockup + Design-uri per format */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">

          {/* ── MOCKUP — ce vede clientul pe site ── */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 mb-1">📷 MOCKUP (colecție)</h4>
            <p className="text-[9px] text-gray-400 mb-2">Album 3D din Photoshop — ce vede clientul pe site</p>
            <UploadField
              image={template.coverStyle?.mockupImage || template.coverStyle?.previewImage}
              onUpload={async (file) => {
                if (!storage) return;
                setUploading(true);
                try {
                  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                  const tid = template.id || coverId || 'new';
                  const path = `covers/mockups/${tid}_mockup_${Date.now()}.${file.name.split('.').pop() || 'webp'}`;
                  await uploadBytes(ref(storage, path), file);
                  const url = await getDownloadURL(ref(storage, path));
                  updateStyle('mockupImage', url);
                  updateStyle('previewImage', url); // backward compat
                } catch (err) { alert('Eroare: ' + err.message); }
                finally { setUploading(false); }
              }}
              onRemove={() => { updateStyle('mockupImage', null); updateStyle('previewImage', null); }}
              uploading={uploading}
              label="Încarcă mockup"
              hint="WebP/PNG din Photoshop, ~800×1000px"
              aspect="3/4"
            />
          </div>

          {/* ── DESIGN PĂTRAT — 20×20, 23×23, 30×30 ── */}
          <div className="border-t border-gray-100 pt-3">
            <h4 className="text-xs font-bold text-gray-700 mb-1">🎨 DESIGN PĂTRAT</h4>
            <p className="text-[9px] text-gray-400 mb-2">Pentru formate: 20×20, 23×23, 30×30</p>
            <UploadField
              image={template.coverStyle?.designSquare}
              onUpload={async (file) => {
                if (!storage) return;
                setUploading(true);
                try {
                  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                  const path = `covers/designs/${template.id || 'new'}_square.${file.name.split('.').pop() || 'jpg'}`;
                  await uploadBytes(ref(storage, path), file);
                  const url = await getDownloadURL(ref(storage, path));
                  updateStyle('designSquare', url);
                } catch (err) { alert('Eroare: ' + err.message); }
                finally { setUploading(false); }
              }}
              onRemove={() => updateStyle('designSquare', null)}
              uploading={uploading}
              label="Încarcă design pătrat"
              hint="JPG calitate înaltă, proporție 1:1"
              aspect="1/1"
            />
          </div>

          {/* ── DESIGN PORTRET — 20×30 ── */}
          <div className="border-t border-gray-100 pt-3">
            <h4 className="text-xs font-bold text-gray-700 mb-1">🎨 DESIGN PORTRET</h4>
            <p className="text-[9px] text-gray-400 mb-2">Pentru format: 20×30</p>
            <UploadField
              image={template.coverStyle?.designPortrait}
              onUpload={async (file) => {
                if (!storage) return;
                setUploading(true);
                try {
                  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                  const path = `covers/designs/${template.id || 'new'}_portrait.${file.name.split('.').pop() || 'jpg'}`;
                  await uploadBytes(ref(storage, path), file);
                  const url = await getDownloadURL(ref(storage, path));
                  updateStyle('designPortrait', url);
                } catch (err) { alert('Eroare: ' + err.message); }
                finally { setUploading(false); }
              }}
              onRemove={() => updateStyle('designPortrait', null)}
              uploading={uploading}
              label="Încarcă design portret"
              hint="JPG calitate înaltă, proporție 2:3"
              aspect="2/3"
            />
          </div>

          {/* Culoare fundal fallback */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center gap-3">
              <input type="color" value={template.coverStyle?.bg || '#F5F0E8'} onChange={(e) => updateStyle('bg', e.target.value)}
                className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
              <div>
                <span className="text-[10px] text-gray-400">Culoare fundal (fallback dacă nu e design)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 3: Fonturi */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h4 className="text-xs font-bold text-gray-700">Fonturi ({fonts.length})</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {fonts.map((f) => (
              <div key={f} className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded group">
                <span className="text-xs text-gray-600" style={{ fontFamily: f }}>{f}</span>
                <button
                  onClick={async () => {
                    if (!confirm(`Ștergi fontul "${f}"?`)) return;
                    const { removeFont } = await import('../../utils/fontManager');
                    await removeFont(f);
                    setFonts(getAvailableFonts());
                  }}
                  className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity px-1"
                >×</button>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <input value={newFont} onChange={(e) => setNewFont(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddFont()}
              placeholder="Nume font Google (ex: Roboto)" className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none" />
            <button onClick={handleAddFont} className="px-3 py-1.5 text-xs font-medium text-[#3D6B5E] bg-green-50 rounded-lg hover:bg-green-100">+</button>
          </div>
          <div className="border-t border-gray-100 pt-2">
            <label className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition">
              📁 Încarcă font (.ttf, .otf, .woff2)
              <input type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = '';
                const { uploadFontFile } = await import('../../utils/fontManager');
                const name = await uploadFontFile(file);
                if (name) {
                  setFonts(getAvailableFonts());
                  alert(`Font "${name}" încărcat!`);
                } else {
                  alert('Eroare la upload font');
                }
              }} />
            </label>
          </div>
          <p className="text-[9px] text-gray-400">Google Fonts: scrie numele. Local: încarcă fișierul TTF/OTF.</p>
        </div>
      </div>
    </div>
  );
}
