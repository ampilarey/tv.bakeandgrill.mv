export default function Badge({ children, color = 'default', size = 'md', className = '' }) {
  const colors = {
    default: 'bg-tv-bgSoft text-tv-textSecondary border border-tv-borderSubtle',
    primary: 'bg-tv-accent/20 text-tv-accentLight border border-tv-accent/40',
    success: 'bg-tv-success/20 text-tv-success border border-tv-success/40',
    danger: 'bg-tv-error/20 text-tv-error border border-tv-error/40',
    warning: 'bg-tv-warning/20 text-tv-warning border border-tv-warning/40',
    info: 'bg-tv-info/20 text-tv-info border border-tv-info/40'
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };
  
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${colors[color]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}

