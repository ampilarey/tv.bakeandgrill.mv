import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Hls from 'hls.js';
import SlideshowPlayer from '../components/SlideshowPlayer';
import BottomBarOverlay  from '../components/overlays/BottomBarOverlay';
import PopupCardOverlay  from '../components/overlays/PopupCardOverlay';
import SplitRightPanel   from '../components/overlays/SplitRightPanel';

const APP_VERSION = '1.1.0';
const HEARTBEAT_INTERVAL_MS   = 25_000; // every 25 s
const COMMAND_POLL_INTERVAL_MS = 2_000; // every 2 s
const CURSOR_HIDE_DELAY_MS     = 3_000; // hide cursor after 3 s idle
const RETRY_INTERVAL_MS        = 10_000;
const CACHE_KEY                = 'kiosk_cache_v1';
const CACHE_MAX_AGE_MS         = 24 * 60 * 60 * 1000; // 24 h

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
// Branded fallback screen
// ---------------------------------------------------------------------------
function FallbackScreen({ retryIn, message }) {
  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center select-none">
      <div className="text-center px-8">
        {/* Logo / brand mark */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-[#B03A48] flex items-center justify-center shadow-2xl">
          <svg viewBox="0 0 48 48" className="w-14 h-14" fill="none">
            <rect x="6" y="28" width="36" height="6" rx="3" fill="white" opacity=".9"/>
            <rect x="6" y="20" width="36" height="6" rx="3" fill="white" opacity=".7"/>
            <rect x="6" y="12" width="36" height="6" rx="3" fill="white" opacity=".5"/>
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Bake &amp; Grill TV</h1>
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
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [cursorVisible, setCursorVisible]   = useState(true);
  const [showFallback, setShowFallback]     = useState(false);
  const [fallbackMsg, setFallbackMsg]       = useState('Back soon');
  const [retryIn, setRetryIn]               = useState(0);
  const [activeOverride, setActiveOverride] = useState(null);
  const [nowPlaying, setNowPlaying]         = useState(null); // for slideshow heartbeat
  const [overlayData, setOverlayData]       = useState(null); // { messages, cards }
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
  const rebootTimerRef      = useRef(null);
  const failoverTimerRef    = useRef(null);
  const failoverActiveRef   = useRef(false);

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

  // ── Fullscreen helper ────────────────────────────────────────────────────

  const enterFullscreen = useCallback(async () => {
    try {
      const el = containerRef.current || document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      setIsFullscreen(true);
    } catch { /* user denied — ok */ }
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
      if (data.channels.length) setCurrentChannel(data.channels[0]);
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
    try {
      const { data } = await displayApi.post('/displays/verify', { token: displayToken });
      const { display: d, channels: ch } = data;
      setDisplay(d);
      setChannels(ch || []);
      normalPlaylistRef.current = ch || [];
      if (d?.muteAudio) setIsMuted(true);
      if (ch && ch.length && d?.displayType !== 'media') setCurrentChannel(ch[0]);
      saveToCache(d, ch || []);
      setShowFallback(false);
      clearInterval(retryCountdownRef.current);

      // ── Auto-reboot scheduling ──────────────────────────────────────
      if (d?.autoRebootTime) {
        clearInterval(rebootTimerRef.current);
        rebootTimerRef.current = setInterval(() => {
          const now = new Date();
          const [hh, mm] = d.autoRebootTime.split(':').map(Number);
          if (now.getHours() === hh && now.getMinutes() === mm) {
            console.log('[Kiosk] Auto-reboot triggered at', d.autoRebootTime);
            window.location.reload();
          }
        }, 60_000); // check every minute
      }
    } catch {
      const fromCache = loadFromCache();
      if (!fromCache) scheduleRetry('Could not connect — check network');
    } finally {
      setLoading(false);
    }
  }, [displayToken, loadFromCache, saveToCache, scheduleRetry]);

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
  }, [displayToken, currentChannel, showFallback, nowPlaying]);

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

  // ── Command + override polling ───────────────────────────────────────────

  useEffect(() => {
    if (!displayToken || !display) return;

    const poll = async () => {
      try {
        const { data } = await displayApi.get(`/displays/commands/${displayToken}`);
        const commands = data.commands || [];
        const override = data.override || null;

        // Handle emergency override
        if (override && new Date(override.expires_at) > new Date()) {
          if (!activeOverride || activeOverride.id !== override.id) {
            setActiveOverride(override);
            // Fetch override playlist channels if different from current
            if (override.m3u_url) {
              try {
                const { data: vData } = await displayApi.post('/displays/verify', { token: displayToken });
                // override playlist channels aren't fetched here — handled by change_channel command or refresh
              } catch { /* ignore */ }
            }
          }
        } else if (activeOverride) {
          // Override expired — revert
          setActiveOverride(null);
          if (normalPlaylistRef.current?.length) {
            setChannels(normalPlaylistRef.current);
            setCurrentChannel(normalPlaylistRef.current[0]);
          }
        }

        for (const cmd of commands) {
          const d = cmd.command_data ? JSON.parse(cmd.command_data) : {};
          setLastCommand({ type: cmd.command_type, data: d, time: new Date().toLocaleTimeString() });
          clearTimeout(commandTimeoutRef.current);
          commandTimeoutRef.current = setTimeout(() => setLastCommand(null), 3000);

          if (cmd.command_type === 'change_channel') {
            const ch = channels.find(c => c.id === d.channel_id);
            if (ch) setCurrentChannel(ch);
          } else if (cmd.command_type === 'set_volume' && videoRef.current) {
            videoRef.current.volume = (parseInt(d.volume) || 50) / 100;
            videoRef.current.muted = false;
            setIsMuted(false);
            if (videoRef.current.paused) videoRef.current.play().catch(() => {});
          } else if (cmd.command_type === 'mute' && videoRef.current) {
            videoRef.current.muted = true; setIsMuted(true);
          } else if (cmd.command_type === 'unmute' && videoRef.current) {
            videoRef.current.muted = false; setIsMuted(false);
            videoRef.current.play().catch(() => { videoRef.current.muted = true; videoRef.current.play().catch(() => {}); });
          } else if (cmd.command_type === 'toggle_fullscreen') {
            const inFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
            if (!inFS) await enterFullscreen().catch(() => {});
            else { if (document.exitFullscreen) document.exitFullscreen(); }
          } else if (cmd.command_type === 'check_override' || cmd.command_type === 'revert_override') {
            // Already handled above via override field
          } else if (cmd.command_type === 'refresh_playlist') {
            verifyDisplay();
          } else if (cmd.command_type === 'refresh_overlays') {
            if (overlayFetchRef.current) clearInterval(overlayFetchRef.current);
            try {
              const { data } = await displayApi.get(`/overlays/for-display?token=${displayToken}`);
              if (data.success) setOverlayData(data);
            } catch { /* ignore */ }
            overlayFetchRef.current = setInterval(async () => {
              try { const { data } = await displayApi.get(`/overlays/for-display?token=${displayToken}`); if (data.success) setOverlayData(data); } catch { /* ignore */ }
            }, 5 * 60 * 1000);
          } else if (cmd.command_type === 'screenshot') {
            // Capture current screen frame and upload
            try {
              let imageData = null;
              if (videoRef.current && videoRef.current.readyState >= 2) {
                const canvas = document.createElement('canvas');
                canvas.width  = videoRef.current.videoWidth  || 1280;
                canvas.height = videoRef.current.videoHeight || 720;
                canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
                imageData = canvas.toDataURL('image/jpeg', 0.6);
              } else {
                // Slideshow — grab first visible img
                const img = document.querySelector('img[data-slide]');
                if (img && img.complete) {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.naturalWidth || 1280; canvas.height = img.naturalHeight || 720;
                  canvas.getContext('2d').drawImage(img, 0, 0);
                  imageData = canvas.toDataURL('image/jpeg', 0.6);
                }
              }
              if (imageData) {
                await displayApi.post('/displays/screenshot', { token: displayToken, imageData });
              }
            } catch { /* ignore screenshot errors */ }
          }

          await displayApi.patch(`/displays/commands/${cmd.id}/execute`).catch(() => {});
        }
      } catch { /* network down — silent */ }
    };

    poll();
    commandPollRef.current = setInterval(poll, COMMAND_POLL_INTERVAL_MS);
    return () => clearInterval(commandPollRef.current);
  }, [displayToken, display, channels, activeOverride, enterFullscreen, verifyDisplay]);

  // ── Video player ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentChannel?.url || !videoRef.current) return;

    const video = videoRef.current;
    const ua = navigator.userAgent || '';
    const isIOS = (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isHLS = (() => {
      try { return new URL(currentChannel.url).pathname.toLowerCase().endsWith('.m3u8'); }
      catch { return currentChannel.url?.toLowerCase().includes('.m3u8') ?? false; }
    })();

    let retryCount = 0;
    const maxRetries = 5;
    let hasStarted = false;
    let playTimeout = null;

    const clearPT = () => { if (playTimeout) { clearTimeout(playTimeout); playTimeout = null; } };

    const startPT = () => {
      clearPT();
      playTimeout = setTimeout(() => {
        if (!hasStarted && retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => setupPlayer(), 2000);
        }
      }, 15_000);
    };

    const setupPlayer = () => {
      clearPT();
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

      if (isHLS && (isIOS || (!Hls.isSupported() && video.canPlayType('application/vnd.apple.mpegurl') !== ''))) {
        // Native HLS (iOS / Safari)
        video.src = ''; video.load();
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = false;
        video.src = currentChannel.url;
        startPT();
        video.play().catch(() => { video.muted = true; setIsMuted(true); video.play().catch(() => {}); });
      } else if (isHLS && Hls.isSupported()) {
        // HLS.js
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 30, maxMaxBufferLength: 60 });
        hlsRef.current = hls;
        hls.loadSource(currentChannel.url);
        hls.attachMedia(video);
        startPT();
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.muted = false;
          video.play().catch(() => { video.muted = true; setIsMuted(true); video.play().catch(() => {}); });
        });
        hls.on(Hls.Events.ERROR, (_, d) => {
          if (d.fatal && retryCount < maxRetries) { retryCount++; setTimeout(() => setupPlayer(), 5_000); }
        });
      } else {
        // Native MP4 / RTSP fallback
        video.src = currentChannel.url;
        video.playsInline = true;
        startPT();
        video.play().catch(() => { video.muted = true; setIsMuted(true); video.play().catch(() => {}); });
      }
    };

    const onPlaying = () => { hasStarted = true; clearPT(); };
    video.addEventListener('playing', onPlaying);

    setupPlayer();

    return () => {
      clearPT();
      video.removeEventListener('playing', onPlaying);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [currentChannel]);

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
        console.log('[Kiosk] Stream failing — switching to failover playlist', failoverId);
        failoverActiveRef.current = true;
        setDisplay(prev => prev ? { ...prev, displayType: 'media', mediaPlaylistId: failoverId } : prev);
      }
    }, failoverMins * 60_000);

    return () => clearTimeout(failoverTimerRef.current);
  }, [display, currentChannel]);

  // ── Start overlay (tap to enter fullscreen) ──────────────────────────────

  const handleStart = async () => {
    setShowStartOverlay(false);
    await enterFullscreen();
  };

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
    return <FallbackScreen retryIn={0} message={error} />;
  }

  if (showFallback && !display) {
    return <FallbackScreen retryIn={retryIn} message={fallbackMsg} />;
  }

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen bg-black overflow-hidden relative"
      style={{ cursor: cursorVisible ? 'default' : 'none' }}
    >
      {/* ── Tap-to-start overlay (first load) ──────────────────── */}
      {showStartOverlay && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={handleStart}
        >
          <div className="w-20 h-20 rounded-2xl bg-[#B03A48] flex items-center justify-center mb-6 shadow-2xl">
            <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none">
              <rect x="6" y="28" width="36" height="6" rx="3" fill="white" opacity=".9"/>
              <rect x="6" y="20" width="36" height="6" rx="3" fill="white" opacity=".7"/>
              <rect x="6" y="12" width="36" height="6" rx="3" fill="white" opacity=".5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Bake &amp; Grill TV</h1>
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
          <FallbackScreen retryIn={retryIn} message={fallbackMsg || 'No channel assigned'} />
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#B03A48] hover:bg-[#8f2d3a] text-white px-8 py-4 rounded-full shadow-2xl transition-all z-30"
        >
          <svg className="w-8 h-8 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          Tap to Unmute
        </button>
      )}

      {/* ── Channel info chip (bottom-right) ──────────────────────── */}
      {currentChannel && !showStartOverlay && (
        <div className="absolute bottom-8 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10 pointer-events-none">
          <p className="text-white text-sm font-medium">{currentChannel.name}</p>
          {currentChannel.group && <p className="text-gray-400 text-xs">{currentChannel.group}</p>}
        </div>
      )}

      {/* ── Fullscreen button (only when not in fullscreen & overlay gone) ── */}
      {!isFullscreen && !showStartOverlay && (
        <button
          onClick={enterFullscreen}
          className="absolute top-4 left-4 bg-black/60 hover:bg-black/80 text-white p-3 rounded-lg shadow-lg transition-all z-20 backdrop-blur-sm"
          title="Enter Fullscreen"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      )}

      {/* ── Display name chip (top-right, not in fullscreen) ─────────── */}
      {display?.name && !isFullscreen && !showStartOverlay && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full pointer-events-none">
          <p className="text-white/70 text-xs">{display.name}</p>
        </div>
      )}

      {/* ── WiFi QR overlay ────────────────────────────────────────────── */}
      {display?.showWifiQr && display?.wifiSsid && !showStartOverlay && (() => {
        const ssid = display.wifiSsid;
        const pass = display.wifiPassword || '';
        const sec  = display.wifiSecurity || 'WPA';
        const wifiString = `WIFI:T:${sec};S:${ssid};P:${pass};;`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(wifiString)}&bgcolor=000000&color=ffffff&margin=4`;
        const pos = display.wifiQrPosition || 'bottom-right';
        const posClass = pos === 'bottom-left' ? 'bottom-6 left-6'
          : pos === 'top-right' ? 'top-6 right-6'
          : pos === 'top-left'  ? 'top-6 left-6'
          : 'bottom-6 right-6';
        return (
          <div className={`absolute ${posClass} pointer-events-none z-20`} style={{ zIndex: 1000 }}>
            <div className="bg-black/80 backdrop-blur-sm rounded-xl p-2 border border-white/10 flex flex-col items-center gap-1">
              <img src={qrUrl} alt="WiFi QR" width={80} height={80} className="rounded" />
              <p className="text-white text-xs font-medium text-center leading-tight">📶 {ssid}</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
