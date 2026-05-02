import { useState, useEffect, memo, useMemo } from 'react';
import useEditorStore from '../../stores/useEditorStore';
import { computeRects } from '../../utils/layoutEngine';

const MiniFrames = memo(function MiniFrames({ tree, ox, oy, pw, ph, pgBounds }) {
  if (!tree) return null;
  const b = pgBounds || null;
  const pL = b ? pw*(b.left||0) : 0, pR = b ? pw*(b.right||0) : 0;
  const pT = b ? ph*(b.top||0) : 0, pB = b ? ph*(b.bottom||0) : 0;
  const rects = computeRects(tree, ox+pL, oy+pT, pw-pL-pR, ph-pT-pB, 0.3);
  return rects.map((rect) => (
    <div key={rect.leaf.id} className="absolute overflow-hidden"
      style={{ left: rect.x, top: rect.y, width: Math.max(rect.w, 0), height: Math.max(rect.h, 0) }}>
      {rect.leaf.photo ? (
        <img src={rect.leaf.photo.thumbData || rect.leaf.photo.blob} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
      ) : (
        <div className="w-full h-full bg-[#E8E5E0]" />
      )}
    </div>
  ));
});

function TrashIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function EditorStrip() {
  const { spreads, currentSpread, goToSpread, clearSpread, moveSpread } = useEditorStore();
  const hasCover = spreads[0]?.isCover;
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [compact, setCompact] = useState(window.innerWidth < 1280);
  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 1280);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleDragStart = (e, idx) => {
    // Don't allow dragging cover
    if (spreads[idx]?.isCover) { e.preventDefault(); return; }
    setDragFrom(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/spread-idx', String(idx));
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (spreads[idx]?.isCover) return;
    setDragOver(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData('text/spread-idx'));
    if (!isNaN(fromIdx) && fromIdx !== idx && !spreads[idx]?.isCover) {
      moveSpread(fromIdx, idx);
    }
    setDragFrom(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  return (
    <div className={`${compact ? 'h-[80px]' : 'h-[92px]'} flex items-center gap-2 px-[10px] overflow-x-auto shrink-0`}
      style={{ scrollbarWidth: 'thin', background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
      {spreads.map((sp, i) => {
        const rotationNum = hasCover ? i : i + 1;
        const isCurrent = i === currentSpread;
        const halfW = compact ? 44 : 55;
        const spineW = 1;
        const isDragTarget = dragOver === i && dragFrom !== i;
        const isDragging = dragFrom === i;
        const hasPhotos = sp.photos?.length > 0;
        const isCover = sp.isCover;

        return (
          <div
            key={sp.id}
            className={`relative group flex flex-col items-center gap-[3px] shrink-0 transition-all ${
              isDragging ? 'opacity-40' : ''
            } ${isDragTarget ? 'scale-105' : ''}`}
            draggable={!isCover}
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
          >
            {/* Drop indicator left */}
            {isDragTarget && (
              <div className="absolute -left-1.5 top-0 bottom-4 w-[3px] bg-[#3D6B5A] rounded-full z-20" />
            )}

            <div className="relative cursor-pointer" onClick={() => goToSpread(i)}>
              <div
                className={`relative overflow-hidden rounded transition-all ${
                  isCurrent
                    ? 'border-2 border-[#3D6B5A] shadow-[0_2px_12px_rgba(61,107,90,.12)]'
                    : 'border-2 border-transparent shadow-[0_1px_4px_rgba(0,0,0,.05)] hover:border-black/5'
                }`}
                style={{ width: compact ? 90 : 110, height: compact ? 46 : 56, background: '#fff' }}
              >
                {/* Spine */}
                <div className="absolute top-0 bottom-0 z-[1]"
                  style={{ left: halfW, width: 0, borderLeft: '0.5px dashed rgba(180,160,50,.3)' }} />

                {hasPhotos ? (
                  sp.mode === 'spread' ? (
                    <MiniFrames tree={sp.full?.tree} ox={0} oy={0} pw={compact ? 90 : 110} ph={compact ? 46 : 56} pgBounds={sp.full?.bounds} />
                  ) : (
                    <>
                      <MiniFrames tree={sp.left?.tree} ox={0} oy={0} pw={halfW} ph={compact ? 46 : 56} pgBounds={sp.left?.bounds} />
                      <MiniFrames tree={sp.right?.tree} ox={halfW + spineW} oy={0} pw={halfW} ph={compact ? 46 : 56} pgBounds={sp.right?.bounds} />
                    </>
                  )
                ) : isCover ? (
                  (() => {
                    const coverBg = sp.coverTemplate?.coverStyle?.bg || '#F0EDE8';
                    return (
                      <>
                        <div className="absolute" style={{ left: 0, top: 0, width: halfW, height: compact ? 46 : 56, background: coverBg }} />
                        <div className="absolute flex items-center justify-center" style={{ left: halfW + spineW, top: 0, width: halfW, height: compact ? 46 : 56, background: coverBg }}>
                          <div className="rounded-[1px] opacity-30" style={{ width: 22, height: 18, background: '#fff' }} />
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <>
                    <div className="absolute bg-[#E0DDD8]" style={{ left: 1, top: 1, width: halfW - 2, height: 54 }} />
                    <div className="absolute bg-[#E0DDD8]" style={{ left: halfW + spineW + 1, top: 1, width: halfW - 2, height: 54 }} />
                  </>
                )}
              </div>

              {/* Trash button — clears photos from rotation (not cover, not readOnly) */}
              {!isCover && hasPhotos && !useEditorStore.getState().readOnly && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearSpread(i); }}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded bg-[#3D6B5A] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-[#2d5445]"
                  title="Golește rotația (pozele revin în galerie)"
                >
                  <TrashIcon />
                </button>
              )}

              {/* Drag handle indicator (visible on hover for non-cover) */}
              {!isCover && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none z-10">
                  <svg width="16" height="6" viewBox="0 0 16 6" fill="#8A857E">
                    <circle cx="4" cy="1.5" r="1" /><circle cx="8" cy="1.5" r="1" /><circle cx="12" cy="1.5" r="1" />
                    <circle cx="4" cy="4.5" r="1" /><circle cx="8" cy="4.5" r="1" /><circle cx="12" cy="4.5" r="1" />
                  </svg>
                </div>
              )}
            </div>

            {/* Label */}
            <span className={`text-[7px] font-bold leading-tight text-center select-none ${
              isCurrent ? 'text-[#3D6B5A]' : 'text-[#8A857E]'
            }`}>
              {isCover ? 'Copertă' : `Rotația ${rotationNum}`}
            </span>
          </div>
        );
      })}

      {/* Photo count */}
      <div className="ml-auto shrink-0 text-[10px] text-[#B0AAA2] font-medium whitespace-nowrap pl-3">
        {spreads.reduce((sum, sp) => sum + (sp.photos?.length || 0), 0)} poze plasate
      </div>
    </div>
  );
}
