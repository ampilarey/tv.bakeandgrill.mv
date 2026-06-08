/**
 * Channel Health — admin diagnosis dashboard
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import MobileMenu from '../../components/MobileMenu';
import Footer from '../../components/Footer';
import Spinner from '../../components/common/Spinner';

function timeAgo(iso) {
  if (!iso) return 'never';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

const STATUS = {
  1: { label: 'Playable', cls: 'bg-green-500/20 text-green-400 border-green-500/30', dot: 'bg-green-400' },
  0: { label: 'Offline', cls: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-500' },
  null: { label: 'Unknown', cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30', dot: 'bg-gray-500' },
};

function DeviceIcons({ row }) {
  const devices = [
    { key: 'playable_ios', icon: '📱', title: 'iPhone/Safari' },
    { key: 'playable_android_chrome', icon: '🤖', title: 'Android/Chrome' },
    { key: 'playable_desktop_chrome', icon: '💻', title: 'Desktop/Chrome' },
    { key: 'playable_tv_browser', icon: '📺', title: 'TV browser' },
  ];
  return (
    <div className="flex gap-1 mt-1">
      {devices.map((d) => {
        const ok = row[d.key] === 1;
        const bad = row[d.key] === 0;
        return (
          <span
            key={d.key}
            title={`${d.title}: ${ok ? 'OK' : bad ? 'No' : '?'}`}
            className={`text-xs ${ok ? 'opacity-100' : bad ? 'opacity-30' : 'opacity-50'}`}
          >
            {d.icon}
          </span>
        );
      })}
    </div>
  );
}

export default function ChannelHealth() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState([]);
  const [selectedPl, setSelectedPl] = useState('');
  const [rows, setRows] = useState([]);
  const [channelMap, setChannelMap] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [rowBusy, setRowBusy] = useState(null);
  const [filter, setFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('');
  const [search, setSearch] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/admin/dashboard'); return; }
    api.get('/playlists').then((r) => setPlaylists(r.data.playlists || [])).catch(() => {});
  }, [user, navigate]);

  const loadHealth = useCallback(async (plId) => {
    if (!plId) return;
    setLoading(true);
    setErr('');
    try {
      const [healthRes, channelsRes] = await Promise.all([
        api.get(`/channels/health-report?playlistId=${plId}`),
        api.get(`/channels?playlistId=${plId}&playableOnly=0`),
      ]);
      setRows(healthRes.data.rows || []);
      setSummary(healthRes.data.summary || null);
      const map = {};
      (channelsRes.data.channels || []).forEach((c) => {
        if (c.url) map[c.url] = c;
      });
      setChannelMap(map);
    } catch (e) {
      setErr(e.response?.data?.error || 'Load failed');
    }
    setLoading(false);
  }, []);

  const handleSelect = (id) => {
    setSelectedPl(id);
    setRows([]);
    setSummary(null);
    loadHealth(id);
  };

  const triggerRecheck = async () => {
    if (!selectedPl) return;
    setRechecking(true);
    setErr('');
    try {
      await api.post(`/channels/recheck?playlistId=${selectedPl}`);
      setTimeout(() => { loadHealth(selectedPl); setRechecking(false); }, 12000);
    } catch (e) {
      setErr(e.response?.data?.error || 'Recheck failed');
      setRechecking(false);
    }
  };

  const recheckOne = async (row) => {
    const ch = channelMap[row.url];
    setRowBusy(row.url_hash);
    try {
      if (ch?.id) {
        await api.post(`/channels/${ch.id}/diagnose?playlistId=${selectedPl}`);
      } else {
        await api.post('/channels/diagnose', { playlistId: selectedPl, url: row.url });
      }
      setTimeout(() => loadHealth(selectedPl), 3000);
    } catch (e) {
      setErr(e.response?.data?.error || 'Recheck failed');
    }
    setRowBusy(null);
  };

  const setOverride = async (row, patch) => {
    const ch = channelMap[row.url];
    if (!ch?.id) {
      setErr('Channel ID not found — refresh playlist first');
      return;
    }
    setRowBusy(row.url_hash);
    try {
      await api.put(`/channels/${ch.id}/override`, {
        playlistId: selectedPl,
        url: row.url,
        ...patch,
      });
      await loadHealth(selectedPl);
    } catch (e) {
      setErr(e.response?.data?.error || 'Update failed');
    }
    setRowBusy(null);
  };

  const visible = rows.filter((r) => {
    if (filter === 'live' && r.is_live !== 1) return false;
    if (filter === 'dead' && r.is_live !== 0) return false;
    if (filter === 'unknown' && r.is_live !== null) return false;
    if (reasonFilter && r.failure_reason_code !== reasonFilter) return false;
    if (search && !(r.channel_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const reasonCodes = [...new Set(rows.map((r) => r.failure_reason_code).filter(Boolean))].sort();

  return (
    <div className="min-h-screen bg-tv-bg flex flex-col">
      <div className="bg-tv-accent border-b border-tv-borderSubtle px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/admin/dashboard')} className="text-white/70 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <MobileMenu />
            <div>
              <h1 className="text-xl font-bold text-white">Channel Health</h1>
              <p className="text-xs text-white/70 hidden sm:block">Deep diagnosis &amp; playability</p>
            </div>
          </div>
          {selectedPl && (
            <button
              type="button"
              onClick={triggerRecheck}
              disabled={rechecking}
              className="flex items-center gap-2 text-sm text-white border border-white/30 hover:border-white/60 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {rechecking ? <Spinner size="sm" /> : null}
              {rechecking ? 'Testing all channels…' : 'Test all channels'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full pb-24">
        {err && <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">{err}</div>}

        <div className="mb-5">
          <label className="block text-xs font-medium text-tv-textMuted mb-1">Select Playlist</label>
          <select
            className="w-full max-w-xs rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent"
            value={selectedPl}
            onChange={(e) => handleSelect(e.target.value)}
          >
            <option value="">Choose a playlist…</option>
            {playlists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {!selectedPl && (
          <div className="text-center py-16 text-tv-textMuted">
            <p className="text-4xl mb-3">📡</p>
            <p className="font-medium">Select a playlist to view channel health</p>
          </div>
        )}

        {selectedPl && loading && (
          <div className="flex justify-center py-16"><Spinner size="xl" /></div>
        )}

        {summary && (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-5">
              {[
                ['Total', summary.total, 'text-tv-text'],
                ['Playable', summary.live, 'text-green-400'],
                ['Offline', summary.dead, summary.dead > 0 ? 'text-red-400' : 'text-tv-textMuted'],
                ['Unknown', summary.unknown, 'text-gray-400'],
              ].map(([label, val, cls]) => (
                <div key={label} className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl p-3 text-center">
                  <p className={`text-xl font-bold ${cls}`}>{val}</p>
                  <p className="text-xs text-tv-textMuted mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex gap-1 flex-wrap">
                {[['all', 'All'], ['live', 'Playable'], ['dead', 'Offline'], ['unknown', 'Unknown']].map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFilter(val)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filter === val ? 'bg-tv-accent text-white' : 'bg-tv-bgSoft border border-tv-borderSubtle text-tv-textMuted'}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              {reasonCodes.length > 0 && (
                <select
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  className="bg-tv-bgSoft border border-tv-borderSubtle text-tv-text rounded-lg px-2 py-1 text-xs"
                >
                  <option value="">All failure reasons</option>
                  {reasonCodes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <input
                type="text"
                placeholder="Search channel…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ml-auto bg-tv-bgSoft border border-tv-borderSubtle text-tv-text rounded-lg px-3 py-1.5 text-sm w-48"
              />
            </div>

            {rechecking && (
              <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 mb-4">
                <Spinner size="sm" />
                Testing all channels — results update when complete…
              </div>
            )}

            <div className="space-y-2">
              {visible.length === 0 ? (
                <p className="text-center text-tv-textMuted py-8 text-sm">No channels match the filter</p>
              ) : visible.map((r) => {
                const s = STATUS[r.is_live] || STATUS.null;
                const busy = rowBusy === r.url_hash;
                return (
                  <div key={r.url_hash} className={`px-4 py-3 rounded-xl border ${s.cls}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${s.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-tv-text text-sm font-medium truncate">{r.channel_name || 'Unnamed'}</p>
                        <p className="text-tv-textMuted text-xs truncate">{r.url ? `${r.url.slice(0, 60)}…` : '—'}</p>
                        {r.failure_reason_code && (
                          <p className="text-xs text-red-400 mt-1">
                            {r.failure_reason_code}
                            {r.failure_message ? ` — ${r.failure_message}` : ''}
                          </p>
                        )}
                        <DeviceIcons row={r} />
                        <p className="text-xs text-tv-textMuted mt-1">Checked: {timeAgo(r.last_checked)}</p>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border text-center ${s.cls}`}>{s.label}</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => recheckOne(r)}
                          className="text-xs px-2 py-1 rounded bg-tv-bgSoft border border-tv-borderSubtle hover:border-tv-accent disabled:opacity-50"
                        >
                          {busy ? '…' : 'Recheck'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setOverride(r, { is_hidden: true })}
                          className="text-xs px-2 py-1 rounded bg-tv-bgSoft border border-tv-borderSubtle hover:border-red-400 disabled:opacity-50"
                        >
                          Hide
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setOverride(r, { is_trusted: false })}
                          className="text-xs px-2 py-1 rounded bg-tv-bgSoft border border-tv-borderSubtle disabled:opacity-50"
                        >
                          Untrust
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
