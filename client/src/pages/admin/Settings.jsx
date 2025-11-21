import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import MobileMenu from '../../components/MobileMenu';
import Footer from '../../components/Footer';
import { lightTap, successFeedback, errorFeedback } from '../../utils/haptics';

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [settings, setSettings] = useState({
    app_name: 'Bake & Grill TV',
    default_playlist_id: '',
    auto_play_enabled: true,
    heartbeat_interval: 30,
    max_concurrent_streams: 5,
    enable_analytics: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    lightTap();

    try {
      await api.put('/settings', settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      successFeedback();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to save settings' 
      });
      errorFeedback();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-tv-bg md:pb-6 overflow-y-auto">
      {/* Header */}
      <div className="bg-tv-accent border-b border-tv-borderSubtle p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden md:inline">Admin Home</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">⚙️ System Settings</h1>
              <p className="text-white/90 text-sm mt-1">Configure platform preferences</p>
            </div>
          </div>
          <MobileMenu />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-32 md:pb-4">
        {/* Message Display */}
        {message.text && (
          <div className={`p-4 rounded-lg mb-4 ${
            message.type === 'success' 
              ? 'bg-tv-accent/20 text-tv-accent border-2 border-tv-accent/50' 
              : 'bg-tv-error/20 text-tv-error border-2 border-tv-error/50'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* General Settings */}
          <Card>
            <h2 className="text-xl font-bold text-tv-text mb-4">General Settings</h2>
            <div className="space-y-4">
              <Input
                label="Application Name"
                value={settings.app_name}
                onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                helperText="Displayed in navigation and browser title"
              />

              <div>
                <label className="block text-sm font-medium text-tv-textSecondary mb-2">
                  Auto-play on Player Load
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.auto_play_enabled}
                    onChange={(e) => setSettings({ ...settings, auto_play_enabled: e.target.checked })}
                    className="w-5 h-5 rounded bg-background text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                  />
                  <span className="text-tv-text text-sm">
                    Automatically play first channel when opening player
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Display Settings */}
          <Card>
            <h2 className="text-xl font-bold text-tv-text mb-4">Display/Kiosk Settings</h2>
            <div className="space-y-4">
              <Input
                label="Heartbeat Interval (seconds)"
                type="number"
                min="10"
                max="300"
                value={settings.heartbeat_interval}
                onChange={(e) => setSettings({ ...settings, heartbeat_interval: parseInt(e.target.value) })}
                helperText="How often displays send status updates"
              />

              <Input
                label="Max Concurrent Streams"
                type="number"
                min="1"
                max="50"
                value={settings.max_concurrent_streams}
                onChange={(e) => setSettings({ ...settings, max_concurrent_streams: parseInt(e.target.value) })}
                helperText="Maximum number of simultaneous video streams"
              />
            </div>
          </Card>

          {/* Analytics Settings */}
          <Card>
            <h2 className="text-xl font-bold text-tv-text mb-4">Analytics & Privacy</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-tv-textSecondary mb-2">
                  Enable Analytics Tracking
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.enable_analytics}
                    onChange={(e) => setSettings({ ...settings, enable_analytics: e.target.checked })}
                    className="w-5 h-5 rounded bg-background text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                  />
                  <span className="text-tv-text text-sm">
                    Track watch history and generate usage analytics
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* System Info */}
          <Card>
            <h2 className="text-xl font-bold text-tv-text mb-4">System Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-tv-textSecondary">Platform Version</span>
                <span className="text-tv-text font-mono">1.0.5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tv-textSecondary">Database</span>
                <span className="text-tv-text">MySQL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tv-textSecondary">Environment</span>
                <span className="text-tv-text">Production</span>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button 
              type="button" 
              variant="ghost"
              onClick={fetchSettings}
            >
              Reset
            </Button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}

