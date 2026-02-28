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

function DurationBadge({ seconds }) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return <span className="text-xs text-tv-textMuted">{m > 0 ? `${m}m ${s}s` : `${s}s`}</span>;
}

function ItemRow({ item, onUp, onDown, onRemove, onEdit, isFirst, isLast }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-tv-bgSoft rounded-lg border border-tv-borderSubtle">
      {/* Thumbnail */}
      <div className="w-16 h-10 bg-black rounded overflow-hidden flex-shrink-0">
        {item.type === 'video' ? (
          <video src={item.url} className="w-full h-full object-cover" muted preload="metadata" />
        ) : (
          <img src={item.thumbnail_url || item.url} alt={item.original_name} className="w-full h-full object-cover" />
        )}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-tv-text text-sm font-medium truncate">{item.original_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${item.type === 'video' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
            {item.type}
          </span>
          {item.type === 'image' && <span className="text-xs text-tv-textMuted">{item.image_duration_seconds}s</span>}
          {item.type === 'video' && <DurationBadge seconds={item.duration_seconds} />}
        </div>
      </div>
      {/* Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onEdit(item)} className="text-tv-textMuted hover:text-tv-accent p-1 rounded" title="Settings">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </button>
        <button onClick={onUp} disabled={isFirst} className="text-tv-textMuted hover:text-tv-accent p-1 rounded disabled:opacity-30">↑</button>
        <button onClick={onDown} disabled={isLast} className="text-tv-textMuted hover:text-tv-accent p-1 rounded disabled:opacity-30">↓</button>
        <button onClick={() => onRemove(item.id)} className="text-tv-textMuted hover:text-red-400 p-1 rounded" title="Remove">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function MediaPlaylistManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [playlists, setPlaylists]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [items, setItems]             = useState([]);
  const [assets, setAssets]           = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Playlist CRUD modal
  const [showPlModal, setShowPlModal] = useState(false);
  const [editPl, setEditPl]           = useState(null);
  const [plName, setPlName]           = useState('');
  const [plDesc, setPlDesc]           = useState('');
  const [plShuffle, setPlShuffle]     = useState(false);
  const [savingPl, setSavingPl]       = useState(false);

  // Add media modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [imgDur, setImgDur]           = useState(8);
  const [playFull, setPlayFull]       = useState(true);
  const [addingItem, setAddingItem]   = useState(false);

  // Item settings modal
  const [editItem, setEditItem]       = useState(null);
  const [editDur, setEditDur]         = useState(8);
  const [editFull, setEditFull]       = useState(true);

  // Preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewIdx, setPreviewIdx]   = useState(0);

  const [err, setErr] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/admin/dashboard'); return; }
    fetchPlaylists();
    fetchAssets();
  }, [user, navigate]);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/media-playlists');
      setPlaylists(data.playlists || []);
    } catch (e) { setErr(e.response?.data?.error || 'Load failed'); }
    setLoading(false);
  };

  const fetchAssets = async () => {
    try {
      const { data } = await api.get('/uploads?limit=200');
      setAssets(data.assets || []);
    } catch { /* ignore */ }
  };

  const openPlaylist = async (pl) => {
    setActivePlaylist(pl);
    setLoadingItems(true);
    try {
      const { data } = await api.get(`/media-playlists/${pl.id}/items`);
      setItems(data.items || []);
    } catch { setItems([]); }
    setLoadingItems(false);
  };

  // ── Playlist CRUD ─────────────────────────────────────────────────────────

  const openCreate = () => { setEditPl(null); setPlName(''); setPlDesc(''); setPlShuffle(false); setShowPlModal(true); };
  const openEdit   = (pl) => { setEditPl(pl); setPlName(pl.name); setPlDesc(pl.description || ''); setPlShuffle(!!pl.shuffle); setShowPlModal(true); };

  const savePl = async () => {
    if (!plName.trim()) return;
    setSavingPl(true);
    try {
      if (editPl) {
        await api.put(`/media-playlists/${editPl.id}`, { name: plName, description: plDesc, shuffle: plShuffle });
        if (activePlaylist?.id === editPl.id) setActivePlaylist(p => ({ ...p, name: plName }));
      } else {
        await api.post('/media-playlists', { name: plName, description: plDesc, shuffle: plShuffle });
      }
      setShowPlModal(false);
      fetchPlaylists();
    } catch (e) { setErr(e.response?.data?.error || 'Save failed'); }
    setSavingPl(false);
  };

  const deletePl = async (id) => {
    if (!window.confirm('Delete this playlist? Items will be removed.')) return;
    await api.delete(`/media-playlists/${id}`).catch(() => {});
    if (activePlaylist?.id === id) { setActivePlaylist(null); setItems([]); }
    fetchPlaylists();
  };

  // ── Items ──────────────────────────────────────────────────────────────────

  const addItem = async () => {
    if (!selectedAsset || !activePlaylist) return;
    setAddingItem(true);
    try {
      await api.post(`/media-playlists/${activePlaylist.id}/items`, {
        media_id: parseInt(selectedAsset),
        image_duration_seconds: imgDur,
        play_video_full: playFull
      });
      setShowAddModal(false);
      openPlaylist(activePlaylist);
      fetchPlaylists(); // refresh item_count
    } catch (e) { setErr(e.response?.data?.error || 'Add failed'); }
    setAddingItem(false);
  };

  const removeItem = async (itemId) => {
    await api.delete(`/media-playlists/${activePlaylist.id}/items/${itemId}`).catch(() => {});
    setItems(its => its.filter(i => i.id !== itemId));
  };

  const moveItem = async (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const order = next.map((it, i) => ({ id: it.id, sort_order: i }));
    setItems(next.map((it, i) => ({ ...it, sort_order: i })));
    await api.post(`/media-playlists/${activePlaylist.id}/items/reorder`, { order }).catch(() => {});
  };

  const saveItemEdit = async () => {
    await api.put(`/media-playlists/${activePlaylist.id}/items/${editItem.id}`, {
      image_duration_seconds: editDur,
      play_video_full: editFull
    }).catch(() => {});
    setItems(its => its.map(i => i.id === editItem.id ? { ...i, image_duration_seconds: editDur, play_video_full: editFull ? 1 : 0 } : i));
    setEditItem(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
              <h1 className="text-xl font-bold text-white">Media Playlists</h1>
              <p className="text-xs text-white/70 hidden sm:block">Slideshow playlists for café displays</p>
            </div>
          </div>
          <Button onClick={openCreate} variant="secondary" size="sm">+ New Playlist</Button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full pb-24">
        {err && <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">{err} <button onClick={() => setErr('')} className="underline ml-2">dismiss</button></div>}

        <div className="grid md:grid-cols-5 gap-6">
          {/* Left: playlist list */}
          <div className="md:col-span-2 space-y-2">
            {playlists.length === 0 ? (
              <Card>
                <div className="p-8 text-center text-tv-textMuted">
                  <p className="text-2xl mb-2">🎞️</p>
                  <p className="font-medium">No playlists yet</p>
                  <Button onClick={openCreate} className="mt-4" size="sm">Create First</Button>
                </div>
              </Card>
            ) : playlists.map(pl => (
              <div
                key={pl.id}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${activePlaylist?.id === pl.id ? 'border-tv-accent bg-tv-accent/10' : 'border-tv-borderSubtle bg-tv-bgSoft hover:border-tv-accent/40'}`}
                onClick={() => openPlaylist(pl)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-tv-text text-sm truncate">{pl.name}</p>
                    <p className="text-tv-textMuted text-xs mt-0.5">{pl.item_count} item{pl.item_count !== 1 ? 's' : ''}{pl.shuffle ? ' · shuffle' : ''}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); openEdit(pl); }} className="text-tv-textMuted hover:text-tv-accent p-1">✏️</button>
                    <button onClick={e => { e.stopPropagation(); deletePl(pl.id); }} className="text-tv-textMuted hover:text-red-400 p-1">🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: items */}
          <div className="md:col-span-3">
            {!activePlaylist ? (
              <Card>
                <div className="p-10 text-center text-tv-textMuted">
                  <p className="text-3xl mb-2">👈</p>
                  <p>Select a playlist to manage its items</p>
                </div>
              </Card>
            ) : (
              <Card>
                <div className="p-4 border-b border-tv-borderSubtle flex items-center justify-between gap-2">
                  <h2 className="font-bold text-tv-text">{activePlaylist.name}</h2>
                  <div className="flex gap-2">
                    {items.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => { setPreviewIdx(0); setShowPreview(true); }}>👁 Preview</Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => setShowAddModal(true)}>+ Add Media</Button>
                  </div>
                </div>
                <div className="p-4">
                  {loadingItems ? (
                    <div className="flex justify-center py-8"><Spinner /></div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-8 text-tv-textMuted">
                      <p className="text-2xl mb-2">📭</p>
                      <p>No items yet. Click "Add Media" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item, i) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          isFirst={i === 0}
                          isLast={i === items.length - 1}
                          onUp={() => moveItem(i, i - 1)}
                          onDown={() => moveItem(i, i + 1)}
                          onRemove={removeItem}
                          onEdit={it => { setEditItem(it); setEditDur(it.image_duration_seconds || 8); setEditFull(!!it.play_video_full); }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Create/edit playlist modal */}
      <Modal isOpen={showPlModal} onClose={() => setShowPlModal(false)} title={editPl ? 'Edit Playlist' : 'New Playlist'}>
        <div className="space-y-4">
          <Input label="Name *" value={plName} onChange={e => setPlName(e.target.value)} placeholder="e.g. Lunch Specials" />
          <div>
            <label className="block text-sm font-medium text-tv-textMuted mb-1">Description</label>
            <textarea className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent resize-none" rows={2} value={plDesc} onChange={e => setPlDesc(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={plShuffle} onChange={e => setPlShuffle(e.target.checked)} className="w-4 h-4 accent-tv-accent" />
            <span className="text-tv-text text-sm">Shuffle items</span>
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowPlModal(false)}>Cancel</Button>
            <Button onClick={savePl} disabled={savingPl || !plName.trim()}>
              {savingPl ? <Spinner size="sm" /> : editPl ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add media modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Media to Playlist">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-tv-textMuted mb-1">Select Media *</label>
            <select
              className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent"
              value={selectedAsset}
              onChange={e => setSelectedAsset(e.target.value)}
            >
              <option value="">Choose from library…</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>[{a.type.toUpperCase()}] {a.original_name}</option>
              ))}
            </select>
            {assets.length === 0 && <p className="text-xs text-tv-textMuted mt-1">No media in library. <button onClick={() => navigate('/admin/media')} className="text-tv-accent underline">Upload some first.</button></p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-tv-textMuted mb-1">Image display duration (seconds)</label>
            <input type="number" min={1} max={300} className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent" value={imgDur} onChange={e => setImgDur(parseInt(e.target.value) || 8)} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={playFull} onChange={e => setPlayFull(e.target.checked)} className="w-4 h-4 accent-tv-accent" />
            <span className="text-tv-text text-sm">Play video to completion</span>
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={addItem} disabled={addingItem || !selectedAsset}>
              {addingItem ? <Spinner size="sm" /> : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit item settings modal */}
      {editItem && (
        <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title={`Settings — ${editItem.original_name}`}>
          <div className="space-y-4">
            {editItem.type === 'image' && (
              <div>
                <label className="block text-sm font-medium text-tv-textMuted mb-1">Display duration (seconds)</label>
                <input type="number" min={1} max={300} className="w-full rounded-lg border border-tv-borderSubtle bg-tv-bgSoft text-tv-text px-3 py-2 text-sm focus:outline-none focus:border-tv-accent" value={editDur} onChange={e => setEditDur(parseInt(e.target.value) || 8)} />
              </div>
            )}
            {editItem.type === 'video' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editFull} onChange={e => setEditFull(e.target.checked)} className="w-4 h-4 accent-tv-accent" />
                <span className="text-tv-text text-sm">Play video to completion</span>
              </label>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={saveItemEdit}>Save</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Preview modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title={`Preview — ${activePlaylist?.name}`} size="lg">
        {items.length > 0 && (
          <div className="space-y-4">
            {/* Current item display */}
            <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {items[previewIdx]?.type === 'video' ? (
                <video key={items[previewIdx]?.url} src={items[previewIdx]?.url} autoPlay muted controls className="w-full h-full object-contain" />
              ) : (
                <img key={items[previewIdx]?.url} src={items[previewIdx]?.url} alt={items[previewIdx]?.original_name} className="w-full h-full object-contain" />
              )}
              {/* Overlay info */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">{items[previewIdx]?.original_name}</span>
                <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">{previewIdx + 1} / {items.length}</span>
              </div>
            </div>
            {/* Nav */}
            <div className="flex items-center justify-between">
              <button onClick={() => setPreviewIdx(i => Math.max(0, i - 1))} disabled={previewIdx === 0}
                className="px-4 py-2 rounded-lg border border-tv-borderSubtle text-tv-text hover:border-tv-accent/50 disabled:opacity-30 text-sm">← Prev</button>
              {/* Thumbnail strip */}
              <div className="flex gap-1 overflow-x-auto max-w-xs">
                {items.map((it, i) => (
                  <button key={it.id} onClick={() => setPreviewIdx(i)}
                    className={`w-12 h-8 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${i === previewIdx ? 'border-tv-accent' : 'border-transparent'}`}>
                    {it.type === 'video'
                      ? <video src={it.url} className="w-full h-full object-cover" muted />
                      : <img src={it.thumbnail_url || it.url} alt={it.original_name} className="w-full h-full object-cover" />
                    }
                  </button>
                ))}
              </div>
              <button onClick={() => setPreviewIdx(i => Math.min(items.length - 1, i + 1))} disabled={previewIdx === items.length - 1}
                className="px-4 py-2 rounded-lg border border-tv-borderSubtle text-tv-text hover:border-tv-accent/50 disabled:opacity-30 text-sm">Next →</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
