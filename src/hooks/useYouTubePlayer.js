import { useEffect, useRef, useCallback, useState } from 'react';

// Module-level promise so the API loads once across StrictMode double-invokes
function getYTReady() {
  if (window._ytReadyPromise) return window._ytReadyPromise;

  window._ytReadyPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });

  return window._ytReadyPromise;
}

export function useYouTubePlayer(onEnded) {
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  // Keep onEnded current without re-running the effect
  const onEndedRef = useRef(onEnded);
  useEffect(() => { onEndedRef.current = onEnded; });

  useEffect(() => {
    let cancelled = false;
    let container = null;

    getYTReady().then((YT) => {
      if (cancelled) return;

      // Create the player container outside React's tree to avoid reconciliation conflicts
      container = document.createElement('div');
      Object.assign(container.style, {
        width: '1px',
        height: '1px',
        opacity: '0',
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        pointerEvents: 'none',
      });
      document.body.appendChild(container);

      playerRef.current = new YT.Player(container, {
        width: 1,
        height: 1,
        playerVars: { autoplay: 0, controls: 0, disablekb: 1 },
        events: {
          onReady() {
            if (!cancelled) setReady(true);
          },
          onStateChange(e) {
            if (e.data === YT.PlayerState.ENDED) {
              onEndedRef.current?.();
            }
          },
          onError(e) {
            // 100: not found, 101/150: embedding disabled — skip the song
            if ([100, 101, 150].includes(e.data)) {
              console.warn('[YT] skipping unplayable video, error:', e.data);
              onEndedRef.current?.();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      container?.remove();
      setReady(false);
    };
  }, []);

  const play = useCallback((videoId, startSeconds, endSeconds) => {
    playerRef.current?.loadVideoById({ videoId, startSeconds, endSeconds });
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stopVideo();
  }, []);

  return { ready, play, stop };
}
