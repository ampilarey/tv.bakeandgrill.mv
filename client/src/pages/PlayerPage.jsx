import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Hls from 'hls.js';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Spinner from '../components/common/Spinner';
import Badge from '../components/common/Badge';
import SkeletonLoader from '../components/SkeletonLoader';
import VideoControls from '../components/VideoControls';

export default function PlayerPage() {
  // 🚨 CRITICAL: Detect iOS FIRST - before anything else
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
  
  // 🚨 VERSION CHECK: Log to verify new code is running
  console.log('📱 PlayerPage.jsx loaded - Version: 2025-01-15-ios-native-hls-fix-v3');
  console.log('🔍 Device:', userAgent);
  console.log('🍎 iOS Detected:', isIOS);
  
  // 🚨 CRITICAL: If iOS, NEVER use HLS.js - disable it completely
  if (isIOS && typeof Hls !== 'undefined') {
    // Override HLS.js to prevent it from being used on iOS
    console.warn('🚫 iOS DETECTED - HLS.js DISABLED for iOS');
  }
  
  const [searchParams] = useSearchParams();
  const playlistId = searchParams.get('playlistId');
  
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [recentlyWatched, setRecentlyWatched] = useState([]);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [videoLoading, setVideoLoading] = useState(false);
  const [viewMode, setViewMode] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('channelViewMode') || 'list' : 'list'
  );
  const [displayedChannels, setDisplayedChannels] = useState(50); // Show 50 initially
  const [searchHistory, setSearchHistory] = useState(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    }
    return [];
  });
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [useCustomControls, setUseCustomControls] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });
  const [isChannelDrawerOpen, setIsChannelDrawerOpen] = useState(false);
  
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const currentChannelIsHLS = currentChannel?.url?.toLowerCase().endsWith('.m3u8') || false;
  const videoElementSrc = currentChannel && (!currentChannelIsHLS || isIOS) ? currentChannel.url : undefined;

  // Track viewport width for responsive/mobile layouts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close channel drawer automatically when leaving mobile view
  useEffect(() => {
    if (!isMobileView && isChannelDrawerOpen) {
      setIsChannelDrawerOpen(false);
    }
  }, [isMobileView, isChannelDrawerOpen]);

  // Prevent body scrolling when the drawer is open on mobile
  useEffect(() => {
    if (!isMobileView || !isChannelDrawerOpen || typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileView, isChannelDrawerOpen]);

  // Save view mode preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('channelViewMode', viewMode);
    }
  }, [viewMode]);

  // Remember last visited playlist for quick access via bottom navigation
  useEffect(() => {
    if (playlistId && typeof window !== 'undefined') {
      window.localStorage.setItem('lastPlaylistId', playlistId);
    }
  }, [playlistId]);

  // Fetch channels from playlist
  useEffect(() => {
    if (!playlistId) {
      navigate('/dashboard');
      return;
    }

    const fetchChannels = async () => {
      try {
        const response = await api.get(`/channels?playlistId=${playlistId}`);
        const channelsList = response.data.channels || [];
        const groupsList = response.data.groups || [];
        
        console.log('Fetched channels:', channelsList.length);
        console.log('Groups found:', groupsList);
        
        setChannels(channelsList);
        setFilteredChannels(channelsList);
        setGroups(groupsList);
        
        // Don't auto-play any channel on page load
        // User should manually select a channel to watch
      } catch (error) {
        console.error('Error fetching channels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [playlistId, navigate]);

  // Fetch favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await api.get(`/favorites?playlistId=${playlistId}`);
        setFavorites(response.data.favorites || []);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
    };

    if (playlistId) {
      fetchFavorites();
    }
  }, [playlistId]);

  // Fetch recently watched channels
  useEffect(() => {
    const fetchRecentlyWatched = async () => {
      try {
        const response = await api.get(`/history?playlistId=${playlistId}&limit=100`);
        const history = response.data.history || [];
        
        // Get unique channels (most recent first)
        const uniqueChannels = [];
        const seenIds = new Set();
        
        for (const item of history) {
          if (!seenIds.has(item.channel_id) && uniqueChannels.length < 50) {
            seenIds.add(item.channel_id);
            
            // Find full channel info from channels list
            const channelInfo = channels.find(c => c.id === item.channel_id);
            if (channelInfo) {
              uniqueChannels.push({
                ...channelInfo,
                watched_at: item.watched_at
              });
            }
          }
        }
        
        setRecentlyWatched(uniqueChannels);
      } catch (error) {
        console.error('Error fetching watch history:', error);
      }
    };

    if (playlistId && channels.length > 0) {
      fetchRecentlyWatched();
    }
  }, [playlistId, channels]);

  // Filter channels
  useEffect(() => {
    let result = [...channels]; // Create copy to avoid mutation

    console.log('Filtering channels:', {
      total: channels.length,
      selectedGroup,
      showFavoritesOnly,
      searchQuery
    });

    // Favorites filter (apply first if active)
    if (showFavoritesOnly) {
      const favChannelIds = favorites.map(f => f.channel_id);
      result = result.filter(ch => favChannelIds.includes(ch.id));
      console.log('After favorites filter:', result.length);
    }

    // Group filter
    if (selectedGroup && selectedGroup !== '') {
      const beforeFilter = result.length;
      result = result.filter(ch => {
        // Handle null/undefined groups
        if (!ch.group) {
          console.log('Channel without group:', ch.name);
          return false;
        }
        
        // Normalize both values for comparison
        const channelGroup = ch.group.trim();
        const filterGroup = selectedGroup.trim();
        
        // Exact match (case-sensitive)
        const match = channelGroup === filterGroup;
        
        if (!match) {
          console.log(`No match: "${channelGroup}" !== "${filterGroup}" for channel:`, ch.name);
        }
        
        return match;
      });
      console.log(`After group filter "${selectedGroup}": ${beforeFilter} -> ${result.length} channels`);
      
      // If no results, log sample channel groups for debugging
      if (result.length === 0 && channels.length > 0) {
        console.log('No channels matched! Sample channel groups:', 
          channels.slice(0, 5).map(ch => ({ name: ch.name, group: ch.group }))
        );
      }
    }

    // Search filter (apply last)
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(ch => 
        (ch.name && ch.name.toLowerCase().includes(query)) ||
        (ch.group && ch.group.toLowerCase().includes(query))
      );
      console.log('After search filter:', result.length);
    }

    console.log('Final filtered channels:', result.length);
    setFilteredChannels(result);
  }, [searchQuery, selectedGroup, showFavoritesOnly, channels, favorites]);

  // Video player setup
  useEffect(() => {
    if (!currentChannel || !videoRef.current) return;

    const video = videoRef.current;
    const isHLS = currentChannel.url.endsWith('.m3u8');
    
    // 🚨 CRITICAL: Use iOS detection from top level (already calculated)
    // Re-check iOS detection to be absolutely sure
    const currentUserAgent = navigator.userAgent || '';
    const checkIOS = /iPad|iPhone|iPod/.test(currentUserAgent) && !window.MSStream ||
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(currentUserAgent);
    const isMobile = isIOS || isAndroid;
    
    // 🚨 FINAL CHECK: If iOS detected, NEVER use HLS.js - abort immediately
    if (checkIOS && isHLS) {
      console.error('🚫 ABORTING HLS.js - iOS DETECTED, FORCING NATIVE PLAYBACK');
      // Force native playback - no HLS.js logic at all
      // This will be handled in the iOS-only block below
    }
    
    // Check if browser has native HLS support (Safari/iOS)
    const hasNativeHLS = video.canPlayType('application/vnd.apple.mpegurl') !== '' ||
                         video.canPlayType('application/x-mpegURL') !== '';
    
    // CRITICAL: Log all detection values BEFORE making decision
    console.log('🔍 Device Detection:', {
      userAgent: currentUserAgent,
      isIOS: isIOS,
      checkIOS: checkIOS,
      isAndroid: isAndroid,
      isMobile: isMobile,
      isHLS: isHLS,
      hasNativeHLS: hasNativeHLS,
      HlsSupported: typeof Hls !== 'undefined' ? Hls.isSupported() : false,
      url: currentChannel.url
    });
    
    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Store handlers in variables accessible to cleanup
    // IMPORTANT: Initialize BEFORE any playback paths so handlers can be stored
    const storedHandlers = {
      handlePlaying: null,
      handleMetadata: null,
      iosCanPlayHandler: null,
      iosMetadataHandler: null,
      iosDataHandler: null,
      iosPlayingHandler: null
    };
    
    // Clear previous errors and set loading state
    setVideoError(null);
    setRetryCount(0);
    setVideoLoading(true);
    
    // 🚨 CRITICAL: Timeout guard to prevent infinite loading
    // If video doesn't start playing within 12 seconds, show error
    let playbackStartTimeout = null;
    let hasStartedPlaying = false;
    let timeoutCleared = false;
    
    const clearPlaybackTimeout = () => {
      if (playbackStartTimeout && !timeoutCleared) {
        clearTimeout(playbackStartTimeout);
        timeoutCleared = true;
      }
    };
    
    const startPlaybackTimeout = () => {
      clearPlaybackTimeout();
      playbackStartTimeout = setTimeout(() => {
        if (!hasStartedPlaying && video.readyState < 3) {
          console.error('⏱️ TIMEOUT: Video did not start playing within 12 seconds');
          console.error('Video state:', {
            readyState: video.readyState,
            networkState: video.networkState,
            paused: video.paused,
            ended: video.ended,
            currentTime: video.currentTime,
            src: video.src,
            currentSrc: video.currentSrc,
            error: video.error
          });
          
          setVideoLoading(false);
          setVideoError(
            'This stream is not responding on your device. The channel may be offline or experiencing issues. ' +
            'Please try another channel or tap the play button to retry.'
          );
          
          // Ensure controls are visible for manual retry
          video.controls = true;
        }
      }, 12000); // 12 second timeout
    };

    // 🚨 CRITICAL: On iOS - ALWAYS use native HLS (NEVER HLS.js - avoids CORS issues)
    // On Android/other browsers: Use HLS.js if supported, otherwise native
    // TRIPLE CHECK: Use checkIOS (fresh detection) AND isIOS (top-level detection)
    if (isHLS && (isIOS || checkIOS)) {
      // 🚫 ABORT ANY HLS.js LOGIC - iOS ONLY PATH
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      // iOS: FORCE native HLS - this is the ONLY path for iOS
      console.log('✅ iOS DETECTED - FORCING native HLS playback (no HLS.js)');
      // Native HLS playback (iOS Safari - FORCED)
      console.log('📱 Using NATIVE HLS playback on iOS', { 
        isIOS, 
        isMobile, 
        url: currentChannel.url,
        hasNativeHLS,
        videoElement: { readyState: video.readyState },
        userAgent: navigator.userAgent
      });
      
      // Clear previous source first
      video.src = '';
      video.load();
      
      // CRITICAL: Set iOS-specific attributes BEFORE setting source
      video.controls = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('x-webkit-airplay', 'allow');
      video.preload = 'auto';
      video.autoplay = true;
      
      // Set new source - iOS native HLS handles redirects and CORS automatically
      video.removeAttribute('src');
      video.load();
      video.src = currentChannel.url;
      video.load(); // Force reload with new source
      
      console.log('📱 iOS Native HLS Setup:', {
        src: video.src,
        currentSrc: video.currentSrc,
        controls: video.controls,
        playsInline: video.playsInline,
        webkitPlaysInline: video.webkitPlaysInline,
        preload: video.preload,
        autoplay: video.autoplay,
        readyState: video.readyState,
        networkState: video.networkState,
        url: currentChannel.url
      });
      
      // 🚨 CRITICAL: Start timeout guard immediately
      startPlaybackTimeout();
      
      // Enhanced play function with fallback - used in ALL playback paths
      const tryPlayWithFallback = async () => {
        try {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.then === 'function') {
            await playPromise;
            console.log('✅ Video playing successfully');
            hasStartedPlaying = true;
            clearPlaybackTimeout();
            setVideoLoading(false);
            setVideoError(null);
          }
        } catch (err) {
          console.warn('⏳ Autoplay blocked, trying muted fallback:', err.message);
          
          // Try muted playback as fallback (may allow this on some devices)
          try {
            video.muted = true;
            const mutedPromise = video.play();
            if (mutedPromise && typeof mutedPromise.then === 'function') {
              await mutedPromise;
              console.log('✅ Video playing muted');
              hasStartedPlaying = true;
              clearPlaybackTimeout();
              setVideoLoading(false);
              setVideoError(null);
              
              // Show message that user can unmute
              setTimeout(() => {
                video.controls = true; // Ensure controls visible
              }, 500);
            }
          } catch (mutedErr) {
            console.warn('⚠️ Autoplay blocked even when muted - user interaction required');
            clearPlaybackTimeout(); // Clear timeout since we know it needs user interaction
            setVideoLoading(false);
            video.controls = true; // Ensure controls visible for manual play
            // Don't set error - this is normal behavior, user can tap to play
          }
        }
      };
      
      // iOS-specific event handlers (will be added alongside general handlers)
      // Store in storedHandlers for cleanup
      storedHandlers.iosCanPlayHandler = null;
      storedHandlers.iosMetadataHandler = null;
      storedHandlers.iosDataHandler = null;
      storedHandlers.iosPlayingHandler = null;
      
      // Wait for video to be ready before trying to play
      storedHandlers.iosCanPlayHandler = () => {
        console.log('✅ iOS Video can play - readyState:', video.readyState, {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          duration: video.duration,
          src: video.currentSrc
        });
        
        // Check video dimensions before attempting to play
        // For live streams (duration = Infinity), video dimensions might not be available yet
        if (video.videoWidth === 0 && video.videoHeight === 0) {
          if (video.duration === Infinity) {
            // Live stream - might still be loading video track
            console.warn('⚠️ iOS: Live stream - video dimensions not yet available, will check when playing');
          } else {
            // Not a live stream but no dimensions - likely audio-only
            console.error('❌ iOS: No video dimensions at canplay - audio-only stream');
            setVideoError('This stream is audio-only. No video is available.');
            setVideoLoading(false);
            clearPlaybackTimeout();
            video.controls = true; // Show controls so user can listen to audio
            // Don't return - let it try to play audio anyway
          }
        } else {
          console.log('✅ iOS: Video dimensions confirmed at canplay:', {
            width: video.videoWidth,
            height: video.videoHeight
          });
        }
        
        setVideoLoading(false);
        
        // Try to play - iOS requires user interaction, but we'll try anyway
        tryPlayWithFallback();
      };
      
      storedHandlers.iosMetadataHandler = () => {
        console.log('✅ iOS Video metadata loaded:', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          duration: video.duration,
          readyState: video.readyState,
          networkState: video.networkState,
          src: video.src
        });
        
        // Check if we have valid video dimensions (not just audio)
        if (video.videoWidth === 0 && video.videoHeight === 0) {
          // Wait a bit more for live streams
          if (video.duration === Infinity) {
            console.warn('⚠️ iOS: Stream may be live/HLS - waiting for canplay...');
            // Check again after a short delay
            setTimeout(() => {
              if (video.videoWidth === 0 && video.videoHeight === 0 && video.readyState >= 2) {
                console.error('❌ iOS: No video dimensions detected - audio-only or unsupported codec');
                setVideoError('This stream appears to be audio-only or uses an unsupported video codec. The video track may not be compatible with your device.');
                setVideoLoading(false);
                clearPlaybackTimeout();
              }
            }, 3000); // Wait 3 seconds for metadata
          } else {
            // Not a live stream but no dimensions - likely audio-only
            console.error('❌ iOS: No video dimensions - this appears to be audio-only');
            setVideoError('This stream is audio-only. No video is available.');
            setVideoLoading(false);
            clearPlaybackTimeout();
          }
        } else {
          // Video dimensions are available
          console.log('✅ iOS: Video dimensions detected:', {
            width: video.videoWidth,
            height: video.videoHeight
          });
        }
      };
      
      storedHandlers.iosDataHandler = () => {
        console.log('✅ iOS Video data loaded - readyState:', video.readyState, {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          duration: video.duration,
          networkState: video.networkState,
          src: video.currentSrc
        });
        
        // Check dimensions when data loads
        if (video.videoWidth === 0 && video.videoHeight === 0 && video.readyState >= 2) {
          // Give it a moment more for live streams
          if (video.duration === Infinity) {
            console.warn('⚠️ iOS: Live stream - checking dimensions again...');
          } else {
            console.error('❌ iOS: No video dimensions at loadeddata - likely audio-only');
            // Set error but don't block - let metadata handler deal with it
          }
        }
      };
      
      // Track when video actually starts playing
      storedHandlers.iosPlayingHandler = () => {
        console.log('✅ iOS Video playing event fired', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          paused: video.paused,
          muted: video.muted,
          readyState: video.readyState
        });
        
        // Double-check video dimensions when playing starts
        if (video.videoWidth === 0 && video.videoHeight === 0) {
          console.error('❌ iOS: Video is playing but has no dimensions - checking if audio-only...');
          
          // For HLS live streams, dimensions might not be available immediately
          // Check multiple times with increasing delays
          const checkVideoDimensions = (attempt = 1, maxAttempts = 5) => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              console.log('✅ iOS: Video dimensions appeared after', attempt, 'checks:', {
                width: video.videoWidth,
                height: video.videoHeight
              });
              setVideoError(null);
              return;
            }
            
            if (attempt < maxAttempts) {
              setTimeout(() => {
                checkVideoDimensions(attempt + 1, maxAttempts);
              }, 2000); // Check every 2 seconds
            } else {
              // After 10 seconds (5 attempts * 2 seconds), confirm it's audio-only
              if (video.videoWidth === 0 && video.videoHeight === 0 && video.readyState >= 2) {
                console.error('❌ iOS: Confirmed after', maxAttempts, 'checks - no video dimensions');
                console.error('Video state:', {
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight,
                  readyState: video.readyState,
                  duration: video.duration,
                  src: video.currentSrc,
                  paused: video.paused,
                  muted: video.muted
                });
                setVideoError('This stream appears to be audio-only or uses an unsupported video codec. No video is available on your device.');
                setVideoLoading(false);
              }
            }
          };
          
          // Start checking dimensions
          checkVideoDimensions();
        } else {
          console.log('✅ iOS: Video track confirmed:', {
            width: video.videoWidth,
            height: video.videoHeight
          });
          // Clear any previous audio-only errors
          setVideoError(null);
        }
        
        hasStartedPlaying = true;
        clearPlaybackTimeout();
        setVideoLoading(false);
      };
      
      video.addEventListener('canplay', storedHandlers.iosCanPlayHandler);
      video.addEventListener('loadedmetadata', storedHandlers.iosMetadataHandler);
      video.addEventListener('loadeddata', storedHandlers.iosDataHandler);
      video.addEventListener('playing', storedHandlers.iosPlayingHandler);
      
      // Also try immediate play (might work on some iOS versions/situations)
      tryPlayWithFallback();
      
      // Handle video errors
      const handleError = (e) => {
        console.error('Video error:', e);
        console.error('Video error details:', {
          error: video.error,
          networkState: video.networkState,
          readyState: video.readyState,
          src: video.src,
          currentSrc: video.currentSrc,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
        
        // Clear timeout on error - we know what happened
        clearPlaybackTimeout();
        
        if (video.error) {
          const errorCode = video.error.code;
          const errorMessage = video.error.message || 'Unknown error';
          console.error(`Video error code: ${errorCode}, message: ${errorMessage}`);
          
          // Ensure controls are visible for manual play
          video.controls = true;
          
          switch(errorCode) {
            case video.error.MEDIA_ERR_ABORTED:
              setVideoError('Playback aborted. Tap the play button to try again.');
              break;
            case video.error.MEDIA_ERR_NETWORK:
              setVideoError('Network error. Please check your connection and tap play to retry.');
              break;
            case video.error.MEDIA_ERR_DECODE:
              setVideoError('Decode error. This stream may not be compatible with your device.');
              break;
            case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
              setVideoError('Stream format not supported. The channel may be offline. Tap play to retry.');
              break;
            default:
              setVideoError('Unable to play this channel. The stream may be offline. Tap play to retry.');
          }
          setVideoLoading(false);
        }
      };
      
      const handleLoadStart = () => {
        console.log('Video load started', { readyState: video.readyState, networkState: video.networkState });
        setVideoLoading(true);
      };
      
      const handleLoadedMetadata = () => {
        console.log('Video metadata loaded:', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          duration: video.duration,
          readyState: video.readyState,
          networkState: video.networkState,
          src: video.src
        });
        
        // Check if video has actual video tracks (not just audio)
        if (video.videoWidth === 0 && video.videoHeight === 0) {
          console.warn('⚠️ Video appears to be audio-only or has no video tracks');
          // Don't set error yet - some streams load video after metadata
        } else {
          console.log('✅ Video has video tracks:', { width: video.videoWidth, height: video.videoHeight });
        }
      };
      
      const handleLoadedData = () => {
        console.log('Video data loaded', { readyState: video.readyState });
      };
      
      const handleCanPlay = () => {
        console.log('Video can play - readyState:', video.readyState);
        setVideoLoading(false);
        // Try to play again if not already playing
        if (video.paused && !video.ended) {
          video.play().then(() => {
            hasStartedPlaying = true;
            clearPlaybackTimeout();
          }).catch(err => {
            console.log('Auto-play still blocked, waiting for user interaction:', err.message);
            // Don't clear timeout - user may need to interact
          });
        }
      };
      
      const handleCanPlayThrough = () => {
        console.log('Video can play through - readyState:', video.readyState);
        setVideoLoading(false);
      };
      
      const handleWaiting = () => {
        console.log('Video waiting for data');
        setVideoLoading(true);
      };
      
      const handlePlaying = () => {
        console.log('Video playing');
        hasStartedPlaying = true;
        clearPlaybackTimeout();
        setVideoLoading(false);
      };
      
      const handleStalled = () => {
        console.warn('Video stalled');
        setVideoLoading(true);
      };
      
      const handleSuspend = () => {
        console.log('Video suspended');
      };
      
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('error', handleError);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('canplaythrough', handleCanPlayThrough);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('stalled', handleStalled);
      video.addEventListener('suspend', handleSuspend);
      
      // Also handle click/tap for manual play on mobile
      const handleVideoClick = () => {
        if (video.paused) {
          console.log('Video clicked/tapped, attempting to play');
          video.play().catch(err => {
            console.error('Play failed on click:', err);
          });
        }
      };
      video.addEventListener('click', handleVideoClick);
      video.addEventListener('tap', handleVideoClick);
      
      return () => {
        // Clear timeout on cleanup
        clearPlaybackTimeout();
        
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('canplaythrough', handleCanPlayThrough);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('stalled', handleStalled);
        video.removeEventListener('suspend', handleSuspend);
        video.removeEventListener('click', handleVideoClick);
        video.removeEventListener('tap', handleVideoClick);
        // Clean up iOS-specific handlers
        if (iosCanPlayHandler) video.removeEventListener('canplay', iosCanPlayHandler);
        if (iosMetadataHandler) video.removeEventListener('loadedmetadata', iosMetadataHandler);
        if (iosDataHandler) video.removeEventListener('loadeddata', iosDataHandler);
        if (iosPlayingHandler) video.removeEventListener('playing', iosPlayingHandler);
        video.src = '';
      };
      
    } else if (isHLS && !isIOS && !checkIOS && typeof Hls !== 'undefined' && Hls.isSupported()) {
      // HLS.js playback (Android, Chrome, Firefox, etc.)
      // CRITICAL: iOS should NEVER reach here - it's blocked by the condition above
      console.log('⚠️ Using HLS.js playback (NOT iOS)', { 
        isMobile, 
        isAndroid, 
        isIOS,
        checkIOS,
        userAgent: currentUserAgent,
        HlsSupported: Hls.isSupported()
      });
      
      // 🚨 TRIPLE CHECK: If somehow iOS reaches here, abort and use native
      if (isIOS || checkIOS) {
        console.error('❌ ERROR: iOS detected in HLS.js path - ABORTING and using native HLS');
        // Fall back to native HLS
        video.src = '';
        video.load();
        video.controls = true;
        video.src = currentChannel.url;
        video.play().catch(err => {
          console.warn('Autoplay failed:', err);
          setVideoLoading(false);
        });
        return;
      }
      
      // 🚨 CRITICAL: Start timeout guard for HLS.js path
      startPlaybackTimeout();
      
      // Enhanced play function with fallback - shared with iOS path
      const tryPlayWithFallback = async () => {
        try {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.then === 'function') {
            await playPromise;
            console.log('✅ Video playing successfully');
            hasStartedPlaying = true;
            clearPlaybackTimeout();
            setVideoLoading(false);
            setVideoError(null);
          }
        } catch (err) {
          console.warn('⏳ Autoplay blocked, trying muted fallback:', err.message);
          
          // Try muted playback as fallback
          try {
            video.muted = true;
            const mutedPromise = video.play();
            if (mutedPromise && typeof mutedPromise.then === 'function') {
              await mutedPromise;
              console.log('✅ Video playing muted');
              hasStartedPlaying = true;
              clearPlaybackTimeout();
              setVideoLoading(false);
              setVideoError(null);
              
              // Show message that user can unmute
              setTimeout(() => {
                video.controls = true; // Ensure controls visible
              }, 500);
            }
          } catch (mutedErr) {
            console.warn('⚠️ Autoplay blocked even when muted - user interaction required');
            clearPlaybackTimeout(); // Clear timeout since we know it needs user interaction
            setVideoLoading(false);
            video.controls = true; // Ensure controls visible for manual play
            // Don't set error - this is normal behavior, user can tap to play
          }
        }
      };
      
      const hls = new Hls({
        enableWorker: !isMobile, // Disable worker on mobile to reduce memory usage
        lowLatencyMode: false,
        // Buffer settings - reduced for mobile
        maxBufferLength: isMobile ? 15 : 30,
        maxMaxBufferLength: isMobile ? 200 : 600,
        maxBufferSize: isMobile ? 20 * 1000 * 1000 : 60 * 1000 * 1000, // 20MB on mobile
        maxBufferHole: 0.5,
        backBufferLength: isMobile ? 30 : 90,
        // Mobile compatibility
        forceKeyFrameOnDiscontinuity: true,
        startFragPrefetch: true,
        testBandwidth: false, // Disable bandwidth testing on mobile
        // Force video to decode properly on mobile
        autoStartLoad: true,
        startPosition: -1,
        debug: false,
        // Prevent audio-only issues
        capLevelToPlayerSize: false,
        // Better video quality selection for mobile
        abrEwmaDefaultEstimate: isMobile ? 2000000 : 500000, // Higher default for mobile (better connection)
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        // Mobile-specific optimizations
        fragLoadingTimeOut: isMobile ? 15000 : 20000,
        manifestLoadingTimeOut: isMobile ? 15000 : 20000,
        // Reduce loading for mobile
        maxLoadingDelay: isMobile ? 2 : 4,
        maxStarvationDelay: isMobile ? 4 : 8
      });

      hlsRef.current = hls;
      
      console.log('Loading HLS source:', currentChannel.url);
      console.log('Video element:', { readyState: video.readyState, networkState: video.networkState });
      
      try {
        hls.loadSource(currentChannel.url);
        hls.attachMedia(video);
        console.log('HLS source loaded and attached');
      } catch (error) {
        console.error('Error loading HLS source:', error);
        clearPlaybackTimeout();
        setVideoError('Failed to load video stream. Please try again.');
        setVideoLoading(false);
        return;
      }

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('HLS manifest parsed:', {
          levels: data.levels?.length || 0,
          audioTracks: data.audioTracks?.length || 0,
          subtitles: data.subtitles?.length || 0
        });
        
        // Check for video codec compatibility - but don't block if metadata is missing
        let hasVideoTrack = false;
        let hasVideoMetadata = false;
        
        if (data.levels && data.levels.length > 0) {
          data.levels.forEach((level, i) => {
            console.log(`Level ${i}:`, {
              width: level.width,
              height: level.height,
              bitrate: level.bitrate,
              videoCodec: level.videoCodec,
              audioCodec: level.audioCodec
            });
            
            // Track if we have any metadata at all
            if (level.width || level.height || level.videoCodec) {
              hasVideoMetadata = true;
            }
            
            // Check if this level has video (require width/height OR videoCodec)
            if ((level.width > 0 && level.height > 0) || level.videoCodec) {
              hasVideoTrack = true;
              
              // Warn about potentially unsupported codecs (but don't block)
              if (level.videoCodec && (level.videoCodec.toLowerCase().includes('hev') || 
                  level.videoCodec.toLowerCase().includes('h265'))) {
                console.warn('⚠️ H.265/HEVC codec detected - may not work on all devices');
                // Don't set error immediately - let it try to play first
              }
            }
          });
          
          // Only warn if we have metadata and no video tracks found
          // If no metadata, assume video exists and let playback attempt
          if (hasVideoMetadata && !hasVideoTrack) {
            console.warn('⚠️ No video tracks found in manifest metadata - may be audio-only');
            // Don't set error immediately - let playback attempt first
          }
        } else {
          console.warn('⚠️ No levels found in manifest - stream may be incompatible');
          // Don't block - let it try to play
        }
        
        // Clear previous errors when manifest is parsed successfully
        setVideoError(null);
        
        // Auto-play once manifest is ready - use tryPlayWithFallback for consistent behavior
        tryPlayWithFallback().catch(err => {
          console.warn('Play error (user interaction may be required):', err);
          // Check if video has dimensions after metadata loads
          // Capture values from outer scope
          const metadataCheck = hasVideoMetadata;
          const trackCheck = hasVideoTrack;
          const checkVideoDimensions = () => {
            setTimeout(() => {
              if (video.videoWidth === 0 && video.videoHeight === 0) {
                // Double-check by looking at actual video element state
                if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                  console.warn('⚠️ Video has no dimensions after metadata loaded - may be audio-only');
                  if (metadataCheck && !trackCheck) {
                    setVideoError('This stream appears to be audio-only or using an incompatible format.');
                  }
                }
              }
            }, 3000); // Wait 3 seconds for metadata to load
          };
          // Only check dimensions if it's not an autoplay policy error
          if (!err.message?.includes('play() request') && !err.name?.includes('NotAllowedError')) {
            checkVideoDimensions();
          }
        });
      });
      
      // Track when HLS.js actually starts playing
      const handlePlaying = () => {
        hasStartedPlaying = true;
        clearPlaybackTimeout();
        setVideoLoading(false);
        // Clear error when video actually plays
        setVideoError(null);
      };
      video.addEventListener('playing', handlePlaying);
      
      // Store handlers for cleanup
      storedHandlers.handlePlaying = handlePlaying;
      
      // Check video dimensions when metadata loads (to detect audio-only streams)
      const handleMetadata = () => {
        if (video.readyState >= 2 && video.videoWidth === 0 && video.videoHeight === 0) {
          console.warn('⚠️ Video metadata loaded but no dimensions - may be audio-only');
          // Don't show error immediately - let it try to play first
        }
      };
      video.addEventListener('loadedmetadata', handleMetadata);
      storedHandlers.handleMetadata = handleMetadata;

      hls.on(Hls.Events.FRAG_LOADED, () => {
        console.log('HLS fragment loaded');
        setVideoLoading(false);
      });
      
      hls.on(Hls.Events.FRAG_PARSED, () => {
        console.log('HLS fragment parsed');
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          error: data.error,
          url: data.url,
          isMobile,
          isAndroid,
          isIOS
        });
        setVideoLoading(false);
        
        // Try to recover from errors
        if (data.fatal) {
          clearPlaybackTimeout(); // Clear timeout on fatal errors
          
          switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, trying to recover...');
              if (retryCount < 3) {
                setRetryCount(prev => prev + 1);
                setVideoError('Network error. Retrying...');
                setTimeout(() => {
                  hls.startLoad();
                  setVideoError(null);
                  // Restart timeout after retry
                  startPlaybackTimeout();
                }, 1000);
              } else {
                setVideoError('Network error. Unable to load stream after 3 attempts.');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, trying to recover...');
              if (retryCount < 3) {
                setRetryCount(prev => prev + 1);
                setVideoError('Media error. Retrying...');
                setTimeout(() => {
                  hls.recoverMediaError();
                  setVideoError(null);
                  // Restart timeout after retry
                  startPlaybackTimeout();
                }, 1000);
              } else {
                setVideoError('Media error. This stream may not be compatible.');
              }
              break;
            default:
              console.log('Fatal error, destroying HLS...');
              setVideoError('Unable to play this channel. The stream may be offline.');
              hls.destroy();
              break;
          }
        }
      });
      
      // Cleanup function for HLS.js path
      return () => {
        clearPlaybackTimeout();
        // Remove event listeners
        if (video) {
          if (storedHandlers.handlePlaying) {
            video.removeEventListener('playing', storedHandlers.handlePlaying);
          }
          if (storedHandlers.handleMetadata) {
            video.removeEventListener('loadedmetadata', storedHandlers.handleMetadata);
          }
        }
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };

    } else if (isHLS && !isIOS && !Hls.isSupported() && hasNativeHLS) {
      // HLS stream on non-iOS device without HLS.js support but with native HLS
      console.log('📺 Using native HLS playback (non-iOS, no HLS.js support)');
      
      // Start timeout guard
      startPlaybackTimeout();
      
      video.src = '';
      video.load();
      video.controls = true;
      video.playsInline = true;
      video.src = currentChannel.url;
      
      const handleNativePlaying = () => {
        hasStartedPlaying = true;
        clearPlaybackTimeout();
        setVideoLoading(false);
      };
      
      video.addEventListener('playing', handleNativePlaying);
      video.addEventListener('error', () => {
        clearPlaybackTimeout();
        setVideoLoading(false);
      });
      
      video.play().then(() => {
        hasStartedPlaying = true;
        clearPlaybackTimeout();
        setVideoLoading(false);
      }).catch(err => {
        console.warn('Autoplay failed:', err);
        setVideoLoading(false);
        // Don't clear timeout - user may need to interact
      });
      
      return () => {
        clearPlaybackTimeout();
        video.removeEventListener('playing', handleNativePlaying);
      };
      
    } else {
      // Non-HLS playback (MP4, WebM, etc.)
      console.log('🎬 Using native video playback (non-HLS)');
      
      // Start timeout guard
      startPlaybackTimeout();
      
      video.src = currentChannel.url;
      video.controls = true;
      video.playsInline = true;
      
      const handleNativePlaying = () => {
        hasStartedPlaying = true;
        clearPlaybackTimeout();
        setVideoLoading(false);
      };
      
      video.addEventListener('playing', handleNativePlaying);
      video.addEventListener('error', () => {
        clearPlaybackTimeout();
        setVideoLoading(false);
      });
      
      video.play().then(() => {
        hasStartedPlaying = true;
        clearPlaybackTimeout();
        setVideoLoading(false);
      }).catch(err => {
        console.warn('Play error:', err);
        setVideoLoading(false);
        // Don't clear timeout - user may need to interact
      });
      
      return () => {
        clearPlaybackTimeout();
        video.removeEventListener('playing', handleNativePlaying);
      };
    }

    // Log watch history (only if video started playing)
    const logHistory = async () => {
      if (!hasStartedPlaying) return; // Don't log if video never started
      
      try {
        await api.post('/history', {
          playlist_id: parseInt(playlistId),
          channel_id: currentChannel.id,
          channel_name: currentChannel.name,
          duration_seconds: Math.floor(video.currentTime || 0)
        });
      } catch (error) {
        console.error('Error logging history:', error);
      }
    };

    // Log on channel change (after 5 seconds, only if playing)
    const timer = setTimeout(logHistory, 5000);

    // Final cleanup - this runs when the effect is cleaned up or dependencies change
    return () => {
      clearPlaybackTimeout();
      clearTimeout(timer);
      // Remove event listeners using stored handlers
      if (video) {
        if (storedHandlers.handlePlaying) {
          video.removeEventListener('playing', storedHandlers.handlePlaying);
        }
        if (storedHandlers.handleMetadata) {
          video.removeEventListener('loadedmetadata', storedHandlers.handleMetadata);
        }
        // Remove iOS-specific handlers
        if (storedHandlers.iosCanPlayHandler) {
          video.removeEventListener('canplay', storedHandlers.iosCanPlayHandler);
        }
        if (storedHandlers.iosMetadataHandler) {
          video.removeEventListener('loadedmetadata', storedHandlers.iosMetadataHandler);
        }
        if (storedHandlers.iosDataHandler) {
          video.removeEventListener('loadeddata', storedHandlers.iosDataHandler);
        }
        if (storedHandlers.iosPlayingHandler) {
          video.removeEventListener('playing', storedHandlers.iosPlayingHandler);
        }
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentChannel, playlistId]);

  const handleChannelClick = (channel) => {
    setCurrentChannel(channel);
    setIsAutoPlay(false); // Mark as user-initiated
    setVideoError(null); // Clear any previous errors
    setRetryCount(0); // Reset retry counter

    if (isMobileView) {
      setIsChannelDrawerOpen(false);
      // Gently scroll video into view once the drawer closes
      setTimeout(() => {
        videoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  const renderSidebarContent = (variant = 'desktop') => {
    const headerClasses =
      variant === 'mobile'
        ? 'p-4 pb-3 border-b border-tv-borderSubtle bg-tv-bgElevated sticky top-0 z-20 shadow-[0_-12px_32px_rgba(0,0,0,0.65)] flex-shrink-0'
        : 'p-4 border-b border-tv-borderSubtle flex-shrink-0';

    const listWrapperClasses =
      variant === 'mobile'
        ? 'flex-1 overflow-y-auto custom-scrollbar p-2 pb-32 bg-tv-bgElevated min-h-0'
        : 'flex-1 overflow-y-auto custom-scrollbar p-3 bg-tv-bgElevated min-h-0';

    const footerClasses =
      variant === 'mobile'
        ? 'p-3 border-t border-tv-borderSubtle text-xs text-tv-textMuted text-center bg-tv-bgElevated/95 sticky bottom-0 flex-shrink-0'
        : 'p-3 border-t border-tv-borderSubtle text-sm text-tv-textMuted text-center flex-shrink-0';

    return (
      <>
        <div className={headerClasses}>
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                if (currentChannel) {
                  // If video is playing, just stop it and show channel list
                  setCurrentChannel(null);
                } else {
                  // If no video playing, go back to dashboard
                  navigate('/dashboard');
                }
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {currentChannel ? 'Stop' : 'Back'}
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>

          {/* Search with Autocomplete */}
          <div className="relative mb-3">
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setShowSearchSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
            />
            
            {/* Search History Dropdown */}
            {showSearchSuggestions && searchHistory.length > 0 && !searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-tv-bgSoft border-2 border-tv-borderSubtle rounded-xl shadow-2xl z-10 max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between p-3 border-b border-tv-borderSubtle bg-tv-bgHover/50">
                  <span className="text-xs text-tv-textSecondary font-semibold uppercase tracking-wide">Recent Searches</span>
                  <button
                    onClick={clearSearchHistory}
                    className="text-xs text-tv-error hover:text-tv-error/80 font-medium"
                  >
                    Clear
                  </button>
                </div>
                {searchHistory.map((term, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchQuery(term);
                      setShowSearchSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-tv-bgHover text-tv-text text-sm transition-all flex items-center gap-3 border-b border-tv-borderSubtle/30 last:border-0"
                  >
                    <span className="text-tv-accent">🔍</span>
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              variant={showFavoritesOnly ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              ⭐ Favorites
            </Button>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-tv-bgSoft text-tv-text border-2 border-tv-borderSubtle focus:outline-none focus:ring-2 focus:ring-tv-accent focus:border-tv-accent"
            >
              <option value="">All Groups</option>
              {groups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            
            {/* View Mode Toggle */}
            <div className="ml-auto flex border-2 border-tv-borderSubtle rounded-lg overflow-hidden bg-tv-bgSoft">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-1.5 text-sm font-medium transition-all ${
                  viewMode === 'list' 
                    ? 'bg-tv-accent text-white shadow-md' 
                    : 'bg-transparent text-tv-textSecondary hover:bg-tv-bgHover hover:text-tv-text'
                }`}
                title="List View"
              >
                ☰ List
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-1.5 text-sm font-medium border-l-2 border-tv-borderSubtle transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-tv-accent text-white shadow-md' 
                    : 'bg-transparent text-tv-textSecondary hover:bg-tv-bgHover hover:text-tv-text'
                }`}
                title="Grid View"
              >
                ⊞ Grid
              </button>
            </div>
          </div>
        </div>

        <div className={listWrapperClasses}>
          {/* Recently Watched Section - Mobile Only */}
          {variant === 'mobile' && recentlyWatched.length > 0 && !searchQuery && !selectedGroup && !showFavoritesOnly && (
            <div className="p-2 border-b border-tv-borderSubtle">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm font-semibold text-tv-textSecondary uppercase tracking-wide">
                  🕒 Recently Watched
                </h3>
                {recentlyWatched.length > 5 && (
                  <button
                    onClick={() => setShowAllRecent(!showAllRecent)}
                    className="text-xs text-tv-accent hover:text-tv-accentSoft transition-colors"
                  >
                    {showAllRecent ? 'Show Less' : `Show All (${recentlyWatched.length})`}
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {(showAllRecent ? recentlyWatched : recentlyWatched.slice(0, 5)).map((channel) => (
                  <div
                    key={`recent-${channel.id}`}
                    onClick={() => handleChannelClick(channel)}
                    className={`
                      p-3 rounded-lg cursor-pointer transition-all
                      ${currentChannel?.id === channel.id 
                        ? 'bg-tv-accent/20 border-l-3 border-tv-accent' 
                        : 'bg-tv-bgSoft hover:bg-tv-bgHover border-l-3 border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-medium truncate text-sm ${
                            currentChannel?.id === channel.id ? 'text-tv-accent' : 'text-tv-text'
                          }`}>{channel.name}</h3>
                          {currentChannel?.id === channel.id && (
                            <Badge color="success" size="sm">Playing</Badge>
                          )}
                        </div>
                        {channel.group && (
                          <p className="text-xs text-tv-textMuted">{channel.group}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(channel);
                        }}
                        className="ml-2 p-1 hover:scale-110 transition-transform text-tv-accentSoft"
                      >
                        {isFavorite(channel.id) ? '⭐' : '☆'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Channels Section */}
          {filteredChannels.length === 0 ? (
            <div className="p-8 text-center text-tv-textMuted">
              <p>No channels found</p>
            </div>
          ) : (
            <div>
              {variant === 'mobile' && recentlyWatched.length > 0 && !searchQuery && !selectedGroup && !showFavoritesOnly && (
                <h3 className="text-sm font-semibold text-tv-textSecondary uppercase tracking-wide mb-2 px-1">
                  📺 All Channels
                </h3>
              )}
              {variant === 'desktop' && (
                <h3 className="text-sm font-semibold text-tv-textSecondary uppercase tracking-wide mb-3 px-1">
                  📺 All Channels
                </h3>
              )}
              
              {/* List View */}
              {viewMode === 'list' && filteredChannels.slice(0, displayedChannels).map((channel) => (
                <div
                  key={channel.id}
                  onClick={() => handleChannelClick(channel)}
                    className={`
                      flex items-center gap-3 px-3 py-3 mb-1.5 rounded-lg cursor-pointer transition-all
                      ${currentChannel?.id === channel.id 
                        ? 'bg-tv-accent/20 border-l-3 border-tv-accent shadow-lg' 
                        : 'bg-transparent hover:bg-tv-bgHover border-l-3 border-transparent'
                      }
                    `}
                >
                  {/* Channel logo/avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-tv-bgHover border border-tv-borderSubtle flex items-center justify-center overflow-hidden">
                    {channel.logo ? (
                      <img 
                        src={channel.logo} 
                        alt={channel.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-xl text-tv-textMuted">📺</span>
                    )}
                  </div>
                  
                  {/* Channel name + category */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium truncate ${
                      currentChannel?.id === channel.id ? 'text-tv-accent' : 'text-tv-text'
                    }`}>{channel.name}</h3>
                    {channel.group && (
                      <p className="text-xs text-tv-textMuted truncate">{channel.group}</p>
                    )}
                  </div>
                  
                  {/* Badge and favorite button */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {currentChannel?.id === channel.id && (
                      <Badge color="success" size="sm">Playing</Badge>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(channel);
                      }}
                      className="p-1 hover:scale-110 transition-transform text-tv-accentSoft"
                      title={isFavorite(channel.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {isFavorite(channel.id) ? '⭐' : '☆'}
                    </button>
                  </div>
                </div>
              ))}

              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-2 gap-2">
                  {filteredChannels.slice(0, displayedChannels).map((channel) => (
                    <div
                      key={channel.id}
                      onClick={() => handleChannelClick(channel)}
                      className={`
                        p-3 rounded-lg cursor-pointer transition-all relative
                        ${currentChannel?.id === channel.id 
                          ? 'bg-tv-accent/20 border-2 border-tv-accent shadow-lg' 
                          : 'bg-tv-bgSoft hover:bg-tv-bgHover border-2 border-transparent'
                        }
                      `}
                    >
                      <div className="text-center">
                        {channel.logo ? (
                          <img 
                            src={channel.logo} 
                            alt={channel.name}
                            loading="lazy"
                            className="w-16 h-16 mx-auto mb-2 rounded-lg object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-16 h-16 mx-auto mb-2 bg-tv-bgHover border border-tv-borderSubtle rounded-lg flex items-center justify-center text-2xl">
                            📺
                          </div>
                        )}
                        <h3 className={`font-medium text-sm truncate mb-1 ${
                          currentChannel?.id === channel.id ? 'text-tv-accent' : 'text-tv-text'
                        }`}>
                          {channel.name}
                        </h3>
                        {channel.group && (
                          <p className="text-xs text-tv-textMuted truncate">{channel.group}</p>
                        )}
                        {currentChannel?.id === channel.id && (
                          <Badge color="success" size="sm" className="mt-2">▶️</Badge>
                        )}
                        
                        {/* Favorite button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(channel);
                          }}
                          className="absolute top-2 right-2 p-1 bg-tv-bgElevated/80 rounded hover:scale-110 transition-transform text-tv-accentSoft"
                        >
                          {isFavorite(channel.id) ? '⭐' : '☆'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Load More Button */}
              {filteredChannels.length > displayedChannels && (
                <div className="mt-4 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => setDisplayedChannels(prev => prev + 50)}
                    className="w-full"
                  >
                    Load More ({filteredChannels.length - displayedChannels} remaining)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={footerClasses}>
          <span className="text-tv-textMuted">
            Showing {Math.min(displayedChannels, filteredChannels.length)} of {filteredChannels.length} channels
            {filteredChannels.length !== channels.length && ` (${channels.length} total)`}
          </span>
        </div>
      </>
    );
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    
    // Save to search history if not empty and different from last search
    if (value.trim() && value !== searchHistory[0]) {
      const newHistory = [value, ...searchHistory.filter(h => h !== value)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };

  // Swipe gestures for mobile
  useEffect(() => {
    if (!videoRef.current) return;
    
    const videoContainer = videoRef.current.parentElement;
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > swipeThreshold && filteredChannels.length > 0 && currentChannel) {
        if (diff > 0) {
          // Swiped left - next channel
          const currentIndex = filteredChannels.findIndex(ch => ch.id === currentChannel.id);
          const nextIndex = (currentIndex + 1) % filteredChannels.length;
          handleChannelClick(filteredChannels[nextIndex]);
        } else {
          // Swiped right - previous channel
          const currentIndex = filteredChannels.findIndex(ch => ch.id === currentChannel.id);
          const prevIndex = currentIndex === 0 ? filteredChannels.length - 1 : currentIndex - 1;
          handleChannelClick(filteredChannels[prevIndex]);
        }
      }
    };

    videoContainer.addEventListener('touchstart', handleTouchStart);
    videoContainer.addEventListener('touchend', handleTouchEnd);

    return () => {
      videoContainer.removeEventListener('touchstart', handleTouchStart);
      videoContainer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentChannel, filteredChannels]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't trigger if typing in input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const video = videoRef.current;
      if (!video) return;

      switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          break;
        
        case 'f':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            video.requestFullscreen();
          }
          break;
        
        case 'm':
          e.preventDefault();
          video.muted = !video.muted;
          break;
        
        case 'p':
          e.preventDefault();
          togglePictureInPicture();
          break;
        
        case 'arrowup':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          break;
        
        case 'arrowdown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          break;
        
        case 'arrowright':
          e.preventDefault();
          // Next channel
          if (currentChannel && filteredChannels.length > 0) {
            const currentIndex = filteredChannels.findIndex(ch => ch.id === currentChannel.id);
            const nextIndex = (currentIndex + 1) % filteredChannels.length;
            handleChannelClick(filteredChannels[nextIndex]);
          }
          break;
        
        case 'arrowleft':
          e.preventDefault();
          // Previous channel
          if (currentChannel && filteredChannels.length > 0) {
            const currentIndex = filteredChannels.findIndex(ch => ch.id === currentChannel.id);
            const prevIndex = currentIndex === 0 ? filteredChannels.length - 1 : currentIndex - 1;
            handleChannelClick(filteredChannels[prevIndex]);
          }
          break;
        
        case '?':
        case '/':
          e.preventDefault();
          setShowKeyboardHelp(!showKeyboardHelp);
          break;
        
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentChannel, filteredChannels, showKeyboardHelp]);

  const toggleFavorite = async (channel) => {
    const isFavorite = favorites.some(f => f.channel_id === channel.id);

    try {
      if (isFavorite) {
        const fav = favorites.find(f => f.channel_id === channel.id);
        await api.delete(`/favorites/${fav.id}`);
        setFavorites(favorites.filter(f => f.id !== fav.id));
      } else {
        const response = await api.post('/favorites', {
          playlist_id: parseInt(playlistId),
          channel_id: channel.id,
          channel_name: channel.name
        });
        setFavorites([...favorites, response.data.favorite]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const isFavorite = (channelId) => {
    return favorites.some(f => f.channel_id === channelId);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col lg:grid lg:grid-cols-[280px_minmax(0,1.4fr)_320px] bg-tv-bg overflow-hidden">
        {/* Left Sidebar Skeleton */}
        <div className="hidden lg:flex lg:flex-col bg-tv-bgElevated border-r border-tv-borderSubtle p-4">
          <div className="mb-4 space-y-3">
            <div className="h-10 bg-tv-bgSoft rounded animate-pulse"></div>
            <div className="h-10 bg-tv-bgSoft rounded animate-pulse"></div>
          </div>
          <SkeletonLoader type="list" count={10} />
        </div>
        
        {/* Center Player Skeleton */}
        <div className="flex-1 flex items-center justify-center bg-tv-bg">
          <Spinner size="xl" />
        </div>
        
        {/* Right Panel Skeleton */}
        <div className="hidden lg:flex lg:flex-col bg-tv-bgElevated border-l border-tv-borderSubtle p-4">
          <div className="space-y-3">
            <div className="h-32 bg-tv-bgSoft rounded animate-pulse"></div>
            <div className="h-20 bg-tv-bgSoft rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-tv-bg text-tv-text">
      {/* Mobile: Top banner (player-first layout) */}
      {isMobileView && (
        <div className="lg:hidden px-4 py-4 border-b-2 border-tv-borderSubtle bg-tv-bgElevated flex items-center justify-between gap-3 sticky top-0 z-20 shadow-md">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase text-tv-textMuted tracking-wider mb-1.5 font-semibold">Now Playing</p>
            <p className="text-tv-text font-bold truncate text-base">
              {currentChannel?.name || 'Select a channel'}
            </p>
            {currentChannel?.group && (
              <p className="text-tv-textSecondary text-sm truncate mt-0.5">{currentChannel.group}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsChannelDrawerOpen(true)}
            className="flex-shrink-0 shadow-lg"
          >
            Channels
          </Button>
        </div>
      )}

      {/* Main Layout: 3-panel desktop, player-first mobile */}
      <div className="flex-1 lg:grid lg:grid-cols-[280px_minmax(0,1.4fr)_320px] lg:gap-6 lg:p-6 lg:h-[calc(100vh-96px)] lg:max-h-screen">
        {/* LEFT COLUMN - Channel List (Desktop Only) */}
        <aside className="hidden lg:flex lg:flex-col bg-tv-bgElevated border border-tv-borderSubtle rounded-xl overflow-hidden">
          {renderSidebarContent('desktop')}
        </aside>

        {/* CENTER COLUMN - Video Player + Info */}
        <main className="flex flex-col gap-4 px-4 pt-4 pb-4 lg:px-0 lg:pt-0 lg:pb-0 min-h-0">
          {currentChannel ? (
            <>
              {/* Video Player Container - 16:9 aspect ratio */}
              <div className="relative w-full max-w-5xl mx-auto">
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-tv-borderSubtle shadow-2xl">
                  <div className="relative w-full h-full group">
                    {videoLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                        <div className="text-center">
                          <Spinner size="xl" />
                          <p className="text-tv-text mt-4 text-sm">Loading stream...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Tap to Play Button (Mobile) - Show when video is paused and needs user interaction */}
                    {!videoLoading && videoRef.current && videoRef.current.paused && (isIOS || (typeof window !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || /Android/.test(navigator.userAgent)))) && !videoError && (
                      <div 
                        className="absolute inset-0 flex items-center justify-center bg-black/70 z-20 cursor-pointer rounded-xl"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (videoRef.current) {
                      try {
                        console.log('📱 Tap to Play button clicked');
                        await videoRef.current.play();
                        setVideoLoading(false);
                        setVideoError(null);
                      } catch (err) {
                        console.error('❌ Play failed:', err);
                        setVideoError('Unable to play. Please try another channel.');
                      }
                    }
                  }}
                  onTouchStart={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (videoRef.current) {
                      try {
                        console.log('📱 Tap to Play button touched');
                        await videoRef.current.play();
                        setVideoLoading(false);
                        setVideoError(null);
                      } catch (err) {
                        console.error('❌ Play failed:', err);
                        setVideoError('Unable to play. Please try another channel.');
                      }
                    }
                  }}
                >
                        <div className="text-center p-8">
                          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-tv-accent flex items-center justify-center shadow-2xl border-4 border-tv-accent/30">
                            <svg className="w-12 h-12 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                          <p className="text-tv-text text-2xl font-bold mb-2">Tap to Play</p>
                          <p className="text-tv-textSecondary text-base">Touch to start playback</p>
                        </div>
                      </div>
                    )}
                    
                      <video
                        ref={videoRef}
                        className="w-full h-full object-contain bg-black rounded-xl"
                        controls={true}
                        autoPlay
                        playsInline
                        webkit-playsinline="true"
                        x-webkit-airplay="allow"
                        preload="auto"
                        muted={false}
                        src={videoElementSrc ?? undefined}
                        key={currentChannel?.id || 'no-channel'}
                        style={{ 
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          WebkitPlaysInline: true,
                          playsInline: true
                        }}
                        onClick={async (e) => {
                          // On mobile, click video to play if paused
                          if (videoRef.current) {
                            if (videoRef.current.paused) {
                              try {
                                console.log('📱 Video clicked - attempting to play');
                                await videoRef.current.play();
                                setVideoLoading(false);
                                setVideoError(null);
                              } catch (err) {
                                console.error('❌ Play on click failed:', err);
                              }
                            }
                          }
                        }}
                        onTouchStart={async (e) => {
                          // On iOS, tap the video to play if paused
                          if (videoRef.current && videoRef.current.paused) {
                            try {
                              console.log('📱 Video touched - attempting to play');
                              await videoRef.current.play();
                              setVideoLoading(false);
                              setVideoError(null);
                            } catch (err) {
                              console.log('Play on touch failed:', err);
                            }
                          }
                        }}
                      />

                      {/* Custom Video Controls */}
                      {useCustomControls && (
                        <VideoControls
                          videoRef={videoRef}
                          hlsRef={hlsRef}
                          onPiP={togglePictureInPicture}
                          onFullscreen={() => {
                            if (document.fullscreenElement) {
                              document.exitFullscreen();
                            } else {
                              videoRef.current?.requestFullscreen();
                            }
                          }}
                        />
                      )}
                      
                      {/* Error Overlay */}
                      {videoError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl z-30">
                          <div className="text-center p-8 max-w-md bg-tv-bgElevated rounded-2xl border-2 border-tv-error/30 shadow-2xl">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h3 className="text-2xl font-bold text-tv-text mb-3">Playback Error</h3>
                            <p className="text-tv-textSecondary text-base mb-6">{videoError}</p>
                            <div className="flex gap-2 justify-center">
                              <Button
                                onClick={() => {
                                  setVideoError(null);
                                  setRetryCount(0);
                                  // Force reload channel
                                  const current = currentChannel;
                                  setCurrentChannel(null);
                                  setTimeout(() => setCurrentChannel(current), 100);
                                }}
                              >
                                🔄 Retry
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setVideoError(null);
                                  setCurrentChannel(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              {/* Current Channel Info Strip */}
              <section className="max-w-5xl mx-auto w-full flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Channel logo circle */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-tv-bgHover flex items-center justify-center overflow-hidden border-2 border-tv-accent/30 shadow-lg">
                      {currentChannel.logo ? (
                        <img 
                          src={currentChannel.logo} 
                          alt={currentChannel.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="text-2xl">📺</span>
                      )}
                    </div>
                    
                    {/* Channel name + category */}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-tv-text truncate">{currentChannel.name}</h2>
                      {currentChannel.group && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-tv-accent/20 text-tv-accentLight border border-tv-accent/30">
                            {currentChannel.group}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowKeyboardHelp(true)}
                      title="Keyboard Shortcuts (?)"
                      className="hidden md:flex"
                    >
                      ⌨️
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={togglePictureInPicture}
                      title="Picture-in-Picture (P)"
                    >
                      🖼️
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => toggleFavorite(currentChannel)}
                      title={isFavorite(currentChannel.id) ? 'Remove from favorites' : 'Add to favorites'}
                      className={isFavorite(currentChannel.id) ? 'text-tv-accent' : ''}
                    >
                      {isFavorite(currentChannel.id) ? '⭐' : '☆'}
                    </Button>
                  </div>
                </div>
                
                {/* Optional: Playlist name or description */}
                <p className="text-sm text-tv-textMuted line-clamp-2">
                  {currentChannel.group && `Category: ${currentChannel.group}`}
                  {!currentChannel.group && 'Live stream'}
                </p>
              </section>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <svg className="w-24 h-24 mx-auto text-tv-textMuted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-tv-textSecondary text-lg">Select a channel to start watching</p>
                {isMobileView && (
                  <Button
                    variant="primary"
                    onClick={() => setIsChannelDrawerOpen(true)}
                    className="mt-4"
                  >
                    Browse Channels
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* RIGHT COLUMN - Channel Info & Recently Watched (Desktop Only) */}
        <aside className="hidden lg:flex flex-col bg-tv-bgElevated border border-tv-borderSubtle rounded-xl px-4 py-4 gap-4 overflow-hidden">
          {currentChannel ? (
            <>
              {/* Channel Info Card */}
              <div className="space-y-3 bg-tv-bgSoft p-4 rounded-lg border border-tv-borderSubtle">
                <div className="flex items-center gap-3 pb-3 border-b border-tv-borderSubtle">
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-tv-bgHover flex items-center justify-center overflow-hidden border-2 border-tv-accent/40 shadow-lg">
                    {currentChannel.logo ? (
                      <img 
                        src={currentChannel.logo} 
                        alt={currentChannel.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-3xl">📺</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-tv-text truncate">{currentChannel.name}</h3>
                    {currentChannel.group && (
                      <p className="text-sm text-tv-textSecondary truncate">{currentChannel.group}</p>
                    )}
                  </div>
                </div>
                
                {/* Channel Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between py-1.5 border-b border-tv-borderSubtle/50">
                    <span className="text-tv-textSecondary">Category</span>
                    <span className="text-tv-text font-medium">{currentChannel.group || 'General'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-tv-borderSubtle/50">
                    <span className="text-tv-textSecondary">Status</span>
                    <span className="text-tv-success font-medium">● Live</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-tv-textSecondary">Favorite</span>
                    <button
                      onClick={() => toggleFavorite(currentChannel)}
                      className={`text-xl hover:scale-110 transition-transform ${
                        isFavorite(currentChannel.id) ? 'text-tv-accent' : 'text-tv-textMuted'
                      }`}
                    >
                      {isFavorite(currentChannel.id) ? '⭐' : '☆'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Recently Watched Section */}
              {recentlyWatched.length > 0 && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <h3 className="text-sm font-semibold text-tv-textSecondary uppercase tracking-wide mb-2">
                    🕒 Recently Watched
                  </h3>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5">
                    {recentlyWatched.slice(0, 5).map((channel) => (
                      <div
                        key={`recent-sidebar-${channel.id}`}
                        onClick={() => handleChannelClick(channel)}
                        className={`
                          flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all
                          ${currentChannel?.id === channel.id 
                            ? 'bg-tv-accent/20 border-l-3 border-tv-accent' 
                            : 'bg-tv-bgSoft hover:bg-tv-bgHover border-l-3 border-transparent'
                          }
                        `}
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded bg-tv-bgHover border border-tv-borderSubtle flex items-center justify-center overflow-hidden">
                          {channel.logo ? (
                            <img 
                              src={channel.logo} 
                              alt={channel.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <span className="text-sm">📺</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${
                            currentChannel?.id === channel.id ? 'text-tv-accent' : 'text-tv-text'
                          }`}>
                            {channel.name}
                          </p>
                          {channel.group && (
                            <p className="text-xs text-tv-textMuted truncate">{channel.group}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-tv-textMuted">
                <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Select a channel</p>
                <p className="text-xs mt-1">Info will appear here</p>
              </div>
            </div>
          )}
        </aside>
      </div>
      
      {/* Mobile Channel Drawer - Bottom Sheet */}
      {isMobileView && isChannelDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-30"
          onClick={() => setIsChannelDrawerOpen(false)}
        />
      )}

      {isMobileView && (
        <div
          className={`lg:hidden fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ease-out ${isChannelDrawerOpen ? 'translate-y-0' : 'translate-y-full'}`}
        >
          <div className="bg-tv-bgElevated border-t-2 border-tv-borderSubtle rounded-t-3xl shadow-2xl flex flex-col h-[80vh] max-h-[85vh] safe-area-bottom">
            {/* Drawer Handle & Header */}
            <button
              className="flex items-center justify-between px-5 py-4 text-left border-b border-tv-borderSubtle bg-tv-bgSoft/50"
              onClick={() => setIsChannelDrawerOpen(prev => !prev)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-lg font-bold text-tv-text truncate">
                    Channels ({filteredChannels.length})
                  </p>
                </div>
                <p className="text-sm text-tv-textSecondary truncate">
                  {currentChannel ? `Now playing: ${currentChannel.name}` : 'Tap to browse channels'}
                </p>
              </div>
              <span className="text-tv-accent font-bold text-base ml-3 flex-shrink-0">
                {isChannelDrawerOpen ? '▼ Hide' : '▲ Show'}
              </span>
            </button>
            
            {/* Channel List Content */}
            <div className="flex-1 overflow-hidden bg-tv-bgElevated">
              <div className="h-full flex flex-col">
                {renderSidebarContent('mobile')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowKeyboardHelp(false)}
        >
          <div 
            className="bg-tv-bgElevated border border-tv-borderSubtle rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-tv-text">⌨️ Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="text-tv-textSecondary hover:text-tv-text transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Playback Controls */}
              <div>
                <h3 className="text-lg font-semibold text-tv-accent mb-3">Playback Controls</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-tv-borderSubtle">
                    <span className="text-tv-text">Play / Pause</span>
                    <kbd className="px-3 py-1 bg-tv-bgSoft rounded text-sm font-mono text-tv-text">Space</kbd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-tv-borderSubtle">
                    <span className="text-tv-text">Play / Pause (alternate)</span>
                    <kbd className="px-3 py-1 bg-tv-bgSoft rounded text-sm font-mono text-tv-text">K</kbd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-tv-borderSubtle">
                    <span className="text-tv-text">Mute / Unmute</span>
                    <kbd className="px-3 py-1 bg-tv-bgSoft rounded text-sm font-mono text-tv-text">M</kbd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-tv-borderSubtle">
                    <span className="text-tv-text">Volume Up</span>
                    <kbd className="px-3 py-1 bg-tv-bgSoft rounded text-sm font-mono text-tv-text">↑</kbd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-tv-borderSubtle">
                    <span className="text-tv-text">Volume Down</span>
                    <kbd className="px-3 py-1 bg-tv-bgSoft rounded text-sm font-mono text-tv-text">↓</kbd>
                  </div>
                </div>
              </div>

              {/* Display Controls */}
              <div>
                <h3 className="text-lg font-semibold text-tv-accent mb-3">Display Controls</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-tv-borderSubtle">
                    <span className="text-tv-text">Fullscreen</span>
                    <kbd className="px-3 py-1 bg-tv-bgSoft rounded text-sm font-mono text-tv-text">F</kbd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-tv-borderSubtle">
                    <span className="text-tv-text">Picture-in-Picture</span>
                    <kbd className="px-3 py-1 bg-tv-bgSoft rounded text-sm font-mono text-tv-text">P</kbd>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div>
                <h3 className="text-lg font-semibold text-tv-accent mb-3">Channel Navigation</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-tv-borderSubtle">
                    <span className="text-tv-text">Next Channel</span>
                    <kbd className="px-3 py-1 bg-tv-bgSoft rounded text-sm font-mono text-tv-text">→</kbd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-tv-borderSubtle">
                    <span className="text-tv-text">Previous Channel</span>
                    <kbd className="px-3 py-1 bg-tv-bgSoft rounded text-sm font-mono text-tv-text">←</kbd>
                  </div>
                </div>
              </div>

              {/* Help */}
              <div>
                <h3 className="text-lg font-semibold text-tv-accent mb-3">Help</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-tv-borderSubtle">
                    <span className="text-tv-text">Show/Hide This Help</span>
                    <kbd className="px-3 py-1 bg-tv-bgSoft rounded text-sm font-mono text-tv-text">?</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-tv-borderSubtle">
              <Button 
                onClick={() => setShowKeyboardHelp(false)}
                className="w-full"
              >
                Got it!
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

