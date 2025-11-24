/**
 * File Upload Routes
 * Handle image and media file uploads
 * Phase 2: Images & QR Codes
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { verifyToken } = require('../middleware/auth');
const { 
  optimizeImage, 
  createThumbnail, 
  validateImage, 
  generateUniqueFilename,
  deleteImage 
} = require('../utils/imageOptimizer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/images');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, generateUniqueFilename(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    try {
      validateImage(file);
      cb(null, true);
    } catch (error) {
      cb(error, false);
    }
  }
});

// Video upload configuration (larger size limit)
const videoStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/videos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, generateUniqueFilename(file.originalname));
  }
});

const videoUpload = multer({
  storage: videoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!allowedMimes.includes(file.mimetype)) {
      cb(new Error('Invalid video format. Only MP4, WebM, and OGG are allowed.'));
      return;
    }
    cb(null, true);
  }
});

/**
 * POST /api/uploads/image
 * Upload and optimize an image
 */
router.post('/image', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const originalPath = req.file.path;
    const optimizedFilename = `optimized-${req.file.filename}`;
    const optimizedPath = path.join(path.dirname(originalPath), optimizedFilename);
    const thumbnailFilename = `thumb-${req.file.filename}`;
    const thumbnailPath = path.join(path.dirname(originalPath), thumbnailFilename);

    // Optimize image
    const optimizedInfo = await optimizeImage(originalPath, optimizedPath, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 85,
      format: 'jpeg'
    });

    // Create thumbnail
    const thumbnailInfo = await createThumbnail(originalPath, thumbnailPath, 300);

    // Delete original file to save space
    await deleteImage(originalPath);

    // Return URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      image: {
        url: `${baseUrl}/uploads/images/${optimizedFilename}`,
        thumbnailUrl: `${baseUrl}/uploads/images/${thumbnailFilename}`,
        filename: optimizedFilename,
        width: optimizedInfo.width,
        height: optimizedInfo.height,
        size: optimizedInfo.size
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    
    // Clean up files on error
    if (req.file) {
      await deleteImage(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
});

/**
 * POST /api/uploads/images
 * Upload multiple images
 */
router.post('/images', verifyToken, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const uploadedImages = [];
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    for (const file of req.files) {
      try {
        const originalPath = file.path;
        const optimizedFilename = `optimized-${file.filename}`;
        const optimizedPath = path.join(path.dirname(originalPath), optimizedFilename);
        const thumbnailFilename = `thumb-${file.filename}`;
        const thumbnailPath = path.join(path.dirname(originalPath), thumbnailFilename);

        // Optimize image
        const optimizedInfo = await optimizeImage(originalPath, optimizedPath);
        
        // Create thumbnail
        await createThumbnail(originalPath, thumbnailPath);

        // Delete original
        await deleteImage(originalPath);

        uploadedImages.push({
          url: `${baseUrl}/uploads/images/${optimizedFilename}`,
          thumbnailUrl: `${baseUrl}/uploads/images/${thumbnailFilename}`,
          filename: optimizedFilename,
          width: optimizedInfo.width,
          height: optimizedInfo.height,
          size: optimizedInfo.size
        });
      } catch (error) {
        console.error(`Error processing file ${file.filename}:`, error);
        // Continue with other files
      }
    }

    res.status(201).json({
      success: true,
      message: `${uploadedImages.length} images uploaded successfully`,
      images: uploadedImages
    });
  } catch (error) {
    console.error('Multiple image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images'
    });
  }
});

/**
 * DELETE /api/uploads/image/:filename
 * Delete an uploaded image
 */
router.delete('/image/:filename', verifyToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: prevent path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const imagePath = path.join(__dirname, '../uploads/images', filename);
    const thumbnailPath = path.join(__dirname, '../uploads/images', `thumb-${filename}`);

    // Delete image and thumbnail
    await deleteImage(imagePath);
    await deleteImage(thumbnailPath);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image'
    });
  }
});

/**
 * POST /api/uploads/video
 * Upload a video file
 */
router.post('/video', verifyToken, videoUpload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided'
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      video: {
        url: `${baseUrl}/uploads/videos/${req.file.filename}`,
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Video upload error:', error);
    
    // Clean up file on error
    if (req.file) {
      await deleteImage(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload video'
    });
  }
});

/**
 * DELETE /api/uploads/video/:filename
 * Delete an uploaded video
 */
router.delete('/video/:filename', verifyToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: prevent path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const videoPath = path.join(__dirname, '../uploads/videos', filename);
    await deleteImage(videoPath);

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Video deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video'
    });
  }
});

module.exports = router;

