# Frontend Component Architecture

React component structure for Bake and Grill TV

---

## Component Tree

```
App
├── Router
│   ├── PublicRoutes
│   │   ├── LandingPage
│   │   ├── LoginPage
│   │   └── RegisterPage
│   │
│   ├── ProtectedRoutes (User)
│   │   ├── DashboardLayout
│   │   │   ├── Sidebar
│   │   │   ├── TopBar
│   │   │   └── Outlet
│   │   │       ├── DashboardHome
│   │   │       ├── PlayerPage
│   │   │       ├── FavoritesPage
│   │   │       ├── HistoryPage
│   │   │       └── ProfilePage
│   │
│   ├── AdminRoutes (Admin Only)
│   │   ├── AdminLayout
│   │   │   ├── AdminSidebar
│   │   │   └── Outlet
│   │   │       ├── AdminDashboard
│   │   │       ├── UserManagement
│   │   │       ├── PlaylistManagement
│   │   │       ├── DisplayManagement
│   │   │       ├── AnalyticsDashboard
│   │   │       └── SettingsPage
│   │
│   └── DisplayRoute (Kiosk)
│       └── KioskPlayer
```

---

## Core Components

### 1. App.jsx
```jsx
// Main app wrapper with providers
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppRouter from './router/AppRouter';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
```

---

## Context Providers

### AuthContext
```jsx
// src/context/AuthContext.jsx
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Methods: login, logout, register, verifyToken
  // Auto-verify token on mount
  // Provide: { user, token, loading, login, logout, register, isAuthenticated }
};
```

### ThemeContext
```jsx
// src/context/ThemeContext.jsx
// For potential light/dark mode toggle (optional)
// Provide: { theme, toggleTheme }
```

### PlayerContext
```jsx
// src/context/PlayerContext.jsx
const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const [currentChannel, setCurrentChannel] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [channels, setChannels] = useState([]);
  const [favorites, setFavorites] = useState([]);
  
  // Methods: playChannel, nextChannel, prevChannel, toggleFavorite
  // Provide: all state + methods
};
```

---

## Page Components

### LandingPage.jsx
```jsx
// Hero section with branding
// Features showcase
// Login/Register buttons
// Footer with links
```

### LoginPage.jsx
```jsx
// Login form
// Email + Password fields
// Remember me checkbox
// Submit button
// Link to Register
// Forgot password link
```

### RegisterPage.jsx
```jsx
// Registration form
// Email, Password, First Name, Last Name
// Submit button
// Link back to Login
```

### DashboardHome.jsx
```jsx
// User's playlists list
// [Add Playlist] button
// Quick stats (total channels, favorites count)
// Recent watch history preview
// Click playlist → Navigate to Player
```

### PlayerPage.jsx
```jsx
// Main player interface
// Layout: Sidebar (channels) + Main (player)
// Includes:
// - ChannelList component
// - VideoPlayer component
// - PlayerControls component
```

---

## Feature Components

### ChannelList.jsx
```jsx
// Props: channels, currentChannel, onChannelSelect
// Features:
// - Search input
// - Group filter
// - Sort dropdown
// - Grid/List toggle
// - Scrollable list/grid of ChannelCard components
```

### ChannelCard.jsx
```jsx
// Props: channel, isActive, isFavorite, onPlay, onToggleFavorite
// Display:
// - Channel logo (or placeholder)
// - Channel name
// - Group badge
// - Favorite star icon
// - Playing indicator (if active)
// - Click → Play channel
```

### VideoPlayer.jsx
```jsx
// Props: channel
// Features:
// - HTML5 <video> element with ref
// - HLS.js integration for .m3u8
// - Loading spinner overlay
// - Error message display
// - useEffect: Load stream when channel changes
```

### PlayerControls.jsx
```jsx
// Props: videoRef, currentChannel, onNext, onPrev
// Controls:
// - Play/Pause button
// - Volume slider
// - Mute button
// - Fullscreen button
// - PiP button
// - [Previous] [Next] channel buttons
// - Current channel info (name, group)
// - Keyboard event listeners
```

### SearchBar.jsx
```jsx
// Props: value, onChange, placeholder
// Styled input with search icon
// Debounced onChange for performance
```

### GroupFilter.jsx
```jsx
// Props: groups, selected, onChange
// Display as:
// - Dropdown (mobile)
// - Pill buttons (desktop)
```

### FavoriteButton.jsx
```jsx
// Props: isFavorite, onClick
// Star icon (outlined or filled)
// Click animation
```

---

## Admin Components

### AdminSidebar.jsx
```jsx
// Navigation links:
// - Dashboard
// - Users
// - Playlists
// - Displays
// - Analytics
// - Settings
// - Logout
```

### AdminDashboard.jsx
```jsx
// Stats cards: Users, Playlists, Displays, Active Displays
// Quick actions buttons
// Recent activity feed
// Display status overview
```

### UserManagement.jsx
```jsx
// UserTable component
// [Create User] button
// Opens CreateUserModal
// Edit/Delete actions
```

