/**
 * Image Optimization Utility
 * Resize and compress images for optimal display performance
 * Phase 2: Images & QR Codes
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Optimize an image file
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save optimized image
 * @param {object} options - Optimization options
 * @returns {Promise<object>} - { path, width, height, size }
 */
async function optimizeImage(inputPath, outputPath, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 85,
    format = 'jpeg'
  } = options;

  try {
    const metadata = await sharp(inputPath).metadata();
    
    let pipeline = sharp(inputPath);

    // Resize if larger than max dimensions
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert to specified format and compress
    if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality, progressive: true });
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality, progressive: true });
    } else if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    }

    // Save optimized image
    const info = await pipeline.toFile(outputPath);

    return {
      path: outputPath,
      width: info.width,
      height: info.height,
      size: info.size,
      format: info.format
    };
  } catch (error) {
    console.error('Image optimization error:', error);
    throw new Error('Failed to optimize image');
  }
}

/**
 * Create thumbnail from image
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save thumbnail
 * @param {number} size - Thumbnail size (square)
 * @returns {Promise<object>} - { path, width, height, size }
 */
async function createThumbnail(inputPath, outputPath, size = 300) {
  try {
    const info = await sharp(inputPath)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    return {
      path: outputPath,
      width: info.width,
      height: info.height,
      size: info.size
    };
  } catch (error) {
    console.error('Thumbnail creation error:', error);
    throw new Error('Failed to create thumbnail');
  }
}

/**
 * Validate image file
 * @param {object} file - Multer file object
 * @returns {boolean} - Is valid
 */
function validateImage(file) {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedMimes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
  }

  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.');
  }

  return true;
}

/**
 * Delete image file
 * @param {string} filePath - Path to file to delete
 */
async function deleteImage(filePath) {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @returns {string} - Unique filename
 */
function generateUniqueFilename(originalName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const safeName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  return `${safeName}-${timestamp}-${random}${ext}`;
}

module.exports = {
  optimizeImage,
  createThumbnail,
  validateImage,
  deleteImage,
  generateUniqueFilename
};

