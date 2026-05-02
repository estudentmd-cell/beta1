import { useRef, useState, useEffect, memo } from 'react';

/**
 * LazyImage — renders placeholder until visible, then fades in smoothly.
 * No flicker: image loads hidden, fades in only when decoded.
 */
const LazyImage = memo(function LazyImage({ src, alt, className, style, draggable, placeholderClass }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);

  // IntersectionObserver: start loading when near viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Preload new src silently, then swap + fade in
  useEffect(() => {
    if (!visible || !src) return;
    if (src === currentSrc) return;

    setLoaded(false);
    const img = new Image();
    img.onload = async () => {
      // decode() offloads to compositor — no main thread jank
      try { await img.decode(); } catch {
        // Decode failed (corrupted/unsupported) — still show image, browser handles fallback
      }
      setCurrentSrc(src);
      requestAnimationFrame(() => setLoaded(true));
    };
    img.onerror = () => {
      // Show broken image placeholder instead of blank space
      setCurrentSrc(null);
      setLoaded(true);
    };
    img.src = src;
  }, [src, visible, currentSrc]);

  // Not visible yet — show placeholder
  if (!visible) {
    return <div ref={ref} className={placeholderClass || 'w-full aspect-[3/4] bg-[#F5F1EB] animate-pulse rounded'} />;
  }

  // Visible but image not loaded yet — show placeholder with pulse
  if (!currentSrc && !loaded) {
    return <div ref={ref} className={placeholderClass || 'w-full aspect-[3/4] bg-[#F5F1EB] animate-pulse rounded'} />;
  }

  // Image failed to load — show error placeholder
  if (!currentSrc && loaded) {
    return <div ref={ref} className={placeholderClass || 'w-full aspect-[3/4] bg-[#F0EDEA] rounded flex items-center justify-center text-[#CCC] text-xs'}>?</div>;
  }

  return (
    <img
      ref={ref}
      src={currentSrc}
      alt={alt || ''}
      decoding="async"
      className={className}
      style={{
        ...style,
        opacity: loaded ? 1 : 0,
        transition: 'opacity 0.4s ease-out',
      }}
      draggable={draggable}
    />
  );
});

export default LazyImage;
