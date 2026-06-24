const VARIANTS = {
  primary:
    'bg-teal-500 text-white hover:bg-teal-600 active:bg-teal-700 disabled:bg-teal-200 disabled:text-teal-50',
  secondary:
    'bg-white text-teal-700 border border-clinic-line hover:border-teal-300 hover:bg-teal-50 disabled:text-clinic-muted disabled:hover:bg-white',
  danger:
    'bg-alert-500 text-white hover:bg-alert-600 disabled:bg-alert-100 disabled:text-alert-500',
  ghost:
    'bg-transparent text-clinic-muted hover:text-clinic-ink hover:bg-clinic-line/50 disabled:opacity-40'
};

const SIZES = {
  sm: 'text-sm px-3 py-1.5 gap-1.5',
  md: 'text-base px-4 py-2.5 gap-2',
  lg: 'text-lg px-6 py-3.5 gap-2.5 font-semibold'
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
