import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import Footer from '../components/Footer';
import ConfirmModal from '../components/common/ConfirmModal';
import { lightTap } from '../utils/haptics';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, week, month
  const [groupBy, setGroupBy] = useState('date'); // date, playlist, channel
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [history, filter, searchQuery]);

  const fetchHistory = async () => {
    try {
      const response = await api.get('/history?limit=200');
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...history];

    // Time filter
    if (filter !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered = filtered.filter(item => {
        const itemDate = new Date(item.watched_at);
        
        if (filter === 'today') return itemDate >= startOfDay;
        if (filter === 'week') return itemDate >= startOfWeek;
        if (filter === 'month') return itemDate >= startOfMonth;
        
        return true;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.channel_name?.toLowerCase().includes(query) ||
        item.playlist_name?.toLowerCase().includes(query)
      );
    }

    setFilteredHistory(filtered);
  };

  const handleClearHistory = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear All History',
      message: 'Are you sure you want to clear all watch history? This action cannot be undone.',
      onConfirm: confirmClearHistory
    });
  };

  const confirmClearHistory = async () => {
    lightTap();
    setLoading(true);

    try {
      await api.delete('/history');
      setHistory([]);
      setFilteredHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayChannel = (item) => {
    lightTap();
    // Pass both playlistId and channelId so player auto-plays the correct channel
    navigate(`/player?playlistId=${item.playlist_id}&channelId=${item.channel_id}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds < 60) return 'Less than a minute';
    
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const groupHistoryByDate = () => {
    const grouped = {};
    
    filteredHistory.forEach(item => {
      const dateKey = formatDate(item.watched_at);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });

    return Object.entries(grouped);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-tv-bg">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tv-bg md:pb-6">
      {/* Header */}
      <div className="bg-tv-bgElevated border-b border-tv-borderSubtle p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-tv-textSecondary hover:text-tv-accent transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden md:inline">Back</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-tv-text">Watch History</h1>
                <p className="text-tv-textSecondary text-sm mt-1">
                  {filteredHistory.length} {filteredHistory.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
            </div>
            {history.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleClearHistory}
                className="text-tv-error hover:text-tv-error/80"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="space-y-3">
            {/* Search */}
            <input
              type="text"
              placeholder="Search channels or playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-tv-bgSoft border-2 border-tv-borderSubtle text-tv-text placeholder-tv-textMuted focus:outline-none focus:ring-2 focus:ring-tv-accent focus:border-tv-accent"
            />

            {/* Time Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  size="sm"
                  variant={filter === value ? 'primary' : 'ghost'}
                  onClick={() => {
                    setFilter(value);
                    lightTap();
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="max-w-6xl mx-auto p-4">
        {filteredHistory.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📺</div>
              <h3 className="text-xl font-bold text-tv-text mb-2">No Watch History</h3>
              <p className="text-tv-textSecondary mb-4">
                {searchQuery ? 'No results found for your search.' : 'Start watching channels to see your history here.'}
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Browse Playlists
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupHistoryByDate().map(([date, items]) => (
              <div key={date}>
                <h2 className="text-lg font-bold text-tv-text mb-3 px-2">{date}</h2>
                <div className="space-y-2">
                  {items.map((item) => (
                    <Card 
                      key={item.id}
                      className="hover:border-primary transition-colors cursor-pointer"
                      onClick={() => handlePlayChannel(item)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-tv-text truncate">
                              {item.channel_name}
                            </h3>
                            <Badge color="primary" size="sm">
                              {formatTime(item.watched_at)}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-sm text-tv-textSecondary">
                            <span>📋 {item.playlist_name || 'Unknown Playlist'}</span>
                            {item.duration_seconds > 0 && (
                              <span>⏱️ {formatDuration(item.duration_seconds)}</span>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayChannel(item);
                          }}
                        >
                          ▶️ Watch
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      <Footer />
    </div>
  );
}

