/**
 * Test Checklist Page
 * Interactive step-by-step verification for all Bake & Grill TV features.
 * State is persisted in localStorage so progress survives page reloads.
 */
import { useState, useEffect } from 'react';
import Button from '../../components/common/Button';

const SECTIONS = [
  {
    title: 'Auth & Access',
    icon: '🔐',
    items: [
      'Can log in with admin credentials',
      'Wrong password is rejected with an error message',
      'Logging out clears session and redirects to login',
      'Admin-only pages redirect non-admin users',
      'Login events appear in System Health → Login Log',
    ],
  },
  {
    title: 'Display Pairing',
    icon: '📺',
    items: [
      'Navigating to /pair shows pairing screen with code',
      'Entering the code in Display Management pairs the TV',
      'Paired display appears in Display Management list',
      'Pairing expires after the configured window',
      'Paired display sends heartbeats (check Monitoring)',
    ],
  },
  {
    title: 'IPTV Playback',
    icon: '📡',
    items: [
      'Stream playlist loads in KioskMode (/kiosk?token=…)',
      'Video plays without constant buffering',
      'Switching channels works without crash',
      'Mute / unmute command works from Monitoring',
      'Fallback screen shown when all channels fail',
    ],
  },
  {
    title: 'Media Playlists (Slideshow)',
    icon: '🖼',
    items: [
      'Can upload images/videos in Media Playlists',
      'Slideshow plays correctly in kiosk with display_type = media',
      'Preview lightbox works in Media Playlist admin',
      'Day/Night playlist switches at configured times',
      'Content Schedules override playlist at correct times',
    ],
  },
  {
    title: 'Smart Overlay',
    icon: '💬',
    items: [
      'Bottom bar ticker shows messages when overlay_mode = bottom_bar',
      'Popup card appears every N seconds in bottom_bar_popup mode',
      'Split-right panel shows promo cards when mode = split_right',
      'overlay_safe_area = sports moves popup away from corners',
      'Disabling overlay_mode = none hides all overlays instantly',
    ],
  },
  {
    title: 'Broadcast & Emergency',
    icon: '🚨',
    items: [
      'Broadcast text message appears as ticker on all TVs within 2-3 seconds',
      'Broadcast can be cancelled from Display Management',
      'Emergency Override pushes playlist to all/zone/specific display',
      'Override auto-expires after configured duration',
      'Cancel Override removes it from all displays immediately',
    ],
  },
  {
    title: 'Zones & Groups',
    icon: '🗂',
    items: [
      'Can create a zone and assign displays to it',
      'Zone card shows member displays',
      'Emergency override targeting a zone only affects that zone',
      'Bulk display edit applies to all selected displays',
    ],
  },
  {
    title: 'Channel Health',
    icon: '🏥',
    items: [
      'Channel Health page shows live/dead/unknown counts',
      'Green dot = live, red dot = dead after first check',
      '"Re-check All" triggers a fresh check within 30 minutes',
      'Dead channels are filtered using the dead filter',
      'Search bar finds channels by name',
    ],
  },
  {
    title: 'Monitoring Dashboard',
    icon: '📊',
    items: [
      'All paired displays appear as tiles',
      'Green = online (heartbeat < 90s), grey = offline',
      '"Last seen" and "Now Playing" show correct data',
      'Clicking a tile opens quick-action drawer',
      'Remote Mute/Fullscreen/Refresh commands work',
      'Offline notifications appear in the bell icon',
    ],
  },
  {
    title: 'WiFi QR & Auto-Reboot',
    icon: '📶',
    items: [
      'Enable show_wifi_qr on a display and set SSID/password',
      'QR code appears in the correct corner on the TV',
      'Scanning the QR connects to WiFi correctly',
      'Set auto_reboot_time and verify display reloads at that time',
      'Disabling show_wifi_qr hides the QR immediately on next verify',
    ],
  },
  {
    title: 'Scene Presets',
    icon: '🎬',
    items: [
      'Save current state creates a scene with correct display count',
      'Apply scene restores all display settings',
      'Update re-snapshots current state into existing scene',
      'Delete removes scene from list',
      'Scene card shows saved date and creator email',
    ],
  },
  {
    title: 'System Health & Logs',
    icon: '🖥',
    items: [
      'System Health page shows server uptime and DB latency',
      'Memory and CPU load are shown',
      'Export Config downloads a valid JSON backup file',
      'Login Log shows recent logins with IP addresses',
      'Active override / broadcast counts are accurate',
    ],
  },
  {
    title: 'Kiosk Lockdown',
    icon: '🔒',
    items: [
      'Cursor hides after 4 seconds of inactivity',
      'F5 / F11 / browser shortcuts are blocked in kiosk',
      'Kiosk auto-reconnects after network drop',
      'Kiosk shows branded fallback screen when no content',
    ],
  },
  {
    title: 'Deployment & Security',
    icon: '🚀',
    items: [
      'Git pull on cPanel server completes without errors',
      'cPanel Node.js app restarts cleanly',
      'No secrets in git history (no .env committed)',
      'CSP headers are present in server responses',
      'Rate limiting rejects repeated failed login attempts',
    ],
  },
];

