import { useState, useEffect } from 'react';
import Button from './common/Button';

export default function VideoControls({ 
  videoRef, 
  hlsRef,
  onPiP,
  onFullscreen 
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showQuality, setShowQuality] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const updatePlaying = () => setIsPlaying(!video.paused);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('play', updatePlaying);
    video.addEventListener('pause', updatePlaying);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('play', updatePlaying);
      video.removeEventListener('pause', updatePlaying);
    };
  }, [videoRef]);

  useEffect(() => {
    if (hlsRef?.current) {
      const hls = hlsRef.current;
      const levels = hls.levels || [];
      setQualities(levels);
      setCurrentQuality(hls.currentLevel);
    }
  }, [hlsRef]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;
    
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = parseFloat(e.target.value);
  };

  const changeQuality = (level) => {
    if (hlsRef?.current) {
      hlsRef.current.currentLevel = level;
      setCurrentQuality(level);
      setShowQuality(false);
    }
  };

  const changePlaybackSpeed = (rate) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeed(false);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity">
      {/* Progress Bar */}
      <input
        type="range"
        min="0"
        max={duration || 0}
        value={currentTime}
        onChange={handleSeek}
        className="w-full h-1 mb-3 accent-primary cursor-pointer"
      />

      <div className="flex items-center justify-between gap-4">
        {/* Left Controls */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="text-white hover:text-primary transition-colors"
          >
            {isPlaying ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-white hover:text-primary">
              {isMuted || volume === 0 ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 accent-primary cursor-pointer"
            />
          </div>

          {/* Time */}
          <span className="text-white text-sm font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Playback Speed */}
          <div className="relative">
            <button
              onClick={() => setShowSpeed(!showSpeed)}
              className="px-3 py-1 text-sm text-white hover:text-primary bg-white/10 rounded"
            >
              {playbackRate}x
            </button>
            {showSpeed && (
              <div className="absolute bottom-full right-0 mb-2 bg-background-light border border-slate-600 rounded-lg shadow-lg overflow-hidden">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackSpeed(rate)}
                    className={`block w-full px-4 py-2 text-sm text-left hover:bg-primary ${
                      playbackRate === rate ? 'bg-primary text-white' : 'text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quality Selector */}
          {qualities.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowQuality(!showQuality)}
                className="px-3 py-1 text-sm text-white hover:text-primary bg-white/10 rounded"
              >
                {currentQuality === -1 ? 'Auto' : `${qualities[currentQuality]?.height}p`}
              </button>
              {showQuality && (
                <div className="absolute bottom-full right-0 mb-2 bg-background-light border border-slate-600 rounded-lg shadow-lg overflow-hidden">
                  <button
                    onClick={() => changeQuality(-1)}
                    className={`block w-full px-4 py-2 text-sm text-left hover:bg-primary ${
                      currentQuality === -1 ? 'bg-primary text-white' : 'text-white'
                    }`}
                  >
                    Auto
                  </button>
                  {qualities.map((level, index) => (
                    <button
                      key={index}
                      onClick={() => changeQuality(index)}
                      className={`block w-full px-4 py-2 text-sm text-left hover:bg-primary ${
                        currentQuality === index ? 'bg-primary text-white' : 'text-white'
                      }`}
                    >
                      {level.height}p {level.bitrate ? `(${Math.round(level.bitrate / 1000)}kbps)` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PiP */}
          <button
            onClick={onPiP}
            className="text-white hover:text-primary"
            title="Picture-in-Picture"
          >
            🖼️
          </button>

          {/* Fullscreen */}
          <button
            onClick={onFullscreen}
            className="text-white hover:text-primary"
            title="Fullscreen"
          >
            ⛶
          </button>
        </div>
      </div>
    </div>
  );
}

