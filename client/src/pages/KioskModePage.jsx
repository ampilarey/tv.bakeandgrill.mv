import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Hls from 'hls.js';
import Spinner from '../components/common/Spinner';

// Create a separate API client without auth headers for display mode
const displayApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default function KioskModePage() {
  const [searchParams] = useSearchParams();
  const displayToken = searchParams.get('token');
  
  const [display, setDisplay] = useState(null);
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [lastCommand, setLastCommand] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const commandPollingIntervalRef = useRef(null);
  const commandTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  // Listen for fullscreen changes and handle overlay positioning
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(inFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    // Also listen for video element's fullscreen (for Safari)
    if (videoRef.current) {
      videoRef.current.addEventListener('webkitbeginfullscreen', () => setIsFullscreen(true));
      videoRef.current.addEventListener('webkitendfullscreen', () => setIsFullscreen(false));
    }
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Verify display token and get configuration
  useEffect(() => {
    if (!displayToken) {
      setError('No display token provided');
      setLoading(false);
      return;
    }

    const verifyDisplay = async () => {
      try {
        console.log('🖥️ Verifying display with token:', displayToken);
        const response = await displayApi.post('/displays/verify', { token: displayToken });
        console.log('✅ Display verification successful:', response.data);
        
        const { display: displayData, playlist, channels: channelsList } = response.data;
        
        setDisplay(displayData);
        
        // Channels are now included in the verify response
        if (channelsList && channelsList.length > 0) {
          console.log('📺 Channels loaded:', channelsList.length);
          setChannels(channelsList);
          
          // Auto-play first channel
          const firstChannel = channelsList[0];
          console.log('▶️ Auto-playing:', firstChannel.name);
          setCurrentChannel(firstChannel);
        } else {
          console.warn('⚠️ No channels found for this display');
        }
      } catch (err) {
        console.error('❌ Display verification error:', err);
        console.error('Error details:', err.response?.data);
        setError(err.response?.data?.error || 'Invalid display token or display not found');
      } finally {
        setLoading(false);
      }
    };

    verifyDisplay();
  }, [displayToken]);

  // Send heartbeat every 30 seconds
  useEffect(() => {
    if (!displayToken || !display) return;

    const sendHeartbeat = async () => {
      try {
        await displayApi.post('/displays/heartbeat', {
          token: displayToken,
          current_channel_id: currentChannel?.id || null
        });
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    };

    // Initial heartbeat
    sendHeartbeat();

    // Set up interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000); // 30 seconds

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [displayToken, display, currentChannel]);

  // Poll for remote control commands every 2 seconds for fast response
  useEffect(() => {
    if (!displayToken || !display) return;

    const pollCommands = async () => {
      try {
        const response = await displayApi.get(`/displays/commands/${displayToken}`);
        const commands = response.data.commands || [];
        
        // Process commands
        for (const command of commands) {
          const commandData = command.command_data ? JSON.parse(command.command_data) : {};
          
          // Show visual feedback (will auto-hide after 3 seconds)
          const commandInfo = {
            type: command.command_type,
            data: commandData,
            time: new Date().toLocaleTimeString()
          };
          setLastCommand(commandInfo);
          
          // Also show notification in video (works in fullscreen)
          showVideoNotification(commandInfo);
          
          // Clear any existing timeout
          if (commandTimeoutRef.current) {
            clearTimeout(commandTimeoutRef.current);
          }
          
          // Auto-hide command indicator after 3 seconds
          commandTimeoutRef.current = setTimeout(() => {
            setLastCommand(null);
          }, 3000);
          
          // Handle different command types
          switch (command.command_type) {
            case 'change_channel':
              const targetChannel = channels.find(ch => ch.id === commandData.channel_id);
              if (targetChannel) {
                setCurrentChannel(targetChannel);
              }
              break;
              
            case 'set_volume':
              if (videoRef.current && commandData.volume !== undefined) {
                try {
                  const volumeDecimal = parseInt(commandData.volume) / 100;
                  videoRef.current.volume = volumeDecimal;
                  videoRef.current.muted = false;
                  setIsMuted(false);
                  
                  // Ensure video continues playing after volume change
                  if (videoRef.current.paused) {
                    videoRef.current.play().catch(err => {
                      console.error('Error resuming playback after volume change:', err);
                    });
                  }
                  
                  console.log(`🔊 Volume set to ${commandData.volume}%`);
                } catch (err) {
                  console.error('Error setting volume:', err);
                }
              }
              break;
              
            case 'mute':
              if (videoRef.current) {
                videoRef.current.muted = true;
                setIsMuted(true);
              }
              break;
              
            case 'unmute':
              if (videoRef.current) {
                videoRef.current.muted = false;
                setIsMuted(false);
                
                // Ensure video continues playing after unmute
                if (videoRef.current.paused) {
                  videoRef.current.play().catch(err => {
                    console.error('Error resuming playback after unmute:', err);
                  });
                }
              }
              break;
              
            default:
              console.warn('Unknown command type:', command.command_type);
          }
          
          // Mark command as executed
          await displayApi.patch(`/displays/commands/${command.id}/execute`);
        }
      } catch (error) {
        console.error('Command polling error:', error);
      }
    };

    // Initial poll
    pollCommands();

    // Set up interval - Poll every 2 seconds for fast command response (mute/unmute/channel change)
    commandPollingIntervalRef.current = setInterval(pollCommands, 2000); // 2 seconds

    return () => {
      if (commandPollingIntervalRef.current) {
        clearInterval(commandPollingIntervalRef.current);
      }
    };
  }, [displayToken, display, channels]);

  // Video player setup with auto-retry
  useEffect(() => {
    if (!currentChannel || !videoRef.current) return;

    const video = videoRef.current;
    const isHLS = currentChannel.url.endsWith('.m3u8');
    let retryCount = 0;
    const maxRetries = 3;

    const setupPlayer = () => {
      if (isHLS && Hls.isSupported()) {
        // Clean up existing instance
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60
        });

        hlsRef.current = hls;
        hls.loadSource(currentChannel.url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // Try playing with sound first
          video.muted = false;
          video.play().catch(err => {
            console.log('Auto-play with sound blocked, trying muted...');
            // If blocked, play muted (browsers require muted for auto-play)
            video.muted = true;
            setIsMuted(true);
            video.play().catch(e => console.error('Muted play error:', e));
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS Error:', data);
          
          if (data.fatal) {
            if (retryCount < maxRetries) {
              console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
              retryCount++;
              setTimeout(() => {
                hls.destroy();
                setupPlayer();
              }, 5000);
            } else {
              console.error('Max retries reached');
            }
          }
        });

      } else {
        // Native playback
        video.src = currentChannel.url;
        video.muted = false;
        video.play().catch(err => {
          console.log('Auto-play with sound blocked, trying muted...');
          video.muted = true;
          setIsMuted(true);
          video.play().catch(e => console.error('Muted play error:', e));
        });

        // Auto-retry on error
        video.addEventListener('error', () => {
          if (retryCount < maxRetries) {
            console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
            retryCount++;
            setTimeout(() => {
              video.load();
              video.play();
            }, 5000);
          }
        });
      }
    };

    setupPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentChannel]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Spinner size="xl" className="mb-4" />
          <p className="text-white text-lg">Initializing Display...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-center p-8 bg-red-900/20 rounded-lg border border-red-500/30 max-w-md">
          <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-2">Display Error</h2>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentChannel) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <svg className="w-24 h-24 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 text-lg">No channel assigned</p>
        </div>
      </div>
    );
  }

  const handleUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  // Show notification overlay on video (works even in fullscreen)
  const showVideoNotification = (commandInfo) => {
    if (!videoRef.current) return;

    // Create a text track for displaying notifications (works in fullscreen!)
    let track = Array.from(videoRef.current.textTracks).find(t => t.label === 'notifications');
    
    if (!track) {
      const trackElement = document.createElement('track');
      trackElement.kind = 'metadata';
      trackElement.label = 'notifications';
      trackElement.srclang = 'en';
      videoRef.current.appendChild(trackElement);
      track = videoRef.current.textTracks[videoRef.current.textTracks.length - 1];
      track.mode = 'hidden'; // We'll use custom rendering
    }

    // Create a temporary cue/notification overlay
    // Since iOS doesn't allow DOM overlays in fullscreen, we'll use a different approach:
    // Create a floating div that mimics Picture-in-Picture style notification
    
    const notification = document.createElement('div');
    notification.className = 'video-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(255, 193, 7, 0.95);
      color: black;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      font-weight: bold;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: none;
      animation: slideIn 0.3s ease-out;
    `;
    
    let text = `🎮 ${commandInfo.type}`;
    if (commandInfo.data.volume) text += ` ${commandInfo.data.volume}%`;
    
    notification.textContent = text;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  };

  return (
    <div ref={containerRef} className="h-screen w-screen bg-black overflow-hidden relative">
      {/* Full Screen Video Player */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        controls
        playsInline
      />
      
      {/* Command Indicator - Positioned over video (with high z-index for fullscreen) */}
      {lastCommand && (
        <div 
          className="fixed top-4 left-4 bg-yellow-500/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-2xl transition-opacity duration-500 pointer-events-none"
          style={{ zIndex: 2147483647 }}
        >
          <p className="text-black text-sm font-bold">
            🎮 {lastCommand.type}
            {lastCommand.data.volume && ` (${lastCommand.data.volume}%)`}
          </p>
          <p className="text-black/70 text-xs">{lastCommand.time}</p>
        </div>
      )}

      {/* Unmute Button (if muted) */}
      {isMuted && (
        <button
          onClick={handleUnmute}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-full shadow-2xl transition-all z-10"
        >
          <svg className="w-8 h-8 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          Click to Unmute
        </button>
      )}

      {/* Channel Info Overlay (small, bottom-right) */}
      <div className="absolute bottom-20 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
        <p className="text-white text-sm font-medium">{currentChannel.name}</p>
        {currentChannel.group && (
          <p className="text-gray-400 text-xs">{currentChannel.group}</p>
        )}
      </div>

      {/* Display Name (small, top-right) - hidden in fullscreen */}
      {display?.name && !isFullscreen && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
          <p className="text-white/70 text-xs">{display.name}</p>
        </div>
      )}
    </div>
  );
}

