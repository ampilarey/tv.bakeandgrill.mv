/**
 * useChannelList
 * Fetch channels for a playlist, support debounced search, group filtering,
 * and favorites-only view. Uses TanStack Query for server state management.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

async function fetchChannels(playlistId) {
  const response = await api.get(`/channels?playlistId=${playlistId}`);
  return {
    channels: response.data.channels || [],
    groups: response.data.groups || [],
  };
}

export function useChannelList({ playlistId, favorites }) {
  const navigate = useNavigate();

  const {
    data,
    isLoading: loading,
  } = useQuery({
    queryKey: ['channels', playlistId],
    queryFn: () => fetchChannels(playlistId),
    enabled: !!playlistId,
    onError: () => { /* navigate handled below */ },
  });

  const channels = data?.channels ?? [];
  const groups   = data?.groups   ?? [];

  // Navigate to dashboard if playlistId is missing
  useEffect(() => {
    if (!playlistId) navigate('/dashboard');
  }, [playlistId, navigate]);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [displayedChannels, setDisplayedChannels] = useState(50);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    } catch {
      localStorage.removeItem('searchHistory');
      return [];
    }
  });
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  const searchDebounceRef = useRef(null);

  // Derived: filtered channel list
  const filteredChannels = (() => {
    let result = channels;

    if (showFavoritesOnly) {
      const favIds = new Set(favorites.map(f => f.channel_id));
      result = result.filter(ch => favIds.has(ch.id));
    }

    if (selectedGroup) {
      result = result.filter(ch => ch.group?.trim() === selectedGroup.trim());
    }

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      result = result.filter(ch =>
        ch.name?.toLowerCase().includes(query) ||
        ch.group?.toLowerCase().includes(query)
      );
    }

    return result;
  })();

  const handleSearch = useCallback((value) => {
    setSearchQuery(value);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchQuery(value);
    }, 250);

    if (value.trim() && value !== searchHistory[0]) {
      const newHistory = [value, ...searchHistory.filter(h => h !== value)].slice(0, 10);
      setSearchHistory(newHistory);
      try { localStorage.setItem('searchHistory', JSON.stringify(newHistory)); } catch { /* quota */ }
    }
  }, [searchHistory]);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  }, []);

  const loadMore = useCallback(() => setDisplayedChannels(prev => prev + 50), []);

  return {
    channels,
    filteredChannels,
    groups,
    loading,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    selectedGroup, setSelectedGroup,
    showFavoritesOnly, setShowFavoritesOnly,
    displayedChannels,
    loadMore,
    searchHistory,
    showSearchSuggestions, setShowSearchSuggestions,
    handleSearch,
    clearSearchHistory,
  };
}
