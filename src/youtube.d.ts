interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: (() => void) | null;
  _ytReadyPromise?: Promise<typeof YT>;
}

declare namespace YT {
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  interface PlayerOptions {
    width?: number;
    height?: number;
    videoId?: string;
    playerVars?: Record<string, number | string>;
    events?: {
      onReady?: (event: PlayerEvent) => void;
      onStateChange?: (event: OnStateChangeEvent) => void;
      onError?: (event: OnErrorEvent) => void;
    };
  }

  interface PlayerEvent {
    target: Player;
  }

  interface OnStateChangeEvent {
    data: PlayerState;
    target: Player;
  }

  interface OnErrorEvent {
    data: number;
    target: Player;
  }

  class Player {
    constructor(element: HTMLElement | string, options: PlayerOptions);
    loadVideoById(params: {
      videoId: string;
      startSeconds?: number;
      endSeconds?: number;
    }): void;
    stopVideo(): void;
    destroy(): void;
  }
}
