/**
 * EmergencyOverride
 * One-page dashboard for pushing emergency content to all / zone / display.
 * Big red button. Active overrides with live countdown. Cancel button.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';
import MobileMenu from '../../components/MobileMenu';
import Footer from '../../components/Footer';

function useCountdown(expiresAt) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) { setRemaining('Expired'); return; }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemaining(`${m}m ${String(s).padStart(2, '0')}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return remaining;
}

function OverrideRow({ o, onCancel }) {
  const countdown = useCountdown(o.expires_at);
  const isAll = !o.zone_id && !o.display_id;
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-tv-text text-sm font-medium truncate">{o.override_message || 'Emergency override'}</p>
          <p className="text-tv-textMuted text-xs mt-0.5">
            {isAll ? '📺 All Displays' : o.zone_name ? `🏢 Zone: ${o.zone_name}` : `📺 ${o.display_name}`}
            {' · '}Playlist: {o.playlist_name || `#${o.playlist_id}`}
            {' · '}Expires in: <strong className="text-red-400">{countdown}</strong>
          </p>
        </div>
      </div>
      <button onClick={() => onCancel(o.id)} className="flex-shrink-0 text-xs font-semibold text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors">
        Cancel
      </button>
    </div>
  );
}

const EMPTY_FORM = { target: 'all', zone_id: '', display_id: '', playlist_id: '', override_message: '', duration_minutes: 60 };

export default function EmergencyOverride() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [overrides, setOverrides]   = useState([]);
  const [playlists, setPlaylists]   = useState([]);
  const [zones, setZones]           = useState([]);
  const [displays, setDisplays]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [o, p, z, d] = await Promise.all([
        api.get('/zones/overrides/active').catch(() => ({ data: { overrides: [] } })),
        api.get('/playlists'),
        api.get('/zones'),
        api.get('/displays'),
      ]);
      setOverrides(o.data.overrides || []);
      setPlaylists(p.data.playlists || []);
      setZones(z.data.zones         || []);
      setDisplays(d.data.displays   || []);
    } catch (e) { setErr(e.response?.data?.error || 'Load failed'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/admin/dashboard'); return; }
    load();
    intervalRef.current = setInterval(load, 15_000);
    return () => clearInterval(intervalRef.current);
  }, [user, navigate, load]);

  const activate = async () => {
    if (!form.playlist_id) { setErr('Select a playlist'); return; }
    setSaving(true);
    try {
      const payload = {
        playlist_id:       parseInt(form.playlist_id),
        override_message:  form.override_message || 'Emergency override active',
        duration_minutes:  parseInt(form.duration_minutes) || 60,
        target_all:        form.target === 'all'     ? true : undefined,
        zone_id:           form.target === 'zone'    ? parseInt(form.zone_id)    : undefined,
        display_id:        form.target === 'display' ? parseInt(form.display_id) : undefined,
      };
      const { data } = await api.post('/zones/override', payload);
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      load();
      alert(`✅ Override activated! Pushed to ${data.affected_displays} display(s). Expires: ${new Date(data.expires_at).toLocaleTimeString()}`);
    } catch (e) { setErr(e.response?.data?.error || 'Activation failed'); }
    setSaving(false);
  };

  const cancel = async (id) => {
    await api.delete(`/zones/override/${id}`).catch(() => {});
    load();
  };

  const cancelAll = async () => {
    if (!window.confirm(`Cancel all ${overrides.length} active override(s)?`)) return;
    await Promise.all(overrides.map(o => api.delete(`/zones/override/${o.id}`).catch(() => {})));
    load();
  };

  return (
    <div className="min-h-screen bg-tv-bg flex flex-col">
      {/* Header */}
      <div className="bg-red-800 border-b border-red-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/dashboard')} className="text-white/70 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <MobileMenu />
            <div>
              <h1 className="text-xl font-bold text-white">🚨 Emergency Override</h1>
              <p className="text-xs text-red-200 hidden sm:block">Push content to all or specific displays immediately</p>
            </div>
          </div>
          {overrides.length > 0 && (
            <button onClick={cancelAll} className="text-red-200 hover:text-white text-xs border border-red-400/50 px-3 py-1.5 rounded-lg">
              Cancel All ({overrides.length})
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full pb-24 space-y-6">
        {err && <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">{err} <button onClick={() => setErr('')} className="underline ml-2">dismiss</button></div>}

        {/* Big red activate button */}
        <div className="bg-red-900/30 border-2 border-red-500/50 rounded-2xl p-6 text-center">
          <div className="text-5xl mb-3">🚨</div>
          <h2 className="text-xl font-bold text-white mb-2">Emergency Override</h2>
          <p className="text-red-200 text-sm mb-6 max-w-md mx-auto">
            Immediately replace what is playing on selected displays. 
            Content reverts automatically after the set duration.
          </p>
          <button
            onClick={() => { setErr(''); setForm({ ...EMPTY_FORM }); setShowModal(true); }}
            className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-lg px-10 py-4 rounded-xl shadow-lg shadow-red-900/50 transition-all transform hover:scale-105 active:scale-95"
          >
            🚨 Activate Override
          </button>
          <p className="text-red-300/60 text-xs mt-3">This will interrupt what is currently playing</p>
        </div>

        {/* Active overrides */}
        {loading ? (
          <div className="flex justify-center py-6"><Spinner size="lg" /></div>
        ) : overrides.length === 0 ? (
          <div className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl p-6 text-center text-tv-textMuted">
            <p className="text-2xl mb-2">✅</p>
            <p className="font-medium">No active overrides</p>
            <p className="text-sm mt-1">All displays are playing normally</p>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
              Active Overrides ({overrides.length})
            </h3>
            <div className="space-y-3">
              {overrides.map(o => <OverrideRow key={o.id} o={o} onCancel={cancel} />)}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl p-4 text-sm text-tv-textMuted">
          <p className="font-semibold text-tv-text mb-2">How it works</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Overrides take effect within seconds (next heartbeat cycle)</li>
            <li>Displays revert automatically when the timer expires</li>
            <li>You can cancel overrides manually at any time</li>
            <li>Zone overrides push to all displays in that zone</li>
            <li>Multiple overrides can be active simultaneously</li>
          </ul>
        </div>
      </div>

      <Footer />

      {/* Activate Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="🚨 Activate Emergency Override">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {err && <div className="bg-red-500/20 text-red-400 px-3 py-2 rounded-lg text-sm">{err}</div>}

          {/* Target */}
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-2">Target</label>
            <div className="grid grid-cols-3 gap-2">
              {[['all','🌐 All Displays'],['zone','🏢 Zone'],['display','📺 Display']].map(([val, lbl]) => (
                <button key={val} type="button"
                  onClick={() => setForm(f => ({ ...f, target: val, zone_id: '', display_id: '' }))}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${form.target === val ? 'bg-red-600 text-white border-red-600' : 'border-tv-borderSubtle text-tv-textMuted hover:border-red-500/50'}`}
                >{lbl}</button>
              ))}
            </div>
          </div>

          {form.target === 'zone' && (
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Zone *</label>
              <select className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-red-500" value={form.zone_id} onChange={e => setForm(f => ({...f, zone_id: e.target.value}))}>
                <option value="">Select zone…</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.display_count} displays)</option>)}
              </select>
            </div>
          )}

          {form.target === 'display' && (
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Display *</label>
              <select className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-red-500" value={form.display_id} onChange={e => setForm(f => ({...f, display_id: e.target.value}))}>
                <option value="">Select display…</option>
                {displays.map(d => <option key={d.id} value={d.id}>{d.name}{d.location ? ` — ${d.location}` : ''}</option>)}
              </select>
            </div>
          )}

          {/* Playlist */}
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">Playlist to Push *</label>
            <select className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-red-500" value={form.playlist_id} onChange={e => setForm(f => ({...f, playlist_id: e.target.value}))}>
              <option value="">Select playlist…</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">Message (shown on display)</label>
            <input type="text" className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-red-500" placeholder="Emergency override active" value={form.override_message} onChange={e => setForm(f => ({...f, override_message: e.target.value}))} />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">Duration: <strong className="text-tv-text">{form.duration_minutes} minutes</strong></label>
            <input type="range" min={5} max={480} step={5} value={form.duration_minutes} onChange={e => setForm(f => ({...f, duration_minutes: parseInt(e.target.value)}))} className="w-full accent-red-500" />
            <div className="flex justify-between text-xs text-tv-textMuted mt-1">
              <span>5 min</span><span>1 h</span><span>4 h</span><span>8 h</span>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-tv-borderSubtle">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <button
              onClick={activate}
              disabled={saving || !form.playlist_id || (form.target === 'zone' && !form.zone_id) || (form.target === 'display' && !form.display_id)}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {saving ? <Spinner size="sm" /> : '🚨'} Activate Now
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
