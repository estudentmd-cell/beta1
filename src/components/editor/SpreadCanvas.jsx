// src/components/editor/SpreadCanvas.jsx
import { useMemo, useState, useEffect, memo } from 'react';
import { computeRects, computeSeps, proTemplateToRects } from '../../utils/layoutEngine';
import { getDimensions } from '../../utils/dimensions';
import { getCoverDimensions } from '../../utils/coverDimensions';

/* ── Shimmer placeholder for loading frames ── */
function FrameShimmer() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#F5F1EB] to-[#E8E4DB] relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)' }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-white/40 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0A89E" strokeWidth="1.5">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ── Frame image with shimmer-to-fade transition ── */
function FrameImage({ src, crop }) {
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);

  useEffect(() => {
    if (!src) return;
    if (src === currentSrc) return;
    setLoaded(false);
    const img = new Image();
    img.onload = async () => {
      try { await img.decode(); } catch {}
      setCurrentSrc(src);
      requestAnimationFrame(() => setLoaded(true));
    };
    img.onerror = () => { setCurrentSrc(src); setLoaded(true); };
    img.src = src;
  }, [src, currentSrc]);

  return (
    <div className="w-full h-full relative">
      {!loaded && <FrameShimmer />}
      {currentSrc && (
        <img src={currentSrc} alt=""
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          decoding="async"
          style={{
            objectPosition: `${crop?.opx || 50}% ${crop?.opy || 50}%`,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.4s ease-out',
          }}
          draggable={false} />
      )}
    </div>
  );
}

/* ── Camera icon for empty frames ── */
function CameraIcon({ size = 24 }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#B0AAA2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      <span className="text-[8px] text-[#B0AAA2] font-bold">+</span>
    </div>
  );
}