### UserTable.jsx
```jsx
// Props: users, onEdit, onDelete
// Table with sortable columns
// Search/filter functionality
// Pagination
```

### CreateUserModal.jsx
```jsx
// Props: isOpen, onClose, onSubmit
// Form fields: email, password, role, name
// Validation
```

### DisplayManagement.jsx
```jsx
// List of DisplayCard components
// [Add Display] button
// Each card shows: name, status, current channel, actions
```

### DisplayCard.jsx
```jsx
// Props: display
// Display info with status indicator (green/red)
// [Change Channel] button → RemoteControlModal
// [Edit] [Delete] buttons
// Click card → Navigate to DisplayDetail page
```

### DisplayDetail.jsx
```jsx
// Tabs: Info, Schedules, History
// Info tab: Edit display settings
// Schedules tab: ScheduleList + [Add Schedule]
// History tab: Heartbeat/error logs
```

### ScheduleList.jsx
```jsx
// Props: displayId, schedules
// Table of schedules
// [Add Schedule] button → ScheduleModal
// Edit/Delete actions per schedule
```

### ScheduleModal.jsx
```jsx
// Props: isOpen, onClose, onSubmit, schedule (for edit)
// Form: Channel, Day, Start Time, End Time
// Time pickers
```

### RemoteControlModal.jsx
```jsx
// Props: isOpen, onClose, displayId, currentChannel
// Channel selector from assigned playlist
// [Switch Now] button
// Sends API request to change channel
```

### AnalyticsDashboard.jsx
```jsx
// Time range selector
// Stats cards (watch time, viewers, streams)
// TopChannelsChart component
// WatchByGroupChart component (pie chart)
// DisplayUptimeTable component
```

### SettingsPage.jsx
```jsx
// Tabs: General, PWA Icon, Advanced
// GeneralSettings component
// PWAIconUpload component
// AdvancedSettings component
```

### PWAIconUpload.jsx
```jsx
// Current icon preview
// File input (hidden)
// [Upload] button
// Shows preview before saving
// Submit → API upload → Update manifest
```

---

## Utility Components

### Modal.jsx
```jsx
// Props: isOpen, onClose, title, children
// Generic modal wrapper
// Backdrop + centered panel
// Close button (X)
// ESC key to close
```

### Button.jsx
```jsx
// Props: variant (primary/secondary/danger), size, onClick, children
// Styled button with variants
// Loading state (spinner)
// Disabled state
```

### Input.jsx
```jsx
// Props: type, value, onChange, label, error, placeholder
// Styled input with label
// Error message display
```

### Select.jsx
```jsx
// Props: options, value, onChange, label
// Styled dropdown
```

### Card.jsx
```jsx
// Props: children, className
// Styled container with shadow, padding, rounded corners
```

### Badge.jsx
```jsx
// Props: text, color
// Small colored pill for groups/status
```

### Spinner.jsx
```jsx
// Loading spinner animation
// Sizes: small, medium, large
```

### Toast.jsx
```jsx
// Notification component
// Auto-dismiss after 3 seconds
// Types: success, error, info, warning
```

---

## Kiosk Components

### KioskPlayer.jsx
```jsx
// Full-screen video player
// Minimal UI (no controls, no sidebar)
// Auto-plays assigned channel
// Auto-retry on error
// Heartbeat interval (sends status to server)
// Polls for remote commands (channel change)
// Optional: Small logo watermark overlay
```

---

## Custom Hooks

### useAuth.js
```javascript
// Hook to access AuthContext
export const useAuth = () => useContext(AuthContext);
```

### usePlayer.js
```javascript
// Hook to access PlayerContext
export const usePlayer = () => useContext(PlayerContext);
```

### useApi.js
```javascript
// Hook for API calls with error handling
// Returns: { data, loading, error, refetch }
export const useApi = (endpoint, options) => {
  // Fetch data from API
  // Handle loading/error states
  // Include auth token
};
```

### useChannels.js
```javascript
// Hook to fetch and manage channels from a playlist
export const useChannels = (playlistId) => {
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [groups, setGroups] = useState([]);
  
  // Fetch channels
  // Provide search/filter/sort functions
  return { channels, filteredChannels, groups, search, filter, sort };
};
```

### useFavorites.js
```javascript
// Hook to manage favorites
export const useFavorites = () => {
  // Fetch user favorites
  // Add/remove favorite
  // Export/import
  return { favorites, toggleFavorite, exportFavorites, importFavorites };
};
```

### useKeyboard.js
```javascript
// Hook for keyboard shortcuts
export const useKeyboard = (handlers) => {
  // handlers: { Space: () => {}, F: () => {}, ... }
  // Attach/detach event listeners
};
```

### useLocalStorage.js
```javascript
// Hook to sync state with localStorage
export const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });
  
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  
  return [value, setValue];
};
```

---

## Services (API Layer)

### authService.js
```javascript
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verify: () => api.get('/auth/verify'),
  logout: () => { /* clear token */ },
};
```

