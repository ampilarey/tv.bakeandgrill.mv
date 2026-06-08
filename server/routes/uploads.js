/**
 * Uploads + Media Library
 * Handles image/video uploads, tracks them in media_assets,
 * and provides list/delete endpoints.
 *
 * Existing endpoints preserved (backward compat):
 *   POST /api/uploads/image      – single image
 *   POST /api/uploads/images     – multiple images
 *   POST /api/uploads/video      – single video
 *   DELETE /api/uploads/image/:filename
 *   DELETE /api/uploads/video/:filename
 *
 * New endpoints:
 *   POST   /api/uploads           – unified (image or video, field "file")
 *   GET    /api/uploads           – list media_assets (paginated)
 *   DELETE /api/uploads/:id       – delete asset by DB id
 */
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs').promises;
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler }              = require('../middleware/errorHandler');
const { getDatabase }               = require('../database/init');
// sharp is a native module — may not be available on all hosts
let imgTools = null;
try {
  imgTools = require('../utils/imageOptimizer');
} catch (e) {
  console.warn('⚠️  Image optimizer (sharp) unavailable — uploads saved without optimization:', e.message);
}

// Fallback helpers when sharp is missing
const generateUniqueFilename = imgTools
  ? imgTools.generateUniqueFilename
  : (orig) => {
      const ts  = Date.now();
      const rnd = Math.random().toString(36).slice(2, 8);
      const ext = require('path').extname(orig);
      const base = require('path').basename(orig, ext).replace(/[^a-z0-9]/gi, '-').toLowerCase();
      return `${base}-${ts}-${rnd}${ext}`;
    };

const deleteImage = imgTools
  ? imgTools.deleteImage
  : async (p) => { try { await fs.unlink(p); } catch { /* ignore */ } };

// ── Magic-byte validation helpers ──────────────────────────────────────────

const MAGIC = {
  jpg:  [0xFF, 0xD8, 0xFF],
  png:  [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46],  // RIFF
  mp4:  null,                        // check ftyp box (offset 4)
};

async function checkMagic(filePath, type) {
  try {
    const fd  = await fs.open(filePath, 'r');
    const buf = Buffer.alloc(12);
    await fd.read(buf, 0, 12, 0);
    await fd.close();

    if (type === 'image') {
      const isJpg  = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
      const isPng  = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
      const isWebp = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46;
      return isJpg || isPng || isWebp;
    }
    if (type === 'video') {
      // MP4 ftyp box at offset 4
      return buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70;
    }
    return true;
  } catch { return false; /* fail closed — unknown content type is rejected */ }
}

// ── Storage configs ────────────────────────────────────────────────────────

const MAX_IMAGE_MB = parseInt(process.env.MAX_IMAGE_MB || process.env.MAX_UPLOAD_MB || '20', 10);
const MAX_VIDEO_MB = parseInt(process.env.MAX_VIDEO_MB || '200', 10);
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4'];

function diskStorage(subdir) {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      const dir = path.join(__dirname, `../uploads/${subdir}`);
      await fs.mkdir(dir, { recursive: true }).catch(() => {});
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, generateUniqueFilename(file.originalname))
  });
}

const imageUpload = multer({
  storage: diskStorage('images'),
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Only JPEG, PNG, WebP images allowed'), false);
    if (imgTools) {
      try { imgTools.validateImage(file); } catch (e) { return cb(e, false); }
    }
    cb(null, true);
  }
});

const videoUpload = multer({
  storage: diskStorage('videos'),
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['video/mp4'].includes(file.mimetype)) {
      return cb(new Error('Only MP4 videos are allowed.'), false);
    }
    cb(null, true);
  }
});

function perTypeLimitMb(mimetype) {
  return mimetype === 'video/mp4' ? MAX_VIDEO_MB : MAX_IMAGE_MB;
}

