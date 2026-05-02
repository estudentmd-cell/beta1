import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../firebase/config';

/* ── Load slides from Firestore ── */
async function loadSlides() {
  if (!db) return [];
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'settings', 'hero_slides'));
    if (!snap.exists()) return [];
    return (snap.data().slides || []).filter(s => s.active && s.image && s.title);
  } catch { return []; }
}

export default function HeroSplit() {
  const [slides, setSlides] = useState([]);
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSlides().then(s => {
      if (cancelled) return;
      if (s.length > 0) setSlides(s);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Auto-advance
  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const t = setInterval(() => {
      setDirection(1);
      setCurrent(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  const goTo = useCallback((idx) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  }, [current]);

  // Swipe support — pause auto-advance on touch
  const [touchStart, setTouchStart] = useState(null);
  const handleTouchStart = (e) => { setTouchStart(e.touches[0].clientX); setPaused(true); };
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) { setDirection(1); setCurrent(prev => (prev + 1) % slides.length); }
      else { setDirection(-1); setCurrent(prev => (prev - 1 + slides.length) % slides.length); }
    }
    setTouchStart(null);
    // Resume auto-advance after 3s
    setTimeout(() => setPaused(false), 3000);
  };

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  // Fallback hardcodat — dacă Firestore nu a încărcat încă
  const fallbackSlide = {
    id: 'fallback',
    title: '5000 de poze pe telefon.\nZero pe raft.',
    subtitle: 'Transformă pozele din telefon într-un album premium. Designul e pe noi — tu doar încarci pozele.',
    cta: 'ÎNCARCĂ POZELE GRATUIT',
    ctaLink: '/colectie/toate',
    image: '/images/familie.webp',
    bgColor: '#FAF8F5',
    textColor: '#1c1c1c',
    active: true,
  };

  const activeSlides = slides.length > 0 ? slides : [fallbackSlide];
  const slide = activeSlides[current % activeSlides.length];
  if (!slide) return null;

  // Skeleton while Firestore loads (prevents old-image flash)
  if (!ready) return (
    <section className="bg-[#FAF8F5]">
      <div className="sm:hidden aspect-[16/9] bg-[#F0EDE6] animate-pulse" />
      <div className="hidden sm:flex max-w-[1360px] mx-auto min-h-[580px]">
        <div className="flex-1 bg-[#FAF8F5]" />
        <div className="flex-1 bg-[#F0EDE6] animate-pulse" />
      </div>
    </section>
  );

  return (
    <section
      role="region"
      aria-label="Hero carousel"
      className="relative overflow-hidden bg-[#FAF8F5]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ═══ MOBILE ═══ */}
      <div className="sm:hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id + current}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Image — full width, cover, centered */}
            <div className="relative w-full aspect-[16/9] overflow-hidden bg-[#F0EDE6]">
              <img src={slide.image} alt={slide.title} className="w-full h-full object-cover object-center" loading="eager" />
            </div>

            {/* Text — compact, everything visible without scroll */}
            <div aria-live="polite" className="px-4 pt-4 pb-3" style={{ background: slide.bgColor || '#FAF8F5' }}>
              <h1
                className="text-[22px] leading-[1.15] mb-2"
                style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: slide.textColor || '#1c1c1c' }}
              >
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-[13px] mb-3 leading-[1.4]"
                  style={{ fontFamily: 'Outfit, sans-serif', color: slide.textColor ? slide.textColor + 'CC' : '#5C544B' }}>
                  {slide.subtitle}
                </p>
              )}
              <Link
                to={slide.ctaLink || '/colectie/toate'}
                className="flex items-center justify-center w-full h-[50px] rounded-lg text-[11px] font-semibold uppercase tracking-[0.15em] no-underline active:scale-[0.97] transition-all"
                style={{ background: slide.textColor || '#1c1c1c', color: slide.bgColor || '#FFFFFF' }}
              >
                {slide.cta || 'ÎNCEPE ALBUMUL'}
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots — inside bgColor area, with proper touch targets */}
        {activeSlides.length > 1 && (
          <div className="flex justify-center gap-3 pb-4 pt-1" style={{ background: slide.bgColor || '#FAF8F5' }}>
            {activeSlides.map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
                className="flex items-center justify-center min-h-[32px] min-w-[32px] -mx-1.5">
                <span className={`block h-[4px] rounded-full transition-all duration-300 ${i === current ? 'w-7' : 'w-3 bg-[#D0CAC0]'}`}
                  style={i === current ? { background: slide.textColor || '#1c1c1c' } : {}} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══ DESKTOP ═══ */}
      <div className="hidden sm:block">
        <div className="max-w-[1360px] mx-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide.id + current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex items-stretch min-h-[520px] lg:min-h-[580px] xl:min-h-[640px]"
            >
              {/* Left: Text */}
              <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-16"
                style={{ background: slide.bgColor || '#FAF8F5' }}>
                <h1
                  className="text-[36px] md:text-[42px] lg:text-[48px] xl:text-[54px] leading-[1.1] mb-5 max-w-[520px]"
                  style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: slide.textColor || '#1c1c1c' }}
                >
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <p
                    className="text-[16px] mb-8 max-w-[440px] leading-relaxed"
                    style={{ fontFamily: 'Outfit, sans-serif', color: slide.textColor ? slide.textColor + 'CC' : '#5C544B' }}
                  >
                    {slide.subtitle}
                  </p>
                )}
                <div className="flex items-center gap-5">
                  <Link
                    to={slide.ctaLink || '/colectie/toate'}
                    className="inline-block px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.15em] no-underline hover:opacity-90 active:scale-[0.97] transition-all"
                    style={{ background: slide.textColor || '#1c1c1c', color: slide.bgColor || '#FFFFFF' }}
                  >
                    {slide.cta || 'ÎNCEPE ALBUMUL'}
                  </Link>
                </div>
              </div>

              {/* Right: Image */}
              <div className="flex-1 relative overflow-hidden">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="eager"
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots — desktop */}
          {activeSlides.length > 1 && (
            <div className="flex justify-center gap-2 py-5">
              {activeSlides.map((_, i) => (
                <button key={i} onClick={() => goTo(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-[3px] rounded-full transition-all ${i === current ? 'w-8' : 'w-3 bg-[#D0CAC0]'}`}
                  style={i === current ? { background: slide.textColor || '#1c1c1c' } : {}} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
