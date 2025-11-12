import { useEffect } from 'react';

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const colors = {
    success: 'bg-green-500/20 border-green-500/50 text-green-400',
    error: 'bg-red-500/20 border-red-500/50 text-red-400',
    warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-400'
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`${colors[type]} border rounded-lg p-4 shadow-lg backdrop-blur-sm max-w-md min-w-[300px]`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{icons[type]}</span>
          <div className="flex-1">
            <p className="font-medium">{message}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-current opacity-70 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

