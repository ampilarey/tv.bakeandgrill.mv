# UI/UX Design System

## 🎨 Brand Identity: Bake and Grill

### Color Palette

#### Primary Colors
```css
/* Warm Amber/Orange - Evokes fire, warmth, grilling */
--primary-500: #F59E0B; /* Main brand color */
--primary-600: #EA580C; /* Hover states, emphasis */
--primary-700: #C2410C; /* Active states */
--primary-400: #FBBF24; /* Lighter accent */

/* Rich Brown/Copper - Baking, warmth */
--accent-700: #92400E; /* Deep brown */
--accent-800: #78350F; /* Darker copper */
--accent-600: #A16207; /* Medium brown */

/* Golden Yellow - Highlights */
--highlight-400: #FCD34D; /* Active states, badges */
--highlight-500: #F59E0B; /* Icons, links */
```

#### Neutral Colors (Dark Theme)
```css
/* Backgrounds */
--slate-950: #020617; /* Darkest - page background */
--slate-900: #0F172A; /* Dark - cards, modals */
--slate-800: #1E293B; /* Medium dark - hover states */
--slate-700: #334155; /* Borders, dividers */

/* Text */
--slate-100: #F1F5F9; /* Primary text */
--slate-200: #E2E8F0; /* Secondary text */
--slate-300: #CBD5E1; /* Tertiary text, placeholders */
--slate-400: #94A3B8; /* Disabled text */
```

#### Semantic Colors
```css
/* Success */
--green-500: #10B981;
--green-600: #059669;

/* Error/Danger */
--red-500: #EF4444;
--red-600: #DC2626;

/* Warning */
--yellow-500: #EAB308;
--yellow-600: #CA8A04;

/* Info */
--blue-500: #3B82F6;
--blue-600: #2563EB;
```

---

## 📱 Layout Structure

### Desktop Layout (≥768px)
```
┌─────────────────────────────────────────────────────────┐
│                      NAVBAR                             │
│  [Logo] [Playlist ▼] [Search]        [User] [Settings] │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│   SIDEBAR    │         VIDEO PLAYER                    │
│              │                                          │
│  [Filters]   │    [Currently Playing Video]            │
│  [Groups]    │                                          │
│              │    [Controls: Play/Pause/Volume/Full]   │
│  [Channels]  │                                          │
│   • BBC      │    ────────────────────────────────     │
│   • CNN      │                                          │
│   • ESPN     │    CHANNEL INFO                         │
│   • ...      │    📺 BBC News HD                        │
│              │    📂 News • ⭐ Favorite                 │
│  [Recently]  │                                          │
│   ⏱ Sky     │    [Share] [Favorite] [Next]            │
│   ⏱ HBO     │                                          │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
  320px            Flexible (flex-1)
```

### Mobile Layout (<768px)
```
┌─────────────────────────┐
│       NAVBAR            │
│  [Logo]     [Menu ☰]    │
├─────────────────────────┤
│                         │
│    VIDEO PLAYER         │
│   [Playing Video]       │
│                         │
│   [Controls]            │
│                         │
├─────────────────────────┤
│  📺 BBC News HD         │
│  📂 News • ⭐           │
├─────────────────────────┤
│  [Search] [Filter ▼]    │
├─────────────────────────┤
│  CHANNEL LIST           │
│  ┌─────────────────┐   │
│  │ 📺 BBC News     │   │
│  │ News            │   │
│  └─────────────────┘   │
│  ┌─────────────────┐   │
│  │ 🎾 ESPN Sports  │   │
│  │ Sports          │   │
│  └─────────────────┘   │
│         ...             │
└─────────────────────────┘
```

