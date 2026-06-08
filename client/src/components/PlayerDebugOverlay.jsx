import { useEffect, useState } from 'react';
import { getStreamUrl, isProxyStreamUrl } from '../hooks/usePlaybackGuard';

function isDebugEnabled(searchParams) {
  if (searchParams?.get('playerDebug') === '1') return true;
  try {
    return localStorage.getItem('playerDebug') === '1';
  } catch {
    return false;
  }
}

export default function PlayerDebugOverlay({ videoRef, channel, searchParams, lastEvent, hlsError }) {
  const [tick, setTick] = useState(0);
  const enabled = isDebugEnabled(searchParams);

  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  const video = videoRef?.current;
  const streamUrl = channel ? getStreamUrl(channel) : null;
  const proxyType = streamUrl && isProxyStreamUrl(streamUrl) ? 'proxy' : 'direct';

  let lastSegStatus = '—';
  try {
    const entries = performance.getEntriesByType('resource')
      .filter((e) => e.name.includes('/api/stream/'))
      .slice(-3);
    if (entries.length) {
      lastSegStatus = entries.map((e) => `${e.responseStatus || '?'} ${e.name.split('/').pop()?.slice(0, 20)}`).join(' | ');
    }
  } catch { /* ignore */ }

  return (
    <div className="fixed bottom-2 left-2 z-[100] max-w-xs bg-black/85 text-green-400 text-[10px] font-mono p-2 rounded border border-green-900 pointer-events-none leading-relaxed">
      <div className="text-yellow-400 font-bold mb-1">Player debug</div>
      <div>ch: {channel?.name || '—'}</div>
      <div>url: {proxyType}</div>
      <div>ready: {video?.readyState ?? '—'} net: {video?.networkState ?? '—'}</div>
      <div>time: {video?.currentTime?.toFixed(1) ?? '—'}s</div>
      <div>size: {video?.videoWidth ?? 0}×{video?.videoHeight ?? 0}</div>
      <div>event: {lastEvent || '—'}</div>
      {hlsError && (
        <div className="text-red-400 mt-1">
          hls: {hlsError.type}/{hlsError.details}
        </div>
      )}
      <div className="text-gray-400 mt-1 truncate" title={lastSegStatus}>seg: {lastSegStatus}</div>
      <div className="text-gray-600">tick:{tick}</div>
    </div>
  );
}
