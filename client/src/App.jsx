import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Spinner from './components/common/Spinner';
import api from './services/api';
import { lazyWithRetry } from './utils/lazyWithRetry';
import LoginPage from './pages/LoginPage';
import DisplayPairingPage from './pages/DisplayPairingPage';
import KioskModePage from './pages/KioskModePage';

// TV routes bundled eagerly — lazy chunk reloads disrupted kiosk playback.
const FirstTimeSetupPage = lazyWithRetry(() => import('./pages/FirstTimeSetupPage'));
const DashboardPage      = lazyWithRetry(() => import('./pages/DashboardPage'));
const PlayerPage         = lazyWithRetry(() => import('./pages/PlayerPage'));
const ProfilePage        = lazyWithRetry(() => import('./pages/ProfilePage'));
const HistoryPage        = lazyWithRetry(() => import('./pages/HistoryPage'));

// Admin Pages
const AdminDashboard         = lazyWithRetry(() => import('./pages/admin/AdminDashboard'));
const UserManagement         = lazyWithRetry(() => import('./pages/admin/UserManagement'));
const DisplayManagement      = lazyWithRetry(() => import('./pages/admin/DisplayManagement'));
const Analytics              = lazyWithRetry(() => import('./pages/admin/Analytics'));
const Settings               = lazyWithRetry(() => import('./pages/admin/Settings'));
const TickerManagement       = lazyWithRetry(() => import('./pages/admin/TickerManagement'));
const ScheduleManagement     = lazyWithRetry(() => import('./pages/admin/ScheduleManagement'));
const SceneManagement        = lazyWithRetry(() => import('./pages/admin/SceneManagement'));
const TestChecklist          = lazyWithRetry(() => import('./pages/admin/TestChecklist'));
const DisplayAnalytics       = lazyWithRetry(() => import('./pages/admin/DisplayAnalytics'));
const OverlaySchedule        = lazyWithRetry(() => import('./pages/admin/OverlaySchedule'));
const ZoneManagement         = lazyWithRetry(() => import('./pages/admin/ZoneManagement'));
const MediaLibrary           = lazyWithRetry(() => import('./pages/admin/MediaLibrary'));
const MediaPlaylistManagement= lazyWithRetry(() => import('./pages/admin/MediaPlaylistManagement'));
const OverlayManagement      = lazyWithRetry(() => import('./pages/admin/OverlayManagement'));
const MonitoringDashboard    = lazyWithRetry(() => import('./pages/admin/MonitoringDashboard'));
const ContentSchedules       = lazyWithRetry(() => import('./pages/admin/ContentSchedules'));
const EmergencyOverride      = lazyWithRetry(() => import('./pages/admin/EmergencyOverride'));
const ChannelHealth          = lazyWithRetry(() => import('./pages/admin/ChannelHealth'));
const DirectChannelManagement = lazyWithRetry(() => import('./pages/admin/DirectChannelManagement'));
const SystemHealth           = lazyWithRetry(() => import('./pages/admin/SystemHealth'));
const FeatureFlags           = lazyWithRetry(() => import('./pages/admin/FeatureFlags'));
const SlideTemplates         = lazyWithRetry(() => import('./pages/admin/SlideTemplates'));

// Mobile Components (small — kept eager)
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useLocation } from 'react-router-dom';

// Fallback shown while a lazy chunk is loading
function PageLoader() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <Spinner size="xl" />
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user needs to complete first-time setup
  if (user?.forcePasswordChange) {
    return <Navigate to="/first-time-setup" replace />;
  }

  return children;
}

