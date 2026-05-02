import { motion } from 'motion/react';

const VARIANTS = {
  standard: 'glass',
  inner: 'glass-inner',
  frosted: 'glass-frosted',
  subtle: 'glass-subtle',
  accent: 'glass-accent',
};

export default function GlassPanel({
  children,
  variant = 'standard',
  hover = true,
  specular = false,
  className = '',
  as = 'div',
  ...props
}) {
  const Component = motion[as] || motion.div;
  return (
    <Component
      className={`${VARIANTS[variant] || VARIANTS.standard} ${specular ? 'glass-specular' : ''} ${className}`.trim()}
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </Component>
  );
}
