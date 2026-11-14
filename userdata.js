// Pure helpers for what the app remembers about a user: where they left off, shared playlists and listening stats.

const clip = (s, n = 120) => String(s ?? '').slice(0, n);
const decode = (s) => String(s ?? '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

export const imageUrl = (img) => (Array.isArray(img) ? (img[img.length - 1]?.url || img[0]?.url) : img) || '';
export const artistIdOf = (s) => String(s?.artistId || s?.primaryArtistsId || s?.artists?.primary?.[0]?.id || '').split(',')[0].trim();
export const firstArtistName = (s) => decode(s?.primaryArtists || s?.subtitle || '').split(',')[0].trim();

// The fields worth keeping when a song is stored (queue, shared playlist): enough to play and display it.
export function trimSong(s) {
  return {
    id: String(s.id), name: s.name || s.title || '', primaryArtists: s.primaryArtists || s.subtitle || '', artistId: artistIdOf(s),
    image: Array.isArray(s.image) ? s.image.slice(-2) : s.image || '', downloadUrl: Array.isArray(s.downloadUrl) ? s.downloadUrl : [],
    duration: s.duration || 0, source: s.source || 'saavn',
  };
}

// ---------- Remembered queue and position ----------
const RKEY = (uid) => `void_resume_${uid}`;
const KEEP_BEFORE = 10, KEEP_TOTAL = 60;

export function saveResume(uid, st, store = globalThis.localStorage) {
  try {
    const { queue, qIndex } = st;
    if (!uid || !queue?.[qIndex]) return false;
    const start = Math.max(0, qIndex - KEEP_BEFORE);
    store.setItem(RKEY(uid), JSON.stringify({
      v: 1, queue: queue.slice(start, start + KEEP_TOTAL).map(trimSong), qIndex: qIndex - start,
      position: Math.max(0, Math.round((st.position || 0) * 10) / 10), repeatMode: st.repeatMode || 'none', isShuffle: !!st.isShuffle,
      volume: Number.isFinite(st.volume) ? st.volume : 1, savedAt: Date.now(),
    }));
    return true;
  } catch { return false; }
}

export function loadResume(uid, store = globalThis.localStorage) {
  try {
    const r = JSON.parse(store.getItem(RKEY(uid)) || 'null');
    if (!r || r.v !== 1 || !Array.isArray(r.queue) || !r.queue[r.qIndex]?.id) return null;
    const dur = +r.queue[r.qIndex].duration || 0;
    const position = dur && r.position > dur - 3 ? 0 : +r.position || 0; // finished already: start the track over
    return {
      ...r, position: Math.max(0, position), volume: Number.isFinite(r.volume) ? Math.min(1, Math.max(0, r.volume)) : 1,
      repeatMode: ['none', 'all', 'one'].includes(r.repeatMode) ? r.repeatMode : 'none', isShuffle: !!r.isShuffle,
    };
  } catch { return null; }
}

// ---------- Playlist sharing ----------
export const SHARE_MAX = 200;
export const parseShareHash = (hash) => /^#\/share\/([A-Za-z0-9_-]{8,64})$/.exec(hash || '')?.[1] || null;
export const shareUrl = (loc, id) => `${loc.origin}${loc.pathname}#/share/${id}`;
export const toShareDoc = (uid, name, songs, now = Date.now()) => ({ ownerUid: uid, name: clip(name, 80), songs: songs.slice(0, SHARE_MAX).map(trimSong), updatedAt: now });

// ---------- Listening stats ----------
const SONG_CAP = 150, ARTIST_CAP = 100;
export const statKey = (v) => String(v ?? '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60) || 'x';
const lowest = (map, keep) => {
  let k = null, n = Infinity;
  for (const [key, v] of Object.entries(map || {})) if (key !== keep && (v.n ?? 0) < n) { k = key; n = v.n ?? 0; }
  return k;
};
function entry(song) {
  const artist = firstArtistName(song), aid = artistIdOf(song);
  return { sk: statKey(song.id), ak: artist ? statKey(aid || artist.toLowerCase()) : null, aid, artist: clip(artist, 100), name: clip(decode(song.name || song.title), 100), image: clip(imageUrl(song.image), 300) };
}

// The stats object as it will look after one more play (used to update the screen straight away)
export function mergeStats(prev, song, sec, now = Date.now()) {
  const e = entry(song);
  const s = { plays: (prev?.plays || 0) + 1, seconds: (prev?.seconds || 0) + Math.round(sec), since: prev?.since || now, songs: { ...(prev?.songs || {}) }, artists: { ...(prev?.artists || {}) } };
  s.songs[e.sk] = { n: (s.songs[e.sk]?.n || 0) + 1, name: e.name, artist: e.artist, image: e.image };
  if (e.ak) s.artists[e.ak] = { n: (s.artists[e.ak]?.n || 0) + 1, name: e.artist, id: e.aid };
  if (Object.keys(s.songs).length > SONG_CAP) delete s.songs[lowest(s.songs, e.sk)];
  if (e.ak && Object.keys(s.artists).length > ARTIST_CAP) delete s.artists[lowest(s.artists, e.ak)];
  return s;
}

// The same change as a Firestore dotted-path update (increments are atomic), pruning the least-played entry when full
export function statsUpdate(prev, song, sec, fv, now = Date.now()) {
  const e = entry(song);
  const u = { 'stats.plays': fv.increment(1), 'stats.seconds': fv.increment(Math.round(sec)) };
  if (!prev?.since) u['stats.since'] = now;
  u[`stats.songs.${e.sk}.n`] = fv.increment(1); u[`stats.songs.${e.sk}.name`] = e.name; u[`stats.songs.${e.sk}.artist`] = e.artist; u[`stats.songs.${e.sk}.image`] = e.image;
  if (e.ak) { u[`stats.artists.${e.ak}.n`] = fv.increment(1); u[`stats.artists.${e.ak}.name`] = e.artist; u[`stats.artists.${e.ak}.id`] = e.aid; }
  const songs = prev?.songs || {}, artists = prev?.artists || {};
  if (!(e.sk in songs) && Object.keys(songs).length >= SONG_CAP) u[`stats.songs.${lowest(songs, e.sk)}`] = fv.deleteField();
  if (e.ak && !(e.ak in artists) && Object.keys(artists).length >= ARTIST_CAP) u[`stats.artists.${lowest(artists, e.ak)}`] = fv.deleteField();
  return u;
}

export const topOf = (map, n = 5) => Object.entries(map || {}).map(([key, v]) => ({ key, ...v })).sort((a, b) => (b.n || 0) - (a.n || 0)).slice(0, n);
export const fmtDuration = (sec) => { const m = Math.round((sec || 0) / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };
