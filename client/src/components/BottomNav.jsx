import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const handleNavigate = (item) => {
    if (item.requiresPlaylist) {
      const params = new URLSearchParams(location.search);
      const currentPlaylistId = params.get('playlistId');
      let lastPlaylistId = null;
      
      if (typeof window !== 'undefined') {
        lastPlaylistId = window.localStorage.getItem('lastPlaylistId');
      }
      
      const targetPlaylistId = currentPlaylistId || lastPlaylistId;
      
      if (targetPlaylistId) {
        navigate(`${item.path}?playlistId=${targetPlaylistId}`);
      } else {
        // No playlist stored yet; send user to dashboard to pick one.
        navigate('/dashboard');
      }
      return;
    }
    
    navigate(item.path);
  };
  
  // Don't show on kiosk mode or login page
  if (location.pathname === '/display' || location.pathname === '/login' || location.pathname === '/') {
    return null;
  }
  
  const navItems = [
    { path: '/dashboard', icon: '🏠', label: 'Home' },
    { path: '/player', icon: '▶️', label: 'Watch', requiresPlaylist: true },
    { path: '/profile', icon: '👤', label: 'Profile' },
    ...(user?.role === 'admin' ? [
      { path: '/admin/users', icon: '👥', label: 'Users' },
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
              onClick={() => handleNavigate(item)}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all min-h-[56px] min-w-[64px] ${
                isActive
                  ? 'bg-primary text-white scale-105'
                  : 'text-text-secondary hover:text-white hover:bg-background-lighter'
              }`}
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

