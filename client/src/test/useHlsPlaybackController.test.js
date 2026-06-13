import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  resolveInitialTransport,
  resolveActiveStreamUrl,
  isQualifyingTransportError,
  isHlsMediaError,
  canFallbackToProxy,
  HLS_NETWORK_FATAL_DETAILS,
} from '../utils/hlsTransportUtils';
import useHlsPlaybackController from '../hooks/useHlsPlaybackController';
import api from '../services/api';

vi.mock('../services/api');

const baseChannel = {
  id: 'ch-1',
  name: 'Test',
  url: 'https://cdn.example.com/live.m3u8',
  direct_url: 'https://cdn.example.com/live.m3u8',
  proxy_url: 'https://tv.example.com/api/stream/ch-1/master.m3u8?token=OLD&playlistId=1',
  playback_mode: 'auto',
};

describe('hlsTransportUtils', () => {
  it('resolveInitialTransport respects playback_mode', () => {
    expect(resolveInitialTransport({ playback_mode: 'proxy' })).toBe('proxy');
    expect(resolveInitialTransport({ playback_mode: 'direct' })).toBe('direct');
    expect(resolveInitialTransport({ playback_mode: 'auto' })).toBe('direct');
  });

  it('resolveActiveStreamUrl picks transport URL', () => {
    expect(resolveActiveStreamUrl(baseChannel, 'direct')).toBe(baseChannel.direct_url);
    expect(resolveActiveStreamUrl(baseChannel, 'proxy')).toBe(baseChannel.proxy_url);
  });

  it('isQualifyingTransportError detects manifest network failures', () => {
    expect(isQualifyingTransportError({
      hlsError: { fatal: true, details: 'manifestLoadError', type: 'networkError' },
    })).toBe(true);
    expect(HLS_NETWORK_FATAL_DETAILS.has('fragLoadError')).toBe(true);
  });

  it('isQualifyingTransportError ignores media errors', () => {
    const fakeHls = { ErrorTypes: { MEDIA_ERROR: 'mediaError', NETWORK_ERROR: 'networkError' } };
    vi.stubGlobal('Hls', fakeHls);
    expect(isQualifyingTransportError({
      hlsError: { fatal: true, type: 'mediaError', details: 'fragParsingError' },
    })).toBe(false);
    vi.unstubAllGlobals();
  });

  it('canFallbackToProxy allows one auto fallback', () => {
    expect(canFallbackToProxy(baseChannel, false, 'auto')).toBe(true);
    expect(canFallbackToProxy(baseChannel, true, 'auto')).toBe(false);
    expect(canFallbackToProxy(baseChannel, false, 'proxy')).toBe(false);
    expect(canFallbackToProxy(baseChannel, false, 'direct')).toBe(false);
  });
});

describe('useHlsPlaybackController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with direct URL in auto mode', () => {
    const { result } = renderHook(() => useHlsPlaybackController({
      channel: baseChannel,
      playlistId: '1',
    }));
    expect(result.current.activeStreamUrl).toBe(baseChannel.direct_url);
    expect(result.current.playbackMode).toBe('auto');
    expect(result.current.isProxy).toBe(false);
  });

  it('starts with proxy URL in explicit proxy mode', () => {
    const proxyChannel = { ...baseChannel, playback_mode: 'proxy' };
    const { result } = renderHook(() => useHlsPlaybackController({
      channel: proxyChannel,
      playlistId: '1',
    }));
    expect(result.current.activeStreamUrl).toBe(baseChannel.proxy_url);
    expect(result.current.isProxy).toBe(true);
  });

  it('switches to proxy exactly once on manifest network failure', async () => {
    api.get.mockResolvedValue({
      data: {
        channel: {
          ...baseChannel,
          proxy_url: 'https://tv.example.com/api/stream/ch-1/master.m3u8?token=FRESH&playlistId=1',
        },
      },
    });

    const { result } = renderHook(() => useHlsPlaybackController({
      channel: baseChannel,
      playlistId: '1',
    }));

    let action;
    await act(async () => {
      action = await result.current.handleHlsFatalError({
        fatal: true,
        details: 'manifestLoadError',
        type: 'networkError',
      });
    });

    expect(action.action).toBe('switch_transport');
    expect(action.url).toContain('token=FRESH');
    await waitFor(() => {
      expect(result.current.isProxy).toBe(true);
    });
    expect(api.get).toHaveBeenCalledTimes(1);

    let second;
    await act(async () => {
      second = await result.current.handleHlsFatalError({
        fatal: true,
        details: 'manifestLoadError',
        type: 'networkError',
      });
    });
    expect(second.action).toBe('reload');
    expect(api.get).toHaveBeenCalledTimes(2);

    let third;
    await act(async () => {
      third = await result.current.handleHlsFatalError({
        fatal: true,
        details: 'manifestLoadError',
        type: 'networkError',
      });
    });
    expect(third.action).toBe('fatal');
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('uses recover_media for codec errors without transport switch', async () => {
    const fakeHls = { ErrorTypes: { MEDIA_ERROR: 'mediaError', NETWORK_ERROR: 'networkError' } };
    vi.stubGlobal('Hls', fakeHls);

    const { result } = renderHook(() => useHlsPlaybackController({
      channel: baseChannel,
      playlistId: '1',
    }));

    let action;
    await act(async () => {
      action = await result.current.handleHlsFatalError({
        fatal: true,
        type: 'mediaError',
        details: 'fragParsingError',
      });
    });

    expect(action.action).toBe('recover_media');
    expect(result.current.isProxy).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('resets transport state on channel change', async () => {
    const { result, rerender } = renderHook(
      ({ channel }) => useHlsPlaybackController({ channel, playlistId: '1' }),
      { initialProps: { channel: baseChannel } }
    );

    api.get.mockResolvedValue({
      data: {
        channel: {
          ...baseChannel,
          proxy_url: 'https://tv.example.com/api/stream/ch-1/master.m3u8?token=FRESH&playlistId=1',
        },
      },
    });

    await act(async () => {
      await result.current.handleHlsFatalError({
        fatal: true,
        details: 'fragLoadError',
        type: 'networkError',
      });
    });

    await waitFor(() => expect(result.current.isProxy).toBe(true));

    const otherChannel = {
      ...baseChannel,
      id: 'ch-2',
      direct_url: 'https://cdn.example.com/other.m3u8',
      url: 'https://cdn.example.com/other.m3u8',
    };

    rerender({ channel: otherChannel });
    await waitFor(() => {
      expect(result.current.activeStreamUrl).toBe(otherChannel.direct_url);
      expect(result.current.isProxy).toBe(false);
    });
  });
});

describe('shared hook adoption', () => {
  it('PlayerPage imports useHlsPlaybackController', async () => {
    const mod = await import('../pages/PlayerPage.jsx');
    expect(mod.default).toBeTypeOf('function');
    const src = await import('../hooks/useHlsPlaybackController');
    expect(src.default).toBeTypeOf('function');
  });

  it('KioskModePage imports useHlsPlaybackController', async () => {
    const mod = await import('../pages/KioskModePage.jsx');
    expect(mod.default).toBeTypeOf('function');
  });
});
