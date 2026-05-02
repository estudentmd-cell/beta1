const VARIANTS = {
  primary:   'bg-tx-1 text-white hover:bg-tx-2',
  secondary: 'bg-bg-2 text-tx-1 hover:bg-bg-3',
  danger:    'bg-danger text-white hover:bg-danger/90',
  green:     'bg-ac text-white hover:bg-ac-2',
  ghost:     'bg-transparent text-tx-2 hover:bg-bg-2',
};

export default function Button({ variant = 'primary', className = '', disabled, children, ...props }) {
  return (
    <button
      disabled={disabled}
      className={`px-6 py-3 rounded font-semibold text-sm transition-all min-h-[44px]
        ${VARIANTS[variant] || VARIANTS.primary}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}
        ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
