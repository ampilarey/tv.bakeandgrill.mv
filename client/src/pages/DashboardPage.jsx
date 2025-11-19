import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Spinner from '../components/common/Spinner';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Footer from '../components/Footer';

export default function DashboardPage() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ name: '', m3u_url: '', description: '' });
  const [permissions, setPermissions] = useState(null);
  const [error, setError] = useState('');
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlaylists();
    fetchPermissions();
    
    // Listen for permission updates
    const handlePermissionUpdate = () => {
      console.log('🔄 Dashboard: Permission update event received, refetching...');
      fetchPermissions();
    };
    
    window.addEventListener('permissionsUpdated', handlePermissionUpdate);
    
    return () => {
      window.removeEventListener('permissionsUpdated', handlePermissionUpdate);
    };
  }, []);
  
  const fetchPermissions = async () => {
    try {
      const response = await api.get('/permissions/me');
      console.log('📋 Dashboard permissions:', response.data.permissions);
      setPermissions(response.data.permissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const response = await api.get('/playlists');
      setPlaylists(response.data.playlists || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlaylist = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await api.post('/playlists', newPlaylist);
      setShowAddModal(false);
      setNewPlaylist({ name: '', m3u_url: '', description: '' });
      fetchPlaylists();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to add playlist');
    }
  };

  const handlePlaylistClick = (playlistId) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('lastPlaylistId', playlistId);
    }
    navigate(`/player?playlistId=${playlistId}`);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-tv-bg">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tv-bg flex flex-col">
      {/* Top Bar */}
      <div className="bg-tv-bgElevated border-b-2 border-tv-borderSubtle px-6 py-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-tv-accent to-tv-accentHover shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-tv-text">Bake and Grill TV</h1>
              <p className="text-sm text-tv-textSecondary">Welcome, {user?.firstName || user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2 md:gap-3">
            {/* Profile - for all users */}
            <Button variant="secondary" onClick={() => navigate('/profile')} className="hidden md:flex">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </Button>
            
            {/* Displays - if user has permission */}
            {(user?.role === 'admin' || permissions?.can_manage_displays === 1 || permissions?.can_control_displays === 1) && (
              <Button variant="secondary" onClick={() => navigate('/admin/displays')} className="hidden md:flex">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Displays
              </Button>
            )}
            
            {/* Users - if user has permission */}
            {(user?.role === 'admin' || permissions?.can_create_users === 1) && (
              <Button variant="secondary" onClick={() => navigate('/admin/users')} className="hidden md:flex">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Users
              </Button>
            )}
            
            {/* Analytics - if user has permission */}
            {(user?.role === 'admin' || permissions?.can_view_analytics === 1) && (
              <Button variant="secondary" onClick={() => navigate('/admin/analytics')} className="hidden md:flex">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </Button>
            )}
            
            {/* Admin Panel - admin only */}
            {user?.role === 'admin' && (
              <Button variant="primary" onClick={() => navigate('/admin/dashboard')}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin Panel
              </Button>
            )}
            
            <Button variant="ghost" onClick={logout}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto flex-1 w-full md:pb-6" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-tv-text">
            {user?.role === 'user' ? 'Available Playlists' : 'Your Playlists'}
          </h2>
          {(user?.role === 'admin' || permissions?.can_add_playlists) && (
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Playlist
              {permissions?.max_playlists > 0 && (
                <span className="ml-2 text-xs opacity-90">
                  ({playlists.length}/{permissions.max_playlists})
                </span>
              )}
            </Button>
          )}
        </div>

        {playlists.length === 0 ? (
          <Card>
            <div className="text-center py-16">
              <svg className="w-20 h-20 mx-auto text-tv-textMuted mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-2xl font-bold text-tv-text mb-3">No Playlists Yet</h3>
              <p className="text-tv-textSecondary text-lg mb-6">Add your first M3U playlist to start watching</p>
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                Add Your First Playlist
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <Card
                key={playlist.id}
                hover
                onClick={() => handlePlaylistClick(playlist.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-tv-text mb-2">{playlist.name}</h3>
                    {playlist.description && (
                      <p className="text-sm text-tv-textSecondary leading-relaxed">{playlist.description}</p>
                    )}
                  </div>
                  <svg className="w-6 h-6 text-tv-accent flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="flex items-center text-sm text-tv-textMuted font-medium">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {playlist.is_active ? 'Active' : 'Inactive'}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Playlist Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setError('');
          setNewPlaylist({ name: '', m3u_url: '', description: '' });
        }}
        title="Add New Playlist"
      >
        <form onSubmit={handleAddPlaylist} className="space-y-5">
          {error && (
            <div className="bg-tv-error/20 border-2 border-tv-error/40 rounded-xl p-4 text-tv-error text-sm font-medium">
              {error}
            </div>
          )}
          
          <Input
            label="Playlist Name"
            value={newPlaylist.name}
            onChange={(e) => setNewPlaylist({...newPlaylist, name: e.target.value})}
            placeholder="My IPTV Channels"
            required
          />
          
          <Input
            label="M3U URL"
            value={newPlaylist.m3u_url}
            onChange={(e) => setNewPlaylist({...newPlaylist, m3u_url: e.target.value})}
            placeholder="https://example.com/playlist.m3u"
            required
          />
          
          <Input
            label="Description (Optional)"
            value={newPlaylist.description}
            onChange={(e) => setNewPlaylist({...newPlaylist, description: e.target.value})}
            placeholder="Sports channels, news, etc."
          />
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Add Playlist
            </Button>
          </div>
        </form>
      </Modal>
      
      <Footer />
    </div>
  );
}

