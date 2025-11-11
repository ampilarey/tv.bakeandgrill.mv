import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Don't show on kiosk mode or login page
  if (location.pathname === '/display' || location.pathname === '/login' || location.pathname === '/') {
    return null;
  }
  
  const navItems = [
    { path: '/dashboard', icon: '🏠', label: 'Home' },
    { path: '/player', icon: '▶️', label: 'Watch', requiresPlaylist: true },
    ...(user?.role === 'admin' ? [
      { path: '/admin/users', icon: '👥', label: 'Users' },
      { path: '/admin/displays', icon: '🖥️', label: 'Displays' },
    ] : []),
  ];
  
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background-light border-t border-slate-700 z-30 safe-area-bottom">
      <div className="flex justify-around items-center px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path === '/player' && location.pathname.startsWith('/player'));
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all min-h-[56px] min-w-[64px] ${
                isActive
                  ? 'bg-primary text-white scale-105'
                  : 'text-text-secondary hover:text-white hover:bg-background-lighter'
              }`}
              disabled={item.requiresPlaylist && !location.search.includes('playlistId')}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

