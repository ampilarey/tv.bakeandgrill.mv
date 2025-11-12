import { useState, useEffect } from 'react';
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
  const [timeRange, setTimeRange] = useState('7d'); // 24h, 7d, 30d, all

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

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
      <div className="min-h-screen bg-background pb-24 md:pb-6">
        <div className="bg-background-light border-b border-slate-700 p-4">
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
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      {/* Header */}
      <div className="bg-background-light border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">📊 Analytics Dashboard</h1>
              <p className="text-text-secondary text-sm mt-1">Platform usage and performance metrics</p>
            </div>
            <MobileMenu />
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
                    ? 'bg-primary text-white'
                    : 'bg-background text-text-secondary hover:bg-background-lighter'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Users */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">Total Users</p>
                <p className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </Card>

          {/* Active Displays */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">Active Displays</p>
                <p className="text-3xl font-bold text-white">{stats?.activeDisplays || 0}</p>
              </div>
              <div className="text-4xl">🖥️</div>
            </div>
          </Card>

          {/* Total Playlists */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">Total Playlists</p>
                <p className="text-3xl font-bold text-white">{stats?.totalPlaylists || 0}</p>
              </div>
              <div className="text-4xl">📋</div>
            </div>
          </Card>

          {/* Total Watch Time */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">Total Watch Time</p>
                <p className="text-3xl font-bold text-white">
                  {formatDuration(stats?.totalWatchTime || 0)}
                </p>
              </div>
              <div className="text-4xl">⏱️</div>
            </div>
          </Card>
        </div>

        {/* Most Watched Channels */}
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4">🔥 Most Watched Channels</h2>
          {stats?.mostWatchedChannels?.length > 0 ? (
            <div className="space-y-3">
              {stats.mostWatchedChannels.slice(0, 10).map((channel, index) => (
                <div 
                  key={channel.channel_id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg hover:bg-background-lighter transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl font-bold text-primary">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-white">{channel.channel_name}</p>
                      <p className="text-sm text-text-secondary">
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
            <p className="text-text-secondary text-center py-8">No watch data available</p>
          )}
        </Card>

        {/* Recent Activity */}
        <Card>
          <h2 className="text-xl font-bold text-white mb-4">🕒 Recent Activity</h2>
          {stats?.recentActivity?.length > 0 ? (
            <div className="space-y-2">
              {stats.recentActivity.slice(0, 15).map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg text-sm"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium">{activity.user_email}</p>
                    <p className="text-text-secondary">
                      Watched <span className="text-primary">{activity.channel_name}</span>
                    </p>
                  </div>
                  <p className="text-text-muted text-xs">
                    {new Date(activity.watched_at).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-center py-8">No recent activity</p>
          )}
        </Card>
      </div>

      <Footer />
    </div>
  );
}

