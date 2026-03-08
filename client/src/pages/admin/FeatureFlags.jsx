/**
 * Feature Flags Management Page
 * Admin UI for toggling feature flags
 */
import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { useToast } from '../../hooks/useToast';
import Spinner from '../../components/common/Spinner';

const FLAG_DESCRIPTIONS = {
  image_slides:        'Allow image slides in media playlists',
  qr_codes:            'Allow QR code slides in media playlists',
  youtube_embed:       'Allow YouTube video slides in media playlists',
  announcements:       'Full-screen announcement overlays on displays',
  info_ticker:         'Scrolling ticker bar at the bottom of displays',
  multi_type_player:   'Multi-type media player (images, QR, video)',
  scenes:              'Display scene snapshots and restore',
  slide_templates:     'Reusable slide design templates',
  multilang:           'Multi-language support (Dhivehi)',
  offline_cache:       'Offline PWA caching for displays',
  kids_mode:           'Kids / family-friendly display mode',
  upsell_logic:        'Smart upsell & promotion logic',
  staff_training_mode: 'Staff training display mode',
  advanced_scheduling: 'Date-based advanced scheduling',
};

const CATEGORY = {
  'Core Display':   ['image_slides', 'qr_codes', 'youtube_embed', 'multi_type_player'],
  'Messaging':      ['info_ticker', 'announcements'],
  'Content Tools':  ['slide_templates', 'scenes', 'advanced_scheduling'],
  'Other':          ['multilang', 'offline_cache', 'kids_mode', 'upsell_logic', 'staff_training_mode'],
};

function Toggle({ enabled, onChange, loading }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-tv-gold focus:ring-offset-2 ${
        enabled ? 'bg-green-500' : 'bg-gray-300'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function FeatureFlags() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFlag, setNewFlag] = useState({ flagName: '', description: '', enabled: false });
  const { showToast } = useToast();

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const res = await api.get('/features');
      if (res.data.success) setFlags(res.data.details);
    } catch {
      showToast('Failed to load feature flags', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (flagName, currentValue) => {
    setToggling(t => ({ ...t, [flagName]: true }));
    try {
      await api.put(`/features/${flagName}`, { enabled: !currentValue });
      setFlags(prev => prev.map(f =>
        f.flag_name === flagName ? { ...f, is_enabled: !currentValue } : f
      ));
      showToast(`${flagName} ${!currentValue ? 'enabled' : 'disabled'}`);
    } catch {
      showToast(`Failed to toggle ${flagName}`, 'error');
    } finally {
      setToggling(t => ({ ...t, [flagName]: false }));
    }
  };

  const handleAddFlag = async (e) => {
    e.preventDefault();
    if (!newFlag.flagName.trim()) return showToast('Flag name is required', 'error');
    try {
      await api.post('/features', newFlag);
      showToast('Feature flag created');
      setShowAddModal(false);
      setNewFlag({ flagName: '', description: '', enabled: false });
      fetchFlags();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create flag', 'error');
    }
  };

  const handleDelete = async (flagName) => {
    if (!confirm(`Delete flag "${flagName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/features/${flagName}`);
      showToast('Flag deleted');
      fetchFlags();
    } catch {
      showToast('Failed to delete flag', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const flagsByName = Object.fromEntries(flags.map(f => [f.flag_name, f]));
  const knownFlagNames = new Set(Object.values(CATEGORY).flat());
  const unknownFlags = flags.filter(f => !knownFlagNames.has(f.flag_name));

  const enabledCount = flags.filter(f => f.is_enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feature Flags</h1>
          <p className="text-gray-600 mt-1">
            {enabledCount} of {flags.length} features enabled
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>+ Add Flag</Button>
      </div>

      {/* Categories */}
      {Object.entries(CATEGORY).map(([category, flagNames]) => {
        const categoryFlags = flagNames.map(n => flagsByName[n]).filter(Boolean);
        if (categoryFlags.length === 0) return null;
        return (
          <div key={category}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {category}
            </h2>
            <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
              {categoryFlags.map(flag => (
                <div key={flag.flag_name} className="flex items-center justify-between px-5 py-4">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 font-mono text-sm">
                        {flag.flag_name}
                      </span>
                      {flag.is_enabled && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">
                          ON
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {flag.description || FLAG_DESCRIPTIONS[flag.flag_name] || ''}
                    </p>
                  </div>
                  <Toggle
                    enabled={Boolean(flag.is_enabled)}
                    onChange={() => handleToggle(flag.flag_name, flag.is_enabled)}
                    loading={toggling[flag.flag_name]}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Unknown / custom flags */}
      {unknownFlags.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Custom
          </h2>
          <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
            {unknownFlags.map(flag => (
              <div key={flag.flag_name} className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 font-mono text-sm">
                      {flag.flag_name}
                    </span>
                    {flag.is_enabled && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">
                        ON
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {flag.description || 'No description'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Toggle
                    enabled={Boolean(flag.is_enabled)}
                    onChange={() => handleToggle(flag.flag_name, flag.is_enabled)}
                    loading={toggling[flag.flag_name]}
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(flag.flag_name)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Flag Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Feature Flag">
        <form onSubmit={handleAddFlag} className="space-y-4">
          <Input
            label="Flag Name"
            value={newFlag.flagName}
            onChange={e => setNewFlag({ ...newFlag, flagName: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
            placeholder="my_new_feature"
            helperText="lowercase, underscores only"
            required
          />
          <Input
            label="Description"
            value={newFlag.description}
            onChange={e => setNewFlag({ ...newFlag, description: e.target.value })}
            placeholder="What does this feature do?"
          />
          <label className="flex items-center gap-3 cursor-pointer">
            <Toggle
              enabled={newFlag.enabled}
              onChange={() => setNewFlag(f => ({ ...f, enabled: !f.enabled }))}
            />
            <span className="text-sm text-gray-700">Enable immediately</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Create Flag</Button>
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
