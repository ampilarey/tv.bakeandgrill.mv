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

const MAX_IMAGE_MB = parseInt(process.env.MAX_UPLOAD_MB || '20', 10);
const MAX_VIDEO_MB = parseInt(process.env.MAX_VIDEO_MB  || '200', 10);

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

// Unified upload — accepts image or video in field "file"
const unifiedUpload = multer({
  storage: {
    _handleFile(req, file, cb) {
      const isVid = file.mimetype === 'video/mp4';
      const subdir = isVid ? 'videos' : 'images';
      const dir = path.join(__dirname, `../uploads/${subdir}`);
      const fname = generateUniqueFilename(file.originalname);
      const fpath = path.join(dir, fname);

      fs.mkdir(dir, { recursive: true })
        .then(() => {
          const stream = require('fs').createWriteStream(fpath);
          file.stream.pipe(stream);
          stream.on('finish', () => cb(null, { path: fpath, filename: fname, destination: dir }));
          stream.on('error', cb);
        })
        .catch(cb);
    },
    _removeFile(req, file, cb) {
      fs.unlink(file.path).then(() => cb()).catch(cb);
    }
  },
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Unsupported file type'), false);
    cb(null, true);
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

function baseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
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

// ── New unified endpoints ──────────────────────────────────────────────────

/**
 * POST /api/uploads  — unified upload (field: "file")
 */
router.post('/', verifyToken, unifiedUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file provided (field: file)' });
  const db   = getDatabase();
  const isVid = req.file.mimetype === 'video/mp4';
  const asset = isVid
    ? await processVideoFile(req.file, req, db)
    : await processImageFile(req.file, req, db);
  res.status(201).json({ success: true, asset });
}));

/**
 * GET /api/uploads  — list media assets
 */
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const db   = getDatabase();
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
  const offset = (page - 1) * limit;
  const type  = req.query.type; // 'image' | 'video' | undefined

  const where  = type ? 'WHERE type = ?' : '';
  const params = type ? [type, limit, offset] : [limit, offset];

  const [assets] = await db.query(`SELECT * FROM media_assets ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, params);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM media_assets ${where}`, type ? [type] : []);

  res.json({ success: true, assets, total, page, limit });
}));

/**
 * DELETE /api/uploads/:id  — delete by DB id
 */
router.delete('/:id(\\d+)', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db  = getDatabase();
  const [rows] = await db.query('SELECT * FROM media_assets WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ success: false, error: 'Asset not found' });

  const asset = rows[0];
  const uploadsBase = path.join(__dirname, '../uploads');

  // Delete main file
  const subdir = asset.type === 'video' ? 'videos' : 'images';
  await deleteImage(path.join(uploadsBase, subdir, asset.stored_name));

  // Delete thumbnail if exists
  if (asset.thumbnail_url) {
    const thumbName = asset.thumbnail_url.split('/').pop();
    await deleteImage(path.join(uploadsBase, 'images', thumbName));
  }

  await db.query('DELETE FROM media_assets WHERE id = ?', [asset.id]);
  res.json({ success: true, message: 'Asset deleted' });
}));

// ── Backward-compatible legacy endpoints ───────────────────────────────────

/** POST /api/uploads/image */
router.post('/image', verifyToken, imageUpload.single('image'), asyncHandler(async (req, res) => {
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
router.post('/images', verifyToken, imageUpload.array('images', 10), asyncHandler(async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files provided' });
  const db     = getDatabase();
  const assets = [];
  for (const file of req.files) {
    try { assets.push(await processImageFile(file, req, db)); } catch { /* skip failures */ }
  }
  res.status(201).json({ success: true, message: `${assets.length} images uploaded`, images: assets.map(a => ({ url: a.url, thumbnailUrl: a.thumbnail_url })), assets });
}));

/** POST /api/uploads/video */
router.post('/video', verifyToken, videoUpload.single('video'), asyncHandler(async (req, res) => {
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
router.delete('/image/:filename', verifyToken, asyncHandler(async (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!SAFE_FILENAME_RE.test(filename)) return res.status(400).json({ success: false, message: 'Invalid filename' });
  const base = path.join(__dirname, '../uploads/images');
  await deleteImage(path.join(base, filename));
  await deleteImage(path.join(base, `thumb-${filename}`));
  res.json({ success: true, message: 'Image deleted' });
}));

/** DELETE /api/uploads/video/:filename (legacy) */
router.delete('/video/:filename', verifyToken, asyncHandler(async (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!SAFE_FILENAME_RE.test(filename)) return res.status(400).json({ success: false, message: 'Invalid filename' });
  await deleteImage(path.join(__dirname, '../uploads/videos', filename));
  res.json({ success: true, message: 'Video deleted' });
}));

module.exports = router;
