/**
 * Ticker Bar Component
 * Scrolling info ticker for news, offers, announcements
 * Phase 3: Info Ticker & Announcements
 */
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../services/api';
import useFeatureFlag from '../hooks/useFeatureFlag';

function TickerBar({ 
  displayId,
  backgroundColor = '#1e293b',
  textColor = '#ffffff',
  speed = 'normal', // 'slow', 'normal', 'fast'
  className = ''
}) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const tickerEnabled = useFeatureFlag('info_ticker');

  // Speed settings (pixels per second)
  const speedSettings = {
    slow: 30,
    normal: 50,
    fast: 80
  };

  useEffect(() => {
    if (!tickerEnabled) {
      setIsLoading(false);
      return;
    }

    fetchMessages();
    
    // Refresh messages every 5 minutes
    const interval = setInterval(fetchMessages, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [displayId, tickerEnabled]);

  const fetchMessages = async () => {
    try {
      const params = displayId ? { displayId } : {};
      const response = await api.get('/ticker', { params });
      
      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error fetching ticker messages:', error);
      // Don't crash - just show no messages
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!tickerEnabled || isLoading) {
    return null;
  }

  if (messages.length === 0) {
    return null;
  }

  // Combine all messages with separator
  const messageText = messages
    .map(m => m.text)
    .join('  •  ');

  // Calculate animation duration based on text length and speed
  const textLength = messageText.length;
  const pixelsPerChar = 10; // Approximate
  const totalPixels = textLength * pixelsPerChar;
  const animationDuration = totalPixels / speedSettings[speed];

  return (
    <div 
      className={`ticker-bar overflow-hidden ${className}`}
      style={{ 
        backgroundColor,
        color: textColor
      }}
    >
      <div className="ticker-content">
        <div 
          className="ticker-text whitespace-nowrap"
          style={{
            animation: `scroll ${animationDuration}s linear infinite`
          }}
        >
          {messageText}  •  {messageText}  {/* Repeat for seamless loop */}
        </div>
      </div>

      <style>{`
        .ticker-bar {
          padding: 0.75rem 0;
          position: relative;
          width: 100%;
        }

        .ticker-content {
          display: flex;
          overflow: hidden;
        }

        .ticker-text {
          display: inline-block;
          padding-left: 100%;
          font-size: 1.125rem;
          font-weight: 500;
        }

        @keyframes scroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        /* Pause on hover */
        .ticker-bar:hover .ticker-text {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

TickerBar.propTypes = {
  displayId: PropTypes.number,
  backgroundColor: PropTypes.string,
  textColor: PropTypes.string,
  speed: PropTypes.oneOf(['slow', 'normal', 'fast']),
  className: PropTypes.string
};

export default TickerBar;

