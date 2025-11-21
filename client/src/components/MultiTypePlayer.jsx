/**
 * Multi-Type Player Component
 * Routes content to appropriate player based on type
 * Phase 2: Images & QR Codes
 * Phase 4: YouTube & Video Support
 */
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ImageSlide from './ImageSlide';
import QRCodeSlide from './QRCodeSlide';
import YouTubeEmbed from './YouTubeEmbed';
import VideoPlayer from './VideoPlayer';
import OneDriveEmbed from './OneDriveEmbed';
import useFeatureFlag from '../hooks/useFeatureFlag';

function MultiTypePlayer({ 
  item, 
  onComplete,
  autoPlay = true,
  className = ''
}) {
  const [error, setError] = useState(null);
  const imageSlidesEnabled = useFeatureFlag('image_slides');
  const qrCodesEnabled = useFeatureFlag('qr_codes');
  const youtubeEnabled = useFeatureFlag('youtube_embed');

  // Fallback for disabled features
  useEffect(() => {
    if (item.type === 'image' && !imageSlidesEnabled) {
      setError('Image slides feature is not enabled');
      if (onComplete) {
        setTimeout(onComplete, 1000);
      }
    }
  }, [item.type, imageSlidesEnabled, onComplete]);

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const handleError = (errorMsg) => {
    console.error('Player error:', errorMsg);
    setError(errorMsg);
    // Auto-skip to next item after 2 seconds on error
    setTimeout(handleComplete, 2000);
  };

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 ${className}`}>
        <div className="text-center text-white p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold mb-2">Content Error</h3>
          <p className="text-gray-400">{error}</p>
          <p className="text-sm text-gray-500 mt-4">Skipping to next...</p>
        </div>
      </div>
    );
  }

  // Route to appropriate player based on content type
  switch (item.type) {
    case 'image':
      if (!imageSlidesEnabled) {
        return (
          <div className="flex items-center justify-center h-full bg-gray-900">
            <p className="text-white">Image slides are not enabled</p>
          </div>
        );
      }
      
      // Check if this is a QR code slide
      if (item.qr_target_url && qrCodesEnabled) {
        return (
          <QRCodeSlide
            qrUrl={item.qr_target_url}
            title={item.title}
            description={item.description}
            imageUrl={item.url}
            duration={item.duration_seconds || 15}
            onComplete={handleComplete}
            className={className}
          />
        );
      }
      
      // Regular image slide
      return (
        <ImageSlide
          imageUrl={item.url}
          title={item.title}
          duration={item.duration_seconds || 10}
          onComplete={handleComplete}
          className={className}
        />
      );

    case 'video':
      // HTML5 video player (MP4, WebM, etc.)
      return (
        <VideoPlayer
          videoUrl={item.url}
          title={item.title}
          autoplay={autoPlay}
          muted={item.sound_enabled === false}
          loop={false}
          controls={true}
          onEnd={handleComplete}
          className={className}
        />
      );

    case 'youtube':
      // YouTube single video
      if (!youtubeEnabled) {
        return (
          <div className="flex items-center justify-center h-full bg-gray-900">
            <p className="text-white">YouTube embedding is not enabled</p>
          </div>
        );
      }
      return (
        <YouTubeEmbed
          videoId={item.url}
          autoplay={autoPlay}
          muted={item.sound_enabled === false}
          loop={false}
          controls={false}
          onEnd={handleComplete}
          className={className}
        />
      );

    case 'youtube_playlist':
      // YouTube playlist
      if (!youtubeEnabled) {
        return (
          <div className="flex items-center justify-center h-full bg-gray-900">
            <p className="text-white">YouTube embedding is not enabled</p>
          </div>
        );
      }
      return (
        <YouTubeEmbed
          playlistId={item.url}
          autoplay={autoPlay}
          muted={item.sound_enabled === false}
          loop={true}
          controls={false}
          onEnd={handleComplete}
          className={className}
        />
      );

    case 'onedrive':
      // OneDrive video embed
      return (
        <OneDriveEmbed
          embedUrl={item.embed_url || item.url}
          title={item.title}
          autoplay={autoPlay}
          onEnd={handleComplete}
          className={className}
        />
      );

    case 'template':
      // Phase 7: Will implement template slides
      return (
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center text-white">
            <p className="text-xl">Template slides coming in Phase 7</p>
            <p className="text-sm text-gray-400 mt-2">{item.title}</p>
          </div>
        </div>
      );

    case 'm3u':
    default:
      // Fallback: M3U streams handled by existing HLS player
      return (
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center text-white">
            <p className="text-xl">M3U streams use the main HLS player</p>
            <p className="text-sm text-gray-400 mt-2">{item.title}</p>
          </div>
        </div>
      );
  }
}

MultiTypePlayer.propTypes = {
  item: PropTypes.shape({
    type: PropTypes.string.isRequired,
    title: PropTypes.string,
    description: PropTypes.string,
    url: PropTypes.string.isRequired,
    qr_target_url: PropTypes.string,
    duration_seconds: PropTypes.number,
    thumbnail_url: PropTypes.string
  }).isRequired,
  onComplete: PropTypes.func,
  autoPlay: PropTypes.bool,
  className: PropTypes.string
};

export default MultiTypePlayer;

