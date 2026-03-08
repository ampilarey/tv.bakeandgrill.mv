/**
 * Announcement Overlay Component
 * Full-screen or modal announcement for displays
 * Phase 3: Info Ticker & Announcements
 */
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import api from '../services/api';
import useFeatureFlag from '../hooks/useFeatureFlag';

function AnnouncementOverlay({ displayId, onDismiss }) {
  const [announcement, setAnnouncement] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const announcementsEnabled = useFeatureFlag('announcements');
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    if (!announcementsEnabled || !displayId) return;

    checkForAnnouncements();

    // Check for new announcements every 10 seconds
    const interval = setInterval(checkForAnnouncements, 10000);
    return () => clearInterval(interval);
  }, [displayId, announcementsEnabled]);

  useEffect(() => {
    if (!announcement) return;

    setTimeRemaining(announcement.duration_seconds || 10);

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setAnnouncement(null);
          if (onDismissRef.current) onDismissRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [announcement]);

  const checkForAnnouncements = async () => {
    try {
      const response = await api.get(`/announcements/${displayId}`);
      
      if (response.data.success && response.data.announcement) {
        setAnnouncement(response.data.announcement);
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
      // Don't crash - just don't show announcements
      setAnnouncement(null);
    }
  };

  const handleDismiss = () => {
    setAnnouncement(null);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!announcementsEnabled || !announcement) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-8 animate-fade-in"
      style={{
        backgroundColor: announcement.background_color || 'rgba(0, 0, 0, 0.9)'
      }}
    >
      <div className="text-center max-w-4xl w-full space-y-6">
        {/* Main message */}
        <div 
          className="text-5xl md:text-7xl font-bold leading-tight animate-scale-in"
          style={{
            color: announcement.text_color || '#ffffff'
          }}
        >
          {announcement.text}
        </div>

        {/* Dhivehi text if available */}
        {announcement.text_dv && (
          <div 
            className="text-4xl md:text-6xl font-bold leading-tight"
            style={{
              color: announcement.text_color || '#ffffff',
              opacity: 0.9
            }}
          >
            {announcement.text_dv}
          </div>
        )}

        {/* Countdown */}
        <div 
          className="text-2xl font-medium"
          style={{
            color: announcement.text_color || '#ffffff',
            opacity: 0.6
          }}
        >
          {timeRemaining}s
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

AnnouncementOverlay.propTypes = {
  displayId: PropTypes.number.isRequired,
  onDismiss: PropTypes.func
};

export default AnnouncementOverlay;

