import { useEffect, useRef, useState } from 'react';
import { useInView } from 'motion/react';

export default function AnimatedCounter({ value, duration = 1.5, suffix = '', prefix = '', className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const num = parseInt(value) || 0;
    const start = Date.now();
    const dur = duration * 1000;
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / dur, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * num));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value, duration]);

  return <span ref={ref} className={className}>{prefix}{count}{suffix}</span>;
}
