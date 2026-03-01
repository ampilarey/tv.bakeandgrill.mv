/**
 * Display Analytics
 * 7-day uptime bars per TV + live status summary.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import MobileMenu from '../../components/MobileMenu';
import Footer from '../../components/Footer';

function timeAgo(iso) {
  if (!iso) return 'never';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return `${Math.round(diff)}s ago`;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function uptimeFmt(sec) {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function UptimeBar({ pct }) {
  if (pct === null || pct === undefined) {
    return <div className="h-10 w-7 rounded-sm bg-tv-borderSubtle flex items-end justify-center" title="No data">
      <span className="text-[9px] text-tv-textMuted pb-0.5">?</span>
    </div>;
  }
  const color = pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  const heightPct = Math.max(4, pct);
  return (
    <div className="h-10 w-7 rounded-sm bg-tv-borderSubtle flex items-end overflow-hidden" title={`${pct}%`}>
      <div className={`w-full ${color} rounded-sm transition-all`} style={{ height: `${heightPct}%` }} />
    </div>
  );
}

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { weekday: 'short' }).slice(0, 3);
}

export default function DisplayAnalytics() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [data, setData]       = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: d }, { data: s }] = await Promise.all([
        api.get('/analytics/displays'),
        api.get('/analytics/summary'),
      ]);
      if (d.success) setData(d);
      if (s.success) setSummary(s);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/admin/dashboard'); return; }
    load();
  }, [user, navigate, load]);

  const displays = data?.displays || [];
  const days     = data?.days     || [];

  const filtered = displays.filter(d => {
    if (filter === 'online')  return d.is_online;
    if (filter === 'offline') return !d.is_online;
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
              <h1 className="text-xl font-bold text-white">Display Analytics</h1>
              <p className="text-xs text-white/70 hidden sm:block">7-day uptime overview for all active displays</p>
            </div>
          </div>
          <Button variant="ghost" onClick={load} disabled={loading} className="border-white/30 text-white hover:bg-white/10">↺ Refresh</Button>
        </div>
      </div>
      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full pb-24 space-y-6">

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Displays', value: summary.total_displays,   color: 'text-tv-text' },
            { label: 'Online Now',     value: summary.online_displays,  color: 'text-green-400' },
            { label: 'Offline Now',    value: summary.offline_displays, color: 'text-red-400' },
            { label: 'Avg Uptime',     value: summary.avg_uptime_hours + 'h', color: 'text-blue-400' },
          ].map(c => (
            <div key={c.label} className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl p-4 text-center">
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-tv-textMuted mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'online', 'offline'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-tv-accent text-white' : 'bg-tv-bgSoft text-tv-textMuted hover:text-tv-text'}`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-tv-textMuted">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-lg font-medium text-tv-text">No data yet</p>
          <p className="text-sm mt-1">Uptime data accumulates as displays go online and offline over time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <div key={d.id} className={`bg-tv-bgSoft border rounded-xl p-4 ${d.is_online ? 'border-green-500/30' : 'border-tv-borderSubtle'}`}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                {/* Left: name + meta */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${d.is_online ? 'bg-green-400 shadow-[0_0_5px_1px_rgba(74,222,128,0.5)]' : 'bg-red-500/60'}`} />
                    <p className="font-semibold text-tv-text truncate">{d.name}</p>
                    {d.location && <p className="text-xs text-tv-textMuted">({d.location})</p>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-tv-textMuted flex-wrap">
                    <span>Last seen: <strong className="text-tv-text">{timeAgo(d.last_heartbeat)}</strong></span>
                    {d.uptime_seconds > 0 && <span>Session: <strong className="text-tv-text">{uptimeFmt(d.uptime_seconds)}</strong></span>}
                    {d.now_playing && <span>Playing: <strong className="text-tv-text truncate max-w-[120px]">{d.now_playing}</strong></span>}
                  </div>
                </div>

                {/* Right: 7-day bars */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-end gap-1">
                    {days.map((day, i) => (
                      <UptimeBar key={day} pct={d.daily_uptime[i]} />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {days.map(day => (
                      <span key={day} className="text-[9px] text-tv-textMuted w-7 text-center">{dayLabel(day)}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-tv-textMuted pt-2">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-500" /> ≥80% online</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-yellow-500" /> 40–79%</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500" /> &lt;40%</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-tv-borderSubtle" /> No data</div>
      </div>
      </div>

      <Footer />
    </div>
  );
}