### Display/Kiosk Mode
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│         FULLSCREEN VIDEO            │
│                                     │
│                                     │
│                                     │
│  [Subtle branding corner logo]      │
└─────────────────────────────────────┘
```

---

## 🧩 Component Design

### 1. Navbar Component

**Desktop:**
```
┌─────────────────────────────────────────────────────────┐
│ [🍞 Logo]  [My Channels ▼]  [🔍 Search...]  [@Sarah ▼] │
└─────────────────────────────────────────────────────────┘
```

**Mobile:**
```
┌─────────────────────────┐
│ [🍞 Logo]     [☰ Menu]  │
└─────────────────────────┘
```

**Specifications:**
- Height: 64px
- Background: `--slate-900`
- Border bottom: 1px `--slate-700`
- Logo: 40px × 40px, link to dashboard
- Playlist dropdown: Shows all user playlists
- Search: Expands on focus (desktop), separate page (mobile)
- User menu: Profile, Settings, Logout

---

### 2. Channel List Item

**List View:**
```
┌──────────────────────────────────────┐
│ [Logo] BBC News HD              ⭐   │
│  40px  News • 1080p                  │
└──────────────────────────────────────┘
```

**Grid View:**
```
┌────────────────┐
│                │
│   [Logo 80px]  │
│                │
│  BBC News HD   │
│  News • ⭐     │
└────────────────┘
```

**Specifications:**
- Padding: 12px 16px
- Hover: Background `--slate-800`
- Active/Selected: Border-left 4px `--primary-500`, Background `--slate-800`
- Logo: Rounded-lg, 40px (list) or 80px (grid)
- Star icon: `--highlight-400` when favorited, `--slate-400` when not
- Truncate long names with ellipsis
- Click anywhere to play channel

---

### 3. Video Player

**Structure:**
```
┌─────────────────────────────────────┐
│                                     │
│        <video> Element              │
│         16:9 Aspect Ratio           │
│                                     │
│  [Loading Spinner] (when buffering) │
│                                     │
├─────────────────────────────────────┤
│  ▶️ ⏸️  ━━━●━━━  🔊 ━●━  ⛶  □     │
│  Play   Timeline   Volume  Full PiP │
└─────────────────────────────────────┘
```

**Specifications:**
- Aspect ratio: 16:9 (responsive)
- Background: Black `#000000`
- Controls: Auto-hide after 3 seconds (fullscreen)
- Controls bar: Background `rgba(0, 0, 0, 0.7)`, height 48px
- Buttons: Min touch target 48px × 48px
- Volume slider: 0-100, persists in localStorage
- Timeline: Shows current time / total duration
- Fullscreen: Native browser API
- PiP: Native browser API (if supported)

**States:**
- **Loading:** Spinner + "Connecting to stream..."
- **Error:** Red icon + "Unable to play" + [Retry] button
- **Playing:** Normal controls
- **Buffering:** Spinner overlay

---

### 4. Search Bar

**Desktop:**
```
┌────────────────────────────────┐
│ 🔍  Search channels...    ✕    │
└────────────────────────────────┘
```

**Mobile (Expanded):**
```
┌────────────────────────────────┐
│ ←  🔍  Search channels...  ✕   │
├────────────────────────────────┤
│  Results:                       │
│  ┌──────────────────────────┐ │
│  │ BBC News HD              │ │
│  └──────────────────────────┘ │
│  ┌──────────────────────────┐ │
│  │ BBC World News           │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

**Specifications:**
- Height: 40px
- Border: 1px `--slate-700`
- Border-radius: 8px
- Focus: Border `--primary-500`, Glow shadow
- Real-time filter (debounced 300ms)
- Keyboard shortcut: Ctrl/Cmd + K
- Clear button (X) appears when text entered
- Highlight matching text in results

---

### 5. Filter Bar (Category Pills)

```
┌──────────────────────────────────────────────────┐
│ [All] [News] [Sports] [Movies] [Entertainment]… │
└──────────────────────────────────────────────────┘
```

**Specifications:**
- Horizontal scroll on mobile
- Pills: Padding 8px 16px, Border-radius 20px
- Inactive: Background `--slate-800`, Text `--slate-300`
- Active: Background `--primary-500`, Text white
- Count badge: `News (25)` in `--slate-400`
- Smooth scroll animation

---

### 6. Favorite Button

**Unfavorited:**
```
☆ (Outline star, --slate-400)
```

**Favorited:**
```
⭐ (Solid star, --highlight-400)
```

**Specifications:**
- Size: 24px × 24px (40px touch target)
- Hover: Scale 1.1, Rotate 15deg
- Click: Scale animation (0.9 → 1.1 → 1)
- Tooltip: "Add to favorites" / "Remove from favorites"

---

### 7. Modal/Dialog

**Structure:**
```
     ┌────────────────────────────┐
     │  Add New Playlist      ✕   │
     ├────────────────────────────┤
     │                            │
     │  Name:                     │
     │  [________________]        │
     │                            │
     │  M3U URL:                  │
     │  [________________]        │
     │                            │
     │  Description (optional):   │
     │  [________________]        │
     │  [________________]        │
     │                            │
     │         [Cancel] [Add]     │
     └────────────────────────────┘
