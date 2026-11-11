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