const STORAGE_KEY = 'test_checklist_v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export default function TestChecklist() {
  const [checked, setChecked] = useState(loadState);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked]);

  function toggle(key) {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function resetAll() {
    if (window.confirm('Reset all checkboxes?')) setChecked({});
  }

  const total   = SECTIONS.reduce((s, sec) => s + sec.items.length, 0);
  const done    = Object.values(checked).filter(Boolean).length;
  const pct     = Math.round((done / total) * 100);

  const statusColor = pct === 100 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-tv-text">Test Checklist</h1>
          <p className="text-sm text-tv-textMuted mt-1">Verify all features before going live or after a deployment.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className={`text-3xl font-bold ${statusColor}`}>{pct}%</span>
            <p className="text-xs text-tv-textMuted">{done}/{total} passed</p>
          </div>
          <Button variant="ghost" onClick={resetAll}>Reset</Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-tv-bgSoft rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'pending', 'done'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-tv-accent text-white' : 'bg-tv-bgSoft text-tv-textMuted hover:text-tv-text'}`}
          >
            {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Passed'}
          </button>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {SECTIONS.map(section => {
          const visibleItems = section.items.filter(item => {
            const key = `${section.title}::${item}`;
            if (filter === 'done')    return !!checked[key];
            if (filter === 'pending') return !checked[key];
            return true;
          });
          if (!visibleItems.length) return null;

          const secDone  = section.items.filter(item => checked[`${section.title}::${item}`]).length;
          const secTotal = section.items.length;
          const allDone  = secDone === secTotal;

          return (
            <div key={section.title} className="bg-tv-bgSoft border border-tv-borderSubtle rounded-xl overflow-hidden">
              <div className={`px-4 py-3 flex items-center justify-between border-b border-tv-borderSubtle ${allDone ? 'bg-green-900/20' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{section.icon}</span>
                  <h3 className="font-semibold text-tv-text">{section.title}</h3>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allDone ? 'bg-green-500/20 text-green-400' : 'bg-tv-borderSubtle text-tv-textMuted'}`}>
                  {secDone}/{secTotal}
                </span>
              </div>
              <ul className="divide-y divide-tv-borderSubtle">
                {visibleItems.map(item => {
                  const key  = `${section.title}::${item}`;
                  const isDone = !!checked[key];
                  return (
                    <li key={item}>
                      <label className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${isDone ? 'bg-green-900/10' : 'hover:bg-tv-bg'}`}>
                        <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 accent-green-500 shrink-0"
                          checked={isDone}
                          onChange={() => toggle(key)}
                        />
                        <span className={`text-sm leading-snug ${isDone ? 'line-through text-tv-textMuted' : 'text-tv-text'}`}>
                          {item}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {pct === 100 && (
        <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="text-lg font-bold text-green-400">All checks passed!</h3>
          <p className="text-sm text-green-300/70 mt-1">Bake &amp; Grill TV is ready to go live.</p>
        </div>
      )}
    </div>
  );
}
