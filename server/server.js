require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

// Initialize database
console.log('🚀 Starting Bake & Grill TV Server...');
initDatabase();

// Create Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tv.bakeandgrill.mv', 'https://tv.bakegrill.com'] 
    : '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.get('/api/health', async (req, res) => {
  try {
    const db = getDatabase();
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
    const [playlistCount] = await db.query('SELECT COUNT(*) as count FROM playlists');
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      stats: {
        users: userCount[0].count,
        playlists: playlistCount[0].count
      }
    });
  } catch (error) {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'connecting...'
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
app.use('/api', schedulesRoutes); // Includes /api/schedules/* routes
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../client/dist');
  
  console.log(`📦 Serving static frontend from: ${clientDistPath}`);
  
  app.use(express.static(clientDistPath));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
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
  console.log(`🗄️  Database: ${process.env.DB_PATH || './database/database.sqlite'}`);
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