```

**Specifications:**
- Background overlay: `rgba(0, 0, 0, 0.5)`
- Modal: Max-width 500px, Background `--slate-900`
- Border-radius: 12px
- Padding: 24px
- Close button: Top-right, 40px × 40px
- Buttons: Primary button `--primary-500`, Secondary `--slate-700`
- ESC key to close
- Click outside to close
- Focus trap (accessibility)

---

### 8. Loading Spinner

```
    ⚙️ (Rotating)
    Loading...
```

**Specifications:**
- Icon: 40px × 40px
- Color: `--primary-500`
- Animation: Rotate 360deg, 1s linear infinite
- Text: `--slate-300`, 14px
- Center aligned

---

### 9. Toast Notification

```
┌────────────────────────────┐
│ ✅ Added to favorites!     │
└────────────────────────────┘
```

**Specifications:**
- Position: Bottom-right (desktop), Bottom-center (mobile)
- Background: `--slate-800`
- Border-left: 4px (Success: `--green-500`, Error: `--red-500`)
- Padding: 12px 16px
- Border-radius: 8px
- Box-shadow: Large shadow
- Auto-dismiss: 3 seconds
- Slide-in animation from bottom
- Stack multiple toasts vertically

---

### 10. Admin Dashboard Card

```
┌─────────────────────────────┐
│  Total Users                │
│                             │
│       45                    │
│                             │
│  +5 this week               │
└─────────────────────────────┘
```

**Specifications:**
- Background: `--slate-900`
- Border: 1px `--slate-700`
- Border-radius: 12px
- Padding: 24px
- Hover: Border `--primary-500`, Lift shadow
- Number: 36px, Bold, `--slate-100`
- Label: 14px, `--slate-400`
- Subtitle: 12px, `--green-500` (positive) or `--red-500` (negative)

---

## 🎭 Interaction Patterns

### Hover States
- **Buttons:** Lighten 10%, scale 1.02
- **Channel items:** Background `--slate-800`
- **Cards:** Lift shadow (0 → 4px), border color change

### Active/Focus States
- **Inputs:** Border `--primary-500`, glow shadow
- **Buttons:** Darken 10%, scale 0.98
- **Links:** Underline, color `--primary-400`

### Loading States
- **Skeleton loaders** for channel list (3 rows)
- **Spinner** for video loading
- **Progress bars** for uploads (0-100%)

### Error States
- **Input errors:** Border `--red-500`, helper text below
- **Stream errors:** Red icon, descriptive message, [Retry] button
- **API errors:** Toast notification with error message

### Empty States
- **No channels:** Illustration + "No channels found" + [Add Playlist] button
- **No favorites:** "You haven't favorited any channels yet" + star icon
- **No playlists:** "Get started by adding your first playlist"

---

## 📐 Spacing System (Tailwind)

```css
/* Spacing Scale */
--space-1: 4px;   /* gap-1, p-1, m-1 */
--space-2: 8px;   /* gap-2, p-2, m-2 */
--space-3: 12px;  /* gap-3, p-3, m-3 */
--space-4: 16px;  /* gap-4, p-4, m-4 (default) */
--space-6: 24px;  /* gap-6, p-6, m-6 */
--space-8: 32px;  /* gap-8, p-8, m-8 */
--space-12: 48px; /* gap-12, p-12, m-12 */
```

**Usage:**
- Buttons: `px-6 py-3` (24px horizontal, 12px vertical)
- Cards: `p-6` (24px all around)
- Sections: `py-8` or `py-12` (32-48px vertical)
- Channel list items: `p-3` (12px)

---

## 🔤 Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Font Sizes
```css
/* Headings */
--text-4xl: 36px;  /* Page titles */
--text-3xl: 30px;  /* Section headers */
--text-2xl: 24px;  /* Card titles */
--text-xl: 20px;   /* Subheadings */
--text-lg: 18px;   /* Large body */

