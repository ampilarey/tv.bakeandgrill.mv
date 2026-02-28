/**
 * BottomBarOverlay
 * Fixed ticker bar at the bottom of the screen.
 * - Rotates through active messages every rotation_seconds
 * - Optional QR code on the right (via qrserver.com, no dependencies)
 * - High-contrast, large font — readable from 3+ metres
 * - Safe area: 'sports' shifts bar up slightly to avoid corner scores
 */
import { useState, useEffect, useRef } from 'react';

const BAR_HEIGHT_VH = 9; // ~9% of screen height

function filterNow(messages) {
  const now = new Date();
  return messages.filter(m => {
    if (!m.enabled) return false;
    if (m.start_at && new Date(m.start_at) > now) return false;
    if (m.end_at   && new Date(m.end_at)   < now) return false;
    return true;
  });
}

export default function BottomBarOverlay({ messages = [], safeArea = 'standard' }) {
  const [idx, setIdx]       = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef            = useRef(null);

  const active = filterNow(messages);
  const msg    = active[idx % Math.max(active.length, 1)] || null;

  // Rotate messages
  useEffect(() => {
    if (active.length <= 1) return;
    const dur = (msg?.rotation_seconds || 8) * 1000;
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % active.length);
        setVisible(true);
      }, 350); // fade out → swap → fade in
    }, dur);
    return () => clearTimeout(timerRef.current);
  }, [idx, active.length, msg]);

  if (!active.length || !msg) return null;

  const bottomOffset = safeArea === 'sports' ? '2.5vh' : '0';
  const showQr = msg.show_qr && msg.qr_url;
  const qrSrc  = showQr
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=4&data=${encodeURIComponent(msg.qr_url)}`
    : null;

  return (
    <div
      className="pointer-events-none select-none"
      style={{
        position: 'absolute',
        bottom:   bottomOffset,
        left:     0,
        right:    0,
        height:   `${BAR_HEIGHT_VH}vh`,
        zIndex:   40,
        background: 'linear-gradient(to right, rgba(10,10,10,0.92) 0%, rgba(20,10,10,0.90) 100%)',
        borderTop: '2px solid rgba(176,58,72,0.7)',
        display:  'flex',
        alignItems: 'center',
        overflow: 'hidden',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      {/* Brand stripe */}
      <div style={{
        width: '0.4vw',
        height: '100%',
        background: '#B03A48',
        flexShrink: 0,
        marginRight: '1.2vw',
      }} />

      {/* Message text */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.35s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6vw',
        }}
      >
        {msg.icon && (
          <span style={{ fontSize: `${BAR_HEIGHT_VH * 0.42}vh`, lineHeight: 1, flexShrink: 0 }}>
            {msg.icon}
          </span>
        )}
        <span
          style={{
            fontSize:    `${BAR_HEIGHT_VH * 0.38}vh`,
            fontWeight:  700,
            color:       '#FFFFFF',
            letterSpacing: '0.01em',
            lineHeight:  1.15,
            textShadow:  '0 1px 4px rgba(0,0,0,0.8)',
            whiteSpace:  'nowrap',
            overflow:    'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {msg.text}
        </span>
      </div>

      {/* Pagination dots */}
      {active.length > 1 && (
        <div style={{ display: 'flex', gap: '0.4vw', marginRight: '1vw', flexShrink: 0 }}>
          {active.map((_, i) => (
            <div key={i} style={{
              width:  '0.5vw',
              height: '0.5vw',
              borderRadius: '50%',
              background: i === (idx % active.length) ? '#B03A48' : 'rgba(255,255,255,0.3)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      )}

      {/* QR code */}
      {showQr && (
        <div style={{
          flexShrink: 0,
          marginRight: '1vw',
          background: 'white',
          padding: '0.3vh',
          borderRadius: '4px',
          height: `${BAR_HEIGHT_VH * 0.8}vh`,
          width:  `${BAR_HEIGHT_VH * 0.8}vh`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            src={qrSrc}
            alt="QR"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
}