/* ── Single frame cell — render + pan crop interaction ── */
function FrameCell({ rect, isSelected, isSwapSource, isPanning, onFrameClick, onFrameDrop, onFrameDragOver, onFrameDragLeave, onEmptyFrameTap, renderFrameOverlay, onCropUpdate, onPanEnd }) {
  const [dragOver, setDragOver] = useState(false);
  const leaf = rect.leaf;
  const photo = leaf.photo;
  const crop = leaf.cropOffset || { opx: 50, opy: 50 };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const photoId = e.dataTransfer?.getData('text/plain');
    if (photoId && onFrameDrop) onFrameDrop(leaf.id, photoId);
  };

  // Pan crop — mouse
  const handleMouseDown = (e) => {
    if (!isPanning || !photo) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startOpx = crop.opx, startOpy = crop.opy;
    const sens = Math.max(rect.w, rect.h) * 0.5;
    const onMove = (ev) => {
      if (onCropUpdate) onCropUpdate(leaf.id, startOpx - ((ev.clientX - startX) / sens) * 100, startOpy - ((ev.clientY - startY) / sens) * 100);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (onPanEnd) onPanEnd();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Pan crop — touch
  const handleTouchStart = (e) => {
    if (!isPanning || !photo) return;
    e.stopPropagation();
    const t = e.touches[0];
    const startX = t.clientX, startY = t.clientY;
    const startOpx = crop.opx, startOpy = crop.opy;
    const sens = Math.max(rect.w, rect.h) * 0.5;
    const onMove = (ev) => {
      ev.preventDefault();
      const ct = ev.touches[0];
      if (onCropUpdate) onCropUpdate(leaf.id, startOpx - ((ct.clientX - startX) / sens) * 100, startOpy - ((ct.clientY - startY) / sens) * 100);
    };
    const onEnd = () => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      if (onPanEnd) onPanEnd();
    };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  const maskStyle = leaf._proMask === 'circle' ? { clipPath: 'ellipse(50% 50% at 50% 50%)' } :
    leaf._proMask === 'rounded' ? { clipPath: 'inset(0 round 6%)' } :
    leaf._proMask === 'arch' ? { clipPath: 'inset(0 0 0 0 round 50% 50% 0 0)' } :
    leaf._proMask === 'diamond' ? { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' } :
    leaf._proMask === 'hexagon' ? { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' } : {};

  return (
    <div
      data-leaf-id={leaf.id}
      className={`absolute transition-shadow ${isSelected && photo && !isPanning ? 'overflow-visible z-10' : 'overflow-hidden'} ${isPanning ? 'ring-2 ring-blue-500 cursor-grab z-10' : 'cursor-pointer'}`}
      style={{
        left: rect.x, top: rect.y, width: Math.max(rect.w, 0), height: Math.max(rect.h, 0), borderRadius: 1,
        ...maskStyle,
      }}
      onClick={(e) => { e.stopPropagation(); if (photo && onFrameClick) onFrameClick(leaf.id); }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); if (onFrameDragOver) onFrameDragOver(leaf.id, e); }}
      onDragLeave={() => { setDragOver(false); if (onFrameDragLeave) onFrameDragLeave(leaf.id); }}
      onDrop={handleDrop}
    >
      {photo ? (
        photo.previewUrl ? (
          <FrameImage src={photo.previewUrl} crop={crop} />
        ) : (
          <FrameShimmer />
        )
      ) : (
        <div className={`w-full h-full flex items-center justify-center cursor-pointer ${dragOver ? 'bg-cyan-100' : 'bg-[#E8E4DB]'}`}
          onClick={(e) => { e.stopPropagation(); if (onEmptyFrameTap) onEmptyFrameTap(leaf.id); }}>
          {dragOver ? <span className="text-3xl text-[#3D6B5A]">⬇</span> : <CameraIcon size={Math.min(rect.w, rect.h) > 80 ? 24 : 16} />}
        </div>
      )}
      {/* Selected frame highlight */}
      {isSelected && photo && !isPanning && (
        <div className="absolute inset-0 ring-2 ring-[#3D6B5E] ring-inset pointer-events-none rounded-sm" />
      )}
      {/* Swap source highlight */}
      {isSwapSource && (
        <div className="absolute inset-0 ring-2 ring-yellow-400 ring-inset pointer-events-none rounded-sm bg-yellow-400/10" />
      )}
      {/* Shell-injected overlay (desktop: Mută/Schimbă/Scoate) */}
      {isSelected && photo && !isPanning && renderFrameOverlay && renderFrameOverlay(leaf.id, rect)}
    </div>
  );
}

/* ── Separator — draggable divider between frames ── */
function FrameSeparator({ sep, onSeparatorDrag, onSeparatorDragStart }) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const isCol = sep.dir === 'col';

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    if (onSeparatorDragStart) onSeparatorDragStart();
    const startPos = isCol ? e.clientX : e.clientY;
    const startRatio = sep.node.ratio;
    const parentSize = isCol ? sep.parentW : sep.parentH;
    let rafId = null;
    const onMove = (ev) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const delta = (isCol ? ev.clientX : ev.clientY) - startPos;
        const newRatio = startRatio + delta / parentSize;
        if (onSeparatorDrag) onSeparatorDrag(sep.node, newRatio);
      });
    };
    const onUp = () => {
      setDragging(false);
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Touch support
  const handleTouchStart = (e) => {
    e.stopPropagation();
    setDragging(true);
    const t = e.touches[0];
    const startPos = isCol ? t.clientX : t.clientY;
    const startRatio = sep.node.ratio;
    const parentSize = isCol ? sep.parentW : sep.parentH;
    const onMove = (ev) => {
      ev.preventDefault();
      const ct = ev.touches[0];
      const delta = (isCol ? ct.clientX : ct.clientY) - startPos;
      if (onSeparatorDrag) onSeparatorDrag(sep.node, startRatio + delta / parentSize);
    };
    const onEnd = () => {
      setDragging(false);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  const active = hovered || dragging;
  return (
    <div
      style={{
        position: 'absolute', left: sep.x, top: sep.y, width: sep.w, height: sep.h,
        cursor: isCol ? 'col-resize' : 'row-resize', zIndex: 8, touchAction: 'none',
      }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}
    >
      <div style={{
        position: 'absolute',
        ...(isCol ? { top: 0, bottom: 0, left: '50%', width: 2, marginLeft: -1 } : { left: 0, right: 0, top: '50%', height: 2, marginTop: -1 }),
        background: active ? 'var(--ac, #3D6B5E)' : 'transparent', borderRadius: 1, transition: 'background 0.12s', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        ...(isCol ? { width: 6, height: 28, marginLeft: -3, marginTop: -14 } : { width: 28, height: 6, marginLeft: -14, marginTop: -3 }),
        background: active ? 'var(--ac, #3D6B5E)' : 'transparent', borderRadius: 3, transition: 'background 0.12s', pointerEvents: 'none',
      }} />
    </div>
  );
}

/* ── Page frames + separators — THE SINGLE SOURCE OF TRUTH ── */
function PageFrames({ tree, offsetX, offsetY, pageW, pageH, gapPx, pageBounds, proTemplate, spreadW, spreadH,
  selectedFrame, swapSource, panActive, panLeaf, tick,
  onFrameClick, onFrameDrop, onFrameDragOver, onFrameDragLeave, onEmptyFrameTap, renderFrameOverlay,
  onSeparatorDrag, onSeparatorDragStart, onCropUpdate, onPanEnd, readOnly }) {

  const b = pageBounds || null;
  const pL = b ? pageW * b.left : 0, pR = b ? pageW * b.right : 0;
  const pT = b ? pageH * b.top : 0, pB = b ? pageH * b.bottom : 0;
  const innerX = offsetX + pL, innerY = offsetY + pT, innerW = pageW - pL - pR, innerH = pageH - pT - pB;

  const rects = useMemo(() => {
    if (!tree) return [];
    if (proTemplate) {
      return proTemplateToRects(proTemplate, offsetX, offsetY, spreadW || pageW * 2, spreadH || pageH, gapPx, tree);
    }
    // Collage layout — use _collageCell positions from collageLayoutEngine
    const leaves = [];
    const collectLeaves = (node) => {
      if (!node) return;
      if (node.type === 'leaf') { leaves.push(node); return; }
      node.children?.forEach(collectLeaves);
    };
    collectLeaves(tree);
    if (leaves.length > 0 && leaves[0]._collageCell) {
      return leaves.map(leaf => ({
        leaf,
        x: offsetX + leaf._collageCell.x * pageW,
        y: offsetY + leaf._collageCell.y * pageH,
        w: leaf._collageCell.width * pageW,
        h: leaf._collageCell.height * pageH,
      }));
    }
    return computeRects(tree, innerX, innerY, innerW, innerH, gapPx);
  }, [tree, innerX, innerY, innerW, innerH, gapPx, tick, proTemplate, offsetX, offsetY, spreadW, spreadH]);

  const seps = useMemo(() => {
    if (!tree || proTemplate || readOnly) return [];
    return computeSeps(tree, innerX, innerY, innerW, innerH, gapPx);
  }, [tree, innerX, innerY, innerW, innerH, gapPx, tick, proTemplate, readOnly]);

  return (
    <>
      {rects.map((rect) => (
        <FrameCell key={rect.leaf.id} rect={rect}
          isSelected={selectedFrame === rect.leaf.id}
          isSwapSource={swapSource === rect.leaf.id}
          isPanning={panActive && panLeaf === rect.leaf.id}
          onFrameClick={onFrameClick} onFrameDrop={onFrameDrop}
          onFrameDragOver={onFrameDragOver} onFrameDragLeave={onFrameDragLeave}
          onEmptyFrameTap={onEmptyFrameTap} renderFrameOverlay={renderFrameOverlay}
          onCropUpdate={onCropUpdate} onPanEnd={onPanEnd} />
      ))}
      {seps.map((sep, i) => (
        <FrameSeparator key={`sep-${i}`} sep={sep} onSeparatorDrag={onSeparatorDrag} onSeparatorDragStart={onSeparatorDragStart} />
      ))}
    </>
  );
}

/* ── Bounds handles — visual 8-point resize ── */
function BoundsHandles({ offsetX, offsetY, pageW, pageH, bounds, onBoundsChange, onBoundsDoubleClick }) {
  const b = bounds || { top: 0, right: 0, bottom: 0, left: 0 };
  const x = offsetX + pageW * b.left, y = offsetY + pageH * b.top;
  const w = pageW * (1 - b.left - b.right), h = pageH * (1 - b.top - b.bottom);
  const HS = 10;
  const hs = (cx, cy, cur) => ({ position: 'absolute', left: cx - HS / 2, top: cy - HS / 2, width: HS, height: HS, borderRadius: '50%', background: '#F5C518', border: '2px solid #E5B500', cursor: cur, zIndex: 30, boxShadow: '0 1px 4px rgba(0,0,0,0.3)' });

  const startResize = (hid, e) => {
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, sb = { ...b };
    const mv = (ev) => {
      const dx = (ev.clientX - sx) / pageW, dy = (ev.clientY - sy) / pageH, nb = { ...sb };
      if (hid.includes('l')) nb.left = Math.max(0, Math.min(0.45, sb.left + dx));
      if (hid.includes('r')) nb.right = Math.max(0, Math.min(0.45, sb.right - dx));
      if (hid.includes('t')) nb.top = Math.max(0, Math.min(0.45, sb.top + dy));
      if (hid.includes('b')) nb.bottom = Math.max(0, Math.min(0.45, sb.bottom - dy));
      if (onBoundsChange) onBoundsChange(nb);
    };
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  };

  const startMove = (e) => {
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, sb = { ...b }, gW = 1 - sb.left - sb.right, gH = 1 - sb.top - sb.bottom;
    const mv = (ev) => {
      const dx = (ev.clientX - sx) / pageW, dy = (ev.clientY - sy) / pageH;
      let nl = Math.max(0, Math.min(1 - gW, sb.left + dx)), nt = Math.max(0, Math.min(1 - gH, sb.top + dy));
      if (onBoundsChange) onBoundsChange({ left: nl, right: 1 - nl - gW, top: nt, bottom: 1 - nt - gH });
    };
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  };

  const pts = [
    { id: 'tl', cx: x, cy: y, c: 'nw-resize' }, { id: 'tc', cx: x + w / 2, cy: y, c: 'n-resize' }, { id: 'tr', cx: x + w, cy: y, c: 'ne-resize' },
    { id: 'ml', cx: x, cy: y + h / 2, c: 'w-resize' }, { id: 'mr', cx: x + w, cy: y + h / 2, c: 'e-resize' },
    { id: 'bl', cx: x, cy: y + h, c: 'sw-resize' }, { id: 'bc', cx: x + w / 2, cy: y + h, c: 's-resize' }, { id: 'br', cx: x + w, cy: y + h, c: 'se-resize' },
  ];
  const hm = { tl: 'tl', tc: 't', tr: 'tr', ml: 'l', mr: 'r', bl: 'bl', bc: 'b', br: 'br' };

  return (
    <>
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, border: '2px solid #F5C518', borderRadius: 2, cursor: 'move', zIndex: 25 }}
        onMouseDown={startMove} onDoubleClick={onBoundsDoubleClick} />
      {pts.map(p => <div key={p.id} style={hs(p.cx, p.cy, p.c)} onMouseDown={e => startResize(hm[p.id], e)} onDoubleClick={onBoundsDoubleClick} />)}
    </>
  );
}

