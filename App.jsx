import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import toast, { Toaster } from 'react-hot-toast';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, addDoc, onSnapshot, query } from 'firebase/firestore';
import { API_BASE, APIs, MOODS } from './api';

// ---------- Icons (one path each, drawn on a 24px grid) ----------
const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm10 17-5-5',
  library: 'M4 4v16M9 4v16M14 5l5 15',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  play: 'M6 4l14 8-14 8z',
  pause: 'M7 4h3v16H7zM14 4h3v16h-3z',
  next: 'M5 4l10 8-10 8zM19 5v14',
  prev: 'M19 4 9 12l10 8zM5 5v14',
  shuffle: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  repeat: 'M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  plus: 'M12 5v14M5 12h14',
  queue: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  down: 'M6 9l6 6 6-6',
  volume: 'M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  x: 'M18 6 6 18M6 6l12 12',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  back: 'M19 12H5M12 5l-7 7 7 7',
  expand: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
};
const FILLED = new Set(['play', 'pause', 'next', 'prev']);
const Ic = Object.fromEntries(Object.entries(PATHS).map(([k, d]) => [k, ({ s = 22, fill, ...rest }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill || FILLED.has(k) ? 'currentColor' : 'none'} stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}><path d={d} /></svg>
)]));

// ---------- Constants ----------
const ACC = { rose: '255 93 143', ember: '255 142 66', aurora: '96 224 190', ultra: '139 124 255' };
const NAV = [['home', 'Home', 'home'], ['search', 'Search', 'search'], ['library', 'Library', 'library'], ['profile', 'Settings', 'user']];
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const SLEEP = [0, 15, 30, 60];
const QUALITIES = [['96kbps', 'Low'], ['160kbps', 'Medium'], ['320kbps', 'High'], ['Premium', 'Premium']];
const SHELVES = [
  ['Top charts', 'charts', 'playlist'], ['New albums', 'newAlbums', 'album'], ['Artists to know', 'topArtists', 'artist'],
  ['Editors’ picks', 'editorial', 'playlist'], ['Fresh hits', 'fresh', 'playlist'], ['Best of the 90s', 'nineties', 'playlist'],
  ['New Hindi pop', 'hindiPop', 'album'], ['Artist radio', 'radio', 'artist'],
];
const TOAST = { style: { background: '#1a1a28', color: '#f3f1f8', border: '1px solid rgba(255,255,255,.08)', borderRadius: '14px' } };
const FALLBACK = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#1a1a28"/><circle cx="5" cy="5" r="2" fill="#2c2c44"/></svg>');

