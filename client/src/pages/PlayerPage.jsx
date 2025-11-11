import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Hls from 'hls.js';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Spinner from '../components/common/Spinner';
import Badge from '../components/common/Badge';

export default function PlayerPage() {
  const [searchParams] = useSearchParams();
  const playlistId = searchParams.get('playlistId');
  
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [recentlyWatched, setRecentlyWatched] = useState([]);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Remember last visited playlist for quick access via bottom navigation
  useEffect(() => {
    if (playlistId && typeof window !== 'undefined') {
      window.localStorage.setItem('lastPlaylistId', playlistId);
    }
  }, [playlistId]);

  // Fetch channels from playlist
  useEffect(() => {
    if (!playlistId) {
      navigate('/dashboard');
      return;
    }

    const fetchChannels = async () => {
      try {
        const response = await api.get(`/channels?playlistId=${playlistId}`);
        const channelsList = response.data.channels || [];
        const groupsList = response.data.groups || [];
        
        console.log('Fetched channels:', channelsList.length);
        console.log('Groups found:', groupsList);
        
        setChannels(channelsList);
        setFilteredChannels(channelsList);
        setGroups(groupsList);
        
        // Don't auto-play any channel on page load
        // User should manually select a channel to watch
      } catch (error) {
        console.error('Error fetching channels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [playlistId, navigate]);

  // Fetch favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await api.get(`/favorites?playlistId=${playlistId}`);
        setFavorites(response.data.favorites || []);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
    };

    if (playlistId) {
      fetchFavorites();
    }
  }, [playlistId]);

  // Fetch recently watched channels
  useEffect(() => {
    const fetchRecentlyWatched = async () => {
      try {
        const response = await api.get(`/history?playlistId=${playlistId}&limit=100`);
        const history = response.data.history || [];
        
        // Get unique channels (most recent first)
        const uniqueChannels = [];
        const seenIds = new Set();
        
        for (const item of history) {
          if (!seenIds.has(item.channel_id) && uniqueChannels.length < 50) {
            seenIds.add(item.channel_id);
            
            // Find full channel info from channels list
            const channelInfo = channels.find(c => c.id === item.channel_id);
            if (channelInfo) {
              uniqueChannels.push({
                ...channelInfo,
                watched_at: item.watched_at
              });
            }
          }
        }
        
        setRecentlyWatched(uniqueChannels);
      } catch (error) {
        console.error('Error fetching watch history:', error);
      }
    };

    if (playlistId && channels.length > 0) {
      fetchRecentlyWatched();
    }
  }, [playlistId, channels]);

  // Filter channels
  useEffect(() => {
    let result = [...channels]; // Create copy to avoid mutation

    console.log('Filtering channels:', {
      total: channels.length,
      selectedGroup,
      showFavoritesOnly,
      searchQuery
    });

    // Favorites filter (apply first if active)
    if (showFavoritesOnly) {
      const favChannelIds = favorites.map(f => f.channel_id);
      result = result.filter(ch => favChannelIds.includes(ch.id));
      console.log('After favorites filter:', result.length);
    }

    // Group filter
    if (selectedGroup && selectedGroup !== '') {
      const beforeFilter = result.length;
      result = result.filter(ch => {
        // Handle null/undefined groups
        if (!ch.group) {
          console.log('Channel without group:', ch.name);
          return false;
        }
        
        // Normalize both values for comparison
        const channelGroup = ch.group.trim();
        const filterGroup = selectedGroup.trim();
        
        // Exact match (case-sensitive)
        const match = channelGroup === filterGroup;
        
        if (!match) {
          console.log(`No match: "${channelGroup}" !== "${filterGroup}" for channel:`, ch.name);
        }
        
        return match;
      });
      console.log(`After group filter "${selectedGroup}": ${beforeFilter} -> ${result.length} channels`);
      
      // If no results, log sample channel groups for debugging
      if (result.length === 0 && channels.length > 0) {
        console.log('No channels matched! Sample channel groups:', 
          channels.slice(0, 5).map(ch => ({ name: ch.name, group: ch.group }))
        );
      }
    }

    // Search filter (apply last)
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(ch => 
        (ch.name && ch.name.toLowerCase().includes(query)) ||
        (ch.group && ch.group.toLowerCase().includes(query))
      );
      console.log('After search filter:', result.length);
    }

    console.log('Final filtered channels:', result.length);
    setFilteredChannels(result);
  }, [searchQuery, selectedGroup, showFavoritesOnly, channels, favorites]);

  // Video player setup
  useEffect(() => {
    if (!currentChannel || !videoRef.current) return;

    const video = videoRef.current;
    const isHLS = currentChannel.url.endsWith('.m3u8');

    if (isHLS && Hls.isSupported()) {
      // HLS.js playback
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      });

      hlsRef.current = hls;
      hls.loadSource(currentChannel.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(err => console.error('Play error:', err));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
      });

    } else {
      // Native playback
      video.src = currentChannel.url;
      video.play().catch(err => console.error('Play error:', err));
    }

    // Log watch history
    const logHistory = async () => {
      try {
        await api.post('/history', {
          playlist_id: parseInt(playlistId),
          channel_id: currentChannel.id,
          channel_name: currentChannel.name,
          duration_seconds: Math.floor(video.currentTime || 0)
        });
      } catch (error) {
        console.error('Error logging history:', error);
      }
    };

    // Log on channel change (after 5 seconds)
    const timer = setTimeout(logHistory, 5000);

    return () => {
      clearTimeout(timer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentChannel, playlistId]);

  const handleChannelClick = (channel) => {
    setCurrentChannel(channel);
    setIsAutoPlay(false); // Mark as user-initiated
  };

  const toggleFavorite = async (channel) => {
    const isFavorite = favorites.some(f => f.channel_id === channel.id);

    try {
      if (isFavorite) {
        const fav = favorites.find(f => f.channel_id === channel.id);
        await api.delete(`/favorites/${fav.id}`);
        setFavorites(favorites.filter(f => f.id !== fav.id));
      } else {
        const response = await api.post('/favorites', {
          playlist_id: parseInt(playlistId),
          channel_id: channel.id,
          channel_name: channel.name
        });
        setFavorites([...favorites, response.data.favorite]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const isFavorite = (channelId) => {
    return favorites.some(f => f.channel_id === channelId);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-background overflow-hidden">
      {/* Sidebar - Channel List */}
      <div className="w-full md:w-96 bg-background-light border-r border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>

          {/* Search */}
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-3"
          />

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={showFavoritesOnly ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              ⭐ Favorites
            </Button>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-1 text-sm rounded-lg bg-background-lighter text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Groups</option>
              {groups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Recently Watched Section */}
          {recentlyWatched.length > 0 && !searchQuery && !selectedGroup && !showFavoritesOnly && (
            <div className="p-2 border-b border-slate-700">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                  🕒 Recently Watched
                </h3>
                {recentlyWatched.length > 5 && (
                  <button
                    onClick={() => setShowAllRecent(!showAllRecent)}
                    className="text-xs text-primary hover:text-primary-light transition-colors"
                  >
                    {showAllRecent ? 'Show Less' : `Show All (${recentlyWatched.length})`}
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {(showAllRecent ? recentlyWatched : recentlyWatched.slice(0, 5)).map((channel) => (
                  <div
                    key={`recent-${channel.id}`}
                    onClick={() => handleChannelClick(channel)}
                    className={`
                      p-3 rounded-lg cursor-pointer transition-all
                      ${currentChannel?.id === channel.id 
                        ? 'bg-primary/20 border border-primary' 
                        : 'bg-background-lighter/50 hover:bg-background-lighter border border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate text-sm">{channel.name}</h3>
                          {currentChannel?.id === channel.id && (
                            <Badge color="success" size="sm">Playing</Badge>
                          )}
                        </div>
                        {channel.group && (
                          <p className="text-xs text-text-muted">{channel.group}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(channel);
                        }}
                        className="ml-2 p-1 hover:scale-110 transition-transform"
                      >
                        {isFavorite(channel.id) ? '⭐' : '☆'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Channels Section */}
          {filteredChannels.length === 0 ? (
            <div className="p-8 text-center text-text-muted">
              <p>No channels found</p>
            </div>
          ) : (
            <div className="p-2">
              {recentlyWatched.length > 0 && !searchQuery && !selectedGroup && !showFavoritesOnly && (
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2 px-1">
                  📺 All Channels
                </h3>
              )}
              {filteredChannels.map((channel) => (
                <div
                  key={channel.id}
                  onClick={() => handleChannelClick(channel)}
                  className={`
                    p-3 mb-2 rounded-lg cursor-pointer transition-all
                    ${currentChannel?.id === channel.id 
                      ? 'bg-primary/20 border border-primary' 
                      : 'bg-background hover:bg-background-lighter border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-white truncate">{channel.name}</h3>
                        {currentChannel?.id === channel.id && (
                          <Badge color="success" size="sm">Playing</Badge>
                        )}
                      </div>
                      {channel.group && (
                        <p className="text-xs text-text-muted">{channel.group}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(channel);
                      }}
                      className="ml-2 p-1 hover:scale-110 transition-transform"
                    >
                      {isFavorite(channel.id) ? '⭐' : '☆'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Channel Count */}
        <div className="p-3 border-t border-slate-700 text-sm text-text-muted text-center">
          {filteredChannels.length} of {channels.length} channels
        </div>
      </div>

      {/* Main Player Area */}
      <div className="flex-1 flex flex-col bg-black">
        {currentChannel ? (
          <>
            {/* Video Player */}
            <div className="flex-1 relative">
              <video
                ref={videoRef}
                className="w-full h-full"
                controls
                autoPlay
              />
            </div>

            {/* Current Channel Info */}
            <div className="bg-background-light p-4 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{currentChannel.name}</h2>
                  {currentChannel.group && (
                    <p className="text-sm text-text-secondary">{currentChannel.group}</p>
                  )}
                </div>
                <Button variant="ghost" onClick={() => toggleFavorite(currentChannel)}>
                  {isFavorite(currentChannel.id) ? '⭐ Favorited' : '☆ Add to Favorites'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-24 h-24 mx-auto text-text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-text-secondary">Select a channel to start watching</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

