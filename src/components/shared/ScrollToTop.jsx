import { motion, useScroll, useMotionValueEvent } from 'motion/react';
import { useState, useCallback } from 'react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const { scrollYProgress } = useScroll();

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setVisible(v > 0.15);
  });

  const scrollUp = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <motion.button
      onClick={scrollUp}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-20 sm:bottom-8 right-4 z-30 w-11 h-11 rounded-full bg-[#1c1c1c]/80 backdrop-blur-sm text-white shadow-lg flex items-center justify-center hover:bg-[#1c1c1c] transition-colors"
      aria-label="Mergi sus"
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m18 15-6-6-6 6" />
      </svg>
    </motion.button>
  );
}
