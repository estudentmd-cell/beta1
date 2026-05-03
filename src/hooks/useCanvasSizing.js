// src/hooks/useCanvasSizing.js
import { useState, useEffect } from 'react';

/**
 * Shared canvas sizing logic — used by both desktop and mobile editor shells.
 * Computes canvas dimensions that maintain the spread's aspect ratio within available space.
 */
export function useCanvasSizing(containerRef, formatStr, { maxWidth = Infinity, padW = 50, padH = 30, gapMM = 0 } = {}) {
  const [fW, fH] = (formatStr || '20×20').split('×').map(Number);
  const spreadRatio = (2 * fW) / fH;

  const [viewSize, setViewSize] = useState({ w: 900, h: 520 });

  useEffect(() => {
    const measure = () => {
      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setViewSize({
          w: Math.max(300, Math.min(rect.width - padW, maxWidth)),
          h: Math.max(200, rect.height - padH),
        });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [containerRef, padW, padH, maxWidth]);

  let canvasW = viewSize.w;
  let canvasH = Math.round(canvasW / spreadRatio);
  if (canvasH > viewSize.h) {
    canvasH = viewSize.h;
    canvasW = Math.round(canvasH * spreadRatio);
  }

  const spineW = 2;
  const halfW = (canvasW - spineW) / 2;
  const gapPx = (gapMM / 25.4) * 300 * (canvasW / 2000);

  return { canvasW, canvasH, halfW, spineW, gapPx, fW, fH, spreadRatio };
}
