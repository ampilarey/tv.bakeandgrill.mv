import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Hls from 'hls.js';
import { QRCodeSVG } from 'qrcode.react';
import SlideshowPlayer from '../components/SlideshowPlayer';
import AnnouncementOverlay from '../components/AnnouncementOverlay';
import BottomBarOverlay  from '../components/overlays/BottomBarOverlay';
import PopupCardOverlay  from '../components/overlays/PopupCardOverlay';
import SplitRightPanel   from '../components/overlays/SplitRightPanel';
import { getStreamUrl, isHlsStream, PLAYBACK_TIMEOUT_MS } from '../hooks/usePlaybackGuard';
import { APP_VERSION } from '../utils/version';

const HEARTBEAT_INTERVAL_MS    = 25_000;
const COMMAND_POLL_FAST_MS     = 2_000;
const COMMAND_POLL_SLOW_MS     = 25_000;
const SSE_RECONNECT_BASE_MS    = 1_000;
const SSE_RECONNECT_MAX_MS     = 30_000;
const PROCESSED_COMMANDS_MAX   = 200;
const CURSOR_HIDE_DELAY_MS     = 3_000; // hide cursor after 3 s idle
const RETRY_INTERVAL_MS        = 10_000;
const CACHE_KEY                = 'kiosk_cache_v1';
const CACHE_MAX_AGE_MS         = 24 * 60 * 60 * 1000; // 24 h

function immersiveStorageKey(token) {
  return `kiosk_immersive_${token || 'default'}`;
}

function readStoredImmersive(token) {
  try {
    const v = localStorage.getItem(immersiveStorageKey(token));
    if (v === '0') return false;
    if (v === '1') return true;
  } catch { /* ignore */ }
  return false;
}

/** Prefer health-tested channels; fall back to any stream with a URL. */
function pickPlayableChannel(channels) {
  const list = channels || [];
  const strict = list.filter((c) => c.play_status === 'playable');
  if (strict.length) return strict[0];
  const soft = list.filter((c) => c.playback_url || c.url);
  return soft[0] || null;
}

/** Use admin-configured default channel, else first playable. */
function pickStartupChannel(channels, preferredId) {
  const list = channels || [];
  if (preferredId != null && preferredId !== '') {
    const id = String(preferredId);
    const preferred = list.find((c) => String(c.id) === id);
    if (preferred && (preferred.playback_url || preferred.url)) return preferred;
  }
  return pickPlayableChannel(list);
}

function filterAdvanceableChannels(channels) {
  return (channels || []).filter(
    (c) => c.play_status === 'playable' || c.playback_url || c.url
  );
}

// Use same-origin relative path in prod; direct IP in dev via IP access
const getBase = () => {
  if (import.meta.env.DEV) {
    const h = window.location.hostname;
    if (h && h !== 'localhost' && h !== '127.0.0.1') return `http://${h}:4000/api`;
  }
  return '/api';
};

const displayApi = axios.create({ baseURL: getBase(), headers: { 'Content-Type': 'application/json' } });

