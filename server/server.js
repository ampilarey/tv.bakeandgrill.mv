require('dotenv').config();
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
const pairingRoutes = require('./routes/pairing');
const reconnectRoutes = require('./routes/reconnect');

// Phase 1: New feature routes
const featuresRoutes = require('./routes/features');
const playlistItemsRoutes = require('./routes/playlistItems');
const tickerRoutes = require('./routes/ticker');
const scenesRoutes = require('./routes/scenes');
const templatesRoutes = require('./routes/templates');
const announcementsRoutes = require('./routes/announcements');

// Phase 2: Uploads
const uploadsRoutes = require('./routes/uploads');

// Initialize database
console.log('🚀 Starting Bake & Grill TV Server...');

// 🚨 CRITICAL: Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('🚨 CRITICAL: JWT_SECRET environment variable is not set!');
  console.error('🚨 The application will NOT be secure without this.');
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 Failing in production mode for security.');
    process.exit(1); // Fail fast in production
  } else {
    console.warn('⚠️  Continuing in development mode, but this MUST be fixed before production!');
  }
}

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
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval needed for HLS.js
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      mediaSrc: ["'self'", "https:", "http:", "blob:"],
      connectSrc: ["'self'", "https:", "http:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
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
      version: '1.0.7',
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
      version: '1.0.7',
      database: 'unavailable',
      error: 'Database connection failed'
    });
  }
});

app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.0',
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
app.use('/api/pairing', pairingRoutes); // Must be before catch-all schedules route
app.use('/api/reconnect', reconnectRoutes);

// Phase 1: Feature flag & new content routes
app.use('/api/features', featuresRoutes);
app.use('/api/playlist-items', playlistItemsRoutes);
app.use('/api/ticker', tickerRoutes);
app.use('/api/scenes', scenesRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/announcements', announcementsRoutes);

// Phase 2: File uploads
app.use('/api/uploads', uploadsRoutes);

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

