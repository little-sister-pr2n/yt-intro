export type Difficulty = 'normal' | 'hard' | 'expert' | 'monster' | 'breath';

export type TagFilter = 'シャンシャン' | 'ドラム' | 'シンバル' | '息' | null;

export type QuizPhase = 'playing' | 'answering' | 'result';

export interface Song {
  video_id: string;
  title: string;
  artist: string;
  intro_seconds: number;
  breath_intro_seconds: number | null;
  period: number;
  tag: string | null;
}

export interface HistoryEntry {
  title: string;
  artist: string;
  thumbnailUrl: string;
  userAnswer: string;
  correct: boolean;
}

export interface SongQueue {
  next(): Song;
}
