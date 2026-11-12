// Data sources (unchanged from the original App.jsx): JioSaavn, Apple Music, SoundCloud, Qobuz, YouTube.
export const API_BASE = "https://jio-codesudo.vercel.app/api";

// --- MULTI-SOURCE API ENGINE ---
export const APIs = {
  saavn: {
    name: 'JioSaavn',
    search: async (query) => {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      return (data.data?.results || []).map(item => ({
        id: item.id,
        name: item.name,
        primaryArtists: item.primaryArtists,
        image: item.image,
        downloadUrl: item.downloadUrl,
        duration: item.duration,
        source: 'saavn'
      }));
    }
  },
  itunes: {
    name: 'Apple Music',
    search: async (query) => {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`);
      const data = await res.json();
      return (data.results || []).map(item => ({
        id: String(item.trackId),
        name: item.trackName,
        primaryArtists: item.artistName,
        image: [{ url: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '500x500bb') : "" }],
        downloadUrl: [{ url: item.previewUrl, quality: '320kbps' }],
        duration: Math.floor((item.trackTimeMillis || 0) / 1000),
        source: 'itunes'
      }));
    }
  },
  soundcloud: {
    name: 'SoundCloud',
    token: null, 
    clientId: import.meta.env.VITE_SOUNDCLOUD_CLIENT_ID,         
    clientSecret: import.meta.env.VITE_SOUNDCLOUD_CLIENT_SECRET, 
    
    auth: async function() {
      if (this.token) return this.token; 
      const res = await fetch('https://api.soundcloud.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret
        })
      });
      const data = await res.json();
      this.token = data.access_token;
      return this.token;
    },

    search: async function(query) {
      const token = await this.auth();
      const res = await fetch(`https://api.soundcloud.com/tracks?q=${encodeURIComponent(query)}&limit=25`, {
        headers: { 'Authorization': `OAuth ${token}` }
      });
      const data = await res.json();
      
      return (data || []).filter(item => item.streamable).map(item => ({
        id: item.id,
        name: item.title,
        primaryArtists: item.user?.username || "Unknown Artist",
        image: [{ url: item.artwork_url ? item.artwork_url.replace('large', 't500x500') : "https://via.placeholder.com/150" }],
        duration: Math.floor(item.duration / 1000),
        source: 'soundcloud'
      }));
    },
    
    getStreamUrl: async function(id) {
      const token = await this.auth();
      const res = await fetch(`https://api.soundcloud.com/tracks/${id}/stream`, {
        headers: { 'Authorization': `OAuth ${token}` }
      });
      return res.url; 
    }
  },
  qobuz: {
    name: 'Qobuz',
    userId: import.meta.env.VITE_QOBUZ_USER_ID, 
    token: import.meta.env.VITE_QOBUZ_TOKEN,  
    
    search: async function(query) {
      const res = await fetch(`https://www.qobuz.com/api.json/0.2/catalog/search?query=${encodeURIComponent(query)}&limit=25`, {
        headers: {
          'X-User-Auth-Token': this.token,
          'X-User-Id': this.userId 
        }
      });
      const data = await res.json();
      
      return (data.tracks?.items || []).map(item => ({
        id: String(item.id),
        name: item.title,
        primaryArtists: item.performer?.name || "Unknown Artist",
        image: [{ url: item.album?.image?.large || "https://via.placeholder.com/150" }],
        downloadUrl: [{ url: item.previewUrl, quality: '320kbps' }], 
        duration: item.duration || 0,
        source: 'qobuz'
      }));
    }
  },
  // --- REVERTED YOUTUBE INTEGRATION (Works perfectly with your current backend) ---
  youtube: {
    name: 'YouTube',
    apiBase: import.meta.env.VITE_YT_API_BASE || 'http://localhost:3000',
    
    search: async function(query) {
      try {
          const cleanBase = this.apiBase.replace(/\/$/, '');
          const res = await fetch(`${cleanBase}/api/stream?query=${encodeURIComponent(query)}`);
          if (!res.ok) return [];
          const data = await res.json();
          
          return (Array.isArray(data) ? data : []).map(item => {
              let highResImage = "https://via.placeholder.com/150";
              if (item.thumbnails && item.thumbnails.length > 0) {
                 highResImage = item.thumbnails[item.thumbnails.length - 1].url;
                 highResImage = highResImage.replace(/=w\d+-h\d+.*/, '=w500-h500-l90-rj');
              }
              return {
                  id: item.videoId,
                  name: item.name || item.title,
                  primaryArtists: item.artists?.[0]?.name || "YouTube Artist",
                  image: [{ url: highResImage }],
                  duration: item.duration || 0,
                  source: 'youtube'
              };
          });
      } catch (err) {
          console.error("YouTube Search Failed:", err);
          return [];
      }
    }
  }
};

