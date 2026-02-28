/**
 * PopupCardOverlay
 * Periodically shows a promo card (food photo + title + price + subtitle).
 * - Appears every popup_interval_seconds from first active card
 * - Visible for display_seconds then fades out
 * - Cycles through all active cards in order
 * - Safe area 'sports': shifts card away from bottom-right corner (up + inward)
 * - Falls back to text-only if image fails to load
 */
import { useState, useEffect, useRef } from 'react';

function filterNow(cards) {
  const now = new Date();
  return cards.filter(c => {
    if (!c.enabled) return false;
    if (c.start_at && new Date(c.start_at) > now) return false;
    if (c.end_at   && new Date(c.end_at)   < now) return false;
    return true;
  });
}

export default function PopupCardOverlay({ cards = [], safeArea = 'standard' }) {
  const [cardIdx, setCardIdx]   = useState(0);
  const [showing, setShowing]   = useState(false);
  const [imgOk, setImgOk]       = useState(true);
  const intervalRef             = useRef(null);
  const showTimerRef            = useRef(null);

  const active = filterNow(cards);
  const card   = active.length > 0 ? active[cardIdx % active.length] : null;

  useEffect(() => {
    if (!active.length) return;
    const interval = (card?.popup_interval_seconds || 30) * 1000;
    const visible  = (card?.display_seconds        || 12) * 1000;

    // Show immediately then on interval
    const show = () => {
      setImgOk(true);
      setShowing(true);
      showTimerRef.current = setTimeout(() => {
        setShowing(false);
        setTimeout(() => setCardIdx(i => (i + 1) % active.length), 500);
      }, visible);
    };

    show();
    intervalRef.current = setInterval(show, interval + visible + 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(showTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.length, cardIdx]);

  if (!card) return null;

  // Sports safe area: shift away from bottom-right corner
  const right  = safeArea === 'sports' ? '6vw' : '2.5vw';
  const bottom = safeArea === 'sports' ? '16vh' : '11vh'; // above bottom bar

  const hasImage = (card.image_url || card.asset_url) && imgOk;
  const imgSrc   = card.image_url || card.asset_url || null;

  return (
    <div
      className="pointer-events-none select-none"
      style={{
        position: 'absolute',
        right,
        bottom,
        width:  '22vw',
        zIndex: 45,
        opacity:   showing ? 1 : 0,
        transform: showing ? 'translateY(0) scale(1)' : 'translateY(1.5vh) scale(0.97)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        borderRadius: '1.2vw',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
        background: 'rgba(15,15,15,0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(176,58,72,0.4)',
      }}
    >
      {/* Image */}
      {imgSrc && (
        <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#111' }}>
          <img
            src={imgSrc}
            alt={card.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setImgOk(false)}
          />
        </div>
      )}

      {/* Text area */}
      <div style={{ padding: '1.2vh 1.2vw 1.4vh' }}>
        {/* Title + price */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5vw' }}>
          <p style={{
            fontSize:   '1.6vh',
            fontWeight: 800,
            color:      '#FFFFFF',
            lineHeight: 1.2,
            margin:     0,
            flex: 1,
            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
          }}>
            {card.title}
          </p>
          {card.price_text && (
            <span style={{
              fontSize:   '1.5vh',
              fontWeight: 900,
              color:      '#F5C842',
              flexShrink: 0,
              background: 'rgba(245,200,66,0.12)',
              padding:    '0.2vh 0.5vw',
              borderRadius: '0.4vw',
              border:     '1px solid rgba(245,200,66,0.3)',
            }}>
              {card.price_text}
            </span>
          )}
        </div>
        {/* Subtitle */}
        {card.subtitle && (
          <p style={{
            fontSize:   '1.2vh',
            color:      'rgba(255,255,255,0.65)',
            margin:     '0.4vh 0 0',
            lineHeight: 1.3,
            display:    '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow:   'hidden',
          }}>
            {card.subtitle}
          </p>
        )}
      </div>

      {/* Bottom accent */}
      <div style={{ height: '0.3vh', background: 'linear-gradient(90deg, #B03A48, transparent)' }} />
    </div>
  );
}
