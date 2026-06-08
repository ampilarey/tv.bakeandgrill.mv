import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MobileMenu from './MobileMenu';
import NotificationBell from './NotificationBell';
import Button from './common/Button';

/**
 * Shared admin page header — notification bell, mobile menu, Admin Home link.
 */
export default function AdminTopBar({ title, subtitle, children, below, showBell = true }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const bell = showBell && user?.role === 'admin';

  return (
    <div className="bg-tv-accent border-b border-tv-borderSubtle px-6 py-4 flex-shrink-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <MobileMenu />
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs md:text-sm text-white/90 hidden sm:block truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {children}
          {bell && <NotificationBell />}
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
            onClick={() => navigate('/admin/dashboard')}
          >
            Admin Home
          </Button>
          <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
      {below}
    </div>
  );
}
