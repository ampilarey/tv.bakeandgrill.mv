import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Spinner from '../../components/common/Spinner';
import MobileMenu from '../../components/MobileMenu';
import Footer from '../../components/Footer';

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,video/mp4';

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function AssetCard({ asset, onDelete }) {
  const isVideo = asset.type === 'video';
  return (
    <div className="relative group bg-tv-bgSoft rounded-xl overflow-hidden border border-tv-borderSubtle hover:border-tv-accent/40 transition-all">
      <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
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
      </div>
      <div className="p-3">
        <p className="text-tv-text text-sm font-medium truncate" title={asset.original_name}>
          {asset.original_name}
        </p>
        <p className="text-tv-textMuted text-xs mt-0.5">{formatBytes(asset.size_bytes)}</p>
      </div>
      <button
        onClick={() => onDelete(asset)}
        className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        title="Delete"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function MediaLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assets, setAssets]       = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [filter, setFilter]       = useState(''); // '' | 'image' | 'video'
  const [err, setErr]             = useState('');
  const [confirmAsset, setConfirmAsset] = useState(null);

  const fileRef = useRef(null);

  const fetchAssets = useCallback(async (p = page, f = filter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 40 });
      if (f) params.set('type', f);
      const { data } = await api.get(`/uploads?${params}`);
      setAssets(data.assets || []);
      setTotal(data.total || 0);
    } catch (e) { setErr(e.response?.data?.error || 'Failed to load'); }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/admin/dashboard'); return; }
    fetchAssets(page, filter);
  }, [user, navigate, page, filter, fetchAssets]);

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
          onUploadProgress: e => setUploadPct(Math.round((done / files.length + e.loaded / e.total / files.length) * 100))
        });
        done++;
      } catch (e) {
        setErr(`Upload failed for ${file.name}: ${e.response?.data?.error || e.message}`);
      }
    }
    setUploading(false);
    fetchAssets(1, filter);
  };

  const handleDelete = async (asset) => {
    try {
      await api.delete(`/uploads/${asset.id}`);
      setConfirmAsset(null);
      fetchAssets(page, filter);
    } catch (e) { setErr(e.response?.data?.error || 'Delete failed'); }
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleUpload(Array.from(e.dataTransfer.files));
  };

  const totalPages = Math.ceil(total / 40);

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
              <h1 className="text-xl font-bold text-white">Media Library</h1>
              <p className="text-xs text-white/70 hidden sm:block">{total} file{total !== 1 ? 's' : ''} total</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="text-sm bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5 focus:outline-none"
              value={filter}
              onChange={e => { setFilter(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
            </select>
            <Button onClick={() => fileRef.current?.click()} size="sm" variant="secondary" disabled={uploading}>
              {uploading ? `Uploading ${uploadPct}%…` : '+ Upload'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={e => handleUpload(Array.from(e.target.files))}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full pb-24">
        {err && (
          <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm flex justify-between">
            {err}
            <button onClick={() => setErr('')} className="underline ml-2">dismiss</button>
          </div>
        )}

        {/* Drop zone */}
        <div
          className="mb-6 border-2 border-dashed border-tv-borderSubtle hover:border-tv-accent rounded-xl p-8 text-center cursor-pointer transition-colors"
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="text-tv-textMuted">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-sm">Drag &amp; drop images or videos, or <span className="text-tv-accent underline">browse</span></p>
            <p className="text-xs mt-1 opacity-60">JPG, PNG, WebP, MP4 · Images up to {process.env.MAX_UPLOAD_MB || 20} MB · Videos up to {process.env.MAX_VIDEO_MB || 200} MB</p>
          </div>
        </div>

        {/* Grid */}
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
              {assets.map(a => (
                <AssetCard key={a.id} asset={a} onDelete={setConfirmAsset} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</Button>
                <span className="text-tv-textMuted text-sm self-center">{page}/{totalPages}</span>
                <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</Button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />

      {/* Confirm delete modal */}
      {confirmAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-tv-text mb-2">Delete Asset?</h3>
            <p className="text-tv-textMuted text-sm mb-6">
              Delete <strong>{confirmAsset.original_name}</strong>? This cannot be undone and will remove it from all playlists.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setConfirmAsset(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => handleDelete(confirmAsset)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
