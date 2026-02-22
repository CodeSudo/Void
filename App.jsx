import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import toast, { Toaster } from 'react-hot-toast';

// --- ICONS ---
const Icons = {
  Home: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  Search: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Library: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  Profile: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Play: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Pause: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  SkipFwd: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>,
  SkipBack: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>,
  Plus: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  List: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Mic: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  Heart: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Trash: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Shuffle: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>,
  Repeat: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  RepeatOne: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="10" y="15" fontSize="8" fill="currentColor" style={{fontWeight:'bold'}}>1</text></svg>,
  Radio: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>,
  Back: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
};

// FIREBASE
import { auth, db } from './firebase'; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, onSnapshot, query } from 'firebase/firestore';

const API_BASE = "https://jio-codesudo.vercel.app/api";

// --- MULTI-SOURCE API ENGINE ---
const APIs = {
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
  // --- NEW: YOUTUBE INTEGRATION (Powered by your Next.js Backend) ---
  youtube: {
    name: 'YouTube',
    // Fallback locally, but point Vercel ENV to your deployed Next.js service!
    apiBase: import.meta.env.VITE_YT_API_BASE || 'http://localhost:3000',
    
    search: async function(query) {
      // Hitting the ytmusic-api search endpoint you created
      const res = await fetch(`${this.apiBase}/api/stream?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      return (Array.isArray(data) ? data : []).map(item => ({
        id: item.videoId,
        name: item.name || item.title,
        primaryArtists: item.artists?.[0]?.name || "YouTube Artist",
        image: [{ url: item.thumbnails?.[0]?.url || "https://via.placeholder.com/150" }],
        duration: item.duration || 0,
        source: 'youtube'
      }));
    }
  }
};

const MOODS = [
  { id: 'm1', name: 'Party', color: '#e57373', query: 'Party Hits' },
  { id: 'm2', name: 'Romance', color: '#f06292', query: 'Love Songs' },
  { id: 'm3', name: 'Sad', color: '#ba68c8', query: 'Sad Songs' },
  { id: 'm4', name: 'Workout', color: '#ffb74d', query: 'Gym Motivation' },
  { id: 'm5', name: 'Chill', color: '#4db6ac', query: 'Chill Lo-Fi' },
  { id: 'm6', name: 'Retro', color: '#7986cb', query: 'Retro Classics' },
];

function App() {
  const [view, setView] = useState('loading');
  const [tab, setTab] = useState('home');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  
  // Source State
  const [source, setSource] = useState('saavn');
  
  // Data
  const [likedSongs, setLikedSongs] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [resSongs, setResSongs] = useState([]);
  const [resAlbums, setResAlbums] = useState([]);
  const [resArtists, setResArtists] = useState([]);
  const [resPlaylists, setResPlaylists] = useState([]);
  const [moodPlaylists, setMoodPlaylists] = useState([]);

  const [homeData, setHomeData] = useState({ 
    trending: [], charts: [], newAlbums: [], playlists: [] 
  });
  
  // Details & Modals
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailsSongs, setDetailsSongs] = useState([]);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsText, setLyricsText] = useState("");
  const [showQueue, setShowQueue] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [songToAdd, setSongToAdd] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  
  // Auth
  const [authMode, setAuthMode] = useState('login');
  const [authInput, setAuthInput] = useState({ email: '', password: '' });

  // Standard HTML5 Player Refs
  const audioRef = useRef(new Audio());
  
  // --- NEW: YOUTUBE IFRAME PLAYER REFS ---
  const ytPlayerRef = useRef(null);
  const watchdogRef = useRef(null);
  const ytProgressInterval = useRef(null);
  const [ytReady, setYtReady] = useState(false);

  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [qIndex, setQIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [quality, setQuality] = useState('320kbps');
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); 

  // Store current playing song ID for the YT Error callback
  const currentSongRef = useRef(null);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);

  // Helpers
  const getImg = (i) => { if(Array.isArray(i)) return i[i.length-1]?.url || i[0]?.url; return i || "https://via.placeholder.com/150"; }
  const getName = (i) => i?.name || i?.title || "Unknown";
  const getDesc = (i) => i?.primaryArtists || i?.subtitle || i?.year || "";
  const isLiked = (id) => likedSongs.some(s => String(s.id) === String(id));
  
  const formatTime = (s) => {
    if(isNaN(s)) return "0:00";
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec < 10 ? '0'+sec : sec}`;
  };

  const addToHistory = (song) => {
    const prev = JSON.parse(localStorage.getItem('musiq_history') || '[]');
    const newHist = [song, ...prev.filter(s => String(s.id) !== String(song.id))].slice(0, 15);
    localStorage.setItem('musiq_history', JSON.stringify(newHist));
    setHistory(newHist);
    if(user) {
        updateDoc(doc(db, "users", user.uid), { history: newHist }).catch(()=>{});
    }
  };

  useEffect(() => { setHistory(JSON.parse(localStorage.getItem('musiq_history') || '[]')); }, []);

  // --- YOUTUBE IFRAME INITIALIZATION (Your Logic) ---
  const initYTPlayer = (videoId = '') => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
      try { ytPlayerRef.current.destroy(); } catch (e) {}
    }

    ytPlayerRef.current = new window.YT.Player('hidden-yt-player', {
      height: '0',
      width: '0',
      videoId: videoId,
      playerVars: { 'autoplay': 1, 'controls': 0, 'origin': window.location.origin },
      events: {
        'onReady': (event) => {
          setYtReady(true);
          if (videoId) event.target.playVideo();
        },
        'onStateChange': (event) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            clearTimeout(watchdogRef.current);
            setIsPlaying(true);
          }
          if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          }
          if (event.data === window.YT.PlayerState.ENDED) {
            onTrackEndRef.current(); // Triggers the next track
          }
        },
        'onError': () => {
          console.warn("YT Player Error - Attempting Reset...");
          if (currentSongRef.current?.id) initYTPlayer(currentSongRef.current.id);
        }
      }
    });
  };

  // Inject YouTube API Script
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => initYTPlayer();
    } else {
      initYTPlayer();
    }
  }, []);


  const fetchHome = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/modules?language=hindi,english,punjabi`);
      const response = await res.json();
      
      if (response.data) {
        const liveData = response.data;
        setHomeData({ 
          trending: liveData.trending?.albums || liveData.trending?.songs || liveData.trending || [], 
          charts: liveData.charts || [], 
          newAlbums: liveData.albums || [], 
          playlists: liveData.playlists || [],
        });
      }
    } catch(e) { console.error("Home Data Fetch Error:", e); } 
    finally { setLoading(false); }
  };

  const doSearch = async () => {
    if(!searchQuery) return;
    setLoading(true); setTab('search');
    
    setResSongs([]); setResAlbums([]); setResArtists([]); setResPlaylists([]);
    
    try {
      if (source === 'saavn') {
          const [s, a, ar, p] = await Promise.all([
            fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}`).then(r=>r.json()),
            fetch(`${API_BASE}/search/albums?query=${encodeURIComponent(searchQuery)}`).then(r=>r.json()),
            fetch(`${API_BASE}/search/artists?query=${encodeURIComponent(searchQuery)}`).then(r=>r.json()),
            fetch(`${API_BASE}/search/playlists?query=${encodeURIComponent(searchQuery)}`).then(r=>r.json())
          ]);
          setResSongs(s?.data?.results || []); setResAlbums(a?.data?.results || []); setResArtists(ar?.data?.results || []); setResPlaylists(p?.data?.results || []);
      } else {
          // Dynamic API router hits YouTube, Apple Music, SoundCloud, or Qobuz
          const songs = await APIs[source].search(searchQuery);
          setResSongs(songs);
      }
    } catch(e) { 
        console.error(e); 
        toast.error("Search failed");
    } finally { 
        setLoading(false); 
    }
  };

  const fetchLyrics = async () => {
    if(!currentSong) return;
    if(currentSong.source && currentSong.source !== 'saavn') {
        toast('Lyrics are only available for JioSaavn tracks');
        return;
    }
    if(showLyrics) { setShowLyrics(false); return; }
    const toastId = toast.loading("Fetching lyrics...");
    try {
        const res = await fetch(`${API_BASE}/lyrics?id=${currentSong.id}`);
        const data = await res.json();
        if(data.success && data.data?.lyrics) {
            setLyricsText(data.data.lyrics.replace(/<br>/g, "\n"));
            setShowLyrics(true);
            toast.success("Lyrics loaded", { id: toastId });
        } else { toast.error("Lyrics not available", { id: toastId }); }
    } catch(e) { toast.error("Error loading lyrics", { id: toastId }); }
  };

  // --- HYBRID PLAYER LOGIC ---
  const playSong = async (list, idx) => {
    if(!list || !list[idx]) return;
    setQueue(list); setQIndex(idx);
    const s = list[idx];
    setCurrentSong(s);
    addToHistory(s);

    // 1. YouTube Routing (Using your specific Iframe & Watchdog logic)
    if (s.source === 'youtube') {
      audioRef.current.pause(); // Ensure HTML5 player stops
      
      clearTimeout(watchdogRef.current);
      watchdogRef.current = setTimeout(() => {
        console.warn("YouTube Freeze detected. Re-initializing player...");
        initYTPlayer(s.id);
      }, 3000);

      if (ytReady && ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        ytPlayerRef.current.loadVideoById(s.id);
        ytPlayerRef.current.playVideo();
      } else {
        initYTPlayer(s.id);
      }
      return; 
    }
    
    // 2. Stop YouTube if playing standard audio
    if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
      ytPlayerRef.current.pauseVideo();
    }
    
    // 3. Resolve standard Streams (SoundCloud, Saavn, Qobuz)
    let url = "";

    if (s.source === 'soundcloud') {
        const toastId = toast.loading("Loading SoundCloud Stream...");
        try {
            url = await APIs.soundcloud.getStreamUrl(s.id);
            toast.dismiss(toastId);
            if (!url) throw new Error("No stream found");
        } catch (e) {
            toast.dismiss(toastId);
            toast.error("Stream blocked by artist.");
            return;
        }
    } 
    else if (s.downloadUrl && Array.isArray(s.downloadUrl)) {
        const urlObj = s.downloadUrl.find(u => u.quality === quality);
        url = urlObj ? urlObj.url : (s.downloadUrl[s.downloadUrl.length-1]?.url || s.downloadUrl[0]?.url);
    }

    if(url) {
        if(audioRef.current.src !== url) {
            audioRef.current.src = url;
            audioRef.current.volume = volume;
            audioRef.current.play().catch(()=>{});
            setIsPlaying(true);
        } else { audioRef.current.play(); setIsPlaying(true); }
    } else toast.error("Audio unavailable");
  };

  const handleQualityChange = (newQ) => {
    setQuality(newQ);
    if(currentSong && isPlaying) {
        playSong(queue, qIndex); 
        toast.success(`Quality set to ${newQ}`);
    }
  };

  const togglePlay = () => {
    if (currentSong?.source === 'youtube') {
      if (isPlaying) ytPlayerRef.current?.pauseVideo();
      else ytPlayerRef.current?.playVideo();
    } else {
      if (audioRef.current.paused) { audioRef.current.play(); setIsPlaying(true); }
      else { audioRef.current.pause(); setIsPlaying(false); }
    }
  };

  const handleSeek = (e) => {
    const w = e.currentTarget.clientWidth;
    const x = e.nativeEvent.offsetX;
    const seekTo = (x / w) * duration;
    
    if (currentSong?.source === 'youtube') {
      ytPlayerRef.current?.seekTo(seekTo, true);
    } else {
      audioRef.current.currentTime = seekTo;
    }
    setProgress(seekTo);
  };

  const toggleRepeat = () => {
    setRepeatMode(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none');
    toast(repeatMode === 'none' ? 'Repeat All' : repeatMode === 'all' ? 'Repeat One' : 'Repeat Off');
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
    toast(!isShuffle ? 'Shuffle On' : 'Shuffle Off');
  };

  const removeFromQueue = (idx) => {
    const newQueue = queue.filter((_, i) => i !== idx);
    setQueue(newQueue);
    if(idx < qIndex) setQIndex(qIndex - 1);
    if(idx === qIndex) {
        if(newQueue.length > 0) playSong(newQueue, idx < newQueue.length ? idx : 0);
        else { 
          audioRef.current.pause(); 
          if(ytPlayerRef.current) ytPlayerRef.current.pauseVideo();
          setCurrentSong(null); setIsPlaying(false); 
        }
    }
  };

  // --- PLAYLIST & LIKE ---
  const toggleLike = async (item) => {
    if(!user) return toast.error("Please Login");
    const liked = isLiked(item.id);
    const userRef = doc(db, "users", user.uid);
    if(liked) {
        const toRemove = likedSongs.find(s=>String(s.id)===String(item.id));
        if(toRemove) {
            setLikedSongs(likedSongs.filter(s=>String(s.id)!==String(item.id)));
            await updateDoc(userRef, { likedSongs: arrayRemove(toRemove) });
            toast("Removed from Library", { icon: '💔' });
        }
    } else {
        const clean = { 
            id: String(item.id), 
            name: getName(item), 
            primaryArtists: getDesc(item), 
            image: item.image||[], 
            downloadUrl: item.downloadUrl||[], 
            duration: item.duration||0,
            source: item.source || 'saavn'
        };
        setLikedSongs([...likedSongs, clean]);
        await updateDoc(userRef, { likedSongs: arrayUnion(clean) });
        toast.success("Added to Library");
    }
  };

  const createPlaylist = async () => {
    if(!newPlaylistName.trim()) return;
    try {
        const ref = collection(db, `users/${user.uid}/playlists`);
        await addDoc(ref, { name: newPlaylistName, songs: [] });
        setNewPlaylistName(""); setShowPlaylistModal(false); toast.success("Playlist Created");
    } catch(e) { toast.error("Failed"); }
  };

  const addToPlaylist = async (playlistId) => {
    if(!songToAdd) return;
    try {
        const ref = doc(db, `users/${user.uid}/playlists/${playlistId}`);
        const clean = { 
            id: String(songToAdd.id), 
            name: getName(songToAdd), 
            primaryArtists: getDesc(songToAdd), 
            image: songToAdd.image||[], 
            downloadUrl: songToAdd.downloadUrl||[],
            source: songToAdd.source || 'saavn'
        };
        await updateDoc(ref, { songs: arrayUnion(clean) });
        toast.success("Added to Playlist"); setShowAddToPlaylistModal(false);
    } catch(e) { toast.error("Failed"); }
  };

  // --- NAVIGATION ---
  const handleCardClick = async (item, type) => {
    const itemType = type || item.type;
    if (itemType === 'song') { playSong([item], 0); }
    else if (itemType === 'playlist_custom') { setSelectedItem(item); setTab('details'); setDetailsSongs(item.songs || []); }
    else if (itemType === 'mood') {
        setLoading(true); setTab('mood'); setSelectedItem(item);
        try {
            const res = await fetch(`${API_BASE}/search/playlists?query=${encodeURIComponent(item.query)}`).then(r=>r.json());
            setMoodPlaylists(res?.data?.results || []);
        } catch(e) { console.error(e); } finally { setLoading(false); }
    }
    else {
      setSelectedItem(item); setTab('details'); setLoading(true); setDetailsSongs([]);
      try {
        let endpoint = itemType === 'album' ? `${API_BASE}/albums?id=${item.id}` : itemType === 'artist' ? `${API_BASE}/artists?id=${item.id}` : `${API_BASE}/playlists?id=${item.id}`;
        const res = await fetch(endpoint).then(r=>r.json());
        if(res.success) setDetailsSongs(res.data.songs || res.data.topSongs || []);
      } catch(e) { console.error(e); } finally { setLoading(false); }
    }
  };

  // --- AUTH & EFFECTS ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
        if(u) {
            setUser(u); setView('app'); fetchHome();
            try {
                const userSnap = await getDoc(doc(db, "users", u.uid));
                if(userSnap.exists()) {
                    const data = userSnap.data();
                    setLikedSongs(data.likedSongs || []);
                    setHistory(data.history || []);
                }
                else await setDoc(doc(db, "users", u.uid), { email: u.email, likedSongs: [], history: [] });
                const q = query(collection(db, `users/${u.uid}/playlists`));
                onSnapshot(q, (snapshot) => setUserPlaylists(snapshot.docs.map(d => ({id: d.id, ...d.data()}))));
            } catch {}
        } else { 
            setUser(null); setView('auth'); 
            setHistory(JSON.parse(localStorage.getItem('musiq_history') || '[]'));
        }
    });
    return () => unsub();
  }, []);

  const handleAuth = async () => {
    const toastId = toast.loading("Authenticating...");
    try {
        if(authMode==='signup') {
            const c = await createUserWithEmailAndPassword(auth, authInput.email, authInput.password);
            await setDoc(doc(db, "users", c.user.uid), { email: authInput.email, likedSongs: [] });
        } else { await signInWithEmailAndPassword(auth, authInput.email, authInput.password); }
        toast.success("Welcome!", { id: toastId });
    } catch(e) { toast.error(e.message, { id: toastId }); }
  };

  // Safe Track Progression Callback
  const onTrackEndRef = useRef(() => {});
  useEffect(() => {
    onTrackEndRef.current = () => {
      if(repeatMode === 'one') { 
        if(currentSong?.source === 'youtube') ytPlayerRef.current?.seekTo(0);
        else { audioRef.current.currentTime = 0; audioRef.current.play(); }
      }
      else if(isShuffle) { playSong(queue, Math.floor(Math.random() * queue.length)); }
      else if(qIndex < queue.length - 1) { playSong(queue, qIndex + 1); }
      else if(repeatMode === 'all') { playSong(queue, 0); }
      else { setIsPlaying(false); }
    };
  }, [queue, qIndex, repeatMode, isShuffle, currentSong]);

  // HTML5 Audio Time & End Listeners
  useEffect(() => {
    const a = audioRef.current;
    const updateTime = () => { setProgress(a.currentTime); setDuration(a.duration||0); };
    const handleEnd = () => onTrackEndRef.current();
    
    a.addEventListener('timeupdate', updateTime); 
    a.addEventListener('ended', handleEnd);
    return () => { a.removeEventListener('timeupdate', updateTime); a.removeEventListener('ended', handleEnd); };
  }, []);

  // YouTube Iframe Progress Tracking
  useEffect(() => {
    if (isPlaying && currentSong?.source === 'youtube') {
      ytProgressInterval.current = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          setProgress(ytPlayerRef.current.getCurrentTime());
          setDuration(ytPlayerRef.current.getDuration() || 0);
        }
      }, 1000);
    } else {
      clearInterval(ytProgressInterval.current);
    }
    return () => clearInterval(ytProgressInterval.current);
  }, [isPlaying, currentSong]);

  // MediaSession & Keyboard Controls
  useEffect(() => {
    const handleKey = (e) => {
        if(e.target.tagName==='INPUT') return;
        if(e.code==='Space') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPlaying, currentSong]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: getName(currentSong), artist: getDesc(currentSong),
        artwork: [{ src: getImg(currentSong.image), sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play', togglePlay);
      navigator.mediaSession.setActionHandler('pause', togglePlay);
      navigator.mediaSession.setActionHandler('previoustrack', () => playSong(queue, qIndex - 1));
      navigator.mediaSession.setActionHandler('nexttrack', () => playSong(queue, qIndex + 1));
    }
  }, [currentSong, isPlaying, queue, qIndex]);

  useEffect(() => { document.title = currentSong ? `${getName(currentSong)} • Void` : "Void Music"; }, [currentSong]);

  if(view==='loading') return <div style={{height:'100vh',background:'black',display:'flex',justifyContent:'center',alignItems:'center',color:'white'}}>Loading...</div>;

  if(view==='auth') return (
    <div className="auth-container">
        <Toaster/>
        <div className="auth-box">
            <h1 className="brand">Void.</h1>
            <input className="auth-input" placeholder="Email" onChange={e=>setAuthInput({...authInput,email:e.target.value})}/>
            <input className="auth-input" type="password" placeholder="Password" onChange={e=>setAuthInput({...authInput,password:e.target.value})}/>
            <button className="auth-btn" onClick={handleAuth}>{authMode==='login'?'Sign In':'Sign Up'}</button>
            <p style={{color:'#666', marginTop:20, cursor:'pointer'}} onClick={()=>setAuthMode(authMode==='login'?'signup':'login')}>{authMode==='login'?'Create Account':'Login'}</p>
        </div>
    </div>
  );

  return (
    <div className="app-layout">
        <Toaster position="top-center" toastOptions={{style:{background:'#333', color:'#fff'}}}/>

        {/* --- INJECTING YOUR HIDDEN YOUTUBE PLAYER --- */}
        <div id="hidden-yt-player" style={{ position: 'absolute', top: '-1000px', width: '1px', height: '1px' }}></div>

        {showLyrics && (
            <div className="lyrics-overlay">
                <button className="lyrics-close" onClick={()=>setShowLyrics(false)}>✕</button>
                <div className="lyrics-content">{lyricsText}</div>
            </div>
        )}

        {showQueue && (
            <div className={`queue-sidebar ${showQueue?'open':''}`}>
                <div className="queue-header">
                    <span>Up Next</span>
                    <button onClick={()=>setShowQueue(false)} style={{background:'none',border:'none',color:'white',cursor:'pointer'}}>✕</button>
                </div>
                <div className="queue-list">
                    {queue.map((s, i) => (
                        <div key={i} className={`queue-item ${i===qIndex?'active':''}`}>
                            <img src={getImg(s.image)} alt="" onClick={()=>playSong(queue, i)}/>
                            <div style={{flex:1}} onClick={()=>playSong(queue, i)}>
                                <div style={{fontSize:'0.9rem', fontWeight:700, color:'white'}}>{getName(s)}</div>
                                <div style={{fontSize:'0.8rem', color:'#aaa'}}>{getDesc(s)}</div>
                            </div>
                            <button onClick={()=>removeFromQueue(i)} style={{background:'none',border:'none',color:'#666',cursor:'pointer'}}><Icons.Trash/></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {showPlaylistModal && (
            <div className="modal-overlay">
                <div className="modal-box">
                    <h2>New Playlist</h2>
                    <input className="modal-input" placeholder="Playlist Name" value={newPlaylistName} onChange={e=>setNewPlaylistName(e.target.value)}/>
                    <div className="modal-actions">
                        <button className="btn-cancel" onClick={()=>setShowPlaylistModal(false)}>Cancel</button>
                        <button className="btn-confirm" onClick={createPlaylist}>Create</button>
                    </div>
                </div>
            </div>
        )}

        {showAddToPlaylistModal && (
            <div className="modal-overlay">
                <div className="modal-box">
                    <h2>Add to Playlist</h2>
                    <div className="queue-list" style={{maxHeight:300}}>
                        {userPlaylists.map(pl => (
                            <div key={pl.id} className="queue-item" onClick={()=>addToPlaylist(pl.id)}>
                                <div style={{width:40, height:40, background:'#333', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center'}}>🎵</div>
                                <div>{pl.name}</div>
                            </div>
                        ))}
                    </div>
                    <button className="btn-cancel" style={{marginTop:20, width:'100%'}} onClick={()=>setShowAddToPlaylistModal(false)}>Cancel</button>
                </div>
            </div>
        )}

        {/* SIDEBAR */}
        <div className="sidebar">
            <div className="brand">Void.</div>
            <div className="nav-links">
                <div className={`nav-item ${tab==='home'?'active':''}`} onClick={()=>setTab('home')}><Icons.Home/> Home</div>
                <div className={`nav-item ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}><Icons.Search/> Search</div>
                <div className={`nav-item ${tab==='library'?'active':''}`} onClick={()=>setTab('library')}><Icons.Library/> Liked Songs</div>
                
                <div className="nav-section-title">My Playlists</div>
                {userPlaylists.map(pl => (
                    <div key={pl.id} className={`nav-item ${selectedItem?.id===pl.id?'active':''}`} onClick={()=>handleCardClick(pl, 'playlist_custom')}>
                        <span style={{opacity:0.7}}>🎵</span> {pl.name}
                    </div>
                ))}
                <button className="btn-create-playlist" onClick={()=>setShowPlaylistModal(true)}>
                    <Icons.Plus/> Create Playlist
                </button>
            </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="main-content">
            <div className="header">
                <div className="search-box">
                    <select 
                      value={source} 
                      onChange={(e) => setSource(e.target.value)}
                      style={{background: 'transparent', border: 'none', color: '#d4acfb', outline: 'none', marginRight: '8px', cursor: 'pointer', fontWeight: 'bold'}}
                    >
                      <option value="saavn">JioSaavn</option>
                      <option value="itunes">Apple Music</option>
                      <option value="soundcloud">SoundCloud</option>
                      <option value="qobuz">Qobuz</option>
                      <option value="youtube">YouTube</option>
                    </select>
                    <div style={{width: 1, height: 20, background: '#333', marginRight: 8}}></div>

                    <Icons.Search/>
                    <input placeholder={`Search on ${APIs[source].name}...`} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}/>
                </div>
                <div className="user-pill" onClick={() => setTab('profile')}>
                    <div className="avatar">{user.email[0].toUpperCase()}</div>
                    <span>Profile</span>
                </div>
            </div>

            <div className="scroll-area">
                
                {/* PROFILE VIEW */}
                {tab === 'profile' && (
                    <div className="profile-view">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--bg-card)', padding: '40px', borderRadius: '24px', marginBottom: '40px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {user.email[0].toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>My Account</h1>
                                <p style={{ color: 'var(--text-sec)' }}>{user.email}</p>
                            </div>
                            <button 
                                onClick={() => signOut(auth)} 
                                style={{ padding: '12px 24px', background: '#e57373', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
                            >
                                Logout
                            </button>
                        </div>

                        <div className="section-header">Your Stats</div>
                        <div className="grid">
                            <div className="card" style={{ textAlign: 'center', padding: '30px', cursor: 'default' }}>
                                <h2 style={{ fontSize: '3rem', color: 'var(--primary)', margin: '10px 0' }}>{likedSongs.length}</h2>
                                <p style={{ color: 'var(--text-sec)' }}>Liked Songs</p>
                            </div>
                            <div className="card" style={{ textAlign: 'center', padding: '30px', cursor: 'default' }}>
                                <h2 style={{ fontSize: '3rem', color: 'var(--primary)', margin: '10px 0' }}>{userPlaylists.length}</h2>
                                <p style={{ color: 'var(--text-sec)' }}>Custom Playlists</p>
                            </div>
                            <div className="card" style={{ textAlign: 'center', padding: '30px', cursor: 'default' }}>
                                <h2 style={{ fontSize: '3rem', color: 'var(--primary)', margin: '10px 0' }}>{history.length}</h2>
                                <p style={{ color: 'var(--text-sec)' }}>Recently Played</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* DETAILS */}
                {tab === 'details' && selectedItem && (
                    <div className="details-view">
                        <button className="btn-back" onClick={()=>setTab('home')}>
                            <Icons.Back /> Back
                        </button>
                        <div className="details-header">
                            <img className="details-art" src={getImg(selectedItem.image || selectedItem.songs?.[0]?.image)} alt=""/>
                            <div className="details-meta">
                                <h1>{getName(selectedItem)}</h1>
                                <p>{selectedItem.songs ? `${selectedItem.songs.length} Songs` : getDesc(selectedItem)}</p>
                                <button className="btn-play-all" onClick={()=>playSong(detailsSongs, 0)}>Play All</button>
                            </div>
                        </div>
                        <div className="track-list">
                            {detailsSongs.map((s, i) => (
                                <div key={i} className="track-row">
                                    <div style={{display:'flex', alignItems:'center', flex:1}} onClick={()=>playSong(detailsSongs, i)}>
                                        <span className="track-num">{i+1}</span>
                                        <img className="track-img" src={getImg(s.image)} alt=""/>
                                        <div className="track-info">
                                            <div className="track-title">{getName(s)}</div>
                                            <div className="track-artist">{getDesc(s)}</div>
                                        </div>
                                    </div>
                                    <div className="track-actions">
                                        <button className={`icon-action ${isLiked(s.id)?'liked':''}`} onClick={()=>toggleLike(s)}><Icons.Heart/></button>
                                        <button className="icon-action" onClick={()=>{setSongToAdd(s); setShowAddToPlaylistModal(true);}}><Icons.Plus/></button>
                                    </div>
                                    <div className="track-dur">{Math.floor(s.duration/60)}:{String(s.duration%60).padStart(2,'0')}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SEARCH RESULTS */}
                {tab === 'search' && (
                    <div className="section">
                        {resSongs.length > 0 && (
                            <>
                                <div className="section-header">Songs from {APIs[source].name}</div>
                                <div className="grid">
                                    {resSongs.map(s => (
                                        <div key={s.id} className="card" onClick={()=>playSong(resSongs, resSongs.indexOf(s))}>
                                            <img src={getImg(s.image)} alt=""/>
                                            <h3>{getName(s)}</h3>
                                            <p>{getDesc(s)}</p>
                                            <div className="card-actions">
                                                <button className={`btn-card-action ${isLiked(s.id)?'liked':''}`} onClick={(e)=>{e.stopPropagation(); toggleLike(s)}}><Icons.Heart/></button>
                                                <button className="btn-card-action" onClick={(e)=>{e.stopPropagation(); setSongToAdd(s); setShowAddToPlaylistModal(true);}}><Icons.Plus/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        {source === 'saavn' && resAlbums.length > 0 && (
                            <>
                                <div className="section-header" style={{marginTop:40}}>Albums</div>
                                <div className="horizontal-scroll">
                                    {resAlbums.map(a => (
                                        <div key={a.id} className="card" onClick={()=>handleCardClick(a, 'album')}>
                                            <img src={getImg(a.image)} alt=""/>
                                            <h3>{getName(a)}</h3>
                                            <p>{a.year}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        {source === 'saavn' && resArtists.length > 0 && (
                            <>
                                <div className="section-header" style={{marginTop:40}}>Artists</div>
                                <div className="horizontal-scroll">
                                    {resArtists.map(a => (
                                        <div key={a.id} className="card" onClick={()=>handleCardClick(a, 'artist')}>
                                            <img src={getImg(a.image)} alt="" style={{borderRadius:'50%'}}/>
                                            <h3 style={{textAlign:'center'}}>{getName(a)}</h3>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        {source === 'saavn' && resPlaylists.length > 0 && (
                            <>
                                <div className="section-header" style={{marginTop:40}}>Playlists</div>
                                <div className="horizontal-scroll">
                                    {resPlaylists.map(p => (
                                        <div key={p.id} className="card" onClick={()=>handleCardClick(p, 'playlist')}>
                                            <img src={getImg(p.image)} alt=""/>
                                            <h3>{getName(p)}</h3>
                                            <p>{p.language}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* MOOD VIEW */}
                {tab === 'mood' && selectedItem && (
                    <div className="section">
                        <button className="btn-back" onClick={()=>setTab('home')} style={{marginBottom:30}}>
                            <Icons.Back /> Home
                        </button>
                        <div className="details-header" style={{background: selectedItem.color, borderRadius:'24px', padding:'40px', marginBottom:'40px'}}>
                            <h1 style={{fontSize:'3rem'}}>{selectedItem.name} Mix</h1>
                            <p>Curated Playlists for your mood</p>
                        </div>
                        <div className="grid">
                            {moodPlaylists.map(p => (
                                <div key={p.id} className="card" onClick={()=>handleCardClick(p, 'playlist')}>
                                    <img src={getImg(p.image)} alt=""/>
                                    <h3>{getName(p)}</h3>
                                    <p>{p.language}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- LIVE HOMEPAGE VIEW --- */}
                {tab === 'home' && (
                    <>
                        <div className="hero">
                            <h1>Welcome Back</h1>
                            <p>Discover new music, fresh albums, and curated playlists.</p>
                        </div>

                        {/* 1. History */}
                        {history.length > 0 && (
                            <div className="section">
                                <div className="section-header">Recently Played</div>
                                <div className="horizontal-scroll">
                                    {history.map(s => (
                                        <div key={s.id} className="card" onClick={()=>playSong(history, history.indexOf(s))}>
                                            <img src={getImg(s.image)} alt=""/>
                                            <h3>{getName(s)}</h3>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* 2. Moods */}
                        <div className="section">
                            <div className="section-header">Moods</div>
                            <div className="horizontal-scroll">
                                {MOODS.map(m => (
                                    <div key={m.id} className="card" style={{minWidth:'160px', background:m.color, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={()=>handleCardClick(m, 'mood')}>
                                        <h3 style={{fontSize:'1.2rem', color:'white', textAlign:'center'}}>{m.name}</h3>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. LIVE JioSaavn Trending */}
                        {homeData.trending.length > 0 && (
                            <div className="section">
                                <div className="section-header">Trending Now</div>
                                <div className="horizontal-scroll">
                                    {homeData.trending.map(item => (
                                        <div key={item.id} className="card" onClick={()=>handleCardClick(item, item.type || 'album')}>
                                            <img src={getImg(item.image)} alt=""/>
                                            <h3>{getName(item)}</h3>
                                            <p>{getDesc(item)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. LIVE JioSaavn Top Charts */}
                        {homeData.charts.length > 0 && (
                            <div className="section">
                                <div className="section-header">Top Charts</div>
                                <div className="horizontal-scroll">
                                    {homeData.charts.map(chart => (
                                        <div key={chart.id} className="card" onClick={()=>handleCardClick(chart, 'playlist')}>
                                            <img src={getImg(chart.image)} alt=""/>
                                            <h3>{getName(chart)}</h3>
                                            <p>{chart.language || 'Chart'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 5. LIVE JioSaavn New Albums */}
                        {homeData.newAlbums.length > 0 && (
                            <div className="section">
                                <div className="section-header">New Releases</div>
                                <div className="horizontal-scroll">
                                    {homeData.newAlbums.map(album => (
                                        <div key={album.id} className="card" onClick={()=>handleCardClick(album, 'album')}>
                                            <img src={getImg(album.image)} alt=""/>
                                            <h3>{getName(album)}</h3>
                                            <p>{album.language || 'Album'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 6. LIVE JioSaavn Editor Playlists */}
                        {homeData.playlists.length > 0 && (
                            <div className="section">
                                <div className="section-header">Editorial Picks</div>
                                <div className="horizontal-scroll">
                                    {homeData.playlists.map(playlist => (
                                        <div key={playlist.id} className="card" onClick={()=>handleCardClick(playlist, 'playlist')}>
                                            <img src={getImg(playlist.image)} alt=""/>
                                            <h3>{getName(playlist)}</h3>
                                            <p>{playlist.subtitle || 'Curated'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* LIBRARY */}
                {tab === 'library' && (
                    <div className="section">
                        <div className="section-header">Liked Songs</div>
                        <div className="grid">
                            {likedSongs.map((s, i) => (
                                <div key={s.id} className="card" onClick={()=>playSong(likedSongs, i)}>
                                    <img src={getImg(s.image)} alt=""/>
                                    <h3>{getName(s)}</h3>
                                    <p>{getDesc(s)}</p>
                                    <div className="card-actions" style={{opacity:1}}>
                                        <button className="btn-card-action liked" onClick={(e)=>{e.stopPropagation(); toggleLike(s)}}><Icons.Heart/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* --- PLAYER BAR --- */}
        <div className={`player-bar ${currentSong ? 'visible' : ''}`} style={{transform: currentSong ? 'translateY(0)' : 'translateY(200px)', transition:'transform 0.3s'}}>
            {currentSong && (
                <>
                    <div className="mobile-progress-bar" style={{width: `${(progress/duration)*100}%`, display: 'none'}}></div> 
                    
                    <div className="p-track">
                        <img src={getImg(currentSong.image)} alt=""/>
                        <div style={{overflow: 'hidden'}}>
                            <h4 style={{fontSize:'0.9rem', color:'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{getName(currentSong)}</h4>
                            <p style={{fontSize:'0.8rem', color:'#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{getDesc(currentSong)}</p>
                        </div>
                        {isPlaying && <div className="visualizer"><div className="bar"/><div className="bar"/><div className="bar"/><div className="bar"/></div>}
                    </div>
                    <div className="p-center">
                        <div className="p-controls">
                            <button className={`btn-icon ${isShuffle?'active':''}`} onClick={toggleShuffle}><Icons.Shuffle/></button>
                            <button className="btn-icon" onClick={()=>playSong(queue, qIndex-1)}><Icons.SkipBack/></button>
                            <button className="btn-play" onClick={togglePlay}>{isPlaying ? <Icons.Pause/> : <Icons.Play/>}</button>
                            <button className="btn-icon" onClick={()=>playSong(queue, qIndex+1)}><Icons.SkipFwd/></button>
                            <button className={`btn-icon ${repeatMode!=='none'?'active':''}`} onClick={toggleRepeat}>
                                {repeatMode==='one' ? <Icons.RepeatOne/> : <Icons.Repeat/>}
                            </button>
                        </div>
                        <div className="progress-container">
                            <span>{formatTime(progress)}</span>
                            <div className="progress-rail" onClick={handleSeek}>
                                <div className="progress-fill" style={{width: `${(progress/duration)*100}%`}}></div>
                            </div>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                    <div className="p-right">
                        <button className={`btn-icon ${showLyrics?'active':''}`} onClick={fetchLyrics}><Icons.Mic/></button>
                        <button className={`btn-icon ${showQueue?'active':''}`} onClick={()=>setShowQueue(!showQueue)}><Icons.List/></button>
                        <input type="range" className="volume-slider" min="0" max="1" step="0.1" value={volume} 
                               onChange={e => {
                                  setVolume(e.target.value); 
                                  audioRef.current.volume=e.target.value;
                                  if (ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(e.target.value * 100);
                               }}/>
                        <select className="quality-select" value={quality} onChange={e=>handleQualityChange(e.target.value)}>
                            <option value="320kbps">320kbps</option>
                            <option value="160kbps">160kbps</option>
                            <option value="96kbps">96kbps</option>
                        </select>
                    </div>

                    <div className="mobile-controls" style={{display:'none'}}> 
                       <button className="btn-play-mobile" onClick={togglePlay}>{isPlaying ? <Icons.Pause/> : <Icons.Play/>}</button>
                    </div>
                </>
            )}
        </div>

        {/* BOTTOM NAV (Mobile) */}
        <div className="bottom-nav">
            <div className={`nav-tab ${tab==='home'?'active':''}`} onClick={()=>setTab('home')}><Icons.Home/> Home</div>
            <div className={`nav-tab ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}><Icons.Search/> Search</div>
            <div className={`nav-tab ${tab==='library'?'active':''}`} onClick={()=>setTab('library')}><Icons.Library/> Library</div>
            <div className={`nav-tab ${tab==='profile'?'active':''}`} onClick={()=>setTab('profile')}><Icons.Profile/> Profile</div>
        </div>
    </div>
  );
}

export default App;
