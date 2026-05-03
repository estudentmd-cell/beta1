import { useMemo, useCallback, useRef, useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import useEditorStore from '../../stores/useEditorStore';
import useProjectStore from '../../stores/useProjectStore';
import { computeRects } from '../../utils/layoutEngine';
import { getDimensions } from '../../utils/dimensions';
import { getCoverDimensions } from '../../utils/coverDimensions';
import { FrameImage, CameraIcon } from './SpreadCanvas';

/* ── Frame action bar — fixed bottom, mobile native: Mută + Șterge ── */
function FrameActionBar({ leafId, spreadIdx }) {
  const removeFromFrame = useEditorStore((s) => s.removeFromFrame);
  const removeCoverPhoto = useEditorStore((s) => s.removeCoverPhoto);
  const panActive = useEditorStore((s) => s.panActive);
  const spreads = useEditorStore((s) => s.spreads);
  const isCover = spreads[spreadIdx]?.isCover;

  const handleMove = (e) => {
    e.stopPropagation();
    useEditorStore.setState({ panActive: true, panLeaf: leafId, selectedFrame: null });
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    useEditorStore.getState().goToSpread(spreadIdx);
    if (isCover) {
      removeCoverPhoto(leafId);
      useEditorStore.setState({ selectedFrame: null });
    } else {
      removeFromFrame(leafId);
    }
  };

  if (panActive) return null;

  return (
    <div className="fixed bottom-[56px] left-0 right-0 z-[45] sm:hidden animate-[fadeIn_0.12s_ease]"
      style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="bg-white border-t border-[#E8E4DB] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-3 py-2">
        <div className="flex items-center justify-center gap-3">
          {/* Mută — repoziționează poza în cadru */}
          <button onClick={handleMove}
            className="flex items-center gap-1.5 h-11 px-5 rounded-xl bg-[#E8F2ED] text-[#3D6B5E] text-[13px] font-semibold active:scale-95 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3" />
              <line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
            </svg>
            Mută
          </button>
          {/* Șterge */}
          <button onClick={handleRemove}
            className="flex items-center gap-1.5 h-11 px-5 rounded-xl bg-[#FDE8E5] text-[#B54A3A] text-[13px] font-semibold active:scale-95 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Șterge
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Single photo frame with touch drag for crop + long-press to swap ── */
function TouchFrame({ leaf, x, y, w, h, spreadIdx, selectedFrame, selectFrame, onEmptyTap, dragSwap }) {
  const photo = leaf.photo;
  const crop = leaf.cropOffset || { opx: 50, opy: 50 };
  const isSelected = selectedFrame === leaf.id;
  const swapSource = useEditorStore((s) => s.swapSource);
  const isSwapSource = swapSource === leaf.id;
  const isSwapTarget = swapSource && swapSource !== leaf.id && photo;
  const elRef = useRef(null);
  const dragState = useRef(null);
  const longPressTimer = useRef(null);

  const isPanning = useEditorStore((s) => s.panActive && s.panLeaf === leaf.id);
  const isDragSource = dragSwap.sourceLeafId === leaf.id;
  const isDragOver = dragSwap.targetLeafId === leaf.id && dragSwap.sourceLeafId !== leaf.id;

  // Register frame rect for drag hit testing
  useEffect(() => {
    const el = elRef.current;
    if (!el || !photo) return;
    const rect = el.getBoundingClientRect();
    dragSwap.registerFrame(leaf.id, rect);
    return () => dragSwap.unregisterFrame(leaf.id);
  }, [photo, leaf.id, x, y, w, h]);

  // Native touch listeners (passive: false) for iOS Safari crop drag — only in pan mode
  useEffect(() => {
    const el = elRef.current;
    if (!el || !isPanning || !photo) return;

    const onStart = (e) => {
      const t = e.touches[0];
      const freshCrop = leaf.cropOffset || { opx: 50, opy: 50 };
      dragState.current = {
        startX: t.clientX, startY: t.clientY,
        startOpx: freshCrop.opx, startOpy: freshCrop.opy,
        moved: false,
      };
    };

    const onMove = (e) => {
      if (!dragState.current) return;
      e.preventDefault(); // BLOCKS scroll on iOS
      e.stopPropagation();
      const t = e.touches[0];
      const dx = t.clientX - dragState.current.startX;
      const dy = t.clientY - dragState.current.startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragState.current.moved = true;
      const sens = Math.max(w, h) * 0.5;
      useEditorStore.getState().updateCropOffset(leaf.id,
        dragState.current.startOpx - (dx / sens) * 100,
        dragState.current.startOpy - (dy / sens) * 100);
    };

    const onEnd = () => { dragState.current = null; };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false }); // CRITICAL: passive false
    el.addEventListener('touchend', onEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [isPanning, photo, leaf, w, h]);

  // Long press detection — only touchstart needed, drag handled at document level
  useEffect(() => {
    const el = elRef.current;
    if (!el || !photo || isPanning) return;

    let startX, startY;

    const onStart = (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      longPressTimer.current = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(30);
        dragSwap.startDrag(leaf.id, photo.previewUrl, t.clientX, t.clientY, w, h);
      }, 400);
    };

    const onMove = (e) => {
      // Cancel long press if finger moved before timer fires
      if (longPressTimer.current) {
        const t = e.touches[0];
        if (Math.abs(t.clientX - startX) > 8 || Math.abs(t.clientY - startY) > 8) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
    };

    const onEnd = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [photo, isPanning, leaf.id, w, h]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    // Don't select if we were dragging
    if (dragSwap.dragRef.current.active) return;
    if (dragState.current?.moved) { dragState.current.moved = false; return; }
    // If in pan mode, tap exits pan
    if (isPanning) {
      useEditorStore.setState({ panActive: false, panLeaf: null, selectedFrame: leaf.id });
      return;
    }
    // Swap mode active (from button on desktop) — tap target completes
    if (swapSource && photo && swapSource !== leaf.id) {
      useEditorStore.getState().completeSwap(leaf.id);
      return;
    }
    if (photo) {
      useEditorStore.getState().goToSpread(spreadIdx);
      selectFrame(leaf.id);
    } else {
      onEmptyTap();
    }
  }, [photo, spreadIdx, leaf.id, selectFrame, onEmptyTap, swapSource, isPanning]);

  return (
    <div
      ref={elRef}
      data-leaf-id={leaf.id}
      className={`absolute overflow-hidden transition-all duration-150 ${isSelected ? 'ring-[2.5px] ring-[#3D6B5E] z-10' : ''} ${isSwapSource ? 'ring-[3px] ring-[#3D6B5E] z-10' : ''} ${isSwapTarget ? 'ring-2 ring-dashed ring-[#3D6B5E]/40 z-[8]' : ''} ${isDragSource ? 'opacity-30 scale-95' : ''} ${isDragOver ? 'ring-[3px] ring-[#3D6B5E] scale-[1.03] z-[8]' : ''}`}
      style={{ left: x, top: y, width: Math.max(w, 0), height: Math.max(h, 0), borderRadius: 1, touchAction: isPanning ? 'none' : 'auto' }}
      onClick={handleClick}
    >
      {photo ? (
        (photo.previewUrl) ? (
          <img
            src={photo.previewUrl}
            alt=""
            className="w-full h-full object-cover select-none pointer-events-none"
            loading="lazy" decoding="async"
            style={{ objectPosition: `${crop.opx}% ${crop.opy}%` }}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-[#F5F1EB]" />
        )
      ) : (
        <div className="w-full h-full bg-[#E8E5E0] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B0AAA2" strokeWidth="1.5">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
      )}
      {/* Pan mode — subtle border indicator, no button */}
      {isPanning && (
        <div className="absolute inset-0 z-20 border-2 border-[#3D6B5E]/60 pointer-events-none rounded-sm">
          <div className="absolute inset-x-0 top-0 flex justify-center pt-1">
            <span className="text-white text-[9px] font-semibold bg-black/40 px-2 py-0.5 rounded-full">Trage pentru a cadra</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Mobile cover text — tap to open editing popup ── */
function MobileCoverText({ tz, x, y, w, h, fontSize }) {
  const [editing, setEditing] = useState(false);
  const [localText, setLocalText] = useState(tz.text || '');
  const [localFont, setLocalFont] = useState(tz.fontFamily || 'sans-serif');
  const [localSize, setLocalSize] = useState(tz.fontSize || 7);
  const [localColor, setLocalColor] = useState(tz.color || '#1D1B18');
  const [localWeight, setLocalWeight] = useState(tz.fontWeight || 'normal');
  const inputRef = useRef(null);

  const handleOpen = () => { setLocalText(tz.text || ''); setLocalFont(tz.fontFamily || 'sans-serif'); setLocalSize(tz.fontSize || 7); setLocalColor(tz.color || '#1D1B18'); setLocalWeight(tz.fontWeight || 'normal'); setEditing(true); setTimeout(() => inputRef.current?.focus(), 200); };
  const handleDone = () => {
    const store = useEditorStore.getState();
    const coverIdx = store.spreads.findIndex(s => s.isCover);
    if (coverIdx >= 0 && store.currentSpread !== coverIdx) store.goToSpread(coverIdx);
    setTimeout(() => { const s = useEditorStore.getState(); s.setCoverText(tz.id, localText); s.updateCoverTextStyle(tz.id, 'fontFamily', localFont); s.updateCoverTextStyle(tz.id, 'fontSize', localSize); s.updateCoverTextStyle(tz.id, 'color', localColor); s.updateCoverTextStyle(tz.id, 'fontWeight', localWeight); }, 50);
    setEditing(false);
  };
  const fonts = [{ v: 'sans-serif', l: 'Sans-serif' }, { v: "'Playfair Display', serif", l: 'Playfair' }, { v: "'Montserrat', sans-serif", l: 'Montserrat' }, { v: "'Lora', serif", l: 'Lora' }, { v: "'Great Vibes', cursive", l: 'Great Vibes' }, { v: "'Parisienne', cursive", l: 'Parisienne' }, { v: "'Allura', cursive", l: 'Allura' }];

  return (
    <>
      <div className="absolute flex flex-col items-center justify-center z-[4] cursor-pointer" style={{ left: x, top: y, width: w, height: h, transform: tz.rotation ? `rotate(${tz.rotation}deg)` : undefined, transformOrigin: 'center center' }}
        onClick={(e) => { e.stopPropagation(); handleOpen(); }}>
        <span className="truncate" style={{ fontSize, fontWeight: tz.fontWeight || 'normal', fontStyle: tz.fontStyle || 'normal', fontFamily: tz.fontFamily || 'sans-serif', color: tz.text ? (tz.color || '#1D1B18') : 'rgba(0,0,0,0.25)', textAlign: tz.textAlign || 'center', display: 'block', width: '100%' }}>
          {tz.text || tz.placeholder || 'Text'}
        </span>
        {!tz.text && <span className="text-[8px] text-[#3D6B5E] bg-white/80 px-2 py-0.5 rounded-full mt-0.5 animate-pulse">Atinge pentru a edita</span>}
      </div>
      {editing && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black/40" onClick={handleDone}>
          <div className="flex-1" />
          <div className="bg-white rounded-t-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center py-2"><div className="w-10 h-1 bg-[#D0CAC0] rounded-full" /></div>
            <div className="px-5 py-3 bg-[#F9F8F5] border-b border-[#E8E4DB] flex items-center justify-center min-h-[50px]">
              <span style={{ fontSize: Math.min(localSize * 5, 36), fontFamily: localFont, fontWeight: localWeight, color: localColor }}>{localText || 'Preview'}</span>
            </div>
            <div className="px-5 py-3">
              <input ref={inputRef} value={localText} onChange={e => setLocalText(e.target.value)} placeholder={tz.placeholder || 'Scrie textul'}
                className="w-full text-center text-[16px] bg-[#F5F3F0] rounded-xl px-4 py-3 outline-none border border-[#E8E4DB] focus:border-[#3D6B5E]"
                style={{ fontFamily: localFont, fontWeight: localWeight, color: localColor }} />
            </div>
            <div className="px-3 pb-2"><div className="flex overflow-x-auto gap-1.5 pb-1" style={{ scrollbarWidth: 'none' }}>
              {fonts.map(f => (<button key={f.v} onClick={() => setLocalFont(f.v)} className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] ${localFont === f.v ? 'bg-[#3D6B5E] text-white' : 'bg-[#F0EDE6] text-[#5C544B]'}`} style={{ fontFamily: f.v }}>{f.l}</button>))}
            </div></div>
            <div className="px-5 pb-4 flex items-center justify-between gap-2">
              <div className="flex items-center border border-[#E8E4DB] rounded-lg overflow-hidden">
                <button onClick={() => setLocalSize(Math.max(1, localSize - 0.5))} className="px-2.5 py-2 text-[14px] font-bold text-[#5C544B]">−</button>
                <span className="px-2 py-2 text-[12px] font-mono border-x border-[#E8E4DB] min-w-[32px] text-center">{Math.round(localSize * 5)}</span>
                <button onClick={() => setLocalSize(Math.min(20, localSize + 0.5))} className="px-2.5 py-2 text-[14px] font-bold text-[#5C544B]">+</button>
              </div>
              <button onClick={() => setLocalWeight(localWeight === 'bold' ? 'normal' : 'bold')} className={`w-10 h-10 rounded-lg flex items-center justify-center text-[16px] font-bold ${localWeight === 'bold' ? 'bg-[#1c1c1c] text-white' : 'bg-[#F0EDE6] text-[#5C544B]'}`}>B</button>
              <label className="w-10 h-10 rounded-lg border border-[#E8E4DB] flex items-center justify-center cursor-pointer relative">
                <div className="w-6 h-6 rounded" style={{ background: localColor }} />
                <input type="color" value={localColor} onChange={e => setLocalColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>
            </div>
            <div className="px-5 pb-5"><button onClick={handleDone} className="w-full py-3 rounded-xl bg-[#3D6B5E] text-white text-[14px] font-bold active:scale-[0.98]">Gata ✓</button></div>
          </div>
        </div>, document.body
      )}
    </>
  );
}

/* ── Cover photo frame with pan support ── */
function CoverPhotoFrame({ frame, photo, crop, fx, fy, fw, fh, borderPx, isSelected, isPanning, spreadIdx }) {
  const elRef = useRef(null);
  const dragState = useRef(null);

  // Pan touch handlers for cover frames
  useEffect(() => {
    const el = elRef.current;
    if (!el || !isPanning || !photo) return;

    const onStart = (e) => {
      const t = e.touches[0];
      const freshCrop = frame.cropOffset || { opx: 50, opy: 50 };
      dragState.current = { startX: t.clientX, startY: t.clientY, startOpx: freshCrop.opx, startOpy: freshCrop.opy };
    };
    const onMove = (e) => {
      if (!dragState.current) return;
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - dragState.current.startX;
      const dy = t.clientY - dragState.current.startY;
      const sens = Math.max(fw, fh) * 0.5;
      useEditorStore.getState().updateCoverCrop(frame.id,
        dragState.current.startOpx - (dx / sens) * 100,
        dragState.current.startOpy - (dy / sens) * 100);
    };
    const onEnd = () => { dragState.current = null; };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [isPanning, photo, frame, fw, fh]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (isPanning) {
      useEditorStore.setState({ panActive: false, panLeaf: null, selectedFrame: frame.id });
      return;
    }
    if (photo) {
      useEditorStore.getState().goToSpread(spreadIdx);
      useEditorStore.setState({ selectedFrame: frame.id });
    } else {
      window.dispatchEvent(new CustomEvent('openMobilePhotoSheet'));
    }
  };

  return (
    <div ref={elRef}
      className={`absolute overflow-hidden rounded-sm z-[3] ${isSelected ? 'ring-[2.5px] ring-[#3D6B5E] z-10' : ''}`}
      style={{ left: fx, top: fy, width: fw, height: fh, padding: borderPx, background: borderPx > 0 ? (frame.borderColor || '#FFFFFF') : undefined, touchAction: isPanning ? 'none' : 'auto', transform: frame.rotation ? `rotate(${frame.rotation}deg)` : undefined, transformOrigin: 'center center' }}
      onClick={handleClick}>
      <div className="w-full h-full overflow-hidden rounded-sm">
        {photo?.previewUrl ? (
          <img src={photo.previewUrl} alt="" className="w-full h-full object-cover select-none pointer-events-none" style={{ objectPosition: `${crop.opx}% ${crop.opy}%` }} draggable={false} />
        ) : (
          <div className="w-full h-full bg-[#E8E4DB] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B0AAA2" strokeWidth="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
        )}
      </div>
      {isPanning && (
        <div className="absolute inset-0 z-20 border-2 border-[#3D6B5E]/60 pointer-events-none rounded-sm">
          <div className="absolute inset-x-0 top-0 flex justify-center pt-1">
            <span className="text-white text-[9px] font-semibold bg-black/40 px-2 py-0.5 rounded-full">Trage pentru a cadra</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Mini canvas for a single spread ── */
const MobileSpreadCard = memo(function MobileSpreadCard({ spread, spreadIdx, canvasW, dragSwap }) {
  const { productConfig } = useProjectStore.getState();
  const formatStr = productConfig?.format || '20×20';
  const [fW, fH] = formatStr.split('×').map(Number);

  const spreadRatio = (2 * fW) / fH;
  const canvasH = Math.round(canvasW / spreadRatio);
  const spineW = 2;
  const halfW = (canvasW - spineW) / 2;
  const gapMM = useEditorStore.getState().gapMM;
  const gapPx = (gapMM / 25.4) * 300 * (canvasW / 2000);

  const selectedFrame = useEditorStore((s) => s.selectedFrame);
  const selectFrame = useEditorStore((s) => s.selectFrame);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const _tick = useEditorStore((s) => s._tick);

  const hasPhotos = spread.photos?.length > 0;
  const mode = spread.mode || 'spread';
  const isSpreadMode = mode === 'spread';

  const sDims = getDimensions(productConfig?.slug, formatStr);
  const bMm = sDims?.spread?.bleed || 3;
  const cMm = sDims?.spread?.cotor || 0;
  // Use fraction-based bleed (no rounding) — ensures identical frame aspect ratios on any screen size
  const bFrac = bMm / (fH * 10); // fraction of total height
  const cFrac = (cMm / 2) / (fW * 10); // fraction of half-width
  const bH = canvasH * bFrac;
  const bW = canvasW * bFrac;
  const cW = (canvasW / 2) * cFrac;

  const handleEmptyFrameTap = useCallback(() => {
    useEditorStore.getState().goToSpread(spreadIdx);
    window.dispatchEvent(new CustomEvent('openMobilePhotoSheet'));
  }, [spreadIdx]);

  const renderFrames = useCallback((tree, ox, oy, pw, ph, pgBounds) => {
    if (!tree) return null;
    const b = pgBounds || null;
    const pL = b ? pw * (b.left||0) : 0, pR = b ? pw * (b.right||0) : 0;
    const pT = b ? ph * (b.top||0) : 0, pB = b ? ph * (b.bottom||0) : 0;
    const rects = computeRects(tree, ox + pL, oy + pT, pw - pL - pR, ph - pT - pB, gapPx);
    return rects.map((rect) => (
      <TouchFrame
        key={rect.leaf.id}
        leaf={rect.leaf}
        x={rect.x} y={rect.y} w={rect.w} h={rect.h}
        spreadIdx={spreadIdx}
        selectedFrame={selectedFrame}
        selectFrame={selectFrame}
        onEmptyTap={handleEmptyFrameTap}
        dragSwap={dragSwap}
      />
    ));
  }, [gapPx, selectedFrame, selectFrame, spreadIdx, _tick, handleEmptyFrameTap, dragSwap]);

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{ width: canvasW, height: canvasH, boxShadow: '0 2px 8px rgba(44,37,32,.1)', background: spread.isCover ? (spread.coverTemplate?.coverStyle?.bg || useProjectStore.getState().coverTemplate?.coverStyle?.bg || '#FFFFFF') : '#FFFFFF' }}
      onClick={() => { if (!useEditorStore.getState().swapSource) clearSelection(); }}
    >
      {/* Spine */}
      <div className="absolute top-0 bottom-0 bg-[#E0DBD4] z-[5]" style={{ left: halfW, width: spineW }} />

      {/* Frames */}
      {hasPhotos && !spread.isCover && (
        isSpreadMode ? (
          renderFrames(spread.full?.tree, bW, bH, canvasW - bW * 2, canvasH - bH * 2, spread.full?.bounds)
        ) : (
          <>
            {renderFrames(spread.left?.tree, bW, bH, halfW - bW - cW, canvasH - bH * 2, spread.left?.bounds)}
            {renderFrames(spread.right?.tree, halfW + spineW + cW, bH, halfW - cW - bW, canvasH - bH * 2, spread.right?.bounds)}
          </>
        )
      )}

      {/* Cover */}
      {spread.isCover && (() => {
        const coverTpl = spread.coverTemplate || useProjectStore.getState().coverTemplate;
        const coverBg = coverTpl?.coverStyle?.bg || '#FFFFFF';
        // Pick design image based on format: portrait (20×30) or square (others)
        const fmt = productConfig?.format || '20×20';
        const isPortraitFmt = fmt === '20×30';
        const coverDesignImg = isPortraitFmt
          ? (coverTpl?.coverStyle?.designPortrait || coverTpl?.coverStyle?.bgImage)
          : (coverTpl?.coverStyle?.designSquare || coverTpl?.coverStyle?.bgImage);
        const coverBgImage = coverDesignImg || coverTpl?.coverStyle?.bgImage;
        const coverDims = getCoverDimensions(fmt, productConfig?.initialPages || 40, productConfig?.slug || 'pagini-groase');
        const spineRealCm = coverDims.spineW;
        const totalRealCm = coverDims.totalW;
        const spinePx = Math.round((spineRealCm / totalRealCm) * canvasW);
        const backW2 = Math.round((fW / totalRealCm) * canvasW);
        const frontW2 = canvasW - backW2 - spinePx;
        return (
          <div className="absolute inset-0 z-[2]">
            {/* Full spread background — stretched to fill (no crop, matches admin 1:1) */}
            <div className="absolute rounded-sm overflow-hidden" style={{ left: 0, top: 0, width: canvasW, height: canvasH, background: coverBg }}>
              {coverBgImage && <img src={coverBgImage} alt="" style={{ width: '100%', height: '100%', display: 'block' }} />}
            </div>
            <div className="absolute pointer-events-none" style={{ left: backW2, top: 0, width: spinePx, height: canvasH }}>
              <div className="absolute inset-0 bg-black/5" />
              <div className="absolute inset-x-0 top-2 text-center text-[6px] text-black/20 font-mono">COTOR</div>
            </div>
            {/* Decorative images from admin */}
            {(coverTpl?.decorImages || []).map((di) => (
              di.src && <div key={di.id} className="absolute overflow-hidden pointer-events-none"
                style={{
                  left: backW2 + spinePx + (di.x / 100) * frontW2,
                  top: (di.y / 100) * canvasH,
                  width: (di.w / 100) * frontW2,
                  height: (di.h / 100) * canvasH,
                  transform: di.rotation ? `rotate(${di.rotation}deg)` : undefined,
                  transformOrigin: 'center center',
                }}>
                <img src={di.src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {/* Decorative texts from admin */}
            {(coverTpl?.decorTexts || []).map((dt) => (
              <div key={dt.id} className="absolute pointer-events-none flex items-center justify-center"
                style={{
                  left: backW2 + spinePx + (dt.x / 100) * frontW2,
                  top: (dt.y / 100) * canvasH,
                  width: (dt.w / 100) * frontW2,
                  height: (dt.h / 100) * canvasH,
                  transform: dt.rotation ? `rotate(${dt.rotation}deg)` : undefined,
                  transformOrigin: 'center center',
                }}>
                <span style={{
                  fontSize: Math.max(6, dt.fontSize * (frontW2 / 400)),
                  fontWeight: dt.fontWeight || 'normal',
                  color: dt.color || '#2C2520',
                  fontFamily: dt.fontFamily || "'DM Serif Display', Georgia, serif",
                }}>
                  {dt.text}
                </span>
              </div>
            ))}

            {/* ═══ COVER GUIDES — bleed, safe zone (same as admin) ═══ */}
            {(() => {
              const bleedMm = (coverDims.bleed || 1.5) * 10;
              const safeMm = 5;
              const totalWmm = coverDims.totalW * 10;
              const sc = canvasW / totalWmm;
              const bleedPx = bleedMm * sc;
              const safePx = (bleedMm + safeMm) * sc;
              return (
                <>
                  <div className="absolute border-[1px] border-dashed border-red-400/40 pointer-events-none z-[15]" style={{
                    left: bleedPx, top: bleedPx,
                    width: canvasW - bleedPx * 2, height: canvasH - bleedPx * 2,
                  }}>
                    <span className="absolute -top-2.5 left-0.5 text-[5px] text-red-400/60 font-mono">BLEED</span>
                  </div>
                  <div className="absolute border-[1px] border-dashed border-green-400/40 pointer-events-none z-[15]" style={{
                    left: safePx, top: safePx,
                    width: canvasW - safePx * 2, height: canvasH - safePx * 2,
                  }}>
                    <span className="absolute -top-2.5 left-0.5 text-[5px] text-green-500/60 font-mono">SAFE</span>
                  </div>
                </>
              );
            })()}
            {/* Color picker for solid-color covers */}
            {!coverBgImage && (
              <label className="absolute z-20 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm cursor-pointer"
                style={{ top: 6, right: 6 }}>
                <div className="w-4 h-4 rounded border border-gray-300 shrink-0" style={{ background: coverBg }} />
                <span className="text-[8px] text-gray-600 font-medium">Culoare</span>
                <input type="color" value={coverBg}
                  onChange={(e) => useEditorStore.getState().updateCoverBg(e.target.value)}
                  className="w-0 h-0 opacity-0 absolute" />
              </label>
            )}

            {/* Cover photo frames */}
            {(() => {
              const cd = getCoverDimensions(productConfig?.format || '20×20', productConfig?.initialPages || 40, productConfig?.slug || 'pagini-groase');
              const bW2 = Math.round((fW / cd.totalW) * canvasW);
              const sPx = Math.round((cd.spineW / cd.totalW) * canvasW);
              const fW2 = canvasW - bW2 - sPx;
              return (spread.coverFrames || []).map((frame) => {
                const fx = bW2 + sPx + (frame.x / 100) * fW2;
                const fy = (frame.y / 100) * canvasH;
                const fw = (frame.w / 100) * fW2;
                const fh = (frame.h / 100) * canvasH;
                const frameRotation = frame.rotation || 0;
                const photo = frame.photo;
                const crop = frame.cropOffset || photo?.cropOffset || { opx: 50, opy: 50 };
                const borderPx = frame.borderWidth > 0 ? Math.max(2, frame.borderWidth * (canvasH / 1000)) : 0;
                const isFrameSelected = selectedFrame === frame.id;
                const isFramePanning = useEditorStore.getState().panActive && useEditorStore.getState().panLeaf === frame.id;
                return (
                  <CoverPhotoFrame key={frame.id} frame={frame} photo={photo} crop={crop}
                    fx={fx} fy={fy} fw={fw} fh={fh} borderPx={borderPx}
                    isSelected={isFrameSelected} isPanning={isFramePanning}
                    spreadIdx={spreadIdx} />
                );
              });
            })()}

            {/* Cover text zones — tap to edit */}
            {(() => {
              const cd2 = getCoverDimensions(productConfig?.format || '20×20', productConfig?.initialPages || 40, productConfig?.slug || 'pagini-groase');
              const bW2t = Math.round((fW / cd2.totalW) * canvasW);
              const sPxt = Math.round((cd2.spineW / cd2.totalW) * canvasW);
              const fW2t = canvasW - bW2t - sPxt;
              return (spread.coverTexts || []).map((tz) => {
                const tx = bW2t + sPxt + (tz.x / 100) * fW2t;
                const ty = (tz.y / 100) * canvasH;
                const tw = (tz.w / 100) * fW2t;
                const th = (tz.h / 100) * canvasH;
                const fontSize = Math.max(6, (tz.fontSize / 100) * canvasH);
                return <MobileCoverText key={tz.id} tz={tz} x={tx} y={ty} w={tw} h={th} fontSize={fontSize} />;
              });
            })()}
          </div>
        );
      })()}

      {/* Empty state */}
      {!hasPhotos && !spread.isCover && (
        <div className="absolute inset-0 z-0 flex cursor-pointer" onClick={handleEmptyFrameTap}>
          <div className="flex-1 bg-[#E8E5E0] m-1 rounded-sm flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B0AAA2" strokeWidth="1.5">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <div className="flex-1 bg-[#E8E5E0] m-1 rounded-sm flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B0AAA2" strokeWidth="1.5">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
});

/* ── Drag-to-swap controller — long press + drag between frames ── */
function useDragSwap() {
  const [state, setState] = useState({ sourceLeafId: null, targetLeafId: null, ghostSrc: null, ghostX: 0, ghostY: 0, ghostW: 0, ghostH: 0 });
  const framesRef = useRef({});
  const dragRef = useRef({ active: false, sourceLeafId: null }); // ref for touch handlers (no stale closures)

  const registerFrame = useCallback((leafId, rect) => {
    framesRef.current[leafId] = rect;
  }, []);
  const unregisterFrame = useCallback((leafId) => {
    delete framesRef.current[leafId];
  }, []);

  // Hit test helper
  const hitTest = (cx, cy) => {
    for (const [lid, rect] of Object.entries(framesRef.current)) {
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) return lid;
    }
    return null;
  };

  // Document-level handlers (attached on drag start, removed on drag end)
  const onDocMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    e.preventDefault();
    const t = e.touches[0];
    const hitLeaf = hitTest(t.clientX, t.clientY);
    setState((prev) => ({ ...prev, ghostX: t.clientX, ghostY: t.clientY, targetLeafId: hitLeaf }));
  }, []);

  const onDocEnd = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    document.removeEventListener('touchmove', onDocMove);
    document.removeEventListener('touchend', onDocEnd);
    document.removeEventListener('touchcancel', onDocEnd);

    setState((prev) => {
      if (prev.sourceLeafId && prev.targetLeafId && prev.sourceLeafId !== prev.targetLeafId) {
        useEditorStore.getState().startSwap(prev.sourceLeafId);
        setTimeout(() => useEditorStore.getState().completeSwap(prev.targetLeafId), 0);
      }
      return { sourceLeafId: null, targetLeafId: null, ghostSrc: null, ghostX: 0, ghostY: 0, ghostW: 0, ghostH: 0 };
    });
  }, [onDocMove]);

  const startDrag = useCallback((leafId, previewUrl, cx, cy, fw, fh) => {
    useEditorStore.getState().clearSelection();
    // Refresh all frame rects
    document.querySelectorAll('[data-leaf-id]').forEach((el) => {
      framesRef.current[el.dataset.leafId] = el.getBoundingClientRect();
    });
    dragRef.current = { active: true, sourceLeafId: leafId };
    setState({ sourceLeafId: leafId, targetLeafId: null, ghostSrc: previewUrl, ghostX: cx, ghostY: cy, ghostW: fw, ghostH: fh });

    // Attach to document so events always fire
    document.addEventListener('touchmove', onDocMove, { passive: false });
    document.addEventListener('touchend', onDocEnd, { passive: true });
    document.addEventListener('touchcancel', onDocEnd, { passive: true });
  }, [onDocMove, onDocEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('touchmove', onDocMove);
      document.removeEventListener('touchend', onDocEnd);
      document.removeEventListener('touchcancel', onDocEnd);
    };
  }, [onDocMove, onDocEnd]);

  return { ...state, registerFrame, unregisterFrame, startDrag, dragRef };
}

/* ── Main vertical editor — scroll through all spreads ── */
export default function MobileVerticalEditor({ isApprovalMode = false }) {
  const spreads = useEditorStore((s) => s.spreads);
  const currentSpread = useEditorStore((s) => s.currentSpread);
  const goToSpread = useEditorStore((s) => s.goToSpread);
  const sbarMN = useEditorStore((s) => s.sbarMN);
  const sbarLN = useEditorStore((s) => s.sbarLN);
  const sbarRN = useEditorStore((s) => s.sbarRN);
  const swapSource = useEditorStore((s) => s.swapSource);
  const cancelSwap = useEditorStore((s) => s.cancelSwap);
  const panActive = useEditorStore((s) => s.panActive);
  const selectedFrame = useEditorStore((s) => s.selectedFrame);
  const dragSwap = useDragSwap();

  const hasCover = spreads[0]?.isCover;
  const scrollRef = useRef(null);
  const cardRefs = useRef({});

  const canvasW = typeof window !== 'undefined' ? Math.min(window.innerWidth - 32, 500) : 340;

  // Simple scroll detection — only when gallery is NOT open
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Don't override selection when gallery is open
        if (document.querySelector('[data-gallery-open]')) return;
        let bestIdx = -1, bestRatio = 0;
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            const idx = parseInt(entry.target.dataset.spreadIdx);
            if (!isNaN(idx)) bestIdx = idx;
          }
        });
        if (bestIdx >= 0 && bestIdx !== useEditorStore.getState().currentSpread) {
          // Nu selecta cover-ul automat prin scroll — doar prin tap explicit
          const targetSpread = useEditorStore.getState().spreads[bestIdx];
          if (targetSpread?.isCover) return;
          goToSpread(bestIdx);
        }
      },
      { root: container, threshold: [0.3, 0.5, 0.7] }
    );
    Object.values(cardRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [spreads.length, goToSpread]);

  // scrollIntoView from MobilePagesSheet
  useEffect(() => {
    const handler = (e) => {
      const idx = e.detail?.spreadIdx;
      const el = cardRefs.current[idx];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    window.addEventListener('scrollToSpread', handler);
    return () => window.removeEventListener('scrollToSpread', handler);
  }, []);

  // When gallery opens, scroll current rotation to top
  useEffect(() => {
    const handler = () => {
      const idx = useEditorStore.getState().currentSpread;
      const el = cardRefs.current[idx];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('galleryOpened', handler);
    return () => window.removeEventListener('galleryOpened', handler);
  }, []);


  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#F5F3F0] px-4 py-3" style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}>

      {spreads.map((spread, i) => {
        const isCurrent = i === currentSpread;
        const isCover = spread.isCover;
        const hasPhotos = spread.photos?.length > 0;
        const rotLabel = isCover ? 'Copertă' : `Rotația ${i + (hasCover ? 0 : 1)}`;

        return (
          <div
            key={spread.id}
            ref={(el) => { cardRefs.current[i] = el; }}
            data-spread-idx={i}
            className={`mb-5 rounded-2xl ${isCurrent ? 'bg-white shadow-md ring-2 ring-[#3D6B5E]/20 p-3' : 'p-3 bg-transparent'}`}
            onClick={() => { if (!isCurrent) { goToSpread(i); } }}
          >
            {/* Label */}
            <div className="mb-1.5 px-1 flex items-center gap-2">
              {isCurrent && <div className="w-2 h-2 rounded-full bg-[#3D6B5E] shrink-0" />}
              <span className={`text-[13px] font-semibold ${isCurrent ? 'text-[#3D6B5E]' : 'text-[#B0A89E]'}`}>
                {rotLabel}
              </span>
            </div>

            {/* Canvas */}
            <div className="flex justify-center">
              <MobileSpreadCard spread={spread} spreadIdx={i} canvasW={canvasW - 24} dragSwap={dragSwap} />
            </div>

            {/* Controls — centered under spread */}
            {!isCover && !isApprovalMode && (
              <div className="flex items-center justify-center gap-3 mt-2.5 mb-1">
                <button
                  onClick={() => { if (currentSpread !== i) goToSpread(i); setTimeout(() => { sbarLN(); useEditorStore.setState({ _tick: Date.now() }); }, 50); }}
                  disabled={!hasPhotos}
                  className="h-10 px-4 flex items-center justify-center gap-1 bg-white rounded-xl text-[12px] font-semibold text-[#5C544B] active:scale-95 transition-all disabled:opacity-25 shadow-sm border border-[#E8E4DB]"
                >
                  ◀ Stânga
                </button>
                <button
                  onClick={() => { if (currentSpread !== i) goToSpread(i); setTimeout(() => { sbarMN(); useEditorStore.setState({ _tick: Date.now() }); }, 50); }}
                  disabled={!hasPhotos}
                  className="h-10 px-5 flex items-center justify-center gap-1.5 bg-[#1c1c1c] rounded-xl text-[12px] font-bold text-white active:scale-95 transition-all disabled:opacity-25 shadow-md"
                >
                  🎲 Mix
                </button>
                <button
                  onClick={() => { if (currentSpread !== i) goToSpread(i); setTimeout(() => { sbarRN(); useEditorStore.setState({ _tick: Date.now() }); }, 50); }}
                  disabled={!hasPhotos}
                  className="h-10 px-4 flex items-center justify-center gap-1 bg-white rounded-xl text-[12px] font-semibold text-[#5C544B] active:scale-95 transition-all disabled:opacity-25 shadow-sm border border-[#E8E4DB]"
                >
                  Dreapta ▶
                </button>
                <button
                  onClick={() => { useEditorStore.getState().clearSpread(i); useEditorStore.setState({ _tick: Date.now() }); }}
                  disabled={!hasPhotos}
                  className="h-10 w-10 flex items-center justify-center bg-white rounded-xl text-[#B54A3A] active:scale-95 transition-all disabled:opacity-25 shadow-sm border border-[#E8E4DB]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom spacer */}
      <div className="h-20" />

      {/* Frame action bar — when a photo is selected */}
      {selectedFrame && (
        <FrameActionBar leafId={selectedFrame} spreadIdx={currentSpread} />
      )}

      {/* Drag ghost — follows finger during long-press drag */}
      {dragSwap.sourceLeafId && dragSwap.ghostSrc && createPortal(
        <div className="fixed z-[9999] pointer-events-none" style={{
          left: dragSwap.ghostX - dragSwap.ghostW * 0.4,
          top: dragSwap.ghostY - dragSwap.ghostH * 0.4,
          width: dragSwap.ghostW * 0.8,
          height: dragSwap.ghostH * 0.8,
          opacity: 0.85,
        }}>
          <img src={dragSwap.ghostSrc} alt="" className="w-full h-full object-cover rounded-lg shadow-2xl" draggable={false} />
        </div>,
        document.body
      )}
    </div>
  );
}
