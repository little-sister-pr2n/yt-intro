import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useYouTubePlayer } from './hooks/useYouTubePlayer';
import { judge } from './utils/judge';
import { createQueue } from './utils/queue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Difficulty, QuizPhase, Song, HistoryEntry, SongQueue, TagFilter } from './types';
import songs from './songs.json';

function useTheme() {
  const [dark, setDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label="テーマ切替">
      {dark ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM10 17a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 17ZM17 10a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 17 10ZM2 10a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 2 10ZM15.657 15.657a.75.75 0 0 1-1.06 0l-1.061-1.06a.75.75 0 1 1 1.06-1.061l1.06 1.06a.75.75 0 0 1 0 1.06ZM5.404 5.404a.75.75 0 0 1-1.06 0l-1.061-1.06a.75.75 0 0 1 1.06-1.061l1.06 1.06a.75.75 0 0 1 0 1.06ZM15.657 4.343a.75.75 0 0 1 0 1.061l-1.06 1.06a.75.75 0 1 1-1.061-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM5.404 14.596a.75.75 0 0 1 0 1.06l-1.061 1.061a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0Z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z" clipRule="evenodd" />
        </svg>
      )}
    </Button>
  );
}

const DIFFICULTY_OFFSET: Record<Exclude<Difficulty, 'breath'>, number> = { normal: 10, hard: 5, expert: 1, monster: 0 };
const DIFFICULTIES: Difficulty[] = ['normal', 'hard', 'expert', 'monster', 'breath'];
const DIFFICULTY_LABELS: Record<Difficulty, string> = { normal: 'normal', hard: 'hard', expert: 'expert', monster: 'monster', breath: '超イントロ' };

function playSeconds(song: Song, diff: Difficulty): number {
  if (diff === 'breath') {
    return song.breath_intro_seconds ?? song.intro_seconds;
  }
  return song.intro_seconds + DIFFICULTY_OFFSET[diff];
}

