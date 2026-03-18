/**
 * usePlayerKeyboardShortcuts
 * Keyboard bindings for the IPTV player.
 * Keeps handlers fresh via refs so the effect doesn't need to re-run on every
 * channel / filteredChannels change — only registers once.
 */
import { useEffect, useRef } from 'react';

export function usePlayerKeyboardShortcuts({
  videoRef,
  currentChannel,
  filteredChannels,
  onChannelSelect,
  onToggleHelp,
  onTogglePiP,
  showKeyboardHelp,
}) {
  // Store mutable values in refs so the keydown handler always reads the latest
  const filteredRef = useRef(filteredChannels);
  const currentRef  = useRef(currentChannel);
  const helpRef     = useRef(showKeyboardHelp);

  useEffect(() => { filteredRef.current = filteredChannels; }, [filteredChannels]);
  useEffect(() => { currentRef.current  = currentChannel;   }, [currentChannel]);
  useEffect(() => { helpRef.current     = showKeyboardHelp; }, [showKeyboardHelp]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const video = videoRef.current;
      const ch    = currentRef.current;
      const list  = filteredRef.current;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (video) video.paused ? video.play() : video.pause();
          break;

        case 'f':
          e.preventDefault();
          if (document.fullscreenElement) document.exitFullscreen();
          else video?.requestFullscreen?.();
          break;

        case 'm':
          e.preventDefault();
          if (video) video.muted = !video.muted;
          break;

        case 'p':
          e.preventDefault();
          onTogglePiP?.();
          break;

        case 'arrowup':
          e.preventDefault();
          if (video) video.volume = Math.min(1, video.volume + 0.1);
          break;

        case 'arrowdown':
          e.preventDefault();
          if (video) video.volume = Math.max(0, video.volume - 0.1);
          break;

        case 'arrowright':
          e.preventDefault();
          if (ch && list.length > 0) {
            const idx  = list.findIndex(c => c.id === ch.id);
            onChannelSelect(list[(idx + 1) % list.length]);
          }
          break;

        case 'arrowleft':
          e.preventDefault();
          if (ch && list.length > 0) {
            const idx  = list.findIndex(c => c.id === ch.id);
            const prev = idx === 0 ? list.length - 1 : idx - 1;
            onChannelSelect(list[prev]);
          }
          break;

        case '?':
        case '/':
          e.preventDefault();
          onToggleHelp?.();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // Only refs and stable callbacks — no array churn
  }, [videoRef, onChannelSelect, onToggleHelp, onTogglePiP]);
}
