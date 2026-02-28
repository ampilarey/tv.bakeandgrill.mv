/**
 * ContentSchedules
 * Manage time-based media playlist rules for displays and zones.
 * Uses /api/content-schedules CRUD.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';
import MobileMenu from '../../components/MobileMenu';
import Footer from '../../components/Footer';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const ALL_DAYS = '0,1,2,3,4,5,6';

function daysLabel(str) {
  if (!str || str === ALL_DAYS) return 'Every day';
  const parts = str.split(',').map(Number);
  if (parts.length === 5 && !parts.includes(0) && !parts.includes(6)) return 'Mon–Fri';
  if (parts.length === 2 && parts.includes(0) && parts.includes(6)) return 'Weekends';
  return parts.map(d => DAYS[d]).join(', ');
}

function DayPicker({ value, onChange }) {
  const selected = (value || ALL_DAYS).split(',').map(Number);
  const toggle = (d) => {
    const next = selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d].sort();
    onChange(next.length === 7 ? ALL_DAYS : next.join(','));
  };
  return (
    <div className="flex gap-1 flex-wrap">
      {DAYS.map((label, i) => (
        <button
          key={i}
          type="button"
          onClick={() => toggle(i)}
          className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${selected.includes(i) ? 'bg-tv-accent text-white' : 'bg-tv-bgSoft border border-tv-borderSubtle text-tv-textMuted hover:border-tv-accent/50'}`}
        >
          {label}
        </button>
      ))}
      <button type="button" onClick={() => onChange(ALL_DAYS)} className="px-2 h-10 rounded-lg text-xs text-tv-accent border border-tv-accent/40 hover:bg-tv-accent/10 ml-1">All</button>
    </div>
  );
}

const EMPTY_FORM = {
  target_type: 'display',
  target_id:   '',
  playlist_id: '',
  days_of_week: ALL_DAYS,
  start_time:   '08:00',
  end_time:     '22:00',
  priority:     0,
  enabled:      true,
};

export default function ContentSchedules() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [schedules, setSchedules]   = useState([]);
  const [playlists, setPlaylists]   = useState([]);
  const [displays, setDisplays]     = useState([]);
  const [zones, setZones]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, d, z] = await Promise.all([
        api.get('/content-schedules'),
        api.get('/media-playlists'),
        api.get('/displays'),
        api.get('/zones'),
      ]);
      setSchedules(s.data.schedules || []);
      setPlaylists(p.data.playlists || []);
      setDisplays(d.data.displays   || []);
      setZones(z.data.zones         || []);
    } catch (e) { setErr(e.response?.data?.error || 'Load failed'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/admin/dashboard'); return; }
    load();
  }, [user, navigate, load]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowModal(true); };
  const openEdit   = (s) => {
    setEditing(s);
    setForm({
      target_type:  s.target_type  || 'display',
      target_id:    s.target_id    || '',
      playlist_id:  s.playlist_id  || '',
      days_of_week: s.days_of_week || ALL_DAYS,
      start_time:   s.start_time?.slice(0,5) || '08:00',
      end_time:     s.end_time?.slice(0,5)   || '22:00',
      priority:     s.priority     || 0,
      enabled:      s.enabled !== 0,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.playlist_id || !form.target_id) {
      setErr('Playlist and target are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, target_id: parseInt(form.target_id), playlist_id: parseInt(form.playlist_id), enabled: form.enabled ? 1 : 0 };
      editing ? await api.put(`/content-schedules/${editing.id}`, payload) : await api.post('/content-schedules', payload);
      setShowModal(false);
      load();
    } catch (e) { setErr(e.response?.data?.error || 'Save failed'); }
    setSaving(false);
  };

  const del = async (id) => {
    if (!window.confirm('Delete this schedule?')) return;
    await api.delete(`/content-schedules/${id}`).catch(() => {});
    load();
  };

  const toggleEnabled = async (s) => {
    await api.put(`/content-schedules/${s.id}`, { enabled: s.enabled ? 0 : 1 }).catch(() => {});
    load();
  };

  const getPlaylistName  = (id) => playlists.find(p => p.id == id)?.name || `Playlist #${id}`;
  const getTargetName    = (type, id) => {
    if (type === 'display') return displays.find(d => d.id == id)?.name || `Display #${id}`;
    if (type === 'zone')    return zones.find(z => z.id == id)?.name    || `Zone #${id}`;
    return id;
  };

  const now = new Date();
  const nowDay  = now.getDay();
  const nowTime = now.toTimeString().slice(0, 5);

  const isActiveNow = (s) => {
    if (!s.enabled) return false;
    const days = (s.days_of_week || ALL_DAYS).split(',').map(Number);
    if (!days.includes(nowDay)) return false;
    return s.start_time?.slice(0,5) <= nowTime && s.end_time?.slice(0,5) >= nowTime;
  };

  const targetOptions = form.target_type === 'display' ? displays : zones;

  return (
    <div className="min-h-screen bg-tv-bg flex flex-col">
      {/* Header */}
      <div className="bg-tv-accent border-b border-tv-borderSubtle px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/dashboard')} className="text-white/70 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <MobileMenu />
            <div>
              <h1 className="text-xl font-bold text-white">Content Schedules</h1>
              <p className="text-xs text-white/70 hidden sm:block">Auto-switch media playlists by time of day</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={openCreate}>+ New Schedule</Button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full pb-24">
        {err && <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">{err} <button onClick={() => setErr('')} className="underline ml-2">dismiss</button></div>}

        {/* How it works */}
        <Card className="mb-6 border border-tv-accent/20 bg-tv-accent/5">
          <div className="p-4 text-sm text-tv-textMuted space-y-1">
            <p className="font-semibold text-tv-text mb-2">How schedules work</p>
            <p>• Display checks which schedule is active right now (highest priority wins)</p>
            <p>• Display-level schedules override zone-level schedules</p>
            <p>• Falls back to the display's default media playlist if no schedule matches</p>
            <p>• Outdoor displays also support day/night playlists set in Display Settings</p>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="xl" /></div>
        ) : schedules.length === 0 ? (
          <Card>
            <div className="p-12 text-center text-tv-textMuted">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-medium">No schedules yet</p>
              <p className="text-sm mt-1">Create a schedule to auto-switch playlists at specific times.</p>
              <Button onClick={openCreate} className="mt-4" size="sm">Create First Schedule</Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {schedules
              .sort((a, b) => (b.priority || 0) - (a.priority || 0))
              .map(s => {
                const active = isActiveNow(s);
                return (
                  <div key={s.id} className={`rounded-xl border p-4 flex items-center gap-4 ${active ? 'border-green-500/40 bg-green-500/5' : 'border-tv-borderSubtle bg-tv-bgSoft'} ${!s.enabled ? 'opacity-50' : ''}`}>
                    {/* Active indicator */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${active ? 'bg-green-400' : s.enabled ? 'bg-tv-textMuted/40' : 'bg-red-500/40'}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-tv-text text-sm">{getPlaylistName(s.playlist_id)}</span>
                        <span className="text-xs bg-tv-bgSoft border border-tv-borderSubtle px-2 py-0.5 rounded-full text-tv-textMuted">
                          {s.target_type === 'display' ? '📺' : '🏢'} {getTargetName(s.target_type, s.target_id)}
                        </span>
                        {active && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">Active now</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-tv-textMuted">
                        <span>🕐 {s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</span>
                        <span>📅 {daysLabel(s.days_of_week)}</span>
                        <span>Priority: {s.priority || 0}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleEnabled(s)}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors ${s.enabled ? 'border-green-500/40 text-green-400 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400' : 'border-tv-borderSubtle text-tv-textMuted hover:border-green-500/40 hover:text-green-400'}`}
                        title={s.enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        {s.enabled ? 'On' : 'Off'}
                      </button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => del(s.id)}>Del</Button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <Footer />

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Schedule' : 'New Schedule'}>
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {err && <div className="bg-red-500/20 text-red-400 px-3 py-2 rounded-lg text-sm">{err}</div>}

          {/* Playlist */}
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">Media Playlist *</label>
            <select className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent" value={form.playlist_id} onChange={e => setForm(f => ({...f, playlist_id: e.target.value}))}>
              <option value="">Select playlist…</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {playlists.length === 0 && <p className="text-xs text-tv-textMuted mt-1">No media playlists yet. Create one in Media Playlists first.</p>}
          </div>

          {/* Target type */}
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">Target Type *</label>
            <div className="flex gap-2">
              {['display','zone'].map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({...f, target_type: t, target_id: ''}))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${form.target_type === t ? 'bg-tv-accent text-white border-tv-accent' : 'border-tv-borderSubtle text-tv-textMuted hover:border-tv-accent/40'}`}>
                  {t === 'display' ? '📺 Display' : '🏢 Zone'}
                </button>
              ))}
            </div>
          </div>

          {/* Target selector */}
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">{form.target_type === 'display' ? 'Display' : 'Zone'} *</label>
            <select className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent" value={form.target_id} onChange={e => setForm(f => ({...f, target_id: e.target.value}))}>
              <option value="">Select {form.target_type}…</option>
              {targetOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Days */}
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-2">Days of Week</label>
            <DayPicker value={form.days_of_week} onChange={v => setForm(f => ({...f, days_of_week: v}))} />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Start Time *</label>
              <input type="time" className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent" value={form.start_time} onChange={e => setForm(f => ({...f, start_time: e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">End Time *</label>
              <input type="time" className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent" value={form.end_time} onChange={e => setForm(f => ({...f, end_time: e.target.value}))} />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">Priority <span className="text-tv-textMuted font-normal">(higher = wins when multiple match)</span></label>
            <input type="number" min={0} className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent" value={form.priority} onChange={e => setForm(f => ({...f, priority: parseInt(e.target.value) || 0}))} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-tv-accent" checked={form.enabled} onChange={e => setForm(f => ({...f, enabled: e.target.checked}))} />
            <span className="text-tv-text text-sm">Enabled</span>
          </label>

          <div className="flex gap-3 justify-end pt-2 border-t border-tv-borderSubtle">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.playlist_id || !form.target_id}>
              {saving ? <Spinner size="sm" /> : editing ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
