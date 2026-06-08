/**
 * Announcement Overlay Component
 * Full-screen announcement for kiosk displays
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import api from '../services/api';
import useFeatureFlag from '../hooks/useFeatureFlag';

function AnnouncementOverlay({
  displayId,
  displayToken,
  apiClient,
  clearSignal = 0,
  onDismiss,
}) {
  const [announcement, setAnnouncement] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const announcementsEnabled = useFeatureFlag('announcements');
  const onDismissRef = useRef(onDismiss);
  const client = apiClient || api;

  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  const clearAnnouncement = useCallback(async () => {
    setAnnouncement(null);
    setTimeRemaining(0);
    onDismissRef.current?.();
    if (!displayId || !displayToken) return;
    try {
      await client.delete(`/announcements/${displayId}/dismiss`, {
        params: { token: displayToken },
      });
    } catch {
      // Local dismiss still hides overlay; remote clear may follow
    }
  }, [client, displayId, displayToken]);

  useEffect(() => {
    if (clearSignal > 0) {
      setAnnouncement(null);
      setTimeRemaining(0);
    }
  }, [clearSignal]);

  useEffect(() => {
    if (!announcementsEnabled || !displayId || !displayToken) return;

    const checkForAnnouncements = async () => {
      try {
        const response = await client.get(`/announcements/${displayId}`, {
          params: { token: displayToken },
        });
        if (response.data.success && response.data.announcement) {
          setAnnouncement(response.data.announcement);
        } else {
          setAnnouncement(null);
        }
      } catch (error) {
        console.error('Error fetching announcement:', error);
        setAnnouncement(null);
      }
    };

    checkForAnnouncements();
    const interval = setInterval(checkForAnnouncements, 5000);
    return () => clearInterval(interval);
  }, [displayId, displayToken, announcementsEnabled, client, clearSignal]);

  useEffect(() => {
    if (!announcement) return;

    setTimeRemaining(announcement.duration_seconds || 10);

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAnnouncement(null);
          onDismissRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [announcement]);

  const handleDismiss = async () => {
    if (dismissing) return;
    setDismissing(true);
    await clearAnnouncement();
    setDismissing(false);
  };

  if (!announcementsEnabled || !announcement) {
    return null;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleDismiss}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDismiss(); }}
      className="fixed inset-0 z-[2147483647] flex flex-col items-center justify-center p-8 cursor-pointer animate-fade-in"
      style={{
        backgroundColor: announcement.background_color || 'rgba(0, 0, 0, 0.9)',
      }}
    >
      <div className="text-center max-w-4xl w-full space-y-6 pointer-events-none">
        <div
          className="text-5xl md:text-7xl font-bold leading-tight animate-scale-in"
          style={{ color: announcement.text_color || '#ffffff' }}
        >
          {announcement.text}
        </div>

        {announcement.text_dv && (
          <div
            className="text-4xl md:text-6xl font-bold leading-tight"
            style={{ color: announcement.text_color || '#ffffff', opacity: 0.9 }}
          >
            {announcement.text_dv}
          </div>
        )}

        <div
          className="text-2xl font-medium"
          style={{ color: announcement.text_color || '#ffffff', opacity: 0.6 }}
        >
          {timeRemaining}s
        </div>

        <p
          className="text-lg font-semibold mt-8 px-6 py-3 rounded-full inline-block border-2"
          style={{
            color: announcement.text_color || '#ffffff',
            borderColor: `${announcement.text_color || '#ffffff'}55`,
            opacity: 0.85,
          }}
        >
          {dismissing ? 'Dismissing…' : 'Tap anywhere to dismiss'}
        </p>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-scale-in { animation: scale-in 0.5s ease-out; }
      `}</style>
    </div>
  );
}

AnnouncementOverlay.propTypes = {
  displayId: PropTypes.number.isRequired,
  displayToken: PropTypes.string,
  apiClient: PropTypes.object,
  clearSignal: PropTypes.number,
  onDismiss: PropTypes.func,
};

export default AnnouncementOverlay;
