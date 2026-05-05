function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createQueue(songs) {
  let q = shuffle(songs);
  let lastVideoId = null;

  return {
    next() {
      if (q.length === 0) {
        let next = shuffle(songs);
        // Avoid repeating the same song across the shuffle boundary
        if (next.length > 1 && next[0].video_id === lastVideoId) {
          next = [...next.slice(1), next[0]];
        }
        q = next;
      }
      const song = q.shift();
      lastVideoId = song.video_id;
      return song;
    },
  };
}
