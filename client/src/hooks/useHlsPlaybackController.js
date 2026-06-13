import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import {
  resolveInitialTransport,
  resolveActiveStreamUrl,
  isQualifyingTransportError,
  isHlsMediaError,
  isNativeMediaCodecError,
  isNativeNetworkError,
  mapTransportFailureReason,
  canFallbackToProxy,
  MAX_MEDIA_RETRIES,
} from '../utils/hlsTransportUtils';

/**
 * Shared HLS transport controller — direct/proxy selection and fallback.
 */
export function useHlsPlaybackController({
  channel,
  playlistId,
  onChannelUpdate,
}) {
  const [channelSnapshot, setChannelSnapshot] = useState(channel);
  const [activeTransport, setActiveTransport] = useState(() => resolveInitialTransport(channel));
  const [transportRevision, setTransportRevision] = useState(0);
  const generationRef = useRef(0);
  const transportFallbackUsedRef = useRef(false);
  const tokenRefreshUsedRef = useRef(false);
  const mediaRetryCountRef = useRef(0);
  const pendingTimersRef = useRef([]);

  const clearPendingTimers = useCallback(() => {
    pendingTimersRef.current.forEach((id) => clearTimeout(id));
    pendingTimersRef.current = [];
  }, []);

  const scheduleTimer = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    pendingTimersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    generationRef.current += 1;
    transportFallbackUsedRef.current = false;
    tokenRefreshUsedRef.current = false;
    mediaRetryCountRef.current = 0;
    clearPendingTimers();
    setChannelSnapshot(channel);
    setActiveTransport(resolveInitialTransport(channel));
    setTransportRevision((v) => v + 1);
  }, [channel?.id, channel?.playback_mode, clearPendingTimers]);

  useEffect(() => () => clearPendingTimers(), [clearPendingTimers]);

  const playbackMode = channelSnapshot?.playback_mode || 'auto';
  const activeStreamUrl = resolveActiveStreamUrl(channelSnapshot, activeTransport);
  const isProxy = activeTransport === 'proxy';

  const refreshChannel = useCallback(async () => {
    if (!channelSnapshot?.id || !playlistId) return null;
    const gen = generationRef.current;
    try {
      const res = await api.get(`/channels/${channelSnapshot.id}`, {
        params: { playlistId },
      });
      if (gen !== generationRef.current) return null;
      const updated = res.data?.channel;
      if (updated) {
        setChannelSnapshot(updated);
        if (updated.proxy_url && updated.proxy_url !== channelSnapshot?.proxy_url) {
          setTransportRevision((v) => v + 1);
        }
        onChannelUpdate?.(updated);
      }
      return updated || null;
    } catch {
      return null;
    }
  }, [channelSnapshot?.id, channelSnapshot?.proxy_url, playlistId, onChannelUpdate]);

  const switchToProxy = useCallback(async () => {
    if (transportFallbackUsedRef.current) return null;
    if (playbackMode === 'direct') return null;

    transportFallbackUsedRef.current = true;
    const updated = await refreshChannel();
    const proxyUrl = updated?.proxy_url || channelSnapshot?.proxy_url;
    if (!proxyUrl) return null;

    setActiveTransport('proxy');
    setTransportRevision((v) => v + 1);
    return proxyUrl;
  }, [playbackMode, refreshChannel, channelSnapshot?.proxy_url]);

  const refreshProxyToken = useCallback(async () => {
    if (tokenRefreshUsedRef.current) return null;
    tokenRefreshUsedRef.current = true;
    const updated = await refreshChannel();
    return updated?.proxy_url || null;
  }, [refreshChannel]);

  /**
   * Handle a fatal hls.js error. Returns an action for the page to execute.
   * @returns {Promise<{ action: string, url?: string, reasonCode?: string, failureStage?: string }>}
   */
  const handleHlsFatalError = useCallback(async (data) => {
    const failureStage = data?.details || data?.type || 'unknown';

    if (isHlsMediaError(data)) {
      if (mediaRetryCountRef.current < MAX_MEDIA_RETRIES) {
        mediaRetryCountRef.current += 1;
        return { action: 'recover_media', reasonCode: 'MEDIA_CODEC_FAILURE', failureStage };
      }
      return { action: 'fatal', reasonCode: 'MEDIA_CODEC_FAILURE', failureStage };
    }

    if (!isQualifyingTransportError({ hlsError: data })) {
      const reasonCode = activeTransport === 'proxy' ? 'PROXY_ORIGIN_FAILURE' : 'DIRECT_CORS_OR_NETWORK_FAILURE';
      return { action: 'fatal', reasonCode, failureStage };
    }

    if (activeTransport === 'proxy') {
      const freshUrl = await refreshProxyToken();
      if (freshUrl) {
        return { action: 'reload', url: freshUrl, reasonCode: 'PROXY_RUNTIME_ERROR', failureStage };
      }
      return {
        action: 'fatal',
        reasonCode: 'PROXY_ORIGIN_FAILURE',
        failureStage,
      };
    }

    if (canFallbackToProxy(channelSnapshot, transportFallbackUsedRef.current, playbackMode)) {
      const proxyUrl = await switchToProxy();
      if (proxyUrl) {
        return { action: 'switch_transport', url: proxyUrl, transport: 'proxy', failureStage };
      }
    }

    return {
      action: 'fatal',
      reasonCode: mapTransportFailureReason('direct', { hlsDetails: data?.details }),
      failureStage,
    };
  }, [activeTransport, channelSnapshot, playbackMode, refreshProxyToken, switchToProxy]);

  /**
   * Handle native video element errors (iOS Safari).
   */
  const handleNativeVideoError = useCallback(async (mediaError) => {
    const failureStage = `media_error_${mediaError?.code ?? 'unknown'}`;

    if (isNativeMediaCodecError(mediaError)) {
      if (mediaRetryCountRef.current < MAX_MEDIA_RETRIES) {
        mediaRetryCountRef.current += 1;
        return { action: 'retry_same', reasonCode: 'MEDIA_CODEC_FAILURE', failureStage };
      }
      return { action: 'fatal', reasonCode: 'MEDIA_CODEC_FAILURE', failureStage };
    }

    if (isNativeNetworkError(mediaError)) {
      if (activeTransport === 'proxy') {
        const freshUrl = await refreshProxyToken();
        if (freshUrl) return { action: 'reload', url: freshUrl, failureStage };
        return { action: 'fatal', reasonCode: 'PROXY_ORIGIN_FAILURE', failureStage };
      }

      if (canFallbackToProxy(channelSnapshot, transportFallbackUsedRef.current, playbackMode)) {
        const proxyUrl = await switchToProxy();
        if (proxyUrl) {
          return { action: 'switch_transport', url: proxyUrl, transport: 'proxy', failureStage };
        }
      }

      if (mediaRetryCountRef.current < MAX_MEDIA_RETRIES) {
        mediaRetryCountRef.current += 1;
        return { action: 'retry_same', reasonCode: 'DIRECT_CORS_OR_NETWORK_FAILURE', failureStage };
      }

      return {
        action: 'fatal',
        reasonCode: 'DIRECT_CORS_OR_NETWORK_FAILURE',
        failureStage,
      };
    }

    return { action: 'fatal', reasonCode: 'PLAYBACK_STALLED', failureStage };
  }, [activeTransport, channelSnapshot, playbackMode, refreshProxyToken, switchToProxy]);

  const destroyPlayer = useCallback((hlsRef) => {
    clearPendingTimers();
    if (hlsRef?.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, [clearPendingTimers]);

  return {
    activeStreamUrl,
    activeTransport,
    playbackMode,
    isProxy,
    transportRevision,
    channelSnapshot,
    handleHlsFatalError,
    handleNativeVideoError,
    destroyPlayer,
    scheduleTimer,
    clearPendingTimers,
    refreshChannel,
    switchToProxy,
  };
}

export default useHlsPlaybackController;
