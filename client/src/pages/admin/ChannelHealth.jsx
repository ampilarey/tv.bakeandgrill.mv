/**
 * Channel Health
 * See which IPTV channels are live/dead for a selected playlist.
 * Trigger a manual re-check. Sort by status.
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
  if (diff < 60)   return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

const STATUS = {
  1:    { label: 'Live',    cls: 'bg-green-500/20 text-green-400 border-green-500/30',  dot: 'bg-green-400' },
  0:    { label: 'Dead',    cls: 'bg-red-500/20 text-red-400 border-red-500/30',       dot: 'bg-red-500'  },
  null: { label: 'Unknown', cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30',   dot: 'bg-gray-500' },
};

export default function ChannelHealth() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [playlists, setPlaylists]   = useState([]);
  const [selectedPl, setSelectedPl] = useState('');
  const [rows, setRows]             = useState([]);
  const [summary, setSummary]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [filter, setFilter]         = useState('all'); // all | live | dead | unknown
  const [search, setSearch]         = useState('');
  const [err, setErr]               = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/admin/dashboard'); return; }
    api.get('/playlists').then(r => setPlaylists(r.data.playlists || [])).catch(() => {});
  }, [user, navigate]);

  const loadHealth = useCallback(async (plId) => {
    if (!plId) return;
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get(`/channels/health-report?playlistId=${plId}`);
      setRows(data.rows || []);
      setSummary(data.summary || null);
    } catch (e) { setErr(e.response?.data?.error || 'Load failed'); }
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
      // Poll until data refreshes — wait 5 s then reload
      setTimeout(() => { loadHealth(selectedPl); setRechecking(false); }, 8000);
    } catch (e) {
      setErr(e.response?.data?.error || 'Recheck failed');
      setRechecking(false);
    }
  };

  const visible = rows.filter(r => {
    if (filter === 'live'    && r.is_live !== 1)    return false;
    if (filter === 'dead'    && r.is_live !== 0)    return false;
    if (filter === 'unknown' && r.is_live !== null) return false;
    if (search && !(r.channel_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-tv-bg flex flex-col">
      {/* Header */}
      <div className="bg-tv-accent border-b border-tv-borderSubtle px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/dashboard')} className="text-white/70 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <MobileMenu />
            <div>
              <h1 className="text-xl font-bold text-white">Channel Health</h1>
              <p className="text-xs text-white/70 hidden sm:block">Live / dead status of IPTV streams</p>
            </div>
          </div>
          {selectedPl && (
            <button
              onClick={triggerRecheck}
              disabled={rechecking}
              className="flex items-center gap-2 text-sm text-white border border-white/30 hover:border-white/60 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {rechecking ? <Spinner size="sm" /> : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {rechecking ? 'Checking…' : 'Re-check All'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full pb-24">
        {err && <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">{err}</div>}

        {/* Playlist picker */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-tv-textMuted mb-1">Select Playlist</label>
          <select
            className="w-full max-w-xs rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent"
            value={selectedPl}
            onChange={e => handleSelect(e.target.value)}
          >
            <option value="">Choose a playlist…</option>
            {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {!selectedPl && (
          <div className="text-center py-16 text-tv-textMuted">
            <p className="text-4xl mb-3">📡</p>
            <p className="font-medium">Select a playlist to view channel health</p>
            <p className="text-sm mt-1">Health checks run automatically every 30 minutes</p>
          </div>
        )}

        {selectedPl && loading && (
          <div className="flex justify-center py-16"><Spinner size="xl" /></div>
        )}

        {selectedPl && !loading && rows.length === 0 && (
          <div className="text-center py-16 text-tv-textMuted">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-medium">No health data yet</p>
            <p className="text-sm mt-1">Click "Re-check All" to run the first check</p>
            <button onClick={triggerRecheck} disabled={rechecking} className="mt-4 bg-tv-accent hover:bg-tv-accentHover text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50">
              {rechecking ? 'Starting…' : 'Run Check Now'}
            </button>
          </div>
        )}

        {summary && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-5">
              {[
                ['Total',   summary.total,   'text-tv-text'],
                ['Live',    summary.live,    'text-green-400'],
                ['Dead',    summary.dead,    summary.dead > 0 ? 'text-red-400' : 'text-tv-textMuted'],
                ['Unknown', summary.unknown, 'text-gray-400'],
              ].map(([label, val, cls]) => (
                <div key={label} className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl p-3 text-center">
                  <p className={`text-xl font-bold ${cls}`}>{val}</p>
                  <p className="text-xs text-tv-textMuted mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex gap-1">
                {[['all','All'],['live','Live'],['dead','Dead'],['unknown','Unknown']].map(([val, lbl]) => (
                  <button key={val} onClick={() => setFilter(val)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filter === val ? 'bg-tv-accent text-white' : 'bg-tv-bgSoft border border-tv-borderSubtle text-tv-textMuted hover:border-tv-accent/50'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search channel name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="ml-auto bg-tv-bgSoft border border-tv-borderSubtle text-tv-text rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-tv-accent w-48"
              />
            </div>

            {rechecking && (
              <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 mb-4">
                <Spinner size="sm" />
                Re-check in progress — results will update automatically…
              </div>
            )}

            {/* Channel list */}
            <div className="space-y-1.5">
              {visible.length === 0 ? (
                <p className="text-center text-tv-textMuted py-8 text-sm">No channels match the filter</p>
              ) : visible.map((r) => {
                const s = STATUS[r.is_live] || STATUS[null];
                return (
                  <div key={r.url_hash} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${s.cls} bg-opacity-10`}>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-tv-text text-sm font-medium truncate">{r.channel_name || 'Unnamed channel'}</p>
                      <p className="text-tv-textMuted text-xs truncate">{r.url}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
                      <p className="text-xs text-tv-textMuted mt-1">Checked: {timeAgo(r.last_checked)}</p>
                      {r.consecutive_failures > 0 && <p className="text-xs text-red-400">{r.consecutive_failures} fail{r.consecutive_failures !== 1 ? 's' : ''}</p>}
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
