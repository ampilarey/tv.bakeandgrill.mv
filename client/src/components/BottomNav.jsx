import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState(null);
  
  // Fetch permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await api.get('/permissions/me');
        console.log('📱 BottomNav permissions:', response.data.permissions);
        setPermissions(response.data.permissions);
      } catch (error) {
        console.error('Error fetching permissions:', error);
      }
    };
    
    if (user) {
      fetchPermissions();
    }
  }, [user]);
  
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
  
  // Build navigation items based on permissions
  const navItems = [
    { path: '/dashboard', icon: '🏠', label: 'Home' },
    { path: '/player', icon: '▶️', label: 'Watch', requiresPlaylist: true },
    { path: '/history', icon: '📜', label: 'History' },
    { path: '/profile', icon: '👤', label: 'Profile' },
  ];
  
  // Add Displays if user has permission
  if (user?.role === 'admin' || 
      permissions?.can_manage_displays === 1 || 
      permissions?.can_control_displays === 1) {
    navItems.push({ path: '/admin/displays', icon: '🖥️', label: 'Displays' });
  }
  
  // Add Users if user has permission
  if (user?.role === 'admin' || permissions?.can_create_users === 1) {
    navItems.push({ path: '/admin/users', icon: '👥', label: 'Users' });
  }
  
  // Add Analytics if user has permission
  if (user?.role === 'admin' || permissions?.can_view_analytics === 1) {
    navItems.push({ path: '/admin/analytics', icon: '📊', label: 'Analytics' });
  }
  
  const currentYear = new Date().getFullYear();
  
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-tv-bgElevated border-t-2 border-tv-borderSubtle z-30 safe-area-bottom shadow-2xl">
      {/* Navigation Tabs */}
      <div className="flex justify-around items-center px-1 py-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path === '/player' && location.pathname.startsWith('/player'));
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item)}
              className={`flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-all min-h-[56px] ${
                isActive
                  ? 'bg-tv-accent text-white shadow-md'
                  : 'text-tv-textSecondary hover:text-tv-text hover:bg-tv-bgHover'
              }`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className="text-[10px] font-semibold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Footer inside bottom nav */}
      <div className="border-t border-tv-borderSubtle py-1.5 px-4">
        <p className="text-tv-textMuted text-[9px] text-center leading-tight">
          © {currentYear} <span className="text-tv-accent font-semibold">Bake & Grill</span>
        </p>
      </div>
    </nav>
  );
}

