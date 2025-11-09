export default function Card({ children, className = '', hover = false, onClick }) {
  const hoverClass = hover ? 'card-hover cursor-pointer' : '';
  const clickable = onClick ? 'cursor-pointer' : '';
  
  return (
    <div
      className={`bg-background-light rounded-xl p-6 border border-slate-700 ${hoverClass} ${clickable} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

