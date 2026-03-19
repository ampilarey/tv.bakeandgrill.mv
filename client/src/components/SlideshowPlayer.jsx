/**
 * SlideshowPlayer
 * Loops a media_playlist forever on a TV display.
 *   - Images: shown for image_duration_seconds then fade to next
 *   - Videos: played to completion (if play_video_full) or 30 s max
 *   - On item error: retry 3× then skip
 *   - On empty / unavailable: show branded idle screen
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';

const getBase = () => {
  if (import.meta.env.DEV) {
    const h = window.location.hostname;
    if (h && h !== 'localhost' && h !== '127.0.0.1') return `http://${h}:4000/api`;
  }
  return '/api';
};
const api = axios.create({ baseURL: getBase() });

// ── Idle / fallback ────────────────────────────────────────────────────────
function IdleScreen({ message, showBrand = true }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black select-none">
      {showBrand && (
        <>
          <div className="w-20 h-20 rounded-2xl bg-[#B03A48] flex items-center justify-center mb-6 shadow-2xl">
            <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none">
              <rect x="6" y="28" width="36" height="6" rx="3" fill="white" opacity=".9"/>
              <rect x="6" y="20" width="36" height="6" rx="3" fill="white" opacity=".7"/>
              <rect x="6" y="12" width="36" height="6" rx="3" fill="white" opacity=".5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Bake &amp; Grill TV</h1>
        </>
      )}
      <p className="text-white/50 text-lg">{message || 'Content coming soon'}</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function SlideshowPlayer({ playlistId, muteAudio = false, showBrandOverlay = true, showClockOverlay = false, onNowPlaying }) {
  const [items, setItems]       = useState([]);
  const [idx, setIdx]           = useState(0);
  const [fade, setFade]         = useState(true);
  const [loadErr, setLoadErr]   = useState(false);
  const [clock, setClock]       = useState('');

  const videoRef    = useRef(null);
  const timerRef    = useRef(null);
  const retryRef    = useRef(0);
  const mountedRef  = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; clearTimeout(timerRef.current); }; }, []);

  // Clock overlay
  useEffect(() => {
    if (!showClockOverlay) return;
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [showClockOverlay]);

  // Load playlist items
  const loadItems = useCallback(async () => {
    if (!playlistId) return;
    try {
      const { data } = await api.get(`/media-playlists/${playlistId}/items`);
      if (!mountedRef.current) return;
      const list = data.items || [];
      setItems(list);
      setIdx(0);
      setLoadErr(false);
    } catch {
      if (mountedRef.current) setLoadErr(true);
    }
  }, [playlistId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Keep a ref so next() always sees the current length without being recreated
  const itemsLenRef = useRef(items.length);
  useEffect(() => { itemsLenRef.current = items.length; }, [items.length]);

  // Advance to next item
  const next = useCallback(() => {
    if (!mountedRef.current) return;
    retryRef.current = 0;
    setFade(false);
    setTimeout(() => {
      if (!mountedRef.current) return;
      setIdx(i => (i + 1) % Math.max(itemsLenRef.current, 1));
      setFade(true);
    }, 400); // fade duration
  }, []); // no dependency — reads length via ref

  const item = items[idx] || null;

  // Notify parent of current item
  useEffect(() => {
    if (onNowPlaying) onNowPlaying(item?.original_name || null);
  }, [item, onNowPlaying]);

  // Image timer
  useEffect(() => {
    if (!item || item.type !== 'image') return;
    clearTimeout(timerRef.current);
    const dur = (item.image_duration_seconds || 8) * 1000;
    timerRef.current = setTimeout(next, dur);
    return () => clearTimeout(timerRef.current);
  }, [item, next]);

  // Video end handler
  const handleVideoEnd = useCallback(() => next(), [next]);

  // Fallback timeout for video items: if the video never fires onEnded (e.g.
  // autoplay is blocked by the browser on mobile), advance after the item's
  // configured duration + 5 s buffer (or 65 s if no duration is set).
  useEffect(() => {
    if (!item || item.type !== 'video') return;
    const fallbackMs = ((item.duration || 60) + 5) * 1000;
    const timeout = setTimeout(next, fallbackMs);
    return () => clearTimeout(timeout);
  }, [item, next]);

  const handleError = useCallback(() => {
    retryRef.current += 1;
    if (retryRef.current <= 3) {
      // Retry after 1 s
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        if (videoRef.current) { videoRef.current.load(); videoRef.current.play().catch(() => {}); }
        if (item?.type === 'image') { setFade(false); timerRef.current = setTimeout(() => { if (mountedRef.current) setFade(true); }, 50); }
      }, 1000);
    } else {
      next(); // skip
    }
  }, [item, next]);

  // Render
  if (loadErr || items.length === 0) {
    return <IdleScreen message={loadErr ? 'Content unavailable' : 'Content coming soon'} showBrand={showBrandOverlay} />;
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      <AnimatePresence mode="sync">
        {item?.type === 'image' && (
          <motion.img
            key={`img-${item.id}`}
            src={item.url}
            alt={item.original_name}
            data-slide="true"
            className="absolute inset-0 w-full h-full object-contain"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5 } }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            onError={handleError}
            draggable={false}
          />
        )}
        {item?.type === 'video' && (
          <motion.video
            key={`vid-${item.id}`}
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-contain"
            src={item.url}
            autoPlay
            playsInline
            muted={muteAudio}
            onEnded={handleVideoEnd}
            onError={handleError}
            controls={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.4 } }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Clock overlay */}
      {showClockOverlay && clock && (
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white text-2xl font-mono px-4 py-2 rounded-xl pointer-events-none">
          {clock}
        </div>
      )}

      {/* Brand watermark */}
      {showBrandOverlay && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full pointer-events-none">
          <div className="w-5 h-5 rounded-md bg-[#B03A48] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
              <rect x="1" y="7" width="10" height="2" rx="1" fill="white" opacity=".9"/>
              <rect x="1" y="5" width="10" height="2" rx="1" fill="white" opacity=".7"/>
              <rect x="1" y="3" width="10" height="2" rx="1" fill="white" opacity=".5"/>
            </svg>
          </div>
          <span className="text-white/70 text-xs font-medium">Bake &amp; Grill TV</span>
        </div>
      )}

      {/* Item counter (hidden in production builds since console is stripped) */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-4 right-4 text-white/30 text-xs pointer-events-none">
          {idx + 1}/{items.length}
        </div>
      )}
    </div>
  );
}
