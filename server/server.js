require('dotenv').config();
const validateEnv = require('./utils/validateEnv');
validateEnv();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const { initDatabase, getDatabase } = require('./database/init');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const playlistsRoutes = require('./routes/playlists');
const channelsRoutes = require('./routes/channels');
const favoritesRoutes = require('./routes/favorites');
const historyRoutes = require('./routes/history');
const displaysRoutes = require('./routes/displays');
const schedulesRoutes = require('./routes/schedules');
const settingsRoutes = require('./routes/settings');
const analyticsRoutes = require('./routes/analytics');
const permissionsRoutes = require('./routes/permissions');
const notificationsRoutes = require('./routes/notifications');
const pairingRoutes          = require('./routes/pairing');
const reconnectRoutes        = require('./routes/reconnect');
const zonesRoutes            = require('./routes/zones');
const uploadsRoutes          = require('./routes/uploads');
const mediaPlaylistsRoutes   = require('./routes/mediaPlaylists');
const contentSchedulesRoutes = require('./routes/contentSchedules');
const overlaysRoutes         = require('./routes/overlays');
const broadcastsRoutes       = require('./routes/broadcasts');
const systemRoutes           = require('./routes/system');
const displayScenesRoutes    = require('./routes/displayScenes');

// Phase 1: New content routes (featuresRoutes already declared above)
const playlistItemsRoutes = require('./routes/playlistItems');
const tickerRoutes = require('./routes/ticker');
const scenesRoutes = require('./routes/scenes');
const templatesRoutes = require('./routes/templates');
const announcementsRoutes = require('./routes/announcements');


// Background services
const channelChecker = require('./services/channelChecker');
const displayMonitor = require('./services/displayMonitor');

// Initialize database
console.log('🚀 Starting Bake & Grill TV Server...');

initDatabase();

// Create Express app
const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

// CORS Configuration - Allow customization via environment variable
// Format: comma-separated list of allowed origins (e.g., "https://example.com,https://app.example.com")
// In development mode, all origins are allowed for easier testing
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || 'https://tv.bakeandgrill.mv,https://tv.bakegrill.com')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    
    console.warn(`🚫 Blocked CORS origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

// Security & performance middleware
const isProd = process.env.NODE_ENV === 'production';
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // unsafe-eval required by HLS.js; unsafe-inline kept for inline event handlers in legacy code
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      // Allow HTTPS channel thumbnails; restrict plain HTTP in production
      imgSrc: ["'self'", "data:", "https:", ...(isProd ? [] : ["http:"])],
      // HLS streams may be HTTP or HTTPS; blob: needed for MSE
      mediaSrc: ["'self'", "https:", "http:", "blob:"],
      // API + WebSocket calls; restrict plain HTTP in production
      connectSrc: ["'self'", "https:", ...(isProd ? [] : ["http:"])],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      ...(isProd ? { upgradeInsecureRequests: [] } : {})
    }
  }
}));
app.use(compression());
app.use(cors(corsOptions));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.API_RATE_LIMIT || '600', 10),
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.AUTH_RATE_LIMIT || '100', 10),
  standardHeaders: true,
  legacyHeaders: false
});

// Public routes (BEFORE rate limiter)
// Feature flags must be public for frontend to check
const featuresRoutes = require('./routes/features');
app.use('/api/features', featuresRoutes);

app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.get('/api/health', async (req, res) => {
  try {
    const db = getDatabase();
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
    const [playlistCount] = await db.query('SELECT COUNT(*) as count FROM playlists');
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.8',
      database: 'connected',
      stats: {
        users: userCount[0].count,
        playlists: playlistCount[0].count
      }
    });
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: '1.0.8',
      database: 'unavailable',
      error: 'Database connection failed'
    });
  }
});

// Admin: manually trigger a channel health check run
app.post('/api/admin/check-channels', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { verifyToken: verify } = require('./middleware/auth');
    // Quick inline token check
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    channelChecker.triggerRun();
    res.json({ success: true, message: 'Channel health check triggered' });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.8',
    name: 'Bake & Grill TV',
    node: process.version
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/displays', displaysRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/pairing',           pairingRoutes);
app.use('/api/reconnect',         reconnectRoutes);
app.use('/api/zones',             zonesRoutes);
app.use('/api/uploads',           uploadsRoutes);
app.use('/api/media-playlists',   mediaPlaylistsRoutes);
app.use('/api/content-schedules', contentSchedulesRoutes);
app.use('/api/overlays',          overlaysRoutes);
app.use('/api/broadcasts',        broadcastsRoutes);
app.use('/api/system',            systemRoutes);
app.use('/api/display-scenes',    displayScenesRoutes);

// Phase 1: Content routes (features already mounted above as public route)
app.use('/api/playlist-items', playlistItemsRoutes);
app.use('/api/ticker', tickerRoutes);
app.use('/api/scenes', scenesRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/announcements', announcementsRoutes);

// Phase 2: File uploads - TEMPORARILY DISABLED (missing multer/sharp packages)

// Phase 6: Scene Activation
const sceneActivationRoutes = require('./routes/sceneActivation');
app.use('/api', sceneActivationRoutes);

app.use('/api', schedulesRoutes); // Includes /api/schedules/* routes - KEEP THIS LAST

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../client/dist');
  
  console.log(`📦 Serving static frontend from: ${clientDistPath}`);
  
  // Add cache-busting headers for service worker and HTML files
  app.use('/sw.js', (req, res, next) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    next();
  });
  
  app.use('/registerSW.js', (req, res, next) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    next();
  });
  
  app.use(express.static(clientDistPath, {
    setHeaders: (res, filePath) => {
      // Don't cache HTML files - always fetch fresh
      if (filePath.endsWith('.html') || filePath.endsWith('/index.html')) {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
      }
      // Service worker files should never be cached
      if (filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js')) {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
      }
      // JS and CSS files - never cache to ensure fresh updates
      if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
      }
    }
  }));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Development mode - frontend runs separately on Vite dev server
  app.get('/', (req, res) => {
    res.json({
      message: 'Bake & Grill TV API Server',
      mode: 'development',
      docs: '/api/health',
      frontend: 'Run separately with Vite dev server'
    });
  });
}

// Error handling - must be last
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('✅ Server started successfully!');
  // Start background channel health checker
  channelChecker.start();
  displayMonitor.start();
  console.log('');
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`📡 API endpoints: http://localhost:${PORT}/api/health`);
  console.log(`🗄️  Database: MySQL (${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'bakegrill_tv'})`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('🔥 Bake & Grill TV is ready!');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down server...');
  const { closeDatabase } = require('./database/init');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  Shutting down server...');
  const { closeDatabase } = require('./database/init');
  await closeDatabase();
  process.exit(0);
});

module.exports = app;

