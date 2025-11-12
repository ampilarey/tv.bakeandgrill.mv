import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const menuItems = [
    { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { path: '/history', icon: '🕒', label: 'History' },
    { path: '/profile', icon: '👤', label: 'Profile' },
    ...(user?.role === 'admin' ? [
      { path: '/admin/dashboard', icon: '⚙️', label: 'Admin Home' },
      { path: '/admin/users', icon: '👥', label: 'Users' },
      { path: '/admin/displays', icon: '🖥️', label: 'Displays' },
      { path: '/admin/analytics', icon: '📊', label: 'Analytics' },
    ] : []),
  ];
  
  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };
  
  return (
    <>
      {/* Hamburger Button - Only on Mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-lg hover:bg-background-lighter transition-colors"
        aria-label="Menu"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      
      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Drawer */}
          <div className="fixed top-0 right-0 bottom-0 w-64 bg-background-light shadow-2xl z-50 md:hidden transform transition-transform duration-300">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h2 className="text-lg font-bold text-white">Menu</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-background-lighter rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* User Info */}
              <div className="p-4 border-b border-slate-700">
                <p className="text-sm text-text-secondary">Logged in as</p>
                <p className="text-white font-medium">{user?.email}</p>
                <p className="text-xs text-primary mt-1">{user?.role}</p>
              </div>
              
              {/* Menu Items */}
              <nav className="flex-1 overflow-y-auto p-2">
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px] ${
                      location.pathname === item.path
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:bg-background-lighter hover:text-white'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
              
              {/* Logout */}
              <div className="p-4 border-t border-slate-700">
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors min-h-[48px]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