/* ── Spread guides — bleed, cotor, safe zone ── */
function SpreadGuides({ canvasW, canvasH, halfW, spineW, formatStr, productSlug }) {
  const [fW, fH] = (formatStr || '20×20').split('×').map(Number);
  const sDims = getDimensions(productSlug, formatStr);
  if (!sDims) return null;

  const cotorMm = sDims?.spread?.cotor || 0;
  const bleedMm = sDims?.spread?.bleed || 3;
  const cotorPx = Math.round((cotorMm / (fW * 20)) * canvasW);
  const bleedPx = Math.round((bleedMm / (fH * 10)) * canvasH);
  const safePx = bleedPx + Math.round(3 * (canvasH / (fH * 10)));

  return (
    <>
      {/* Cotor zone */}
      <div className="absolute pointer-events-none z-[12]" style={{
        left: halfW - cotorPx / 2, top: 0, width: cotorPx + spineW, height: canvasH,
        background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(239,68,68,0.06) 3px, rgba(239,68,68,0.06) 6px)',
        borderLeft: '1px dashed rgba(239,68,68,0.3)', borderRight: '1px dashed rgba(239,68,68,0.3)',
      }} />
      {/* Bleed lines */}
      <div className="absolute pointer-events-none z-[11]" style={{ left: 0, top: 0, right: 0, height: bleedPx, borderBottom: '1px dashed rgba(239,68,68,0.25)' }} />
      <div className="absolute pointer-events-none z-[11]" style={{ left: 0, bottom: 0, right: 0, height: bleedPx, borderTop: '1px dashed rgba(239,68,68,0.25)' }} />
      <div className="absolute pointer-events-none z-[11]" style={{ left: 0, top: 0, bottom: 0, width: bleedPx, borderRight: '1px dashed rgba(239,68,68,0.25)' }} />
      <div className="absolute pointer-events-none z-[11]" style={{ right: 0, top: 0, bottom: 0, width: bleedPx, borderLeft: '1px dashed rgba(239,68,68,0.25)' }} />
      {/* Safe zone */}
      <div className="absolute pointer-events-none z-[11] border border-dashed border-green-400/20 rounded-sm" style={{ left: safePx, top: safePx, right: safePx, bottom: safePx }} />
      {/* Page separator */}
      <div className="absolute pointer-events-none z-[11]" style={{ left: halfW, top: 0, width: spineW, height: canvasH, background: 'rgba(0,0,0,0.08)' }} />
    </>
  );
}

