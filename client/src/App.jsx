import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Spinner from './components/common/Spinner';
import api from './services/api';

// Lazy-loaded pages — split into separate chunks so the initial JS bundle
// only includes the code needed for the first rendered route.
const LoginPage          = React.lazy(() => import('./pages/LoginPage'));
const FirstTimeSetupPage = React.lazy(() => import('./pages/FirstTimeSetupPage'));
const DashboardPage      = React.lazy(() => import('./pages/DashboardPage'));
const PlayerPage         = React.lazy(() => import('./pages/PlayerPage'));
const ProfilePage        = React.lazy(() => import('./pages/ProfilePage'));
const HistoryPage        = React.lazy(() => import('./pages/HistoryPage'));
const KioskModePage      = React.lazy(() => import('./pages/KioskModePage'));
const DisplayPairingPage = React.lazy(() => import('./pages/DisplayPairingPage'));

// Admin Pages
const AdminDashboard         = React.lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement         = React.lazy(() => import('./pages/admin/UserManagement'));
const DisplayManagement      = React.lazy(() => import('./pages/admin/DisplayManagement'));
const Analytics              = React.lazy(() => import('./pages/admin/Analytics'));
const Settings               = React.lazy(() => import('./pages/admin/Settings'));
const TickerManagement       = React.lazy(() => import('./pages/admin/TickerManagement'));
const ScheduleManagement     = React.lazy(() => import('./pages/admin/ScheduleManagement'));
const SceneManagement        = React.lazy(() => import('./pages/admin/SceneManagement'));
const TestChecklist          = React.lazy(() => import('./pages/admin/TestChecklist'));
const DisplayAnalytics       = React.lazy(() => import('./pages/admin/DisplayAnalytics'));
const OverlaySchedule        = React.lazy(() => import('./pages/admin/OverlaySchedule'));
const ZoneManagement         = React.lazy(() => import('./pages/admin/ZoneManagement'));
const MediaLibrary           = React.lazy(() => import('./pages/admin/MediaLibrary'));
const MediaPlaylistManagement= React.lazy(() => import('./pages/admin/MediaPlaylistManagement'));
const OverlayManagement      = React.lazy(() => import('./pages/admin/OverlayManagement'));
const MonitoringDashboard    = React.lazy(() => import('./pages/admin/MonitoringDashboard'));
const ContentSchedules       = React.lazy(() => import('./pages/admin/ContentSchedules'));
const EmergencyOverride      = React.lazy(() => import('./pages/admin/EmergencyOverride'));
const ChannelHealth          = React.lazy(() => import('./pages/admin/ChannelHealth'));
const SystemHealth           = React.lazy(() => import('./pages/admin/SystemHealth'));
const FeatureFlags           = React.lazy(() => import('./pages/admin/FeatureFlags'));
const SlideTemplates         = React.lazy(() => import('./pages/admin/SlideTemplates'));

// Mobile Components (small — kept eager)
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Fallback shown while a lazy chunk is loading
function PageLoader() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <Spinner size="xl" />
    </div>
  );
}

// Wrapper that provides a subtle fade transition between routes
const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.12 } },
};

function AnimatedPage({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ flex: 1, display: 'contents' }}
    >
      {children}
    </motion.div>
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
    }
  // permsKey is a stable primitive derived from the array
  }, [user, isAuthenticated, permsKey]);

  if (loading || hasAccess === null) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!isAuthenticated || !hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Inner routing component — needs to be inside <Router> to use useLocation
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
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
    </AnimatePresence>
  );
}

// Wrapper that keys the ErrorBoundary to the current route pathname so
// navigating away from a crashed page automatically resets the boundary.
function LocationKeyedBoundary() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <ErrorBoundary key={location.pathname} onReset={() => navigate('/dashboard')}>
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
    const t = setTimeout(() => { onReset?.(); window.location.reload(); }, 10_000);
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

