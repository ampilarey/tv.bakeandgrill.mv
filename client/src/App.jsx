import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Spinner from './components/common/Spinner';

// Pages
import LoginPage from './pages/LoginPage';
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

// Mobile Components
import BottomNav from './components/BottomNav';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

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

// Display Route Component - Allows admin OR users with display permissions
function DisplayRoute({ children }) {
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
        
        const canAccess = perms?.can_manage_displays === 1 || 
                         perms?.can_control_displays === 1;
        setHasAccess(canAccess);
      } catch (error) {
        console.error('Error checking display access:', error);
        setHasAccess(false);
      }
    };

    if (isAuthenticated) {
      checkAccess();
    }
  }, [user, isAuthenticated]);

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
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/display" element={<KioskModePage />} />
        <Route path="/pair" element={<DisplayPairingPage />} />

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
              <PlayerPage />
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
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/displays"
          element={
            <DisplayRoute>
              <DisplayManagement />
            </DisplayRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <AdminRoute>
              <Analytics />
            </AdminRoute>
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

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <BottomNav />
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

