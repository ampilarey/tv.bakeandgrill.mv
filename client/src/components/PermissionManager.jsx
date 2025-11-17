import { useState, useEffect } from 'react';
import api from '../services/api';
import Button from './common/Button';
import Modal from './common/Modal';
import Spinner from './common/Spinner';

export default function PermissionManager({ userId, userName, onClose, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [assignedPlaylists, setAssignedPlaylists] = useState([]);
  const [availablePlaylists, setAvailablePlaylists] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  useEffect(() => {
    fetchPermissions();
    fetchPlaylists();
  }, [userId]);
  
  const fetchPermissions = async () => {
    try {
      const response = await api.get(`/permissions/${userId}`);
      setPermissions(response.data.permissions || getDefaultPermissions());
      setAssignedPlaylists(response.data.assignedPlaylists || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions(getDefaultPermissions());
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPlaylists = async () => {
    try {
      const response = await api.get('/playlists');
      setAvailablePlaylists(response.data.playlists || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };
  
  const getDefaultPermissions = () => ({
    can_add_playlists: false,
    can_edit_own_playlists: false,
    can_delete_own_playlists: false,
    can_manage_displays: false,
    can_control_displays: false,
    can_create_users: false,
    can_view_analytics: false,
    can_manage_schedules: false,
    max_playlists: -1,
    max_displays: -1
  });
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/permissions/${userId}`, permissions);
      alert('✅ Permissions updated successfully!\n\nℹ️ The user must refresh their browser or log out and log in again to see the changes.');
      if (onUpdate) onUpdate();
      onClose(); // Close modal after save
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };
  
  const handleReset = async () => {
    if (!confirm('Reset permissions to role defaults?')) return;
    
    try {
      const response = await api.post(`/permissions/${userId}/reset`);
      setPermissions(response.data.permissions);
      alert('✅ Permissions reset to defaults');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to reset permissions');
    }
  };
  
  const handleAssignPlaylist = async (playlistId, canEdit = false) => {
    try {
      await api.post(`/permissions/${userId}/assign-playlist`, {
        playlistId,
        canEdit,
        canDelete: false
      });
      fetchPermissions();
      setShowAssignModal(false);
      alert('✅ Playlist assigned!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to assign playlist');
    }
  };
  
  const handleUnassignPlaylist = async (playlistId) => {
    if (!confirm('Remove this playlist assignment?')) return;
    
    try {
      await api.delete(`/permissions/${userId}/assign-playlist/${playlistId}`);
      fetchPermissions();
      alert('✅ Assignment removed');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to remove assignment');
    }
  };
  
  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} title={`Permissions: ${userName}`}>
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      </Modal>
    );
  }
  
  return (
    <>
      <Modal isOpen={true} onClose={onClose} title={`Manage Permissions: ${userName}`} size="xl">
        <div className="space-y-4 md:space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* Playlist Permissions */}
          <div className="bg-tv-bgSoft rounded-lg p-4 border border-tv-borderSubtle">
            <h3 className="text-lg font-semibold text-tv-text mb-3">📋 Playlist Permissions</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer py-2 px-3 hover:bg-tv-bgElevated rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.can_add_playlists}
                  onChange={(e) => setPermissions({...permissions, can_add_playlists: e.target.checked})}
                  className="w-6 h-6 min-w-[24px] min-h-[24px] rounded bg-tv-bgElevated text-tv-accent focus:ring-2 focus:ring-tv-accent cursor-pointer"
                />
                <div>
                  <span className="text-tv-text font-medium">Can Add Playlists</span>
                  <p className="text-xs text-tv-textMuted">User can create their own M3U playlists</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer py-2 px-3 hover:bg-tv-bgElevated rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.can_edit_own_playlists}
                  onChange={(e) => setPermissions({...permissions, can_edit_own_playlists: e.target.checked})}
                  className="w-6 h-6 min-w-[24px] min-h-[24px] rounded bg-tv-bgElevated text-tv-accent focus:ring-2 focus:ring-tv-accent cursor-pointer"
                />
                <div>
                  <span className="text-tv-text font-medium">Can Edit Own Playlists</span>
                  <p className="text-xs text-tv-textMuted">User can modify their playlists</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer py-2 px-3 hover:bg-tv-bgElevated rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.can_delete_own_playlists}
                  onChange={(e) => setPermissions({...permissions, can_delete_own_playlists: e.target.checked})}
                  className="w-6 h-6 min-w-[24px] min-h-[24px] rounded bg-tv-bgElevated text-tv-accent focus:ring-2 focus:ring-tv-accent cursor-pointer"
                />
                <div>
                  <span className="text-tv-text font-medium">Can Delete Own Playlists</span>
                  <p className="text-xs text-tv-textMuted">User can remove their playlists</p>
                </div>
              </label>
              
              <div className="pt-2">
                <label className="block text-sm font-medium text-tv-textSecondary mb-2">
                  Max Playlists
                </label>
                <select
                  value={permissions.max_playlists}
                  onChange={(e) => setPermissions({...permissions, max_playlists: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 rounded-lg bg-tv-bgElevated text-tv-text border border-tv-borderSubtle focus:outline-none focus:ring-2 focus:ring-tv-accent"
                >
                  <option value="-1">None (Cannot create)</option>
                  <option value="1">1 playlist</option>
                  <option value="3">3 playlists</option>
                  <option value="5">5 playlists</option>
                  <option value="10">10 playlists</option>
                  <option value="0">Unlimited</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Display Permissions */}
          <div className="bg-tv-bgSoft rounded-lg p-4 border border-tv-borderSubtle">
            <h3 className="text-lg font-semibold text-tv-text mb-3">🖥️ Display Permissions</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer py-2 px-3 hover:bg-tv-bgElevated rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.can_manage_displays}
                  onChange={(e) => setPermissions({...permissions, can_manage_displays: e.target.checked})}
                  className="w-6 h-6 min-w-[24px] min-h-[24px] rounded bg-tv-bgElevated text-tv-accent focus:ring-2 focus:ring-tv-accent cursor-pointer"
                />
                <div>
                  <span className="text-tv-text font-medium">Can Manage Displays</span>
                  <p className="text-xs text-tv-textMuted">User can create and configure cafe displays</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer py-2 px-3 hover:bg-tv-bgElevated rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.can_control_displays}
                  onChange={(e) => setPermissions({...permissions, can_control_displays: e.target.checked})}
                  className="w-6 h-6 min-w-[24px] min-h-[24px] rounded bg-tv-bgElevated text-tv-accent focus:ring-2 focus:ring-tv-accent cursor-pointer"
                />
                <div>
                  <span className="text-tv-text font-medium">Can Control Displays (Remote)</span>
                  <p className="text-xs text-tv-textMuted">User can change channels and volume remotely</p>
                </div>
              </label>
              
              <div className="pt-2">
                <label className="block text-sm font-medium text-tv-textSecondary mb-2">
                  Max Displays
                </label>
                <select
                  value={permissions.max_displays}
                  onChange={(e) => setPermissions({...permissions, max_displays: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 rounded-lg bg-tv-bgElevated text-tv-text border border-tv-borderSubtle focus:outline-none focus:ring-2 focus:ring-tv-accent"
                >
                  <option value="-1">None (Cannot create)</option>
                  <option value="1">1 display</option>
                  <option value="2">2 displays</option>
                  <option value="3">3 displays</option>
                  <option value="5">5 displays</option>
                  <option value="0">Unlimited</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Advanced Permissions */}
          <div className="bg-tv-bgSoft rounded-lg p-4 border border-tv-borderSubtle">
            <h3 className="text-lg font-semibold text-tv-text mb-3">⚙️ Advanced Permissions</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer py-2 px-3 hover:bg-tv-bgElevated rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.can_create_users}
                  onChange={(e) => setPermissions({...permissions, can_create_users: e.target.checked})}
                  className="w-6 h-6 min-w-[24px] min-h-[24px] rounded bg-tv-bgElevated text-tv-accent focus:ring-2 focus:ring-tv-accent cursor-pointer"
                />
                <div>
                  <span className="text-tv-text font-medium">Can Create Users</span>
                  <p className="text-xs text-tv-textMuted">User can create new user accounts</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer py-2 px-3 hover:bg-tv-bgElevated rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.can_view_analytics}
                  onChange={(e) => setPermissions({...permissions, can_view_analytics: e.target.checked})}
                  className="w-6 h-6 min-w-[24px] min-h-[24px] rounded bg-tv-bgElevated text-tv-accent focus:ring-2 focus:ring-tv-accent cursor-pointer"
                />
                <div>
                  <span className="text-tv-text font-medium">Can View Analytics</span>
                  <p className="text-xs text-tv-textMuted">User can view usage statistics and reports</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer py-2 px-3 hover:bg-tv-bgElevated rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.can_manage_schedules}
                  onChange={(e) => setPermissions({...permissions, can_manage_schedules: e.target.checked})}
                  className="w-6 h-6 min-w-[24px] min-h-[24px] rounded bg-tv-bgElevated text-tv-accent focus:ring-2 focus:ring-tv-accent cursor-pointer"
                />
                <div>
                  <span className="text-tv-text font-medium">Can Manage Schedules</span>
                  <p className="text-xs text-tv-textMuted">User can create time-based channel schedules</p>
                </div>
              </label>
            </div>
          </div>
          
          {/* Assigned Playlists */}
          <div className="bg-tv-bgSoft rounded-lg p-4 border border-tv-borderSubtle">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-tv-text">🎯 Assigned Playlists</h3>
              <Button variant="primary" size="sm" onClick={() => setShowAssignModal(true)}>
                + Assign Playlist
              </Button>
            </div>
            
            {assignedPlaylists.length === 0 ? (
              <p className="text-tv-textMuted text-sm">No playlists assigned. User can only watch channels from their own playlists.</p>
            ) : (
              <div className="space-y-2">
                {assignedPlaylists.map((playlist) => (
                  <div key={playlist.id} className="flex items-center justify-between bg-tv-bgElevated rounded-lg p-3 border border-tv-borderSubtle">
                    <div>
                      <p className="text-tv-text font-medium">{playlist.playlist_name}</p>
                      <p className="text-xs text-tv-textMuted">
                        {playlist.can_edit ? '✏️ Can edit' : '👁️ View only'}
                      </p>
                    </div>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => handleUnassignPlaylist(playlist.playlist_id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Quick Presets */}
          <div className="bg-tv-gold/10 border border-tv-gold/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-tv-text mb-3">⚡ Quick Presets</h4>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => applyPreset('view_only')}
              >
                View Only
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => applyPreset('content_manager')}
              >
                Content Manager
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => applyPreset('display_manager')}
              >
                Display Manager
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => applyPreset('full_access')}
              >
                Full Access
              </Button>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-tv-borderSubtle">
            <Button variant="ghost" onClick={handleReset} className="flex-1">
              Reset to Defaults
            </Button>
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Assign Playlist Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Playlist"
      >
        <div className="space-y-4">
          <p className="text-tv-textSecondary text-sm">
            Assign one of your playlists to this user. They will be able to watch channels from it.
          </p>
          
          {availablePlaylists.length === 0 ? (
            <p className="text-tv-textMuted">No playlists available to assign.</p>
          ) : (
            <div className="space-y-2">
              {availablePlaylists
                .filter(p => !assignedPlaylists.find(ap => ap.playlist_id === p.id))
                .map((playlist) => (
                <div key={playlist.id} className="flex items-center justify-between bg-tv-bgSoft rounded-lg p-3 border border-tv-borderSubtle">
                  <div>
                    <p className="text-tv-text font-medium">{playlist.name}</p>
                    <p className="text-xs text-tv-textMuted">{playlist.m3u_url?.substring(0, 50)}...</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => handleAssignPlaylist(playlist.id, false)}
                    >
                      View Only
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => handleAssignPlaylist(playlist.id, true)}
                    >
                      Can Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-3 pt-4 border-t border-tv-borderSubtle">
            <Button variant="secondary" onClick={() => setShowAssignModal(false)} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
  
  function applyPreset(preset) {
    const presets = {
      view_only: {
        can_add_playlists: false,
        can_edit_own_playlists: false,
        can_delete_own_playlists: false,
        can_manage_displays: false,
        can_control_displays: false,
        can_create_users: false,
        can_view_analytics: false,
        can_manage_schedules: false,
        max_playlists: -1,
        max_displays: -1
      },
      content_manager: {
        can_add_playlists: true,
        can_edit_own_playlists: true,
        can_delete_own_playlists: true,
        can_manage_displays: false,
        can_control_displays: false,
        can_create_users: false,
        can_view_analytics: false,
        can_manage_schedules: false,
        max_playlists: 10,
        max_displays: -1
      },
      display_manager: {
        can_add_playlists: false,
        can_edit_own_playlists: false,
        can_delete_own_playlists: false,
        can_manage_displays: true,
        can_control_displays: true,
        can_create_users: false,
        can_view_analytics: false,
        can_manage_schedules: false,
        max_playlists: -1,
        max_displays: 3
      },
      full_access: {
        can_add_playlists: true,
        can_edit_own_playlists: true,
        can_delete_own_playlists: true,
        can_manage_displays: true,
        can_control_displays: true,
        can_create_users: true,
        can_view_analytics: true,
        can_manage_schedules: true,
        max_playlists: 0,
        max_displays: 0
      }
    };
    
    if (presets[preset]) {
      setPermissions(presets[preset]);
    }
  }
}

