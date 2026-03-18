/**
 * HTML5 Video Player Component
 * Play MP4, WebM, and other HTML5 video formats
 * Phase 4: YouTube & Video Support
 */
import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

function VideoPlayer({
  videoUrl,
  title,
  autoplay = true,
  muted = true,
  loop = false,
  controls = true,
  onEnd,
  className = ''
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  // Keep onEnd in a ref so it can be called from event handlers without
  // making the effect depend on an unstable function reference.  Without this,
  // an inline `onEnd` prop would tear down and re-add all listeners on every
  // parent re-render, potentially missing the loadeddata event.
  const onEndRef = useRef(onEnd);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setIsLoading(false);
      if (autoplay) {
        playVideo();
      }
    };

    const handleError = () => {
      setError('Failed to load video');
      setIsLoading(false);
      if (onEndRef.current) {
        setTimeout(onEndRef.current, 2000);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onEndRef.current && !loop) {
        onEndRef.current();
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  // onEnd intentionally omitted — accessed via onEndRef
  }, [autoplay, loop]);

  const playVideo = async () => {
    try {
      await videoRef.current?.play();
    } catch (err) {
      console.error('Error playing video:', err);
      // Some browsers require user interaction before playing
      setError('Could not autoplay video');
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      playVideo();
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 ${className}`}>
        <div className="text-center text-white p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold mb-2">Video Error</h3>
          <p className="text-gray-400">{error}</p>
          {title && <p className="text-sm text-gray-500 mt-2">{title}</p>}
          {onEnd && (
            <p className="text-sm text-gray-500 mt-4">Skipping to next...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        muted={muted}
        loop={loop}
        controls={controls}
        playsInline
        preload="auto"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            {title && <p className="text-white">{title}</p>}
            <p className="text-gray-400 text-sm mt-2">Loading video...</p>
          </div>
        </div>
      )}

      {title && !controls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          <h3 className="text-white text-2xl font-bold">{title}</h3>
        </div>
      )}

      {/* Simple Controls Overlay (if not using native controls) */}
      {!controls && !isLoading && (
        <div className="absolute bottom-4 right-4 flex gap-3">
          <button
            onClick={togglePlay}
            className="bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <button
            onClick={toggleMute}
            className="bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-colors"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

VideoPlayer.propTypes = {
  videoUrl: PropTypes.string.isRequired,
  title: PropTypes.string,
  autoplay: PropTypes.bool,
  muted: PropTypes.bool,
  loop: PropTypes.bool,
  controls: PropTypes.bool,
  onEnd: PropTypes.func,
  className: PropTypes.string
};

export default VideoPlayer;