/* Body */
--text-base: 16px; /* Default body text */
--text-sm: 14px;   /* Secondary text */
--text-xs: 12px;   /* Captions, labels */
```

### Font Weights
```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights
```css
--leading-tight: 1.25;   /* Headings */
--leading-normal: 1.5;   /* Body text */
--leading-relaxed: 1.75; /* Descriptions */
```

---

## 🎬 Animations

### Transitions
```css
/* Default */
transition: all 0.2s ease;

/* Hover/Focus */
transition: all 0.15s ease-in-out;

/* Page transitions */
transition: all 0.3s ease-in-out;
```

### Keyframe Animations

**Fade In:**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Slide Up:**
```css
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

**Spin (Loading):**
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

**Pulse (Favorite star):**
```css
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
```

---

## ♿ Accessibility

### Keyboard Navigation
- **Tab order:** Logical flow (navbar → sidebar → player → controls)
- **Focus indicators:** 2px outline `--primary-500`, 2px offset
- **Skip links:** "Skip to content" (visible on focus)

### Screen Readers
- **ARIA labels:** All buttons, inputs, icons
- **Alt text:** All images, logos
- **Role attributes:** `role="button"`, `role="navigation"`, etc.
- **Live regions:** `aria-live="polite"` for toasts, errors

### Color Contrast
- **Text on dark background:** Minimum 4.5:1 contrast (WCAG AA)
- **Primary text (`--slate-100`) on `--slate-900`:** ✅ Pass
- **Links (`--primary-500`):** ✅ Pass
- **Buttons:** High contrast backgrounds

### Touch Targets
- **Minimum size:** 48px × 48px (mobile)
- **Spacing:** 8px between interactive elements
- **Visible focus states** for all interactive elements

---

## 📱 Responsive Breakpoints

```css
/* Tailwind defaults */
sm:  640px  /* Small tablets */
md:  768px  /* Tablets, sidebar appears */
lg:  1024px /* Desktop */
xl:  1280px /* Large desktop */
2xl: 1536px /* Extra large */
```

### Usage:
```jsx
<div className="
  flex flex-col     /* Mobile: stack vertically */
  md:flex-row       /* Tablet+: side by side */
  h-screen
">
  <aside className="
    w-full          /* Mobile: full width */
    md:w-80         /* Desktop: 320px fixed */
  ">
    {/* Sidebar */}
  </aside>
  <main className="flex-1">
    {/* Player */}
  </main>
</div>
```

---

## 🖼️ Image Handling

### Channel Logos
- **Lazy load:** `loading="lazy"`
- **Fallback:** Show channel initials in colored circle
- **Broken images:** Replace with placeholder icon
- **Optimization:** Serve from CDN if possible

### PWA Icons
- **Sizes needed:**
  - 192×192 (minimum)
  - 512×512 (recommended)
  - 180×180 (iOS)
  - 32×32 (favicon)
- **Format:** PNG with transparency
- **Design:** Simple, recognizable at small sizes

---

## 🎨 Design Tokens (Tailwind Config)

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#EA580C',
          700: '#C2410C',
        },
        accent: {
          600: '#A16207',
          700: '#92400E',
          800: '#78350F',
        },
        highlight: {
          400: '#FCD34D',
          500: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
};
```

---

## 📋 Component Library Summary

✅ Navbar (desktop & mobile)  
✅ Channel list item (list & grid)  
✅ Video player with controls  
✅ Search bar with autocomplete  
✅ Filter pills (categories)  
✅ Favorite button (animated)  
✅ Modals/dialogs  
✅ Loading spinners  
✅ Toast notifications  
✅ Admin dashboard cards  
✅ Forms (inputs, selects, buttons)  
✅ Empty states  
✅ Error states  
✅ Skeleton loaders  

---

**Next:** Deployment Guide

