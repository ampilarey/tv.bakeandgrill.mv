/**
 * Scene Management
 * Save and restore named full-display-configuration snapshots.
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';
import { useToast } from '../../hooks/useToast';

export default function SceneManagement() {
  const [scenes, setScenes]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState('');
  const [newDesc, setNewDesc]       = useState('');
  const [saving, setSaving]         = useState(false);
  const [applying, setApplying]     = useState(null); // scene id being applied
  const [updating, setUpdating]     = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [confirmApply, setConfirmApply] = useState(null); // scene to confirm
  const { showToast } = useToast();

  const fetchScenes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/display-scenes');
      if (data.success) setScenes(data.scenes || []);
    } catch { showToast('Failed to load scenes', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetchScenes(); }, [fetchScenes]);

  async function createScene() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post('/display-scenes', { name: newName.trim(), description: newDesc.trim() || undefined });
      if (data.success) {
        showToast(`Scene "${newName}" saved with ${data.display_count} display(s)`, 'success');
        setShowCreate(false);
        setNewName(''); setNewDesc('');
        fetchScenes();
      }
    } catch { showToast('Failed to create scene', 'error'); }
    finally { setSaving(false); }
  }

  async function applyScene(scene) {
    setApplying(scene.id);
    try {
      const { data } = await api.post(`/display-scenes/${scene.id}/apply`);
      if (data.success) showToast(data.message || 'Scene applied', 'success');
    } catch { showToast('Failed to apply scene', 'error'); }
    finally { setApplying(null); setConfirmApply(null); }
  }

  async function updateScene(scene) {
    setUpdating(scene.id);
    try {
      const { data } = await api.post(`/display-scenes/${scene.id}/update`);
      if (data.success) { showToast(`"${scene.name}" updated with ${data.display_count} display(s)`, 'success'); fetchScenes(); }
    } catch { showToast('Failed to update scene', 'error'); }
    finally { setUpdating(null); }
  }

  async function deleteScene(id) {
    setDeleting(id);
    try {
      await api.delete(`/display-scenes/${id}`);
      showToast('Scene deleted', 'success');
      fetchScenes();
    } catch { showToast('Failed to delete', 'error'); }
    finally { setDeleting(null); }
  }

  function fmtDate(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString();
  }

  const snapshotCount = (scene) => {
    try {
      const arr = JSON.parse(scene.snapshot_json || '[]');
      return Array.isArray(arr) ? arr.length : (scene.display_count || '?');
    } catch { return scene.display_count || '?'; }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tv-text">Scene Presets</h1>
          <p className="text-sm text-tv-textMuted mt-1">
            Save and restore complete display configurations with one click.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Save Current State</Button>
      </div>

      {/* Info card */}
      <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-300">
        <strong className="text-blue-200">How scenes work:</strong> A scene is a snapshot of every active display's current settings
        (playlist, overlay mode, WiFi QR, etc.). Applying a scene instantly restores those settings across all TVs.
        Use &quot;Update&quot; to refresh the snapshot with the current state.
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
      ) : scenes.length === 0 ? (
        <div className="text-center py-20 text-tv-textMuted">
          <div className="text-5xl mb-4">🎬</div>
          <p className="text-lg font-medium text-tv-text">No scenes yet</p>
          <p className="text-sm mt-1">Click &quot;Save Current State&quot; to capture all display settings as a named preset.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenes.map(scene => (
            <div key={scene.id} className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-tv-text truncate">{scene.name}</h3>
                  {scene.description && <p className="text-xs text-tv-textMuted mt-0.5 line-clamp-2">{scene.description}</p>}
                </div>
                <span className="ml-2 shrink-0 text-xs bg-tv-accent/20 text-tv-accent px-2 py-0.5 rounded-full font-medium">
                  {snapshotCount(scene)} TVs
                </span>
              </div>

              <div className="text-xs text-tv-textMuted space-y-0.5">
                <div>Saved: {fmtDate(scene.created_at)}</div>
                {scene.updated_at !== scene.created_at && <div>Updated: {fmtDate(scene.updated_at)}</div>}
                {scene.created_by_email && <div>By: {scene.created_by_email}</div>}
              </div>

              <div className="flex gap-2 mt-auto">
                <Button
                  size="sm"
                  className="flex-1 bg-green-700 hover:bg-green-600 text-white"
                  onClick={() => setConfirmApply(scene)}
                  disabled={!!applying}
                >
                  {applying === scene.id ? <Spinner size="sm" /> : '▶ Apply'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Re-snapshot current state into this scene"
                  onClick={() => updateScene(scene)}
                  disabled={!!updating}
                >
                  {updating === scene.id ? <Spinner size="sm" /> : '↻'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => deleteScene(scene.id)}
                  disabled={!!deleting}
                >
                  {deleting === scene.id ? <Spinner size="sm" /> : '×'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create scene modal */}
      {showCreate && (
        <Modal title="Save Scene Preset" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <p className="text-sm text-tv-textMuted">
              This will snapshot all active displays' current settings into a named preset.
            </p>
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Scene Name *</label>
              <input
                type="text"
                className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent"
                placeholder="e.g. Lunch Mode, Sports Night, Weekend"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Description (optional)</label>
              <textarea
                className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent resize-none"
                rows={2}
                placeholder="When to use this scene..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createScene} disabled={saving || !newName.trim()}>
                {saving ? <Spinner size="sm" /> : 'Save Scene'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm apply modal */}
      {confirmApply && (
        <Modal title="Apply Scene Preset" onClose={() => setConfirmApply(null)}>
          <div className="space-y-4">
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-300">
              ⚠ This will overwrite settings on <strong>{snapshotCount(confirmApply)} display(s)</strong>.
              Their current settings will be replaced with the saved snapshot.
            </div>
            <p className="text-sm text-tv-text">
              Apply scene <strong className="text-tv-accent">{confirmApply.name}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setConfirmApply(null)}>Cancel</Button>
              <Button
                className="bg-green-700 hover:bg-green-600 text-white"
                onClick={() => applyScene(confirmApply)}
                disabled={!!applying}
              >
                {applying === confirmApply.id ? <Spinner size="sm" /> : 'Yes, Apply Now'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