// Unified upload — accepts image or video in field "file"
const unifiedUpload = multer({
  storage: {
    _handleFile(req, file, cb) {
      const isVid = file.mimetype === 'video/mp4';
      const subdir = isVid ? 'videos' : 'images';
      const dir = path.join(__dirname, `../uploads/${subdir}`);
      const fname = generateUniqueFilename(file.originalname);
      const fpath = path.join(dir, fname);
      const limitBytes = perTypeLimitMb(file.mimetype) * 1024 * 1024;
      let bytes = 0;

      fs.mkdir(dir, { recursive: true })
        .then(() => {
          const stream = require('fs').createWriteStream(fpath);
          file.stream.on('data', (chunk) => {
            bytes += chunk.length;
            if (bytes > limitBytes) {
              file.stream.unpipe(stream);
              stream.destroy();
              fs.unlink(fpath).catch(() => {});
              const err = new Error(
                isVid
                  ? `Video exceeds ${MAX_VIDEO_MB} MB limit`
                  : `Image exceeds ${MAX_IMAGE_MB} MB limit`
              );
              err.status = 413;
              cb(err);
            }
          });
          file.stream.pipe(stream);
          stream.on('finish', () => {
            if (bytes > limitBytes) return;
            cb(null, { path: fpath, filename: fname, destination: dir, size: bytes });
          });
          stream.on('error', cb);
        })
        .catch(cb);
    },
    _removeFile(req, file, cb) {
      fs.unlink(file.path).then(() => cb()).catch(cb);
    }
  },
  limits: { fileSize: Math.max(MAX_IMAGE_MB, MAX_VIDEO_MB) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Unsupported file type'), false);
    cb(null, true);
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

function baseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

const MAX_STORAGE_MB = parseInt(process.env.MAX_STORAGE_MB || '2048', 10);

async function assertStorageQuota(db, additionalBytes = 0) {
  const [rows] = await db.query('SELECT COALESCE(SUM(size_bytes), 0) AS total FROM media_assets');
  const total = Number(rows[0]?.total || 0);
  if (total + additionalBytes > MAX_STORAGE_MB * 1024 * 1024) {
    const err = new Error(`Storage quota exceeded (${MAX_STORAGE_MB} MB max)`);
    err.status = 507;
    throw err;
  }
}

async function saveAsset(db, { type, originalName, storedName, url, thumbnailUrl, mimeType, sizeBytes, width, height, uploadedBy }) {
  const [r] = await db.query(
    `INSERT INTO media_assets (type, original_name, stored_name, url, thumbnail_url, mime_type, size_bytes, width, height, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [type, originalName, storedName, url, thumbnailUrl || null, mimeType, sizeBytes, width || null, height || null, uploadedBy || null]
  );
  const [rows] = await db.query('SELECT * FROM media_assets WHERE id = ?', [r.insertId]);
  return rows[0];
}

async function processImageFile(file, req, db) {
  await assertStorageQuota(db, file.size || 0);
  const origPath = file.path;
  const magicOk  = await checkMagic(origPath, 'image');
  if (!magicOk) { await deleteImage(origPath); throw new Error('File signature mismatch — not a valid image'); }

  const base = baseUrl(req);
  let storedName, url, thumbUrl, width, height, sizeBytes;

  if (imgTools) {
    // Optimize + thumbnail with sharp
    const optName   = `opt-${file.filename}`;
    const optPath   = path.join(path.dirname(origPath), optName);
    const thumbName = `thumb-${file.filename}`;
    const thumbPath = path.join(path.dirname(origPath), thumbName);

    const info = await imgTools.optimizeImage(origPath, optPath, { maxWidth: 1920, maxHeight: 1080, quality: 85 });
    await imgTools.createThumbnail(origPath, thumbPath, 400);
    await deleteImage(origPath);

    storedName = optName;
    url        = `${base}/uploads/images/${optName}`;
    thumbUrl   = `${base}/uploads/images/${thumbName}`;
    width      = info.width;
    height     = info.height;
    sizeBytes  = info.size;
  } else {
    // No sharp — serve original file as-is
    storedName = file.filename;
    url        = `${base}/uploads/images/${file.filename}`;
    thumbUrl   = url;
    width      = null;
    height     = null;
    sizeBytes  = file.size;
  }

  return saveAsset(db, {
    type: 'image', originalName: file.originalname, storedName,
    url, thumbnailUrl: thumbUrl, mimeType: file.mimetype,
    sizeBytes, width, height, uploadedBy: req.user?.id
  });
}

async function processVideoFile(file, req, db) {
  await assertStorageQuota(db, file.size || 0);
  const magicOk = await checkMagic(file.path, 'video');
  if (!magicOk) { await deleteImage(file.path); throw new Error('File signature mismatch — not a valid MP4'); }

  const base = baseUrl(req);
  const url  = `${base}/uploads/videos/${file.filename}`;

  const asset = await saveAsset(db, {
    type: 'video', originalName: file.originalname, storedName: file.filename,
    url, thumbnailUrl: null, mimeType: file.mimetype,
    sizeBytes: file.size, width: null, height: null,
    uploadedBy: req.user?.id
  });
  return asset;
}

async function getAssetUsage(db, assetId) {
  const [playlists] = await db.query(`
    SELECT mp.id, mp.name FROM media_playlist_items mpi
    JOIN media_playlists mp ON mp.id = mpi.playlist_id
    WHERE mpi.media_id = ?
  `, [assetId]);
  let promoCards = [];
  try {
    const [rows] = await db.query(
      'SELECT id, title FROM promo_cards WHERE image_media_id = ?',
      [assetId]
    );
    promoCards = rows;
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== 'ER_BAD_FIELD_ERROR') throw err;
  }
  return { playlists, promoCards };
}

async function deleteAssetFiles(asset) {
  const uploadsBase = path.join(__dirname, '../uploads');
  const subdir = asset.type === 'video' ? 'videos' : 'images';
  await deleteImage(path.join(uploadsBase, subdir, asset.stored_name));
  if (asset.thumbnail_url) {
    const thumbName = asset.thumbnail_url.split('/').pop();
    await deleteImage(path.join(uploadsBase, 'images', thumbName));
  }
}

function uploadConfigPayload() {
  return {
    maxImageMb: MAX_IMAGE_MB,
    maxVideoMb: MAX_VIDEO_MB,
    maxStorageMb: MAX_STORAGE_MB,
    allowedImageTypes: ALLOWED_IMAGE_TYPES,
    allowedVideoTypes: ALLOWED_VIDEO_TYPES,
  };
}

// ── New unified endpoints ──────────────────────────────────────────────────

/** GET /api/uploads/config */
router.get('/config', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  res.json({ success: true, ...uploadConfigPayload() });
}));

/** GET /api/uploads/stats */
router.get('/stats', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [[totals]] = await db.query(`
    SELECT COUNT(*) AS totalFiles, COALESCE(SUM(size_bytes), 0) AS storageBytes
    FROM media_assets
  `);
  const [[unused]] = await db.query(`
    SELECT COUNT(*) AS unusedCount FROM media_assets ma
    WHERE NOT EXISTS (SELECT 1 FROM media_playlist_items mpi WHERE mpi.media_id = ma.id)
  `);
  let brokenPlaylistItems = 0;
  try {
    const [[broken]] = await db.query(`
      SELECT COUNT(*) AS cnt FROM media_playlist_items mpi
      LEFT JOIN media_assets ma ON ma.id = mpi.media_id
      WHERE ma.id IS NULL
    `);
    brokenPlaylistItems = Number(broken?.cnt || 0);
  } catch { /* table may not exist */ }

  res.json({
    success: true,
    totalFiles: Number(totals.totalFiles || 0),
    storageBytes: Number(totals.storageBytes || 0),
    storageUsedMb: Math.round(Number(totals.storageBytes || 0) / 1024 / 1024 * 10) / 10,
    storageMaxMb: MAX_STORAGE_MB,
    unusedCount: Number(unused.unusedCount || 0),
    brokenPlaylistItems,
  });
}));

/**
 * POST /api/uploads  — unified upload (field: "file")
 */
router.post('/', verifyToken, requireAdmin, (req, res, next) => {
  unifiedUpload.single('file')(req, res, (err) => {
    if (err) {
      const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
      return res.status(status).json({ success: false, error: err.message });
    }
    next();
  });
}, asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file provided (field: file)' });
  const db = getDatabase();
  const size = req.file.size || 0;
  const isVid = req.file.mimetype === 'video/mp4';
  const limitMb = perTypeLimitMb(req.file.mimetype);
  if (size > limitMb * 1024 * 1024) {
    await deleteImage(req.file.path);
    return res.status(413).json({
      success: false,
      error: isVid ? `Video exceeds ${MAX_VIDEO_MB} MB limit` : `Image exceeds ${MAX_IMAGE_MB} MB limit`,
    });
  }
  await assertStorageQuota(db, size);
  const asset = isVid
    ? await processVideoFile(req.file, req, db)
    : await processImageFile(req.file, req, db);
  res.status(201).json({ success: true, asset });
}));

/**
 * GET /api/uploads  — list media assets
 */
router.get('/', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
  const offset = (page - 1) * limit;
  const type = req.query.type;
  const search = (req.query.search || '').trim();
  const unused = req.query.unused === '1';
  const sort = ['created_at', 'original_name', 'size_bytes'].includes(req.query.sort)
    ? req.query.sort
    : 'created_at';
  const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';

  const where = [];
  const params = [];
  if (type) { where.push('ma.type = ?'); params.push(type); }
  if (search) { where.push('ma.original_name LIKE ?'); params.push(`%${search}%`); }
  if (unused) {
    where.push('NOT EXISTS (SELECT 1 FROM media_playlist_items mpi WHERE mpi.media_id = ma.id)');
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [assets] = await db.query(`
    SELECT ma.*,
      (SELECT COUNT(*) FROM media_playlist_items mpi WHERE mpi.media_id = ma.id) AS usage_count
    FROM media_assets ma
    ${whereSql}
    ORDER BY ma.${sort} ${sortDir}
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM media_assets ma ${whereSql}`, params);

  res.json({ success: true, assets, total, page, limit });
}));

/** POST /api/uploads/bulk-delete-unused */
router.post('/bulk-delete-unused', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [rows] = await db.query(`
    SELECT ma.* FROM media_assets ma
    WHERE NOT EXISTS (SELECT 1 FROM media_playlist_items mpi WHERE mpi.media_id = ma.id)
  `);
  let deleted = 0;
  for (const asset of rows) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM media_assets WHERE id = ?', [asset.id]);
      await conn.commit();
      await deleteAssetFiles(asset).catch((e) => console.warn('File delete:', e.message));
      deleted += 1;
    } catch (err) {
      await conn.rollback();
    } finally {
      conn.release();
    }
  }
  res.json({ success: true, deleted });
}));

/** GET /api/uploads/:id/usage */
router.get('/:id(\\d+)/usage', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [rows] = await db.query('SELECT id FROM media_assets WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ success: false, error: 'Asset not found' });
  const usage = await getAssetUsage(db, req.params.id);
  res.json({ success: true, ...usage });
}));

/** PUT /api/uploads/:id — metadata */
router.put('/:id(\\d+)', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const { category, tags } = req.body;
  const db = getDatabase();
  const [rows] = await db.query('SELECT * FROM media_assets WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ success: false, error: 'Asset not found' });

  const updates = [];
  const params = [];
  if (category !== undefined) { updates.push('category = ?'); params.push(category || null); }
  if (tags !== undefined) { updates.push('tags = ?'); params.push(tags || null); }
  if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
  params.push(req.params.id);
  await db.query(`UPDATE media_assets SET ${updates.join(', ')} WHERE id = ?`, params);
  const [updated] = await db.query('SELECT * FROM media_assets WHERE id = ?', [req.params.id]);
  res.json({ success: true, asset: updated[0] });
}));

/**
 * DELETE /api/uploads/:id  — delete by DB id
 */
router.delete('/:id(\\d+)', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const [rows] = await db.query('SELECT * FROM media_assets WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ success: false, error: 'Asset not found' });

  const asset = rows[0];
  const usage = await getAssetUsage(db, asset.id);
  const inUse = usage.playlists.length > 0 || usage.promoCards.length > 0;
  if (inUse && req.query.confirm !== 'true') {
    return res.status(409).json({
      success: false,
      error: 'Asset is in use; pass ?confirm=true to delete',
      usage,
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM media_playlist_items WHERE media_id = ?', [asset.id]);
    await conn.query('DELETE FROM media_assets WHERE id = ?', [asset.id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await deleteAssetFiles(asset).catch((e) => console.warn('File delete after commit:', e.message));

  res.json({
    success: true,
    message: 'Asset deleted',
    removedFromPlaylists: usage.playlists,
  });
}));

// ── Backward-compatible legacy endpoints ───────────────────────────────────

/** POST /api/uploads/image */
router.post('/image', verifyToken, requireAdmin, imageUpload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided' });
  const db    = getDatabase();
  const asset = await processImageFile(req.file, req, db);
  res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    image: { url: asset.url, thumbnailUrl: asset.thumbnail_url, filename: asset.stored_name, width: asset.width, height: asset.height, size: asset.size_bytes },
    asset
  });
}));

/** POST /api/uploads/images */
router.post('/images', verifyToken, requireAdmin, imageUpload.array('images', 10), asyncHandler(async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files provided' });
  const db     = getDatabase();
  const assets = [];
  for (const file of req.files) {
    try { assets.push(await processImageFile(file, req, db)); } catch { /* skip failures */ }
  }
  res.status(201).json({ success: true, message: `${assets.length} images uploaded`, images: assets.map(a => ({ url: a.url, thumbnailUrl: a.thumbnail_url })), assets });
}));

/** POST /api/uploads/video */
router.post('/video', verifyToken, requireAdmin, videoUpload.single('video'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No video file provided' });
  const db    = getDatabase();
  const asset = await processVideoFile(req.file, req, db);
  res.status(201).json({
    success: true,
    message: 'Video uploaded successfully',
    video: { url: asset.url, filename: asset.stored_name, size: asset.size_bytes, mimeType: asset.mime_type },
    asset
  });
}));

const SAFE_FILENAME_RE = /^[a-zA-Z0-9._-]+$/;

/** DELETE /api/uploads/image/:filename (legacy) */
router.delete('/image/:filename', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!SAFE_FILENAME_RE.test(filename)) return res.status(400).json({ success: false, message: 'Invalid filename' });
  const base = path.join(__dirname, '../uploads/images');
  await deleteImage(path.join(base, filename));
  await deleteImage(path.join(base, `thumb-${filename}`));
  res.json({ success: true, message: 'Image deleted' });
}));

/** DELETE /api/uploads/video/:filename (legacy) */
router.delete('/video/:filename', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!SAFE_FILENAME_RE.test(filename)) return res.status(400).json({ success: false, message: 'Invalid filename' });
  await deleteImage(path.join(__dirname, '../uploads/videos', filename));
  res.json({ success: true, message: 'Video deleted' });
}));

module.exports = router;
