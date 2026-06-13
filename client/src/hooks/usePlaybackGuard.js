/**
 * Playback guard utilities — timeout, error mapping, failure reporting.
 */
import api from '../services/api';

export const PLAYBACK_TIMEOUT_MS = 20000;
export const PLAYBACK_STALL_RETRY_MS = 8000;
/** Retries on the same transport URL — transport fallback is separate. */
export const MAX_PLAYER_RETRIES = 2;

export function getStreamUrl(channel, transport = null) {
  if (!channel) return null;
  if (transport === 'proxy') {
    return channel.proxy_url || channel.playback_url || channel.direct_url || channel.url || null;
  }
  if (transport === 'direct') {
    return channel.direct_url || channel.playback_url || channel.url || null;
  }
  return channel.playback_url || channel.direct_url || channel.url || null;
}

export function isProgressiveVideoUrl(url) {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|mkv|avi)(\?|#|$)/i.test(url);
}

export function isHlsStream(url, channel = null) {
  if (!url) return false;
  if (isProxyStreamUrl(url)) return true;
  if (channel?.is_hls === 1 || channel?.is_hls === true) return true;
  const lower = String(url).toLowerCase();
  if (/[?&](format|type|output)=m3u8/.test(lower)) return true;
  if (lower.includes('.m3u8') || lower.includes('.m3u')) return true;
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (path.endsWith('.m3u8') || path.endsWith('.m3u')) return true;
  } catch {
    // ignore
  }
  return false;
}

export function isProxyStreamUrl(url) {
  if (!url) return false;
  return url.includes('/api/stream/');
}

function healthProbeConfirmed(channel) {
  return channel?.manifest_reachable === 1 || channel?.manifest_reachable === true;
}

export function getPrePlayError(channel, isIOS) {
  if (!channel) return null;
  if (channel.unsupported_protocol) return 'Stream incompatible with this device';
  if (channel.is_drm) return 'Stream blocked';
  if (channel.play_status === 'blocked') return 'Stream blocked';
  if (channel.play_status === 'unsupported') {
    return 'Video codec not supported on this device';
  }
  if (!getStreamUrl(channel)) {
    if (channel.play_status === 'offline') {
      return channel.failure_message || 'Stream offline';
    }
    return 'This channel has no stream URL.';
  }
  // Server-side probes run from the host, not the user's browser — don't block playback
  // when the probe failed but we still have a stream URL to try.
  if (healthProbeConfirmed(channel)) {
    if (isIOS && channel.playable_ios === 0) {
      return 'Stream incompatible with this device';
    }
    if (!isIOS && channel.playable_android_chrome === 0 && channel.playable_desktop_chrome === 0) {
      return 'Stream incompatible with this device';
    }
  }
  return null;
}

const REASON_MESSAGES = {
  OFFLINE: 'Stream offline',
  TIMEOUT: 'Playback did not start in time — tap play to retry',
  PLAYBACK_START_TIMEOUT: 'Playback did not start in time — tap play to retry',
  HTTP_ERROR: 'Stream offline',
  REDIRECT_ERROR: 'Stream offline',
  MIXED_CONTENT_HTTP: 'HTTP stream blocked',
  CORS_RISK: 'Stream blocked',
  MANIFEST_INVALID: 'Stream offline',
  MANIFEST_OK_SEGMENT_FAIL: 'Manifest loaded but video segments failed',
  MEDIA_PLAYLIST_FAILED: 'Stream offline',
  INIT_MAP_FAILED: 'Stream incompatible with this device',
  ENCRYPTED_KEY_FETCH_FAILED: 'Encrypted stream not supported',
  UNSUPPORTED_CODEC: 'Unsupported codec',
  UNSUPPORTED_AUDIO: 'Unsupported codec',
  GEO_BLOCKED_OR_FORBIDDEN: 'Stream blocked',
  EXPIRED_URL: 'Stream offline',
  REQUIRES_REFERRER: 'Stream blocked',
  REQUIRES_USER_AGENT: 'Stream blocked',
  DRM_OR_PROTECTED_STREAM: 'Stream blocked',
  PROXY_REQUIRED: 'HTTP stream blocked',
  RATE_LIMITED: 'Stream offline',
  PLAYBACK_STALLED: 'Playback stalled while loading video segments',
  SEGMENT_FETCH_FAILED: 'Stream started but next video segment failed',
  PROXY_RUNTIME_ERROR: 'Stream proxy failed',
  DIRECT_CORS_OR_NETWORK_FAILURE: 'Stream blocked in browser — retrying via proxy',
  PROXY_ORIGIN_FAILURE: 'Stream proxy could not reach the origin',
  MEDIA_CODEC_FAILURE: 'Unsupported codec',
  ORIGIN_PROBE_FAILURE: 'Stream offline',
  UNKNOWN_ERROR: 'Stream offline',
};

