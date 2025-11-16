export default function Card({ children, className = '', hover = false, onClick }) {
  const hoverClass = hover ? 'hover:bg-tv-bgHover hover:shadow-xl transition-all cursor-pointer' : '';
  const clickable = onClick ? 'cursor-pointer' : '';
  
  return (
    <div
      className={`bg-tv-bgElevated rounded-xl p-6 border-2 border-tv-borderSubtle shadow-lg ${hoverClass} ${clickable} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

