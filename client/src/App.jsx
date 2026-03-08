import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Spinner from './components/common/Spinner';

// Pages
import LoginPage from './pages/LoginPage';
import FirstTimeSetupPage from './pages/FirstTimeSetupPage';
import DashboardPage from './pages/DashboardPage';
import PlayerPage from './pages/PlayerPage';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage';
import KioskModePage from './pages/KioskModePage';
import DisplayPairingPage from './pages/DisplayPairingPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import DisplayManagement from './pages/admin/DisplayManagement';
import Analytics from './pages/admin/Analytics';
import Settings from './pages/admin/Settings';
import TickerManagement from './pages/admin/TickerManagement';
import ScheduleManagement from './pages/admin/ScheduleManagement';
import SceneManagement from './pages/admin/SceneManagement';
import TestChecklist from './pages/admin/TestChecklist';
import DisplayAnalytics from './pages/admin/DisplayAnalytics';
import OverlaySchedule from './pages/admin/OverlaySchedule';
import ZoneManagement from './pages/admin/ZoneManagement';
import MediaLibrary from './pages/admin/MediaLibrary';
import MediaPlaylistManagement from './pages/admin/MediaPlaylistManagement';
import OverlayManagement from './pages/admin/OverlayManagement';
import MonitoringDashboard from './pages/admin/MonitoringDashboard';
import ContentSchedules from './pages/admin/ContentSchedules';
import EmergencyOverride from './pages/admin/EmergencyOverride';
import ChannelHealth from './pages/admin/ChannelHealth';
import SystemHealth from './pages/admin/SystemHealth';
import FeatureFlags from './pages/admin/FeatureFlags';
import SlideTemplates from './pages/admin/SlideTemplates';

// Mobile Components
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/common/ErrorBoundary';

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

      // Check permissions for non-admin users
      try {
        const response = await fetch('/api/permissions/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        const perms = data.permissions;
        
        // Check if user has ANY of the required permissions
        const canAccess = requiredPermissions.some(perm => 
          perms?.[perm] === 1 || perms?.[perm] === true
        );
        
        console.log('🔐 Permission check:', {
          required: requiredPermissions,
          userPerms: perms,
          hasAccess: canAccess
        });
        
        setHasAccess(canAccess);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasAccess(false);
      }
    };

    if (isAuthenticated) {
      checkAccess();
    }
  }, [user, isAuthenticated, requiredPermissions]);

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

// Router Component
function AppRouter() {
  return (
    <Router>
      <ErrorBoundary>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/display" element={<KioskModePage />} />
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
      <BottomNav />
      </ErrorBoundary>
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

