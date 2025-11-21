/**
 * OneDrive Embed Component
 * Embed videos from OneDrive
 * Phase 4: YouTube & Video Support
 */
import { useState } from 'react';
import PropTypes from 'prop-types';

function OneDriveEmbed({
  embedUrl,
  title,
  autoplay = false,
  onEnd,
  className = ''
}) {
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Convert OneDrive share link to embed URL if needed
  const getEmbedUrl = (url) => {
    if (!url) return null;

    // Already an embed URL
    if (url.includes('/embed')) {
      return url;
    }

    // Try to convert share URL to embed URL
    // OneDrive share URLs typically look like:
    // https://1drv.ms/v/s!xxx or https://onedrive.live.com/...
    try {
      // This is a simplified conversion - may need adjustment based on actual OneDrive URLs
      if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
        // Add autoplay parameter if needed
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}embed=1${autoplay ? '&autoplay=1' : ''}`;
      }
    } catch (err) {
      console.error('Error parsing OneDrive URL:', err);
    }

    return url;
  };

  const actualEmbedUrl = getEmbedUrl(embedUrl);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError('Failed to load OneDrive video');
    if (onEnd) {
      setTimeout(onEnd, 2000);
    }
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 ${className}`}>
        <div className="text-center text-white p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold mb-2">OneDrive Error</h3>
          <p className="text-gray-400">{error}</p>
          {title && <p className="text-sm text-gray-500 mt-2">{title}</p>}
          {onEnd && (
            <p className="text-sm text-gray-500 mt-4">Skipping to next...</p>
          )}
        </div>
      </div>
    );
  }

  if (!actualEmbedUrl) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 ${className}`}>
        <div className="text-center text-white">
          <p>Invalid OneDrive URL</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <iframe
        src={actualEmbedUrl}
        className="absolute inset-0 w-full h-full"
        frameBorder="0"
        scrolling="no"
        allowFullScreen
        allow="autoplay"
        onLoad={handleLoad}
        onError={handleError}
        title={title || 'OneDrive Video'}
      />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            {title && <p className="text-white">{title}</p>}
            <p className="text-gray-400 text-sm mt-2">Loading OneDrive video...</p>
          </div>
        </div>
      )}

      {title && isLoaded && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 pointer-events-none">
          <h3 className="text-white text-2xl font-bold">{title}</h3>
        </div>
      )}
    </div>
  );
}

OneDriveEmbed.propTypes = {
  embedUrl: PropTypes.string.isRequired,
  title: PropTypes.string,
  autoplay: PropTypes.bool,
  onEnd: PropTypes.func,
  className: PropTypes.string
};

export default OneDriveEmbed;

