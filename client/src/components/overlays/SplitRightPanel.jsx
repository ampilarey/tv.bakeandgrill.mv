/**
 * SplitRightPanel
 * Wraps the main video/slideshow in a 75/25 split layout.
 * The right panel rotates through promo cards and shows active messages.
 */
import { useState, useEffect, useRef } from 'react';

function filterNow(items) {
  const now = new Date();
  return items.filter(i => {
    if (!i.enabled) return false;
    if (i.start_at && new Date(i.start_at) > now) return false;
    if (i.end_at   && new Date(i.end_at)   < now) return false;
    return true;
  });
}

function RightPanelCard({ card, visible }) {
  const [imgOk, setImgOk] = useState(true);
  const imgSrc = card.image_url || card.asset_url || null;

  useEffect(() => { setImgOk(true); }, [card.id]);

  return (
    <div style={{
      position:   'absolute',
      inset:      0,
      opacity:    visible ? 1 : 0,
      transition: 'opacity 0.5s ease',
      display:    'flex',
      flexDirection: 'column',
      overflow:   'hidden',
    }}>
      {/* Image */}
      {imgSrc && imgOk && (
        <div style={{ flex: '0 0 55%', overflow: 'hidden', background: '#111' }}>
          <img
            src={imgSrc}
            alt={card.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setImgOk(false)}
          />
        </div>
      )}
      {/* Info */}
      <div style={{ flex: 1, padding: '2vh 1.5vw', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ fontSize: '2.2vh', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
          {card.title}
        </p>
        {card.price_text && (
          <p style={{ fontSize: '2.8vh', fontWeight: 900, color: '#F5C842', margin: '1vh 0 0.5vh' }}>
            {card.price_text}
          </p>
        )}
        {card.subtitle && (
          <p style={{ fontSize: '1.5vh', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.4 }}>
            {card.subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SplitRightPanel({ messages = [], cards = [], children }) {
  const [msgIdx,  setMsgIdx]  = useState(0);
  const [cardIdx, setCardIdx] = useState(0);
  const [msgVis,  setMsgVis]  = useState(true);
  const msgTimer  = useRef(null);
  const cardTimer = useRef(null);

  const activeMessages = filterNow(messages);
  const activeCards    = filterNow(cards);
  const msg  = activeMessages.length > 0 ? activeMessages[msgIdx  % activeMessages.length]  : null;
  const card = activeCards.length    > 0 ? activeCards[cardIdx % activeCards.length]    : null;

  // Rotate messages
  useEffect(() => {
    if (activeMessages.length <= 1) return;
    const dur = (msg?.rotation_seconds || 8) * 1000;
    msgTimer.current = setTimeout(() => {
      setMsgVis(false);
      setTimeout(() => { setMsgIdx(i => (i + 1) % activeMessages.length); setMsgVis(true); }, 350);
    }, dur);
    return () => clearTimeout(msgTimer.current);
  }, [msgIdx, activeMessages.length, msg]);

  // Rotate cards
  useEffect(() => {
    if (activeCards.length <= 1) return;
    const dur = (card?.display_seconds || 12) * 1000;
    cardTimer.current = setTimeout(() => setCardIdx(i => (i + 1) % activeCards.length), dur);
    return () => clearTimeout(cardTimer.current);
  }, [cardIdx, activeCards.length, card]);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#000' }}>
      {/* Left: main content (video / slideshow) — 75% */}
      <div style={{ flex: '0 0 75%', position: 'relative', overflow: 'hidden' }}>
        {children}
      </div>

      {/* Right panel — 25% */}
      <div style={{
        flex: '0 0 25%',
        background: 'linear-gradient(160deg, #0f0f0f 0%, #1a0a0c 100%)',
        borderLeft: '2px solid rgba(176,58,72,0.5)',
        display:    'flex',
        flexDirection: 'column',
        overflow:   'hidden',
        position:   'relative',
      }}>
        {/* Header */}
        <div style={{
          padding:    '1.5vh 1.2vw',
          borderBottom: '1px solid rgba(176,58,72,0.3)',
          display:    'flex',
          alignItems: 'center',
          gap:        '0.6vw',
          flexShrink: 0,
        }}>
          <div style={{ width: '0.35vw', height: '3vh', background: '#B03A48', borderRadius: '2px' }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.5vh', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Today&apos;s Specials
          </span>
        </div>

        {/* Rotating card */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {activeCards.length > 0
            ? activeCards.map((c, i) => (
                <RightPanelCard key={c.id} card={c} visible={i === cardIdx % activeCards.length} />
              ))
            : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.4vh', textAlign: 'center', padding: '2vh' }}>
                  Bake &amp; Grill TV
                </p>
              </div>
            )
          }
        </div>

        {/* Message ticker */}
        {msg && (
          <div style={{
            padding:    '1.2vh 1.2vw',
            borderTop:  '1px solid rgba(176,58,72,0.3)',
            background: 'rgba(10,10,10,0.6)',
            flexShrink: 0,
            minHeight:  '8vh',
            display:    'flex',
            alignItems: 'center',
            gap:        '0.5vw',
          }}>
            {msg.icon && <span style={{ fontSize: '1.8vh', flexShrink: 0 }}>{msg.icon}</span>}
            <span style={{
              fontSize:   '1.3vh',
              color:      'rgba(255,255,255,0.85)',
              fontWeight: 600,
              lineHeight: 1.4,
              opacity:    msgVis ? 1 : 0,
              transition: 'opacity 0.35s ease',
            }}>
              {msg.text}
            </span>
          </div>
        )}

        {/* Card pagination dots */}
        {activeCards.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4vw', padding: '0.8vh 0', flexShrink: 0 }}>
            {activeCards.map((_, i) => (
              <div key={i} style={{
                width: '0.5vw', height: '0.5vw', borderRadius: '50%',
                background: i === cardIdx % activeCards.length ? '#B03A48' : 'rgba(255,255,255,0.2)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
