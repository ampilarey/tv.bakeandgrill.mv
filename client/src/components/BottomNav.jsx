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
  
  // Don't show on kiosk mode, login page, or pairing page
  if (location.pathname === '/display' || location.pathname === '/login' || location.pathname === '/' || location.pathname === '/pair') {
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-tv-bgElevated border-t-2 border-tv-borderSubtle z-30 safe-area-bottom shadow-2xl">
      <div className="flex justify-around items-center px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path === '/player' && location.pathname.startsWith('/player'));
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item)}
              className={`flex flex-col items-center justify-center px-4 py-2.5 rounded-xl transition-all min-h-[60px] min-w-[68px] ${
                isActive
                  ? 'bg-tv-accent text-white scale-105 shadow-lg'
                  : 'text-tv-textSecondary hover:text-tv-text hover:bg-tv-bgHover'
              }`}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-xs font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

