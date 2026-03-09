import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import toast, { Toaster } from 'react-hot-toast';
// --- GSAP IMPORTS ---
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);

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
  Back: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
  Maximize: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
  Minimize: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
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
  // --- REVERTED YOUTUBE INTEGRATION ---
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
  
  // Visual States
  const [theaterMode, setTheaterMode] = useState(false); 
  
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
    trending: [], charts: [], newAlbums: [], editorial: [], radio: [], topArtists: [], love: [], fresh: [], nineties: [], hindiPop: [] 
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
  const preloaderRef = useRef(new Audio()); 
  
  // YouTube IFrame Player Refs
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
  const [bufferProgress, setBufferProgress] = useState(0); 
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [quality, setQuality] = useState('320kbps');
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); 

  // --- GSAP ANIMATION LOGIC ---
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from('.section-header, .hero h1, .hero p', {
      x: -30, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', clearProps: 'all'
    });
    gsap.from('.card, .track-row', {
      y: 50, opacity: 0, duration: 0.5, stagger: 0.05, ease: 'back.out(1.2)', clearProps: 'all'
    });
  }, { dependencies: [tab, homeData, resSongs, resAlbums, moodPlaylists, detailsSongs], scope: containerRef });

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

  // --- YOUTUBE IFRAME INITIALIZATION ---
  const initYTPlayer = (videoId = '') => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
      try { ytPlayerRef.current.destroy(); } catch (e) {}
    }

    ytPlayerRef.current = new window.YT.Player('hidden-yt-player', {
      height: '0', width: '0', videoId: videoId,
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
          if (event.data === window.YT.PlayerState.PAUSED) { setIsPlaying(false); }
          if (event.data === window.YT.PlayerState.ENDED) { onTrackEndRef.current(); }
        },
        'onError': () => {
          console.warn("YT Player Error - Attempting Reset...");
          if (currentSongRef.current?.id) initYTPlayer(currentSongRef.current.id);
        }
      }
    });
  };

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
      const results = await Promise.all([
        fetch(`${API_BASE}/search/songs?query=Top 50&limit=15`).then(r=>r.json()).catch(()=>({})),
        fetch(`${API_BASE}/search/playlists?query=Top Charts&limit=15`).then(r=>r.json()).catch(()=>({})),
        fetch(`${API_BASE}/search/albums?query=New&limit=15`).then(r=>r.json()).catch(()=>({})),
        fetch(`${API_BASE}/search/playlists?query=Editors Pick&limit=15`).then(r=>r.json()).catch(()=>({})),
        fetch(`${API_BASE}/search/artists?query=Best&limit=15`).then(r=>r.json()).catch(()=>({})), 
        fetch(`${API_BASE}/search/artists?query=Top Artists&limit=15`).then(r=>r.json()).catch(()=>({})),
        fetch(`${API_BASE}/search/playlists?query=Love&limit=15`).then(r=>r.json()).catch(()=>({})),
        fetch(`${API_BASE}/search/playlists?query=Fresh Hits&limit=15`).then(r=>r.json()).catch(()=>({})),
        fetch(`${API_BASE}/search/playlists?query=90s Bollywood&limit=15`).then(r=>r.json()).catch(()=>({})),
        fetch(`${API_BASE}/search/albums?query=New Hindi Pop&limit=15`).then(r=>r.json()).catch(()=>({}))
      ]);

      setHomeData({ 
        trending: results[0]?.data?.results || [], charts: results[1]?.data?.results || [], 
        newAlbums: results[2]?.data?.results || [], editorial: results[3]?.data?.results || [],
        radio: results[4]?.data?.results || [], topArtists: results[5]?.data?.results || [], 
        love: results[6]?.data?.results || [], fresh: results[7]?.data?.results || [],
        nineties: results[8]?.data?.results || [], hindiPop: results[9]?.data?.results || []
      });
    } catch(e) { console.error("Home Error", e); } 
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
          const songs = await APIs[source].search(searchQuery);
          setResSongs(songs);
      }
    } catch(e) { console.error(e); toast.error("Search failed");
    } finally { setLoading(false); }
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

  const playSong = async (list, idx) => {
    if(!list || !list[idx]) return;
    setQueue(list); setQIndex(idx);
    const s = list[idx];
    setCurrentSong(s);
    addToHistory(s);

    if (s.source === 'youtube') {
      audioRef.current.pause(); 
      clearTimeout(watchdogRef.current);
      watchdogRef.current = setTimeout(() => {
        console.warn("YouTube Freeze detected. Re-initializing player...");
        initYTPlayer(s.id);
      }, 3000);

      if (ytReady && ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        ytPlayerRef.current.loadVideoById(s.id);
        ytPlayerRef.current.playVideo();
      } else { initYTPlayer(s.id); }
      return; 
    }
    
    if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') { ytPlayerRef.current.pauseVideo(); }
    
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
        let urlObj;
        if (quality === 'Premium') {
            urlObj = s.downloadUrl.find(u => u.quality === 'lossless') || 
                     s.downloadUrl.find(u => u.quality === '320kbps') || 
                     s.downloadUrl[s.downloadUrl.length - 1];
        } else {
            urlObj = s.downloadUrl.find(u => u.quality === quality);
        }
        url = urlObj ? urlObj.url : (s.downloadUrl[s.downloadUrl.length-1]?.url || s.downloadUrl[0]?.url);
    }

    if(url) {
        if(audioRef.current.src !== url) {
            audioRef.current.src = url;
            audioRef.current.volume = volume;
            audioRef.current.play().catch(()=>{});
            setIsPlaying(true);
        } else { audioRef.current.play(); setIsPlaying(true); }
    } else { toast.error("Audio unavailable"); }
  };

  const handleQualityChange = (newQ) => {
    setQuality(newQ);
    if(currentSong && isPlaying) { playSong(queue, qIndex); toast.success(`Quality set to ${newQ}`); }
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
    if (currentSong?.source === 'youtube') { ytPlayerRef.current?.seekTo(seekTo, true); } 
    else { audioRef.current.currentTime = seekTo; }
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
            id: String(item.id), name: getName(item), primaryArtists: getDesc(item), 
            image: item.image||[], downloadUrl: item.downloadUrl||[], duration: item.duration||0, source: item.source || 'saavn'
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
            id: String(songToAdd.id), name: getName(songToAdd), primaryArtists: getDesc(songToAdd), 
            image: songToAdd.image||[], downloadUrl: songToAdd.downloadUrl||[], source: songToAdd.source || 'saavn'
        };
        await updateDoc(ref, { songs: arrayUnion(clean) });
        toast.success("Added to Playlist"); setShowAddToPlaylistModal(false);
    } catch(e) { toast.error("Failed"); }
  };

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

  useEffect(() => {
    if (qIndex >= 0 && qIndex < queue.length - 1) {
      const nextSong = queue[qIndex + 1];
      if (nextSong.source !== 'youtube' && nextSong.source !== 'soundcloud') {
        let nextUrl = "";
        if (nextSong.downloadUrl && Array.isArray(nextSong.downloadUrl)) {
            const urlObj = nextSong.downloadUrl.find(u => u.quality === quality);
            nextUrl = urlObj ? urlObj.url : (nextSong.downloadUrl[nextSong.downloadUrl.length-1]?.url || nextSong.downloadUrl[0]?.url);
        }
        if (nextUrl) { preloaderRef.current.src = nextUrl; preloaderRef.current.preload = 'auto'; }
      }
    }
  }, [qIndex, queue, quality]);

  useEffect(() => {
    const a = audioRef.current;
    const updateTime = () => { 
      setProgress(a.currentTime); setDuration(a.duration || 0); 
      if (a.buffered.length > 0) setBufferProgress(a.buffered.end(a.buffered.length - 1));
    };
    const handleEnd = () => onTrackEndRef.current();
    a.addEventListener('timeupdate', updateTime); a.addEventListener('ended', handleEnd);
    return () => { a.removeEventListener('timeupdate', updateTime); a.removeEventListener('ended', handleEnd); };
  }, []);

  useEffect(() => {
    if (isPlaying && currentSong?.source === 'youtube') {
      ytProgressInterval.current = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          const dur = ytPlayerRef.current.getDuration() || 0;
          setProgress(ytPlayerRef.current.getCurrentTime()); setDuration(dur);
          setBufferProgress((ytPlayerRef.current.getVideoLoadedFraction() || 0) * dur); 
        }
      }, 1000);
    } else { clearInterval(ytProgressInterval.current); }
    return () => clearInterval(ytProgressInterval.current);
  }, [isPlaying, currentSong]);

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

  // --- UNIVERSAL TEXT IMPORTER LOGIC ---
  const [showTextImportModal, setShowTextImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: 'idle' });

  const handleTextImport = async () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n').filter(line => line.trim().length > 0);
    setImportProgress({ current: 0, total: lines.length, status: 'converting' });
    const matchedSongs = [];

    for (let i = 0; i < lines.length; i++) {
      const query = lines[i].trim();
      if (!query || query.length < 2) continue;
      setImportProgress({ current: i + 1, total: lines.length, status: 'converting' });
      try {
        const results = await APIs.youtube.search(query);
        if (results.songs && results.songs.length > 0) { matchedSongs.push(results.songs[0]); }
      } catch (e) { console.warn(`Could not match: ${query}`); }
      await new Promise(r => setTimeout(r, 100));
    }

    if (matchedSongs.length > 0) {
      try {
          const ref = collection(db, `users/${user.uid}/playlists`);
          await addDoc(ref, { name: `Imported Playlist ${new Date().toLocaleDateString()}`, songs: matchedSongs });
          toast.success(`Successfully imported ${matchedSongs.length} songs!`);
          setShowTextImportModal(false); setImportText("");
      } catch(e) { toast.error("Failed to save playlist"); }
    } else { toast.error("No songs found. Check your spelling."); }
    setImportProgress({ current: 0, total: 0, status: 'idle' });
  };

  if(view==='loading') return <div style={{height:'100vh',background:'black',display:'flex',justifyContent:'center',alignItems:'center',color:'white'}}>Loading...</div>;

  if(view==='auth') return (
    <div style={{
        height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center',
        background: 'radial-gradient(circle at 50% -20%, #2a0845 0%, #000000 80%)', fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
        <Toaster position="top-center" toastOptions={{style:{background:'#333', color:'#fff'}}}/>
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '50px',
            width: '100%', maxWidth: '420px', textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.6)'
        }}>
            <h1 style={{ fontSize: '3.5rem', fontWeight: '800', color: '#fff', margin: '0 0 5px 0', letterSpacing: '-2px' }}>Void.</h1>
            <p style={{ color: '#aaa', marginBottom: '40px', fontSize: '1.1rem' }}>
                {authMode === 'login' ? 'Welcome back to the music universe.' : 'Create your sonic identity.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <input placeholder="Email Address" value={authInput.email} onChange={e=>setAuthInput({...authInput,email:e.target.value})}
                    style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white', outline: 'none', fontSize: '1rem', boxSizing: 'border-box', transition: 'border 0.3s ease, background 0.3s ease' }}
                    onFocus={(e) => { e.target.style.border = '1px solid #d4acfb'; e.target.style.background = 'rgba(0,0,0,0.5)'; }}
                    onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(0,0,0,0.3)'; }}
                />
                <input type="password" placeholder="Password" value={authInput.password} onChange={e=>setAuthInput({...authInput,password:e.target.value})} onKeyDown={e=>e.key==='Enter'&&handleAuth()}
                    style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white', outline: 'none', fontSize: '1rem', boxSizing: 'border-box', transition: 'border 0.3s ease, background 0.3s ease' }}
                    onFocus={(e) => { e.target.style.border = '1px solid #d4acfb'; e.target.style.background = 'rgba(0,0,0,0.5)'; }}
                    onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(0,0,0,0.3)'; }}
                />
                <button onClick={handleAuth} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #d4acfb 0%, #a252f8 100%)', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', boxShadow: '0 8px 20px rgba(162, 82, 248, 0.3)', transition: 'transform 0.1s ease, filter 0.2s ease' }}
                    onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.15)'} onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >{authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
            </div>
            <p style={{color:'#888', marginTop: '30px', fontSize: '0.95rem'}}>
                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <span style={{color: '#d4acfb', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline transparent', transition: 'text-decoration 0.2s'}} onClick={()=>setAuthMode(authMode==='login'?'signup':'login')} onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline solid #d4acfb'} onMouseOut={(e) => e.currentTarget.style.textDecoration = 'underline transparent'}
                >{authMode === 'login' ? 'Sign Up' : 'Log In'}</span>
            </p>
        </div>
    </div>
  );

  return (
    <div className="app-layout">
        <Toaster position="top-center" toastOptions={{style:{background:'#333', color:'#fff'}}}/>

        {/* --- STYLES WITH FIX FOR OVERFLOW --- */}
        <style>{`
          .app-layout { background: transparent !important; }
          .main-content { background: rgba(0, 0, 0, 0.5) !important; border-left: 1px solid rgba(255,255,255,0.05); }
          .sidebar { background: rgba(0, 0, 0, 0.6) !important; backdrop-filter: blur(20px); }
          .card { background: rgba(255, 255, 255, 0.05) !important; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); }
          .header { background: transparent !important; }
          
          /* --- FIXED PLAYER BAR LAYOUT --- */
          .player-bar { 
              background: rgba(10, 10, 10, 0.85) !important; 
              backdrop-filter: blur(30px); 
              border-top: 1px solid rgba(255,255,255,0.05); 
              display: flex; 
              align-items: center; 
              width: 100%; 
              box-sizing: border-box; 
              justify-content: space-between;
              padding: 0 16px; /* Padding keeps things off edge */
          }
          
          /* 1. LEFT ZONE (Track Info) - Takes 30% max */
          .p-track { 
              flex: 1; 
              min-width: 0; 
              max-width: 30%;
              display: flex; 
              align-items: center;
          }

          /* 2. CENTER ZONE (Controls) - Takes 40% max */
          .p-center {
              flex: 2; /* Grows faster than others */
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              max-width: 40%; /* Strict cap to prevent pushing */
          }

          /* 3. RIGHT ZONE (Volume) - Takes 30% max */
          .p-right {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: flex-end; /* Pushes content to right */
              gap: 12px;
              min-width: 0; 
              max-width: 30%;
          }

          /* Fix volume slider width */
          .volume-slider {
              width: 80px; 
              max-width: 15vw; /* Responsive shrink */
              accent-color: #d4acfb;
          }

          /* --- RESPONSIVE MOBILE FIXES --- */
          .mobile-controls { display: none; }
          @media (max-width: 768px) {
              .p-center, .p-right { display: none !important; }
              .mobile-controls { display: flex !important; align-items: center; gap: 15px; margin-left: auto; }
              .p-track { flex: 1; min-width: 0; padding-right: 10px; max-width: none; }
          }

          /* Animation */
          @keyframes spinRecord { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .spin-anim { animation: spinRecord 6s linear infinite; }
          .spin-paused { animation-play-state: paused; }
        `}</style>

        {/* --- DYNAMIC BACKGROUND --- */}
        {currentSong && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, backgroundImage: `url(${getImg(currentSong.image)})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(100px) brightness(0.35)', transform: 'scale(1.2)', transition: 'background-image 1s ease-in-out', pointerEvents: 'none' }} />
        )}

        {/* --- THEATER MODE --- */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '90px', zIndex: 50, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(40px)', display: theaterMode ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: theaterMode ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: theaterMode ? 'all' : 'none' }}>
            {currentSong && (
                <>
                    <div className={`spin-anim ${!isPlaying ? 'spin-paused' : ''}`} style={{ width: '45vh', height: '45vh', borderRadius: '50%', marginBottom: '40px', background: 'radial-gradient(circle, #222 0%, #050505 100%)', boxShadow: '0 30px 60px rgba(0,0,0,0.8), inset 0 0 0 10px #111, inset 0 0 0 12px #222', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <img src={getImg(currentSong.image)} alt="" style={{ width: '40%', height: '40%', objectFit: 'cover', borderRadius: '50%', boxShadow: '0 0 0 4px #000' }}/>
                        <div style={{ position: 'absolute', width: '15px', height: '15px', background: '#111', borderRadius: '50%', border: '1px solid #333' }}></div>
                    </div>
                    <h1 style={{fontSize: '3.5rem', color: 'white', fontWeight: 800, textAlign: 'center', margin: '0 0 10px 0', textShadow: '0 4px 20px rgba(0,0,0,0.5)'}}>{getName(currentSong)}</h1>
                    <p style={{fontSize: '1.5rem', color: 'rgba(255,255,255,0.7)', margin: 0}}>{getDesc(currentSong)}</p>
                </>
            )}
        </div>

        <div id="hidden-yt-player" style={{ position: 'absolute', top: '-1000px', width: '1px', height: '1px' }}></div>

        {showLyrics && ( <div className="lyrics-overlay"><button className="lyrics-close" onClick={()=>setShowLyrics(false)}>✕</button><div className="lyrics-content">{lyricsText}</div></div> )}

        {showQueue && (
            <div className={`queue-sidebar ${showQueue?'open':''}`}>
                <div className="queue-header"><span>Up Next</span><button onClick={()=>setShowQueue(false)} style={{background:'none',border:'none',color:'white',cursor:'pointer'}}>✕</button></div>
                <div className="queue-list">{queue.map((s, i) => (<div key={i} className={`queue-item ${i===qIndex?'active':''}`}><img src={getImg(s.image)} alt="" onClick={()=>playSong(queue, i)}/><div style={{flex:1}} onClick={()=>playSong(queue, i)}><div style={{fontSize:'0.9rem', fontWeight:700, color:'white'}}>{getName(s)}</div><div style={{fontSize:'0.8rem', color:'#aaa'}}>{getDesc(s)}</div></div><button onClick={()=>removeFromQueue(i)} style={{background:'none',border:'none',color:'#666',cursor:'pointer'}}><Icons.Trash/></button></div>))}</div>
            </div>
        )}

        {showPlaylistModal && (
            <div className="modal-overlay"><div className="modal-box"><h2>New Playlist</h2><input className="modal-input" placeholder="Playlist Name" value={newPlaylistName} onChange={e=>setNewPlaylistName(e.target.value)}/><div className="modal-actions"><button className="btn-cancel" onClick={()=>setShowPlaylistModal(false)}>Cancel</button><button className="btn-confirm" onClick={createPlaylist}>Create</button></div></div></div>
        )}

        {showAddToPlaylistModal && (
            <div className="modal-overlay"><div className="modal-box"><h2>Add to Playlist</h2><div className="queue-list" style={{maxHeight:300}}>{userPlaylists.map(pl => (<div key={pl.id} className="queue-item" onClick={()=>addToPlaylist(pl.id)}><div style={{width:40, height:40, background:'#333', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center'}}>🎵</div><div>{pl.name}</div></div>))}</div><button className="btn-cancel" style={{marginTop:20, width:'100%'}} onClick={()=>setShowAddToPlaylistModal(false)}>Cancel</button></div></div>
        )}

        {showTextImportModal && (
            <div className="modal-overlay"><div className="modal-box" style={{maxWidth: '500px'}}><h2>Import Songs</h2><p style={{color:'#aaa', fontSize:'0.9rem', marginBottom:'20px'}}>Paste a list of songs (one per line). <br/>Example:<br/><i>Starboy - The Weeknd<br/>Shape of You - Ed Sheeran</i></p>
                {importProgress.status === 'idle' ? (<><textarea className="modal-input" placeholder="Paste your song list here..." value={importText} onChange={e=>setImportText(e.target.value)} style={{minHeight: '200px', resize: 'vertical', fontFamily: 'monospace'}}/><div className="modal-actions"><button className="btn-cancel" onClick={()=>setShowTextImportModal(false)}>Cancel</button><button className="btn-confirm" onClick={handleTextImport}>Start Import</button></div></>) : (<div style={{textAlign:'center', padding:'20px'}}><div className="spin-anim" style={{width:'40px', height:'40px', border:'4px solid #333', borderTop:'4px solid var(--primary)', borderRadius:'50%', margin:'0 auto 20px'}}></div><h3>Finding Songs...</h3><p style={{color: '#aaa'}}>{importProgress.current} / {importProgress.total} processed</p><div style={{width: '100%', height: '6px', background: '#333', borderRadius: '3px', marginTop: '15px', overflow: 'hidden'}}><div style={{height: '100%', background: 'var(--primary)', width: `${(importProgress.current / importProgress.total) * 100}%`, transition: 'width 0.2s ease'}}></div></div></div>)}
            </div></div>
        )}

        {/* SIDEBAR */}
        <div className="sidebar" style={{ zIndex: 10 }}>
            <div className="brand">Void.</div>
            <div className="nav-links">
                <div className={`nav-item ${tab==='home'?'active':''}`} onClick={()=>setTab('home')}><Icons.Home/> Home</div>
                <div className={`nav-item ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}><Icons.Search/> Search</div>
                <div className={`nav-item ${tab==='library'?'active':''}`} onClick={()=>setTab('library')}><Icons.Library/> Liked Songs</div>
                <div className="nav-section-title">My Playlists</div>
                <button className="btn-create-playlist" onClick={()=>setShowTextImportModal(true)} style={{marginBottom: '10px', background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)'}}><span style={{marginRight: '8px'}}>📋</span> Import Text / Copy</button>
                {userPlaylists.map(pl => (<div key={pl.id} className={`nav-item ${selectedItem?.id===pl.id?'active':''}`} onClick={()=>handleCardClick(pl, 'playlist_custom')}><span style={{opacity:0.7}}>🎵</span> {pl.name}</div>))}
                <button className="btn-create-playlist" onClick={()=>setShowPlaylistModal(true)}><Icons.Plus/> Create Playlist</button>
            </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="main-content" style={{ zIndex: 10 }}>
            <div className="header">
                <div className="search-box">
                    <select value={source} onChange={(e) => setSource(e.target.value)} style={{background: 'transparent', border: 'none', color: '#d4acfb', outline: 'none', marginRight: '8px', cursor: 'pointer', fontWeight: 'bold'}}>
                      <option value="saavn">JioSaavn</option><option value="itunes">Apple Music</option><option value="soundcloud">SoundCloud</option><option value="qobuz">Qobuz</option><option value="youtube">YouTube</option>
                    </select>
                    <div style={{width: 1, height: 20, background: '#333', marginRight: 8}}></div>
                    <Icons.Search/>
                    <input placeholder={`Search on ${APIs[source].name}...`} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}/>
                </div>
                <div className="user-pill" onClick={() => setTab('profile')}>
                    <div className="avatar">{user.email[0].toUpperCase()}</div><span>Profile</span>
                </div>
            </div>

            <div className="scroll-area" ref={containerRef}>
                {tab === 'profile' && (
                    <div className="profile-view">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--bg-card)', padding: '40px', borderRadius: '24px', marginBottom: '40px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{user.email[0].toUpperCase()}</div>
                            <div style={{ flex: 1, minWidth: '200px' }}><h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>My Account</h1><p style={{ color: 'var(--text-sec)' }}>{user.email}</p></div>
                            <button onClick={() => signOut(auth)} style={{ padding: '12px 24px', background: '#e57373', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>Logout</button>
                        </div>
                        <div className="section-header">Your Stats</div>
                        <div className="grid">
                            <div className="card" style={{ textAlign: 'center', padding: '30px', cursor: 'default' }}><h2 style={{ fontSize: '3rem', color: 'var(--primary)', margin: '10px 0' }}>{likedSongs.length}</h2><p style={{ color: 'var(--text-sec)' }}>Liked Songs</p></div>
                            <div className="card" style={{ textAlign: 'center', padding: '30px', cursor: 'default' }}><h2 style={{ fontSize: '3rem', color: 'var(--primary)', margin: '10px 0' }}>{userPlaylists.length}</h2><p style={{ color: 'var(--text-sec)' }}>Custom Playlists</p></div>
                            <div className="card" style={{ textAlign: 'center', padding: '30px', cursor: 'default' }}><h2 style={{ fontSize: '3rem', color: 'var(--primary)', margin: '10px 0' }}>{history.length}</h2><p style={{ color: 'var(--text-sec)' }}>Recently Played</p></div>
                        </div>
                    </div>
                )}

                {tab === 'details' && selectedItem && (
                    <div className="details-view">
                        <button className="btn-back" onClick={()=>setTab('home')}><Icons.Back /> Back</button>
                        <div className="details-header"><img className="details-art" src={getImg(selectedItem.image || selectedItem.songs?.[0]?.image)} alt=""/><div className="details-meta"><h1>{getName(selectedItem)}</h1><p>{selectedItem.songs ? `${selectedItem.songs.length} Songs` : getDesc(selectedItem)}</p><button className="btn-play-all" onClick={()=>playSong(detailsSongs, 0)}>Play All</button></div></div>
                        <div className="track-list">{detailsSongs.map((s, i) => (<div key={i} className="track-row"><div style={{display:'flex', alignItems:'center', flex:1}} onClick={()=>playSong(detailsSongs, i)}><span className="track-num">{i+1}</span><img className="track-img" src={getImg(s.image)} alt=""/><div className="track-info"><div className="track-title">{getName(s)}</div><div className="track-artist">{getDesc(s)}</div></div></div><div className="track-actions"><button className={`icon-action ${isLiked(s.id)?'liked':''}`} onClick={()=>toggleLike(s)}><Icons.Heart/></button><button className="icon-action" onClick={()=>{setSongToAdd(s); setShowAddToPlaylistModal(true);}}><Icons.Plus/></button></div><div className="track-dur">{Math.floor(s.duration/60)}:{String(s.duration%60).padStart(2,'0')}</div></div>))}</div>
                    </div>
                )}

                {tab === 'search' && (
                    <div className="section">
                        {resSongs.length > 0 && (<><div className="section-header">Songs from {APIs[source].name}</div><div className="grid">{resSongs.map(s => (<div key={s.id} className="card" onClick={()=>playSong(resSongs, resSongs.indexOf(s))}><img src={getImg(s.image)} alt=""/><h3>{getName(s)}</h3><p>{getDesc(s)}</p><div className="card-actions"><button className={`btn-card-action ${isLiked(s.id)?'liked':''}`} onClick={(e)=>{e.stopPropagation(); toggleLike(s)}}><Icons.Heart/></button><button className="btn-card-action" onClick={(e)=>{e.stopPropagation(); setSongToAdd(s); setShowAddToPlaylistModal(true);}}><Icons.Plus/></button></div></div>))}</div></>)}
                        {resAlbums.length > 0 && (<><div className="section-header" style={{marginTop:40}}>Albums</div><div className="horizontal-scroll">{resAlbums.map(a => (<div key={a.id} className="card" onClick={()=>handleCardClick(a, 'album')}><img src={getImg(a.image)} alt=""/><h3>{getName(a)}</h3><p>{a.year}</p></div>))}</div></>)}
                        {resArtists.length > 0 && (<><div className="section-header" style={{marginTop:40}}>Artists</div><div className="horizontal-scroll">{resArtists.map(a => (<div key={a.id} className="card" onClick={()=>handleCardClick(a, 'artist')}><img src={getImg(a.image)} alt="" style={{borderRadius:'50%'}}/><h3 style={{textAlign:'center'}}>{getName(a)}</h3></div>))}</div></>)}
                        {resPlaylists.length > 0 && (<><div className="section-header" style={{marginTop:40}}>Playlists</div><div className="horizontal-scroll">{resPlaylists.map(p => (<div key={p.id} className="card" onClick={()=>handleCardClick(p, 'playlist')}><img src={getImg(p.image)} alt=""/><h3>{getName(p)}</h3><p>{p.language}</p></div>))}</div></>)}
                    </div>
                )}

                {tab === 'mood' && selectedItem && (
                    <div className="section">
                        <button className="btn-back" onClick={()=>setTab('home')} style={{marginBottom:30}}><Icons.Back /> Home</button>
                        <div className="details-header" style={{background: selectedItem.color, borderRadius:'24px', padding:'40px', marginBottom:'40px'}}><h1 style={{fontSize:'3rem'}}>{selectedItem.name} Mix</h1><p>Curated Playlists for your mood</p></div>
                        <div className="grid">{moodPlaylists.map(p => (<div key={p.id} className="card" onClick={()=>handleCardClick(p, 'playlist')}><img src={getImg(p.image)} alt=""/><h3>{getName(p)}</h3><p>{p.language}</p></div>))}</div>
                    </div>
                )}

                {tab === 'home' && (
                    <>
                        <div className="hero"><h1>Welcome Back</h1><p>Discover new music, fresh albums, and curated playlists.</p></div>
                        {history.length > 0 && (<div className="section"><div className="section-header">Recently Played</div><div className="horizontal-scroll">{history.map(s => (<div key={s.id} className="card" onClick={()=>playSong(history, history.indexOf(s))}><img src={getImg(s.image)} alt=""/><h3>{getName(s)}</h3></div>))}</div></div>)}
                        <div className="section"><div className="section-header">Moods</div><div className="horizontal-scroll">{MOODS.map(m => (<div key={m.id} className="card" style={{minWidth:'160px', background:m.color, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={()=>handleCardClick(m, 'mood')}><h3 style={{fontSize:'1.2rem', color:'white', textAlign:'center'}}>{m.name}</h3></div>))}</div></div>
                        {homeData.trending.length > 0 && (<div className="section"><div className="section-header">Trending Now</div><div className="horizontal-scroll">{homeData.trending.map(s => (<div key={s.id} className="card" onClick={()=>handleCardClick(s, 'song')}><img src={getImg(s.image)} alt=""/><h3>{getName(s)}</h3><p>{getDesc(s)}</p><div className="card-actions"><button className={`btn-card-action ${isLiked(s.id)?'liked':''}`} onClick={(e)=>{e.stopPropagation(); toggleLike(s)}}><Icons.Heart/></button><button className="btn-card-action" onClick={(e)=>{e.stopPropagation(); setSongToAdd(s); setShowAddToPlaylistModal(true);}}><Icons.Plus/></button></div></div>))}</div></div>)}
                        {homeData.charts.length > 0 && (<div className="section"><div className="section-header">Top Charts</div><div className="horizontal-scroll">{homeData.charts.map(p => (<div key={p.id} className="card" onClick={()=>handleCardClick(p, 'playlist')}><img src={getImg(p.image)} alt=""/><h3>{getName(p)}</h3><p>{p.language}</p></div>))}</div></div>)}
                        {homeData.newAlbums.length > 0 && (<div className="section"><div className="section-header">New Albums</div><div className="horizontal-scroll">{homeData.newAlbums.map(a => (<div key={a.id} className="card" onClick={()=>handleCardClick(a, 'album')}><img src={getImg(a.image)} alt=""/><h3>{getName(a)}</h3><p>{a.year}</p></div>))}</div></div>)}
                        {homeData.radio.length > 0 && (<div className="section"><div className="section-header">Radio Stations</div><div className="horizontal-scroll">{homeData.radio.map(a => (<div key={a.id} className="card" onClick={()=>handleCardClick(a, 'artist')}><img src={getImg(a.image)} alt="" style={{borderRadius:'50%'}}/><h3 style={{textAlign:'center'}}>{getName(a)}</h3><p style={{textAlign:'center', fontSize:'0.8rem'}}>Artist Radio</p></div>))}</div></div>)}
                        {homeData.topArtists.length > 0 && (<div className="section"><div className="section-header">Top Artists</div><div className="horizontal-scroll">{homeData.topArtists.map(a => (<div key={a.id} className="card" onClick={()=>handleCardClick(a, 'artist')}><img src={getImg(a.image)} alt="" style={{borderRadius:'50%'}}/><h3 style={{textAlign:'center'}}>{getName(a)}</h3><p style={{textAlign:'center', fontSize:'0.8rem'}}>Artist</p></div>))}</div></div>)}
                        {homeData.editorial.length > 0 && (<div className="section"><div className="section-header">Editorial Picks</div><div className="horizontal-scroll">{homeData.editorial.map(p => (<div key={p.id} className="card" onClick={()=>handleCardClick(p, 'playlist')}><img src={getImg(p.image)} alt=""/><h3>{getName(p)}</h3><p>Featured</p></div>))}</div></div>)}
                        {homeData.fresh.length > 0 && (<div className="section"><div className="section-header">Fresh Hits</div><div className="horizontal-scroll">{homeData.fresh.map(p => (<div key={p.id} className="card" onClick={()=>handleCardClick(p, 'playlist')}><img src={getImg(p.image)} alt=""/><h3>{getName(p)}</h3><p>New Music</p></div>))}</div></div>)}
                        {homeData.nineties.length > 0 && (<div className="section"><div className="section-header">Best of 90s</div><div className="horizontal-scroll">{homeData.nineties.map(p => (<div key={p.id} className="card" onClick={()=>handleCardClick(p, 'playlist')}><img src={getImg(p.image)} alt=""/><h3>{getName(p)}</h3><p>Nostalgia</p></div>))}</div></div>)}
                        {homeData.hindiPop.length > 0 && (<div className="section"><div className="section-header">New Hindi Pop</div><div className="horizontal-scroll">{homeData.hindiPop.map(a => (<div key={a.id} className="card" onClick={()=>handleCardClick(a, 'album')}><img src={getImg(a.image)} alt=""/><h3>{getName(a)}</h3><p>{a.year}</p></div>))}</div></div>)}
                    </>
                )}

                {tab === 'library' && (
                    <div className="section">
                        <div className="section-header">Liked Songs</div>
                        <div className="grid">
                            {likedSongs.map((s, i) => (
                                <div key={s.id} className="card" onClick={()=>playSong(likedSongs, i)}>
                                    <img src={getImg(s.image)} alt=""/><h3>{getName(s)}</h3><p>{getDesc(s)}</p>
                                    <div className="card-actions" style={{opacity:1}}><button className="btn-card-action liked" onClick={(e)=>{e.stopPropagation(); toggleLike(s)}}><Icons.Heart/></button></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* --- PLAYER BAR --- */}
        <div className={`player-bar ${currentSong ? 'visible' : ''}`} style={{transform: currentSong ? 'translateY(0)' : 'translateY(200px)', transition:'transform 0.3s', zIndex: 100}}>
            {currentSong && (
                <>
                    <div className="p-track" onClick={() => setTheaterMode(!theaterMode)} style={{cursor: 'pointer'}}>
                        <div style={{ position: 'relative', width: '45px', height: '45px', flexShrink: 0, marginRight: '10px' }}>
                            <img src={getImg(currentSong.image)} alt="" className={`spin-anim ${!isPlaying ? 'spin-paused' : ''}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', boxShadow: '0 0 0 3px #111' }} />
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '8px', height: '8px', background: '#222', borderRadius: '50%' }}></div>
                        </div>
                        <div style={{overflow: 'hidden'}}><h4 style={{fontSize:'0.9rem', color:'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0}}>{getName(currentSong)}</h4><p style={{fontSize:'0.8rem', color:'#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0}}>{getDesc(currentSong)}</p></div>
                    </div>
                    
                    <div className="p-center">
                        <div className="p-controls">
                            <button className={`btn-icon ${isShuffle?'active':''}`} onClick={toggleShuffle}><Icons.Shuffle/></button>
                            <button className="btn-icon" onClick={(e)=>{e.stopPropagation(); playSong(queue, qIndex-1)}}><Icons.SkipBack/></button>
                            <button className="btn-play" onClick={(e)=>{e.stopPropagation(); togglePlay()}}>{isPlaying ? <Icons.Pause/> : <Icons.Play/>}</button>
                            <button className="btn-icon" onClick={(e)=>{e.stopPropagation(); playSong(queue, qIndex+1)}}><Icons.SkipFwd/></button>
                            <button className={`btn-icon ${repeatMode!=='none'?'active':''}`} onClick={toggleRepeat}>{repeatMode==='one' ? <Icons.RepeatOne/> : <Icons.Repeat/>}</button>
                        </div>
                        <div className="progress-container">
                            <span>{formatTime(progress)}</span>
                            <div className="progress-rail" onClick={handleSeek} style={{ position: 'relative', overflow: 'hidden' }}>
                                <div className="progress-fill" style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'rgba(255, 255, 255, 0.3)', width: `${duration > 0 ? (bufferProgress / duration) * 100 : 0}%`, transition: 'width 0.2s ease', pointerEvents: 'none' }}></div>
                                <div className="progress-fill" style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${duration > 0 ? (progress / duration) * 100 : 0}%`, pointerEvents: 'none' }}></div>
                            </div>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div> 

                    <div className="p-right">
                        <button className={`btn-icon ${showLyrics?'active':''}`} onClick={fetchLyrics}><Icons.Mic/></button>
                        <button className={`btn-icon ${showQueue?'active':''}`} onClick={()=>setShowQueue(!showQueue)}><Icons.List/></button>
                        <input type="range" className="volume-slider" min="0" max="1" step="0.1" value={volume} onChange={e => { setVolume(e.target.value); audioRef.current.volume=e.target.value; if (ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(e.target.value * 100); }}/>
                        <select className="quality-select" value={quality} onChange={e => handleQualityChange(e.target.value)} style={{ background: 'rgba(255, 255, 255, 0.15)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '20px', padding: '6px 12px', marginLeft: '0', cursor: 'pointer', outline: 'none', fontWeight: '600', fontSize: '0.75rem', backdropFilter: 'blur(10px)' }}>
                            <option value="96kbps" style={{color: 'black'}}>Low</option><option value="160kbps" style={{color: 'black'}}>Medium</option><option value="320kbps" style={{color: 'black'}}>High</option><option value="Premium" style={{color: 'black'}}>Premium</option>
                        </select>
                        <button className="btn-icon" onClick={() => setTheaterMode(!theaterMode)} style={{marginLeft: '0'}}>{theaterMode ? <Icons.Minimize/> : <Icons.Maximize/>}</button>
                    </div>

                    <div className="mobile-controls"> 
                       <button className="btn-icon" onClick={(e)=>{e.stopPropagation(); playSong(queue, qIndex-1)}} style={{color: 'white', padding: 0, background: 'transparent', border: 'none'}}><Icons.SkipBack/></button>
                       <button className="btn-play-mobile" onClick={(e)=>{e.stopPropagation(); togglePlay()}} style={{background: '#d4acfb', color: 'black', border: 'none', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0}}>{isPlaying ? <Icons.Pause/> : <Icons.Play/>}</button>
                       <button className="btn-icon" onClick={(e)=>{e.stopPropagation(); playSong(queue, qIndex+1)}} style={{color: 'white', padding: 0, background: 'transparent', border: 'none'}}><Icons.SkipFwd/></button>
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