// Admin Route Component
function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Permission-based Route Component - Generic permission checker
function PermissionRoute({ children, requiredPermissions = [] }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [hasAccess, setHasAccess] = React.useState(null);

  // Stable string key prevents a new array literal on every render from
  // triggering the effect infinitely (array identity changes each render).
  const permsKey = requiredPermissions.join(',');

  React.useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        return;
      }

      // Admin always has access
      if (user.role === 'admin') {
        setHasAccess(true);
        return;
      }

      // Use the configured api instance so the auth interceptor and base URL
      // logic are applied consistently (raw fetch bypasses both).
      try {
        const response = await api.get('/permissions/me');
        const perms = response.data.permissions;

        const canAccess = permsKey.split(',').some(perm =>
          perm && (perms?.[perm] === 1 || perms?.[perm] === true)
        );

        setHasAccess(canAccess);
      } catch {
        setHasAccess(false);
      }
    };

    if (isAuthenticated) {
      checkAccess();
    } else if (!loading) {
      setHasAccess(false);
    }
  // permsKey is a stable primitive derived from the array
  }, [user, isAuthenticated, loading, permsKey]);

  if (loading || (isAuthenticated && hasAccess === null)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    if (returnTo && returnTo !== '/login') {
      sessionStorage.setItem('postLoginRedirect', returnTo);
    }
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Inner routing component — needs to be inside <Router> to use useLocation
function AnimatedRoutes() {
  return (
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/display"
          element={
            <ErrorBoundary fallbackMessage="" onReset={() => window.location.reload()} FallbackComponent={KioskErrorFallback}>
              <KioskModePage />
            </ErrorBoundary>
          }
        />
        <Route path="/pair" element={<DisplayPairingPage />} />
        
        {/* First-Time Setup (Semi-protected - requires auth but not full access) */}
        <Route path="/first-time-setup" element={<FirstTimeSetupPage />} />

        {/* Protected User Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/player"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <PlayerPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PermissionRoute requiredPermissions={['can_create_users']}>
              <UserManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/displays"
          element={
            <PermissionRoute requiredPermissions={['can_manage_displays', 'can_control_displays']}>
              <DisplayManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <PermissionRoute requiredPermissions={['can_view_analytics']}>
              <Analytics />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/ticker"
          element={
            <AdminRoute>
              <TickerManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/schedules"
          element={
            <AdminRoute>
              <ScheduleManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/scenes"
          element={
            <AdminRoute>
              <SceneManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/test-checklist"
          element={
            <AdminRoute>
              <TestChecklist />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/display-analytics"
          element={
            <AdminRoute>
              <DisplayAnalytics />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/overlay-schedule"
          element={
            <AdminRoute>
              <OverlaySchedule />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/zones"
          element={
            <AdminRoute>
              <ZoneManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/media"
          element={
            <AdminRoute>
              <MediaLibrary />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/media-playlists"
          element={
            <AdminRoute>
              <MediaPlaylistManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/overlays"
          element={
            <AdminRoute>
              <OverlayManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/monitoring"
          element={
            <AdminRoute>
              <MonitoringDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/content-schedules"
          element={
            <AdminRoute>
              <ContentSchedules />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/emergency"
          element={
            <AdminRoute>
              <EmergencyOverride />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/channel-health"
          element={
            <AdminRoute>
              <ChannelHealth />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/direct-channels"
          element={
            <AdminRoute>
              <DirectChannelManagement />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/system"
          element={
            <AdminRoute>
              <SystemHealth />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/features"
          element={
            <AdminRoute>
              <FeatureFlags />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/templates"
          element={
            <AdminRoute>
              <SlideTemplates />
            </AdminRoute>
          }
        />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
  );
}

// Wrapper that keys the ErrorBoundary to the current route pathname so
// navigating away from a crashed page automatically resets the boundary.
const PUBLIC_PATHS = new Set(['/login', '/pair', '/display']);

function publicRouteOnReset(pathname) {
  if (PUBLIC_PATHS.has(pathname)) {
    window.location.reload();
    return;
  }
  window.location.href = '/dashboard';
}

function LocationKeyedBoundary() {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname} onReset={() => publicRouteOnReset(location.pathname)}>
      <React.Suspense fallback={<PageLoader />}>
        <AnimatedRoutes />
      </React.Suspense>
      <BottomNav />
    </ErrorBoundary>
  );
}

// Simple full-screen fallback for kiosk display crashes (customer-facing TV).
// Auto-reloads after 10 seconds so kiosk screens self-heal without staff input.
function KioskErrorFallback({ onReset }) {
  React.useEffect(() => {
    const t = setTimeout(() => { onReset?.(); window.location.reload(); }, 60_000);
    return () => clearTimeout(t);
  }, [onReset]);
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif', gap: 16 }}>
      <div style={{ fontSize: 48 }}>📺</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>Display temporarily unavailable</div>
      <div style={{ fontSize: 14, color: '#888' }}>Reconnecting automatically…</div>
    </div>
  );
}

// Router Component
function AppRouter() {
  return (
    <Router>
      <LocationKeyedBoundary />
    </Router>
  );
}

// Main App Component
function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-tv-bg text-tv-text">
        <AppRouter />
      </div>
    </AuthProvider>
  );
}

export default App;

