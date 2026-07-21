const VARIANTS = {
  primary: 'bg-igss-700 hover:bg-igss-800 text-white',
  secondary: 'bg-white border border-igss-300 hover:bg-igss-50 text-igss-800',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-5 py-3 text-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  loading,
  className = '',
  fullWidth,
  ...rest
}) {
  const classes = [
    'min-h-11 rounded-lg font-semibold transition shadow-sm',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    fullWidth ? 'w-full' : '',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    className,
  ].join(' ');

  return (
    <button type={type} disabled={disabled || loading} className={classes} {...rest}>
      {loading ? 'Cargando...' : children}
    </button>
  );
}
