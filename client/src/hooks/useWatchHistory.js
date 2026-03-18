/**
 * useWatchHistory
 * Fetch recently watched channels for a playlist using TanStack Query.
 */
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useWatchHistory(playlistId, channels) {
  const { data: recentlyWatched = [] } = useQuery({
    queryKey: ['watch-history', playlistId],
    queryFn: async () => {
      const res = await api.get(`/history?playlistId=${playlistId}&limit=100`);
      const history = res.data.history || [];
      const unique = [];
      const seen = new Set();

      for (const item of history) {
        if (!seen.has(item.channel_id) && unique.length < 50) {
          seen.add(item.channel_id);
          const info = channels.find(c => c.id === item.channel_id);
          if (info) unique.push({ ...info, watched_at: item.watched_at });
        }
      }

      return unique;
    },
    enabled: !!playlistId && channels.length > 0,
  });

  return { recentlyWatched };
}
