/**
 * OverlayManagement
 * Two-tab admin page:
 *   Tab 1 — Messages (bottom bar ticker)
 *   Tab 2 — Promo Cards (popup + split panel)
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';
import MobileMenu from '../../components/MobileMenu';
import Footer from '../../components/Footer';

const TARGET_OPTIONS = [
  { value: 'all',     label: 'All displays' },
  { value: 'zone',    label: 'Specific zone' },
  { value: 'display', label: 'Specific display' },
];

// ── Shared helpers ─────────────────────────────────────────────────────────

function dt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

function StatusBadge({ enabled }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
      {enabled ? 'Active' : 'Disabled'}
    </span>
  );
}

// ── Messages tab ──────────────────────────────────────────────────────────

function MessagesTab() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);

  // Form fields
  const [fText, setFText]         = useState('');
  const [fIcon, setFIcon]         = useState('');
  const [fEnabled, setFEnabled]   = useState(true);
  const [fPriority, setFPriority] = useState(0);
  const [fRotation, setFRotation] = useState(8);
  const [fQr, setFQr]             = useState(false);
  const [fQrUrl, setFQrUrl]       = useState('');
  const [fStartAt, setFStartAt]   = useState('');
  const [fEndAt, setFEndAt]       = useState('');
  const [fTarget, setFTarget]     = useState('all');
  const [fTargetId, setFTargetId] = useState('');
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/overlays/messages'); setMessages(data.messages || []); }
    catch (e) { setErr(e.response?.data?.error || 'Load failed'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFText(''); setFIcon(''); setFEnabled(true); setFPriority(0); setFRotation(8);
    setFQr(false); setFQrUrl(''); setFStartAt(''); setFEndAt('');
    setFTarget('all'); setFTargetId('');
    setShowModal(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setFText(m.text); setFIcon(m.icon || ''); setFEnabled(!!m.enabled); setFPriority(m.priority || 0); setFRotation(m.rotation_seconds || 8);
    setFQr(!!m.show_qr); setFQrUrl(m.qr_url || ''); setFStartAt(m.start_at?.slice(0,16) || ''); setFEndAt(m.end_at?.slice(0,16) || '');
    setFTarget(m.target_type || 'all'); setFTargetId(m.target_id || '');
    setShowModal(true);
  };

  const save = async () => {
    if (!fText.trim()) return;
    setSaving(true);
    const payload = { text: fText, icon: fIcon || null, enabled: fEnabled, priority: fPriority, rotation_seconds: fRotation,
                      show_qr: fQr, qr_url: fQrUrl || null, start_at: fStartAt || null, end_at: fEndAt || null,
                      target_type: fTarget, target_id: fTargetId ? parseInt(fTargetId) : null };
    try {
      editing ? await api.put(`/overlays/messages/${editing.id}`, payload) : await api.post('/overlays/messages', payload);
      setShowModal(false); load();
    } catch (e) { setErr(e.response?.data?.error || 'Save failed'); }
    setSaving(false);
  };

  const del = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    await api.delete(`/overlays/messages/${id}`).catch(() => {});
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-tv-textMuted text-sm">Rotating ticker messages shown in the bottom bar.</p>
        <Button size="sm" onClick={openCreate}>+ New Message</Button>
      </div>
      {err && <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">{err}</div>}
      {loading ? <Spinner /> : messages.length === 0 ? (
        <Card><div className="p-10 text-center text-tv-textMuted"><p className="text-3xl mb-2">💬</p><p>No messages yet.</p></div></Card>
      ) : (
        <div className="space-y-2">
          {messages.map(m => (
            <div key={m.id} className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <StatusBadge enabled={m.enabled} />
                  {m.icon && <span className="text-lg">{m.icon}</span>}
                  <span className="font-semibold text-tv-text text-sm truncate">{m.text}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-tv-textMuted">
                  <span>Rotates every {m.rotation_seconds}s</span>
                  <span>Priority {m.priority}</span>
                  <span>Target: {m.target_type}{m.target_id ? ` #${m.target_id}` : ''}</span>
                  {m.start_at && <span>From {dt(m.start_at)}</span>}
                  {m.end_at   && <span>Until {dt(m.end_at)}</span>}
                  {m.show_qr  && <span>🔗 QR</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => del(m.id)}>Del</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Message' : 'New Message'}>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">Message Text *</label>
            <textarea className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent resize-none" rows={2} value={fText} onChange={e => setFText(e.target.value)} placeholder="🍕 Try our new pizza special today!" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Icon / Emoji</label>
              <input className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={fIcon} onChange={e => setFIcon(e.target.value)} placeholder="🍔" />
            </div>
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Priority (higher = first)</label>
              <input type="number" className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={fPriority} onChange={e => setFPriority(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">Rotation (seconds per message)</label>
            <input type="number" min={3} max={60} className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={fRotation} onChange={e => setFRotation(parseInt(e.target.value) || 8)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Show from (optional)</label>
              <input type="datetime-local" className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={fStartAt} onChange={e => setFStartAt(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Show until (optional)</label>
              <input type="datetime-local" className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={fEndAt} onChange={e => setFEndAt(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">Target</label>
            <select className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm" value={fTarget} onChange={e => setFTarget(e.target.value)}>
              {TARGET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {fTarget !== 'all' && (
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">{fTarget === 'zone' ? 'Zone ID' : 'Display ID'}</label>
              <input type="number" className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={fTargetId} onChange={e => setFTargetId(e.target.value)} />
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={fQr} onChange={e => setFQr(e.target.checked)} className="w-4 h-4 accent-tv-accent" />
            <span className="text-tv-text text-sm">Show QR code</span>
          </label>
          {fQr && (
            <input className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={fQrUrl} onChange={e => setFQrUrl(e.target.value)} placeholder="https://example.com/menu" />
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={fEnabled} onChange={e => setFEnabled(e.target.checked)} className="w-4 h-4 accent-tv-accent" />
            <span className="text-tv-text text-sm">Enabled</span>
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !fText.trim()}>{saving ? <Spinner size="sm" /> : editing ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Promo Cards tab ────────────────────────────────────────────────────────

function PromoCardsTab() {
  const [cards, setCards]       = useState([]);
  const [assets, setAssets]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);

  const [fTitle, setFTitle]       = useState('');
  const [fPrice, setFPrice]       = useState('');
  const [fSub, setFSub]           = useState('');
  const [fMediaId, setFMediaId]   = useState('');
  const [fImgUrl, setFImgUrl]     = useState('');
  const [fEnabled, setFEnabled]   = useState(true);
  const [fDispSec, setFDispSec]   = useState(12);
  const [fInterval, setFInterval] = useState(30);
  const [fStartAt, setFStartAt]   = useState('');
  const [fEndAt, setFEndAt]       = useState('');
  const [fTarget, setFTarget]     = useState('all');
  const [fTargetId, setFTargetId] = useState('');
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([api.get('/overlays/cards'), api.get('/uploads?type=image&limit=200')]);
      setCards(c.data.cards || []);
      setAssets(a.data.assets || []);
    } catch (e) { setErr(e.response?.data?.error || 'Load failed'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFTitle(''); setFPrice(''); setFSub(''); setFMediaId(''); setFImgUrl('');
    setFEnabled(true); setFDispSec(12); setFInterval(30); setFStartAt(''); setFEndAt('');
    setFTarget('all'); setFTargetId('');
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setFTitle(c.title); setFPrice(c.price_text || ''); setFSub(c.subtitle || '');
    setFMediaId(c.image_media_id || ''); setFImgUrl(c.image_url || '');
    setFEnabled(!!c.enabled); setFDispSec(c.display_seconds || 12); setFInterval(c.popup_interval_seconds || 30);
    setFStartAt(c.start_at?.slice(0,16) || ''); setFEndAt(c.end_at?.slice(0,16) || '');
    setFTarget(c.target_type || 'all'); setFTargetId(c.target_id || '');
    setShowModal(true);
  };

  const save = async () => {
    if (!fTitle.trim()) return;
    setSaving(true);
    const payload = { title: fTitle, price_text: fPrice || null, subtitle: fSub || null,
                      image_media_id: fMediaId ? parseInt(fMediaId) : null, image_url: fImgUrl || null,
                      enabled: fEnabled, display_seconds: fDispSec, popup_interval_seconds: fInterval,
                      start_at: fStartAt || null, end_at: fEndAt || null,
                      target_type: fTarget, target_id: fTargetId ? parseInt(fTargetId) : null };
    try {
      editing ? await api.put(`/overlays/cards/${editing.id}`, payload) : await api.post('/overlays/cards', payload);
      setShowModal(false); load();
    } catch (e) { setErr(e.response?.data?.error || 'Save failed'); }
    setSaving(false);
  };

  const del = async (id) => {
    if (!window.confirm('Delete this card?')) return;
    await api.delete(`/overlays/cards/${id}`).catch(() => {});
    load();
  };

  const previewImg = fMediaId ? assets.find(a => a.id == fMediaId)?.url : fImgUrl || null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-tv-textMuted text-sm">Promo cards shown as popup or in the split-right panel.</p>
        <Button size="sm" onClick={openCreate}>+ New Card</Button>
      </div>
      {err && <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">{err}</div>}
      {loading ? <Spinner /> : cards.length === 0 ? (
        <Card><div className="p-10 text-center text-tv-textMuted"><p className="text-3xl mb-2">🍽️</p><p>No promo cards yet.</p></div></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map(c => {
            const img = c.image_url || c.asset_url || null;
            return (
              <div key={c.id} className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl overflow-hidden">
                {img && <div className="aspect-video bg-black overflow-hidden"><img src={img} alt={c.title} className="w-full h-full object-cover" /></div>}
                <div className="p-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-tv-text text-sm">{c.title}</p>
                      {c.price_text && <p className="text-yellow-400 font-bold text-sm">{c.price_text}</p>}
                      {c.subtitle   && <p className="text-tv-textMuted text-xs mt-0.5 line-clamp-2">{c.subtitle}</p>}
                    </div>
                    <StatusBadge enabled={c.enabled} />
                  </div>
                  <div className="text-xs text-tv-textMuted mb-2">
                    Shows {c.display_seconds}s every {c.popup_interval_seconds}s · {c.target_type}{c.target_id ? ` #${c.target_id}` : ''}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)} className="flex-1">Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => del(c.id)}>Del</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Promo Card' : 'New Promo Card'}>
        <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
          <Input label="Title *" value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Grilled Salmon" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price" value={fPrice} onChange={e => setFPrice(e.target.value)} placeholder="MVR 185" />
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Visible seconds</label>
              <input type="number" min={5} max={60} className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={fDispSec} onChange={e => setFDispSec(parseInt(e.target.value) || 12)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">Subtitle / Description</label>
            <textarea rows={2} className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none resize-none" value={fSub} onChange={e => setFSub(e.target.value)} placeholder="With lemon butter sauce and seasonal veggies" />
          </div>

          {/* Image selection */}
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">Image (from media library)</label>
            <select className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm" value={fMediaId} onChange={e => { setFMediaId(e.target.value); setFImgUrl(''); }}>
              <option value="">None</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.original_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">OR external image URL</label>
            <input className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={fImgUrl} onChange={e => { setFImgUrl(e.target.value); setFMediaId(''); }} placeholder="https://..." />
          </div>
          {previewImg && <img src={previewImg} alt="preview" className="rounded-lg w-full aspect-video object-cover" />}

          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">Popup every N seconds</label>
            <input type="number" min={10} className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={fInterval} onChange={e => setFInterval(parseInt(e.target.value) || 30)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Show from</label>
              <input type="datetime-local" className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={fStartAt} onChange={e => setFStartAt(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-tv-textMuted mb-1">Show until</label>
              <input type="datetime-local" className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" value={fEndAt} onChange={e => setFEndAt(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-tv-textMuted mb-1">Target</label>
            <select className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm" value={fTarget} onChange={e => setFTarget(e.target.value)}>
              {TARGET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {fTarget !== 'all' && (
            <input type="number" className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none" placeholder={fTarget === 'zone' ? 'Zone ID' : 'Display ID'} value={fTargetId} onChange={e => setFTargetId(e.target.value)} />
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={fEnabled} onChange={e => setFEnabled(e.target.checked)} className="w-4 h-4 accent-tv-accent" />
            <span className="text-tv-text text-sm">Enabled</span>
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !fTitle.trim()}>{saving ? <Spinner size="sm" /> : editing ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function OverlayManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('messages');

  useEffect(() => {
    if (user?.role !== 'admin') navigate('/admin/dashboard');
  }, [user, navigate]);

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
              <h1 className="text-xl font-bold text-white">Smart Overlays</h1>
              <p className="text-xs text-white/70 hidden sm:block">Ticker messages and promo cards for your TV displays</p>
            </div>
          </div>
          {/* Overlay mode tip */}
          <span className="hidden md:block text-xs text-white/50 bg-white/10 px-3 py-1.5 rounded-full">
            Set overlay mode per display in Display Settings
          </span>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {[['messages', '💬 Messages'], ['cards', '🍽️ Promo Cards']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === v ? 'bg-white text-tv-accent' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full pb-24">
        {tab === 'messages' && <MessagesTab />}
        {tab === 'cards'    && <PromoCardsTab />}
      </div>

      <Footer />
    </div>
  );
}
