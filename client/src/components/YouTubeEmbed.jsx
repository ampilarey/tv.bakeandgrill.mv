/**
 * YouTube Embed Component
 * Embed YouTube videos and playlists
 * Phase 4: YouTube & Video Support
 */
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

// Module-level singleton so multiple YouTubeEmbed instances don't overwrite
// window.onYouTubeIframeAPIReady — last-writer-wins would leave earlier
// instances stuck on the loading spinner forever.
let _ytPromise = null;
function loadYouTubeAPI() {
  if (_ytPromise) return _ytPromise;
  _ytPromise = new Promise(resolve => {
    if (window.YT?.Player) { resolve(); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = resolve;
  });
  return _ytPromise;
}

function YouTubeEmbed({
  videoId,
  playlistId,
  autoplay = true,
  muted = true,
  loop = false,
  controls = false,
  onEnd,
  className = ''
}) {
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef(null);
  const containerRef = useRef(null);

  // Extract video ID from URL if needed
  const extractVideoId = (url) => {
    if (!url) return null;
    
    // Already a video ID
    if (url.length === 11 && !url.includes('/') && !url.includes('=')) {
      return url;
    }

    // Standard YouTube URL
    const standardMatch = url.match(/[?&]v=([^&]+)/);
    if (standardMatch) return standardMatch[1];

    // Short URL (youtu.be)
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) return shortMatch[1];

    // Embed URL
    const embedMatch = url.match(/embed\/([^?&]+)/);
    if (embedMatch) return embedMatch[1];

    return null;
  };

  const extractPlaylistId = (url) => {
    if (!url) return null;

    // Already a playlist ID
    if (url.length === 34 && url.startsWith('PL')) {
      return url;
    }

    // Playlist URL
    const match = url.match(/[?&]list=([^&]+)/);
    return match ? match[1] : null;
  };

  const actualVideoId = extractVideoId(videoId);
  const actualPlaylistId = extractPlaylistId(playlistId);

  useEffect(() => {
    if (!actualVideoId && !actualPlaylistId) {
      setError('Invalid YouTube video or playlist ID');
      return;
    }

    let cancelled = false;
    loadYouTubeAPI().then(() => {
      if (!cancelled) setIsReady(true);
    });

    return () => {
      cancelled = true;
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  // Re-run only when the video/playlist identity changes, not on every render
  }, [actualVideoId, actualPlaylistId]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;
    if (!actualVideoId && !actualPlaylistId) return;

    // Destroy existing player
    if (playerRef.current && playerRef.current.destroy) {
      playerRef.current.destroy();
    }

    // Create new player
    try {
      const playerVars = {
        autoplay: autoplay ? 1 : 0,
        mute: muted ? 1 : 0,
        loop: loop ? 1 : 0,
        controls: controls ? 1 : 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        playsinline: 1,
        enablejsapi: 1,
        origin: window.location.origin
      };

      if (actualPlaylistId) {
        playerVars.list = actualPlaylistId;
        playerVars.listType = 'playlist';
      } else if (loop && actualVideoId) {
        playerVars.playlist = actualVideoId; // Required for loop to work
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: actualVideoId,
        playerVars,
        events: {
          onReady: (event) => {
            if (autoplay) {
              event.target.playVideo();
            }
          },
          onStateChange: (event) => {
            // YT.PlayerState.ENDED = 0
            if (event.data === 0 && onEnd) {
              onEnd();
            }
          },
          onError: (event) => {
            console.error('YouTube player error:', event.data);
            const errorMessages = {
              2: 'Invalid video ID',
              5: 'HTML5 player error',
              100: 'Video not found',
              101: 'Video not allowed to be played in embedded players',
              150: 'Video not allowed to be played in embedded players'
            };
            setError(errorMessages[event.data] || 'Playback error');
            
            // Auto-skip on error
            if (onEnd) {
              setTimeout(onEnd, 2000);
            }
          }
        }
      });
    } catch (err) {
      console.error('Error creating YouTube player:', err);
      setError('Failed to load YouTube player');
    }
  }, [isReady, actualVideoId, actualPlaylistId, autoplay, muted, loop, controls, onEnd]);

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 ${className}`}>
        <div className="text-center text-white p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold mb-2">YouTube Error</h3>
          <p className="text-gray-400">{error}</p>
          {onEnd && (
            <p className="text-sm text-gray-500 mt-4">Skipping to next...</p>
          )}
        </div>
      </div>
    );
  }

  if (!actualVideoId && !actualPlaylistId) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 ${className}`}>
        <div className="text-center text-white">
          <p>Invalid YouTube URL</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <div ref={containerRef} className="absolute inset-0"></div>
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
        </div>
      )}
    </div>
  );
}

YouTubeEmbed.propTypes = {
  videoId: PropTypes.string,
  playlistId: PropTypes.string,
  autoplay: PropTypes.bool,
  muted: PropTypes.bool,
  loop: PropTypes.bool,
  controls: PropTypes.bool,
  onEnd: PropTypes.func,
  className: PropTypes.string
};

export default YouTubeEmbed;

