/**
 * System Health
 * Server uptime, DB status, display counts, service timestamps, login log, export.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import MobileMenu from '../../components/MobileMenu';
import Footer from '../../components/Footer';
import Spinner from '../../components/common/Spinner';

function StatCard({ label, value, sub, color = 'text-tv-text', icon }) {
  return (
    <div className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-tv-textMuted mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
          {sub && <p className="text-xs text-tv-textMuted mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-2xl opacity-60">{icon}</span>}
      </div>
    </div>
  );
}

function StatusDot({ ok }) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-green-400' : 'bg-red-500'}`} />;
}

function timeAgo(iso) {
  if (!iso) return 'never';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

export default function SystemHealth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('health');
  const intervalRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get('/system/health');
      setHealth(data.health);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadLogs = async () => {
    try { const { data } = await api.get('/system/login-log?limit=100'); setLogs(data.logs || []); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/admin/dashboard'); return; }
    load();
    intervalRef.current = setInterval(load, 15_000);
    return () => clearInterval(intervalRef.current);
  }, [user, navigate]);

  useEffect(() => { if (tab === 'logs') loadLogs(); }, [tab]);

  const exportConfig = () => {
    const url = `${api.defaults?.baseURL || '/api'}/system/export`;
    const token = localStorage.getItem('token');
    const a = document.createElement('a');
    a.href = url;
    // Add auth header via fetch + blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        a.href = URL.createObjectURL(blob);
        a.download = `bakeandgrill-tv-config-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
      });
  };

  const s = health?.server;
  const db = health?.database;
  const disp = health?.displays;
  const svc = health?.services;

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
              <h1 className="text-xl font-bold text-white">System Health</h1>
              <p className="text-xs text-white/70 hidden sm:block">Server · DB · Services · Auto-refreshes 15 s</p>
            </div>
          </div>
          <button onClick={exportConfig} className="flex items-center gap-2 text-sm text-white border border-white/30 hover:border-white/60 px-4 py-1.5 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Config
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {[['health','System'],['logs','Login Log']].map(([val, lbl]) => (
            <button key={val} onClick={() => setTab(val)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === val ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full pb-24">

        {tab === 'health' && (
          <>
            {loading ? (
              <div className="flex justify-center py-16"><Spinner size="xl" /></div>
            ) : !health ? (
              <p className="text-center text-tv-textMuted py-16">Could not load health data</p>
            ) : (
              <div className="space-y-6">
                {/* Server */}
                <section>
                  <h2 className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider mb-3">Server</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Uptime"      value={s?.uptime_human}          icon="⏱" />
                    <StatCard label="Node"         value={s?.node_version}          icon="🟢" />
                    <StatCard label="Heap Used"    value={`${s?.memory_mb?.heap_used} MB`} sub={`of ${s?.memory_mb?.heap_total} MB`} icon="💾" />
                    <StatCard label="Load Avg"     value={s?.load_avg?.[0]}         sub="1 min avg" icon="📊" />
                  </div>
                </section>

                {/* Database */}
                <section>
                  <h2 className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider mb-3">Database</h2>
                  <div className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl p-4 flex items-center gap-4">
                    <StatusDot ok={db?.ok} />
                    <div>
                      <p className="text-tv-text font-medium">{db?.ok ? 'MySQL Connected' : 'MySQL Error'}</p>
                      {db?.latency_ms != null && <p className="text-tv-textMuted text-xs">Query latency: {db.latency_ms} ms</p>}
                    </div>
                    <span className={`ml-auto text-sm font-semibold ${db?.ok ? 'text-green-400' : 'text-red-400'}`}>{db?.ok ? 'OK' : 'DOWN'}</span>
                  </div>
                </section>

                {/* Displays */}
                <section>
                  <h2 className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider mb-3">Displays</h2>
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard label="Total"   value={disp?.total}   icon="📺" />
                    <StatCard label="Online"  value={disp?.online}  color="text-green-400" icon="🟢" />
                    <StatCard label="Offline" value={disp?.offline} color={disp?.offline > 0 ? 'text-red-400' : 'text-tv-textMuted'} icon="🔴" />
                  </div>
                </section>

                {/* Services */}
                <section>
                  <h2 className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider mb-3">Background Services</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Last Channel Check" value={timeAgo(svc?.last_channel_check)} icon="📡" />
                    <StatCard label="Last M3U Fetch"     value={timeAgo(svc?.last_m3u_fetch)}     icon="📋" />
                    <StatCard label="Active Broadcasts"  value={svc?.active_broadcasts}           color={svc?.active_broadcasts > 0 ? 'text-yellow-400' : 'text-tv-text'} icon="📢" />
                    <StatCard label="Active Overrides"   value={svc?.active_overrides}            color={svc?.active_overrides > 0 ? 'text-red-400' : 'text-tv-text'} icon="🚨" />
                  </div>
                </section>

                {/* Users */}
                <section>
                  <h2 className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider mb-3">Users</h2>
                  <StatCard label="Active Users (last 24h)" value={health.users?.active_last_24h} icon="👤" />
                </section>
              </div>
            )}
          </>
        )}

        {tab === 'logs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-tv-textMuted">Last 100 login events</p>
              <button onClick={loadLogs} className="text-xs text-tv-accent hover:underline">Refresh</button>
            </div>
            {logs.length === 0 ? (
              <p className="text-center text-tv-textMuted py-12">No login events recorded yet</p>
            ) : (
              <div className="space-y-1.5">
                {logs.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-tv-bgSoft border border-tv-borderSubtle rounded-lg text-sm">
                    <span className="text-green-400 flex-shrink-0">✓</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-tv-text">{l.email || `User #${l.user_id}`}</span>
                      <span className="text-tv-textMuted ml-2 text-xs">{l.role}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-tv-textMuted">{l.ip_address}</p>
                      <p className="text-xs text-tv-textMuted">{timeAgo(l.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