function thumb(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function DifficultySelector({ value, onChange }: { value: Difficulty; onChange: (d: Difficulty) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {DIFFICULTIES.map((d) => (
        <Button
          key={d}
          variant={value === d ? 'default' : 'outline'}
          size="xs"
          onClick={() => onChange(d)}
        >
          {DIFFICULTY_LABELS[d]}
        </Button>
      ))}
    </div>
  );
}

const TAG_FILTERS: TagFilter[] = ['ドラム', 'シンバル', 'シャンシャン', '息'];

function TagSelector({ value, onChange }: { value: TagFilter; onChange: (t: TagFilter) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      <Button
        variant={value === null ? 'default' : 'outline'}
        size="xs"
        onClick={() => onChange(null)}
      >
        全曲
      </Button>
      {TAG_FILTERS.map((t) => (
        <Button
          key={t}
          variant={value === t ? 'default' : 'outline'}
          size="xs"
          onClick={() => onChange(t)}
        >
          {t}
        </Button>
      ))}
    </div>
  );
}

function filteredSongs(tag: TagFilter): Song[] {
  if (tag === null) return songs as Song[];
  return (songs as Song[]).filter((s) => s.tag === tag);
}

function HistoryPanel({ history }: { history: HistoryEntry[] }) {
  if (!history.length) return null;
  return (
    <div className="flex flex-col gap-2 overflow-y-auto">
      {[...history].reverse().map((item, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 rounded-lg border p-2 ${
            item.correct
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
          }`}
        >
          <img src={item.thumbnailUrl} alt="" className="w-14 h-10 object-cover rounded" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{item.title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {item.userAnswer || '(未回答)'}
            </div>
          </div>
          <span className={`text-lg font-bold ${item.correct ? 'text-green-600' : 'text-red-500'}`}>
            {item.correct ? '○' : '×'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { dark, toggle: toggleTheme } = useTheme();
  const [difficulty, setDifficulty] = useState<Difficulty>('expert');
  const [tagFilter, setTagFilter] = useState<TagFilter>(null);
  const [started, setStarted] = useState(false);

  const [phase, setPhase] = useState<QuizPhase>('playing');
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const queueRef = useRef<SongQueue | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [answer, setAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [replayActive, setReplayActive] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);
  const [score, setScore] = useState({ c: 0, t: 0 });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const onEnded = useCallback(() => {
    if (phaseRef.current === 'playing') {
      setPhase('answering');
    } else if (phaseRef.current !== 'result') {
      setReplayActive(false);
    }
  }, []);

  const { ready, play, stop } = useYouTubePlayer(onEnded);

  const nextSong = useCallback(
    (diff: Difficulty) => {
      const s = queueRef.current!.next();
      setSong(s);
      setAnswer('');
      setPhase('playing');
      setReplayActive(false);
      setInputLocked(true);
      setTimeout(() => setInputLocked(false), 600);
      play(s.video_id, 0, playSeconds(s, diff));
    },
    [play],
  );

  const handleStart = useCallback(() => {
    queueRef.current = createQueue(filteredSongs(tagFilter));
    setScore({ c: 0, t: 0 });
    setHistory([]);
    setStarted(true);
    nextSong(difficulty);
  }, [difficulty, tagFilter, nextSong]);

  const handleTagChange = useCallback((t: TagFilter) => {
    setTagFilter(t);
    if (started) {
      queueRef.current = createQueue(filteredSongs(t));
    }
  }, [started]);

  useEffect(() => {
    if (phase === 'answering') inputRef.current?.focus();
  }, [phase]);

  const autoPlayLong = useCallback((s: Song) => {
    setTimeout(() => {
      setReplayActive(true);
      play(s.video_id, 0, 20);
    }, 300);
  }, [play]);

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (phase === 'result' || !song) return;
      stop();
      const ok = judge(answer, song.title);
      setIsCorrect(ok);
      setScore((s) => ({ c: s.c + (ok ? 1 : 0), t: s.t + 1 }));
      setHistory((h) => [
        ...h,
        {
          title: song.title,
          artist: song.artist,
          thumbnailUrl: thumb(song.video_id),
          userAnswer: answer,
          correct: ok,
        },
      ]);
      setPhase('result');
      autoPlayLong(song);
    },
    [phase, song, answer, autoPlayLong, stop],
  );

  const handleGiveUp = useCallback(() => {
    if (!song || phase === 'result') return;
    stop();
    setIsCorrect(false);
    setScore((s) => ({ c: s.c, t: s.t + 1 }));
    setHistory((h) => [
      ...h,
      {
        title: song.title,
        artist: song.artist,
        thumbnailUrl: thumb(song.video_id),
        userAnswer: answer,
        correct: false,
      },
    ]);
    setPhase('result');
    autoPlayLong(song);
  }, [song, phase, answer, autoPlayLong, stop]);

  const handleReplay = useCallback(() => {
    if (!song) return;
    setReplayActive(true);
    play(song.video_id, 0, playSeconds(song, difficulty));
  }, [song, difficulty, play]);

  const handleLong = useCallback(() => {
    if (!song) return;
    setReplayActive(true);
    play(song.video_id, 0, 20);
  }, [song, play]);

  const handleNext = useCallback(() => {
    nextSong(difficulty);
  }, [difficulty, nextSong]);

  if (!started) {
    return (
      <div className="min-h-svh flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center relative">
            <div className="absolute right-4 top-4">
              <ThemeToggle dark={dark} onToggle={toggleTheme} />
            </div>
            <CardTitle className="text-2xl font-bold">蓮ノ空 イントロクイズ</CardTitle>
            <p className="text-sm text-muted-foreground">難易度を選んでスタート</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5">
            <DifficultySelector value={difficulty} onChange={setDifficulty} />
            {/* <TagSelector value={tagFilter} onChange={setTagFilter} /> */}
            <Button size="lg" onClick={handleStart} disabled={!ready || filteredSongs(tagFilter).length === 0} className="w-full">
              {ready ? 'スタート' : '読み込み中...'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-svh flex flex-col max-w-md mx-auto overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3 border-b sticky top-0 bg-background/80 backdrop-blur z-10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">蓮ノ空 イントロクイズ</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">{score.c}/{score.t}</span>
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
          </div>
        </div>
        <DifficultySelector value={difficulty} onChange={setDifficulty} />
        {/* <TagSelector value={tagFilter} onChange={handleTagChange} /> */}
      </header>

      {/* Status area (fixed height) */}
      <section className="px-4 py-4 border-b h-[160px] flex flex-col items-center justify-center gap-3 relative">
        {phase === 'playing' && (
          <>
            <span className="text-4xl animate-pulse">♪</span>
            <p className="text-sm text-muted-foreground">再生中...</p>
          </>
        )}

        {phase === 'answering' && (
          <p className="text-sm text-muted-foreground">曲名を入力してください</p>
        )}

        {phase === 'result' && song && (
          <>
            <Badge variant={isCorrect ? 'default' : 'destructive'} className="text-sm px-3 py-0.5">
              {isCorrect ? '正解！' : '不正解'}
            </Badge>
            <div className="flex items-center gap-3">
              <img src={thumb(song.video_id)} alt={song.title} className="w-20 h-15 object-cover rounded" />
              <div>
                <p className="font-bold">{song.title}</p>
                <p className="text-xs text-muted-foreground">{song.artist}</p>
                {!isCorrect && (
                  <p className="text-xs text-red-500 mt-1">あなた: {answer || '(未入力)'}</p>
                )}
              </div>
            </div>
            {replayActive && (
              <p className="absolute bottom-2 text-xs text-muted-foreground animate-pulse">♪ 再生中...</p>
            )}
          </>
        )}
      </section>

      {/* History (always expanded, scrolls independently) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        <HistoryPanel history={history} />
      </div>

      {/* Utility buttons (fixed) */}
      <div className="px-4 py-2 border-t flex gap-2 h-[44px] items-center">
        <Button
          variant="ghost"
          size="xs"
          onClick={handleReplay}
          disabled={phase === 'result' && replayActive}
        >
          もう一度再生
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={handleGiveUp}
          disabled={phase === 'result'}
        >
          ギブアップ
        </Button>
      </div>

      {/* Bottom action bar (fixed height) */}
      <div className="px-4 py-3 border-t bg-background h-[60px] flex items-center">
        {phase === 'result' ? (
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" onClick={handleLong} disabled={replayActive} className="flex-1">
              長めイントロ
            </Button>
            <Button size="sm" onClick={handleNext} className="flex-1">
              次へ
            </Button>
          </div>
        ) : (
          <form className="flex gap-2 w-full" onSubmit={handleSubmit}>
            <Input
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="曲名を入力..."
              autoComplete="off"
              disabled={inputLocked}
            />
            <Button type="submit" disabled={inputLocked}>
              回答
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