export function mapPlaybackError({ reasonCode, mediaError, hlsError, timedOut, channel }) {
  if (timedOut) return REASON_MESSAGES.PLAYBACK_START_TIMEOUT;
  if (reasonCode && REASON_MESSAGES[reasonCode]) return REASON_MESSAGES[reasonCode];

  if (hlsError?.fatal) {
    if (hlsError.details === 'manifestLoadError' || hlsError.details === 'manifestParsingError') {
      return REASON_MESSAGES.MANIFEST_INVALID;
    }
    if (hlsError.details === 'fragLoadError' || hlsError.details === 'fragParsingError') {
      return REASON_MESSAGES.MANIFEST_OK_SEGMENT_FAIL;
    }
    if (hlsError.type === 'networkError') return REASON_MESSAGES.SEGMENT_FETCH_FAILED;
    if (hlsError.type === 'mediaError') return REASON_MESSAGES.MEDIA_CODEC_FAILURE;
    return REASON_MESSAGES.UNKNOWN_ERROR;
  }

  if (mediaError) {
    switch (mediaError.code) {
      case mediaError.MEDIA_ERR_NETWORK:
        return REASON_MESSAGES.SEGMENT_FETCH_FAILED;
      case mediaError.MEDIA_ERR_DECODE:
        return REASON_MESSAGES.MEDIA_CODEC_FAILURE;
      case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return 'Stream incompatible with this device';
      default:
        return REASON_MESSAGES.PLAYBACK_STALLED;
    }
  }

  return REASON_MESSAGES.UNKNOWN_ERROR;
}

export function detectDeviceType() {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios_safari';
  if (/Android/.test(ua)) return 'android_chrome';
  if (/SmartTV|TV|WebOS|Tizen|HbbTV/i.test(ua)) return 'tv_browser';
  return 'desktop_chrome';
}

export async function reportPlaybackFailure({
  url,
  playlistId,
  channelName,
  reasonCode = 'UNKNOWN_ERROR',
  failureStage = null,
}) {
  if (!url || !playlistId) return;
  try {
    await api.post('/channels/report-failure', {
      url,
      playlistId,
      channelName,
      reasonCode,
      deviceType: detectDeviceType(),
      failureStage,
    });
  } catch {
    // non-fatal
  }
}

/**
 * Creates playback timeout + confirmation tracking for a video element.
 */
export function createPlaybackGuard({
  video,
  onTimeout,
  onConfirmed,
  timeoutMs = PLAYBACK_TIMEOUT_MS,
}) {
  let confirmed = false;
  let lastTime = 0;
  let timer = null;

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const confirm = () => {
    if (confirmed) return;
    confirmed = true;
    clearTimer();
    onConfirmed?.();
  };

  const startTimer = () => {
    clearTimer();
    timer = setTimeout(() => {
      if (!confirmed) onTimeout?.();
    }, timeoutMs);
  };

  const onPlaying = () => {
    // playing alone is not enough — wait for timeupdate
  };

  let liveConfirmTicks = 0;

  const onTimeUpdate = () => {
    if (!video || confirmed) return;
    if (video.currentTime > 0 && video.currentTime !== lastTime) {
      lastTime = video.currentTime;
      liveConfirmTicks = 0;
      confirm();
      return;
    }
    if (!video.paused && video.readyState >= 3 && video.videoWidth > 0 && video.videoHeight > 0) {
      liveConfirmTicks += 1;
      if (liveConfirmTicks >= 2) confirm();
    } else {
      liveConfirmTicks = 0;
    }
  };

  const attach = () => {
    video?.addEventListener('playing', onPlaying);
    video?.addEventListener('timeupdate', onTimeUpdate);
    startTimer();
  };

  const detach = () => {
    clearTimer();
    video?.removeEventListener('playing', onPlaying);
    video?.removeEventListener('timeupdate', onTimeUpdate);
  };

  return { attach, detach, confirm, startTimer, clearTimer, isConfirmed: () => confirmed };
}