// ---------------------------------------------------------------------------
// WiFi QR overlay — uses qrcode.react (client-side, no external API call)
// ---------------------------------------------------------------------------
function WifiQrOverlay({ ssid, password = '', security = 'WPA', position = 'bottom-right' }) {
  const wifiString = useMemo(
    () => `WIFI:T:${security};S:${ssid};P:${password};;`,
    [ssid, password, security]
  );
  const posClass = position === 'bottom-left' ? 'bottom-6 left-6'
    : position === 'top-right'  ? 'top-6 right-6'
    : position === 'top-left'   ? 'top-6 left-6'
    : 'bottom-6 right-6';

  return (
    <div className={`absolute ${posClass} pointer-events-none z-20`} style={{ zIndex: 1000 }}>
      <div className="bg-black/80 backdrop-blur-sm rounded-xl p-2 border border-white/10 flex flex-col items-center gap-1">
        <QRCodeSVG value={wifiString} size={80} bgColor="#000000" fgColor="#ffffff" />
        <p className="text-white text-xs font-medium text-center leading-tight">📶 {ssid}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Branded fallback screen
// ---------------------------------------------------------------------------
function FallbackScreen({ retryIn, message, appName = 'Bake & Grill TV', brandColor = '#B03A48' }) {
  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center select-none">
      <div className="text-center px-8">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-2xl" style={{ backgroundColor: brandColor }}>
          <svg viewBox="0 0 48 48" className="w-14 h-14" fill="none">
            <rect x="6" y="28" width="36" height="6" rx="3" fill="white" opacity=".9"/>
            <rect x="6" y="20" width="36" height="6" rx="3" fill="white" opacity=".7"/>
            <rect x="6" y="12" width="36" height="6" rx="3" fill="white" opacity=".5"/>
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{appName}</h1>
        <p className="text-xl text-white/60 mb-8">{message || 'Back soon'}</p>
        {retryIn > 0 && (
          <div className="inline-flex items-center gap-2 bg-white/10 px-5 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-white/70 text-sm">Retrying in {retryIn}s</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function KioskModePage() {
  const [searchParams] = useSearchParams();
  const displayToken = searchParams.get('token');

  const [display, setDisplay]               = useState(null);
  const [channels, setChannels]             = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [error, setError]                   = useState('');
  const [loading, setLoading]               = useState(true);
  const [isMuted, setIsMuted]               = useState(false);
  const [lastCommand, setLastCommand]       = useState(null);
  const [isFullscreen, setIsFullscreen]     = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(() => readStoredImmersive(displayToken));
  const [immersiveNotice, setImmersiveNotice] = useState('');
  const [announcementClearSignal, setAnnouncementClearSignal] = useState(0);
  const [showStartOverlay, setShowStartOverlay] = useState(false);
  const [cursorVisible, setCursorVisible]   = useState(true);
  const [showFallback, setShowFallback]     = useState(false);
  const [fallbackMsg, setFallbackMsg]       = useState('Back soon');
  const [retryIn, setRetryIn]               = useState(0);
  const [activeOverride, setActiveOverride] = useState(null);
  const [nowPlaying, setNowPlaying]         = useState(null); // for slideshow heartbeat
  const [overlayData, setOverlayData]       = useState(null); // { messages, cards }
  const [playbackGeneration, setPlaybackGeneration] = useState(0);
  const overlayFetchRef                     = useRef(null);

  const videoRef            = useRef(null);
  const hlsRef              = useRef(null);
  const containerRef        = useRef(null);
  const heartbeatRef        = useRef(null);
  const commandPollRef      = useRef(null);
  const commandTimeoutRef   = useRef(null);
  const cursorTimerRef      = useRef(null);
  const retryTimerRef       = useRef(null);
  const retryCountdownRef   = useRef(null);
  const startTimeRef        = useRef(Date.now());
  const normalPlaylistRef   = useRef(null);
  const channelsRef         = useRef([]);
  const rebootTimerRef      = useRef(null);
  const failoverTimerRef    = useRef(null);
  const failoverActiveRef   = useRef(false);
  const displayRef          = useRef(null);
  const applyImmersiveRef   = useRef(null);
  const pseudoFullscreenRef = useRef(true);
  const immersiveNoticeTimerRef = useRef(null);

  // Keep refs in sync for command polling closure
  useEffect(() => { channelsRef.current = channels; }, [channels]);
  useEffect(() => { displayRef.current = display; }, [display]);
  useEffect(() => { pseudoFullscreenRef.current = pseudoFullscreen; }, [pseudoFullscreen]);

  // Cleanup all long-running timers on unmount so they don't fire after the
  // component is gone (e.g. navigation away from kiosk page).
  useEffect(() => () => {
    clearInterval(rebootTimerRef.current);
    clearTimeout(failoverTimerRef.current);
    clearInterval(retryCountdownRef.current);
  }, []);

  // Keep verifyDisplay in a ref so the command polling effect can call the
  // latest version without listing it as a dependency (which would restart
  // the poll interval every time verifyDisplay re-creates due to its own deps).
  const verifyDisplayRef = useRef(null);
  const verifyInProgressRef = useRef(false);
  const activeOverrideRef = useRef(null);
  const processedCommandIdsRef = useRef(new Set());
  const sseConnectedRef = useRef(false);
  const sseReconnectAttemptRef = useRef(0);
  const pollIntervalMsRef = useRef(COMMAND_POLL_FAST_MS);

  useEffect(() => { activeOverrideRef.current = activeOverride; }, [activeOverride]);

  // ── Kiosk lockdown ──────────────────────────────────────────────────────

  // Block context menu
  useEffect(() => {
    const block = (e) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, []);

  // Block keyboard shortcuts that could exit kiosk
  useEffect(() => {
    const block = (e) => {
      const blocked = ['F5', 'F11', 'F12'];
      if (blocked.includes(e.key)) { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && ['r', 'R', 'w', 'W', 'n', 'N', 'q', 'Q', 't', 'T'].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', block);
    return () => window.removeEventListener('keydown', block);
  }, []);

  // Cursor auto-hide
  useEffect(() => {
    const resetTimer = () => {
      setCursorVisible(true);
      clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = setTimeout(() => setCursorVisible(false), CURSOR_HIDE_DELAY_MS);
    };
    resetTimer();
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      clearTimeout(cursorTimerRef.current);
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // ── Immersive / fullscreen helpers ───────────────────────────────────────
  // Browser fullscreen needs a user tap; immersive mode fills the screen instantly.

  const isInBrowserFullscreen = useCallback(() => (
    !!(document.fullscreenElement || document.webkitFullscreenElement)
  ), []);

  const applyImmersiveMode = useCallback((enabled = true) => {
    const on = !!enabled;
    setPseudoFullscreen(on);
    if (displayToken) {
      try { localStorage.setItem(immersiveStorageKey(displayToken), on ? '1' : '0'); } catch { /* ignore */ }
    }
    document.documentElement.classList.toggle('kiosk-immersive', on);
    document.body.classList.toggle('kiosk-immersive', on);
    document.documentElement.classList.toggle('kiosk-normal', !on);
    document.body.classList.toggle('kiosk-normal', !on);
    setImmersiveNotice(on ? 'Expanded — edge-to-edge' : 'Normal — margins visible');
    clearTimeout(immersiveNoticeTimerRef.current);
    immersiveNoticeTimerRef.current = setTimeout(() => setImmersiveNotice(''), 5000);
  }, [displayToken]);

  useEffect(() => {
    applyImmersiveRef.current = applyImmersiveMode;
  }, [applyImmersiveMode]);

  // Restore immersive preference once helper is defined (must not run before applyImmersiveMode exists)
  useEffect(() => {
    if (displayToken) applyImmersiveMode(readStoredImmersive(displayToken));
  }, [displayToken, applyImmersiveMode]);

  useEffect(() => () => {
    clearTimeout(immersiveNoticeTimerRef.current);
    document.documentElement.classList.remove('kiosk-immersive', 'kiosk-normal');
    document.body.classList.remove('kiosk-immersive', 'kiosk-normal');
  }, []);

  const tryBrowserFullscreenSilently = useCallback(async () => {
    try {
      const targets = [containerRef.current, document.documentElement, videoRef.current].filter(Boolean);
      for (const target of targets) {
        if (target.requestFullscreen) { await target.requestFullscreen(); break; }
        if (target.webkitRequestFullscreen) { await target.webkitRequestFullscreen(); break; }
      }
    } catch { /* blocked without user gesture — immersive mode still applies */ }
  }, []);

  const refreshOverlayData = useCallback(async () => {
    if (!displayToken) return;
    try {
      const { data } = await displayApi.get(`/overlays/for-display?token=${displayToken}`);
      if (data.success) setOverlayData(data);
    } catch { /* ignore */ }
  }, [displayToken]);

  const applyPlaylistFilter = useCallback((playlistId) => {
    const pid = parseInt(playlistId, 10);
    if (!pid) return;
    const pool = normalPlaylistRef.current || channelsRef.current || [];
    const filtered = pool.filter(
      (c) => c.source_playlist_id === pid || String(c.id).startsWith(`${pid}-`)
    );
    if (!filtered.length) return;
    setChannels(filtered);
    const first = pickPlayableChannel(filtered);
    if (first) {
      setCurrentChannel(first);
      setShowFallback(false);
    }
  }, []);

  // ── Initial verify ───────────────────────────────────────────────────────

  const loadFromCache = useCallback(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      const { data, cachedAt } = JSON.parse(raw);
      if (Date.now() - cachedAt > CACHE_MAX_AGE_MS) return false;
      setDisplay(data.display);
      setChannels(data.channels);
      normalPlaylistRef.current = data.channels;
      if (data.channels.length) {
        const first = pickStartupChannel(data.channels, data.display?.currentChannelId);
        if (first) setCurrentChannel(first);
      }
      return true;
    } catch { return false; }
  }, []);

  const saveToCache = useCallback((displayData, channelList) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: { display: displayData, channels: channelList },
        cachedAt: Date.now()
      }));
    } catch { /* storage full — ignore */ }
  }, []);

  const scheduleRetry = useCallback((msg) => {
    setFallbackMsg(msg);
    setShowFallback(true);
    let countdown = Math.round(RETRY_INTERVAL_MS / 1000);
    setRetryIn(countdown);
    clearInterval(retryCountdownRef.current);
    retryCountdownRef.current = setInterval(() => {
      countdown -= 1;
      setRetryIn(countdown);
      if (countdown <= 0) {
        clearInterval(retryCountdownRef.current);
        verifyDisplay(); // eslint-disable-line no-use-before-define
      }
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const verifyDisplay = useCallback(async () => {
    if (!displayToken) {
      setError('No display token provided');
      setLoading(false);
      return;
    }
    if (verifyInProgressRef.current) return;
    verifyInProgressRef.current = true;
    try {
      const { data } = await displayApi.post('/displays/verify', { token: displayToken });
      const { display: d, channels: ch, playableCount } = data;
      setDisplay(d);
      setChannels(ch || []);
      normalPlaylistRef.current = ch || [];
      if (d?.muteAudio) setIsMuted(true);
      if (d?.displayType !== 'media') {
        const first = pickStartupChannel(ch, d?.currentChannelId);
        if (!first) {
          setCurrentChannel(null);
          setFallbackMsg(
            (ch || []).length
              ? 'No stream URLs available. Check playlist in admin or run Channel Health test.'
              : 'No channels in playlist. Assign a playlist with a valid M3U URL.'
          );
          setShowFallback(true);
        } else {
          setCurrentChannel(first);
          setShowFallback(false);
        }
      } else {
        setShowFallback(false);
      }
      saveToCache(d, ch || []);
      clearInterval(retryCountdownRef.current);
      setShowStartOverlay(false);
      tryBrowserFullscreenSilently();

      // ── Auto-reboot scheduling ──────────────────────────────────────
      if (d?.autoRebootTime) {
        clearInterval(rebootTimerRef.current);
        rebootTimerRef.current = setInterval(() => {
          const now = new Date();
          const [hh, mm] = d.autoRebootTime.split(':').map(Number);
          if (now.getHours() === hh && now.getMinutes() === mm) {
            if (import.meta.env.DEV) console.log('[Kiosk] Auto-reboot triggered at', d.autoRebootTime);
            window.location.reload();
          }
        }, 60_000); // check every minute
      }
    } catch {
      const fromCache = loadFromCache();
      if (!fromCache) scheduleRetry('Could not connect — check network');
    } finally {
      verifyInProgressRef.current = false;
      setLoading(false);
    }
  }, [displayToken, loadFromCache, saveToCache, scheduleRetry, tryBrowserFullscreenSilently]);

  // Keep ref current so polling closure always calls the latest version
  useEffect(() => { verifyDisplayRef.current = verifyDisplay; }, [verifyDisplay]);

  useEffect(() => { verifyDisplay(); }, [verifyDisplay]);

  // ── Heartbeat ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!displayToken || !display) return;

    const send = () => {
      displayApi.post('/displays/heartbeat', {
        token: displayToken,
        current_channel_id: currentChannel?.id || null,
        status: showFallback ? 'fallback' : 'playing',
        nowPlaying: nowPlaying || currentChannel?.name || null,
        uptime: Math.round((Date.now() - startTimeRef.current) / 1000),
        appVersion: APP_VERSION
      }).catch(() => {});
    };

    send();
    heartbeatRef.current = setInterval(send, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(heartbeatRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayToken, display, currentChannel, showFallback, nowPlaying]);

  // ── Overlay data fetch ─────────────────────────────────────────────────
  useEffect(() => {
    if (!displayToken) return;
    const fetch = () => {
      displayApi.get(`/overlays/for-display?token=${displayToken}`)
        .then(r => { if (r.data?.success) setOverlayData(r.data); })
        .catch(() => {});
    };
    fetch();
    overlayFetchRef.current = setInterval(fetch, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(overlayFetchRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayToken]);

  // ── Command delivery: SSE with adaptive polling fallback ────────────────
  const handleCommandsRef = useRef(null);
  const refreshOverlayDataRef = useRef(null);
  const applyPlaylistFilterRef = useRef(null);
  const tryBrowserFullscreenSilentlyRef = useRef(null);
  const isInBrowserFullscreenRef = useRef(null);

  useEffect(() => { refreshOverlayDataRef.current = refreshOverlayData; }, [refreshOverlayData]);
  useEffect(() => { applyPlaylistFilterRef.current = applyPlaylistFilter; }, [applyPlaylistFilter]);
  useEffect(() => { tryBrowserFullscreenSilentlyRef.current = tryBrowserFullscreenSilently; }, [tryBrowserFullscreenSilently]);
  useEffect(() => { isInBrowserFullscreenRef.current = isInBrowserFullscreen; }, [isInBrowserFullscreen]);

  useEffect(() => {
    if (!displayToken) return;

    let es = null;
    let sseReconnectTimer = null;
    let pollTimer = null;
    let stopped = false;

    const markProcessed = (id) => {
      const set = processedCommandIdsRef.current;
      set.add(id);
      if (set.size > PROCESSED_COMMANDS_MAX) {
        const first = set.values().next().value;
        set.delete(first);
      }
    };

    const reportCommandResult = async (cmd, outcome) => {
      await displayApi.patch(`/displays/commands/${cmd.id}/execute`, {
        token: displayToken,
        status: outcome.status || 'executed',
        error_code: outcome.error_code || null,
        error_message: outcome.error_message || null,
        app_version: APP_VERSION,
        result_payload: outcome.result_payload || null,
      }).catch(() => {});
    };

    const setPollInterval = (ms) => {
      pollIntervalMsRef.current = ms;
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => { handleCommandsRef.current?.(); }, ms);
    };

    const connectSSE = () => {
      if (stopped) return;
      const sseBase = displayApi.defaults.baseURL || '/api';
      try {
        es?.close();
        es = new EventSource(`${sseBase}/displays/events/${displayToken}`);

        es.addEventListener('connected', () => {
          sseConnectedRef.current = true;
          sseReconnectAttemptRef.current = 0;
          if (import.meta.env.DEV) console.log('[Kiosk] SSE connected');
          setPollInterval(COMMAND_POLL_SLOW_MS);
        });

        es.addEventListener('command', () => {
          handleCommandsRef.current?.();
        });

        es.onerror = () => {
          sseConnectedRef.current = false;
          es?.close();
          es = null;
          if (import.meta.env.DEV) {
            const attempt = sseReconnectAttemptRef.current + 1;
            console.warn(`[Kiosk] SSE error — reconnect attempt ${attempt}`);
          }
          setPollInterval(COMMAND_POLL_FAST_MS);
          const delay = Math.min(
            SSE_RECONNECT_BASE_MS * (2 ** sseReconnectAttemptRef.current),
            SSE_RECONNECT_MAX_MS
          );
          sseReconnectAttemptRef.current += 1;
          clearTimeout(sseReconnectTimer);
          sseReconnectTimer = setTimeout(connectSSE, delay);
        };
      } catch {
        setPollInterval(COMMAND_POLL_FAST_MS);
      }
    };

    const poll = async () => {
      try {
        const { data } = await displayApi.get(`/displays/commands/${displayToken}`);
        const commands = data.commands || [];
        const override = data.override || null;
        const prevOverride = activeOverrideRef.current;

        if (override && new Date(override.expires_at) > new Date()) {
          if (!prevOverride || prevOverride.id !== override.id) {
            setActiveOverride(override);
            if (override.m3u_url) verifyDisplayRef.current?.();
          }
        } else if (prevOverride) {
          setActiveOverride(null);
          if (normalPlaylistRef.current?.length) {
            setChannels(normalPlaylistRef.current);
            setCurrentChannel(pickPlayableChannel(normalPlaylistRef.current));
          }
        }

        for (const cmd of commands) {
          if (processedCommandIdsRef.current.has(cmd.id)) continue;

          let d = {};
          try { d = cmd.command_data ? JSON.parse(cmd.command_data) : {}; } catch { /* skip */ }

          setLastCommand({ type: cmd.command_type, data: d, time: new Date().toLocaleTimeString() });
          clearTimeout(commandTimeoutRef.current);
          commandTimeoutRef.current = setTimeout(() => setLastCommand(null), 3000);

          let outcome = { status: 'executed' };
          const displayType = displayRef.current?.displayType || 'stream';

          try {
            if (cmd.command_type === 'change_channel') {
              let ch = channelsRef.current.find((c) => String(c.id) === String(d.channel_id));
              if (!ch && d.channel && (d.channel.playback_url || d.channel.url)) {
                ch = d.channel;
                setChannels((prev) => (prev.some((c) => String(c.id) === String(ch.id)) ? prev : [...prev, ch]));
              }
              if (ch) {
                setCurrentChannel(ch);
                setShowFallback(false);
                videoRef.current?.play().catch(() => {});
              } else {
                outcome = { status: 'failed', error_code: 'CHANNEL_NOT_FOUND', error_message: 'Channel not found on display' };
              }
            } else if (cmd.command_type === 'set_volume') {
              if (!videoRef.current) {
                outcome = displayType === 'media'
                  ? { status: 'ignored', error_code: 'VIDEO_NOT_READY', error_message: 'No video element on media display' }
                  : { status: 'failed', error_code: 'VIDEO_NOT_READY', error_message: 'Video element not ready' };
              } else {
                videoRef.current.volume = (parseInt(d.volume, 10) || 50) / 100;
                videoRef.current.muted = false;
                setIsMuted(false);
                if (videoRef.current.paused) videoRef.current.play().catch(() => {});
              }
            } else if (cmd.command_type === 'mute') {
              if (videoRef.current) { videoRef.current.muted = true; setIsMuted(true); }
              else outcome = { status: 'ignored', error_code: 'VIDEO_NOT_READY', error_message: 'No video to mute' };
            } else if (cmd.command_type === 'unmute') {
              if (videoRef.current) {
                videoRef.current.muted = false;
                setIsMuted(false);
                videoRef.current.play().catch(() => {
                  if (videoRef.current) { videoRef.current.muted = true; setIsMuted(true); videoRef.current.play().catch(() => {}); }
                });
              } else {
                outcome = { status: 'ignored', error_code: 'VIDEO_NOT_READY', error_message: 'No video to unmute' };
              }
            } else if (
              cmd.command_type === 'set_immersive'
              || cmd.command_type === 'toggle_fullscreen'
              || cmd.command_type === 'enter_fullscreen'
              || cmd.command_type === 'exit_immersive'
            ) {
              let enable = true;
              if (cmd.command_type === 'exit_immersive') enable = false;
              else if (cmd.command_type === 'set_immersive') enable = !!d.immersive;
              else if (cmd.command_type === 'toggle_fullscreen') enable = !pseudoFullscreenRef.current;
              applyImmersiveRef.current?.(enable);
              if (enable) tryBrowserFullscreenSilentlyRef.current?.();
              else if (isInBrowserFullscreenRef.current?.()) {
                if (document.exitFullscreen) await document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
              }
            } else if (cmd.command_type === 'set_overlay_mode' && d.overlay_mode) {
              setDisplay((prev) => (prev ? { ...prev, overlayMode: d.overlay_mode, overlay_mode: d.overlay_mode } : prev));
              await refreshOverlayDataRef.current?.();
            } else if (cmd.command_type === 'clear_announcement') {
              setAnnouncementClearSignal((n) => n + 1);
            } else if (cmd.command_type === 'switch_playlist' && d.playlist_id) {
              applyPlaylistFilterRef.current?.(d.playlist_id);
            } else if (cmd.command_type === 'check_override' || cmd.command_type === 'revert_override') {
              // handled via override field above
            } else if (cmd.command_type === 'refresh_playlist' || cmd.command_type === 'sync_now') {
              verifyDisplayRef.current?.();
            } else if (cmd.command_type === 'refresh_overlays') {
              await refreshOverlayDataRef.current?.();
            } else if (cmd.command_type === 'reload_display') {
              markProcessed(cmd.id);
              await reportCommandResult(cmd, { status: 'executed' });
              window.location.reload();
              return;
            } else if (cmd.command_type === 'restart_playback') {
              setPlaybackGeneration((n) => n + 1);
            } else if (cmd.command_type === 'clear_cache') {
              markProcessed(cmd.id);
              await reportCommandResult(cmd, { status: 'executed' });
              try {
                localStorage.removeItem(CACHE_KEY);
                localStorage.removeItem(immersiveStorageKey(displayToken));
              } catch { /* ignore */ }
              window.location.reload();
              return;
            } else if (cmd.command_type === 'screenshot') {
              let imageData = null;
              let captureError = null;
              try {
                if (videoRef.current && videoRef.current.readyState >= 2) {
                  const canvas = document.createElement('canvas');
                  canvas.width = videoRef.current.videoWidth || 1280;
                  canvas.height = videoRef.current.videoHeight || 720;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(videoRef.current, 0, 0);
                    imageData = canvas.toDataURL('image/jpeg', 0.6);
                  }
                } else {
                  const img = document.querySelector('img[data-slide]');
                  if (img && img.complete) {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || 1280;
                    canvas.height = img.naturalHeight || 720;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(img, 0, 0);
                      imageData = canvas.toDataURL('image/jpeg', 0.6);
                    }
                  } else if (displayType === 'media') {
                    captureError = 'No slideshow frame available';
                  } else {
                    captureError = 'Video frame not ready';
                  }
                }
              } catch (err) {
                captureError = err.message || 'Canvas capture failed (possible CORS)';
              }
              if (imageData) {
                await displayApi.post('/displays/screenshot', { token: displayToken, imageData, command_id: cmd.id });
              } else {
                outcome = {
                  status: displayType === 'stream' ? 'failed' : 'unsupported',
                  error_code: 'SCREENSHOT_CAPTURE_FAILED',
                  error_message: captureError || 'Could not capture screenshot',
                };
              }
            } else if (cmd.command_type === 'apply_scene' || cmd.command_type === 'set_mode') {
              outcome = { status: 'unsupported', error_code: 'UNSUPPORTED_COMMAND', error_message: `Command ${cmd.command_type} not supported on stream kiosk` };
            } else {
              outcome = { status: 'unsupported', error_code: 'UNKNOWN_COMMAND', error_message: `Unknown command: ${cmd.command_type}` };
            }
          } catch (err) {
            outcome = { status: 'failed', error_code: 'COMMAND_HANDLER_ERROR', error_message: err.message || 'Command failed' };
          }

          markProcessed(cmd.id);
          await reportCommandResult(cmd, outcome);
        }
      } catch { /* network down */ }
    };

    handleCommandsRef.current = poll;
    poll();
    setPollInterval(COMMAND_POLL_FAST_MS);
    connectSSE();

    return () => {
      stopped = true;
      es?.close();
      clearTimeout(sseReconnectTimer);
      clearInterval(pollTimer);
      clearTimeout(commandTimeoutRef.current);
    };
  }, [displayToken]);

  // ── Video player ─────────────────────────────────────────────────────────

  useEffect(() => {
    const streamUrl = getStreamUrl(currentChannel);
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    const ua = navigator.userAgent || '';
    const isIOS = (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isHLS = isHlsStream(streamUrl, currentChannel);

    let retryCount = 0;
    const maxRetries = 5;
    let hasConfirmedPlayback = false;
    let lastPlaybackTime = 0;
    let playTimeout = null;

    const clearPT = () => { if (playTimeout) { clearTimeout(playTimeout); playTimeout = null; } };

    let retryDelayTimeout = null;
    const clearRDT = () => { if (retryDelayTimeout) { clearTimeout(retryDelayTimeout); retryDelayTimeout = null; } };

    const confirmPlayback = () => {
      if (hasConfirmedPlayback) return;
      hasConfirmedPlayback = true;
      clearPT();
    };

    const advanceToNextChannel = () => {
      const list = filterAdvanceableChannels(channelsRef.current);
      if (!list.length || !currentChannel) return;
      const idx = list.findIndex((c) => c.id === currentChannel.id);
      const next = list[(idx + 1) % list.length];
      if (next && next.id !== currentChannel.id) setCurrentChannel(next);
    };

    const startPT = () => {
      clearPT();
      playTimeout = setTimeout(() => {
        if (!hasConfirmedPlayback && retryCount < maxRetries) {
          retryCount++;
          clearRDT();
          retryDelayTimeout = setTimeout(() => setupPlayer(), 2000);
        } else if (!hasConfirmedPlayback) {
          advanceToNextChannel();
        }
      }, PLAYBACK_TIMEOUT_MS);
    };

    const setupPlayer = () => {
      clearPT();
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

      if (isHLS && (isIOS || (!Hls.isSupported() && video.canPlayType('application/vnd.apple.mpegurl') !== ''))) {
        video.src = ''; video.load();
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = false;
        video.src = streamUrl;
        startPT();
        video.play().catch(() => { video.muted = true; setIsMuted(true); video.play().catch(() => {}); });
      } else if (isHLS && Hls.isSupported()) {
        const isMobileKiosk = /Android|iPhone|iPad/i.test(navigator.userAgent);
        const hls = new Hls({ enableWorker: !isMobileKiosk, lowLatencyMode: true, maxBufferLength: 30, maxMaxBufferLength: 60 });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        startPT();
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.muted = false;
          video.play().catch(() => { video.muted = true; setIsMuted(true); video.play().catch(() => {}); });
        });
        hls.on(Hls.Events.ERROR, (_, d) => {
          if (d.fatal && retryCount < maxRetries) {
            retryCount++;
            clearRDT();
            retryDelayTimeout = setTimeout(() => setupPlayer(), 5000);
          }
        });
      } else {
        video.src = streamUrl;
        video.playsInline = true;
        startPT();
        video.play().catch(() => { video.muted = true; setIsMuted(true); video.play().catch(() => {}); });
      }
    };

    const onTimeUpdate = () => {
      if (video.currentTime > 0 && video.currentTime !== lastPlaybackTime) {
        lastPlaybackTime = video.currentTime;
        confirmPlayback();
      }
    };
    video.addEventListener('timeupdate', onTimeUpdate);

    setupPlayer();

    return () => {
      clearPT();
      clearRDT();
      video.removeEventListener('timeupdate', onTimeUpdate);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [currentChannel, playbackGeneration]);

  // ── Auto-failover: switch to media playlist when stream fails too long ───

  useEffect(() => {
    const failoverId    = display?.failoverPlaylistId;
    const failoverMins  = display?.failoverAfterMinutes ?? 5;
    const isStreamMode  = display?.displayType !== 'media';

    // Only arm failover for stream mode with a fallback playlist configured
    if (!failoverId || !isStreamMode || failoverActiveRef.current) return;

    // If video is playing, disarm any pending failover
    const videoEl = videoRef.current;
    if (videoEl && !videoEl.paused && !videoEl.ended && videoEl.readyState >= 3) {
      clearTimeout(failoverTimerRef.current);
      return;
    }

    // Arm: if we're still not playing after failoverMins, switch to media slideshow
    clearTimeout(failoverTimerRef.current);
    failoverTimerRef.current = setTimeout(() => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.readyState < 3) {
        if (import.meta.env.DEV) console.log('[Kiosk] Stream failing — switching to failover playlist', failoverId);
        failoverActiveRef.current = true;
        setDisplay(prev => prev ? { ...prev, displayType: 'media', mediaPlaylistId: failoverId } : prev);
      }
    }, failoverMins * 60_000);

    return () => clearTimeout(failoverTimerRef.current);
  }, [display, currentChannel]);

  // ── Start overlay (tap to enter fullscreen) ──────────────────────────────

  const handleStart = async () => {
    setShowStartOverlay(false);
    applyImmersiveMode(readStoredImmersive(displayToken));
    tryBrowserFullscreenSilently();
  };

  const isImmersive = pseudoFullscreen || isFullscreen;

  // ── Renders ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Initializing Display…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <FallbackScreen retryIn={0} message={error} appName={display?.appName} brandColor={display?.brandColor} />;
  }

  if (showFallback && !display) {
    return <FallbackScreen retryIn={retryIn} message={fallbackMsg} appName={display?.appName} brandColor={display?.brandColor} />;
  }

  const brandName = display?.appName || 'Bake & Grill TV';
  const brandColor = display?.brandColor || '#B03A48';

  return (
    <div
      ref={containerRef}
      className={`kiosk-root overflow-hidden relative ${
        pseudoFullscreen
          ? 'kiosk-root--immersive fixed inset-0 w-screen h-screen bg-black'
          : 'kiosk-root--normal min-h-screen w-screen bg-zinc-900 p-3 sm:p-4'
      }`}
      style={{ cursor: cursorVisible ? 'default' : 'none' }}
    >
      {/* Normal mode frame — visible margin around video */}
      <div
        className={
          pseudoFullscreen
            ? 'absolute inset-0'
            : 'relative w-full h-[calc(100vh-2.5rem)] rounded-lg border-4 border-zinc-600 bg-black overflow-hidden shadow-2xl'
        }
      >
      {/* ── Screen mode (on-display, same as remote Expand / Normal) ─ */}
      {!showStartOverlay && (
        <button
          type="button"
          onClick={() => applyImmersiveMode(!pseudoFullscreen)}
          className={`absolute top-4 left-4 z-30 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-lg border transition-opacity ${
            cursorVisible ? 'opacity-100' : 'opacity-50'
          } ${
            pseudoFullscreen
              ? 'bg-zinc-800/90 text-white border-zinc-500 backdrop-blur-sm'
              : 'bg-black/60 text-white border-white/25 backdrop-blur-sm'
          }`}
        >
          {pseudoFullscreen ? '⊟ Normal Screen' : '⛶ Expand Screen'}
        </button>
      )}

      {/* ── Tap-to-start overlay (first load) ──────────────────── */}
      {showStartOverlay && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={handleStart}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl" style={{ backgroundColor: brandColor }}>
            <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none">
              <rect x="6" y="28" width="36" height="6" rx="3" fill="white" opacity=".9"/>
              <rect x="6" y="20" width="36" height="6" rx="3" fill="white" opacity=".7"/>
              <rect x="6" y="12" width="36" height="6" rx="3" fill="white" opacity=".5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{brandName}</h1>
          <p className="text-white/50 mb-10 text-sm">{display?.name || 'Display'}</p>
          <div className="bg-white/10 border border-white/20 px-8 py-3 rounded-full text-white font-semibold text-lg animate-pulse">
            Tap to Start
          </div>
        </div>
      )}

      {/* ── Emergency override banner ───────────────────────────── */}
      {activeOverride && (
        <div
          className="fixed top-0 left-0 right-0 z-40 bg-red-600 text-white text-center py-2 text-sm font-bold tracking-wide"
          style={{ zIndex: 2147483646 }}
        >
          🚨 {activeOverride.override_message} — ends {new Date(activeOverride.expires_at).toLocaleTimeString()}
        </div>
      )}

      {/* ── Content area — overlay-aware wrapper ─────────────────── */}
      {(() => {
        const overlayMode = display?.overlayMode || overlayData?.overlayMode || 'none';
        const safeArea    = display?.overlaySafeArea || overlayData?.safeArea || 'standard';
        const msgs        = overlayData?.messages || [];
        const cards       = overlayData?.cards    || [];

        // Core content (video or slideshow or fallback)
        const coreContent = display?.displayType === 'media' && display?.mediaPlaylistId ? (
          <SlideshowPlayer
            playlistId={display.mediaPlaylistId}
            displayToken={displayToken}
            muteAudio={display.muteAudio}
            showBrandOverlay={overlayMode === 'none' && display.showBrandOverlay !== false}
            showClockOverlay={display.showClockOverlay}
            onNowPlaying={setNowPlaying}
          />
        ) : display?.displayType === 'media' ? (
          <FallbackScreen retryIn={0} message="No playlist assigned — check display settings" />
        ) : currentChannel ? (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            controls={false}
          />
        ) : (
          <FallbackScreen
            retryIn={retryIn}
            message={fallbackMsg || 'No playable channels. Run channel test in admin.'}
          />
        );

        // split_right gets its own layout
        if (overlayMode === 'split_right') {
          return (
            <div className="absolute inset-0">
              <SplitRightPanel messages={msgs} cards={cards}>
                {coreContent}
              </SplitRightPanel>
            </div>
          );
        }

        // All other modes: full-screen content + layered overlays
        return (
          <div className="absolute inset-0">
            {coreContent}
            {/* Bottom bar (bottom_bar and bottom_bar_popup both show it) */}
            {(overlayMode === 'bottom_bar' || overlayMode === 'bottom_bar_popup') && (
              <BottomBarOverlay messages={msgs} safeArea={safeArea} />
            )}
            {/* Popup card (bottom_bar_popup only) */}
            {overlayMode === 'bottom_bar_popup' && (
              <PopupCardOverlay cards={cards} safeArea={safeArea} />
            )}
          </div>
        );
      })()}

      {/* ── Command toast ─────────────────────────────────────────── */}
      {lastCommand && (
        <div
          className="fixed top-4 left-4 bg-yellow-500/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-2xl pointer-events-none"
          style={{ zIndex: 2147483647 }}
        >
          <p className="text-black text-sm font-bold">
            🎮 {lastCommand.type}{lastCommand.data?.volume ? ` ${lastCommand.data.volume}%` : ''}
          </p>
          <p className="text-black/70 text-xs">{lastCommand.time}</p>
        </div>
      )}

      {/* ── Unmute prompt ─────────────────────────────────────────── */}
      {isMuted && !showStartOverlay && (
        <button
          onClick={() => {
            if (videoRef.current) { videoRef.current.muted = false; setIsMuted(false); }
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white px-8 py-4 rounded-full shadow-2xl transition-all z-30"
          style={{ backgroundColor: brandColor }}
        >
          <svg className="w-8 h-8 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          Tap to Unmute
        </button>
      )}

      {/* ── Channel info chip (hidden in immersive mode) ─────────────── */}
      {currentChannel && !showStartOverlay && !isImmersive && (
        <div className="absolute bottom-8 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10 pointer-events-none">
          <p className="text-white text-sm font-medium">{currentChannel.name}</p>
          {currentChannel.group && <p className="text-gray-400 text-xs">{currentChannel.group}</p>}
        </div>
      )}

      {/* ── Display name chip (hidden in immersive mode) ─────────────── */}
      {display?.name && !isImmersive && !showStartOverlay && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full pointer-events-none">
          <p className="text-white/70 text-xs">{display.name}</p>
        </div>
      )}

      {/* ── WiFi QR overlay ────────────────────────────────────────────── */}
      {display?.showWifiQr && display?.wifiSsid && !showStartOverlay && (
        <WifiQrOverlay
          ssid={display.wifiSsid}
          password={display.wifiPassword}
          security={display.wifiSecurity}
          position={display.wifiQrPosition}
        />
      )}

      {/* ── Full-screen announcements (admin push) ─────────────────────── */}
      {display?.id && displayToken && !showStartOverlay && (
        <AnnouncementOverlay
          displayId={display.id}
          displayToken={displayToken}
          apiClient={displayApi}
          clearSignal={announcementClearSignal}
        />
      )}
      </div>

      {/* Mode feedback after remote control */}
      {immersiveNotice && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[2147483647] px-5 py-2 rounded-full bg-yellow-500 text-black text-sm font-bold shadow-lg"
        >
          {immersiveNotice}
        </div>
      )}

      {!pseudoFullscreen && !showStartOverlay && (
        <p className="text-center text-zinc-500 text-xs mt-2 pb-1">
          Normal screen — tap Expand Screen (top-left) or use remote to go edge-to-edge.
        </p>
      )}
    </div>
  );
}
