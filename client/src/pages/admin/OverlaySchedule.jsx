/**
 * Overlay Message Scheduler
 * View and manage timed overlay ticker messages with schedule windows.
 * Groups messages into: Always On | Scheduled (has start/end) | Disabled
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';
import { useToast } from '../../hooks/useToast';

const PRIORITY_LABELS = { 1: 'Low', 5: 'Normal', 10: 'High', 20: 'Urgent' };
const PRIORITY_COLORS = { 1: 'text-gray-400', 5: 'text-blue-400', 10: 'text-yellow-400', 20: 'text-red-400' };

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtDT(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isScheduled(msg) {
  return msg.start_at || msg.end_at;
}

function isCurrentlyActive(msg) {
  if (!msg.enabled) return false;
  const now = Date.now();
  if (msg.start_at && new Date(msg.start_at).getTime() > now) return false;
  if (msg.end_at   && new Date(msg.end_at).getTime() < now)   return false;
  return true;
}

function StatusChip({ msg }) {
  if (!msg.enabled) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">Disabled</span>;
  if (isCurrentlyActive(msg)) return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Active now</span>;
  if (msg.start_at && new Date(msg.start_at).getTime() > Date.now()) return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Scheduled</span>;
  if (msg.end_at && new Date(msg.end_at).getTime() < Date.now()) return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">Expired</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Always on</span>;
}

const DEFAULT_FORM = {
  text: '', enabled: true, priority: 5,
  start_at: '', end_at: '',
  target_type: 'all', target_id: '',
};

export default function OverlaySchedule() {
  const [messages, setMessages] = useState([]);
  const [zones, setZones]       = useState([]);
  const [displays, setDisplays] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(DEFAULT_FORM);
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState('all'); // all | active | scheduled | disabled
  const { showToast }           = useToast();

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: m }, { data: z }, { data: d }] = await Promise.all([
        api.get('/overlays/messages'),
        api.get('/zones').catch(() => ({ data: { zones: [] } })),
        api.get('/displays').catch(() => ({ data: { displays: [] } })),
      ]);
      setMessages(m.messages || []);
      setZones(z.zones || []);
      setDisplays(d.displays || []);
    } catch { showToast('Failed to load', 'error'); }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  }

  function openEdit(msg) {
    setEditing(msg);
    setForm({
      text:        msg.text,
      enabled:     !!msg.enabled,
      priority:    msg.priority || 5,
      start_at:    msg.start_at ? new Date(msg.start_at).toISOString().slice(0, 16) : '',
      end_at:      msg.end_at   ? new Date(msg.end_at).toISOString().slice(0, 16)   : '',
      target_type: msg.target_type || 'all',
      target_id:   msg.target_id   || '',
    });
    setShowModal(true);
  }

  async function save() {
    if (!form.text.trim()) return;
    setSaving(true);
    const payload = {
      text:        form.text.trim(),
      enabled:     form.enabled ? 1 : 0,
      priority:    form.priority,
      start_at:    form.start_at || null,
      end_at:      form.end_at   || null,
      target_type: form.target_type,
      target_id:   form.target_type !== 'all' ? (form.target_id || null) : null,
    };
    try {
      if (editing) {
        await api.put(`/overlays/messages/${editing.id}`, payload);
        showToast('Message updated', 'success');
      } else {
        await api.post('/overlays/messages', payload);
        showToast('Message created', 'success');
      }
      setShowModal(false);
      load();
    } catch { showToast('Failed to save', 'error'); }
    setSaving(false);
  }

  async function toggle(msg) {
    try {
      await api.put(`/overlays/messages/${msg.id}`, { enabled: msg.enabled ? 0 : 1 });
      load();
    } catch { showToast('Failed to update', 'error'); }
  }

  async function del(id) {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/overlays/messages/${id}`);
      showToast('Deleted', 'success');
      load();
    } catch { showToast('Failed to delete', 'error'); }
  }

  const filtered = messages.filter(m => {
    if (filter === 'active')    return isCurrentlyActive(m);
    if (filter === 'scheduled') return m.enabled && !isCurrentlyActive(m);
    if (filter === 'disabled')  return !m.enabled;
    return true;
  });

  // Group for display
  const always    = filtered.filter(m => m.enabled && !isScheduled(m));
  const scheduled = filtered.filter(m => m.enabled &&  isScheduled(m));
  const disabled  = filtered.filter(m => !m.enabled);

  const groups = [
    { label: 'Always On',        items: always,    icon: '🔄', color: 'text-green-400' },
    { label: 'Scheduled',        items: scheduled, icon: '🕐', color: 'text-blue-400' },
    { label: 'Disabled',         items: disabled,  icon: '⏸',  color: 'text-gray-400' },
  ].filter(g => g.items.length > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-tv-text">Overlay Scheduler</h1>
          <p className="text-sm text-tv-textMuted mt-1">
            Create ticker messages with optional start/end times — shown on displays as scrolling bottom bar.
          </p>
        </div>
        <Button onClick={openCreate}>+ New Message</Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'active', 'scheduled', 'disabled'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-tv-accent text-white' : 'bg-tv-bgSoft text-tv-textMuted hover:text-tv-text'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all' && <span className="ml-1 text-tv-textMuted">({messages.length})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : messages.length === 0 ? (
        <div className="text-center py-20 text-tv-textMuted">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-lg font-medium text-tv-text">No messages yet</p>
          <p className="text-sm mt-1">Create a ticker message to display on your TVs.</p>
          <Button className="mt-4" onClick={openCreate}>+ Create First Message</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <section key={group.label}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${group.color}`}>
                {group.icon} {group.label} ({group.items.length})
              </h3>
              <div className="space-y-2">
                {group.items.map(msg => (
                  <div key={msg.id} className={`bg-tv-bgSoft border rounded-xl px-4 py-3 flex items-start gap-3 ${isCurrentlyActive(msg) ? 'border-green-500/30' : 'border-tv-borderSubtle'}`}>
                    {/* Priority indicator */}
                    <div className={`mt-1 text-base shrink-0 ${PRIORITY_COLORS[msg.priority] || 'text-tv-textMuted'}`}>
                      ■
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-tv-text text-sm font-medium">{msg.text}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-tv-textMuted">
                        <StatusChip msg={msg} />
                        <span>Priority: {PRIORITY_LABELS[msg.priority] || msg.priority}</span>
                        {msg.target_type !== 'all' && (
                          <span>Target: {msg.target_type} #{msg.target_id}</span>
                        )}
                        {msg.start_at && <span>From: {fmtDT(msg.start_at)}</span>}
                        {msg.end_at   && <span>Until: {fmtDT(msg.end_at)}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggle(msg)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${msg.enabled ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                      >
                        {msg.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => openEdit(msg)} className="text-tv-textMuted hover:text-tv-accent text-sm px-2">✎</button>
                      <button onClick={() => del(msg.id)} className="text-tv-textMuted hover:text-red-400 text-sm px-1">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <Modal title={editing ? 'Edit Message' : 'New Overlay Message'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {/* Text */}
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Message Text *</label>
              <textarea
                className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent resize-none"
                rows={3}
                placeholder="e.g. 🍔 Happy Hour 5-7PM — All burgers 20% off!"
                value={form.text}
                onChange={e => f('text', e.target.value)}
                autoFocus
              />
            </div>

            {/* Priority + Enabled */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-tv-textMuted mb-1">Priority</label>
                <select className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={form.priority} onChange={e => f('priority', Number(e.target.value))}>
                  <option value={1}>Low</option>
                  <option value={5}>Normal</option>
                  <option value={10}>High</option>
                  <option value={20}>Urgent</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-tv-accent" checked={form.enabled} onChange={e => f('enabled', e.target.checked)} />
                  <span className="text-tv-text text-sm">Enabled</span>
                </label>
              </div>
            </div>

            {/* Schedule window */}
            <div>
              <p className="text-xs font-medium text-tv-textMuted mb-2">Schedule Window (optional — leave blank for always-on)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-tv-textMuted mb-1">Start date/time</label>
                  <input type="datetime-local" className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent" value={form.start_at} onChange={e => f('start_at', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-tv-textMuted mb-1">End date/time</label>
                  <input type="datetime-local" className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent" value={form.end_at} onChange={e => f('end_at', e.target.value)} />
                </div>
              </div>
              {form.start_at && form.end_at && (
                <p className="text-xs text-blue-400 mt-1">
                  ⏰ Will show from {new Date(form.start_at).toLocaleString()} to {new Date(form.end_at).toLocaleString()}
                </p>
              )}
            </div>

            {/* Target */}
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Target</label>
              <select className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={form.target_type} onChange={e => f('target_type', e.target.value)}>
                <option value="all">All displays</option>
                <option value="zone">Specific zone</option>
                <option value="display">Specific display</option>
              </select>
              {form.target_type === 'zone' && (
                <select className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none mt-2" value={form.target_id} onChange={e => f('target_id', e.target.value)}>
                  <option value="">Select zone…</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              )}
              {form.target_type === 'display' && (
                <select className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none mt-2" value={form.target_id} onChange={e => f('target_id', e.target.value)}>
                  <option value="">Select display…</option>
                  {displays.map(d => <option key={d.id} value={d.id}>{d.name}{d.location ? ` (${d.location})` : ''}</option>)}
                </select>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-tv-borderSubtle">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !form.text.trim()}>
                {saving ? <Spinner size="sm" /> : editing ? 'Save Changes' : 'Create Message'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
