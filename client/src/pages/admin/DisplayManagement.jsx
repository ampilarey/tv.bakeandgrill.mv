import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';
import Badge from '../../components/common/Badge';

export default function DisplayManagement() {
  const [displays, setDisplays] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showControlModal, setShowControlModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [createdDisplay, setCreatedDisplay] = useState(null);
  const [selectedDisplay, setSelectedDisplay] = useState(null);
  const [channels, setChannels] = useState([]);
  const [filteredChannelsForControl, setFilteredChannelsForControl] = useState([]);
  const [selectedGroupForControl, setSelectedGroupForControl] = useState('');
  const [groupsForControl, setGroupsForControl] = useState([]);
  const [newDisplay, setNewDisplay] = useState({ name: '', location: '', playlist_id: '' });
  const [selectedChannel, setSelectedChannel] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(50);
  const volumeTimeoutRef = useRef(null);
  const [error, setError] = useState('');
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchDisplays();
    fetchPlaylists();

    // Auto-refresh displays every 10 seconds to update online status
    const refreshInterval = setInterval(() => {
      fetchDisplays();
    }, 10000); // 10 seconds

    return () => clearInterval(refreshInterval);
  }, [user, navigate]);

  const fetchDisplays = async () => {
    try {
      const response = await api.get('/displays');
      setDisplays(response.data.displays || []);
    } catch (error) {
      console.error('Error fetching displays:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const response = await api.get('/playlists');
      setPlaylists(response.data.playlists || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const handleCreateDisplay = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await api.post('/displays', newDisplay);
      setShowCreateModal(false);
      setNewDisplay({ name: '', location: '', playlist_id: '' });
      setCreatedDisplay(response.data.display);
      setShowTokenModal(true);
      fetchDisplays();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create display');
    }
  };

  const handleDeleteDisplay = async (displayId) => {
    if (!confirm('Are you sure you want to delete this display?')) return;
    
    try {
      await api.delete(`/displays/${displayId}`);
      fetchDisplays();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete display');
    }
  };

  const handleOpenControl = async (display) => {
    console.log('Opening remote control for display:', display);
    setSelectedDisplay(display);
    setShowControlModal(true);
    setSelectedChannel('');
    setSelectedGroupForControl('');
    setChannels([]); // Clear previous channels
    
    // Fetch channels from assigned playlist
    if (display.playlist_id) {
      try {
        console.log('Fetching channels for playlist:', display.playlist_id);
        const response = await api.get(`/channels?playlistId=${display.playlist_id}`);
        const channelsList = response.data.channels || [];
        const groups = response.data.groups || [];
        console.log('Loaded channels for remote control:', channelsList.length);
        console.log('Groups:', groups);
        setChannels(channelsList);
        setFilteredChannelsForControl(channelsList);
        setGroupsForControl(groups);
      } catch (error) {
        console.error('Error fetching channels:', error);
        alert('Failed to load channels: ' + (error.response?.data?.error || error.message));
      }
    } else {
      alert('This display has no playlist assigned!');
    }
  };

  // Filter channels in remote control when group changes
  useEffect(() => {
    if (selectedGroupForControl && selectedGroupForControl !== '') {
      const filtered = channels.filter(ch => ch.group && ch.group.trim() === selectedGroupForControl.trim());
      setFilteredChannelsForControl(filtered);
    } else {
      setFilteredChannelsForControl(channels);
    }
  }, [selectedGroupForControl, channels]);

  const handleRemoteControl = async () => {
    if (!selectedChannel) {
      alert('Please select a channel first!');
      return;
    }
    
    try {
      const channel = channels.find(ch => ch.id === selectedChannel);
      
      if (!channel) {
        alert('Channel not found!');
        return;
      }
      
      console.log('Sending remote control command:', {
        displayId: selectedDisplay.id,
        channelId: channel.id,
        channelName: channel.name
      });
      
      const response = await api.post(`/displays/${selectedDisplay.id}/control`, {
        action: 'change_channel',
        channel_id: channel.id,
        channel_name: channel.name
      });
      
      console.log('Command sent successfully:', response.data);
      
      setShowControlModal(false);
      alert(`✅ Command sent! Display will switch to "${channel.name}" within 1-2 seconds.`);
    } catch (error) {
      console.error('Remote control error:', error);
      alert(error.response?.data?.error || 'Failed to send command');
    }
  };

  const handleVolumeControl = async (volume) => {
    try {
      await api.post(`/displays/${selectedDisplay.id}/control`, {
        action: 'set_volume',
        volume: volume
      });
    } catch (error) {
      console.error('Volume control error:', error);
    }
  };

  // Auto-send volume as slider moves (debounced)
  const handleVolumeSliderChange = (newVolume) => {
    setVolumeLevel(newVolume);
    
    // Clear previous timeout
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
    
    // Send command after 500ms of no slider movement (debounce)
    volumeTimeoutRef.current = setTimeout(() => {
      if (selectedDisplay) {
        handleVolumeControl(newVolume);
      }
    }, 500);
  };

  const handleMuteControl = async (mute) => {
    try {
      await api.post(`/displays/${selectedDisplay.id}/control`, {
        action: mute ? 'mute' : 'unmute'
      });
    } catch (error) {
      // Silently fail - don't interrupt user workflow
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="bg-background-light border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Display Management</h1>
            <p className="text-sm text-text-secondary">
              Manage cafe TV displays
              <span className="ml-3 text-xs text-green-400 animate-pulse">● Auto-refresh (10s)</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
              ← Admin Home
            </Button>
            <Button variant="ghost" onClick={logout}>Logout</Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Displays ({displays.length})</h2>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Display
          </Button>
        </div>

        {displays.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-text-secondary">No displays configured yet</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displays.map((display) => (
              <Card key={display.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{display.name}</h3>
                      <Badge color={display.status === 'online' ? 'success' : 'danger'}>
                        {display.status}
                      </Badge>
                    </div>
                    {display.location && (
                      <p className="text-sm text-text-secondary mb-2">📍 {display.location}</p>
                    )}
                    {display.last_heartbeat ? (
                      <p className="text-xs text-text-muted">
                        Last seen: {new Date(display.last_heartbeat).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted">Never connected</p>
                    )}
                    {display.current_channel_id && (
                      <p className="text-sm text-text-muted mt-1">Now: {display.current_channel_id}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => handleOpenControl(display)}
                    className="w-full"
                    disabled={!display.playlist_id}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    Remote Control
                  </Button>
                  
                  <button
                    onClick={() => {
                      setCreatedDisplay(display);
                      setShowTokenModal(true);
                    }}
                    className="w-full text-xs text-primary hover:text-primary-light text-center py-2 hover:bg-background-lighter rounded transition-colors"
                  >
                    View Display URL
                  </button>
                  
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={() => handleDeleteDisplay(display.id)}
                    className="w-full"
                  >
                    Delete Display
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Display Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setError('');
          setNewDisplay({ name: '', location: '', playlist_id: '' });
        }}
        title="Create New Display"
      >
        <form onSubmit={handleCreateDisplay} className="space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <Input
            label="Display Name"
            value={newDisplay.name}
            onChange={(e) => setNewDisplay({...newDisplay, name: e.target.value})}
            placeholder="Main Wall Display"
            required
          />
          
          <Input
            label="Location"
            value={newDisplay.location}
            onChange={(e) => setNewDisplay({...newDisplay, location: e.target.value})}
            placeholder="Cafe Main Wall"
          />
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Assign Playlist
            </label>
            <select
              value={newDisplay.playlist_id}
              onChange={(e) => setNewDisplay({...newDisplay, playlist_id: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-background-lighter text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a playlist...</option>
              {playlists.map(playlist => (
                <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Create Display
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remote Control Modal */}
      <Modal
        isOpen={showControlModal}
        onClose={() => {
          setShowControlModal(false);
          setSelectedChannel('');
          setChannels([]);
        }}
        title={`Remote Control: ${selectedDisplay?.name}`}
      >
        <div className="space-y-4">
          {selectedDisplay && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-400 text-sm">
                <strong>Display:</strong> {selectedDisplay.name}
                {selectedDisplay.location && ` (${selectedDisplay.location})`}
              </p>
              {selectedDisplay.current_channel_id && (
                <p className="text-text-muted text-xs mt-1">
                  Currently playing: {selectedDisplay.current_channel_id}
                </p>
              )}
            </div>
          )}
          
          <p className="text-text-secondary">Select a channel to play on this display:</p>
          
          {channels.length === 0 ? (
            <div className="text-center py-8">
              <Spinner size="md" className="mb-2" />
              <p className="text-text-muted text-sm">Loading channels...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Group Filter */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Filter by Group
                </label>
                <select
                  value={selectedGroupForControl}
                  onChange={(e) => setSelectedGroupForControl(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background-lighter text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Groups ({channels.length} channels)</option>
                  {groupsForControl.map(group => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Select Channel ({filteredChannelsForControl.length} available)
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => {
                    console.log('Selected channel ID:', e.target.value);
                    setSelectedChannel(e.target.value);
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-background-lighter text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary"
                  size="12"
                >
                  <option value="">-- Choose a channel --</option>
                  {filteredChannelsForControl.map(channel => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name} {channel.group && `[${channel.group}]`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Volume Control */}
          {channels.length > 0 && (
            <div className="border-t border-slate-700 pt-4 mt-4">
              <h3 className="text-sm font-medium text-white mb-3">🔊 Audio Control</h3>
              
              <div className="space-y-3">
                {/* Quick Mute Controls */}
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleMuteControl(true)}
                    className="flex-1"
                  >
                    🔇 Mute
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleMuteControl(false)}
                    className="flex-1"
                  >
                    🔊 Unmute
                  </Button>
                </div>

                {/* Volume Slider with iOS Warning */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-text-secondary">Volume Level</label>
                    <span className="text-primary font-bold">{volumeLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volumeLevel}
                    onChange={(e) => handleVolumeSliderChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-background-lighter rounded-lg appearance-none cursor-pointer accent-primary mb-2"
                  />
                  <p className="text-xs text-green-400 text-center mb-2">
                    💡 Volume changes automatically as you drag
                  </p>
                  <p className="text-xs text-yellow-400">
                    ⚠️ Note: iPhones ignore web volume control. Use device buttons for iPhones. iPads work perfectly! ✅
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-4 border-t border-slate-700 mt-4">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowControlModal(false);
                setSelectedChannel('');
                setChannels([]);
              }} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleRemoteControl} 
              disabled={!selectedChannel || channels.length === 0}
              className="flex-1"
            >
              Switch Channel Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Display Token Modal */}
      <Modal
        isOpen={showTokenModal}
        onClose={() => {
          setShowTokenModal(false);
          setCreatedDisplay(null);
        }}
        title="Display Created Successfully!"
        size="lg"
      >
        {createdDisplay && (
          <div className="space-y-6">
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-400 font-medium mb-2">✅ Display "{createdDisplay.name}" created successfully!</p>
              <p className="text-text-secondary text-sm">Use the URL below to access this display on your cafe TV.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                🌐 Display URL (Computer/Localhost)
              </label>
              <div className="bg-background-lighter border border-slate-600 rounded-lg p-3">
                <code className="text-primary text-sm break-all">
                  http://localhost:5173/display?token={createdDisplay.token}
                </code>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  navigator.clipboard.writeText(`http://localhost:5173/display?token=${createdDisplay.token}`);
                  alert('Copied to clipboard!');
                }}
                className="mt-2"
              >
                📋 Copy URL
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                📱 Display URL (Network - Phone/Tablet)
              </label>
              <div className="bg-background-lighter border border-slate-600 rounded-lg p-3">
                <code className="text-primary text-sm break-all">
                  http://192.168.100.236:5173/display?token={createdDisplay.token}
                </code>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  navigator.clipboard.writeText(`http://192.168.100.236:5173/display?token=${createdDisplay.token}`);
                  alert('Copied to clipboard!');
                }}
                className="mt-2"
              >
                📋 Copy Network URL
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                🔑 Display Token
              </label>
              <div className="bg-background-lighter border border-slate-600 rounded-lg p-3">
                <code className="text-yellow-400 text-xs break-all font-mono">
                  {createdDisplay.token}
                </code>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-400 text-sm">
                <strong>💡 Tip:</strong> Open this URL on your cafe TV browser and bookmark it. 
                The display will auto-login and start playing channels!
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="primary" 
                onClick={() => {
                  setShowTokenModal(false);
                  setCreatedDisplay(null);
                }}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


