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

// ── helpers ──────────────────────────────────────────────────────────────────

function StatusDot({ status }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}
      title={status}
    />
  );
}

function LastSeen({ ts }) {
  if (!ts) return <span className="text-gray-500 text-xs">Never</span>;
  const sec = Math.round((Date.now() - new Date(ts)) / 1000);
  if (sec < 60) return <span className="text-green-400 text-xs">{sec}s ago</span>;
  if (sec < 3600) return <span className="text-yellow-400 text-xs">{Math.round(sec / 60)}m ago</span>;
  return <span className="text-gray-500 text-xs">{Math.round(sec / 3600)}h ago</span>;
}

// ── main ─────────────────────────────────────────────────────────────────────

export default function ZoneManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [zones, setZones]             = useState([]);
  const [playlists, setPlaylists]     = useState([]);
  const [overrides, setOverrides]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeZone, setActiveZone]   = useState(null); // zone whose displays are shown
  const [zoneDisplays, setZoneDisplays] = useState([]);
  const [loadingDisplays, setLoadingDisplays] = useState(false);

  // Zone CRUD
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZone, setEditingZone]     = useState(null);
  const [zoneName, setZoneName]           = useState('');
  const [zoneDesc, setZoneDesc]           = useState('');
  const [savingZone, setSavingZone]       = useState(false);

  // Override
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideTarget, setOverrideTarget]       = useState({ zone_id: null, display_id: null });
  const [overridePlaylist, setOverridePlaylist]   = useState('');
  const [overrideMsg, setOverrideMsg]             = useState('');
  const [overrideDur, setOverrideDur]             = useState(60);
  const [savingOverride, setSavingOverride]       = useState(false);

  // Assign display to zone
  const [showAssignModal, setShowAssignModal]     = useState(false);
  const [assignZone, setAssignZone]               = useState(null);
  const [allDisplays, setAllDisplays]             = useState([]);
  const [assigningId, setAssigningId]             = useState(null);

  const [err, setErr] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/dashboard'); return; }
    fetchAll();
    const timer = setInterval(fetchAll, 15_000);
    return () => clearInterval(timer);
  }, [user, navigate]);

  const fetchAll = useCallback(async () => {
    try {
      const [zRes, pRes, oRes] = await Promise.all([
        api.get('/zones'),
        api.get('/playlists'),
        api.get('/zones/overrides/active').catch(() => ({ data: { overrides: [] } }))
      ]);
      setZones(zRes.data.zones || []);
      setPlaylists(pRes.data.playlists || []);
      setOverrides(oRes.data.overrides || []);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const openZoneDisplays = async (zone) => {
    setActiveZone(zone);
    setLoadingDisplays(true);
    try {
      const res = await api.get(`/zones/${zone.id}/displays`);
      setZoneDisplays(res.data.displays || []);
    } catch { setZoneDisplays([]); }
    setLoadingDisplays(false);
  };

  // ── Zone CRUD ────────────────────────────────────────────────────────────

  const openCreateZone = () => { setEditingZone(null); setZoneName(''); setZoneDesc(''); setShowZoneModal(true); };
  const openEditZone   = (z)  => { setEditingZone(z); setZoneName(z.name); setZoneDesc(z.description || ''); setShowZoneModal(true); };

  const saveZone = async () => {
    if (!zoneName.trim()) return;
    setSavingZone(true);
    try {
      if (editingZone) {
        await api.put(`/zones/${editingZone.id}`, { name: zoneName, description: zoneDesc });
      } else {
        await api.post('/zones', { name: zoneName, description: zoneDesc });
      }
      setShowZoneModal(false);
      fetchAll();
    } catch (e) { setErr(e.response?.data?.error || 'Save failed'); }
    setSavingZone(false);
  };

  const deleteZone = async (id) => {
    if (!window.confirm('Delete this zone? Displays will be unassigned.')) return;
    await api.delete(`/zones/${id}`).catch(() => {});
    fetchAll();
  };

  // ── Push command ──────────────────────────────────────────────────────────

  const pushRefresh = async (zoneId) => {
    await api.post(`/zones/${zoneId}/command`, { action: 'refresh_playlist' }).catch(() => {});
    alert('Refresh command sent to all TVs in zone');
  };

  // ── Override ──────────────────────────────────────────────────────────────

  const openOverride = (zoneId, displayId) => {
    setOverrideTarget({ zone_id: zoneId || null, display_id: displayId || null });
    setOverridePlaylist('');
    setOverrideMsg('');
    setOverrideDur(60);
    setShowOverrideModal(true);
  };

  const saveOverride = async () => {
    if (!overridePlaylist) return;
    setSavingOverride(true);
    try {
      await api.post('/zones/override', {
        ...overrideTarget,
        playlist_id: parseInt(overridePlaylist),
        override_message: overrideMsg || undefined,
        duration_minutes: overrideDur
      });
      setShowOverrideModal(false);
      fetchAll();
    } catch (e) { setErr(e.response?.data?.error || 'Override failed'); }
    setSavingOverride(false);
  };

  const cancelOverride = async (id) => {
    await api.delete(`/zones/override/${id}`).catch(() => {});
    fetchAll();
  };

  // ── Assign display to zone ────────────────────────────────────────────────

  const openAssign = async (zone) => {
    setAssignZone(zone);
    try { const r = await api.get('/displays'); setAllDisplays(r.data.displays || []); } catch { setAllDisplays([]); }
    setShowAssignModal(true);
  };

  const assignDisplay = async (displayId, zoneId) => {
    setAssigningId(displayId);
    try {
      await api.put(`/displays/${displayId}`, { zone_id: zoneId || null });
      const r = await api.get('/displays'); setAllDisplays(r.data.displays || []);
      fetchAll();
    } catch (e) { setErr(e.response?.data?.error || 'Assign failed'); }
    setAssigningId(null);
  };

  // ── Enable pairing window ─────────────────────────────────────────────────

  const enablePairing = async (displayId) => {
    try {
      const res = await api.post(`/displays/${displayId}/enable-pairing`, { minutes: 10 });
      alert(`Pairing window open for 10 minutes (until ${new Date(res.data.pairing_enabled_until).toLocaleTimeString()})`);
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <div className="h-screen flex items-center justify-center bg-tv-bg"><Spinner size="xl" /></div>;

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
              <h1 className="text-xl font-bold text-white">Zones &amp; Overrides</h1>
              <p className="text-xs text-white/70 hidden sm:block">Group displays and push emergency content</p>
            </div>
          </div>
          <Button onClick={openCreateZone} variant="secondary" size="sm">+ New Zone</Button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full pb-24">

        {err && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
            {err} <button onClick={() => setErr('')} className="ml-2 underline">dismiss</button>
          </div>
        )}

        {/* ── Active overrides ── */}
        {overrides.length > 0 && (
          <Card>
            <div className="p-4 border-b border-tv-borderSubtle">
              <h2 className="font-bold text-tv-text flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Active Emergency Overrides ({overrides.length})
              </h2>
            </div>
            <div className="divide-y divide-tv-borderSubtle">
              {overrides.map(o => (
                <div key={o.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-tv-text text-sm font-medium">{o.override_message}</p>
                    <p className="text-tv-textMuted text-xs">
                      {o.zone_name ? `Zone: ${o.zone_name}` : `Display: ${o.display_name}`}
                      {' · '}Playlist: {o.playlist_name}
                      {' · '}Expires: {new Date(o.expires_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <button onClick={() => cancelOverride(o.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold whitespace-nowrap">
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Zones list ── */}
        {zones.length === 0 ? (
          <Card>
            <div className="p-10 text-center text-tv-textMuted">
              <p className="text-2xl mb-2">📺</p>
              <p className="font-medium">No zones yet</p>
              <p className="text-sm mt-1">Create a zone to group your displays and manage them together.</p>
              <Button onClick={openCreateZone} className="mt-4">Create First Zone</Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {zones.map(zone => (
              <Card key={zone.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-tv-text">{zone.name}</h3>
                      {zone.description && <p className="text-tv-textMuted text-sm mt-0.5">{zone.description}</p>}
                      <p className="text-tv-textMuted text-xs mt-1">{zone.display_count} display{zone.display_count !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => openEditZone(zone)} className="text-tv-textMuted hover:text-tv-accent text-xs">Edit</button>
                      <button onClick={() => deleteZone(zone.id)} className="text-tv-textMuted hover:text-red-400 text-xs">Delete</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openZoneDisplays(zone)}>
                      View Displays
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openAssign(zone)}>
                      ➕ Assign Display
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => pushRefresh(zone.id)}>
                      🔄 Refresh All
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => openOverride(zone.id, null)}>
                      🚨 Emergency Override
                    </Button>
                  </div>

                  {/* Zone displays (expanded) */}
                  {activeZone?.id === zone.id && (
                    <div className="mt-4 border-t border-tv-borderSubtle pt-4">
                      {loadingDisplays ? (
                        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
                      ) : zoneDisplays.length === 0 ? (
                        <p className="text-tv-textMuted text-sm text-center py-2">No displays in this zone</p>
                      ) : (
                        <div className="space-y-2">
                          {zoneDisplays.map(d => (
                            <div key={d.id} className="flex items-center justify-between bg-tv-bgSoft rounded-lg px-3 py-2 gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <StatusDot status={d.status} />
                                <div className="min-w-0">
                                  <p className="text-tv-text text-sm font-medium truncate">{d.name}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-tv-textMuted text-xs">{d.location || 'No location'}</span>
                                    <span className="text-tv-borderSubtle text-xs">·</span>
                                    <LastSeen ts={d.last_heartbeat} />
                                    {d.now_playing && <span className="text-tv-textMuted text-xs truncate">▶ {d.now_playing}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => enablePairing(d.id)}
                                  className="text-xs text-tv-accent hover:text-tv-accentHover px-2 py-1 rounded border border-tv-accent/30 hover:border-tv-accent"
                                >
                                  Pair
                                </button>
                                <button
                                  onClick={() => openOverride(null, d.id)}
                                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-500/30 hover:border-red-500"
                                >
                                  Override
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />

      {/* ── Zone modal ── */}
      <Modal isOpen={showZoneModal} onClose={() => setShowZoneModal(false)} title={editingZone ? 'Edit Zone' : 'Create Zone'}>
        <div className="space-y-4">
          <Input
            label="Zone Name"
            value={zoneName}
            onChange={e => setZoneName(e.target.value)}
            placeholder="e.g. Ground Floor, Main Dining"
          />
          <div>
            <label className="block text-sm font-medium text-tv-textMuted mb-1">Description (optional)</label>
            <textarea
              className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent resize-none"
              rows={2}
              value={zoneDesc}
              onChange={e => setZoneDesc(e.target.value)}
              placeholder="Brief description…"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowZoneModal(false)}>Cancel</Button>
            <Button onClick={saveZone} disabled={savingZone || !zoneName.trim()}>
              {savingZone ? <Spinner size="sm" /> : editingZone ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Assign Display modal ── */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title={`Assign Displays — ${assignZone?.name}`}>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <p className="text-tv-textMuted text-sm">Click a display to move it into or out of this zone.</p>
          {allDisplays.length === 0 && <p className="text-tv-textMuted text-sm text-center py-4">No displays found</p>}
          {allDisplays.map(d => {
            const inZone = d.zone_id === assignZone?.id;
            return (
              <div key={d.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${inZone ? 'border-tv-accent/50 bg-tv-accent/10' : 'border-tv-borderSubtle bg-tv-bgSoft'}`}>
                <div>
                  <p className="text-tv-text text-sm font-medium">{d.name}</p>
                  <p className="text-tv-textMuted text-xs">{d.location || 'No location'} {d.zone_id && !inZone ? `· In another zone` : ''}</p>
                </div>
                <button
                  onClick={() => assignDisplay(d.id, inZone ? null : assignZone?.id)}
                  disabled={assigningId === d.id}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${inZone ? 'border-red-500/40 text-red-400 hover:bg-red-500/10' : 'border-tv-accent/40 text-tv-accent hover:bg-tv-accent/10'} disabled:opacity-50`}
                >
                  {assigningId === d.id ? '…' : inZone ? 'Remove' : 'Add to Zone'}
                </button>
              </div>
            );
          })}
          <div className="pt-2 border-t border-tv-borderSubtle flex justify-end">
            <Button variant="ghost" onClick={() => setShowAssignModal(false)}>Done</Button>
          </div>
        </div>
      </Modal>

      {/* ── Override modal ── */}
      <Modal isOpen={showOverrideModal} onClose={() => setShowOverrideModal(false)} title="🚨 Emergency Override">
        <div className="space-y-4">
          <p className="text-tv-textMuted text-sm">
            Immediately push content to {overrideTarget.zone_id ? 'all displays in this zone' : 'this display'}.
            Reverts automatically after the duration.
          </p>
          <div>
            <label className="block text-sm font-medium text-tv-textMuted mb-1">Playlist *</label>
            <select
              className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent"
              value={overridePlaylist}
              onChange={e => setOverridePlaylist(e.target.value)}
            >
              <option value="">Select playlist…</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <Input
            label="Message (shown on TV)"
            value={overrideMsg}
            onChange={e => setOverrideMsg(e.target.value)}
            placeholder="Emergency override active"
          />
          <div>
            <label className="block text-sm font-medium text-tv-textMuted mb-1">Duration (minutes)</label>
            <input
              type="number"
              min={1} max={1440}
              className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent"
              value={overrideDur}
              onChange={e => setOverrideDur(parseInt(e.target.value) || 60)}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowOverrideModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={saveOverride} disabled={savingOverride || !overridePlaylist}>
              {savingOverride ? <Spinner size="sm" /> : 'Activate Override'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
