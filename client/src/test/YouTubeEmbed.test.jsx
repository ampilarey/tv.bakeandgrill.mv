import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import YouTubeEmbed from '../components/YouTubeEmbed';

describe('YouTubeEmbed — module singleton', () => {
  beforeEach(() => {
    // Reset the module-level singleton between tests
    vi.resetModules();
    delete window.YT;
    delete window.onYouTubeIframeAPIReady;
  });

  it('adds the YT script tag only once for multiple instances', () => {
    const appendSpy = vi.spyOn(document.head, 'appendChild');

    render(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);
    render(<YouTubeEmbed videoId="abc123def45" />);

    // Script should only be injected once no matter how many instances render
    const scriptCalls = appendSpy.mock.calls.filter(
      args => args[0]?.tagName === 'SCRIPT'
    );
    expect(scriptCalls.length).toBe(1);
  });
});
