# 🚀 MASTER IMPLEMENTATION PLAN
## Complete Feature Enhancement for Bake & Grill TV

**Date Created:** November 21, 2025  
**Current System Backup:** `tv-backup-20251121-232349`  
**Estimated Total Time:** 8-12 months  
**Status:** Planning Phase

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Architecture](#current-system-architecture)
3. [Target System Architecture](#target-system-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Risk Assessment](#risk-assessment)
6. [Rollback Strategy](#rollback-strategy)

---

## 🎯 Executive Summary

This plan implements **100% of the features** from the comprehensive enhancement request, transforming Bake & Grill TV from an IPTV streaming platform into a full-featured digital signage and content management system.

### Scope
- **20+ new features**
- **Complete data model refactor**
- **Multi-type content player**
- **Advanced scheduling system**
- **Multi-language support**
- **Offline content caching**
- **Enhanced CMS**

### Approach
- **9 Phases** over 8-12 months
- **Parallel development** where possible
- **Feature flags** for gradual rollout
- **Continuous testing** at each phase
- **User feedback loops** after major phases

---

## 🏗️ Current System Architecture

### Database Schema
```
users (id, email, phone_number, password_hash, role, ...)
playlists (id, name, m3u_url, owner_id, ...)
displays (id, name, location, token, playlist_id, ...)
display_commands (id, display_id, action, ...)
display_schedules (id, display_id, day_of_week, start_time, end_time, ...)
watch_history (id, user_id, playlist_id, channel_id, channel_name, ...)
user_permissions (id, user_id, permission_name, ...)
user_assigned_playlists (id, user_id, playlist_id, ...)
```

### Frontend Flow
```
User → Login → Dashboard → Player
                         ↓
                    Select Playlist → Fetch M3U → Parse Channels → HLS.js Player
```

### Display Flow
```
TV Browser → Pairing Page → Enter PIN → Get Token → Kiosk Player
                                                    ↓
                                               Fetch M3U → Parse → HLS.js
```

### Technology Stack
- **Frontend:** React 18, React Router 6, Tailwind CSS, HLS.js, Vite
- **Backend:** Node.js, Express, MySQL, JWT Auth
- **Infrastructure:** PWA (Service Worker), Axios, bcrypt

---

## 🎯 Target System Architecture

### New Database Schema
```sql
-- Core Content Model
playlist_items (
  id, 
  playlist_id, 
  type ENUM('m3u', 'video', 'youtube', 'youtube_playlist', 'onedrive', 'image'),
  title,
  title_dv,
  description,
  description_dv,
  url,
  embed_url,
  duration_seconds,
  sound_enabled,
  qr_target_url,
  is_upsell,
  is_kids_friendly,
  is_staff_training,
  sort_order,
  thumbnail_url,
  group_name,
  created_at,
  updated_at
)

-- Scheduling Enhancement
display_schedules (
  id,
  display_id,
  playlist_id,
  channel_id,
  item_id,
  day_of_week,
  start_time,
  end_time,
  date_start,
  date_end,
  priority,
  is_active
)

-- Scenes System
scenes (
  id,
  name,
  name_dv,
  description,
  playlist_id,
  ticker_enabled,
  upsell_frequency,
  audio_enabled,
  theme,
  created_by,
  created_at
)

-- Info Ticker
ticker_messages (
  id,
  text,
  text_dv,
  is_active,
  priority,
  display_id,
  start_date,
  end_date,
  created_at
)

-- Announcements
announcements (
  id,
  display_id,
  text,
  text_dv,
  duration_seconds,
  created_at,
  expires_at
)

-- Templates
slide_templates (
  id,
  name,
  template_type ENUM('image_price', 'text_only', 'offer', 'qr_code'),
  background_color,
  primary_color,
  secondary_color,
  font_family,
  layout_config JSON
)

-- Per-Screen Profiles
screen_profiles (
  id,
  display_id,
  language ENUM('en', 'dv', 'both'),
  default_scene_id,
  default_mode ENUM('normal', 'kids', 'training'),
  theme,
  settings JSON
)

-- Offline Cache Manifest
offline_cache_manifest (
  id,
  display_id,
  item_id,
  item_type,
  file_path,
  file_size,
  cached_at,
  last_accessed
)
```

### New Player Architecture
```
MultiTypePlayer Component
├── HLSPlayer (for M3U streams)
├── VideoPlayer (for MP4/WebM)
├── YouTubeEmbed (for YouTube videos/playlists)
├── OneDriveEmbed (for OneDrive videos)
├── ImageSlide (for images with duration)
└── TemplateSlide (for generated slides)
```

---

## 📅 PHASE 1: Foundation (Weeks 1-3)

**Goal:** Lay groundwork without breaking existing system

### Tasks

#### 1.1 Database Migrations
- [ ] Create `playlist_items` table
- [ ] Add `type` field with default value `'m3u'`
- [ ] Migrate existing playlists to new structure
- [ ] Add language fields (`title_dv`, `description_dv`)
- [ ] Create `ticker_messages` table
- [ ] Create `slide_templates` table
- [ ] Create `scenes` table

**SQL Migration Script:**
```sql
-- Phase 1: Add new tables (non-breaking)
CREATE TABLE playlist_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  playlist_id INT NOT NULL,
  type ENUM('m3u', 'video', 'youtube', 'youtube_playlist', 'onedrive', 'image') DEFAULT 'm3u',
  title VARCHAR(255) NOT NULL,
  title_dv VARCHAR(255),
  description TEXT,
  description_dv TEXT,
  url TEXT NOT NULL,
  embed_url TEXT,
  duration_seconds INT DEFAULT 0,
  sound_enabled BOOLEAN DEFAULT true,
  qr_target_url VARCHAR(500),
  is_upsell BOOLEAN DEFAULT false,
  is_kids_friendly BOOLEAN DEFAULT true,
  is_staff_training BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  thumbnail_url VARCHAR(500),
  group_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  INDEX idx_playlist_type (playlist_id, type),
  INDEX idx_sort_order (playlist_id, sort_order)
);

-- Migrate existing M3U channels to playlist_items
-- (Keep old channels table for now)
```

#### 1.2 Feature Flags System
- [ ] Create `feature_flags` table
- [ ] Add backend API: `/api/features/enabled`
- [ ] Add frontend hook: `useFeatureFlag(name)`
- [ ] Default all new features to `false`

**Feature Flags:**
```javascript
const FEATURE_FLAGS = {
  'multi_type_player': false,
  'image_slides': false,
  'youtube_embed': false,
  'info_ticker': false,
  'qr_codes': false,
  'scenes': false,
  'multilang': false,
  'offline_cache': false,
  'slide_templates': false,
  'kids_mode': false,
  'upsell_logic': false
};
```

#### 1.3 Backend API Stubs
- [ ] `/api/playlist-items` (CRUD)
- [ ] `/api/ticker` (CRUD)
- [ ] `/api/scenes` (CRUD)
- [ ] `/api/templates` (CRUD)
- [ ] `/api/announcements` (CRUD)

**Estimated Time:** 3 weeks  
**Risk Level:** LOW (additive only)

---

## 📅 PHASE 2: Image Slides & QR Codes (Weeks 4-6)

**Goal:** First visual impact - food photos and QR codes

### Tasks

#### 2.1 Image Slide Support
- [ ] Add image upload endpoint (`/api/uploads/images`)
- [ ] Image optimization (resize, compress)
- [ ] CDN integration (optional)
- [ ] Add image type to playlist item creation UI
- [ ] Create `ImageSlide` component
  - Auto-advance after `duration_seconds`
  - Smooth transitions
  - Responsive sizing
  - Loading states

#### 2.2 QR Code Generation
- [ ] Install `qrcode.react` library
- [ ] Create `QRCodeSlide` component
- [ ] QR code styling (brand colors)
- [ ] Error correction level config
- [ ] Size/position presets
- [ ] QR + Image combination slides

#### 2.3 Player Enhancement
- [ ] Create `MultiTypePlayer` wrapper component
- [ ] Route to correct player based on `item.type`
- [ ] Add smooth transitions between types
- [ ] Handle edge cases (loading, errors)

#### 2.4 Admin UI
- [ ] "Add Image Slide" button in playlist editor
- [ ] Image upload with preview
- [ ] Duration picker (5s, 10s, 15s, 30s, 60s)
- [ ] QR code URL input
- [ ] Drag-and-drop reordering

**User Story:**
> As a café owner, I can upload photos of my food items and they will auto-rotate on the TV every 10 seconds, with QR codes linking to my online menu.

**Estimated Time:** 3 weeks  
**Risk Level:** MEDIUM (touches player)

---

## 📅 PHASE 3: Info Ticker & Announcements (Weeks 7-8)

**Goal:** Real-time messaging system

### Tasks

#### 3.1 Info Ticker Bar
- [ ] Create `TickerBar` component
- [ ] CSS animation (scrolling)
- [ ] Admin UI for managing messages
- [ ] Priority system (urgent messages first)
- [ ] Schedule messages (start/end date)
- [ ] Display-specific vs global messages

#### 3.2 Quick Announcements
- [ ] Create `AnnouncementOverlay` component
- [ ] Modal overlay on display
- [ ] Auto-dismiss after duration
- [ ] Remote control trigger
- [ ] Message templates (common phrases)

**Features:**
```javascript
// Ticker Messages
"🔥 Special: Tuna Sandwich + Drink - Only MVR 45!"
"⏰ Closing at 10 PM today"
"🕌 Prayer break: 12:30 - 1:00 PM"
"📱 Connect to WiFi: Guest-123"

// Quick Announcements
"We'll be back in 10 minutes"
"System issue - Cash only for now"
"Kitchen closing in 15 minutes"
```

**Estimated Time:** 2 weeks  
**Risk Level:** LOW (overlay component)

---

## 📅 PHASE 4: YouTube & Video Support (Weeks 9-13)

**Goal:** Multi-type content playback

### Tasks

#### 4.1 YouTube Integration
- [ ] `YouTubeEmbed` component
- [ ] Handle single videos
- [ ] Handle playlists
- [ ] Mute/unmute control
- [ ] Autoplay configuration
- [ ] Error handling (region restrictions)

#### 4.2 Direct MP4 Support
- [ ] `VideoPlayer` component (HTML5 `<video>`)
- [ ] Upload large files (chunked upload)
- [ ] File storage strategy (S3/local/CDN)
- [ ] Format conversion (ffmpeg)
- [ ] Streaming vs download
- [ ] Audio control

#### 4.3 OneDrive Integration
- [ ] `OneDriveEmbed` component
- [ ] Embed URL validation
- [ ] Permission handling
- [ ] Fallback for errors

#### 4.4 Player State Management
- [ ] Unified player controls
- [ ] Type switching
- [ ] Resource cleanup
- [ ] Memory leak prevention
- [ ] Mobile compatibility testing

**Challenges:**
- Large video files
- Network bandwidth
- Browser codec support
- Mobile vs desktop differences
- Memory management

**Estimated Time:** 5 weeks  
**Risk Level:** HIGH (complex player logic)

---

## 📅 PHASE 5: Advanced Scheduling (Weeks 14-16)

**Goal:** Time-based automation

### Tasks

#### 5.1 Enhanced Schedule Model
- [ ] Date range support (`date_start`, `date_end`)
- [ ] Specific dates (Eid, Ramadan, etc.)
- [ ] Priority system
- [ ] Conflict resolution
- [ ] Preview/dry-run mode

#### 5.2 Meal Period Automation
- [ ] Breakfast playlist (06:00-11:00)
- [ ] Lunch playlist (11:00-15:00)
- [ ] Dinner playlist (18:00-23:00)
- [ ] Auto-switch logic
- [ ] Manual override from remote

#### 5.3 Event Calendar
- [ ] Calendar UI for scheduling
- [ ] Recurring events
- [ ] Holiday templates
- [ ] Import/export schedules

**Use Cases:**
```
- Ramadan playlist (30 days)
- Eid special (specific dates)
- Friday specials (weekly)
- New Year countdown (one day)
- Birthday promotions (customer-specific)
```

**Estimated Time:** 3 weeks  
**Risk Level:** MEDIUM (scheduling logic)

---

## 📅 PHASE 6: Scenes & Modes (Weeks 17-19)

**Goal:** One-click configurations

### Tasks

#### 6.1 Scenes System
- [ ] Scene creation UI
- [ ] Scene templates
- [ ] One-click activation from remote
- [ ] Scene preview
- [ ] Scene scheduling

**Scene Types:**
```javascript
const SCENES = {
  normal_service: {
    playlist: 'main',
    ticker: true,
    upsell_frequency: 5,
    audio: true
  },
  busy_mode: {
    playlist: 'quick_items',
    ticker: true,
    upsell_frequency: 3,
    audio: false
  },
  closing_soon: {
    playlist: 'desserts',
    ticker: true,
    upsell_frequency: 10,
    audio: true
  },
  match_night: {
    playlist: 'sports',
    ticker: false,
    upsell_frequency: 0,
    audio: true
  }
};
```

#### 6.2 Kids/Family Mode
- [ ] Mark playlists as kids-friendly
- [ ] Filter content
- [ ] Softer UI theme
- [ ] Remote toggle
- [ ] Age-appropriate content only

#### 6.3 Staff Training Mode
- [ ] Private training playlists
- [ ] Admin-only access
- [ ] After-hours activation
- [ ] Progress tracking

**Estimated Time:** 3 weeks  
**Risk Level:** MEDIUM (multiple subsystems)

---

## 📅 PHASE 7: Slide Templates & CMS (Weeks 20-24)

**Goal:** Visual content creation

### Tasks

#### 7.1 Template Engine
- [ ] Template design system
- [ ] Variable placeholders
- [ ] Preview generation
- [ ] Export as image

**Template Types:**
1. **Image + Title + Price**
   ```
   [Food Photo]
   Tuna Sandwich
   MVR 45
   ```

2. **Text-Only Notice**
   ```
   CLOSING TIME
   10:00 PM Tonight
   ```

3. **Offer Card**
   ```
   🔥 SPECIAL OFFER
   Buy 1 Get 1 Free
   All Smoothies
   Valid Today Only
   ```

4. **QR Code Combo**
   ```
   [QR Code] [Menu Photo]
   Scan for Full Menu
   ```

#### 7.2 Slide Builder UI
- [ ] Drag-and-drop editor
- [ ] Font picker
- [ ] Color picker
- [ ] Brand color presets
- [ ] Real-time preview
- [ ] Save as template

#### 7.3 Server-Side Rendering
- [ ] Node.js canvas for image generation
- [ ] Puppeteer for HTML → image
- [ ] Caching generated slides
- [ ] Image optimization

#### 7.4 Upsell Logic
- [ ] Mark items as upsell
- [ ] Insertion frequency config
- [ ] Smart positioning (every N items)
- [ ] A/B testing framework

**Estimated Time:** 5 weeks  
**Risk Level:** MEDIUM (new subsystem)

---

## 📅 PHASE 8: Multi-Language Support (Weeks 25-28)

**Goal:** English + Dhivehi

### Tasks

#### 8.1 Backend i18n
- [ ] Add `_dv` columns to all content tables
- [ ] Language API endpoints
- [ ] Translation management UI
- [ ] Fallback logic (EN if DV missing)

#### 8.2 Frontend i18n
- [ ] Install `react-i18next`
- [ ] Extract all hardcoded strings
- [ ] Create translation files
- [ ] Language switcher UI
- [ ] Persistent language preference

#### 8.3 Dhivehi Support
- [ ] Load Dhivehi fonts (Thaana)
- [ ] RTL text direction handling
- [ ] Input method testing
- [ ] Display testing on different browsers

#### 8.4 Per-Screen Language Config
- [ ] English only
- [ ] Dhivehi only
- [ ] Alternating (EN → DV → EN)
- [ ] Schedule-based language switch

**Content to Translate:**
- All UI labels
- All playlist titles/descriptions
- All ticker messages
- All announcement templates
- All slide templates
- All error messages
- All tooltips/help text

**Estimated Time:** 4 weeks  
**Risk Level:** HIGH (affects everything)

---

## 📅 PHASE 9: Offline Cache & Polish (Weeks 29-32)

**Goal:** Production-ready system

### Tasks

#### 9.1 Offline Content Caching
- [ ] Service worker cache strategy
- [ ] Selective content caching
- [ ] Cache size limits
- [ ] Cache eviction policy
- [ ] Background sync

**What to Cache:**
- ✅ Images (food photos, slides)
- ✅ MP4 videos (short promo videos)
- ❌ HLS streams (too large, live content)
- ❌ YouTube (can't cache)

#### 9.2 Sold-Out Indicators
- [ ] Mark items as sold out
- [ ] Grey out on display
- [ ] Badge/overlay
- [ ] Quick toggle from remote
- [ ] Auto-reset at start of day

#### 9.3 Review Prompts
- [ ] "Review Us" slide template
- [ ] QR code to Google reviews
- [ ] Trigger: after meal periods
- [ ] Frequency control

#### 9.4 Per-Screen Profiles
- [ ] Unique config per display
- [ ] Default scene
- [ ] Default language
- [ ] Theme customization
- [ ] Volume presets

#### 9.5 Analytics Enhancement
- [ ] Track slide views
- [ ] Track QR code scans
- [ ] Content effectiveness metrics
- [ ] A/B testing results
- [ ] Export reports

#### 9.6 Performance Optimization
- [ ] Lazy loading
- [ ] Image CDN
- [ ] Database indexing
- [ ] Query optimization
- [ ] Memory profiling
- [ ] Mobile responsiveness audit

#### 9.7 Final Polish
- [ ] Cursor hiding in kiosk mode
- [ ] Exit shortcuts (Ctrl+Shift+Esc)
- [ ] Loading skeletons everywhere
- [ ] Error boundaries
- [ ] Empty states
- [ ] Confirmation modals
- [ ] Accessibility audit (WCAG)
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Documentation update

**Estimated Time:** 4 weeks  
**Risk Level:** LOW (refinement)

---

## 🧪 Testing Strategy

### Unit Testing
- Jest for backend utilities
- React Testing Library for components
- Coverage target: 70%+

### Integration Testing
- API endpoint tests
- Database migration tests
- Player type switching tests

### E2E Testing
- Playwright for critical flows
- Display pairing flow
- Content playback flow
- Remote control flow
- Admin content creation flow

### User Acceptance Testing
- Beta program with 3-5 cafés
- Feedback collection system
- Bug reporting process
- Feature request tracking

### Performance Testing
- Load testing (50 concurrent displays)
- Video playback stress test
- Memory leak detection
- Network throttling tests

---

## 🔄 Rollback Strategy

### Version Control
- Git branches per phase
- Tag each release (`v2.0.0`, `v2.1.0`, etc.)
- Keep `main` branch stable
- Development on `feature/*` branches

### Database Rollback
- Save schema snapshot before each phase
- Keep old tables alongside new ones
- Feature flags to switch between old/new
- Rollback scripts ready

### Emergency Rollback
```bash
# Stop new version
pm2 stop bake-grill-tv

# Restore database
mysql -u user -p database < backup-phase-X.sql

# Checkout previous version
git checkout v1.0.8
npm install
npm run build

# Restart
pm2 start bake-grill-tv
```

### Rollback Triggers
- Critical bug in production
- Performance degradation >50%
- Data corruption
- Security vulnerability
- User rejection (>50% negative feedback)

---

## ⚠️ Risk Assessment

### High-Risk Items
| Risk | Mitigation |
|------|------------|
| Player refactor breaks HLS | Keep old player alongside new, use feature flag |
| Database migration fails | Test on staging, have rollback script |
| Large video files crash browser | Implement chunked loading, memory limits |
| Service worker breaks app | Clear cache endpoint, emergency disable |
| Multi-language breaks UI | Fallback to English, test thoroughly |

### Medium-Risk Items
| Risk | Mitigation |
|------|------------|
| Performance degradation | Load testing, profiling, optimization |
| Mobile compatibility | Device testing lab, progressive enhancement |
| Cache storage full | Eviction policy, user notification |
| YouTube embed blocked | Fallback message, skip to next |

### Low-Risk Items
| Risk | Mitigation |
|------|------------|
| Image upload fails | Retry logic, error messages |
| Ticker animation stutters | CSS optimization, fallback to static |
| QR code won't scan | Size adjustment, error correction |

---

## 📊 Success Metrics

### Technical Metrics
- [ ] **Uptime:** 99.9%+
- [ ] **Load time:** <3s for player
- [ ] **Memory usage:** <500MB per display
- [ ] **API response time:** <200ms (p95)
- [ ] **Build time:** <2 minutes
- [ ] **Test coverage:** >70%

### User Metrics
- [ ] **Pairing success rate:** >95%
- [ ] **Content upload success:** >98%
- [ ] **User satisfaction:** >4.5/5
- [ ] **Feature adoption:** >60% use new features
- [ ] **Bug reports:** <10 per month
- [ ] **Support tickets:** <20 per month

### Business Metrics
- [ ] **Active displays:** 20+ (400% growth)
- [ ] **Content uploads:** 100+ slides/month
- [ ] **QR code scans:** 500+ per week
- [ ] **User engagement:** 50% weekly active users

---

## 👥 Team & Resources

### Required Skills
- Full-stack developer (you + assistant)
- UI/UX designer (optional, can use Figma templates)
- QA tester (can be you)
- Content creator (café owner/staff)

### Tools & Services
- **Version Control:** GitHub
- **Project Management:** GitHub Projects
- **Testing:** Jest, Playwright
- **Monitoring:** Sentry (error tracking)
- **Analytics:** Mixpanel or PostHog
- **CDN:** Cloudflare (if needed)
- **File Storage:** AWS S3 or local (start local)

---

## 💰 Cost Estimate

### Development Time
- **Developer hours:** 1000-1500 hours
- **At $50/hour:** $50,000 - $75,000
- **Or:** 6-12 months if doing yourself

### Infrastructure
- **Hosting:** Current setup (no change)
- **CDN:** $10-50/month (optional)
- **Storage:** $5-20/month (images/videos)
- **Monitoring:** $20/month (Sentry)
- **Total:** ~$50/month additional

### One-Time Costs
- **Design assets:** $0-500 (if hiring designer)
- **Testing devices:** $0 (use what you have)
- **Fonts/licenses:** $0 (using free fonts)

---

## 📅 Timeline Summary

| Phase | Duration | Risk | Deliverable |
|-------|----------|------|-------------|
| 1. Foundation | 3 weeks | LOW | Database + Feature Flags |
| 2. Images & QR | 3 weeks | MEDIUM | Image slides, QR codes |
| 3. Ticker & Announcements | 2 weeks | LOW | Messaging system |
| 4. YouTube & Video | 5 weeks | HIGH | Multi-type player |
| 5. Advanced Scheduling | 3 weeks | MEDIUM | Date-based schedules |
| 6. Scenes & Modes | 3 weeks | MEDIUM | One-click configs |
| 7. Templates & CMS | 5 weeks | MEDIUM | Visual editor |
| 8. Multi-Language | 4 weeks | HIGH | EN + DV support |
| 9. Offline & Polish | 4 weeks | LOW | Production ready |
| **TOTAL** | **32 weeks** | **8 months** | **Complete System** |

---

## ✅ Next Steps

### Immediate Actions (This Week)
1. ✅ **Backup created:** `tv-backup-20251121-232349`
2. [ ] **Review this plan** with stakeholders
3. [ ] **Get approval** to proceed
4. [ ] **Set up project board** (GitHub Projects)
5. [ ] **Create Phase 1 branch:** `feature/phase-1-foundation`

### Phase 1 Kickoff (Next Week)
1. [ ] Create database migration files
2. [ ] Implement feature flags system
3. [ ] Set up testing framework
4. [ ] Create API stubs
5. [ ] Begin documentation

### Communication Plan
- **Weekly:** Progress update
- **Bi-weekly:** Demo to users
- **Monthly:** Review & adjust plan
- **Ad-hoc:** Emergency issues

---

## 📝 Appendix

### A. Backup Locations
- **Full System:** `/Users/vigani/Website/tv-backup-20251121-232349`
- **Database:** Snapshot before each phase
- **Git Tags:** Each phase tagged

### B. Documentation
- User Guide (updated per phase)
- API Documentation (auto-generated)
- Deployment Guide (updated)
- Troubleshooting Guide (living document)

### C. Contact & Support
- **Developer:** You + AI Assistant
- **Users:** Café owners (beta testers)
- **Emergency:** Rollback procedure documented

---

**Document Version:** 1.0  
**Last Updated:** November 21, 2025  
**Next Review:** After Phase 1 completion

---

## 🎯 THE PROMISE

**We will implement 100% of the requested features.**

**We will NOT break existing functionality.**

**We will deliver in phases, with testing at each step.**

**We will succeed.**

Let's build this. 🚀

