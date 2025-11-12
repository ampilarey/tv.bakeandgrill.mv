import { useState, useEffect } from 'react';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import MobileMenu from '../../components/MobileMenu';
import Footer from '../../components/Footer';
import { lightTap, successFeedback, errorFeedback } from '../../utils/haptics';

export default function Settings() {
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
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      {/* Header */}
      <div className="bg-background-light border-b border-slate-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">⚙️ System Settings</h1>
            <p className="text-text-secondary text-sm mt-1">Configure platform preferences</p>
          </div>
          <MobileMenu />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Message Display */}
        {message.text && (
          <div className={`p-4 rounded-lg mb-4 ${
            message.type === 'success' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
              : 'bg-red-500/20 text-red-400 border border-red-500/50'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* General Settings */}
          <Card>
            <h2 className="text-xl font-bold text-white mb-4">General Settings</h2>
            <div className="space-y-4">
              <Input
                label="Application Name"
                value={settings.app_name}
                onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                helperText="Displayed in navigation and browser title"
              />

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Auto-play on Player Load
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.auto_play_enabled}
                    onChange={(e) => setSettings({ ...settings, auto_play_enabled: e.target.checked })}
                    className="w-5 h-5 rounded bg-background text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                  />
                  <span className="text-white text-sm">
                    Automatically play first channel when opening player
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Display Settings */}
          <Card>
            <h2 className="text-xl font-bold text-white mb-4">Display/Kiosk Settings</h2>
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
            <h2 className="text-xl font-bold text-white mb-4">Analytics & Privacy</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Enable Analytics Tracking
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.enable_analytics}
                    onChange={(e) => setSettings({ ...settings, enable_analytics: e.target.checked })}
                    className="w-5 h-5 rounded bg-background text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                  />
                  <span className="text-white text-sm">
                    Track watch history and generate usage analytics
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* System Info */}
          <Card>
            <h2 className="text-xl font-bold text-white mb-4">System Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Platform Version</span>
                <span className="text-white font-mono">1.0.5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Database</span>
                <span className="text-white">MySQL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Environment</span>
                <span className="text-white">Production</span>
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