export const MOODS = [
  { id: 'm1', name: 'Party', color: '#e57373', query: 'Party Hits' },
  { id: 'm2', name: 'Romance', color: '#f06292', query: 'Love Songs' },
  { id: 'm3', name: 'Sad', color: '#ba68c8', query: 'Sad Songs' },
  { id: 'm4', name: 'Workout', color: '#ffb74d', query: 'Gym Motivation' },
  { id: 'm5', name: 'Chill', color: '#4db6ac', query: 'Chill Lo-Fi' },
  { id: 'm6', name: 'Retro', color: '#7986cb', query: 'Retro Classics' },
];

// ---------- JioSaavn home feed (webapi.getLaunchData) ----------
// Dev: Vite proxies /saavn-launch to jiosaavn.com (see vite.config.js). Production: set VITE_HOME_API to api/home.js once deployed.
const HOME_URL = import.meta.env.VITE_HOME_API || (import.meta.env.DEV ? '/saavn-launch' : '');
const SKIP = new Set(['modules', 'history', 'greeting', 'discover', 'browse_discover']);
const nice = (k) => (k.startsWith('promo') ? 'Featured' : k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()));

const toItem = (x) => {
  if (!x || typeof x !== 'object' || !x.id || !(x.title || x.name)) return null;
  const title = x.title || x.name;
  return {
    id: String(x.id), type: x.type || 'playlist', name: title, title, subtitle: x.subtitle || x.header_desc || '',
    image: [{ quality: '500x500', url: String(x.image || '').replace(/\d+x\d+(?=\.\w+$)/, '500x500') }],
    language: x.language, year: x.year,
  };
};

// Turns the raw launch data into [{ id, title, subtitle, position, items }] in JioSaavn's own section order.
export const normalizeLaunch = (json) => {
  const raw = json?.data && !json.modules ? json.data : json || {};
  const meta = raw.modules || {};
  return Object.entries(raw)
    .filter(([k, v]) => !SKIP.has(k) && Array.isArray(v) && v.length)
    .map(([k, v]) => ({ id: k, title: meta[k]?.title || nice(k), subtitle: meta[k]?.subtitle || '', position: meta[k]?.position ?? 99, items: v.map(toItem).filter(Boolean) }))
    .filter((sec) => sec.items.length)
    .sort((a, b) => a.position - b.position);
};

// Returns { sections, error }. `error` is a short, readable reason whenever the live feed couldn't be used.
export async function fetchLaunch(langs = ['hindi', 'english']) {
  if (!HOME_URL) return { sections: [], error: 'VITE_HOME_API isn’t set in this build. Vite bakes it in at build time, so restart the dev server or redeploy after adding it.' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(`${HOME_URL}${HOME_URL.includes('?') ? '&' : '?'}languages=${encodeURIComponent(langs.join(','))}`, { signal: ctrl.signal });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body) {
      const hint = res.status === 401 || res.status === 403 ? ' Vercel deployment protection may be blocking it.' : res.status === 404 ? ' The URL should end in /api/home.' : '';
      return { sections: [], error: body?.error || `The proxy answered HTTP ${res.status}${body ? '' : ' without JSON'}.${hint}` };
    }
    const sections = normalizeLaunch(body);
    const keys = Object.keys(body?.data || body).slice(0, 8).join(', ') || 'none';
    return { sections, error: sections.length ? '' : `The feed loaded but had no sections I recognise (keys: ${keys}).` };
  } catch (e) {
    return { sections: [], error: e.name === 'AbortError' ? 'The proxy took too long to answer.' : `Couldn’t reach the proxy (${e.message}).` };
  } finally { clearTimeout(timer); }
}

// Home-feed songs carry no stream URL, so look the song up (by id, then by title) to get a playable one.
export async function resolveSong(it) {
  try {
    const r = await fetch(`${API_BASE}/songs?id=${encodeURIComponent(it.id)}`).then((x) => x.json());
    const d = Array.isArray(r?.data) ? r.data[0] : r?.data?.songs?.[0] || r?.data;
    if (d?.downloadUrl?.length) return { id: String(d.id), name: d.name, primaryArtists: d.primaryArtists, image: d.image, downloadUrl: d.downloadUrl, duration: d.duration, source: 'saavn' };
  } catch { /* fall through to search */ }
  const found = await APIs.saavn.search(`${it.name} ${(it.subtitle || '').split(' - ')[0]}`);
  return found.find((x) => String(x.id) === it.id) || found[0] || null;
}

// fetch + parse JSON, resolving to {} on any failure or after `ms`, so one slow endpoint can never stall a screen.
export const fetchJson = (url, ms = 8000) => fetch(url, { signal: AbortSignal.timeout(ms) }).then((r) => r.json()).catch(() => ({}));
