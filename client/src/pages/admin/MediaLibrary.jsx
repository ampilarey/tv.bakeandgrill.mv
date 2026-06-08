import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Spinner from '../../components/common/Spinner';
import AdminTopBar from '../../components/AdminTopBar';
import Footer from '../../components/Footer';

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,video/mp4';

function formatBytes(n) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function AssetCard({ asset, onDelete, onPreview, onEditMeta }) {
  const isVideo = asset.type === 'video';
  return (
    <div className="relative group bg-tv-bgSoft rounded-xl overflow-hidden border border-tv-borderSubtle hover:border-tv-accent/40 transition-all">
      <button
        type="button"
        className="w-full aspect-video bg-black flex items-center justify-center overflow-hidden"
        onClick={() => onPreview(asset)}
      >
        {isVideo ? (
          <video src={asset.url} className="w-full h-full object-contain" muted preload="metadata" />
        ) : (
          <img
            src={asset.thumbnail_url || asset.url}
            alt={asset.original_name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        )}
        {isVideo && (
          <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            VIDEO
          </span>
        )}
      </button>
      <div className="p-3">
        <p className="text-tv-text text-sm font-medium truncate" title={asset.original_name}>
          {asset.original_name}
        </p>
        <p className="text-tv-textMuted text-xs mt-0.5">
          {formatBytes(asset.size_bytes)}
          {asset.usage_count > 0 && (
            <span className="ml-2 text-tv-accent">· {asset.usage_count} playlist{asset.usage_count !== 1 ? 's' : ''}</span>
          )}
        </p>
        {(asset.category || asset.tags) && (
          <p className="text-tv-textMuted text-xs mt-0.5 truncate">
            {[asset.category, asset.tags].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEditMeta(asset)}
          className="bg-tv-bgSoft/90 hover:bg-tv-accent/80 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
          title="Edit metadata"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={() => onDelete(asset)}
          className="bg-red-600/90 hover:bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
          title="Delete"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function MediaLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [sort, setSort] = useState('created_at');
  const [err, setErr] = useState('');
  const [confirmAsset, setConfirmAsset] = useState(null);
  const [usageInfo, setUsageInfo] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [editAsset, setEditAsset] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState('');
  const [config, setConfig] = useState({ maxImageMb: 20, maxVideoMb: 200, maxStorageMb: 2048 });
  const [stats, setStats] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fileRef = useRef(null);

  const fetchConfig = useCallback(async () => {
    try {
      const { data } = await api.get('/uploads/config');
      setConfig(data);
    } catch { /* defaults */ }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/uploads/stats');
      setStats(data);
    } catch { /* ignore */ }
  }, []);

  const fetchAssets = useCallback(async (p = page, opts = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 40, sort });
      const f = opts.filter ?? filter;
      const s = opts.search ?? search;
      const u = opts.unusedOnly ?? unusedOnly;
      if (f) params.set('type', f);
      if (s) params.set('search', s);
      if (u) params.set('unused', '1');
      const { data } = await api.get(`/uploads?${params}`);
      setAssets(data.assets || []);
      setTotal(data.total || 0);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load');
    }
    setLoading(false);
  }, [page, filter, search, unusedOnly, sort]);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/admin/dashboard'); return; }
    fetchConfig();
    fetchStats();
  }, [user, navigate, fetchConfig, fetchStats]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    fetchAssets(page);
  }, [user, page, filter, search, unusedOnly, sort, fetchAssets]);

  const handleUpload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setUploadPct(0);
    setErr('');
    let done = 0;
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        await api.post('/uploads', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => setUploadPct(Math.round((done / files.length + e.loaded / e.total / files.length) * 100)),
        });
        done += 1;
      } catch (e) {
        setErr(`Upload failed for ${file.name}: ${e.response?.data?.error || e.message}`);
      }
    }
    setUploading(false);
    setPage(1);
    if (fileRef.current) fileRef.current.value = '';
    fetchAssets(1);
    fetchStats();
  };

  const openDeleteConfirm = async (asset) => {
    setConfirmAsset(asset);
    setUsageInfo(null);
    setUsageLoading(true);
    try {
      const { data } = await api.get(`/uploads/${asset.id}/usage`);
      setUsageInfo(data);
    } catch {
      setUsageInfo({ playlists: [], promoCards: [] });
    }
    setUsageLoading(false);
  };

  const handleDelete = async (asset, force = false) => {
    try {
      const url = force ? `/uploads/${asset.id}?confirm=true` : `/uploads/${asset.id}`;
      await api.delete(url);
      setConfirmAsset(null);
      setUsageInfo(null);
      fetchAssets(page);
      fetchStats();
    } catch (e) {
      if (e.response?.status === 409) {
        setUsageInfo(e.response.data.usage);
      } else {
        setErr(e.response?.data?.error || 'Delete failed');
      }
    }
  };

  const handleBulkDeleteUnused = async () => {
    if (!window.confirm('Delete all unused media files? This cannot be undone.')) return;
    setBulkDeleting(true);
    try {
      const { data } = await api.post('/uploads/bulk-delete-unused');
      setErr('');
      alert(`Deleted ${data.deleted} unused file(s).`);
      setPage(1);
      fetchAssets(1);
      fetchStats();
    } catch (e) {
      setErr(e.response?.data?.error || 'Bulk delete failed');
    }
    setBulkDeleting(false);
  };

  const saveMeta = async () => {
    if (!editAsset) return;
    try {
      await api.put(`/uploads/${editAsset.id}`, { category: editCategory, tags: editTags });
      setEditAsset(null);
      fetchAssets(page);
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleUpload(Array.from(e.dataTransfer.files));
  };

  const totalPages = Math.ceil(total / 40);

  return (
    <div className="min-h-screen bg-tv-bg flex flex-col">
      <AdminTopBar title="Media Library" subtitle="Upload images and videos for displays">
        <input
          type="search"
          placeholder="Search…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
          className="text-sm bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5 focus:outline-none w-36"
        />
        <select
          className="text-sm bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5 focus:outline-none"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
        >
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
        </select>
        <select
          className="text-sm bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5 focus:outline-none"
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
        >
          <option value="created_at">Newest</option>
          <option value="original_name">Name</option>
          <option value="size_bytes">Size</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-white/80">
          <input
            type="checkbox"
            checked={unusedOnly}
            onChange={(e) => { setUnusedOnly(e.target.checked); setPage(1); }}
            className="accent-tv-accent"
          />
          Unused
        </label>
        <Button onClick={() => fileRef.current?.click()} size="sm" variant="secondary" disabled={uploading}>
          {uploading ? `Uploading ${uploadPct}%…` : '+ Upload'}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => handleUpload(Array.from(e.target.files))}
        />
      </AdminTopBar>

      <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full pb-24">
        {err && (
          <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm flex justify-between">
            {err}
            <button type="button" onClick={() => setErr('')} className="underline ml-2">dismiss</button>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="p-4">
              <p className="text-tv-textMuted text-xs">Files</p>
              <p className="text-xl font-bold text-tv-text">{stats.totalFiles}</p>
            </Card>
            <Card className="p-4">
              <p className="text-tv-textMuted text-xs">Storage</p>
              <p className="text-xl font-bold text-tv-text">
                {stats.storageUsedMb} / {stats.storageMaxMb} MB
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-tv-textMuted text-xs">Unused</p>
              <p className="text-xl font-bold text-tv-text">{stats.unusedCount}</p>
            </Card>
            <Card className="p-4 flex flex-col justify-between">
              <p className="text-tv-textMuted text-xs">Broken playlist refs</p>
              <p className="text-xl font-bold text-tv-text">{stats.brokenPlaylistItems}</p>
              {stats.unusedCount > 0 && (
                <Button size="sm" variant="ghost" className="mt-2" disabled={bulkDeleting} onClick={handleBulkDeleteUnused}>
                  {bulkDeleting ? 'Deleting…' : 'Delete unused'}
                </Button>
              )}
            </Card>
          </div>
        )}

        <div
          className="mb-6 border-2 border-dashed border-tv-borderSubtle hover:border-tv-accent rounded-xl p-8 text-center cursor-pointer transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="text-tv-textMuted">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-sm">Drag &amp; drop images or videos, or <span className="text-tv-accent underline">browse</span></p>
            <p className="text-xs mt-1 opacity-60">
              JPG, PNG, WebP, MP4 · Images up to {config.maxImageMb} MB · Videos up to {config.maxVideoMb} MB
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="xl" /></div>
        ) : assets.length === 0 ? (
          <Card>
            <div className="py-16 text-center text-tv-textMuted">
              <p className="text-3xl mb-3">🖼️</p>
              <p className="font-medium">No media yet</p>
              <p className="text-sm mt-1">Upload photos and videos to use in your playlists.</p>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {assets.map((a) => (
                <AssetCard
                  key={a.id}
                  asset={a}
                  onDelete={openDeleteConfirm}
                  onPreview={setPreviewAsset}
                  onEditMeta={(asset) => {
                    setEditAsset(asset);
                    setEditCategory(asset.category || '');
                    setEditTags(asset.tags || '');
                  }}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</Button>
                <span className="text-tv-textMuted text-sm self-center">{page}/{totalPages}</span>
                <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next ›</Button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />

      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewAsset(null)}>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {previewAsset.type === 'video' ? (
              <video src={previewAsset.url} controls autoPlay className="w-full max-h-[80vh] rounded-xl" />
            ) : (
              <img src={previewAsset.url} alt={previewAsset.original_name} className="w-full max-h-[80vh] object-contain rounded-xl" />
            )}
            <p className="text-white text-center mt-2 text-sm">{previewAsset.original_name}</p>
          </div>
        </div>
      )}

      {editAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-tv-text mb-4">Edit metadata</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-tv-textMuted">Category</label>
                <input
                  className="w-full mt-1 rounded-lg border border-tv-borderSubtle bg-tv-bg text-tv-text px-3 py-2 text-sm"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-tv-textMuted">Tags</label>
                <input
                  className="w-full mt-1 rounded-lg border border-tv-borderSubtle bg-tv-bg text-tv-text px-3 py-2 text-sm"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="comma-separated"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button variant="ghost" onClick={() => setEditAsset(null)}>Cancel</Button>
              <Button onClick={saveMeta}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {confirmAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-tv-text mb-2">Delete Asset?</h3>
            <p className="text-tv-textMuted text-sm mb-4">
              Delete <strong>{confirmAsset.original_name}</strong>? This cannot be undone.
            </p>
            {usageLoading ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : usageInfo && (usageInfo.playlists?.length > 0 || usageInfo.promoCards?.length > 0) ? (
              <div className="mb-4 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="font-medium mb-1">Used in:</p>
                <ul className="list-disc list-inside text-tv-textMuted">
                  {usageInfo.playlists?.map((p) => <li key={p.id}>{p.name}</li>)}
                  {usageInfo.promoCards?.map((c) => <li key={c.id}>Promo: {c.title || c.id}</li>)}
                </ul>
                <p className="mt-2 text-xs">Playlist items will be removed automatically.</p>
              </div>
            ) : (
              <p className="text-tv-textMuted text-sm mb-4">Not used in any playlist.</p>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => { setConfirmAsset(null); setUsageInfo(null); }}>Cancel</Button>
              <Button variant="danger" onClick={() => handleDelete(confirmAsset, true)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
