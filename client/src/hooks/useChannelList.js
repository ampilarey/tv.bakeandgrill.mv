import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const SEARCH_DEBOUNCE_MS = 250;

async function fetchChannels(playlistId, playStatusFilter) {
  const playableOnly = playStatusFilter === 'playable' ? '1' : '0';
  const response = await api.get(`/channels?playlistId=${playlistId}&playableOnly=${playableOnly}`);
  return {
    channels: response.data.channels || [],
    groups: response.data.groups || [],
  };
}

export function useChannelList({ playlistId, favorites, playStatusFilter = 'playable' }) {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [displayedChannels, setDisplayedChannels] = useState(50);
  const [searchHistory, setSearchHistory] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('channelSearchHistory') || '[]');
    } catch {
      return [];
    }
  });
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  useEffect(() => {
    if (!playlistId) navigate('/dashboard');
  }, [playlistId, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data, isLoading: loading, isError, error, refetch } = useQuery({
    queryKey: ['channels', playlistId, playStatusFilter],
    queryFn: () => fetchChannels(playlistId, playStatusFilter),
    enabled: !!playlistId,
  });

  const channels = data?.channels || [];
  const groups = data?.groups || [];

  const filteredChannels = useMemo(() => {
    let result = channels;

    if (playStatusFilter === 'failed') {
      result = result.filter(
        (c) => c.play_status === 'offline' || c.play_status === 'unsupported' || c.play_status === 'blocked'
      );
    }

    if (showFavoritesOnly && favorites) {
      result = result.filter((c) => favorites.has(c.id));
    }

    if (selectedGroup) {
      result = result.filter((c) => c.group === selectedGroup);
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.group && c.group.toLowerCase().includes(q))
      );
    }

    return result;
  }, [channels, playStatusFilter, showFavoritesOnly, favorites, selectedGroup, debouncedSearch]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      setSearchHistory((prev) => {
        const updated = [query.trim(), ...prev.filter((s) => s !== query.trim())].slice(0, 8);
        localStorage.setItem('channelSearchHistory', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('channelSearchHistory');
  };

  const loadMore = () => setDisplayedChannels((n) => n + 50);

  return {
    channels,
    filteredChannels,
    groups,
    loading,
    isError,
    error,
    refetch,
    searchQuery,
    setSearchQuery,
    selectedGroup,
    setSelectedGroup,
    showFavoritesOnly,
    setShowFavoritesOnly,
    displayedChannels,
    loadMore,
    searchHistory,
    showSearchSuggestions,
    setShowSearchSuggestions,
    handleSearch,
    clearSearchHistory,
  };
}
