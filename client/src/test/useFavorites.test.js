import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFavorites } from '../hooks/useFavorites';
import api from '../services/api';

vi.mock('../services/api');

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useFavorites', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('loads favorites for a playlist', async () => {
    api.get.mockResolvedValue({ data: { favorites: [{ id: 1, channel_id: 42 }] } });

    const { result } = renderHook(() => useFavorites('5'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.favorites).toHaveLength(1));
  });

  it('isFavorite returns true for known channels', async () => {
    api.get.mockResolvedValue({ data: { favorites: [{ id: 1, channel_id: 42 }] } });

    const { result } = renderHook(() => useFavorites('5'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isFavorite(42)).toBe(true));
    expect(result.current.isFavorite(99)).toBe(false);
  });
});
