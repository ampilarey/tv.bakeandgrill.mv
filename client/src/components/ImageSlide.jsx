/**
 * Image Slide Component
 * Display image with auto-advance after duration
 * Phase 2: Images & QR Codes
 */
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

function ImageSlide({ 
  imageUrl, 
  title, 
  duration = 10, 
  onComplete,
  className = ''
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration);

  useEffect(() => {
    if (!isLoaded) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onComplete) onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoaded, duration, onComplete]);

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  const handleImageError = () => {
    console.error('Failed to load image:', imageUrl);
    if (onComplete) onComplete(); // Skip to next slide on error
  };

  return (
    <div className={`relative w-full h-full bg-gray-900 flex items-center justify-center ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      <img
        src={imageUrl}
        alt={title || 'Slide image'}
        className="max-w-full max-h-full object-contain"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />

      {title && isLoaded && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          <h3 className="text-white text-2xl font-bold">{title}</h3>
        </div>
      )}

      {isLoaded && duration > 0 && (
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {timeRemaining}s
        </div>
      )}
    </div>
  );
}

ImageSlide.propTypes = {
  imageUrl: PropTypes.string.isRequired,
  title: PropTypes.string,
  duration: PropTypes.number,
  onComplete: PropTypes.func,
  className: PropTypes.string
};

export default ImageSlide;

