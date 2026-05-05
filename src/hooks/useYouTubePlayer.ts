import { useEffect, useRef, useCallback, useState } from 'react';

function getYTReady(): Promise<typeof YT> {
  if (window._ytReadyPromise) return window._ytReadyPromise;

  window._ytReadyPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });

  return window._ytReadyPromise;
}

export function useYouTubePlayer(onEnded: () => void) {
  const playerRef = useRef<YT.Player | null>(null);
  const [ready, setReady] = useState(false);
  const onEndedRef = useRef(onEnded);
  useEffect(() => { onEndedRef.current = onEnded; });

  useEffect(() => {
    let cancelled = false;
    let container: HTMLDivElement | null = null;

    getYTReady().then((yt) => {
      if (cancelled) return;

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

      playerRef.current = new yt.Player(container, {
        width: 1,
        height: 1,
        playerVars: { autoplay: 0, controls: 0, disablekb: 1 },
        events: {
          onReady(e) {
            if (!cancelled) {
              e.target.setVolume(25);
              setReady(true);
            }
          },
          onStateChange(e) {
            if (e.data === yt.PlayerState.ENDED) {
              onEndedRef.current?.();
            }
          },
          onError(e) {
            if ([100, 101, 150].includes(e.data)) {
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

  const play = useCallback((videoId: string, startSeconds: number, endSeconds: number) => {
    playerRef.current?.loadVideoById({ videoId, startSeconds, endSeconds });
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stopVideo();
  }, []);

  return { ready, play, stop };
}
