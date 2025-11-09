# Technical Decisions & Rationale

## Why SQLite?

### Pros
✅ **Zero configuration**: No separate database server needed  
✅ **cPanel friendly**: Works on shared hosting  
✅ **Single file**: Easy backups, migrations  
✅ **Fast**: Great for read-heavy operations (streaming metadata)  
✅ **Reliable**: ACID compliant, battle-tested  

### Cons
❌ Limited concurrent writes (not an issue for this use case)  
❌ No built-in replication (manual backups suffice)  

### Verdict
Perfect for this project. Handles expected load (<1000 users, <50 displays) easily.

---

## Why JWT?

### Pros
✅ **Stateless**: No session storage needed  
✅ **Scalable**: Works across multiple servers  
✅ **Flexible**: Include user role, ID in token  
✅ **Mobile-friendly**: Easy to store and send  

### Cons
❌ Can't revoke easily (use short expiry + refresh tokens if needed)  
❌ Token size (minimal impact)  

### Verdict
Industry standard for modern web apps. Simplifies auth across frontend/backend.

---

## Why React + Vite?

### React
✅ **Component reusability**: Build once, use everywhere  
✅ **Large ecosystem**: Libraries for everything  
✅ **Hooks**: Clean state management  
✅ **Developer experience**: Fast development  

### Vite
✅ **Lightning fast**: HMR in milliseconds  
✅ **Modern**: ES modules, optimized builds  
✅ **Simple config**: Less boilerplate than Webpack  
✅ **Small bundles**: Tree-shaking, code splitting  

### Verdict
Best-in-class developer experience + user experience.

---

## Why Tailwind CSS?

### Pros
✅ **Utility-first**: Fast styling without context switching  
✅ **Consistent design**: Predefined scale (spacing, colors)  
✅ **Responsive**: Mobile-first utilities  
✅ **Small bundle**: Purges unused CSS  
✅ **No naming**: Avoid CSS class naming debates  

### Cons
❌ Verbose HTML (mitigated by components)  

### Verdict
Perfect for rapid UI development with consistent design system.

---

## Why HLS.js?

### Pros
✅ **Wide support**: Plays .m3u8 streams in any browser  
✅ **Adaptive bitrate**: Adjusts quality based on connection  
✅ **Well-maintained**: Large community  
✅ **Feature-rich**: Error recovery, analytics hooks  

### Alternatives
- Native HLS: Safari only
- Video.js: Heavier, more features we don't need
- Plyr: Good, but HLS.js more specialized

### Verdict
Industry standard for HLS streaming in browsers.

---

## Why localStorage for Favorites?

### Reasoning
- **Fast**: No API calls for local favorites  
- **Offline**: Works without internet  
- **Sync**: Also stored in DB for cross-device  
- **Backup**: DB acts as backup/sync source  

### Flow
1. User favorites channel → Save to localStorage + API call
2. localStorage = instant UI update
3. DB = persistence across devices

---

## Why PWA?

### Benefits
✅ **Installable**: App icon on phone/desktop  
✅ **Offline support**: Service worker caching  
✅ **Engagement**: Push notifications (future)  
✅ **No app store**: Direct installation from browser  

### Use Cases
- Cafe staff: Install on tablets for easy access
- Customers: Install on phone to watch at home
- Displays: Install in kiosk mode for persistence

### Verdict
Essential for modern web apps. Zero downsides.

---

## Why Node.js Backend?

### Pros
✅ **JavaScript everywhere**: Same language frontend/backend  
✅ **npm ecosystem**: Huge library selection  
✅ **Fast**: Non-blocking I/O great for streaming metadata  
✅ **cPanel support**: Most shared hosts support Node.js  

### Alternatives
- Python: Good, but less natural for web apps
- PHP: Older, less modern dev experience
- Go: Fast, but steeper learning curve

### Verdict
Best match for this stack. Developer efficiency + performance.

---

## Architecture Decisions

### Monorepo vs Separate Repos?
**Choice**: Monorepo (single /tv folder with /client and /server)

**Why**:
- Easier deployment (one upload)
- Shared types/constants
- Single version control
- Simple for cPanel (one Node.js app)

### REST vs GraphQL?
**Choice**: REST API

**Why**:
- Simpler (no GraphQL learning curve)
- Less overhead for this use case
- Better cPanel compatibility
- Easier to cache

### SSR vs SPA?
**Choice**: SPA (Single Page Application)

**Why**:
- Better UX (no page reloads)
- Easier state management
- PWA requirements
- Simpler deployment (static build)

### Websockets vs Polling?
**Choice**: Polling (for display remote control)

**Why**:
- cPanel shared hosting may not support WebSockets
- Polling every 10s is sufficient for this use case
- Simpler implementation
- Can upgrade to WebSockets later if needed

---

## Scalability Considerations

### Current Design (Phase 1)
- **Users**: Up to 1,000
- **Displays**: Up to 50
- **Concurrent streams**: 100+
- **Database**: SQLite handles this easily

### If Scaling Needed (Future)
1. **Database**: Migrate to PostgreSQL
2. **Caching**: Add Redis for sessions
3. **CDN**: Cloudflare for static assets
4. **WebSockets**: Replace polling for real-time
5. **Microservices**: Split auth, streaming, admin

### Verdict
Start simple. Optimize when needed.

---

## Development Workflow

### Local Development
```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm run dev
```

### Production Build
```bash
cd client && npm run build
# Deploy server/ + client/dist/ to cPanel
```

### Testing Strategy
- **Manual testing**: Primary approach for MVP
- **Unit tests**: Add later for critical functions
- **E2E tests**: Optional for future versions

---

## Browser Support

### Target Browsers
- **Chrome**: 90+ ✅
- **Firefox**: 88+ ✅
- **Safari**: 14+ ✅
- **Edge**: 90+ ✅
- **Mobile**: iOS 14+, Android 8+ ✅

### Features Used
- ES6+ (transpiled by Vite)
- Fetch API
- localStorage
- Service Workers (PWA)
- HLS.js (for video)

### Fallbacks
- HLS.js → Native video for Safari
- Service Worker → Graceful degradation

---

## Summary

Every technical choice optimizes for:
1. **Developer Experience**: Fast development, easy maintenance
2. **User Experience**: Fast, smooth, reliable
3. **Deployment**: cPanel-friendly, simple uploads
4. **Cost**: Works on shared hosting (~$10/month)
5. **Scalability**: Can grow to thousands of users

**Result**: A professional-grade IPTV platform that can be built quickly and deployed easily.

