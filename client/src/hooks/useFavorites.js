/**
 * useFavorites
 * Fetch favorites for a playlist and expose toggle + predicate.
 * Uses TanStack Query (useQuery + useMutation) for server state.
 */
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export function useFavorites(playlistId) {
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', playlistId],
    queryFn: async () => {
      const res = await api.get(`/favorites?playlistId=${playlistId}`);
      return res.data.favorites || [];
    },
    enabled: !!playlistId,
  });

  const addFav = useMutation({
    mutationFn: (channel) =>
      api.post('/favorites', {
        playlist_id: parseInt(playlistId),
        channel_id: channel.id,
        channel_name: channel.name,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites', playlistId] }),
  });

  const removeFav = useMutation({
    mutationFn: (favId) => api.delete(`/favorites/${favId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites', playlistId] }),
  });

  const isFavorite = useCallback(
    (channelId) => favorites.some(f => f.channel_id === channelId),
    [favorites]
  );

  const toggleFavorite = useCallback((channel) => {
    const fav = favorites.find(f => f.channel_id === channel.id);
    if (fav) {
      removeFav.mutate(fav.id);
    } else {
      addFav.mutate(channel);
    }
  }, [favorites, addFav, removeFav]);

  return { favorites, isFavorite, toggleFavorite };
}
