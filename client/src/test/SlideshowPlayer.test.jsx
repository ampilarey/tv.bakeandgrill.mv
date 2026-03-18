import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SlideshowPlayer from '../components/SlideshowPlayer';
import * as axiosModule from 'axios';

vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: vi.fn().mockResolvedValue({
        data: {
          items: [
            { id: 1, type: 'image', url: '/img/a.jpg', original_name: 'A', image_duration_seconds: 1 },
            { id: 2, type: 'image', url: '/img/b.jpg', original_name: 'B', image_duration_seconds: 1 },
          ],
        },
      }),
    }),
  },
}));

describe('SlideshowPlayer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders without crashing', async () => {
    const { container } = render(<SlideshowPlayer playlistId="1" />);
    // Flush pending promises
    await act(async () => { await Promise.resolve(); });
    expect(container).toBeTruthy();
  });
});
