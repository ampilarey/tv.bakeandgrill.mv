import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import AdminTopBar from '../../components/AdminTopBar';
import Footer from '../../components/Footer';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';
import ConfirmModal from '../../components/common/ConfirmModal';

const TABS = [
  { id: 'add', label: 'Add Stream' },
  { id: 'manage', label: 'Manage' },
  { id: 'bulk', label: 'Bulk Add' },
];

const EMPTY_FORM = {
  name: '',
  stream_url: '',
  group_name: '',
  logo_url: '',
  playback_mode: 'auto',
  http_user_agent: '',
  http_referer: '',
  is_active: true,
  playlist_id: '',
};

function ProbeSummary({ probe }) {
  if (!probe) return null;
  const ok = probe.manifest_valid;
  return (
    <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${ok ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
      <p className="font-medium">{ok ? 'Stream looks playable' : 'Probe warnings'}</p>
      <p className="text-xs mt-1 opacity-90">
        Type: {probe.detected_type || probe.master_or_media || 'unknown'}
        {probe.variant_count != null ? ` · variants: ${probe.variant_count}` : ''}
        {probe.response_time_ms != null ? ` · ${probe.response_time_ms}ms` : ''}
      </p>
      {probe.safe_message && <p className="text-xs mt-1">{probe.safe_message}</p>}
      {probe.proxy_recommended && <p className="text-xs mt-1">Proxy may be required for browser playback.</p>}
    </div>
  );
}

export default function DirectChannelManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') || 'add';
  const prefilledUrl = searchParams.get('url') || '';

  const [tab, setTab] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : 'add');
  const [playlists, setPlaylists] = useState([]);
  const [defaultPlaylist, setDefaultPlaylist] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, stream_url: prefilledUrl });
  const [probe, setProbe] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [channels, setChannels] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [filterPlaylist, setFilterPlaylist] = useState('');
  const [editRow, setEditRow] = useState(null);
  const [rowBusy, setRowBusy] = useState(null);

  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkPlaylistId, setBulkPlaylistId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  const loadMeta = useCallback(async () => {
    try {
      const [plRes, defRes] = await Promise.all([
        api.get('/playlists'),
        api.get('/channels/direct/default-playlist'),
      ]);
      const pls = plRes.data.playlists || [];
      setPlaylists(pls);
      const def = defRes.data.playlist;
      setDefaultPlaylist(def);
      setForm((f) => ({
        ...f,
        playlist_id: f.playlist_id || String(def?.id || ''),
        stream_url: f.stream_url || prefilledUrl,
      }));
      setBulkPlaylistId(String(def?.id || ''));
      setFilterPlaylist(String(def?.id || ''));
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load playlists');
    }
  }, [prefilledUrl]);

  const loadChannels = useCallback(async (playlistId) => {
    setListLoading(true);
    setErr('');
    try {
      const params = playlistId ? `?playlistId=${playlistId}&includeInactive=1` : '?includeInactive=1';
      const res = await api.get(`/channels/direct${params}`);
      setChannels(res.data.channels || []);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load direct channels');
    }
    setListLoading(false);
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (tab === 'manage') loadChannels(filterPlaylist || null);
  }, [tab, filterPlaylist, loadChannels]);

  const switchTab = (id) => {
    setTab(id);
    setErr('');
    setMsg('');
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next, { replace: true });
  };

  const handleTest = async () => {
    if (!form.stream_url) {
      setErr('Stream URL is required to test');
      return;
    }
    setTesting(true);
    setErr('');
    setProbe(null);
    try {
      const res = await api.post('/channels/direct/test', {
        stream_url: form.stream_url,
        http_user_agent: form.http_user_agent || undefined,
        http_referer: form.http_referer || undefined,
      });
      setProbe(res.data.probe);
    } catch (e) {
      setErr(e.response?.data?.error || 'Probe failed');
    }
    setTesting(false);
  };

  const handleQuickAdd = async () => {
    if (!form.stream_url) {
      setErr('Paste a stream URL first');
      return;
    }
    setTesting(true);
    setErr('');
    try {
      const testRes = await api.post('/channels/direct/test', { stream_url: form.stream_url });
      setProbe(testRes.data.probe);
      setForm((f) => ({
        ...f,
        name: f.name || 'New HLS Channel',
      }));
      setMsg('URL tested — edit the name and save when ready.');
    } catch (e) {
      setErr(e.response?.data?.error || 'Quick test failed');
    }
    setTesting(false);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!form.name || !form.stream_url) {
      setErr('Name and stream URL are required');
      return;
    }
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      const body = {
        name: form.name,
        stream_url: form.stream_url,
        group_name: form.group_name || undefined,
        logo_url: form.logo_url || undefined,
        playback_mode: form.playback_mode,
        http_user_agent: form.http_user_agent || undefined,
        http_referer: form.http_referer || undefined,
        is_active: form.is_active,
        playlist_id: parseInt(form.playlist_id, 10) || undefined,
        use_default_playlist: !form.playlist_id,
      };
      await api.post('/channels/direct', body);
      setMsg('Direct stream saved.');
      setForm({ ...EMPTY_FORM, playlist_id: String(defaultPlaylist?.id || '') });
      setProbe(null);
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === 'DUPLICATE_URL') {
        setErr('This URL already exists in the target playlist.');
      } else {
        setErr(e.response?.data?.error || 'Save failed');
      }
    }
    setSaving(false);
  };

  const handleBulkPreview = async () => {
    setBulkLoading(true);
    setErr('');
    setBulkResult(null);
    try {
      const res = await api.post('/channels/direct/bulk/preview', {
        text: bulkText,
        playlist_id: parseInt(bulkPlaylistId, 10) || undefined,
      });
      setBulkPreview(res.data.preview || []);
    } catch (e) {
      setErr(e.response?.data?.error || 'Preview failed');
    }
    setBulkLoading(false);
  };

  const handleBulkImport = async () => {
    const rows = bulkPreview.filter((r) => r.status === 'ok' || r.status === 'duplicate');
    if (!rows.length) {
      setErr('No valid rows to import');
      return;
    }
    setBulkLoading(true);
    setErr('');
    try {
      const res = await api.post('/channels/direct/bulk', {
        rows: rows.map((r) => ({
          name: r.name,
          stream_url: r.stream_url,
          group_name: r.group_name,
          logo_url: r.logo_url,
          playback_mode: r.playback_mode || 'auto',
        })),
        playlist_id: parseInt(bulkPlaylistId, 10) || undefined,
        use_default_playlist: !bulkPlaylistId,
        skip_unreachable: true,
      });
      setBulkResult(res.data.results);
      setMsg(`Bulk import complete: ${res.data.results.added?.length || 0} added.`);
      loadChannels(bulkPlaylistId || null);
    } catch (e) {
      setErr(e.response?.data?.error || 'Bulk import failed');
    }
    setBulkLoading(false);
  };

  const handleRetest = async (ch) => {
    setRowBusy(ch.id);
    try {
      const res = await api.post(`/channels/direct/${ch.id}/retest`);
      setMsg(`Retest: ${res.data.probe?.safe_message || 'done'}`);
      loadChannels(filterPlaylist || null);
    } catch (e) {
      setErr(e.response?.data?.error || 'Retest failed');
    }
    setRowBusy(null);
  };

  const handleDelete = (ch) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete direct stream',
      message: `Delete "${ch.name}"? This cannot be undone if the channel is referenced.`,
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, isOpen: false }));
        setRowBusy(ch.id);
        try {
          await api.delete(`/channels/direct/${ch.id}`);
          loadChannels(filterPlaylist || null);
          setMsg('Channel deleted.');
        } catch (e) {
          setErr(e.response?.data?.error || 'Delete failed');
        }
        setRowBusy(null);
      },
    });
  };

  const handleEditSave = async () => {
    if (!editRow) return;
    setSaving(true);
    try {
      await api.put(`/channels/direct/${editRow.id}`, {
        name: editRow.name,
        stream_url: editRow.url || editRow.stream_url,
        group_name: editRow.group,
        logo_url: editRow.logo,
        playback_mode: editRow.playback_mode,
        is_active: editRow.is_active !== false,
      });
      setEditRow(null);
      loadChannels(filterPlaylist || null);
      setMsg('Channel updated.');
    } catch (e) {
      setErr(e.response?.data?.error || 'Update failed');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-tv-bg flex flex-col">
      <AdminTopBar title="Direct Streams" subtitle="Add single HLS/video URLs as channels" />

      <div className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full pb-24">
        {err && (
          <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">{err}</div>
        )}
        {msg && (
          <div className="mb-4 bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-2 rounded-lg text-sm">{msg}</div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-tv-accent text-white' : 'bg-tv-bgSoft text-tv-textMuted hover:text-tv-text border border-tv-borderSubtle'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'add' && (
          <Card className="p-5">
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-tv-textMuted mb-1">Target playlist</label>
                <select
                  className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm"
                  value={form.playlist_id}
                  onChange={(e) => setForm({ ...form, playlist_id: e.target.value })}
                >
                  {defaultPlaylist && (
                    <option value={String(defaultPlaylist.id)}>{defaultPlaylist.name} (default)</option>
                  )}
                  {playlists
                    .filter((p) => !defaultPlaylist || p.id !== defaultPlaylist.id)
                    .map((p) => (
                      <option key={p.id} value={String(p.id)}>{p.name}</option>
                    ))}
                </select>
              </div>

              <Input
                label="Stream URL"
                value={form.stream_url}
                onChange={(e) => setForm({ ...form, stream_url: e.target.value })}
                placeholder="https://example.com/live/stream.m3u8"
                required
              />

              <div className="flex gap-2 flex-wrap">
                <Button type="button" variant="secondary" onClick={handleTest} disabled={testing || saving}>
                  {testing ? 'Testing…' : 'Test URL'}
                </Button>
                <Button type="button" variant="secondary" onClick={handleQuickAdd} disabled={testing || saving}>
                  Quick add (test + name)
                </Button>
              </div>
              <ProbeSummary probe={probe} />

              <Input
                label="Channel name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Live Stream"
                required
              />

              <Input
                label="Category / group"
                value={form.group_name}
                onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                placeholder="News"
              />

              <Input
                label="Logo URL (optional)"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />

              <div>
                <label className="block text-xs font-medium text-tv-textMuted mb-1">Playback mode</label>
                <select
                  className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm"
                  value={form.playback_mode}
                  onChange={(e) => setForm({ ...form, playback_mode: e.target.value })}
                >
                  <option value="auto">Auto (direct, fallback to proxy)</option>
                  <option value="direct">Direct only</option>
                  <option value="proxy">Proxy only</option>
                </select>
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer text-tv-textMuted hover:text-tv-text">Advanced HTTP headers</summary>
                <div className="mt-3 space-y-3">
                  <Input
                    label="User-Agent"
                    value={form.http_user_agent}
                    onChange={(e) => setForm({ ...form, http_user_agent: e.target.value })}
                    placeholder="Optional custom User-Agent"
                  />
                  <Input
                    label="Referer"
                    value={form.http_referer}
                    onChange={(e) => setForm({ ...form, http_referer: e.target.value })}
                    placeholder="Optional Referer header"
                  />
                </div>
              </details>

              <label className="flex items-center gap-2 text-sm text-tv-text">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Active
              </label>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => navigate('/admin/dashboard')}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving || testing}>
                  {saving ? 'Saving…' : 'Save channel'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {tab === 'manage' && (
          <Card className="p-5">
            <div className="mb-4">
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Filter by playlist</label>
              <select
                className="w-full max-w-xs rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm"
                value={filterPlaylist}
                onChange={(e) => setFilterPlaylist(e.target.value)}
              >
                <option value="">All playlists</option>
                {playlists.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </div>

            {listLoading ? (
              <div className="flex justify-center py-8"><Spinner size="lg" /></div>
            ) : channels.length === 0 ? (
              <p className="text-tv-textMuted text-sm">No direct streams yet.</p>
            ) : (
              <div className="space-y-2">
                {channels.map((ch) => (
                  <div key={ch.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-tv-bgSoft border border-tv-borderSubtle">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-tv-text truncate">{ch.name}</p>
                      <p className="text-xs text-tv-textMuted truncate">{ch.url}</p>
                      <p className="text-xs text-tv-textMuted mt-0.5">
                        {ch.id} · {ch.play_status || 'unknown'} · {ch.playback_mode}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditRow({ ...ch })} disabled={rowBusy === ch.id}>Edit</Button>
                      <Button size="sm" variant="secondary" onClick={() => handleRetest(ch)} disabled={rowBusy === ch.id}>
                        {rowBusy === ch.id ? '…' : 'Retest'}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(ch)} disabled={rowBusy === ch.id}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {tab === 'bulk' && (
          <Card className="p-5 space-y-4">
            <p className="text-sm text-tv-textMuted">
              One URL per line, or <code className="text-tv-text">name|url|group</code>, or CSV <code className="text-tv-text">name,url,group</code>.
            </p>
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Target playlist</label>
              <select
                className="w-full max-w-xs rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm"
                value={bulkPlaylistId}
                onChange={(e) => setBulkPlaylistId(e.target.value)}
              >
                {defaultPlaylist && <option value={String(defaultPlaylist.id)}>{defaultPlaylist.name}</option>}
                {playlists.filter((p) => !defaultPlaylist || p.id !== defaultPlaylist.id).map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </div>
            <textarea
              className="w-full min-h-[160px] rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm font-mono"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'https://cdn.example.com/live.m3u8\nNews Stream|https://cdn.example.com/news.m3u8|News'}
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleBulkPreview} disabled={bulkLoading}>Preview</Button>
              <Button variant="primary" onClick={handleBulkImport} disabled={bulkLoading || !bulkPreview.length}>
                {bulkLoading ? 'Importing…' : 'Import valid rows'}
              </Button>
            </div>

            {bulkPreview.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-tv-textMuted border-b border-tv-borderSubtle">
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">URL</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPreview.map((row, i) => (
                      <tr key={i} className="border-b border-tv-borderSubtle/50">
                        <td className="py-2 pr-2">
                          <input
                            className="w-full bg-transparent border-b border-tv-borderSubtle text-tv-text text-xs"
                            value={row.name}
                            onChange={(e) => {
                              const next = [...bulkPreview];
                              next[i] = { ...row, name: e.target.value };
                              setBulkPreview(next);
                            }}
                          />
                        </td>
                        <td className="py-2 pr-2 text-xs truncate max-w-[200px]">{row.stream_url}</td>
                        <td className="py-2 text-xs">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {bulkResult && (
              <div className="text-sm text-tv-textMuted">
                Added: {bulkResult.added?.length || 0}, duplicates skipped: {bulkResult.skipped_duplicate?.length || 0},
                invalid: {bulkResult.invalid?.length || 0}, failed: {bulkResult.failed?.length || 0}
              </div>
            )}
          </Card>
        )}
      </div>

      <Footer />

      <Modal isOpen={!!editRow} onClose={() => setEditRow(null)} title="Edit direct stream">
        {editRow && (
          <div className="space-y-4">
            <Input label="Name" value={editRow.name} onChange={(e) => setEditRow({ ...editRow, name: e.target.value })} />
            <Input label="URL" value={editRow.url} onChange={(e) => setEditRow({ ...editRow, url: e.target.value })} />
            <Input label="Group" value={editRow.group || ''} onChange={(e) => setEditRow({ ...editRow, group: e.target.value })} />
            <select
              className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm"
              value={editRow.playback_mode || 'auto'}
              onChange={(e) => setEditRow({ ...editRow, playback_mode: e.target.value })}
            >
              <option value="auto">Auto</option>
              <option value="direct">Direct</option>
              <option value="proxy">Proxy</option>
            </select>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditRow(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleEditSave} disabled={saving}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
      />
    </div>
  );
}
