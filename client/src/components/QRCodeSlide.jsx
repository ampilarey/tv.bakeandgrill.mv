/**
 * QR Code Slide Component
 * Display QR code with optional image/text
 * Phase 2: Images & QR Codes
 */
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';

function QRCodeSlide({
  qrUrl,
  title,
  description,
  imageUrl,
  duration = 15,
  onComplete,
  layout = 'centered', // 'centered', 'side-by-side', 'stacked'
  backgroundColor = '#ffffff',
  qrColor = '#000000',
  className = ''
}) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (duration <= 0) return;
    setTimeRemaining(duration);

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onCompleteRef.current) onCompleteRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [duration]);

  const renderQRCode = () => (
    <QRCodeSVG
      value={qrUrl}
      size={256}
      level="H"
      includeMargin={true}
      fgColor={qrColor}
      bgColor={backgroundColor}
    />
  );

  const renderContent = () => {
    switch (layout) {
      case 'side-by-side':
        return (
          <div className="flex items-center justify-center gap-12">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={title}
                className="max-w-md max-h-96 object-contain rounded-lg shadow-2xl"
              />
            )}
            <div className="flex flex-col items-center gap-6">
              {renderQRCode()}
              {(title || description) && (
                <div className="text-center max-w-sm">
                  {title && <h2 className="text-3xl font-bold mb-2">{title}</h2>}
                  {description && <p className="text-lg text-gray-600">{description}</p>}
                </div>
              )}
            </div>
          </div>
        );

      case 'stacked':
        return (
          <div className="flex flex-col items-center gap-8">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={title}
                className="max-w-2xl max-h-64 object-contain rounded-lg shadow-2xl"
              />
            )}
            {(title || description) && (
              <div className="text-center max-w-2xl">
                {title && <h2 className="text-4xl font-bold mb-3">{title}</h2>}
                {description && <p className="text-xl text-gray-600">{description}</p>}
              </div>
            )}
            {renderQRCode()}
            <p className="text-lg text-gray-500 font-medium">Scan to view</p>
          </div>
        );

      case 'centered':
      default:
        return (
          <div className="flex flex-col items-center gap-6">
            {(title || description) && (
              <div className="text-center max-w-2xl">
                {title && <h2 className="text-4xl font-bold mb-3">{title}</h2>}
                {description && <p className="text-xl text-gray-600 mb-4">{description}</p>}
              </div>
            )}
            <div className="bg-white p-6 rounded-2xl shadow-2xl">
              {renderQRCode()}
            </div>
            <p className="text-lg text-gray-500 font-medium">Scan with your phone</p>
          </div>
        );
    }
  };

  return (
    <div className={`relative w-full h-full flex items-center justify-center p-12 ${className}`}
         style={{ backgroundColor }}>
      {renderContent()}

      {duration > 0 && (
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {timeRemaining}s
        </div>
      )}
    </div>
  );
}

QRCodeSlide.propTypes = {
  qrUrl: PropTypes.string.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  imageUrl: PropTypes.string,
  duration: PropTypes.number,
  onComplete: PropTypes.func,
  layout: PropTypes.oneOf(['centered', 'side-by-side', 'stacked']),
  backgroundColor: PropTypes.string,
  qrColor: PropTypes.string,
  className: PropTypes.string
};

export default QRCodeSlide;

