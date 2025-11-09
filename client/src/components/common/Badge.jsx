export default function Badge({ children, color = 'default', size = 'md' }) {
  const colors = {
    default: 'bg-slate-700 text-slate-200',
    primary: 'bg-primary/20 text-primary border border-primary/30',
    success: 'bg-green-900/20 text-green-400 border border-green-900/30',
    danger: 'bg-red-900/20 text-red-400 border border-red-900/30',
    warning: 'bg-yellow-900/20 text-yellow-400 border border-yellow-900/30',
    info: 'bg-blue-900/20 text-blue-400 border border-blue-900/30'
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${colors[color]} ${sizes[size]}`}>
      {children}
    </span>
  );
}

