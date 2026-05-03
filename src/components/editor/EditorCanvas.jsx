import { useMemo, useCallback, useRef, useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import useEditorStore from '../../stores/useEditorStore';
import useProjectStore from '../../stores/useProjectStore';
import { computeRects, computeSeps, proTemplateToRects } from '../../utils/layoutEngine';
import TemplatePicker from './TemplatePicker';
import { getDimensions } from '../../utils/dimensions';
import { getCoverDimensions } from '../../utils/coverDimensions';
import { FrameImage, FrameShimmer, CameraIcon, BoundsHandles as SpreadBoundsHandles } from './SpreadCanvas';
import SpreadCanvas from './SpreadCanvas';

// ═══ FRAME OVERLAY (Mută / Schimbă / Scoate) — premium design ═══
function FrameOverlay({ leafId }) {
  const { startSwap, enterPan, removeFromFrame } = useEditorStore();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const actions = [
    {
      label: 'Mută',
      onClick: (e) => { e.stopPropagation(); enterPan(leafId); },
      color: '#3D6B5E',
      bg: 'bg-white',
      icon: (s) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/>
          <path d="M2 12h20"/><path d="M12 2v20"/>
        </svg>
      ),
    },
    {
      label: 'Schimbă',
      onClick: (e) => { e.stopPropagation(); startSwap(leafId); },
      color: '#3D6B5E',
      bg: 'bg-white',
      icon: (s) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>
        </svg>
      ),
    },
    {
      label: 'Șterge',
      onClick: (e) => { e.stopPropagation(); removeFromFrame(leafId); },
      color: '#B54A3A',
      bg: 'bg-white',
      icon: (s) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <path d="m19 6-.867 12.142A2 2 0 0 1 16.136 20H7.864a2 2 0 0 1-1.997-1.858L5 6"/>
          <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      ),
    },
  ];

  const iconSize = isMobile ? 16 : 13;
  const btnSize = isMobile ? 44 : 32;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 sm:gap-3 bg-black/25 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.15s ease' }}>
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={a.onClick}
          className={`${a.bg} rounded-xl shadow-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer
            transition-all duration-200 hover:scale-110 hover:shadow-xl active:scale-95 active:shadow-md`}
          style={{ width: btnSize, height: btnSize, color: a.color }}
          title={a.label}
        >
          {a.icon(iconSize)}
          <span className="font-semibold leading-none" style={{ fontSize: isMobile ? 8 : 7 }}>
            {a.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ═══ SEPARATOR (draggable divider between frames) ═══
function Separator({ sep }) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const isCol = sep.dir === 'col';

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    useEditorStore.getState().pushUndoForSep();

    const startPos = isCol ? e.clientX : e.clientY;
    const startRatio = sep.node.ratio;
    const parentSize = isCol ? sep.parentW : sep.parentH;

    let rafId = null;
    const onMove = (ev) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const curPos = isCol ? ev.clientX : ev.clientY;
        const delta = curPos - startPos;
        const newRatio = startRatio + delta / parentSize;
        useEditorStore.getState().updateRatio(sep.node, newRatio);
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

  const active = hovered || dragging;

  return (
    <div
      style={{
        position: 'absolute',
        left: sep.x,
        top: sep.y,
        width: sep.w,
        height: sep.h,
        cursor: isCol ? 'col-resize' : 'row-resize',
        zIndex: 8,
        touchAction: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={handleMouseDown}
    >
      {/* Line */}
      <div style={{
        position: 'absolute',
        ...(isCol
          ? { top: 0, bottom: 0, left: '50%', width: 2, marginLeft: -1 }
          : { left: 0, right: 0, top: '50%', height: 2, marginTop: -1 }
        ),
        background: active ? 'var(--ac, #3D6B5E)' : 'transparent',
        borderRadius: 1,
        transition: 'background 0.12s',
        pointerEvents: 'none',
      }} />
      {/* Handle */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        ...(isCol
          ? { width: 6, height: 28, marginLeft: -3, marginTop: -14 }
          : { width: 28, height: 6, marginLeft: -14, marginTop: -3 }
        ),
        background: active ? 'var(--ac, #3D6B5E)' : 'transparent',
        borderRadius: 3,
        transition: 'background 0.12s',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ═══ FRAME VIEW ═══
function FrameView({ rect, isSelected, isSwapSource, isPanActive }) {
  const { leaf, x, y, w, h } = rect;
  const photo = leaf.photo;
  const crop = leaf.cropOffset || { opx: 50, opy: 50 };
  const { selectFrame } = useEditorStore();
  const [dragOver, setDragOver] = useState(false);

  const handleMouseDown = (e) => {
    if (!isPanActive) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startOpx = crop.opx, startOpy = crop.opy;
    const sens = Math.max(w, h) * 0.5;
    const onMove = (ev) => {
      useEditorStore.getState().updateCropOffset(leaf.id,
        startOpx - ((ev.clientX - startX) / sens) * 100,
        startOpy - ((ev.clientY - startY) / sens) * 100);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      useEditorStore.getState().exitPan();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ── Touch pan for mobile ──
  const handleTouchStart = (e) => {
    if (!isPanActive) return;
    e.stopPropagation();
    const t = e.touches[0];
    const startX = t.clientX, startY = t.clientY;
    const startOpx = crop.opx, startOpy = crop.opy;
    const sens = Math.max(w, h) * 0.5;
    const onMove = (ev) => {
      ev.preventDefault();
      const tt = ev.touches[0];
      useEditorStore.getState().updateCropOffset(leaf.id,
        startOpx - ((tt.clientX - startX) / sens) * 100,
        startOpy - ((tt.clientY - startY) / sens) * 100);
    };
    const onEnd = () => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      useEditorStore.getState().exitPan();
    };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const photoId = e.dataTransfer.getData('text/plain');
    if (photoId) useEditorStore.getState().placePhotoInFrame(photoId, leaf.id, e.shiftKey);
  };

  return (
    <div
      className={`absolute overflow-hidden transition-shadow ${
        isSelected ? 'ring-2 ring-ac z-10' : ''
      } ${isSwapSource ? 'ring-2 ring-yellow-500 z-10' : ''
      } ${isPanActive ? 'ring-2 ring-blue-500 cursor-grab z-10' : 'cursor-pointer'
      } ${dragOver ? 'ring-2 ring-cyan z-10' : ''}`}
      style={{
        left: x, top: y, width: Math.max(w, 0), height: Math.max(h, 0), borderRadius: 1,
        ...(leaf._proMask === 'circle' ? { clipPath: 'ellipse(50% 50% at 50% 50%)' } :
            leaf._proMask === 'rounded' ? { clipPath: 'inset(0 round 6%)' } :
            leaf._proMask === 'arch' ? { clipPath: 'inset(0 0 0 0 round 50% 50% 0 0)' } :
            leaf._proMask === 'diamond' ? { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' } :
            leaf._proMask === 'hexagon' ? { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' } : {}),
      }}
      onClick={(e) => { e.stopPropagation(); if (photo && !isPanActive) selectFrame(leaf.id); }}
      onMouseDown={isPanActive ? handleMouseDown : undefined}
      onTouchStart={isPanActive ? handleTouchStart : undefined}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {photo ? (
        photo.previewUrl ? (
          <FrameImage src={photo.previewUrl} crop={crop} />
        ) : (
          <FrameShimmer />
        )
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${dragOver ? 'bg-cyan-light' : 'bg-[#E8E4DB]'}`}>
          {dragOver ? <span className="text-3xl text-[#3D6B5A]">⬇</span> : <CameraIcon size={Math.min(w, h) > 80 ? 24 : 16} />}
        </div>
      )}
      {isSelected && photo && !isPanActive && <FrameOverlay leafId={leaf.id} />}
    </div>
  );
}

// ═══ LAYOUT BOUNDS HANDLES (select all + resize + move) ═══
function BoundsHandles({ offsetX, offsetY, pageW, pageH, bounds, onDrag, onDoubleClick }) {
  const b = bounds || { top: 0, right: 0, bottom: 0, left: 0 };
  const x = offsetX + pageW * b.left, y = offsetY + pageH * b.top;
  const w = pageW * (1 - b.left - b.right), h = pageH * (1 - b.top - b.bottom);
  const HS = 10;
  const hs = (cx, cy, cur) => ({ position: 'absolute', left: cx-HS/2, top: cy-HS/2, width: HS, height: HS, borderRadius: '50%', background: '#F5C518', border: '2px solid #E5B500', cursor: cur, zIndex: 30, boxShadow: '0 1px 4px rgba(0,0,0,0.3)' });
  const startResize = (hid, e) => { e.stopPropagation(); const sx=e.clientX,sy=e.clientY,sb={...b}; const mv=(ev)=>{const dx=(ev.clientX-sx)/pageW,dy=(ev.clientY-sy)/pageH,nb={...sb}; if(hid.includes('l'))nb.left=Math.max(0,Math.min(0.45,sb.left+dx)); if(hid.includes('r'))nb.right=Math.max(0,Math.min(0.45,sb.right-dx)); if(hid.includes('t'))nb.top=Math.max(0,Math.min(0.45,sb.top+dy)); if(hid.includes('b'))nb.bottom=Math.max(0,Math.min(0.45,sb.bottom-dy)); onDrag(nb);}; const up=()=>{window.removeEventListener('mousemove',mv);window.removeEventListener('mouseup',up);}; window.addEventListener('mousemove',mv);window.addEventListener('mouseup',up); };
  const startMove = (e) => { e.stopPropagation(); const sx=e.clientX,sy=e.clientY,sb={...b},gW=1-sb.left-sb.right,gH=1-sb.top-sb.bottom; const mv=(ev)=>{const dx=(ev.clientX-sx)/pageW,dy=(ev.clientY-sy)/pageH; let nl=Math.max(0,Math.min(1-gW,sb.left+dx)),nt=Math.max(0,Math.min(1-gH,sb.top+dy)); onDrag({left:nl,right:1-nl-gW,top:nt,bottom:1-nt-gH});}; const up=()=>{window.removeEventListener('mousemove',mv);window.removeEventListener('mouseup',up);}; window.addEventListener('mousemove',mv);window.addEventListener('mouseup',up); };
  const pts=[{id:'tl',cx:x,cy:y,c:'nw-resize'},{id:'tc',cx:x+w/2,cy:y,c:'n-resize'},{id:'tr',cx:x+w,cy:y,c:'ne-resize'},{id:'ml',cx:x,cy:y+h/2,c:'w-resize'},{id:'mr',cx:x+w,cy:y+h/2,c:'e-resize'},{id:'bl',cx:x,cy:y+h,c:'sw-resize'},{id:'bc',cx:x+w/2,cy:y+h,c:'s-resize'},{id:'br',cx:x+w,cy:y+h,c:'se-resize'}];
  const hm={tl:'tl',tc:'t',tr:'tr',ml:'l',mr:'r',bl:'bl',bc:'b',br:'br'};
  return (<><div style={{position:'absolute',left:x,top:y,width:w,height:h,border:'2px solid #F5C518',borderRadius:2,cursor:'move',zIndex:25}} onMouseDown={startMove} onDoubleClick={onDoubleClick}/>{pts.map(p=><div key={p.id} style={hs(p.cx,p.cy,p.c)} onMouseDown={e=>startResize(hm[p.id],e)} onDoubleClick={onDoubleClick}/>)}</>);
}

// ═══ PAGE FRAMES + SEPARATORS ═══
function PageFrames({ tree, offsetX, offsetY, pageW, pageH, gapPx, selectedFrame, swapSource, panActive, panLeaf, pageBounds, proTemplate, spreadW, spreadH }) {
  const tick = useEditorStore((s) => s._tick);
  const b = pageBounds || null;
  const pL = b ? pageW*b.left : 0, pR = b ? pageW*b.right : 0;
  const pT = b ? pageH*b.top : 0, pB = b ? pageH*b.bottom : 0;
  const innerX = offsetX+pL, innerY = offsetY+pT, innerW = pageW-pL-pR, innerH = pageH-pT-pB;

  const rects = useMemo(() => {
    if (!tree) return [];
    // Pro template: use proTemplateToRects for free-form positioning
    if (proTemplate) {
      return proTemplateToRects(proTemplate, offsetX, offsetY, spreadW || pageW * 2, spreadH || pageH, gapPx, tree);
    }
    return computeRects(tree, innerX, innerY, innerW, innerH, gapPx);
  }, [tree, innerX, innerY, innerW, innerH, gapPx, tick, proTemplate, offsetX, offsetY, spreadW, spreadH]);

  const seps = useMemo(() => {
    if (!tree || proTemplate) return []; // no separators for pro templates
    return computeSeps(tree, innerX, innerY, innerW, innerH, gapPx);
  }, [tree, innerX, innerY, innerW, innerH, gapPx, tick, proTemplate]);

  return (
    <>
      {rects.map((rect) => (
        <FrameView key={rect.leaf.id} rect={rect}
          isSelected={selectedFrame === rect.leaf.id}
          isSwapSource={swapSource === rect.leaf.id}
          isPanActive={panActive && panLeaf === rect.leaf.id} />
      ))}
      {seps.map((sep, i) => (
        <Separator key={`sep-${i}`} sep={sep} />
      ))}
    </>
  );
}

// ═══ COVER PHOTO FRAME ═══
const CoverFrame = memo(function CoverFrame({ frame, areaW, areaH, offsetX, offsetY }) {
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState(false);
  const [panning, setPanning] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [moving, setMoving] = useState(false);
  const { placeCoverPhoto, removeCoverPhoto, updateCoverCrop, updateCoverFrameSize, readOnly } = useEditorStore();

  const x = offsetX + (frame.x / 100) * areaW;
  const y = offsetY + (frame.y / 100) * areaH;
  const w = (frame.w / 100) * areaW;
  const h = (frame.h / 100) * areaH;
  const photo = frame.photo;
  const crop = frame.cropOffset || { opx: 50, opy: 50 };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const photoId = e.dataTransfer.getData('text/plain');
    if (photoId) placeCoverPhoto(frame.id, photoId);
  };

  const handlePanStart = (e) => {
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const startOpx = crop.opx, startOpy = crop.opy;
    const sens = Math.max(w, h) * 0.5;
    const onMove = (ev) => {
      updateCoverCrop(frame.id,
        startOpx - ((ev.clientX - startX) / sens) * 100,
        startOpy - ((ev.clientY - startY) / sens) * 100);
    };
    const onUp = () => {
      // Stay in panning mode — user can drag again. Click outside to exit.
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ── 8-point resize handler ──
  const handleResizeStart = (e, handle) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing(true);
    const startMX = e.clientX, startMY = e.clientY;
    const startX = frame.x, startY = frame.y, startW = frame.w, startH = frame.h;

    const onMove = (ev) => {
      const dx = ((ev.clientX - startMX) / areaW) * 100;
      const dy = ((ev.clientY - startMY) / areaH) * 100;
      let nx = startX, ny = startY, nw = startW, nh = startH;

      // Which edges move based on handle position
      if (handle.includes('l')) { nx = startX + dx; nw = startW - dx; }
      if (handle.includes('r')) { nw = startW + dx; }
      if (handle.includes('t')) { ny = startY + dy; nh = startH - dy; }
      if (handle.includes('b')) { nh = startH + dy; }

      // Clamp minimums
      if (nw < 5) { if (handle.includes('l')) nx = startX + startW - 5; nw = 5; }
      if (nh < 5) { if (handle.includes('t')) ny = startY + startH - 5; nh = 5; }

      updateCoverFrameSize(frame.id, nx, ny, nw, nh);
    };
    const onUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ── Move frame (drag entire mask on cover) ──
  const handleMoveStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const startMX = e.clientX, startMY = e.clientY;
    const startX = frame.x, startY = frame.y;

    const onMove = (ev) => {
      const dx = ((ev.clientX - startMX) / areaW) * 100;
      const dy = ((ev.clientY - startMY) / areaH) * 100;
      updateCoverFrameSize(frame.id, startX + dx, startY + dy, frame.w, frame.h);
    };
    const onUp = () => {
      // Stay in moving mode — user can drag again. Click to exit.
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // 8 resize handles: tl, t, tr, r, br, b, bl, l
  const HANDLES = [
    { id: 'tl', pos: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
    { id: 't',  pos: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'ns-resize' },
    { id: 'tr', pos: 'top-0 right-0 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
    { id: 'r',  pos: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
    { id: 'br', pos: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize' },
    { id: 'b',  pos: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2', cursor: 'ns-resize' },
    { id: 'bl', pos: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize' },
    { id: 'l',  pos: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
  ];

  return (
    <div
      className={`absolute transition-shadow rounded-sm ${
        dragOver ? 'ring-2 ring-cyan z-10' : ''
      } ${selected && !panning ? 'ring-2 ring-[#3D6B5E] z-10' : ''
      } ${panning ? 'ring-2 ring-blue-500 z-10 cursor-grab' : ''
      } ${moving ? 'cursor-move' : ''
      } ${resizing ? 'z-10' : ''
      } ${!selected && !panning ? 'cursor-pointer' : ''
      } ${selected && !panning ? 'cursor-move' : ''}`}
      style={{ left: x, top: y, width: w, height: h, ...(frame.borderWidth > 0 ? { padding: Math.max(2, frame.borderWidth * (areaH / 1000)), background: frame.borderColor || '#FFFFFF' } : {}), transform: frame.rotation ? `rotate(${frame.rotation}deg)` : undefined, transformOrigin: 'center center' }}
      onClick={readOnly ? undefined : (e) => {
        e.stopPropagation();
        if (panning) { setPanning(false); return; }
        if (moving) { setMoving(false); return; }
        if (!resizing) setSelected(!selected);
      }}
      onMouseDown={readOnly ? undefined : (e) => {
        if (panning) { handlePanStart(e); return; }
        if (moving) { handleMoveStart(e); return; }
        if (selected && !resizing) { handleMoveStart(e); return; }
      }}
      onDragOver={readOnly ? undefined : (e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={readOnly ? undefined : () => setDragOver(false)}
      onDrop={readOnly ? undefined : handleDrop}
    >
      {/* Photo or placeholder */}
      <div className={`overflow-hidden rounded-sm ${frame.borderWidth > 0 ? 'w-full h-full' : 'absolute inset-0'}`}>
        {photo ? (
          photo.previewUrl ? (
            <FrameImage src={photo.previewUrl} crop={crop} />
          ) : (
            <FrameShimmer />
          )
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${dragOver ? 'bg-cyan-light' : 'bg-[#E8E4DB]'}`}>
            <CameraIcon size={Math.min(w, h) > 80 ? 24 : 16} />
          </div>
        )}
      </div>

      {/* Panning overlay */}
      {panning && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/15 pointer-events-none">
          <span className="text-white text-xs font-bold bg-blue-500/80 px-3 py-1 rounded-full mb-1">Trage poza în cadru</span>
          <span className="text-[#5C544B] text-[8px]">Click pentru a ieși</span>
        </div>
      )}

      {/* Moving overlay */}
      {moving && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/15 pointer-events-none">
          <span className="text-white text-xs font-bold bg-[#B8860B]/80 px-3 py-1 rounded-full mb-1">Trage masca pe copertă</span>
          <span className="text-[#5C544B] text-[8px]">Click pentru a ieși</span>
        </div>
      )}

      {/* Selected: action buttons */}
      {selected && !panning && !resizing && !moving && photo && !readOnly && (
        <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-black/20 backdrop-blur-[2px]" style={{ animation: 'fadeIn 0.15s ease' }}>
          {/* Crop — mută poza în interiorul măștii */}
          <button onClick={(e) => { e.stopPropagation(); setPanning(true); }}
            className="bg-white rounded-xl shadow-lg flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-110 active:scale-95"
            style={{ width: 36, height: 36, color: '#3D6B5E' }} title="Mută poza în cadru">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/>
              <path d="M2 12h20"/><path d="M12 2v20"/>
            </svg>
            <span className="text-[6px] font-semibold">Crop</span>
          </button>
          {/* Mută — mută masca pe copertă */}
          <button onClick={(e) => { e.stopPropagation(); setMoving(true); setSelected(false); }}
            className="bg-white rounded-xl shadow-lg flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-110 active:scale-95"
            style={{ width: 36, height: 36, color: '#B8860B' }} title="Mută masca pe copertă">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M8 12h8M12 8v8"/>
            </svg>
            <span className="text-[6px] font-semibold">Mută</span>
          </button>
          {/* Șterge — scoate poza din mască */}
          <button onClick={(e) => { e.stopPropagation(); removeCoverPhoto(frame.id); setSelected(false); }}
            className="bg-white rounded-xl shadow-lg flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-110 active:scale-95"
            style={{ width: 36, height: 36, color: '#B54A3A' }} title="Șterge poza">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <path d="m19 6-.867 12.142A2 2 0 0 1 16.136 20H7.864a2 2 0 0 1-1.997-1.858L5 6"/>
            </svg>
            <span className="text-[6px] font-semibold">Șterge</span>
          </button>
        </div>
      )}

      {/* 8 resize handles — visible when selected (hidden in readOnly) */}
      {selected && !panning && !readOnly && (
        <>
          {HANDLES.map(({ id, pos, cursor }) => (
            <div
              key={id}
              className={`absolute ${pos} w-3 h-3 bg-white border-2 border-[#3D6B5E] rounded-full z-30 hover:scale-125 transition-transform`}
              style={{ cursor }}
              onMouseDown={(e) => handleResizeStart(e, id)}
            />
          ))}
        </>
      )}
    </div>
  );
});

// ═══ COVER TEXT ZONE (editable with toolbar) ═══
const BASE_FONTS = [
  { value: 'sans-serif', label: 'Sans-serif' },
  { value: "'Playfair Display', serif", label: 'Playfair Display' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Lora', serif", label: 'Lora' },
  { value: "'Cormorant Garamond', serif", label: 'Cormorant' },
  { value: "'Raleway', sans-serif", label: 'Raleway' },
  { value: "'Great Vibes', cursive", label: 'Great Vibes' },
  { value: "'DM Serif Display', serif", label: 'DM Serif' },
  { value: "'Amiri', serif", label: 'Amiri' },
  { value: "serif", label: 'Serif' },
  { value: "monospace", label: 'Monospace' },
];

function getCoverFonts() {
  try {
    const { getAvailableFonts } = require('../../utils/fontManager');
    const all = [...BASE_FONTS];
    getAvailableFonts().forEach((f) => {
      if (!all.find((x) => x.label === f)) {
        all.push({ value: `'${f}', sans-serif`, label: f });
      }
    });
    return all;
  } catch {
    return BASE_FONTS;
  }
}

const CoverTextZone = function CoverTextZone({ textZone, areaW, areaH, offsetX, offsetY }) {
  const { setCoverText, updateCoverTextStyle, updateCoverTextSize, readOnly } = useEditorStore();
  const [selected, setSelected] = useState(false);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const fontBtnRef = useRef(null);
  const inputRef = useRef(null);

  const x = offsetX + (textZone.x / 100) * areaW;
  const y = offsetY + (textZone.y / 100) * areaH;
  const w = (textZone.w / 100) * areaW;
  const h = (textZone.h / 100) * areaH;
  const computedFontSize = Math.max(8, (textZone.fontSize / 100) * areaH);

  // ── Move text zone on cover — free movement on front cover ──
  const handleMoveStart = (e) => {
    if (editing) return;
    e.stopPropagation(); e.preventDefault();
    setMoving(true);
    const startMX = e.clientX, startMY = e.clientY;
    const startX = textZone.x, startY = textZone.y;
    const onMove = (ev) => {
      const dx = ((ev.clientX - startMX) / areaW) * 100;
      const dy = ((ev.clientY - startMY) / areaH) * 100;
      updateCoverTextSize(textZone.id, startX + dx, startY + dy, textZone.w, textZone.h);
    };
    const onUp = () => {
      setMoving(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ── Resize text zone ──
  const handleResizeStart = (e, handle) => {
    e.stopPropagation(); e.preventDefault();
    setResizing(true);
    const startMX = e.clientX, startMY = e.clientY;
    const startX = textZone.x, startY = textZone.y, startW = textZone.w, startH = textZone.h;
    const onMove = (ev) => {
      const dx = ((ev.clientX - startMX) / areaW) * 100;
      const dy = ((ev.clientY - startMY) / areaH) * 100;
      let nx = startX, ny = startY, nw = startW, nh = startH;
      if (handle.includes('l')) { nx = startX + dx; nw = startW - dx; }
      if (handle.includes('r')) { nw = startW + dx; }
      if (handle.includes('t')) { ny = startY + dy; nh = startH - dy; }
      if (handle.includes('b')) { nh = startH + dy; }
      if (nw < 5) { if (handle.includes('l')) nx = startX + startW - 5; nw = 5; }
      if (nh < 3) { if (handle.includes('t')) ny = startY + startH - 3; nh = 3; }
      updateCoverTextSize(textZone.id, nx, ny, nw, nh);
    };
    const onUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const TEXT_HANDLES = [
    { id: 'tl', pos: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
    { id: 't',  pos: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'ns-resize' },
    { id: 'tr', pos: 'top-0 right-0 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
    { id: 'r',  pos: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
    { id: 'br', pos: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize' },
    { id: 'b',  pos: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2', cursor: 'ns-resize' },
    { id: 'bl', pos: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize' },
    { id: 'l',  pos: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
  ];

  return (
    <div
      className={`absolute z-[5] ${
        selected ? 'ring-2 ring-[#7C5CFC] z-[12]' : ''
      } ${editing ? 'z-[15]' : ''
      } ${!editing && selected ? 'cursor-move' : 'cursor-pointer'}`}
      style={{
        left: x, top: y, width: w, height: h,
        transform: textZone.rotation ? `rotate(${textZone.rotation}deg)` : undefined,
        transformOrigin: 'center center',
      }}
      onClick={readOnly ? undefined : (e) => {
        e.stopPropagation();
        if (!editing && !moving && !resizing) setSelected(!selected);
      }}
      onDoubleClick={readOnly ? undefined : (e) => {
        e.stopPropagation();
        setEditing(true);
        setSelected(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }}
      onMouseDown={readOnly ? undefined : (e) => {
        if (!editing && !resizing) {
          if (!selected) setSelected(true);
          handleMoveStart(e);
        }
      }}
    >
      {/* Text display / input */}
      <div className="w-full h-full flex items-center justify-center">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={textZone.text}
            onChange={(e) => setCoverText(textZone.id, e.target.value)}
            onBlur={() => setTimeout(() => setEditing(false), 300)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setEditing(false); } }}
            placeholder={textZone.placeholder || 'Scrie textul aici'}
            className="w-full bg-transparent outline-none placeholder:text-black/20 placeholder:italic"
            style={{
              fontSize: computedFontSize,
              fontWeight: textZone.fontWeight || 'normal',
              fontStyle: textZone.fontStyle || 'normal',
              fontFamily: textZone.fontFamily || 'sans-serif',
              color: textZone.color || '#1D1B18',
              textAlign: textZone.textAlign || 'center',
              letterSpacing: '0.02em',
              padding: '2px 4px',
            }}
          />
        ) : (
          <span
            className="w-full select-none pointer-events-none truncate"
            style={{
              fontSize: computedFontSize,
              fontWeight: textZone.fontWeight || 'normal',
              fontStyle: textZone.text ? (textZone.fontStyle || 'normal') : 'italic',
              fontFamily: textZone.fontFamily || 'sans-serif',
              color: textZone.text ? (textZone.color || '#1D1B18') : 'rgba(0,0,0,0.15)',
              textAlign: textZone.textAlign || 'center',
              letterSpacing: '0.02em',
              display: 'block',
            }}
          >
            {textZone.text || textZone.placeholder || 'Dublu-click pentru text'}
          </span>
        )}
      </div>

      {/* Toolbar — above text zone (hidden in readOnly) */}
      {selected && !readOnly && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white shadow-lg rounded-xl px-3 py-1.5 z-[100] border border-gray-200 whitespace-nowrap"
          style={{ top: -48 }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {/* Font family — custom dropdown with real font preview */}
          <div className="relative" ref={fontBtnRef}>
            <button
              onClick={() => setFontOpen(!fontOpen)}
              className="text-[12px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition flex items-center gap-1 max-w-[160px]"
              style={{ fontFamily: textZone.fontFamily || 'sans-serif' }}
            >
              <span className="truncate">{getCoverFonts().find(f => f.value === (textZone.fontFamily || 'sans-serif'))?.label || 'Sans-serif'}</span>
              <svg className={`w-3 h-3 shrink-0 text-gray-400 transition ${fontOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {fontOpen && createPortal(
              <div className="fixed inset-0 z-[9999]" onClick={() => setFontOpen(false)}>
                <div
                  className="absolute bg-white border border-gray-200 rounded-xl shadow-2xl max-h-[300px] overflow-y-auto w-[220px]"
                  style={{
                    left: fontBtnRef.current?.getBoundingClientRect().left || 20,
                    bottom: window.innerHeight - (fontBtnRef.current?.getBoundingClientRect().top || 100) + 4,
                  }}
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                >
                  {getCoverFonts().map((f) => (
                    <button
                      key={f.value}
                      onClick={() => {
                        updateCoverTextStyle(textZone.id, 'fontFamily', f.value);
                        const fontName = f.value.replace(/'/g, '').split(',')[0].trim();
                        if (fontName && !['sans-serif','serif','monospace'].includes(fontName)) {
                          import('../../utils/fontManager').then(({ loadFont }) => loadFont(fontName, 400));
                        }
                        setFontOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-[14px] hover:bg-gray-50 transition ${f.value === (textZone.fontFamily || 'sans-serif') ? 'bg-[#3D6B5E] text-white hover:bg-[#3D6B5E]' : 'text-gray-800'}`}
                      style={{ fontFamily: f.value }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )}
          </div>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Font size */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button onMouseDown={(e) => { e.preventDefault(); updateCoverTextStyle?.(textZone.id, 'fontSize', Math.max(1, (textZone.fontSize || 5) - 0.5)); }}
              className="text-[13px] font-bold px-2 py-1 hover:bg-gray-100 transition">−</button>
            <span className="text-[12px] text-gray-700 font-mono min-w-[32px] text-center border-x border-gray-200 py-1">{Math.round(computedFontSize)}</span>
            <button onMouseDown={(e) => { e.preventDefault(); updateCoverTextStyle?.(textZone.id, 'fontSize', Math.min(50, (textZone.fontSize || 5) + 0.5)); }}
              className="text-[13px] font-bold px-2 py-1 hover:bg-gray-100 transition">+</button>
          </div>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Bold */}
          <button onMouseDown={(e) => { e.preventDefault(); updateCoverTextStyle?.(textZone.id, 'fontWeight', textZone.fontWeight === 'bold' ? 'normal' : 'bold'); }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-[14px] font-bold transition ${textZone.fontWeight === 'bold' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>B</button>

          {/* Italic */}
          <button onMouseDown={(e) => { e.preventDefault(); updateCoverTextStyle?.(textZone.id, 'fontStyle', textZone.fontStyle === 'italic' ? 'normal' : 'italic'); }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-[14px] italic transition ${textZone.fontStyle === 'italic' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>I</button>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Color */}
          <label className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer overflow-hidden flex items-center justify-center hover:border-gray-400 transition relative">
            <div className="w-5 h-5 rounded" style={{ background: textZone.color || '#1D1B18' }} />
            <input type="color" value={textZone.color || '#1D1B18'}
              onChange={(e) => updateCoverTextStyle?.(textZone.id, 'color', e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Align */}
          {['left', 'center', 'right'].map(align => (
            <button key={align} onMouseDown={(e) => { e.preventDefault(); updateCoverTextStyle?.(textZone.id, 'textAlign', align); }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${(textZone.textAlign || 'center') === align ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {align === 'left' && <path strokeLinecap="round" d="M3 6h18M3 12h12M3 18h16" />}
                {align === 'center' && <path strokeLinecap="round" d="M3 6h18M6 12h12M4 18h16" />}
                {align === 'right' && <path strokeLinecap="round" d="M3 6h18M9 12h12M5 18h16" />}
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* 8 resize handles — visible when selected (hidden in readOnly) */}
      {selected && !editing && !readOnly && (
        <>
          {TEXT_HANDLES.map(({ id, pos, cursor }) => (
            <div key={id}
              className={`absolute ${pos} w-2.5 h-2.5 bg-white border-2 border-[#7C5CFC] rounded-full z-30 hover:scale-125 transition-transform`}
              style={{ cursor }}
              onMouseDown={(e) => handleResizeStart(e, id)} />
          ))}
        </>
      )}
    </div>
  );
};

// ═══ COVER LAYOUT (renders on front cover area) ═══
function CoverLayout({ spread, offsetX, offsetY, areaW, areaH }) {
  if (!spread?.coverFrames && !spread?.coverTexts) return null;

  return (
    <>
      {/* Photo frames */}
      {(spread.coverFrames || []).map((frame) => (
        <CoverFrame key={frame.id} frame={frame} areaW={areaW} areaH={areaH} offsetX={offsetX} offsetY={offsetY} />
      ))}
      {/* Text zones */}
      {(spread.coverTexts || []).map((textZone) => (
        <CoverTextZone key={textZone.id} textZone={textZone} areaW={areaW} areaH={areaH} offsetX={offsetX} offsetY={offsetY} />
      ))}
    </>
  );
}

// ═══ MAIN CANVAS ═══
export default function EditorCanvas() {
  const {
    spreads, currentSpread, gapMM,
    nextSpread, prevSpread,
    sbarLP, sbarLN, sbarMP, sbarMN, sbarRP, sbarRN,
    autoLayoutCurrent, toggleMode,
    boundsEditing, startBoundsEdit, stopBoundsEdit, updatePageBounds,
    selectedFrame, swapSource, panActive, panLeaf,
    clearSelection, cancelSwap, guides, readOnly, _tick: tick,
  } = useEditorStore();

  const spread = spreads[currentSpread];
  const mode = spread?.mode || 'spread';
  const isSpreadMode = mode === 'spread';

  // Canvas adapts to selected format ratio AND available viewport
  const { productConfig } = useProjectStore.getState();
  const formatStr = productConfig?.format || '20×20';
  const [fW, fH] = formatStr.split('×').map(Number);
  const spreadRatio = (2 * fW) / fH;

  const containerRef = useRef(null);
  const [viewSize, setViewSize] = useState({ w: 900, h: 520 });
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Listen for mobile template picker event
  useEffect(() => {
    const handler = () => setTemplatePickerOpen(true);
    window.addEventListener('openTemplatePicker', handler);
    return () => window.removeEventListener('openTemplatePicker', handler);
  }, []);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Desktop: leave space for prev/next buttons (100px). Mobile: use full width
        const mobile = window.innerWidth < 640;
        const padW = mobile ? 16 : (window.innerWidth < 1280 ? 50 : 100);
        const padH = mobile ? 30 : (window.innerWidth < 1280 ? 30 : 60);
        setViewSize({ w: Math.max(300, rect.width - padW), h: Math.max(200, rect.height - padH) });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const maxW = viewSize.w;
  const maxH = viewSize.h;
  let canvasW = maxW;
  let canvasH = Math.round(maxW / spreadRatio);
  if (canvasH > maxH) { canvasH = maxH; canvasW = Math.round(maxH * spreadRatio); }
  const spineW = 2;
  const halfW = (canvasW - spineW) / 2;
  const gapPx = (gapMM / 25.4) * 300 * (canvasW / 2000);

  const hasPhotos = spread?.photos?.length > 0;
  const isFirst = currentSpread === 0;
  const isLast = currentSpread === spreads.length - 1;

  const handleCanvasClick = useCallback((e) => {
    if (e.target === e.currentTarget || e.target.closest('[data-canvas-bg]')) clearSelection();
  }, [clearSelection]);

  const bleed = 6;
  const safe = 12;

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center bg-[#F0EDE8] relative overflow-hidden"
      onClick={handleCanvasClick}
    >

      {swapSource && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-yellow-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-[fadeIn_0.2s_ease] flex items-center gap-2">
          ↔ Selectează a doua poză
          <button onClick={cancelSwap} className="opacity-70 hover:opacity-100 underline text-[10px]">Anulează</button>
        </div>
      )}

      {panActive && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-blue-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-[fadeIn_0.2s_ease]">
          ✋ Trage poza în cadru
        </div>
      )}

      {/* ═══ SPREAD CONTROL BAR — desktop only ═══ */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-white/90 backdrop-blur hidden sm:flex items-center z-10 px-3 select-none">
        <button onClick={toggleMode}
          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mr-1 transition-colors cursor-pointer ${
            isSpreadMode ? 'bg-cyan/20 text-cyan' : 'bg-purple-500/20 text-purple-300'
          }`} title="Panoramă / Pagină">
          {isSpreadMode ? 'Panoramă' : 'Pagină'}
        </button>
        <div className="absolute flex items-center gap-0.5" style={{ left: '29.5%', transform: 'translateX(-50%)' }}>
          <button onClick={sbarLP} disabled={!hasPhotos} className="w-6 h-6 flex items-center justify-center text-[#8A8078] hover:text-white hover:bg-[#E8E4DB] rounded text-xs transition-colors disabled:opacity-20" title="Layout anterior stânga">‹</button>
          <div className="w-6 h-6 flex items-center justify-center rounded text-[#8A8078]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
          </div>
          <button onClick={sbarLN} disabled={!hasPhotos} className="w-6 h-6 flex items-center justify-center text-[#8A8078] hover:text-white hover:bg-[#E8E4DB] rounded text-xs transition-colors disabled:opacity-20" title="Layout următor stânga">›</button>
        </div>

        <div className="absolute flex items-center gap-0.5" style={{ left: '50%', transform: 'translateX(-50%)' }}>
          <button onClick={sbarMP} disabled={!hasPhotos} className="w-6 h-6 flex items-center justify-center text-[#8A8078] hover:text-white hover:bg-[#E8E4DB] rounded text-xs transition-colors disabled:opacity-20" title="Rotație inversă">‹</button>
          <div className="w-6 h-6 flex items-center justify-center text-[#5C544B] bg-[#E8E4DB] rounded">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
          </div>
          <button onClick={sbarMN} disabled={!hasPhotos} className="w-6 h-6 flex items-center justify-center text-[#8A8078] hover:text-white hover:bg-[#E8E4DB] rounded text-xs transition-colors disabled:opacity-20" title="Shuffle rotație">›</button>
        </div>

        <div className="absolute flex items-center gap-0.5" style={{ left: '70.5%', transform: 'translateX(-50%)' }}>
          <button onClick={sbarRP} disabled={!hasPhotos} className="w-6 h-6 flex items-center justify-center text-[#8A8078] hover:text-white hover:bg-[#E8E4DB] rounded text-xs transition-colors disabled:opacity-20" title="Layout anterior dreapta">‹</button>
          <div className="w-6 h-6 flex items-center justify-center rounded text-[#8A8078]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="8" height="18" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
          </div>
          <button onClick={sbarRN} disabled={!hasPhotos} className="w-6 h-6 flex items-center justify-center text-[#8A8078] hover:text-white hover:bg-[#E8E4DB] rounded text-xs transition-colors disabled:opacity-20" title="Layout următor dreapta">›</button>
        </div>

        <span className="absolute right-3 text-[10px] text-[#8A8078] font-bold">
          {spread?.isCover ? 'Copertă' : `Rotația ${currentSpread + (spreads[0]?.isCover ? 0 : 1)}`}
        </span>
      </div>

      {/* ═══ CANVAS ═══ */}
      <div className="relative mt-14 mb-2" style={{ width: canvasW, height: canvasH }}>

        {/* ═══ NON-COVER: SpreadCanvas (unified render engine with separators) ═══ */}
        {!spread?.isCover && (
          <SpreadCanvas
            spread={spread}
            canvasW={canvasW} canvasH={canvasH} halfW={halfW} spineW={spineW} gapPx={gapPx}
            formatStr={formatStr} productSlug={productConfig?.slug} initialPages={productConfig?.initialPages}
            selectedFrame={selectedFrame} swapSource={swapSource}
            panActive={panActive} panLeaf={panLeaf}
            boundsEditing={boundsEditing} readOnly={readOnly} tick={tick}
            onFrameClick={(leafId) => useEditorStore.getState().selectFrame(leafId)}
            onFrameDrop={(leafId, photoId) => useEditorStore.getState().placePhotoInFrame(photoId, leafId)}
            onEmptyFrameTap={(leafId) => useEditorStore.getState().selectFrame(leafId)}
            onCanvasClick={() => { if (boundsEditing) stopBoundsEdit(); clearSelection(); }}
            onBoundsChange={(section, nb) => updatePageBounds(currentSpread, section, nb)}
            onBoundsDoubleClick={(section) => { updatePageBounds(currentSpread, section, { top: 0, right: 0, bottom: 0, left: 0 }); stopBoundsEdit(); }}
            onSeparatorDrag={(node, newRatio) => useEditorStore.getState().updateRatio(node, newRatio)}
            onSeparatorDragStart={() => useEditorStore.getState().pushUndoForSep()}
            onCropUpdate={(leafId, opx, opy) => useEditorStore.getState().updateCropOffset(leafId, opx, opy)}
            onPanEnd={() => useEditorStore.getState().exitPan()}
            renderFrameOverlay={(leafId) => selectedFrame === leafId ? <FrameOverlay leafId={leafId} /> : null}
          />
        )}

        {/* ═══ COVER: interactive editing (kept separate — has drag/resize/text editing) ═══ */}
        {spread?.isCover && (
        <div data-canvas-bg="true" className="absolute inset-0 bg-white rounded-sm"
          style={{ boxShadow: '0 4px 20px rgba(44,37,32,.15), 0 1px 4px rgba(44,37,32,.1)' }}>

          {spread?.isCover && (() => {
            /* ═══ COVER — real proportions: back + spine + front ═══ */
            // Calculate spine width proportional to format
            // Use same dimensions as admin cover editor
            const coverDims = getCoverDimensions(formatStr, productConfig?.initialPages || 40, productConfig?.slug || 'pagini-groase');
            const spineRealCm = coverDims.spineW;
            const totalRealCm = coverDims.totalW;
            const spinePx = Math.round((spineRealCm / totalRealCm) * canvasW);
            const backW = Math.round((fW / totalRealCm) * canvasW);
            const frontW2 = canvasW - backW - spinePx;

            const coverTpl = spread.coverTemplate || useProjectStore.getState().coverTemplate;
            const coverBg = coverTpl?.coverStyle?.bg || '#FFFFFF';
            // Pick design image based on format: portrait (20×30) or square (others)
            const isPortrait = formatStr === '20×30';
            const coverDesignImage = isPortrait
              ? (coverTpl?.coverStyle?.designPortrait || coverTpl?.coverStyle?.bgImage)
              : (coverTpl?.coverStyle?.designSquare || coverTpl?.coverStyle?.bgImage);
            const coverBgImage = coverDesignImage || coverTpl?.coverStyle?.bgImage;

            return (
              <div className="absolute inset-0 z-[2]">
                {/* Full spread background — stretched to fill (no crop, matches admin 1:1) */}
                <div className="absolute rounded-sm overflow-hidden"
                  style={{ left: 0, top: 0, width: canvasW, height: canvasH, background: coverBg }}>
                  {coverBgImage && <img src={coverBgImage} alt="" style={{ width: '100%', height: '100%', display: 'block' }} />}
                </div>
                {/* Back cover border */}
                <div className="absolute rounded-sm pointer-events-none"
                  style={{ left: 0, top: 0, width: backW, height: canvasH }}>
                  <div className="absolute inset-1 border border-dashed border-black/10 rounded-sm" />
                </div>
                {/* Spine (cotor) overlay */}
                <div className="absolute pointer-events-none"
                  style={{ left: backW, top: 0, width: spinePx, height: canvasH }}>
                  <div className="absolute inset-0 bg-black/5" />
                  <div className="absolute inset-x-0 top-2 text-center text-[8px] text-black/30 font-mono">COTOR</div>
                </div>
                {/* Front cover — interactive frames + text */}
                <CoverLayout
                  spread={spread}
                  offsetX={backW + spinePx}
                  offsetY={0}
                  areaW={frontW2}
                  areaH={canvasH}
                />
                {/* Decorative images — draggable by client */}
                {(spread.coverTemplate?.decorImages || useProjectStore.getState().coverTemplate?.decorImages || []).map((di) => (
                  di.src && <div key={di.id} className="absolute overflow-hidden cursor-move"
                    style={{
                      left: backW + spinePx + (di.x / 100) * frontW2,
                      top: (di.y / 100) * canvasH,
                      width: (di.w / 100) * frontW2,
                      height: (di.h / 100) * canvasH,
                      zIndex: 6,
                    }}
                    onMouseDown={(e) => {
                      if (readOnly) return;
                      e.stopPropagation();
                      const sx = e.clientX, sy = e.clientY, startX = di.x, startY = di.y;
                      const mv = (ev) => {
                        const dx = ((ev.clientX - sx) / frontW2) * 100;
                        const dy = ((ev.clientY - sy) / canvasH) * 100;
                        useEditorStore.getState().moveCoverDecorImage(di.id, startX + dx, startY + dy);
                      };
                      const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
                      window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
                    }}>
                    <img src={di.src} alt="" className="w-full h-full object-cover" draggable={false} />
                    {/* Resize handle bottom-right */}
                    {!readOnly && <div className="absolute bottom-0 right-0 w-3 h-3 bg-white border border-[#3D6B5E] cursor-se-resize rounded-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const sx = e.clientX, sy = e.clientY;
                        const sW = di.w, sH = di.h, sX = di.x, sY = di.y;
                        const mv = (ev) => {
                          const dw = ((ev.clientX - sx) / frontW2) * 100;
                          const dh = ((ev.clientY - sy) / canvasH) * 100;
                          useEditorStore.getState().resizeCoverDecorImage(di.id, sX, sY, sW + dw, sH + dh);
                        };
                        const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
                        window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
                      }} />}
                  </div>
                ))}
                {/* Decorative texts — draggable by client */}
                {(spread.coverTemplate?.decorTexts || useProjectStore.getState().coverTemplate?.decorTexts || []).map((dt) => (
                  <div key={dt.id} className="absolute flex items-center justify-center cursor-move"
                    style={{
                      left: backW + spinePx + (dt.x / 100) * frontW2,
                      top: (dt.y / 100) * canvasH,
                      width: (dt.w / 100) * frontW2,
                      height: (dt.h / 100) * canvasH,
                      zIndex: 6,
                    }}
                    onMouseDown={(e) => {
                      if (readOnly) return;
                      e.stopPropagation();
                      const sx = e.clientX, sy = e.clientY, startX = dt.x, startY = dt.y;
                      const mv = (ev) => {
                        const dx = ((ev.clientX - sx) / frontW2) * 100;
                        const dy = ((ev.clientY - sy) / canvasH) * 100;
                        useEditorStore.getState().moveCoverDecorText(dt.id, startX + dx, startY + dy);
                      };
                      const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
                      window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
                    }}>
                    <span style={{
                      fontSize: Math.max(8, dt.fontSize * (frontW2 / 400)),
                      fontWeight: dt.fontWeight || 'normal',
                      color: dt.color || '#2C2520',
                      fontFamily: dt.fontFamily || "'DM Serif Display', Georgia, serif",
                    }}>
                      {dt.text}
                    </span>
                    {/* Resize handle */}
                    {!readOnly && <div className="absolute bottom-0 right-0 w-3 h-3 bg-white border border-[#3D6B5E] cursor-se-resize rounded-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const sx = e.clientX, sy = e.clientY;
                        const sW = dt.w, sH = dt.h, sX = dt.x, sY = dt.y;
                        const mv = (ev) => {
                          const dw = ((ev.clientX - sx) / frontW2) * 100;
                          const dh = ((ev.clientY - sy) / canvasH) * 100;
                          useEditorStore.getState().resizeCoverDecorText(dt.id, sX, sY, sW + dw, sH + dh);
                        };
                        const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
                        window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
                      }} />}
                  </div>
                ))}
                {/* Labels */}
                <div className="absolute text-[10px] text-[#8A8078] font-medium pointer-events-none"
                  style={{ bottom: 6, left: backW / 2, transform: 'translateX(-50%)' }}>Spatele copertei</div>
                <div className="absolute text-[10px] text-[#8A8078] font-medium pointer-events-none"
                  style={{ bottom: 6, left: backW + spinePx + frontW2 / 2, transform: 'translateX(-50%)' }}>Fata copertei</div>

                {/* Color picker for solid-color covers (type 2 — no design image, hidden in readOnly) */}
                {!coverBgImage && !useEditorStore.getState().readOnly && (() => {
                  const originalBg = useProjectStore.getState().coverTemplate?.coverStyle?.bg || '#FFFFFF';
                  const isChanged = coverBg !== originalBg;
                  return (
                    <div className="absolute z-20 flex items-center gap-1.5"
                      style={{ top: 6, right: 6 }}>
                      <label className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm cursor-pointer hover:bg-white transition">
                        <div className="w-5 h-5 rounded border border-gray-300 shrink-0" style={{ background: coverBg }} />
                        <span className="text-[9px] text-gray-600 font-medium">Culoare</span>
                        <input
                          type="color"
                          value={coverBg}
                          onChange={(e) => useEditorStore.getState().updateCoverBg(e.target.value)}
                          className="w-0 h-0 opacity-0 absolute"
                        />
                      </label>
                      {isChanged && (
                        <button
                          onClick={() => useEditorStore.getState().updateCoverBg(originalBg)}
                          className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm hover:bg-white transition"
                          title="Revino la culoarea inițială"
                        >
                          <div className="w-4 h-4 rounded border border-gray-300 shrink-0" style={{ background: originalBg }} />
                          <span className="text-[9px] text-gray-500">Resetează</span>
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* ═══ COVER GUIDES — bleed, safe zone, cotor (same as admin) ═══ */}
                {(() => {
                  const bleedMm = (coverDims.bleed || 1.5) * 10; // 15mm
                  const safeMm = 5; // 5mm inside bleed
                  const totalWmm = coverDims.totalW * 10;
                  const totalHmm = coverDims.totalH * 10;
                  const scale = canvasW / totalWmm;
                  const bleedPx = bleedMm * scale;
                  const safePx = (bleedMm + safeMm) * scale;
                  return (
                    <>
                      {/* BLEED — red dashed */}
                      <div className="absolute border-[1.5px] border-dashed border-red-400/50 pointer-events-none z-[15]" style={{
                        left: bleedPx, top: bleedPx,
                        width: canvasW - bleedPx * 2, height: canvasH - bleedPx * 2,
                      }}>
                        <span className="absolute -top-3 left-1 text-[7px] text-red-400/70 font-mono">BLEED {bleedMm.toFixed(0)}mm</span>
                      </div>
                      {/* SAFE ZONE — green dashed */}
                      <div className="absolute border-[1.5px] border-dashed border-green-400/50 pointer-events-none z-[15]" style={{
                        left: safePx, top: safePx,
                        width: canvasW - safePx * 2, height: canvasH - safePx * 2,
                      }}>
                        <span className="absolute -top-3 left-1 text-[7px] text-green-500/70 font-mono">SAFE ZONE</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            );
          })()}

        </div>
        )}
      </div>

      {/* Prev/Next — desktop only */}
      <button onClick={prevSpread} disabled={isFirst}
        className={`absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-[#E0DDD8] bg-[#E8E4DB] text-[#5C544B] hidden sm:flex items-center justify-center transition-opacity ${isFirst ? 'opacity-15' : 'hover:bg-[#E0DDD8]'}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button onClick={nextSpread} disabled={isLast}
        className={`absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-[#E0DDD8] bg-[#E8E4DB] text-[#5C544B] hidden sm:flex items-center justify-center transition-opacity ${isLast ? 'opacity-15' : 'hover:bg-[#E0DDD8]'}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      {/* Template picker */}
      <TemplatePicker isOpen={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} />
    </div>
  );
}
