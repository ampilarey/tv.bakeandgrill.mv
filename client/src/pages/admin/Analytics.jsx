import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import SkeletonLoader from '../../components/SkeletonLoader';
import Footer from '../../components/Footer';
import MobileMenu from '../../components/MobileMenu';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [timeRange, setTimeRange] = useState('7d'); // 24h, 7d, 30d, all
  const [activeTab, setActiveTab] = useState('overview'); // overview, users
  const [expandedUsers, setExpandedUsers] = useState({});
  const [userPermissions, setUserPermissions] = useState(null);
  
  // Filter states
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [sortBy, setSortBy] = useState('watchTime'); // watchTime, sessions, channels, name
  const [minWatchTime, setMinWatchTime] = useState('');
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch permissions first
    fetchUserPermissions();
  }, [user]);

  const fetchUserPermissions = async () => {
    try {
      const response = await api.get('/permissions/me');
      setUserPermissions(response.data.permissions);
      
      // Check if user has access
      const canAccess = user?.role === 'admin' || 
                       response.data.permissions?.can_view_analytics === 1;
      
      console.log('📊 Analytics access check:', {
        role: user?.role,
        canViewAnalytics: response.data.permissions?.can_view_analytics,
        hasAccess: canAccess
      });
      
      if (!canAccess) {
        navigate('/dashboard');
        return;
      }
      
      // Initial data fetch
      if (activeTab === 'overview') {
        fetchAnalytics();
      } else if (activeTab === 'users') {
        fetchAllUsers();
        fetchUserStats();
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      if (user?.role !== 'admin') {
        navigate('/dashboard');
      }
    }
  };

  useEffect(() => {
    if (!userPermissions) return;
    
    if (activeTab === 'overview') {
      fetchAnalytics();
    } else if (activeTab === 'users') {
      fetchAllUsers();
      fetchUserStats();
    }
  }, [timeRange, activeTab, selectedUserId]);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/analytics?range=${timeRange}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await api.get('/users');
      setAllUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range: timeRange });
      if (selectedUserId) {
        params.append('userId', selectedUserId);
      }
      const response = await api.get(`/analytics/users?${params.toString()}`);
      setUserStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort users
  const getFilteredAndSortedUsers = () => {
    if (!userStats?.users) return [];

    let filtered = [...userStats.users];

    // Search filter (email/name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(query) ||
        (user.name && user.name.toLowerCase().includes(query))
      );
    }

    // Channel filter
    if (channelFilter) {
      const channelQuery = channelFilter.toLowerCase();
      filtered = filtered.filter(user => 
        user.channels?.some(ch => 
          ch.channel_name.toLowerCase().includes(channelQuery)
        )
      );
    }

    // Minimum watch time filter
    if (minWatchTime) {
      const minSeconds = parseInt(minWatchTime) * 60; // Convert minutes to seconds
      filtered = filtered.filter(user => user.total_seconds >= minSeconds);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'watchTime':
          return (b.total_seconds || 0) - (a.total_seconds || 0);
        case 'sessions':
          return (b.total_sessions || 0) - (a.total_sessions || 0);
        case 'channels':
          return (b.channels?.length || 0) - (a.channels?.length || 0);
        case 'name':
          return (a.email || '').localeCompare(b.email || '');
        default:
          return 0;
      }
    });

    return filtered;
  };

  const toggleUserExpanded = (userId) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-tv-bg md:pb-6 overflow-y-auto" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="bg-tv-accent border-b border-tv-borderSubtle p-4 flex-shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <MobileMenu />
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-4">
          <SkeletonLoader type="card" count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tv-bg pb-24 md:pb-6 overflow-y-auto">
      {/* Header */}
      <div className="bg-tv-accent border-b border-tv-borderSubtle p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">📊 Analytics Dashboard</h1>
              <p className="text-white/90 text-sm mt-1">Platform usage and performance metrics</p>
            </div>
            <MobileMenu />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-white/20">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'border-white text-white'
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'users'
                  ? 'border-white text-white'
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              User Details
            </button>
          </div>

          {/* Time Range Filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: '24h', label: 'Last 24 Hours' },
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
              { value: 'all', label: 'All Time' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTimeRange(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === value
                    ? 'bg-white/20 text-white'
                    : 'bg-tv-bgSoft text-tv-textSecondary hover:bg-tv-bgHover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Users */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tv-textSecondary text-sm">Total Users</p>
                    <p className="text-3xl font-bold text-tv-text">{stats?.totalUsers || 0}</p>
                  </div>
                  <div className="text-4xl">👥</div>
                </div>
              </Card>

              {/* Active Displays */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tv-textSecondary text-sm">Active Displays</p>
                    <p className="text-3xl font-bold text-tv-text">{stats?.activeDisplays || 0}</p>
                  </div>
                  <div className="text-4xl">🖥️</div>
                </div>
              </Card>

              {/* Total Playlists */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tv-textSecondary text-sm">Total Playlists</p>
                    <p className="text-3xl font-bold text-tv-text">{stats?.totalPlaylists || 0}</p>
                  </div>
                  <div className="text-4xl">📋</div>
                </div>
              </Card>

              {/* Total Watch Time */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-tv-textSecondary text-sm">Total Watch Time</p>
                    <p className="text-3xl font-bold text-tv-text">
                      {formatDuration(stats?.totalWatchTime || 0)}
                    </p>
                  </div>
                  <div className="text-4xl">⏱️</div>
                </div>
              </Card>
            </div>

            {/* Most Watched Channels */}
            <Card className="mb-6">
              <h2 className="text-xl font-bold text-tv-text mb-4">🔥 Most Watched Channels</h2>
              {stats?.mostWatchedChannels?.length > 0 ? (
                <div className="space-y-3">
                  {stats.mostWatchedChannels.slice(0, 10).map((channel, index) => (
                    <div 
                      key={channel.channel_id}
                      className="flex items-center justify-between p-3 bg-tv-bgSoft rounded-lg hover:bg-tv-bgHover transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl font-bold text-tv-accent">#{index + 1}</span>
                        <div>
                          <p className="font-medium text-tv-text">{channel.channel_name}</p>
                          <p className="text-sm text-tv-textSecondary">
                            {channel.view_count} {channel.view_count === 1 ? 'view' : 'views'}
                          </p>
                        </div>
                      </div>
                      <Badge color="primary">
                        {formatDuration(channel.total_seconds)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-tv-textSecondary text-center py-8">No watch data available</p>
              )}
            </Card>

            {/* Recent Activity */}
            <Card>
              <h2 className="text-xl font-bold text-tv-text mb-4">🕒 Recent Activity</h2>
              {stats?.recentActivity?.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentActivity.slice(0, 15).map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-center justify-between p-3 bg-tv-bgSoft rounded-lg text-sm"
                    >
                      <div className="flex-1">
                        <p className="text-tv-text font-medium">{activity.user_email}</p>
                        <p className="text-tv-textSecondary">
                          Watched <span className="text-tv-accent">{activity.channel_name}</span>
                        </p>
                      </div>
                      <p className="text-tv-textMuted text-xs">
                        {new Date(activity.watched_at).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-tv-textSecondary text-center py-8">No recent activity</p>
              )}
            </Card>
          </>
        )}

        {/* User Details Tab */}
        {activeTab === 'users' && (
          <Card className="mt-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-tv-text mb-4">👥 User Viewing Statistics</h2>
              
              {/* Filter Controls */}
              <div className="mb-4 p-4 bg-tv-bgSoft rounded-lg border border-tv-borderSubtle">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
                  {/* User Select Filter */}
                  <div>
                    <label className="block text-sm font-medium text-tv-text mb-1">Filter by User</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 border-tv-borderSubtle bg-tv-bgElevated text-tv-text focus:outline-none focus:ring-2 focus:ring-tv-accent"
                    >
                      <option value="">All Users</option>
                      {allUsers.map(user => (
                        <option key={user.id} value={user.id}>{user.email}</option>
                      ))}
                    </select>
                  </div>

                  {/* Search Filter */}
                  <div>
                    <label className="block text-sm font-medium text-tv-text mb-1">Search User</label>
                    <input
                      type="text"
                      placeholder="Email or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 border-tv-borderSubtle bg-tv-bgElevated text-tv-text placeholder-tv-textMuted focus:outline-none focus:ring-2 focus:ring-tv-accent"
                    />
                  </div>

                  {/* Channel Filter */}
                  <div>
                    <label className="block text-sm font-medium text-tv-text mb-1">Filter by Channel</label>
                    <input
                      type="text"
                      placeholder="Channel name..."
                      value={channelFilter}
                      onChange={(e) => setChannelFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 border-tv-borderSubtle bg-tv-bgElevated text-tv-text placeholder-tv-textMuted focus:outline-none focus:ring-2 focus:ring-tv-accent"
                    />
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-tv-text mb-1">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 border-tv-borderSubtle bg-tv-bgElevated text-tv-text focus:outline-none focus:ring-2 focus:ring-tv-accent"
                    >
                      <option value="watchTime">Watch Time (High to Low)</option>
                      <option value="sessions">Sessions (High to Low)</option>
                      <option value="channels">Channels (High to Low)</option>
                      <option value="name">Name (A to Z)</option>
                    </select>
                  </div>

                  {/* Minimum Watch Time Filter */}
                  <div>
                    <label className="block text-sm font-medium text-tv-text mb-1">Min Watch Time (min)</label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={minWatchTime}
                      onChange={(e) => setMinWatchTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 border-tv-borderSubtle bg-tv-bgElevated text-tv-text placeholder-tv-textMuted focus:outline-none focus:ring-2 focus:ring-tv-accent"
                    />
                  </div>
                </div>

                {/* Clear Filters Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedUserId('');
                      setSearchQuery('');
                      setChannelFilter('');
                      setMinWatchTime('');
                      setSortBy('watchTime');
                    }}
                    className="px-6 py-2 bg-tv-accent hover:bg-tv-accentHover text-white rounded-lg font-medium transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>

              {/* Results Count */}
              <div className="mb-4 text-sm text-tv-textSecondary">
                Showing {getFilteredAndSortedUsers().length} of {userStats?.users?.length || 0} users
              </div>
            </div>

            {getFilteredAndSortedUsers().length > 0 ? (
              <div className="space-y-4">
                {getFilteredAndSortedUsers().map((user) => (
                  <div 
                    key={user.id}
                    className="border-2 border-tv-borderSubtle rounded-lg overflow-hidden"
                  >
                    {/* User Header */}
                    <button
                      onClick={() => toggleUserExpanded(user.id)}
                      className="w-full p-4 bg-tv-bgSoft hover:bg-tv-bgHover transition-colors text-left flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-lg font-bold text-tv-text">{user.email}</p>
                          {user.name && (
                            <span className="text-sm text-tv-textSecondary">({user.name})</span>
                          )}
                        </div>
                        <div className="flex gap-4 text-sm text-tv-textSecondary">
                          <span>📺 {user.total_sessions} sessions</span>
                          <span>⏱️ {formatDuration(user.total_seconds)} watched</span>
                          <span>📊 {user.channels?.length || 0} channels</span>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-tv-accent transition-transform ${
                          expandedUsers[user.id] ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Expanded Content */}
                    {expandedUsers[user.id] && (
                      <div className="p-4 bg-tv-bgElevated space-y-6">
                        {/* Channels Watched */}
                        {user.channels && user.channels.length > 0 && (
                          <div>
                            <h3 className="text-lg font-bold text-tv-text mb-3">📺 Channels Watched</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {user.channels.map((channel, idx) => {
                                const { date: firstDate, time: firstTime } = formatDateTime(channel.first_watched);
                                const { date: lastDate, time: lastTime } = formatDateTime(channel.last_watched);
                                return (
                                  <div
                                    key={channel.channel_id}
                                    className="p-3 bg-tv-bgSoft rounded-lg border border-tv-borderSubtle"
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <p className="font-semibold text-tv-text">{channel.channel_name}</p>
                                        <p className="text-sm text-tv-textSecondary mt-1">
                                          {channel.view_count} {channel.view_count === 1 ? 'view' : 'views'} • {formatDuration(channel.total_seconds)} total
                                        </p>
                                      </div>
                                      <Badge color="primary" className="ml-2">
                                        {formatDuration(channel.total_seconds)}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-tv-textMuted mt-2 space-y-1">
                                      <p>First: {firstDate} at {firstTime}</p>
                                      <p>Last: {lastDate} at {lastTime}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Detailed Sessions */}
                        {user.sessions && user.sessions.length > 0 && (
                          <div>
                            <h3 className="text-lg font-bold text-tv-text mb-3">📅 Viewing Sessions (Recent 100)</h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {user.sessions.map((session) => {
                                const { date, time } = formatDateTime(session.watched_at);
                                return (
                                  <div
                                    key={session.id}
                                    className="p-3 bg-tv-bgSoft rounded-lg border border-tv-borderSubtle text-sm"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="font-medium text-tv-text">{session.channel_name}</p>
                                        <p className="text-xs text-tv-textSecondary mt-1">
                                          {session.playlist_name && `Playlist: ${session.playlist_name} • `}
                                          Watched for {formatDuration(session.duration_seconds)}
                                        </p>
                                      </div>
                                      <div className="text-right text-xs text-tv-textMuted ml-4">
                                        <p>{date}</p>
                                        <p>{time}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {(!user.channels || user.channels.length === 0) && (!user.sessions || user.sessions.length === 0) && (
                          <p className="text-tv-textSecondary text-center py-4">No viewing data available</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-tv-textSecondary text-center py-8">
                {userStats?.users?.length > 0 
                  ? 'No users match your filters. Try adjusting your search criteria.'
                  : 'No user viewing data available'}
              </p>
            )}
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
}

