import { useState, useEffect, useRef, useCallback } from 'react';
import { useYouTubePlayer } from './hooks/useYouTubePlayer';
import { judge } from './utils/judge';
import { createQueue } from './utils/queue';
import songs from './songs.json';

const DIFFICULTY_OFFSET = { normal: 10, hard: 5, expert: 1, monster: 0 };
const DIFFICULTIES = ['normal', 'hard', 'expert', 'monster'];

function playSeconds(song, diff) {
  return song.intro_seconds + DIFFICULTY_OFFSET[diff];
}

function thumb(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// --- Sub-components ---

function DifficultySelector({ value, onChange }) {
  return (
    <div className="diff-selector">
      {DIFFICULTIES.map((d) => (
        <button
          key={d}
          className={`diff-btn diff-${d}${value === d ? ' active' : ''}`}
          onClick={() => onChange(d)}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

function ScoreBoard({ correct, total }) {
  return (
    <div className="scoreboard">
      <span className="score-num">{correct}</span>
      <span className="score-sep"> / </span>
      <span className="score-num">{total}</span>
    </div>
  );
}

function HistoryPanel({ history }) {
  const [open, setOpen] = useState(false);
  if (!history.length) return null;
  return (
    <div className="history-panel">
      <button className="history-toggle" onClick={() => setOpen((o) => !o)}>
        履歴 ({history.length}) {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="history-list">
          {[...history].reverse().map((item, i) => (
            <div key={i} className={`history-item ${item.correct ? 'h-correct' : 'h-wrong'}`}>
              <img src={item.thumbnailUrl} alt="" className="h-thumb" />
              <div className="h-info">
                <div className="h-title">{item.title}</div>
                <div className="h-answer">{item.userAnswer || '(未回答)'}</div>
              </div>
              <span className="h-mark">{item.correct ? '○' : '×'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [difficulty, setDifficulty] = useState('expert');
  const [started, setStarted] = useState(false);

  // Quiz phase: 'playing' | 'answering' | 'result'
  const [phase, setPhase] = useState('playing');
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const queueRef = useRef(null);
  const [song, setSong] = useState(null);
  const [answer, setAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [replayActive, setReplayActive] = useState(false);
  const [score, setScore] = useState({ c: 0, t: 0 });
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);

  const onEnded = useCallback(() => {
    if (phaseRef.current === 'playing') {
      setPhase('answering');
    } else {
      // result phase replay finished
      setReplayActive(false);
    }
  }, []);

  const { ready, play } = useYouTubePlayer(onEnded);

  const nextSong = useCallback(
    (diff) => {
      const s = queueRef.current.next();
      setSong(s);
      setAnswer('');
      setPhase('playing');
      setReplayActive(false);
      play(s.video_id, 0, playSeconds(s, diff));
    },
    [play],
  );

  const handleStart = useCallback(() => {
    queueRef.current = createQueue(songs);
    setScore({ c: 0, t: 0 });
    setHistory([]);
    setStarted(true);
    nextSong(difficulty);
  }, [difficulty, nextSong]);

  useEffect(() => {
    if (phase === 'answering') inputRef.current?.focus();
  }, [phase]);

  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault();
      if (phase !== 'answering' || !song) return;
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
    },
    [phase, song, answer],
  );

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

  // --- Start screen ---
  if (!started) {
    return (
      <div className="app">
        <div className="start-screen">
          <h1 className="app-title">
            蓮ノ空<br />イントロクイズ
          </h1>
          <p className="subtitle">難易度を選んでスタート</p>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
          <button className="start-btn" onClick={handleStart} disabled={!ready}>
            {ready ? 'スタート' : '読み込み中...'}
          </button>
        </div>
      </div>
    );
  }

  // --- Quiz screen ---
  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">蓮ノ空 イントロクイズ</span>
        <ScoreBoard correct={score.c} total={score.t} />
      </header>

      <main className="app-main">
        <DifficultySelector value={difficulty} onChange={setDifficulty} />

        {phase === 'playing' && (
          <div className="phase-playing">
            <div className="music-icon">♪</div>
            <p className="playing-text">再生中...</p>
          </div>
        )}

        {phase === 'answering' && (
          <form className="phase-answering" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="answer-input"
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="曲名を入力..."
              autoComplete="off"
            />
            <button type="submit" className="btn-primary">
              回答する
            </button>
          </form>
        )}

        {phase === 'result' && song && (
          <div className="phase-result">
            <div className={`result-badge ${isCorrect ? 'badge-correct' : 'badge-wrong'}`}>
              {isCorrect ? '正解！' : '不正解'}
            </div>
            <img src={thumb(song.video_id)} alt={song.title} className="result-thumb" />
            <p className="result-title">{song.title}</p>
            <p className="result-artist">{song.artist}</p>
            {!isCorrect && (
              <p className="result-yours">あなた: {answer || '(未入力)'}</p>
            )}
            {replayActive && <p className="replay-indicator">♪ 再生中...</p>}
            <div className="result-actions">
              <button className="btn-secondary" onClick={handleReplay} disabled={replayActive}>
                もう一度流す
              </button>
              <button className="btn-secondary" onClick={handleLong} disabled={replayActive}>
                長めイントロ
              </button>
              <button className="btn-primary" onClick={handleNext}>
                次へ →
              </button>
            </div>
          </div>
        )}
      </main>

      <HistoryPanel history={history} />
    </div>
  );
}