/* ═══ MAIN EXPORT — SpreadCanvas ═══
 * Pure render component. Shell provides dimensions, state, and callbacks.
 * Identical output on desktop and mobile — the SINGLE SOURCE OF TRUTH.
 */
const SpreadCanvas = memo(function SpreadCanvas({
  // Data
  spread, canvasW, canvasH, halfW, spineW, gapPx, formatStr, productSlug, initialPages,
  // State
  selectedFrame, swapSource, panActive, panLeaf, boundsEditing, readOnly, tick,
  // Callbacks
  onFrameClick, onFrameDrop, onFrameDragOver, onFrameDragLeave, onEmptyFrameTap,
  onCanvasClick, onBoundsChange, onBoundsDoubleClick,
  onCoverPhotoDrop, onCoverCropStart, onSeparatorDrag, onSeparatorDragStart, onCropUpdate, onPanEnd,
  // Render slots
  renderFrameOverlay, renderCoverFrameOverlay,
}) {
  const [fW, fH] = (formatStr || '20×20').split('×').map(Number);
  const mode = spread?.mode || 'spread';
  const isSpreadMode = mode === 'spread';
  const hasPhotos = spread?.photos?.length > 0;
  const isCover = spread?.isCover;

  // Bleed/cotor — photos extend to canvas edge (bleed is visual guide only, not an inset)
  const bH = 0;
  const bW = 0;
  const cW = 0;

  // Page areas
  const lOffX = bW, lOffY = bH, lW = halfW - bW - cW, lH = canvasH - bH * 2;
  const rOffX = halfW + spineW + cW, rOffY = bH, rW = halfW - cW - bW, rH = canvasH - bH * 2;

  // Shared frame props
  const frameProps = { selectedFrame, swapSource, panActive, panLeaf, tick, onFrameClick, onFrameDrop, onFrameDragOver, onFrameDragLeave, onEmptyFrameTap, renderFrameOverlay, onSeparatorDrag, onSeparatorDragStart, onCropUpdate, onPanEnd, readOnly };

  return (
    <div className="relative" style={{ width: canvasW, height: canvasH }}>
      {/* Canvas background */}
      <div data-canvas-bg="true" className="absolute inset-0 bg-white rounded-sm"
        style={{ boxShadow: '0 4px 20px rgba(44,37,32,.15), 0 1px 4px rgba(44,37,32,.1)' }}
        onClick={onCanvasClick}>

        {/* Spine line */}
        <div className={`absolute top-0 bottom-0 z-[5] ${isSpreadMode ? 'bg-[#d6d0c8]' : 'bg-[#c8c0b6]'}`}
          style={{ left: halfW, width: spineW }} />

        {/* Guides */}
        {!isCover && productSlug && (
          <SpreadGuides canvasW={canvasW} canvasH={canvasH} halfW={halfW} spineW={spineW} formatStr={formatStr} productSlug={productSlug} />
        )}

        {/* ═══ REGULAR SPREAD FRAMES ═══ */}
        {!isCover && hasPhotos && (
          isSpreadMode ? (
            <>
              <PageFrames tree={spread?.full?.tree} offsetX={bW} offsetY={bH}
                pageW={canvasW - bW * 2} pageH={canvasH - bH * 2} gapPx={gapPx}
                pageBounds={spread?.full?.bounds}
                proTemplate={spread?.full?._proTemplate} spreadW={canvasW - bW * 2} spreadH={canvasH - bH * 2}
                {...frameProps} />
              {boundsEditing === 'full' && (
                <BoundsHandles offsetX={bW} offsetY={bH} pageW={canvasW - bW * 2} pageH={canvasH - bH * 2}
                  bounds={spread?.full?.bounds}
                  onBoundsChange={(nb) => onBoundsChange?.('full', nb)}
                  onBoundsDoubleClick={() => onBoundsDoubleClick?.('full')} />
              )}
            </>
          ) : (
            <>
              <PageFrames tree={spread?.left?.tree} offsetX={lOffX} offsetY={lOffY}
                pageW={lW} pageH={lH} gapPx={gapPx}
                pageBounds={spread?.left?.bounds}
                proTemplate={spread?.left?._proTemplate} spreadW={lW} spreadH={lH}
                {...frameProps} />
              {boundsEditing === 'left' && (
                <BoundsHandles offsetX={lOffX} offsetY={lOffY} pageW={lW} pageH={lH}
                  bounds={spread?.left?.bounds}
                  onBoundsChange={(nb) => onBoundsChange?.('left', nb)}
                  onBoundsDoubleClick={() => onBoundsDoubleClick?.('left')} />
              )}
              <PageFrames tree={spread?.right?.tree} offsetX={rOffX} offsetY={rOffY}
                pageW={rW} pageH={rH} gapPx={gapPx}
                pageBounds={spread?.right?.bounds}
                proTemplate={spread?.right?._proTemplate} spreadW={rW} spreadH={rH}
                {...frameProps} />
              {boundsEditing === 'right' && (
                <BoundsHandles offsetX={rOffX} offsetY={rOffY} pageW={rW} pageH={rH}
                  bounds={spread?.right?.bounds}
                  onBoundsChange={(nb) => onBoundsChange?.('right', nb)}
                  onBoundsDoubleClick={() => onBoundsDoubleClick?.('right')} />
              )}
            </>
          )
        )}

        {/* ═══ COVER ═══ */}
        {isCover && (() => {
          const coverDims = getCoverDimensions(formatStr, initialPages || 40, productSlug || 'pagini-groase');
          const spineRealCm = coverDims.spineW;
          const totalRealCm = coverDims.totalW;
          const spinePx = Math.round((spineRealCm / totalRealCm) * canvasW);
          const backW = Math.round((fW / totalRealCm) * canvasW);
          const frontW2 = canvasW - backW - spinePx;

          const coverTpl = spread.coverTemplate;
          const coverBg = coverTpl?.coverStyle?.bg || '#FFFFFF';
          const isPortrait = formatStr === '20×30';
          const coverDesignImage = isPortrait
            ? (coverTpl?.coverStyle?.designPortrait || coverTpl?.coverStyle?.bgImage)
            : (coverTpl?.coverStyle?.designSquare || coverTpl?.coverStyle?.bgImage);
          const coverBgImage = coverDesignImage || coverTpl?.coverStyle?.bgImage;

          return (
            <div className="absolute inset-0 z-[2]">
              {/* Background */}
              <div className="absolute rounded-sm overflow-hidden" style={{ left: 0, top: 0, width: canvasW, height: canvasH, background: coverBg }}>
                {coverBgImage && <img src={coverBgImage} alt="" style={{ width: '100%', height: '100%', display: 'block' }} />}
              </div>
              {/* Spine overlay */}
              <div className="absolute pointer-events-none" style={{ left: backW, top: 0, width: spinePx, height: canvasH }}>
                <div className="absolute inset-0 bg-black/5" />
                <div className="absolute inset-x-0 top-2 text-center text-[8px] text-black/30 font-mono">COTOR</div>
              </div>
              {/* Cover frames */}
              {(spread.coverFrames || []).map((frame) => {
                const fx = backW + spinePx + (frame.x / 100) * frontW2;
                const fy = (frame.y / 100) * canvasH;
                const fw = (frame.w / 100) * frontW2;
                const fh = (frame.h / 100) * canvasH;
                const photo = frame.photo;
                const crop = frame.cropOffset || { opx: 50, opy: 50 };
                return (
                  <div key={frame.id} className="absolute overflow-hidden z-[3]"
                    style={{ left: fx, top: fy, width: fw, height: fh }}
                    onDrop={(e) => { e.preventDefault(); const pid = e.dataTransfer?.getData('text/plain'); if (pid && onCoverPhotoDrop) onCoverPhotoDrop(frame.id, pid); }}>
                    {photo ? <FrameImage src={photo.previewUrl || photo.src} crop={crop} /> : (
                      <div className="w-full h-full bg-[#E8E4DB] flex items-center justify-center">
                        <CameraIcon size={Math.min(fw, fh) > 60 ? 20 : 14} />
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Decor images */}
              {(coverTpl?.decorImages || []).map((di) => (
                di.src && <div key={di.id} className="absolute overflow-hidden z-[6]"
                  style={{ left: backW + spinePx + (di.x / 100) * frontW2, top: (di.y / 100) * canvasH, width: (di.w / 100) * frontW2, height: (di.h / 100) * canvasH }}>
                  <img src={di.src} alt="" className="w-full h-full object-cover" draggable={false} />
                </div>
              ))}
              {/* Decor texts */}
              {(coverTpl?.decorTexts || []).map((dt) => (
                <div key={dt.id} className="absolute pointer-events-none flex items-center justify-center z-[6]"
                  style={{ left: backW + spinePx + (dt.x / 100) * frontW2, top: (dt.y / 100) * canvasH, width: (dt.w / 100) * frontW2, height: (dt.h / 100) * canvasH }}>
                  <span style={{ fontSize: Math.max(8, dt.fontSize * (frontW2 / 400)), fontWeight: dt.fontWeight || 'normal', color: dt.color || '#2C2520', fontFamily: dt.fontFamily || "'DM Serif Display', Georgia, serif" }}>
                    {dt.text}
                  </span>
                </div>
              ))}
              {/* Cover guides */}
              {(() => {
                const bleedMm = (coverDims.bleed || 1.5) * 10;
                const safeMm = 5;
                const totalWmm = coverDims.totalW * 10;
                const scale = canvasW / totalWmm;
                const bleedPxC = bleedMm * scale;
                const safePxC = (bleedMm + safeMm) * scale;
                return (
                  <>
                    <div className="absolute border-[1.5px] border-dashed border-red-400/50 pointer-events-none z-[15]" style={{ left: bleedPxC, top: bleedPxC, width: canvasW - bleedPxC * 2, height: canvasH - bleedPxC * 2 }}>
                      <span className="absolute -top-3 left-1 text-[7px] text-red-400/70 font-mono">BLEED</span>
                    </div>
                    <div className="absolute border-[1.5px] border-dashed border-green-400/50 pointer-events-none z-[15]" style={{ left: safePxC, top: safePxC, width: canvasW - safePxC * 2, height: canvasH - safePxC * 2 }}>
                      <span className="absolute -top-3 left-1 text-[7px] text-green-500/70 font-mono">SAFE</span>
                    </div>
                  </>
                );
              })()}
              {/* Labels */}
              <div className="absolute text-[10px] text-[#8A8078] font-medium pointer-events-none" style={{ bottom: 6, left: backW / 2, transform: 'translateX(-50%)' }}>Spatele copertei</div>
              <div className="absolute text-[10px] text-[#8A8078] font-medium pointer-events-none" style={{ bottom: 6, left: backW + spinePx + frontW2 / 2, transform: 'translateX(-50%)' }}>Fata copertei</div>
            </div>
          );
        })()}

        {/* ═══ EMPTY STATE ═══ */}
        {!hasPhotos && !isCover && (() => {
          const eDims = getDimensions(productSlug, formatStr);
          const eBMm = eDims?.spread?.bleed || 3;
          const eCMm = eDims?.spread?.cotor || 0;
          const eMmToH = canvasH / (fH * 10);
          const eMmToW = canvasW / (fW * 20);
          const eBH = Math.round(eBMm * eMmToH);
          const eBW = Math.round(eBMm * eMmToW);
          const eCW = Math.round((eCMm / 2) * eMmToW);
          const eLOffX = eBW, eLOffY = eBH, eLW = halfW - eBW - eCW, eLH = canvasH - eBH * 2;
          const eROffX = halfW + spineW + eCW, eROffY = eBH, eRW = halfW - eCW - eBW, eRH = canvasH - eBH * 2;
          return (
            <div className="absolute inset-0 z-0">
              <div className="absolute bg-[#E8E4DB] rounded-sm flex items-center justify-center"
                style={{ left: eLOffX, top: eLOffY, width: eLW, height: eLH }}>
                <CameraIcon size={32} />
              </div>
              <div className="absolute bg-[#E8E4DB] rounded-sm flex items-center justify-center"
                style={{ left: eROffX, top: eROffY, width: eRW, height: eRH }}>
                <CameraIcon size={32} />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
});

export default SpreadCanvas;

// Re-export sub-components for shells that need standalone access
export { FrameImage, FrameShimmer, CameraIcon, BoundsHandles };
