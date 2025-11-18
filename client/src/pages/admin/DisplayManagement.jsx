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
import MobileMenu from '../../components/MobileMenu';
import PairDisplayModal from '../../components/PairDisplayModal';
import Footer from '../../components/Footer';

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
  const [showPairModal, setShowPairModal] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [userPermissions, setUserPermissions] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [newSchedule, setNewSchedule] = useState({
    channel_id: '',
    channel_name: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    is_active: true
  });
  
  const { user, logout} = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch permissions first
    fetchUserPermissions();
    
    // Check for QR code auto-pair PIN in URL
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const autoPairPin = urlParams.get('autoPairPin');
    
    if (autoPairPin) {
      console.log('🔍 Auto-pair PIN detected from QR code:', autoPairPin);
      // Open pair modal with pre-filled PIN after a short delay
      setTimeout(() => {
        setShowPairModal(true);
        // We'll pass the PIN to the modal
        window.autoPairPin = autoPairPin;
      }, 500);
    }
  }, [user]);

  const fetchUserPermissions = async () => {
    try {
      const response = await api.get('/permissions/me');
      setUserPermissions(response.data.permissions);
      
      // Check if user has access
      const canAccess = user?.role === 'admin' || 
                       response.data.permissions?.can_manage_displays || 
                       response.data.permissions?.can_control_displays;
      
      if (!canAccess) {
        navigate('/dashboard');
        return;
      }
      
      fetchDisplays();
      fetchPlaylists();
    } catch (error) {
      console.error('Error fetching permissions:', error);
      if (user?.role !== 'admin') {
        navigate('/dashboard');
      }
    }
  };

  useEffect(() => {
    if (!userPermissions) return;

    // Auto-refresh displays every 5 seconds to update online status
    const refreshInterval = setInterval(() => {
      fetchDisplays();
    }, 5000); // 5 seconds for faster status updates

    return () => clearInterval(refreshInterval);
  }, [userPermissions]);

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
      console.log('✅ Display deleted successfully');
    } catch (error) {
      console.error('❌ Delete failed:', error);
      setError(error.response?.data?.error || 'Failed to delete display');
      setTimeout(() => setError(''), 3000);
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
        setError('Failed to load channels: ' + (error.response?.data?.error || error.message));
        setTimeout(() => setError(''), 3000);
      }
    } else {
      setError('This display has no playlist assigned!');
      setTimeout(() => setError(''), 3000);
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
      setError('Please select a channel first!');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    try {
      const channel = channels.find(ch => ch.id === selectedChannel);
      
      if (!channel) {
        setError('Channel not found!');
        setTimeout(() => setError(''), 3000);
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
      
      // Don't close modal - let user send more commands
      // Just clear the selection for next command
      setSelectedChannel('');
      setSelectedGroupForControl('');
      
      // Show brief success feedback
      console.log(`✅ Command sent! Display will switch to "${channel.name}"`);
    } catch (error) {
      console.error('Remote control error:', error);
      setError(error.response?.data?.error || 'Failed to send command');
      setTimeout(() => setError(''), 3000);
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

  const handleFullscreenControl = async () => {
    try {
      await api.post(`/displays/${selectedDisplay.id}/control`, {
        action: 'toggle_fullscreen'
      });
      console.log('✅ Fullscreen command sent');
    } catch (error) {
      console.error('Fullscreen control error:', error);
    }
  };

  const handleOpenSchedules = async (display) => {
    setSelectedDisplay(display);
    setShowScheduleModal(true);
    setError('');
    fetchSchedules(display.id);
    
    // Also fetch channels for this display's playlist
    if (display.playlist_id) {
      try {
        const response = await api.get(`/channels?playlistId=${display.playlist_id}`);
        setChannels(response.data.channels || []);
      } catch (error) {
        console.error('Error fetching channels for schedule:', error);
      }
    }
  };

  const fetchSchedules = async (displayId) => {
    try {
      const response = await api.get(`/displays/${displayId}/schedules`);
      setSchedules(response.data.schedules || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setSchedules([]);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!newSchedule.channel_id || !newSchedule.start_time || !newSchedule.end_time) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      const channel = channels.find(ch => ch.id === newSchedule.channel_id);
      await api.post(`/displays/${selectedDisplay.id}/schedules`, {
        ...newSchedule,
        channel_name: channel?.name || 'Unknown Channel'
      });
      
      setNewSchedule({
        channel_id: '',
        channel_name: '',
        day_of_week: '',
        start_time: '',
        end_time: '',
        is_active: true
      });
      
      fetchSchedules(selectedDisplay.id);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm('Delete this schedule?')) return;
    
    try {
      await api.delete(`/schedules/${scheduleId}`);
      fetchSchedules(selectedDisplay.id);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete schedule');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-tv-bg">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tv-bg flex flex-col overflow-y-auto">
      {/* Top Bar */}
      <div className="bg-tv-accent border-b border-tv-borderSubtle px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMenu />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Display Management</h1>
              <p className="text-xs md:text-sm text-white/90 hidden sm:block">
                Manage cafe TV displays
                <span className="ml-3 text-xs text-tv-gold animate-pulse">● Auto-refresh (10s)</span>
              </p>
            </div>
          </div>
          <div className="hidden md:flex gap-3">
            <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
              ← Admin Home
            </Button>
            <Button variant="ghost" onClick={logout}>Logout</Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto flex-1 pb-24 md:pb-6 w-full">
        {/* Guide Section */}
        <Card className="mb-6 border-2 border-tv-accent/30 bg-tv-accent/5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-tv-accent/20 flex items-center justify-center">
              <svg className="w-6 h-6 md:w-7 md:h-7 text-tv-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-tv-text">📺 Display Management Guide</h3>
                <button
                  onClick={() => setGuideExpanded(!guideExpanded)}
                  className="text-sm font-medium text-tv-accent hover:text-tv-accentHover flex items-center gap-1 transition-colors"
                >
                  {guideExpanded ? (
                    <>
                      <span>Show Less</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <span>View More</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
              
              {/* Short Summary - Always Visible */}
              <div className="text-sm text-tv-textSecondary space-y-2">
                <p className="font-semibold text-tv-text">Quick Start:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li><strong>On TV:</strong> Open <code className="bg-tv-bgElevated px-2 py-1 rounded text-xs">https://tv.bakeandgrill.mv/#/pair</code> - copy the 6-digit PIN</li>
                  <li><strong>In Admin:</strong> Click "Pair Display" → Enter PIN + details → Click "Pair Display"</li>
                  <li><strong>Result:</strong> Display connects automatically and starts playing</li>
                </ol>
              </div>

              {/* Detailed Guide - Expandable */}
              {guideExpanded && (
                <div className="mt-4 space-y-4 text-sm text-tv-textSecondary border-t border-tv-borderSubtle pt-4">
                  <div>
                    <p className="font-semibold text-tv-text mb-2">🔢 How to Connect Display Using PIN Code:</p>
                    <div className="bg-tv-bgSoft rounded-lg p-4 border border-tv-borderSubtle space-y-3">
                      <div>
                        <p className="font-medium text-tv-text mb-1">Step 1: On the TV/Display Device</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Open a browser on the TV/device</li>
                          <li>Navigate to: <code className="bg-tv-bgElevated px-2 py-1 rounded text-xs">https://tv.bakeandgrill.mv/#/pair</code></li>
                          <li>The screen will show a 6-digit PIN code (e.g., <strong>123456</strong>)</li>
                          <li>You'll see: "Enter this PIN in Admin Panel"</li>
                          <li>Note: PIN refreshes every 5 minutes</li>
                          <li>The display checks for pairing every 3 seconds automatically</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-medium text-tv-text mb-1">Step 2: In Admin Panel (Your Computer/Phone)</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Log in to Admin Panel → Display Management</li>
                          <li>Click "Pair Display" button</li>
                          <li>In the Pair New Display modal:</li>
                          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                            <li>Select "PIN Code" tab (default)</li>
                            <li>Enter Display Name (e.g., "Main Wall Display")</li>
                            <li>Enter Location (optional, e.g., "Cafe Main Wall")</li>
                            <li>Select Default Playlist (required - must assign a playlist)</li>
                            <li>Enter the 6-digit PIN shown on the TV</li>
                          </ul>
                          <li>Click "Pair Display"</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-medium text-tv-text mb-1">Step 3: Automatic Connection ✅</p>
                        <p className="ml-2">After clicking "Pair Display" in admin panel, the TV/display will automatically:</p>
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li>Detect the pairing (checks every 3 seconds)</li>
                          <li>Show "Paired Successfully!" message</li>
                          <li>Redirect to kiosk mode player</li>
                          <li>Start playing the assigned playlist</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-tv-text mb-1">Two Ways to Add Displays:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Pair Display:</strong> Use PIN code pairing (recommended). Open <code className="bg-tv-bgElevated px-1 py-0.5 rounded text-xs">/#/pair</code> on your TV, enter the PIN in admin panel, and it will automatically connect.</li>
                      <li><strong>Manual:</strong> Create a display manually and copy the display URL to open in your TV's browser.</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-tv-text mb-1">Managing Displays:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Remote Control:</strong> Change channels, adjust volume, and control playback remotely.</li>
                      <li><strong>Assign Playlist:</strong> Each display needs a playlist assigned before it can show channels.</li>
                      <li><strong>Status:</strong> Green badge means online, red means offline. Status updates every 10 seconds.</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-tv-text mb-1">Quick Tips:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>PIN expires after 5 minutes - refresh the page on TV to get a new PIN if expired</li>
                      <li>Playlist is required - you must assign a playlist before pairing</li>
                      <li>Auto-checking - TV checks for pairing every 3 seconds, no manual refresh needed</li>
                      <li>Keep the display URL bookmarked or saved on the TV for easy access</li>
                      <li>Displays will enter kiosk mode automatically (fullscreen, no controls)</li>
                      <li>Use the "View Display URL" button to see the direct link for each display</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-tv-text">Displays ({displays.length})</h2>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => setShowPairModal(true)}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Pair Display
            </Button>
            <Button variant="ghost" onClick={() => setShowCreateModal(true)}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Manual
            </Button>
          </div>
        </div>

        {displays.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-tv-textMuted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-tv-textSecondary">No displays configured yet</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displays.map((display) => (
              <Card key={display.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-tv-text">{display.name}</h3>
                      <Badge color={display.status === 'online' ? 'success' : 'danger'}>
                        {display.status}
                      </Badge>
                    </div>
                    {display.location && (
                      <p className="text-sm text-tv-textSecondary mb-2">📍 {display.location}</p>
                    )}
                    {display.last_heartbeat ? (
                      <p className="text-xs text-tv-textMuted">
                        Last seen: {new Date(display.last_heartbeat).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-xs text-tv-textMuted">Never connected</p>
                    )}
                    {display.current_channel_id && (
                      <p className="text-sm text-tv-textMuted mt-1">Now: {display.current_channel_id}</p>
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
                  
                  {/* Schedule button - hidden on mobile for now, will enhance later */}
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleOpenSchedules(display)}
                    className="w-full hidden md:block"
                    disabled={!display.playlist_id}
                  >
                    📅 Manage Schedule
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
            <div className="bg-tv-error/20 border border-tv-error/30 rounded-lg p-3 text-tv-error text-sm">
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
            <label className="block text-sm font-medium text-tv-textSecondary mb-2">
              Assign Playlist
            </label>
            <select
              value={newDisplay.playlist_id}
              onChange={(e) => setNewDisplay({...newDisplay, playlist_id: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-tv-bgElevated border-2 border-tv-borderSubtle text-tv-text focus:outline-none focus:ring-2 focus:ring-tv-accent"
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
            <div className="bg-tv-accent/20 border border-tv-accent/30 rounded-lg p-3">
              <p className="text-tv-accent text-sm">
                <strong>Display:</strong> {selectedDisplay.name}
                {selectedDisplay.location && ` (${selectedDisplay.location})`}
              </p>
              {selectedDisplay.current_channel_id && (
                <p className="text-tv-textMuted text-xs mt-1">
                  Currently playing: {selectedDisplay.current_channel_id}
                </p>
              )}
            </div>
          )}
          
          <p className="text-tv-textSecondary">Select a channel to play on this display:</p>
          
          {channels.length === 0 ? (
            <div className="text-center py-8">
              <Spinner size="md" className="mb-2" />
              <p className="text-tv-textMuted text-sm">Loading channels...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Group Filter */}
              <div>
                <label className="block text-sm font-medium text-tv-textSecondary mb-2">
                  Filter by Group
                </label>
                <select
                  value={selectedGroupForControl}
                  onChange={(e) => setSelectedGroupForControl(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-tv-bgElevated border-2 border-tv-borderSubtle text-tv-text focus:outline-none focus:ring-2 focus:ring-tv-accent"
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
                <label className="block text-sm font-medium text-tv-textSecondary mb-2">
                  Select Channel ({filteredChannelsForControl.length} available)
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => {
                    console.log('Selected channel ID:', e.target.value);
                    setSelectedChannel(e.target.value);
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-tv-bgElevated border-2 border-tv-borderSubtle text-tv-text focus:outline-none focus:ring-2 focus:ring-tv-accent"
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

          {/* Display Controls */}
          <div className="bg-tv-bgSoft rounded-lg p-4 border border-tv-borderSubtle mb-4">
            <h3 className="text-sm font-medium text-tv-text mb-3">🎮 Screen Control</h3>
            <Button
              variant="primary"
              onClick={handleFullscreenControl}
              className="w-full"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Toggle Fullscreen
            </Button>
            <p className="text-xs text-tv-textMuted mt-2 text-center">
              Maximize display to fullscreen mode
            </p>
          </div>
          
          {/* Volume Control */}
          {channels.length > 0 && (
            <div className="border-t border-slate-700 pt-4 mt-4">
              <h3 className="text-sm font-medium text-tv-text mb-3">🔊 Audio Control</h3>
              
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
                <div className="bg-tv-accent/20 border border-tv-accent/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-tv-text">Volume Level</label>
                    <span className="text-tv-accent font-bold">{volumeLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volumeLevel}
                    onChange={(e) => handleVolumeSliderChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-tv-bgElevated rounded-lg appearance-none cursor-pointer accent-tv-accent mb-2"
                  />
                  <p className="text-xs text-tv-accent text-center mb-2">
                    💡 Volume changes automatically as you drag
                  </p>
                  <p className="text-xs text-tv-text bg-tv-gold/20 border border-tv-gold/40 rounded px-2 py-1">
                    ⚠️ Note: iPhones ignore web volume control. Use device buttons for iPhones. iPads work perfectly! ✅
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-4 border-t border-tv-borderSubtle mt-4">
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
            <div className="bg-tv-accent/20 border border-tv-accent/30 rounded-lg p-4">
              <p className="text-tv-accent font-medium mb-2">✅ Display "{createdDisplay.name}" created successfully!</p>
              <p className="text-tv-textSecondary text-sm">Use the URL below to access this display on your cafe TV.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-tv-textSecondary mb-2">
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
              <label className="block text-sm font-medium text-tv-textSecondary mb-2">
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
              <label className="block text-sm font-medium text-tv-textSecondary mb-2">
                🔑 Display Token
              </label>
              <div className="bg-background-lighter border border-slate-600 rounded-lg p-3">
                <code className="text-yellow-400 text-xs break-all font-mono">
                  {createdDisplay.token}
                </code>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <p className="text-tv-accent text-sm">
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

      {/* Pair Display Modal */}
      <PairDisplayModal
        isOpen={showPairModal}
        onClose={() => setShowPairModal(false)}
        onSuccess={(display) => {
          console.log('✅ Display paired successfully:', display);
          setShowPairModal(false);
          // Immediately refresh display list
          fetchDisplays();
          // Refresh again after 3 seconds to catch status update
          setTimeout(() => {
            console.log('🔄 Refreshing displays to update online status...');
            fetchDisplays();
          }, 3000);
        }}
      />
      
      {/* Schedule Management Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setSelectedDisplay(null);
          setSchedules([]);
          setError('');
        }}
        title={`Manage Schedules: ${selectedDisplay?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border-2 border-red-500/50 rounded-xl p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Existing Schedules */}
          <div className="bg-tv-bgSoft rounded-lg p-4 border border-tv-borderSubtle">
            <h3 className="text-tv-text font-bold mb-3">📅 Active Schedules ({schedules.length})</h3>
            
            {schedules.length === 0 ? (
              <p className="text-tv-textMuted text-sm text-center py-4">No schedules yet. Create one below.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="bg-tv-bgElevated rounded-lg p-3 border border-tv-borderSubtle flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-tv-text font-medium text-sm">{schedule.channel_name}</p>
                      <p className="text-tv-textMuted text-xs">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][schedule.day_of_week] || 'Every Day'} • {schedule.start_time?.slice(0,5)} - {schedule.end_time?.slice(0,5)}
                      </p>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteSchedule(schedule.id)}>
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create New Schedule */}
          <div className="bg-tv-bgElevated rounded-lg p-4 border-2 border-tv-accent/30">
            <h3 className="text-tv-text font-bold mb-3">➕ Add New Schedule</h3>
            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-tv-textSecondary mb-2">Channel *</label>
                <select
                  value={newSchedule.channel_id}
                  onChange={(e) => setNewSchedule({...newSchedule, channel_id: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-tv-bgSoft text-tv-text border-2 border-tv-borderSubtle focus:outline-none focus:ring-2 focus:ring-tv-accent text-sm"
                  required
                >
                  <option value="">Select channel...</option>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-tv-textSecondary mb-2">Day of Week</label>
                <select
                  value={newSchedule.day_of_week}
                  onChange={(e) => setNewSchedule({...newSchedule, day_of_week: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-tv-bgSoft text-tv-text border-2 border-tv-borderSubtle focus:outline-none focus:ring-2 focus:ring-tv-accent text-sm"
                >
                  <option value="">Every Day</option>
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-tv-textSecondary mb-2">Start Time *</label>
                  <input
                    type="time"
                    value={newSchedule.start_time}
                    onChange={(e) => setNewSchedule({...newSchedule, start_time: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-tv-bgSoft text-tv-text border-2 border-tv-borderSubtle focus:outline-none focus:ring-2 focus:ring-tv-accent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-tv-textSecondary mb-2">End Time *</label>
                  <input
                    type="time"
                    value={newSchedule.end_time}
                    onChange={(e) => setNewSchedule({...newSchedule, end_time: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-tv-bgSoft text-tv-text border-2 border-tv-borderSubtle focus:outline-none focus:ring-2 focus:ring-tv-accent text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" className="flex-1">
                  Add Schedule
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowScheduleModal(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Modal>

      <Footer />
    </div>
  );
}


