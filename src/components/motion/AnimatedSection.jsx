/**
 * Reusable animated section wrapper — Framer Motion
 * Replaces useInView custom hook with proper stagger support
 */
import { motion } from 'motion/react';

const defaultVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8 },
  },
};

const slideUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const slideLeft = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const slideRight = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// Presets map
const presets = {
  default: defaultVariants,
  fadeIn,
  slideUp,
  slideLeft,
  slideRight,
  scaleIn,
  staggerItem,
};

/**
 * AnimatedSection — wraps any section with scroll-triggered animation
 * @param {string} preset — animation preset name
 * @param {boolean} stagger — enable stagger children
 * @param {number} staggerDelay — delay between children (default 0.1)
 * @param {string} className
 * @param {object} style
 */
export function AnimatedSection({
  children,
  preset = 'default',
  stagger = false,
  staggerDelay = 0.1,
  className = '',
  style,
  as = 'div',
  ...props
}) {
  const variants = stagger
    ? {
        hidden: {},
        visible: {
          transition: { staggerChildren: staggerDelay, delayChildren: 0.05 },
        },
      }
    : (presets[preset] || defaultVariants);

  const Component = motion[as] || motion.div;

  return (
    <Component
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * AnimatedItem — child of AnimatedSection with stagger
 */
export function AnimatedItem({
  children,
  preset = 'staggerItem',
  className = '',
  style,
  ...props
}) {
  return (
    <motion.div
      variants={presets[preset] || staggerItem}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedText — word-by-word reveal for headings
 */
export function AnimatedText({ children, className = '', style, as = 'h2' }) {
  if (typeof children !== 'string') {
    return <AnimatedSection preset="slideUp" as={as} className={className} style={style}>{children}</AnimatedSection>;
  }

  const words = children.split(' ');
  const Tag = motion[as] || motion.h2;

  return (
    <Tag
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className={className}
      style={{ ...style, overflow: 'hidden' }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, y: '100%' },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
            },
          }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </Tag>
  );
}

/**
 * AnimatedHeading — scroll-triggered opacity reveal for section headings
 */
export function AnimatedHeading({ children, className = '', style, as = 'h2' }) {
  const Tag = motion[as] || motion.h2;
  return (
    <Tag
      className={className}
      style={style}
      initial={{ opacity: 0.15 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false, margin: '-20% 0px -20% 0px' }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {children}
    </Tag>
  );
}

export { motion, staggerItem, staggerContainer };