// ---------- Helpers ----------
const decode = (s) => { if (typeof s !== 'string' || !s.includes('&')) return s; const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
const getImg = (i) => (Array.isArray(i) ? (i[i.length - 1]?.url || i[0]?.url) : i) || FALLBACK;
const getName = (i) => decode(i?.name || i?.title || 'Unknown');
const getDesc = (i) => decode(i?.primaryArtists || i?.subtitle || i?.year || '');
const subOf = (it, t) => (t === 'artist' ? 'Artist' : t === 'album' ? (it.year || 'Album') : (it.language || 'Playlist'));

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

  const containerRef = useRef(null);

  const currentSongRef = useRef(null);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  // Helpers
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

  const doSearch = async (qq) => {
    const sq = (typeof qq === 'string' ? qq : searchQuery).trim();
    if(!sq) return;
    saveRecent(sq); setSearched(sq);
    setLoading(true); setTab('search');
    
    setResSongs([]); setResAlbums([]); setResArtists([]); setResPlaylists([]);
    
    try {
      if (source === 'saavn') {
          const [s, a, ar, p] = await Promise.all([
            fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(sq)}`).then(r=>r.json()),
            fetch(`${API_BASE}/search/albums?query=${encodeURIComponent(sq)}`).then(r=>r.json()),
            fetch(`${API_BASE}/search/artists?query=${encodeURIComponent(sq)}`).then(r=>r.json()),
            fetch(`${API_BASE}/search/playlists?query=${encodeURIComponent(sq)}`).then(r=>r.json())
          ]);
          setResSongs(s?.data?.results || []); setResAlbums(a?.data?.results || []); setResArtists(ar?.data?.results || []); setResPlaylists(p?.data?.results || []);
      } else {
          // --- REVERTED: Just fetch the single array of songs for all other sources (including current YouTube API) ---
          const songs = await APIs[source].search(sq);
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
    
    if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
      ytPlayerRef.current.pauseVideo();
    }
    
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


  // ───────── Void: new state, effects and actions ─────────
  const [libTab, setLibTab] = useState('playlists');
  const [panel, setPanel] = useState('queue');
  const [pop, setPop] = useState(false);
  const [glow, setGlow] = useState(null);
  const [accent, setAccent] = useState(() => localStorage.getItem('void_accent') || 'rose');
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [sleepMin, setSleepMin] = useState(0);
  const [searched, setSearched] = useState('');
  const [recent, setRecent] = useState(() => JSON.parse(localStorage.getItem('void_recent') || '[]'));
  const lyricsFor = useRef(null);
  const searchRef = useRef(null);
  const lastMain = useRef('home');
  const keysRef = useRef(() => {});

  const saveRecent = (q) => {
    const r = [q, ...recent.filter((x) => x !== q)].slice(0, 8);
    setRecent(r); localStorage.setItem('void_recent', JSON.stringify(r));
  };

  useEffect(() => {
    if (['home', 'search', 'library', 'profile'].includes(tab)) lastMain.current = tab;
    containerRef.current?.scrollTo({ top: 0 });
  }, [tab, selectedItem?.id]);

  useEffect(() => { localStorage.setItem('void_accent', accent); }, [accent]);

  // Re-run the current search when the source changes
  useEffect(() => { if (searched) doSearch(searched); }, [source]);

  // Ambient light: sample the artwork's colourful pixels for the glow
  useEffect(() => {
    const u = currentSong && getImg(currentSong.image);
    if (!u || u === FALLBACK) { setGlow(null); return; }
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 16;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0, 16, 16);
        const d = x.getImageData(0, 0, 16, 16).data; let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          const hi = Math.max(d[i], d[i + 1], d[i + 2]), lo = Math.min(d[i], d[i + 1], d[i + 2]);
          if (hi - lo < 40 || hi < 60) continue;
          r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
        }
        setGlow(n ? `${(r / n) | 0} ${(g / n) | 0} ${(b / n) | 0}` : null);
      } catch { setGlow(null); }
    };
    im.onerror = () => setGlow(null);
    im.src = u;
  }, [currentSong?.id]);

  // Sleep timer
  useEffect(() => {
    if (!sleepMin) return;
    const t = setTimeout(() => {
      audioRef.current.pause(); ytPlayerRef.current?.pauseVideo?.();
      setIsPlaying(false); setSleepMin(0); toast('Sleep timer ended. Playback paused.');
    }, sleepMin * 60000);
    return () => clearTimeout(t);
  }, [sleepMin]);

  const applySleep = (m) => { setSleepMin(m); toast(m ? `Playback pauses in ${m} min` : 'Sleep timer off'); };
  const applySpeed = (s) => {
    setSpeed(s); audioRef.current.playbackRate = s; audioRef.current.defaultPlaybackRate = s;
    ytPlayerRef.current?.setPlaybackRate?.(s);
  };
  const toggleMute = () => {
    const m = !muted; setMuted(m); audioRef.current.muted = m;
    const y = ytPlayerRef.current; if (y?.mute) (m ? y.mute() : y.unMute());
  };
  const changeVol = (v) => {
    setVolume(v); audioRef.current.volume = v; ytPlayerRef.current?.setVolume?.(v * 100);
    if (muted && v > 0) toggleMute();
  };
  const seekTo = (t) => {
    if (currentSong?.source === 'youtube') ytPlayerRef.current?.seekTo(t, true); else audioRef.current.currentTime = t;
    setProgress(t);
  };

  // Lyrics + queue panel (Now Playing)
  const openPanel = async (p) => {
    setTheaterMode(true); setPanel(p); setPop(true);
    if (p !== 'lyrics' || !currentSong || lyricsFor.current === currentSong.id) return;
    lyricsFor.current = currentSong.id; setLyricsText('');
    if (currentSong.source && currentSong.source !== 'saavn') { setLyricsText('Lyrics are only available for JioSaavn tracks.'); return; }
    try {
      const r = await fetch(`${API_BASE}/lyrics?id=${currentSong.id}`).then((x) => x.json());
      setLyricsText(r?.data?.lyrics?.replace(/<br\s*\/?>/g, '\n') || 'No lyrics found for this track.');
    } catch { setLyricsText('Couldn’t load lyrics. Check your connection and try again.'); }
  };
  useEffect(() => { if (panel === 'lyrics' && theaterMode) openPanel('lyrics'); }, [currentSong?.id]);

  // Queue + playlist actions
  const playNext = (s) => {
    if (!currentSong) return playSong([s], 0);
    const q = [...queue]; q.splice(qIndex + 1, 0, s); setQueue(q); toast.success('Plays next');
  };
  const addToQueue = (s) => {
    if (!currentSong) return playSong([s], 0);
    setQueue([...queue, s]); toast.success('Added to queue');
  };
  const playShuffled = (list) => { if (list.length) playSong([...list].sort(() => Math.random() - 0.5), 0); };
  const deletePlaylist = async (pl) => {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/playlists/${pl.id}`));
      toast.success('Playlist deleted'); setSelectedItem(null); setLibTab('playlists'); setTab('library');
    } catch { toast.error('Couldn’t delete the playlist'); }
  };
  const removeFromPlaylist = async (pl, song) => {
    try {
      await updateDoc(doc(db, `users/${user.uid}/playlists/${pl.id}`), { songs: arrayRemove(song) });
      setDetailsSongs((d) => d.filter((x) => x !== song)); toast('Removed from playlist');
    } catch { toast.error('Couldn’t remove the song'); }
  };

  // Keyboard: / search, arrows seek, n/p skip, m mute, Esc closes Now Playing
  keysRef.current = (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    else if (e.key === 'Escape') setTheaterMode(false);
    else if (!currentSong) return;
    else if (e.key === 'ArrowRight') seekTo(Math.min(duration, progress + 10));
    else if (e.key === 'ArrowLeft') seekTo(Math.max(0, progress - 10));
    else if (e.key === 'n') playSong(queue, qIndex + 1);
    else if (e.key === 'p') playSong(queue, qIndex - 1);
    else if (e.key === 'm') toggleMute();
  };
  useEffect(() => {
    const h = (e) => keysRef.current(e);
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  if (view === 'loading') return <div className="splash"><span>void</span></div>;

  if (view === 'auth') return (
    <div className="auth">
      <Toaster toastOptions={TOAST} />
      <section className="auth-art">
        <div className="mark">void</div>
        <p>Every source, one queue. Search JioSaavn, Apple Music, SoundCloud, Qobuz and YouTube from a single place.</p>
      </section>
      <section className="auth-form">
        <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
          <h1>{authMode === 'login' ? 'Sign in to Void' : 'Create your account'}</h1>
          <label>Email<input type="email" autoComplete="email" required value={authInput.email} onChange={(e) => setAuthInput({ ...authInput, email: e.target.value })} /></label>
          <label>Password<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required minLength={6} value={authInput.password} onChange={(e) => setAuthInput({ ...authInput, password: e.target.value })} /></label>
          <button className="btn pri" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'}</button>
          <button type="button" className="link" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
            {authMode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </button>
        </form>
      </section>
    </div>
  );

  // ---------- derived values ----------
  const pct = duration ? (progress / duration) * 100 : 0;
  const bpct = Math.max(pct, duration ? (bufferProgress / duration) * 100 : 0);
  const hr = new Date().getHours();
  const greet = hr < 5 ? 'Good night' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const feat = homeData.trending[0];
  const isCustom = !!selectedItem && userPlaylists.some((p) => p.id === selectedItem.id);
  const noResults = !loading && searched && !resSongs.length && !resAlbums.length && !resArtists.length && !resPlaylists.length;
  const navTab = ['details', 'mood'].includes(tab) ? lastMain.current : tab;
  const liveLiked = currentSong && isLiked(currentSong.id);

  // ---------- render helpers ----------
  const skeleton = (n = 6) => <div className="scroller">{Array.from({ length: n }, (_, i) => <div key={i} className="card"><div className="cover sk" /><div className="sk-line sk" /></div>)}</div>;

  const card = (it, type) => (
    <article key={it.id} className={`card${type === 'artist' ? ' artist' : ''}`} tabIndex={0}
      onClick={() => handleCardClick(it, type)} onKeyDown={(e) => e.key === 'Enter' && handleCardClick(it, type)}>
      <div className={`cover${type === 'artist' ? ' round' : ''}`}><img src={getImg(it.image)} alt="" loading="lazy" /></div>
      <h3>{getName(it)}</h3><p>{subOf(it, type)}</p>
    </article>
  );

  const shelf = (title, items, type) => items?.length > 0 && (
    <section className="shelf" key={title}><h2>{title}</h2><div className="scroller">{items.map((it) => card(it, type))}</div></section>
  );

  const row = (s, i, list, o = {}) => {
    const on = currentSong && String(currentSong.id) === String(s.id);
    const liked = isLiked(s.id);
    return (
      <div key={`${s.id}-${i}`} className={`row${on ? ' on' : ''}`}>
        <button className="row-main" onClick={() => playSong(list, i)}>
          <span className="idx">{on && isPlaying ? <span className="eq"><i /><i /><i /></span> : <><b>{i + 1}</b><Ic.play s={14} /></>}</span>
          <img src={getImg(s.image)} alt="" loading="lazy" />
          <span className="meta"><b>{getName(s)}</b><small>{getDesc(s)}</small></span>
        </button>
        <div className="row-acts">
          <button className={liked ? 'on' : ''} aria-label={liked ? 'Remove from liked songs' : 'Like'} onClick={() => toggleLike(s)}><Ic.heart s={18} fill={liked} /></button>
          <button aria-label="Add to playlist" onClick={() => { setSongToAdd(s); setShowAddToPlaylistModal(true); }}><Ic.plus s={18} /></button>
          <button aria-label="Play next" onClick={() => playNext(s)}><Ic.queue s={18} /></button>
          {o.remove && <button aria-label="Remove from playlist" onClick={() => o.remove(s)}><Ic.trash s={17} /></button>}
        </div>
        <span className="dur">{formatTime(s.duration)}</span>
      </div>
    );
  };

  const ctl = (
    <div className="ctl">
      <button className={isShuffle ? 'on' : ''} aria-label="Shuffle" aria-pressed={isShuffle} onClick={toggleShuffle}><Ic.shuffle s={19} /></button>
      <button aria-label="Previous" onClick={() => playSong(queue, qIndex - 1)}><Ic.prev s={20} /></button>
      <button className="play" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay}>{isPlaying ? <Ic.pause s={22} /> : <Ic.play s={22} />}</button>
      <button aria-label="Next" onClick={() => playSong(queue, qIndex + 1)}><Ic.next s={20} /></button>
      <button className={repeatMode !== 'none' ? 'on' : ''} aria-label={`Repeat: ${repeatMode}`} onClick={toggleRepeat}><Ic.repeat s={19} />{repeatMode === 'one' && <sup>1</sup>}</button>
    </div>
  );

  const scrub = (
    <div className="scrub-wrap">
      <span>{formatTime(progress)}</span>
      <input className="scrub" type="range" aria-label="Seek" min="0" max={duration || 0} step="1" value={Math.min(progress, duration || 0)}
        style={{ '--p': `${pct}%`, '--b': `${bpct}%` }} onChange={(e) => seekTo(+e.target.value)} onPointerUp={(e) => e.currentTarget.blur()} />
      <span>{formatTime(duration)}</span>
    </div>
  );

  const vol = muted ? 0 : volume;

  return (
    <div className="shell" style={{ '--ar': ACC[accent], '--glow': glow || ACC[accent] }}>
      <Toaster position="top-center" toastOptions={TOAST} />
      <div key={glow || 'default'} className="aura" />
      <div id="hidden-yt-player" style={{ position: 'absolute', top: '-1000px', width: '1px', height: '1px' }} />

      {/* Rail (desktop) */}
      <nav className="rail" aria-label="Main">
        <div className="logo">void</div>
        {NAV.map(([k, label, ic]) => { const I = Ic[ic]; return (
          <button key={k} className={navTab === k ? 'on' : ''} aria-current={navTab === k ? 'page' : undefined} onClick={() => setTab(k)}><I /><span>{label}</span></button>
        ); })}
      </nav>

      <main className="main" ref={containerRef}>
        <header className="top">
          <div className="m-logo">void</div>
          <label className="search">
            <Ic.search s={18} />
            <input ref={searchRef} aria-label="Search music" placeholder={`Search ${APIs[source].name}`} value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} />
            {searchQuery && <button type="button" aria-label="Clear search" onClick={() => setSearchQuery('')}><Ic.x s={16} /></button>}
          </label>
        </header>

        <div className="page">
          {/* HOME */}
          {tab === 'home' && (<>
            <h1 className="h1">{greet}</h1>
            {feat ? (
              <section className="feat">
                <img src={getImg(feat.image)} alt="" />
                <div>
                  <h2>{getName(feat)}</h2><p>{getDesc(feat)}</p>
                  <div className="acts">
                    <button className="btn pri" onClick={() => playSong(homeData.trending, 0)}><Ic.play s={18} />Play trending</button>
                    <button className="btn" onClick={() => addToQueue(feat)}><Ic.queue s={18} />Add to queue</button>
                  </div>
                </div>
              </section>
            ) : loading && <div className="feat sk" style={{ height: 260 }} />}

            {history.length > 0 && (
              <section className="shelf"><h2>Jump back in</h2>
                <div className="quick">{history.slice(0, 6).map((s, i) => (
                  <button key={s.id} className="tile" onClick={() => playSong(history, i)}><img src={getImg(s.image)} alt="" /><span>{getName(s)}</span></button>
                ))}</div>
              </section>
            )}

            <section className="shelf"><h2>Pick a mood</h2>
              <div className="chips">{MOODS.map((m) => <button key={m.id} className="chip" style={{ '--c': m.color }} onClick={() => handleCardClick(m, 'mood')}><i />{m.name}</button>)}</div>
            </section>

            {homeData.trending.length > 0 && (
              <section className="shelf"><h2>Trending now</h2>
                <div className="rows">{homeData.trending.slice(0, 10).map((s, i) => row(s, i, homeData.trending))}</div>
              </section>
            )}

            {loading && !homeData.charts.length && <section className="shelf"><h2>Top charts</h2>{skeleton()}</section>}
            {SHELVES.map(([t, k, ty]) => shelf(t, homeData[k], ty))}
          </>)}

          {/* SEARCH */}
          {tab === 'search' && (<>
            <h1 className="h1">Search</h1>
            <div className="chips" role="tablist" aria-label="Music source">
              {Object.entries(APIs).map(([k, a]) => (
                <button key={k} role="tab" aria-selected={source === k} className={`chip${source === k ? ' on' : ''}`} onClick={() => setSource(k)}>{a.name}</button>
              ))}
            </div>
            {!searched && !loading && (<>
              {recent.length > 0 && (
                <section className="shelf"><h2>Recent searches</h2>
                  <div className="chips">{recent.map((r) => <button key={r} className="chip" onClick={() => { setSearchQuery(r); doSearch(r); }}>{r}</button>)}</div>
                </section>
              )}
              <section className="shelf"><h2>Browse by mood</h2>
                <div className="moods">{MOODS.map((m) => <button key={m.id} className="mood" style={{ '--c': m.color }} onClick={() => handleCardClick(m, 'mood')}>{m.name}</button>)}</div>
              </section>
            </>)}
            {loading && <section className="shelf">{skeleton()}</section>}
            {resSongs.length > 0 && <section className="shelf"><h2>Songs</h2><div className="rows one">{resSongs.map((s, i) => row(s, i, resSongs))}</div></section>}
            {shelf('Albums', resAlbums, 'album')}{shelf('Artists', resArtists, 'artist')}{shelf('Playlists', resPlaylists, 'playlist')}
            {noResults && <p className="empty">Nothing found for “{searched}” on {APIs[source].name}. Try another source or a different spelling.</p>}
          </>)}

          {/* MOOD */}
          {tab === 'mood' && selectedItem && (<>
            <button className="back" onClick={() => setTab(lastMain.current)}><Ic.back s={18} />Back</button>
            <header className="mood-head" style={{ '--c': selectedItem.color }}><h1 className="h1">{selectedItem.name}</h1><p>Playlists picked for this mood.</p></header>
            {loading ? skeleton() : <div className="grid">{moodPlaylists.map((p) => card(p, 'playlist'))}</div>}
          </>)}

          {/* DETAILS */}
          {tab === 'details' && selectedItem && (<>
            <button className="back" onClick={() => setTab(lastMain.current)}><Ic.back s={18} />Back</button>
            <div className="detail">
              <aside>
                <img src={getImg(selectedItem.image || selectedItem.songs?.[0]?.image)} alt="" />
                <h1 className="h1">{getName(selectedItem)}</h1>
                <p className="sub">{selectedItem.songs ? `${detailsSongs.length} songs` : getDesc(selectedItem)}</p>
                <div className="acts">
                  <button className="btn pri" disabled={!detailsSongs.length} onClick={() => playSong(detailsSongs, 0)}><Ic.play s={18} />Play</button>
                  <button className="btn" disabled={!detailsSongs.length} onClick={() => playShuffled(detailsSongs)}><Ic.shuffle s={18} />Shuffle</button>
                  {isCustom && <button className="btn danger" onClick={() => deletePlaylist(selectedItem)}><Ic.trash s={18} />Delete</button>}
                </div>
              </aside>
              <div>
                {loading ? skeleton(4)
                  : detailsSongs.length ? <div className="rows one">{detailsSongs.map((s, i) => row(s, i, detailsSongs, isCustom ? { remove: (x) => removeFromPlaylist(selectedItem, x) } : {}))}</div>
                  : <p className="empty">No songs here yet. Use the plus button on any song to add it to this playlist.</p>}
              </div>
            </div>
          </>)}

          {/* LIBRARY */}
          {tab === 'library' && (<>
            <h1 className="h1">Your library</h1>
            <div className="seg" role="tablist">
              <button role="tab" aria-selected={libTab === 'playlists'} className={libTab === 'playlists' ? 'on' : ''} onClick={() => setLibTab('playlists')}>Playlists</button>
              <button role="tab" aria-selected={libTab === 'liked'} className={libTab === 'liked' ? 'on' : ''} onClick={() => setLibTab('liked')}>Liked songs</button>
            </div>
            {libTab === 'playlists' ? (
              <div className="grid lib">
                <button className="card new" onClick={() => setShowPlaylistModal(true)}><div className="cover"><Ic.plus s={30} /></div><h3>New playlist</h3></button>
                {userPlaylists.map((pl) => (
                  <article key={pl.id} className="card" tabIndex={0} onClick={() => handleCardClick(pl, 'playlist_custom')} onKeyDown={(e) => e.key === 'Enter' && handleCardClick(pl, 'playlist_custom')}>
                    <div className="cover collage">{(pl.songs || []).slice(0, 4).map((s, i) => <img key={i} src={getImg(s.image)} alt="" />)}</div>
                    <h3>{pl.name}</h3><p>{(pl.songs || []).length} songs</p>
                  </article>
                ))}
              </div>
            ) : (<>
              <div className="acts" style={{ margin: '20px 0' }}>
                <button className="btn pri" disabled={!likedSongs.length} onClick={() => playSong(likedSongs, 0)}><Ic.play s={18} />Play all</button>
                <button className="btn" disabled={!likedSongs.length} onClick={() => playShuffled(likedSongs)}><Ic.shuffle s={18} />Shuffle</button>
              </div>
              {likedSongs.length ? <div className="rows one">{likedSongs.map((s, i) => row(s, i, likedSongs))}</div>
                : <p className="empty">Songs you like show up here. Tap the heart on any song to save it.</p>}
            </>)}
          </>)}

          {/* SETTINGS */}
          {tab === 'profile' && (
            <div className="set">
              <header className="me"><div className="avatar">{user.email[0].toUpperCase()}</div><div><h1 className="h1" style={{ margin: 0 }}>Settings</h1><p className="sub">{user.email}</p></div></header>
              <section><h2>Your library</h2>
                <div className="set-row"><span>Liked songs</span><b>{likedSongs.length}</b></div>
                <div className="set-row"><span>Playlists</span><b>{userPlaylists.length}</b></div>
                <div className="set-row"><span>Played recently</span><b>{history.length}</b></div>
              </section>
              <section><h2>Accent color</h2>
                <div className="set-row"><span>Used for buttons and highlights</span>
                  <div className="chips">{Object.entries(ACC).map(([k, c]) => <button key={k} className={`sw${accent === k ? ' on' : ''}`} style={{ '--c': c }} aria-label={k} aria-pressed={accent === k} onClick={() => setAccent(k)} />)}</div>
                </div>
              </section>
              <section><h2>Playback</h2>
                <div className="set-row"><span>Audio quality</span><div className="chips">{QUALITIES.map(([k, l]) => <button key={k} className={`chip${quality === k ? ' on' : ''}`} onClick={() => handleQualityChange(k)}>{l}</button>)}</div></div>
                <div className="set-row"><span>Speed</span><div className="chips">{SPEEDS.map((s) => <button key={s} className={`chip${speed === s ? ' on' : ''}`} onClick={() => applySpeed(s)}>{s}×</button>)}</div></div>
                <div className="set-row"><span>Sleep timer</span><div className="chips">{SLEEP.map((m) => <button key={m} className={`chip${sleepMin === m ? ' on' : ''}`} onClick={() => applySleep(m)}>{m ? `${m} min` : 'Off'}</button>)}</div></div>
              </section>
              <section><h2>Keyboard shortcuts</h2>
                <div className="set-row"><span>Play or pause</span><kbd>Space</kbd></div>
                <div className="set-row"><span>Seek 10 seconds</span><kbd>← →</kbd></div>
                <div className="set-row"><span>Next or previous</span><kbd>N / P</kbd></div>
                <div className="set-row"><span>Mute</span><kbd>M</kbd></div>
                <div className="set-row"><span>Focus search</span><kbd>/</kbd></div>
              </section>
              <button className="btn danger" onClick={() => signOut(auth)}>Sign out</button>
            </div>
          )}
        </div>
      </main>

      {/* Dock */}
      {currentSong && (
        <div className="dock">
          <i className="dock-line" style={{ width: `${pct}%` }} />
          <button className="dock-track" onClick={() => setTheaterMode(true)} aria-label="Open now playing">
            <img src={getImg(currentSong.image)} alt="" />
            <span className="meta"><b>{getName(currentSong)}</b><small>{getDesc(currentSong)}</small></span>
          </button>
          <div className="dock-center">{ctl}{scrub}</div>
          <div className="dock-right">
            <button className={liveLiked ? 'on' : ''} aria-label="Like" onClick={() => toggleLike(currentSong)}><Ic.heart s={19} fill={liveLiked} /></button>
            <button aria-label="Lyrics" onClick={() => openPanel('lyrics')}><Ic.mic s={19} /></button>
            <button aria-label="Queue" onClick={() => openPanel('queue')}><Ic.queue s={19} /></button>
            <button className={muted ? 'on' : ''} aria-label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}><Ic.volume s={19} /></button>
            <input className="scrub vol" type="range" aria-label="Volume" min="0" max="1" step="0.05" value={vol}
              style={{ '--p': `${vol * 100}%`, '--b': `${vol * 100}%` }} onChange={(e) => changeVol(+e.target.value)} onPointerUp={(e) => e.currentTarget.blur()} />
            <button aria-label="Open now playing" onClick={() => setTheaterMode(true)}><Ic.expand s={19} /></button>
          </div>
          <div className="dock-m ctl">
            <button className="play" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay}>{isPlaying ? <Ic.pause s={22} /> : <Ic.play s={22} />}</button>
            <button aria-label="Next" onClick={() => playSong(queue, qIndex + 1)}><Ic.next s={20} /></button>
          </div>
        </div>
      )}

      {/* Now playing */}
      <section className={`np${theaterMode ? ' open' : ''}${pop ? ' pop' : ''}`} aria-hidden={!theaterMode} aria-label="Now playing">
        <button className="np-close" aria-label="Close now playing" onClick={() => setTheaterMode(false)}><Ic.down s={26} /></button>
        {currentSong && (<>
          <div className="np-stage">
            <div className="sleeve">
              <div className="vinyl"><div className={`disc${isPlaying ? '' : ' paused'}`}><img src={getImg(currentSong.image)} alt="" /></div></div>
              <img className="sleeve-art" src={getImg(currentSong.image)} alt="" />
            </div>
            <div className="np-title"><h2>{getName(currentSong)}</h2><p>{getDesc(currentSong)}</p></div>
            {scrub}
            <div className="big">{ctl}</div>
            <div className="np-tools">
              <button aria-label="Playback speed" onClick={() => applySpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>{speed}×</button>
              <button className={sleepMin ? 'on' : ''} aria-label="Sleep timer" onClick={() => applySleep(SLEEP[(SLEEP.indexOf(sleepMin) + 1) % SLEEP.length])}><Ic.moon s={17} />{sleepMin ? `${sleepMin} min` : 'Sleep'}</button>
              <button className={liveLiked ? 'on' : ''} onClick={() => toggleLike(currentSong)}><Ic.heart s={17} fill={liveLiked} />Like</button>
              <button onClick={() => openPanel('lyrics')}><Ic.mic s={17} />Lyrics</button>
              <button onClick={() => openPanel('queue')}><Ic.queue s={17} />Queue</button>
            </div>
          </div>
          <aside className="np-panel">
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={panel === 'queue'} className={panel === 'queue' ? 'on' : ''} onClick={() => setPanel('queue')}>Up next</button>
              <button role="tab" aria-selected={panel === 'lyrics'} className={panel === 'lyrics' ? 'on' : ''} onClick={() => openPanel('lyrics')}>Lyrics</button>
              <button className="panel-x" aria-label="Close panel" onClick={() => setPop(false)}><Ic.x s={20} /></button>
            </div>
            <div className="panel-body">
              {panel === 'lyrics' ? <div className="lyrics">{lyricsText || 'Loading lyrics…'}</div>
                : queue.map((s, i) => (
                  <div key={`${s.id}-${i}`} className={`row q${i === qIndex ? ' on' : ''}`}>
                    <button className="row-main" onClick={() => playSong(queue, i)}>
                      <img src={getImg(s.image)} alt="" /><span className="meta"><b>{getName(s)}</b><small>{getDesc(s)}</small></span>
                    </button>
                    <div className="row-acts"><button aria-label="Remove from queue" onClick={() => removeFromQueue(i)}><Ic.x s={16} /></button></div>
                  </div>
                ))}
            </div>
          </aside>
        </>)}
      </section>

      {/* Mobile nav */}
      <nav className="bnav" aria-label="Main">
        {NAV.map(([k, label, ic]) => { const I = Ic[ic]; return (
          <button key={k} className={navTab === k ? 'on' : ''} aria-current={navTab === k ? 'page' : undefined} onClick={() => setTab(k)}><I s={22} /><span>{label}</span></button>
        ); })}
      </nav>

      {/* Modals */}
      {showPlaylistModal && (
        <div className="modal" onClick={() => setShowPlaylistModal(false)}>
          <form className="modal-box" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); createPlaylist(); }}>
            <h2>New playlist</h2>
            <input autoFocus aria-label="Playlist name" placeholder="Give it a name" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} />
            <div className="acts"><button type="button" className="btn" onClick={() => setShowPlaylistModal(false)}>Cancel</button><button type="submit" className="btn pri">Create playlist</button></div>
          </form>
        </div>
      )}
      {showAddToPlaylistModal && (
        <div className="modal" onClick={() => setShowAddToPlaylistModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>Add to playlist</h2>
            {userPlaylists.length ? (
              <div className="pick">{userPlaylists.map((pl) => (
                <button key={pl.id} onClick={() => addToPlaylist(pl.id)}><span className="pick-ic"><Ic.library s={18} /></span>{pl.name}</button>
              ))}</div>
            ) : <p className="empty">You don’t have any playlists yet.</p>}
            <div className="acts">
              <button className="btn" onClick={() => setShowAddToPlaylistModal(false)}>Cancel</button>
              <button className="btn pri" onClick={() => { setShowAddToPlaylistModal(false); setShowPlaylistModal(true); }}><Ic.plus s={18} />New playlist</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