### playlistService.js
```javascript
export const playlistService = {
  getAll: () => api.get('/playlists'),
  create: (data) => api.post('/playlists', data),
  update: (id, data) => api.patch(`/playlists/${id}`, data),
  delete: (id) => api.delete(`/playlists/${id}`),
  getChannels: (id) => api.get(`/playlists/${id}/channels`),
};
```

### favoriteService.js
```javascript
export const favoriteService = {
  getAll: () => api.get('/favorites'),
  add: (data) => api.post('/favorites', data),
  remove: (id) => api.delete(`/favorites/${id}`),
  export: () => api.get('/favorites/export'),
  import: (file) => api.post('/favorites/import', formData),
};
```

### displayService.js (Admin)
```javascript
export const displayService = {
  getAll: () => api.get('/displays'),
  create: (data) => api.post('/displays', data),
  update: (id, data) => api.patch(`/displays/${id}`, data),
  delete: (id) => api.delete(`/displays/${id}`),
  getStatus: (id) => api.get(`/displays/${id}/status`),
  remoteControl: (id, action) => api.post(`/displays/${id}/control`, action),
  heartbeat: (id, status) => api.post(`/displays/${id}/heartbeat`, status),
};
```

### Base API Client (api.js)
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Request interceptor: Add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, logout
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Styling Approach

### Tailwind Classes
All components use Tailwind CSS utility classes.

**Color Palette in tailwind.config.js:**
```javascript
colors: {
  primary: {
    DEFAULT: '#F59E0B', // Amber
    light: '#FCD34D',   // Golden
    dark: '#EA580C',    // Orange
  },
  secondary: {
    DEFAULT: '#92400E', // Rich Brown
    dark: '#78350F',    // Copper
  },
  background: {
    DEFAULT: '#0F172A', // Dark Charcoal
    light: '#1E293B',   // Slate
    lighter: '#334155', // Slate Light
  },
  text: {
    DEFAULT: '#FFFFFF',
    secondary: '#94A3B8',
    muted: '#64748B',
  }
}
```

### Common Patterns
```jsx
// Button Primary
<button className="bg-primary hover:bg-primary-dark text-white font-medium px-6 py-2 rounded-lg transition-colors">

// Card
<div className="bg-background-light rounded-xl p-6 shadow-lg border border-slate-700">

// Input
<input className="w-full bg-background-lighter text-white border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary">

// Sidebar
<aside className="w-80 h-screen bg-background-light border-r border-slate-700 overflow-y-auto">
```

---

## File Structure

```
client/src/
├── components/
│   ├── common/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── Card.jsx
│   │   ├── Badge.jsx
│   │   ├── Spinner.jsx
│   │   └── Toast.jsx
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   ├── TopBar.jsx
│   │   ├── DashboardLayout.jsx
│   │   ├── AdminSidebar.jsx
│   │   └── AdminLayout.jsx
│   ├── player/
│   │   ├── VideoPlayer.jsx
│   │   ├── PlayerControls.jsx
│   │   ├── ChannelList.jsx
│   │   └── ChannelCard.jsx
│   ├── admin/
│   │   ├── UserTable.jsx
│   │   ├── CreateUserModal.jsx
│   │   ├── DisplayCard.jsx
│   │   ├── RemoteControlModal.jsx
│   │   ├── ScheduleList.jsx
│   │   └── ScheduleModal.jsx
│   └── kiosk/
│       └── KioskPlayer.jsx
├── pages/
│   ├── public/
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   └── RegisterPage.jsx
│   ├── user/
│   │   ├── DashboardHome.jsx
│   │   ├── PlayerPage.jsx
│   │   ├── FavoritesPage.jsx
│   │   ├── HistoryPage.jsx
│   │   └── ProfilePage.jsx
│   └── admin/
│       ├── AdminDashboard.jsx
│       ├── UserManagement.jsx
│       ├── PlaylistManagement.jsx
│       ├── DisplayManagement.jsx
│       ├── DisplayDetail.jsx
│       ├── AnalyticsDashboard.jsx
│       └── SettingsPage.jsx
├── context/
│   ├── AuthContext.jsx
│   ├── ThemeContext.jsx
│   └── PlayerContext.jsx
├── hooks/
│   ├── useAuth.js
│   ├── usePlayer.js
│   ├── useApi.js
│   ├── useChannels.js
│   ├── useFavorites.js
│   ├── useKeyboard.js
│   └── useLocalStorage.js
├── services/
│   ├── api.js
│   ├── authService.js
│   ├── playlistService.js
│   ├── favoriteService.js
│   ├── historyService.js
│   └── displayService.js
├── utils/
│   ├── channelUtils.js
│   ├── timeUtils.js
│   └── validators.js
├── router/
│   ├── AppRouter.jsx
│   ├── ProtectedRoute.jsx
│   └── AdminRoute.jsx
├── App.jsx
├── main.jsx
└── index.css (Tailwind imports)
```

