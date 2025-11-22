/**
 * Scene Management Page
 * Admin UI for managing display scenes
 * Phase 6: Scenes & Modes
 */
import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import Spinner from '../../components/common/Spinner';

function SceneManagement() {
  const [scenes, setScenes] = useState([]);
  const [displays, setDisplays] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingScene, setEditingScene] = useState(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    playlist_id: '',
    ticker_enabled: true,
    upsell_frequency: 5,
    audio_enabled: true,
    theme: 'default'
  });

  useEffect(() => {
    fetchScenes();
    fetchDisplays();
    fetchPlaylists();
  }, []);

  const fetchScenes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/scenes');
      if (response.data.success) {
        setScenes(response.data.scenes || []);
      }
    } catch (error) {
      showToast('Failed to fetch scenes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDisplays = async () => {
    try {
      const response = await api.get('/displays');
      if (response.data.success) {
        setDisplays(response.data.displays || []);
      }
    } catch (error) {
      console.error('Failed to fetch displays:', error);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const response = await api.get('/playlists');
      if (response.data.success) {
        setPlaylists(response.data.playlists || []);
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      showToast('Scene name is required', 'error');
      return;
    }

    try {
      if (editingScene) {
        await api.put(`/scenes/${editingScene.id}`, formData);
        showToast('Scene updated');
      } else {
        await api.post('/scenes', formData);
        showToast('Scene created');
      }

      setShowModal(false);
      setEditingScene(null);
      resetForm();
      fetchScenes();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to save scene', 'error');
    }
  };

  const handleEdit = (scene) => {
    setEditingScene(scene);
    setFormData({
      name: scene.name,
      description: scene.description || '',
      playlist_id: scene.playlist_id || '',
      ticker_enabled: scene.ticker_enabled !== false,
      upsell_frequency: scene.upsell_frequency || 5,
      audio_enabled: scene.audio_enabled !== false,
      theme: scene.theme || 'default'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this scene?')) return;

    try {
      await api.delete(`/scenes/${id}`);
      showToast('Scene deleted');
      fetchScenes();
    } catch (error) {
      showToast('Failed to delete scene', 'error');
    }
  };

  const handleActivate = async (sceneId, displayId) => {
    try {
      await api.post(`/displays/${displayId}/activate-scene/${sceneId}`);
      showToast('Scene activated on display');
    } catch (error) {
      showToast('Failed to activate scene', 'error');
    }
  };

  const handleSetMode = async (displayId, mode) => {
    try {
      await api.post(`/displays/${displayId}/set-mode`, { mode });
      showToast(`Mode set to ${mode}`);
    } catch (error) {
      showToast('Failed to set mode', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      playlist_id: '',
      ticker_enabled: true,
      upsell_frequency: 5,
      audio_enabled: true,
      theme: 'default'
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingScene(null);
    resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scene Management</h1>
          <p className="text-gray-600 mt-1">
            One-click display configurations (Busy Mode, Match Night, etc.)
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          + Create Scene
        </Button>
      </div>

      {/* Scenes List */}
      {scenes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No scenes yet</p>
          <Button onClick={() => setShowModal(true)} className="mt-4">
            Create First Scene
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenes.map(scene => (
            <div key={scene.id} className="bg-white rounded-lg shadow p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold mb-2">{scene.name}</h3>
                {scene.description && (
                  <p className="text-gray-600 text-sm">{scene.description}</p>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {scene.playlist_name && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Playlist:</span>
                    <span className="font-medium">{scene.playlist_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Ticker:</span>
                  <span className={scene.ticker_enabled ? 'text-green-600' : 'text-gray-400'}>
                    {scene.ticker_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Audio:</span>
                  <span className={scene.audio_enabled ? 'text-green-600' : 'text-gray-400'}>
                    {scene.audio_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEdit(scene)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(scene.id)}
                  >
                    Delete
                  </Button>
                </div>

                {/* Quick Activate on Display */}
                {displays.length > 0 && (
                  <div className="space-y-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleActivate(scene.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                    >
                      <option value="">Activate on display...</option>
                      {displays.map(display => (
                        <option key={display.id} value={display.id}>
                          {display.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Display Mode Controls */}
      {displays.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Display Modes</h2>
          <div className="space-y-3">
            {displays.map(display => (
              <div key={display.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{display.name}</p>
                  <p className="text-sm text-gray-500">{display.location}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetMode(display.id, 'normal')}
                  >
                    Normal
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetMode(display.id, 'kids')}
                  >
                    Kids Mode
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetMode(display.id, 'training')}
                  >
                    Training
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Scene Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingScene ? 'Edit Scene' : 'Create Scene'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Scene Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Busy Mode, Match Night"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows="3"
              placeholder="Describe this scene..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Playlist
            </label>
            <select
              value={formData.playlist_id}
              onChange={(e) => setFormData({ ...formData, playlist_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">No playlist (use display default)</option>
              {playlists.map(playlist => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ticker_enabled"
                checked={formData.ticker_enabled}
                onChange={(e) => setFormData({ ...formData, ticker_enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="ticker_enabled" className="text-sm font-medium text-gray-700">
                Enable Ticker
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="audio_enabled"
                checked={formData.audio_enabled}
                onChange={(e) => setFormData({ ...formData, audio_enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="audio_enabled" className="text-sm font-medium text-gray-700">
                Enable Audio
              </label>
            </div>
          </div>

          <Input
            label="Upsell Frequency"
            type="number"
            min="0"
            max="20"
            value={formData.upsell_frequency}
            onChange={(e) => setFormData({ ...formData, upsell_frequency: parseInt(e.target.value) || 5 })}
            helperText="Show upsell every N items (0 = disabled)"
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingScene ? 'Update Scene' : 'Create Scene'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default SceneManagement;

