import { lightTap } from '../../utils/haptics';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) {
  const handleClick = (e) => {
    if (!disabled && !loading) {
      lightTap(); // Haptic feedback on mobile
      if (onClick) onClick(e);
    }
  };
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 focus-ring inline-flex items-center justify-center';
  
  const variants = {
    primary: 'bg-tv-accent hover:bg-tv-accentHover text-white disabled:bg-tv-bgSoft shadow-lg hover:shadow-xl transition-all font-semibold',
    secondary: 'bg-tv-goldDark hover:bg-tv-gold text-white border-2 border-tv-goldDark shadow-md font-semibold',
    danger: 'bg-tv-error hover:bg-tv-error/90 text-white disabled:bg-tv-error/40 shadow-md',
    ghost: 'bg-transparent hover:bg-tv-bgHover text-tv-text hover:text-tv-accentDark font-medium',
    success: 'bg-tv-success hover:bg-tv-accentHover text-white disabled:bg-tv-success/40 shadow-md'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };
  
  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}

