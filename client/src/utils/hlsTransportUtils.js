export const HLS_NETWORK_FATAL_DETAILS = new Set([
  'manifestLoadError',
  'manifestLoadTimeOut',
  'manifestParsingError',
  'levelLoadError',
  'levelLoadTimeOut',
  'fragLoadError',
  'fragLoadTimeOut',
  'keyLoadError',
  'keyLoadTimeOut',
]);

export const MAX_MEDIA_RETRIES = 2;

export function resolveInitialTransport(channel) {
  if (!channel) return 'direct';
  const mode = channel.playback_mode || 'auto';
  if (mode === 'proxy') return 'proxy';
  if (mode === 'direct') return 'direct';
  return 'direct';
}

export function resolveActiveStreamUrl(channel, transport = 'direct') {
  if (!channel) return null;
  if (transport === 'proxy') {
    return channel.proxy_url || channel.playback_url || channel.direct_url || channel.url || null;
  }
  return channel.direct_url || channel.playback_url || channel.url || null;
}

export function isQualifyingTransportError({ hlsError, mediaError, proxyHttpStatus } = {}) {
  if (proxyHttpStatus === 401) return true;

  if (mediaError && mediaError.code === mediaError.MEDIA_ERR_NETWORK) return true;

  if (!hlsError?.fatal) return false;

  const Hls = typeof window !== 'undefined' ? window.Hls : null;
  if (Hls && hlsError.type === Hls.ErrorTypes.MEDIA_ERROR) return false;

  if (hlsError.details && HLS_NETWORK_FATAL_DETAILS.has(hlsError.details)) return true;

  if (Hls && hlsError.type === Hls.ErrorTypes.NETWORK_ERROR) return true;

  return false;
}

export function isHlsMediaError(hlsError) {
  if (!hlsError?.fatal) return false;
  const Hls = typeof window !== 'undefined' ? window.Hls : null;
  return !!(Hls && hlsError.type === Hls.ErrorTypes.MEDIA_ERROR);
}

export function isNativeMediaCodecError(mediaError) {
  if (!mediaError) return false;
  return mediaError.code === mediaError.MEDIA_ERR_DECODE
    || mediaError.code === mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED;
}

export function isNativeNetworkError(mediaError) {
  if (!mediaError) return false;
  return mediaError.code === mediaError.MEDIA_ERR_NETWORK;
}

export function mapTransportFailureReason(transport, { hlsDetails, proxyHttpStatus } = {}) {
  if (proxyHttpStatus === 401) return 'PROXY_RUNTIME_ERROR';
  if (transport === 'proxy') return 'PROXY_ORIGIN_FAILURE';
  if (hlsDetails?.includes('manifest')) return 'DIRECT_CORS_OR_NETWORK_FAILURE';
  return 'DIRECT_CORS_OR_NETWORK_FAILURE';
}

export function canFallbackToProxy(channel, transportFallbackUsed, playbackMode) {
  if (playbackMode === 'direct') return false;
  if (playbackMode === 'proxy') return false;
  if (transportFallbackUsed) return false;
  return playbackMode === 'auto';
}
