/**
 * Monitoring Dashboard
 * Live overview of all displays: online/offline, now playing, last seen, uptime.
 * Auto-refreshes every 15 s.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import MobileMenu from '../../components/MobileMenu';
import Footer from '../../components/Footer';
import Spinner from '../../components/common/Spinner';

const REFRESH_MS = 15_000;

function timeAgo(iso) {
  if (!iso) return 'never';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)  return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

function uptimeFmt(sec) {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function isOnline(d) {
  if (!d.last_heartbeat) return false;
  return (Date.now() - new Date(d.last_heartbeat).getTime()) < 65_000;
}

const OVERLAY_LABELS = { none: '—', bottom_bar: 'Bar', bottom_bar_popup: 'Bar+Card', split_right: 'Split' };

function DisplayTile({ d }) {
  const online = isOnline(d);
  const nowPlaying = d.now_playing || d.current_channel_id || null;

  return (
    <div className={`relative rounded-xl border p-4 transition-all ${online ? 'border-green-500/40 bg-green-500/5' : 'border-tv-borderSubtle bg-tv-bgSoft'}`}>
      {/* Status dot */}
      <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${online ? 'bg-green-400 shadow-[0_0_6px_2px_rgba(74,222,128,0.5)]' : 'bg-red-500/60'}`} />

      {/* Name + location */}
      <p className="font-bold text-tv-text text-sm pr-6 truncate">{d.name}</p>
      {d.location && <p className="text-xs text-tv-textMuted truncate">{d.location}</p>}

      {/* Status row */}
      <div className="mt-3 flex items-center gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${online ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {online ? 'Online' : 'Offline'}
        </span>
        {d.app_version && <span className="text-xs text-tv-textMuted">v{d.app_version}</span>}
        {d.is_outdoor ? <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">Outdoor</span> : null}
      </div>

      {/* Now playing */}
      {nowPlaying && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-tv-textMuted">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="truncate">{nowPlaying}</span>
        </div>
      )}

      {/* Meta grid */}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-tv-textMuted">
        <span>Last seen: <strong className="text-tv-text">{timeAgo(d.last_heartbeat)}</strong></span>
        <span>Uptime: <strong className="text-tv-text">{uptimeFmt(d.uptime_seconds)}</strong></span>
        <span>Type: <strong className="text-tv-text">{d.display_type || 'stream'}</strong></span>
        <span>Overlay: <strong className="text-tv-text">{OVERLAY_LABELS[d.overlay_mode] || '—'}</strong></span>
        {d.zone_name && <span className="col-span-2">Zone: <strong className="text-tv-text">{d.zone_name}</strong></span>}
        {d.last_status && <span className="col-span-2">Status: <strong className="text-tv-text">{d.last_status}</strong></span>}
      </div>
    </div>
  );
}

export default function MonitoringDashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [displays, setDisplays]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const intervalRef = useRef(null);

  const fetchDisplays = async () => {
    try {
      const { data } = await api.get('/displays');
      // Fetch zone info for each display
      let zones = {};
      try { const z = await api.get('/zones'); (z.data.zones || []).forEach(zn => { zones[zn.id] = zn.name; }); } catch { /* ignore */ }
      const list = (data.displays || []).map(d => ({ ...d, zone_name: zones[d.zone_id] || null }));
      setDisplays(list);
      setLastRefresh(new Date());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/admin/dashboard'); return; }
    fetchDisplays();
    intervalRef.current = setInterval(fetchDisplays, REFRESH_MS);
    const onVisible = () => { if (!document.hidden) fetchDisplays(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(intervalRef.current); document.removeEventListener('visibilitychange', onVisible); };
  }, [user, navigate]);

  const online  = displays.filter(isOnline).length;
  const offline = displays.length - online;

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
              <h1 className="text-xl font-bold text-white">TV Monitoring</h1>
              <p className="text-xs text-white/70 hidden sm:block">Live status · refreshes every 15 s</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
              <span className="text-white/80">{online} online</span>
              {offline > 0 && <>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block ml-2" />
                <span className="text-white/80">{offline} offline</span>
              </>}
            </div>
            <button onClick={fetchDisplays} className="text-white/60 hover:text-white text-xs flex items-center gap-1 border border-white/20 px-3 py-1.5 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
        {lastRefresh && (
          <p className="text-xs text-white/40 mt-2">Last updated: {lastRefresh.toLocaleTimeString()}</p>
        )}
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full pb-24">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="xl" /></div>
        ) : displays.length === 0 ? (
          <div className="text-center py-16 text-tv-textMuted">
            <p className="text-4xl mb-3">📺</p>
            <p className="font-medium">No displays configured</p>
            <button onClick={() => navigate('/admin/displays')} className="text-tv-accent underline text-sm mt-2">Go to Display Management</button>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                ['Total Displays', displays.length, 'text-tv-text'],
                ['Online Now',     online,           'text-green-400'],
                ['Offline',        offline,          offline > 0 ? 'text-red-400' : 'text-tv-textMuted'],
                ['With Overlay',   displays.filter(d => d.overlay_mode && d.overlay_mode !== 'none').length, 'text-purple-400'],
              ].map(([label, val, cls]) => (
                <div key={label} className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${cls}`}>{val}</p>
                  <p className="text-xs text-tv-textMuted mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Display grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displays
                .sort((a, b) => (isOnline(b) ? 1 : 0) - (isOnline(a) ? 1 : 0))
                .map(d => <DisplayTile key={d.id} d={d} />)}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
