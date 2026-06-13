import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';

vi.mock('../services/api');

describe('direct channel bulk preview API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preview returns parsed rows from server', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        preview: [
          { name: 'New HLS Channel', stream_url: 'https://a.test/1.m3u8', status: 'ok' },
          { name: 'News', stream_url: 'https://b.test/2.m3u8', status: 'duplicate' },
        ],
      },
    });

    const res = await api.post('/channels/direct/bulk/preview', {
      text: 'https://a.test/1.m3u8\nNews|https://b.test/2.m3u8|News',
      playlist_id: 1,
    });

    expect(res.data.preview).toHaveLength(2);
    expect(res.data.preview[0].status).toBe('ok');
    expect(res.data.preview[1].name).toBe('News');
  });
});

describe('DIRECT_HLS_NOT_IPTV playlist guard response', () => {
  it('409 payload includes suggest_direct and stream_url', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          code: 'DIRECT_HLS_NOT_IPTV',
          detected_type: 'hls_media',
          stream_url: 'https://cdn.example.com/live.m3u8',
          suggest_direct: true,
        },
      },
    });

    await expect(api.post('/playlists', { name: 'X', m3u_url: 'https://cdn.example.com/live.m3u8' }))
      .rejects.toMatchObject({
        response: {
          data: {
            code: 'DIRECT_HLS_NOT_IPTV',
            suggest_direct: true,
          },
        },
      });
  });
});
