import { motion } from 'motion/react';

const STYLES = {
  dark: 'glass-btn-dark',
  white: 'glass-btn-white',
  accent: 'glass-btn-accent',
  ghost: 'glass-btn-ghost',
};

export default function GlassButton({
  children,
  variant = 'dark',
  className = '',
  as = 'button',
  ...props
}) {
  const Component = motion[as] || motion.button;
  return (
    <Component
      className={`${STYLES[variant] || STYLES.dark} ${className}`.trim()}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </Component>
  );
}
