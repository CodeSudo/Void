import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import toast, { Toaster } from 'react-hot-toast';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, addDoc, onSnapshot, query, getDocs, where, deleteField, increment } from 'firebase/firestore';
import { API_BASE, APIs, MOODS, fetchLaunch, fetchJson, resolveSong } from './api';
import { Ic } from './icons';
import Backdrop from './Backdrop';
import Modal from './Modal';
import { AuthScreen, SignedOutScreen } from './Auth';
import Plans, { fmtDate } from './Plans';
import { PAY_API, payFetch, loadRazorpay, openCheckout } from './pay';
import Lyrics from './Lyrics';
import Sound from './Sound';
import { fetchSyncedLyrics } from './lrc';
import { fadeVolume, createEq, EQ_PRESETS } from './audioFx';
import { saveResume, loadResume, parseShareHash, shareUrl, toShareDoc, trimSong, artistIdOf, firstArtistName, imageUrl, mergeStats, statsUpdate, topOf, fmtDuration } from './userdata';
import { registerSW, useOnline, useInstall } from './pwa';
import AdBreak from './AdBreak';
import { loadAds, pickAd, createAdGate } from './ads';

// ---------- Constants ----------
const ACC = { rose: '255 93 143', ember: '255 142 66', aurora: '96 224 190', ultra: '139 124 255' };
const NAV = [['home', 'Home', 'home'], ['search', 'Search', 'search'], ['library', 'Library', 'library'], ['plans', 'Plans', 'star'], ['profile', 'Settings', 'user']];
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const LANGS = ['hindi', 'english', 'punjabi', 'tamil', 'telugu', 'marathi', 'gujarati', 'bengali', 'kannada', 'malayalam', 'bhojpuri', 'haryanvi'];
const TYPE_LABEL = { song: 'Song', album: 'Album', playlist: 'Playlist', artist: 'Artist', radio_station: 'Radio', mix: 'Mix', channel: 'Channel', show: 'Podcast' };
const SLEEP = [0, 15, 30, 60];
const QUALITIES = [['96kbps', 'Low'], ['160kbps', 'Medium'], ['320kbps', 'High'], ['Premium', 'Premium']];
const SHELVES = [
  ['Top charts', 'charts', 'playlist'], ['New albums', 'newAlbums', 'album'], ['Artists to know', 'topArtists', 'artist'],
  ['Editors’ picks', 'editorial', 'playlist'], ['Fresh hits', 'fresh', 'playlist'], ['Best of the 90s', 'nineties', 'playlist'],
  ['New Hindi pop', 'hindiPop', 'album'], ['Artist radio', 'radio', 'artist'],
];
const TOAST = { style: { background: '#1a1a28', color: '#f3f1f8', border: '1px solid rgba(255,255,255,.08)', borderRadius: '14px' } };
const AUTH_ERRORS = {
  'auth/invalid-credential': 'That email and password don’t match.', 'auth/invalid-login-credentials': 'That email and password don’t match.',
  'auth/user-not-found': 'That email and password don’t match.', 'auth/wrong-password': 'That email and password don’t match.',
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
  'auth/weak-password': 'Choose a password with at least 6 characters.', 'auth/invalid-email': 'That doesn’t look like a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.', 'auth/user-disabled': 'This account has been disabled.',
  'auth/network-request-failed': 'Couldn’t reach the server. Check your connection and try again.',
};
const LYRICS_PROXY = PAY_API ? PAY_API.replace(/\/pay$/, '/lyrics') : '';
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const compact = (n) => new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(n);
const randomOther = (n, cur) => { if (n < 2) return 0; let r; do { r = Math.floor(Math.random() * n); } while (r === cur); return r; };
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

  const fetchHomeFallback = async () => {
    setLoading(true);
    try {
      const results = await Promise.all([
        fetchJson(`${API_BASE}/search/songs?query=Top 50&limit=15`),
        fetchJson(`${API_BASE}/search/playlists?query=Top Charts&limit=15`),
        fetchJson(`${API_BASE}/search/albums?query=New&limit=15`),
        fetchJson(`${API_BASE}/search/playlists?query=Editors Pick&limit=15`),
        fetchJson(`${API_BASE}/search/artists?query=Best&limit=15`), 
        fetchJson(`${API_BASE}/search/artists?query=Top Artists&limit=15`),
        fetchJson(`${API_BASE}/search/playlists?query=Love&limit=15`),
        fetchJson(`${API_BASE}/search/playlists?query=Fresh Hits&limit=15`),
        fetchJson(`${API_BASE}/search/playlists?query=90s Bollywood&limit=15`),
        fetchJson(`${API_BASE}/search/albums?query=New Hindi Pop&limit=15`)
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
  const playSong = async (list, idx, opts = {}) => {
    if(!list || !list[idx]) return;
    if (adOpen.current && !opts.afterAd) { pendingAd.current = { list, idx, opts }; return; } // an ad is on screen: remember the latest request
    if (!opts.afterAd && adDue()) { openAd({ list, idx, opts }); return; }
    setQueue(list); setQIndex(idx);
    const s = list[idx];
    const resumeAt = pendingLoad.current && String(s.id) === String(currentSongRef.current?.id) ? pendingSeek.current : 0;
    pendingLoad.current = false; pendingSeek.current = 0;
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
        ytPlayerRef.current.loadVideoById(resumeAt > 1 ? { videoId: s.id, startSeconds: resumeAt } : s.id);
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
        // crossfade: the playing element keeps fading out while the other one takes over
        const fadeFrom = opts.fade && !audioRef.current.paused && audioRef.current.getAttribute('src') ? swapForCrossfade() : null;
        ensureElement(s);
        const el = audioRef.current;
        if(fadeFrom || el.src !== url) {
            el.src = url;
            el.volume = fadeFrom ? 0 : volumeRef.current;
            el.play().catch(()=>{});
            setIsPlaying(true);
        } else { el.play(); setIsPlaying(true); }
        if (fadeFrom) startFades(fadeFrom, el);
        if (resumeAt > 1) seekWhenReady(el, resumeAt);
    } else { toast.error("Audio unavailable"); }
  };

  const handleQualityChange = (newQ) => {
    setQuality(newQ);
    if(currentSong && isPlaying) { playSong(queue, qIndex); toast.success(`Quality set to ${newQ}`); }
  };

  const togglePlay = () => {
    if (adOpen.current) return; // keys and media buttons do nothing while an ad is showing
    if (pendingLoad.current && currentSong) { playSong(queue, qIndex); return; } // restored from last visit: load it now
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
            image: item.image||[], downloadUrl: item.downloadUrl||[], duration: item.duration||0, source: item.source || 'saavn', artistId: artistIdOf(item)
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
    if (itemType === 'artist') return openArtist({ id: item.id, name: getName(item), image: item.image });
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
                    const data = userSnap.data(); setPlan(data.plan || null); setFollowed(data.followedArtists || []); setStats(data.stats || null);
                    setLikedSongs(data.likedSongs || []);
                    setHistory(data.history || []);
                }
                else { await setDoc(doc(db, "users", u.uid), { email: u.email, likedSongs: [], history: [] }); setPlan(null); }
                const q = query(collection(db, `users/${u.uid}/playlists`));
                plUnsub.current?.(); plUnsub.current = onSnapshot(q, (snapshot) => setUserPlaylists(snapshot.docs.map(d => ({id: d.id, ...d.data()}))));
            } catch { setPlan((p) => (p === undefined ? null : p)); }
        } else { 
            setUser(null); setPlan(undefined); setFollowed([]); setStats(null); setPayments({ status: 'idle', items: [] }); plUnsub.current?.(); setLikedSongs([]); setUserPlaylists([]); setView(signingOut.current ? 'signedout' : 'auth'); signingOut.current = false; 
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
        if(['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(e.target.tagName) || e.target.isContentEditable) return;
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
  const [launch, setLaunch] = useState([]);
  const [launchErr, setLaunchErr] = useState('');
  const [launchBusy, setLaunchBusy] = useState(false);
  const [langs, setLangs] = useState(() => JSON.parse(localStorage.getItem('void_langs') || '["hindi","english"]'));

  const saveRecent = (q) => {
    const r = [q, ...recent.filter((x) => x !== q)].slice(0, 8);
    setRecent(r); localStorage.setItem('void_recent', JSON.stringify(r));
  };

  useEffect(() => {
    if (['home', 'search', 'library', 'plans', 'profile'].includes(tab)) lastMain.current = tab;
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

  const applySleep = (m) => { if (m && !member) return upsell('The sleep timer'); setSleepMin(m); toast(m ? `Playback pauses in ${m} min` : 'Sleep timer off'); };
  const applySpeed = (s) => {
    if (s !== 1 && !member) return upsell('Playback speed');
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
    if (pendingLoad.current) { pendingSeek.current = t; setProgress(t); return; }
    if (currentSong?.source === 'youtube') ytPlayerRef.current?.seekTo(t, true); else audioRef.current.currentTime = t;
    setProgress(t);
  };

  // Lyrics + queue panel (Now Playing)
  const openPanel = (p) => { setTheaterMode(true); setPanel(p); setPop(true); if (p === 'lyrics') loadLyrics(currentSong); };
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

  // ───────── Plans and payments ─────────
  const [plan, setPlan] = useState(undefined); // undefined = still loading, null = no plan
  const [plansList, setPlansList] = useState([]);
  const [plansState, setPlansState] = useState(PAY_API ? 'idle' : 'off');
  const [plansErr, setPlansErr] = useState('');
  const [payBusy, setPayBusy] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  const member = !!plan && plan.expiresAt > now;
  const accentEff = member || plan === undefined ? accent : 'rose';

  const upsell = (what) => toast((t) => (
    <span>{what} is a member perk. <button className="toast-link" onClick={() => { toast.dismiss(t.id); setTab('plans'); }}>See plans</button></span>
  ));

  const loadPlans = async () => {
    if (!PAY_API) return setPlansState('off');
    setPlansState('loading'); setPlansErr('');
    try { const r = await payFetch('/plans'); setPlansList(r.plans); setPlansState('ready'); }
    catch (e) { setPlansErr(e.message); setPlansState('error'); }
  };
  useEffect(() => { if (tab === 'plans' && plansState === 'idle') loadPlans(); }, [tab]);

  const buy = async (planId) => {
    if (payBusy) return;
    setPayBusy(planId);
    try {
      await loadRazorpay();
      const order = await payFetch('/create-order', { plan: planId });
      localStorage.setItem('void_pending_order', order.orderId);
      let paid;
      try { paid = await openCheckout({ order, email: user.email, onFail: (m) => toast.error(m) }); }
      catch (e) { localStorage.removeItem('void_pending_order'); throw e; }
      try {
        const r = await payFetch('/verify', paid);
        localStorage.removeItem('void_pending_order'); setPlan(r.plan); loadPayments();
        toast.success(`${order.plan.name} is active. Enjoy your member perks.`);
      } catch (e) {
        const final = e.status && e.status < 500;
        if (final) localStorage.removeItem('void_pending_order');
        toast.error(final ? e.message : 'Your payment went through, but we couldn’t confirm it yet. Reopen the app in a moment and it will finish by itself.');
      }
    } catch (e) { if (!e.cancelled) toast.error(e.message || 'The payment didn’t go through.'); }
    finally { setPayBusy(null); }
  };

  // If the tab closed after paying but before confirmation, finish the job on the next visit
  useEffect(() => {
    const id = localStorage.getItem('void_pending_order');
    if (!id || !user || !PAY_API) return;
    payFetch('/verify', { orderId: id })
      .then((r) => { setPlan(r.plan); localStorage.removeItem('void_pending_order'); toast.success('Your payment was confirmed. Member perks are on.'); })
      .catch((e) => { if (e.status && e.status < 500) localStorage.removeItem('void_pending_order'); });
  }, [user?.uid]);

  // When a plan runs out, member-only settings go back to their defaults
  useEffect(() => {
    if (plan === undefined || member) return;
    if (speed !== 1) applySpeed(1);
    if (sleepMin) setSleepMin(0);
    if (sound.crossfade) setSound((x) => ({ ...x, crossfade: 0 }));
    if (sound.eq.on) setEqOn(false);
  }, [member, plan]);

  // ───────── Playback engine: resume, crossfade, equalizer ─────────
  const latest = useRef({});
  latest.current = { uid: user?.uid, queue, qIndex, repeatMode, isShuffle, volume, song: currentSong, isPlaying };
  const volumeRef = useRef(1); volumeRef.current = volume;
  const altAudioRef = useRef(null); if (!altAudioRef.current) altAudioRef.current = new Audio();
  const detachMap = useRef(new WeakMap());
  const eqRef = useRef({ on: false, ok: undefined, engine: null });
  const pendingLoad = useRef(false);
  const pendingSeek = useRef(0);
  const restoredFor = useRef(null);
  const crossRef = useRef({ secs: 0, busy: false, trigger: () => {} });
  const [eqSupported, setEqSupported] = useState(undefined);
  const [sound, setSound] = useState(() => {
    const flat = { crossfade: 0, eq: { on: false, gains: EQ_PRESETS.Flat } };
    try {
      const v = JSON.parse(localStorage.getItem('void_sound') || '{}');
      return { crossfade: [0, 3, 6, 9, 12].includes(v.crossfade) ? v.crossfade : 0, eq: { on: false, gains: Array.isArray(v.gains) && v.gains.length === 5 ? v.gains.map((g) => Math.max(-12, Math.min(12, +g || 0))) : EQ_PRESETS.Flat } };
    } catch { return flat; }
  });
  useEffect(() => { localStorage.setItem('void_sound', JSON.stringify({ crossfade: sound.crossfade, gains: sound.eq.gains })); }, [sound.crossfade, sound.eq.gains]);

  const seekWhenReady = (el, t) => el.addEventListener('loadedmetadata', () => { try { el.currentTime = t; } catch { /* not seekable yet */ } }, { once: true });

  // Both audio elements get the same listeners; only the one in audioRef.current is "live"
  const wireAudio = (a) => {
    const live = () => a === audioRef.current;
    const onTime = () => {
      if (!live()) return;
      setProgress(a.currentTime); setDuration(a.duration || 0);
      if (a.buffered.length > 0) setBufferProgress(a.buffered.end(a.buffered.length - 1));
      const c = crossRef.current;
      if (c.secs > 0 && !c.busy && !a.paused && Number.isFinite(a.duration) && a.duration > c.secs * 2 && a.duration - a.currentTime <= c.secs) { c.busy = true; c.trigger(); }
    };
    const evts = {
      timeupdate: onTime,
      ended: () => { if (live()) onTrackEndRef.current(); },
      waiting: () => { if (live()) setBuffering(true); },
      playing: () => { if (live()) setBuffering(false); },
      canplay: () => { if (live()) setBuffering(false); },
      error: () => {
        if (!live() || !a.getAttribute('src')) return;
        setBuffering(false);
        if (a.__bound) { eqBlocked(); return; }       // the equalizer needs CORS; fall back to plain playback
        setPlayError(true); setIsPlaying(false);
      },
    };
    Object.entries(evts).forEach(([e, f]) => a.addEventListener(e, f));
    return () => Object.entries(evts).forEach(([e, f]) => a.removeEventListener(e, f));
  };
  useEffect(() => {
    [audioRef.current, altAudioRef.current].forEach((el) => detachMap.current.set(el, wireAudio(el)));
    return () => [audioRef.current, altAudioRef.current].forEach((el) => detachMap.current.get(el)?.());
  }, []);

  const makeElement = (bound, from) => {
    const el = new Audio();
    el.preload = 'auto';
    if (bound) el.crossOrigin = 'anonymous'; // must be set before loading, or the browser silences a bound element
    if (from) { el.muted = from.muted; el.defaultPlaybackRate = from.defaultPlaybackRate; el.playbackRate = from.playbackRate; }
    el.volume = volumeRef.current;
    detachMap.current.set(el, wireAudio(el));
    if (bound) { eqRef.current.engine.bind(el); el.__bound = true; }
    return el;
  };
  const retire = (el) => {
    detachMap.current.get(el)?.(); detachMap.current.delete(el);
    try { el.pause(); el.removeAttribute('src'); el.load(); } catch { /* already gone */ }
  };
  const wantsEq = (song) => eqRef.current.on && eqRef.current.ok !== false && (!song.source || song.source === 'saavn');
  // The active element must be the right kind for this song: bound to the equalizer, or plain
  const ensureElement = (song) => {
    const cur = audioRef.current, want = wantsEq(song);
    if (!!cur.__bound === want) return;
    audioRef.current = makeElement(want, cur);
    retire(cur);
  };
  const reloadCurrent = (song, forcePlay) => {
    const el = audioRef.current, src = el.getAttribute('src');
    if (!src || !!el.__bound === wantsEq(song)) return;
    const t = el.currentTime, was = forcePlay ?? !el.paused;
    ensureElement(song);
    const next = audioRef.current;
    next.src = src;
    if (t > 1) seekWhenReady(next, t);
    if (was) next.play().catch(() => {});
  };
  const setEqOn = (on) => {
    const E = eqRef.current;
    if (on) { E.engine = E.engine || createEq(); E.engine.resume(); E.engine.setGains(sound.eq.gains); setEqSupported(undefined); }
    E.on = on;
    setSound((x) => ({ ...x, eq: { ...x.eq, on } }));
    const song = currentSongRef.current;
    if (song && song.source !== 'youtube') reloadCurrent(song);
  };
  const eqBlocked = () => {
    const E = eqRef.current; E.ok = false; E.on = false;
    setSound((x) => ({ ...x, eq: { ...x.eq, on: false } })); setEqSupported(false);
    toast.error('The equalizer can’t be used with this audio, so it’s been turned off.');
    const song = currentSongRef.current;
    if (song) reloadCurrent(song, latest.current.isPlaying);
  };
  useEffect(() => { const E = eqRef.current; if (E.engine) E.engine.setGains(sound.eq.on ? sound.eq.gains : EQ_PRESETS.Flat); }, [sound.eq.gains, sound.eq.on]);

  const swapForCrossfade = () => {
    const out = audioRef.current, inc = altAudioRef.current;
    inc.pause(); inc.muted = out.muted; inc.defaultPlaybackRate = out.defaultPlaybackRate; inc.playbackRate = out.playbackRate;
    audioRef.current = inc; altAudioRef.current = out;
    return out;
  };
  const startFades = (out, inc) => {
    const ms = crossRef.current.secs * 1000;
    fadeVolume(inc, volumeRef.current, ms, null, { shape: 'in' });
    fadeVolume(out, 0, ms, () => { out.pause(); out.volume = volumeRef.current; }, { shape: 'out' });
  };
  crossRef.current.secs = member ? sound.crossfade : 0;
  crossRef.current.trigger = () => {
    const { queue: q, qIndex: i, repeatMode: rm, isShuffle: sh } = latest.current;
    const n = rm === 'one' ? null : sh ? randomOther(q.length, i) : i < q.length - 1 ? i + 1 : rm === 'all' ? 0 : null;
    const next = n == null ? null : q[n];
    if (next && next.source !== 'youtube' && next.source !== 'soundcloud' && Array.isArray(next.downloadUrl) && next.downloadUrl.length) playSong(q, n, { fade: true });
  };
  useEffect(() => { crossRef.current.busy = false; }, [currentSong?.id]);

  // Where you left off: saved on the device, restored paused after sign-in
  const persist = () => {
    const L = latest.current;
    if (!L.uid || !L.song) return;
    const pos = L.song.source === 'youtube' ? ytPlayerRef.current?.getCurrentTime?.() || 0 : pendingLoad.current ? pendingSeek.current : audioRef.current.currentTime || 0;
    saveResume(L.uid, { queue: L.queue, qIndex: L.qIndex, position: pos, repeatMode: L.repeatMode, isShuffle: L.isShuffle, volume: L.volume });
  };
  useEffect(() => { persist(); }, [currentSong?.id, queue.length]);
  useEffect(() => {
    const tick = setInterval(() => { if (latest.current.isPlaying) persist(); }, 5000);
    const hide = () => { if (document.hidden) persist(); };
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', persist);
    return () => { clearInterval(tick); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', persist); };
  }, []);
  useEffect(() => {
    if (!user || restoredFor.current === user.uid) return;
    restoredFor.current = user.uid;
    if (currentSongRef.current) return;
    const r = loadResume(user.uid);
    if (!r) return;
    const song = r.queue[r.qIndex];
    setQueue(r.queue); setQIndex(r.qIndex); setCurrentSong(song); setProgress(r.position); setDuration(+song.duration || 0);
    setRepeatMode(r.repeatMode); setIsShuffle(r.isShuffle); setVolume(r.volume); audioRef.current.volume = r.volume;
    pendingLoad.current = true; pendingSeek.current = r.position;   // nothing is loaded until you press play
  }, [user?.uid]);

  // ───────── Synced lyrics ─────────
  const [lyricsData, setLyricsData] = useState({ status: 'loading' });
  const lyricsCache = useRef(new Map());
  const loadLyrics = async (song) => {
    if (!song || lyricsFor.current === song.id) return;
    lyricsFor.current = song.id;
    const id = song.id, stale = () => lyricsFor.current !== id;
    if (lyricsCache.current.has(id)) { setLyricsData(lyricsCache.current.get(id)); return; }
    setLyricsData({ status: 'loading' });
    let found = null, failed = false;
    try { found = await fetchSyncedLyrics({ name: getName(song), artist: getDesc(song), duration: song.duration }, { proxy: LYRICS_PROXY }); } catch { failed = true; }
    if (stale()) return;
    let out;
    if (found?.synced) out = { status: 'synced', lines: found.synced };
    else {
      let plain = found?.plain || '';
      if (!plain && (!song.source || song.source === 'saavn')) {
        try {
          const r = await fetch(`${API_BASE}/lyrics?id=${song.id}`).then((x) => x.json());
          plain = r?.data?.lyrics?.replace(/<br\s*\/?>/g, '\n') || ''; failed = false;
        } catch { /* keep the earlier outcome */ }
      }
      if (stale()) return;
      out = plain ? { status: 'plain', plain } : failed ? { status: 'error' } : { status: 'none' };
    }
    if (out.status !== 'error') lyricsCache.current.set(id, out);
    setLyricsData(out);
  };

  // ───────── Artists, follows and listening stats ─────────
  const [artist, setArtist] = useState(null);
  const [followed, setFollowed] = useState([]);
  const [stats, setStats] = useState(null);
  const isFollowing = (id) => followed.some((a) => String(a.id) === String(id));
  const openArtist = async (ref) => {
    setTab('artist');
    setArtist({ status: 'loading', id: ref.id, name: ref.name, image: ref.image });
    try {
      let id = ref.id;
      if (!id) { const r = await fetchJson(`${API_BASE}/search/artists?query=${encodeURIComponent(ref.name)}`, 10000); id = r?.data?.results?.[0]?.id; }
      if (!id) throw new Error('not found');
      const r = await fetchJson(`${API_BASE}/artists?id=${id}`, 12000);
      if (!r?.success || !r.data) throw new Error('no data');
      const d = r.data;
      setArtist({ status: 'ready', id: String(d.id || id), name: d.name || ref.name, image: d.image || ref.image, followers: +d.followerCount || +d.fanCount || 0, verified: !!d.isVerified,
        songs: d.topSongs || [], albums: d.topAlbums || [], singles: d.singles || [], similar: d.similarArtists || [] });
    } catch { setArtist((a) => ({ ...(a || {}), status: 'error', id: ref.id, name: ref.name, image: ref.image })); }
  };
  const openArtistOf = (song) => { const id = artistIdOf(song), name = firstArtistName(song); if (id || name) openArtist({ id, name, image: null }); };
  const toggleFollow = async (a) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid), before = followed;
    try {
      if (isFollowing(a.id)) {
        const cur = followed.find((x) => String(x.id) === String(a.id));
        setFollowed(followed.filter((x) => String(x.id) !== String(a.id)));
        await updateDoc(ref, { followedArtists: arrayRemove(cur) }); toast(`Unfollowed ${decode(a.name)}`);
      } else {
        const entry = { id: String(a.id), name: a.name, image: imageUrl(a.image) };
        setFollowed([...followed, entry]);
        await updateDoc(ref, { followedArtists: arrayUnion(entry) }); toast.success(`Following ${decode(a.name)}`);
      }
    } catch { setFollowed(before); toast.error('Couldn’t update your follows. Try again.'); }
  };

  // A song counts once you've heard 30 seconds of it (or half, for short ones); seconds are counted while it plays
  const listen = useRef({ song: null, sec: 0 });
  const recordPlay = (song, sec) => {
    if (!user) return;
    updateDoc(doc(db, 'users', user.uid), statsUpdate(stats, song, sec, { increment, deleteField })).catch(() => {});
    setStats((prev) => mergeStats(prev, song, sec));
  };
  const flushListen = () => {
    const L = listen.current;
    if (L.song && L.sec >= Math.min(30, (+L.song.duration || 60) * 0.5)) recordPlay(L.song, L.sec);
    listen.current = { song: null, sec: 0 };
  };
  useEffect(() => { flushListen(); if (currentSong) listen.current = { song: currentSong, sec: 0 }; }, [currentSong?.id]);
  useEffect(() => {
    if (!isPlaying) return undefined;
    const t = setInterval(() => {
      const L = listen.current; L.sec += 1;
      if (!L.adCounted && L.song && L.sec >= Math.min(30, (+L.song.duration || 60) * 0.5)) { L.adCounted = true; adGate.current?.bump(); }
    }, 1000);
    return () => clearInterval(t);
  }, [isPlaying]);

  // ───────── Sharing playlists ─────────
  const pendingShare = useRef(parseShareHash(window.location.hash));
  const [sharing, setSharing] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const sharePlaylist = async (pl) => {
    if (sharing) return;
    setSharing(true);
    try {
      const fresh = userPlaylists.find((p) => p.id === pl.id) || pl;
      const data = toShareDoc(user.uid, fresh.name, detailsSongs);
      let id = fresh.shareId;
      if (id) await setDoc(doc(db, 'shares', id), data);
      else {
        const ref = await addDoc(collection(db, 'shares'), data); id = ref.id;
        await updateDoc(doc(db, `users/${user.uid}/playlists/${pl.id}`), { shareId: id });
      }
      setShareModal({ id, plId: pl.id, name: fresh.name, url: shareUrl(window.location, id) });
    } catch { toast.error('Couldn’t create the link. Check your connection and try again.'); }
    finally { setSharing(false); }
  };
  const stopSharing = async (m) => {
    try {
      await deleteDoc(doc(db, 'shares', m.id));
      await updateDoc(doc(db, `users/${user.uid}/playlists/${m.plId}`), { shareId: deleteField() });
      setShareModal(null); toast('Sharing stopped. The link no longer works.');
    } catch { toast.error('Couldn’t stop sharing. Try again.'); }
  };
  const copyLink = (url) => navigator.clipboard?.writeText(url).then(() => toast.success('Link copied')).catch(() => toast('Select the link and copy it')) || toast('Select the link and copy it');
  const openShared = async (id) => {
    pendingShare.current = null;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    try {
      const snap = await getDoc(doc(db, 'shares', id));
      if (!snap.exists()) return toast.error('That shared playlist isn’t available any more.');
      const d = snap.data();
      setSelectedItem({ id: `share-${id}`, name: d.name, image: d.songs?.[0]?.image, songs: d.songs || [], shared: true });
      setDetailsSongs(d.songs || []); setTab('details');
    } catch { toast.error('Couldn’t open the shared playlist. Check your connection.'); }
  };
  const saveShared = async () => {
    try { await addDoc(collection(db, `users/${user.uid}/playlists`), { name: selectedItem.name, songs: detailsSongs.map(trimSong) }); toast.success('Saved to your library'); }
    catch { toast.error('Couldn’t save the playlist. Try again.'); }
  };
  useEffect(() => { if (user && pendingShare.current) openShared(pendingShare.current); }, [user?.uid]);
  useEffect(() => {
    const on = () => { const id = parseShareHash(window.location.hash); if (id && user) openShared(id); else if (id) pendingShare.current = id; };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, [user?.uid]);

  // ───────── Billing history, expiry reminders, password reset, offline + install ─────────
  const [payments, setPayments] = useState({ status: 'idle', items: [] });
  const loadPayments = async () => {
    if (!user) return;
    setPayments((p) => ({ ...p, status: 'loading' }));
    try {
      const snap = await getDocs(query(collection(db, 'payments'), where('uid', '==', user.uid)));
      setPayments({ status: 'ready', items: snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.at - a.at) });
    } catch { setPayments((p) => ({ ...p, status: 'error' })); }
  };
  useEffect(() => { if (tab === 'plans' && user && payments.status === 'idle') loadPayments(); }, [tab, user?.uid]);

  const daysLeft = plan && plan.expiresAt > now ? Math.ceil((plan.expiresAt - now) / 86400000) : 0;
  const reminderKey = plan ? String(plan.expiresAt) : '';
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('void_reminder'));
  const expiring = member && daysLeft <= 3, lapsed = !!plan && !member;
  const reminder = (expiring || lapsed) && dismissed !== reminderKey && (
    <div className="reminder" role="status">
      <Ic.bell s={20} />
      <p>{expiring
        ? <><b>Your {cap(plan.id)} pass ends {daysLeft <= 1 ? 'within a day' : `in ${daysLeft} days`}</b> ({fmtDate(plan.expiresAt)}). Add time to keep your member perks.</>
        : <><b>Your {cap(plan.id)} pass ended on {fmtDate(plan.expiresAt)}.</b> Renew to remove ads and bring back accent colors, speed, the sleep timer, crossfade and the equalizer.</>}</p>
      <div className="acts">
        {tab !== 'plans' && <button className="btn pri" onClick={() => setTab('plans')}>{expiring ? 'Add time' : 'Renew'}</button>}
        <button className="btn" onClick={() => { localStorage.setItem('void_reminder', reminderKey); setDismissed(reminderKey); }}>Dismiss</button>
      </div>
    </div>
  );

  const submitReset = async (email) => {
    try { await sendPasswordResetEmail(auth, email); return null; }
    catch (e) { if (e.code === 'auth/user-not-found') return null; return AUTH_ERRORS[e.code] || 'We couldn’t send the email. Please try again.'; } // never reveal which emails have accounts
  };

  const online = useOnline();
  const install = useInstall();
  useEffect(() => { registerSW(); }, []);

  // ───────── Ads (free plan only; any pass removes them) ─────────
  const adGate = useRef(null);
  const adCfg = useRef({ every: 5, ads: [] });
  const adOpen = useRef(false);
  const pendingAd = useRef(null);
  const [ad, setAd] = useState(null);
  useEffect(() => { loadAds(`${import.meta.env.BASE_URL}ads.json`).then((c) => { adCfg.current = c; adGate.current?.setEvery(c.every); }); }, []);
  useEffect(() => { adGate.current = user ? createAdGate(`void_ad_${user.uid}`, { every: adCfg.current.every }) : null; }, [user?.uid]);
  // due only once we know the plan, so a member never sees an ad while their plan is still loading
  const adDue = () => !!adGate.current && plan !== undefined && !member && !adOpen.current && adGate.current.due() && adCfg.current.ads.length > 0;
  const openAd = (pending) => {
    try { audioRef.current.pause(); ytPlayerRef.current?.pauseVideo?.(); } catch { /* player not ready */ }
    setIsPlaying(false);
    adOpen.current = true; pendingAd.current = pending; adGate.current.reset();
    const next = pickAd(adCfg.current.ads, sessionStorage.getItem('void_last_ad'));
    sessionStorage.setItem('void_last_ad', next.id);
    setAd(next);
  };
  const finishAd = (then) => {
    const p = pendingAd.current;
    adOpen.current = false; pendingAd.current = null; setAd(null);
    if (then === 'plans') setTab('plans');
    if (p) playSong(p.list, p.idx, { ...p.opts, afterAd: true });
  };

  // ───────── Auth, sign-out and player status ─────────
  const [confirmOut, setConfirmOut] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [playError, setPlayError] = useState(false);
  const signingOut = useRef(false);
  const plUnsub = useRef(null);

  // Resolves to an error message, or null on success (onAuthStateChanged then switches the view)
  const submitAuth = async (mode, email, password) => {
    try {
      if (mode === 'signup') {
        const c = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', c.user.uid), { email, likedSongs: [] });
      } else await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch (e) { return AUTH_ERRORS[e.code] || 'Something went wrong. Please try again.'; }
  };

  // Stop everything first, then sign out; the auth listener sends us to the signed-out page
  const doSignOut = async () => {
    setConfirmOut(false);
    flushListen();
    try { altAudioRef.current.pause(); audioRef.current.pause(); ytPlayerRef.current?.pauseVideo?.(); } catch { /* player not ready */ }
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
    setIsPlaying(false); setCurrentSong(null); setQueue([]); setTheaterMode(false); setSleepMin(0); setProgress(0); setDuration(0);
    signingOut.current = true;
    try { await signOut(auth); } catch { signingOut.current = false; toast.error('Couldn’t sign out. Try again.'); }
  };

  useEffect(() => { setPlayError(false); setBuffering(false); }, [currentSong?.id]);

  // JioSaavn home feed: use the live feed, fall back to the old search-based rows if it can't be reached
  const fetchHome = async (ls = langs) => {
    setLaunchBusy(true); setLaunchErr('');
    // The built-in rows load in parallel, so Home never sits waiting on the live feed
    if (!homeData.trending.length && !homeData.charts.length) fetchHomeFallback();
    try {
      const res = await fetchLaunch(ls);
      const sections = Array.isArray(res) ? res : res?.sections || [];
      if (sections.length) setLaunch(sections);
      else { setLaunch([]); setLaunchErr(res?.error || 'The feed came back empty.'); }
    } catch (e) { setLaunch([]); setLaunchErr(String(e?.message || e)); }
    finally { setLaunchBusy(false); }
  };
  const toggleLang = (l) => {
    const next = langs.includes(l) ? langs.filter((x) => x !== l) : [...langs, l];
    if (!next.length) return;
    setLangs(next); localStorage.setItem('void_langs', JSON.stringify(next)); fetchHome(next);
  };
  const openLaunchItem = async (it) => {
    if (['album', 'playlist', 'artist'].includes(it.type)) return handleCardClick(it, it.type);
    const tid = toast.loading(`Loading ${getName(it)}…`);
    try {
      // Radio stations, mixes and shows have no feed endpoint in this API, so they play a search on their title
      const list = it.type === 'song' ? [await resolveSong(it)].filter(Boolean) : await APIs.saavn.search(it.name);
      toast.dismiss(tid);
      if (list.length) playSong(list, 0); else toast.error('Nothing playable found for this one');
    } catch { toast.error('Couldn’t load this one', { id: tid }); }
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

  if (view === 'auth') return <AuthScreen mode={authMode} setMode={setAuthMode} onSubmit={submitAuth} onReset={submitReset} color={ACC.rose} notice={pendingShare.current ? 'Log in to open the playlist someone shared with you.' : ''} />;
  if (view === 'signedout') return <SignedOutScreen color={ACC.rose} onLogin={() => { setAuthMode('login'); setView('auth'); }} onSignup={() => { setAuthMode('signup'); setView('auth'); }} />;

  // ---------- derived values ----------
  const pct = duration ? (progress / duration) * 100 : 0;
  const bpct = Math.max(pct, duration ? (bufferProgress / duration) * 100 : 0);
  const hr = new Date().getHours();
  const greet = hr < 5 ? 'Good night' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const launchHero = launch.find((x) => /trending/i.test(x.title))?.items.find((i) => i.type === 'song') || launch[0]?.items[0];
  const feat = launchHero || homeData.trending[0];
  const isCustom = !!selectedItem && userPlaylists.some((p) => p.id === selectedItem.id);
  const noResults = !loading && searched && !resSongs.length && !resAlbums.length && !resArtists.length && !resPlaylists.length;
  const navTab = ['details', 'mood', 'artist'].includes(tab) ? lastMain.current : tab;
  const liveLiked = currentSong && isLiked(currentSong.id);
  const busy = buffering && isPlaying && !playError;

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

  const launchCard = (it, i) => (
    <article key={`${it.id}-${i}`} className={`card${it.type === 'artist' ? ' artist' : ''}`} tabIndex={0}
      onClick={() => openLaunchItem(it)} onKeyDown={(e) => e.key === 'Enter' && openLaunchItem(it)}>
      <div className={`cover${it.type === 'artist' ? ' round' : ''}`}><img src={getImg(it.image)} alt="" loading="lazy" /></div>
      <h3>{getName(it)}</h3><p>{decode(it.subtitle) || TYPE_LABEL[it.type] || ''}</p>
    </article>
  );
  const launchShelf = (sec) => (
    <section className="shelf" key={sec.id}>
      <h2>{decode(sec.title)}</h2>{sec.subtitle && <p className="sub shelf-sub">{decode(sec.subtitle)}</p>}
      <div className="scroller">{sec.items.map(launchCard)}</div>
    </section>
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
      <button className={`play${busy ? ' busy' : ''}`} aria-busy={busy} aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay}>{isPlaying ? <Ic.pause s={22} /> : <Ic.play s={22} />}</button>
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
    <div className="shell" style={{ '--ar': ACC[accentEff], '--glow': glow || ACC[accentEff] }}>
      <Toaster position="top-center" toastOptions={TOAST} />
      <a className="skip" href="#main">Skip to content</a>
      <p className="sr" aria-live="polite">{currentSong ? `${isPlaying ? 'Now playing' : 'Paused'}: ${getName(currentSong)}` : ''}</p>
      <div key={glow || 'default'} className="aura" />
      <Backdrop color={glow || ACC[accentEff]} playing={isPlaying} focus={theaterMode} />
      <div className="yt-host" aria-hidden="true"><div id="hidden-yt-player" /></div>

      {/* Rail (desktop) */}
      <nav className="rail" aria-label="Main">
        <div className="logo">void</div>
        {NAV.map(([k, label, ic]) => { const I = Ic[ic]; return (
          <button key={k} className={navTab === k ? 'on' : ''} aria-current={navTab === k ? 'page' : undefined} onClick={() => setTab(k)}><I /><span>{label}</span></button>
        ); })}
        <div className="grow" />
        <button onClick={() => setConfirmOut(true)}><Ic.logout /><span>Sign out</span></button>
      </nav>

      <main className="main" id="main" tabIndex={-1} ref={containerRef}>
        <header className="top">
          <div className="m-logo">void</div>
          <label className="search">
            <Ic.search s={18} />
            <input ref={searchRef} aria-label="Search music" placeholder={`Search ${APIs[source].name}`} value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} />
            {searchQuery && <button type="button" aria-label="Clear search" onClick={() => setSearchQuery('')}><Ic.x s={16} /></button>}
          </label>
          {!online && <p className="offline" role="status"><Ic.wifiOff s={16} />You’re offline. Search, streaming and sign-in need a connection.</p>}
        </header>

        <div className="page" key={`${tab}-${tab === 'details' ? selectedItem?.id : tab === 'library' ? libTab : ''}`}>
          {/* HOME */}
          {tab === 'home' && (<>
            <h1 className="h1">{greet}</h1>
            {reminder}
            <div className="chips langs" role="group" aria-label="Music languages">
              {LANGS.map((l) => <button key={l} aria-pressed={langs.includes(l)} className={`chip${langs.includes(l) ? ' on' : ''}`} onClick={() => toggleLang(l)}>{l[0].toUpperCase() + l.slice(1)}</button>)}
            </div>
            {launchBusy && !launch.length && !launchErr && <p className="status sub" role="status"><span className="spin" aria-hidden="true" />Loading JioSaavn’s home feed…</p>}
            {launchErr && !launch.length && (
              <div className="notice" role="status">
                <p><b>JioSaavn’s live home feed didn’t load.</b> {launchErr} Showing the built-in rows instead.</p>
                <button className="btn" onClick={() => fetchHome()}>Try again</button>
              </div>
            )}
            {feat ? (
              <section className="feat">
                <img src={getImg(feat.image)} alt="" />
                <div>
                  <h2>{getName(feat)}</h2><p>{getDesc(feat)}</p>
                  <div className="acts">
                    <button className="btn pri" onClick={() => (launchHero ? openLaunchItem(launchHero) : playSong(homeData.trending, 0))}><Ic.play s={18} />{launchHero ? (launchHero.type === 'song' ? 'Play' : 'Open') : 'Play trending'}</button>
                    {!launchHero && <button className="btn" onClick={() => addToQueue(feat)}><Ic.queue s={18} />Add to queue</button>}
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

            {launch.length > 0 ? launch.map(launchShelf) : (<>
            {homeData.trending.length > 0 && (
              <section className="shelf"><h2>Trending now</h2>
                <div className="rows">{homeData.trending.slice(0, 10).map((s, i) => row(s, i, homeData.trending))}</div>
              </section>
            )}

            {loading && !homeData.charts.length && <section className="shelf"><h2>Top charts</h2>{skeleton()}</section>}
            {SHELVES.map(([t, k, ty]) => shelf(t, homeData[k], ty))}
            {!loading && !homeData.trending.length && !homeData.charts.length && <p className="empty">The music API didn’t return anything either. Check that it’s reachable, then try again.</p>}
            </>)}
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
                <p className="sub">{selectedItem.shared ? `Shared with you, ${detailsSongs.length} songs` : selectedItem.songs ? `${detailsSongs.length} songs` : getDesc(selectedItem)}</p>
                <div className="acts">
                  <button className="btn pri" disabled={!detailsSongs.length} onClick={() => playSong(detailsSongs, 0)}><Ic.play s={18} />Play</button>
                  <button className="btn" disabled={!detailsSongs.length} onClick={() => playShuffled(detailsSongs)}><Ic.shuffle s={18} />Shuffle</button>
                  {isCustom && <button className="btn" disabled={sharing || !detailsSongs.length} onClick={() => sharePlaylist(selectedItem)}><Ic.share s={18} />Share</button>}
                  {selectedItem.shared && <button className="btn" disabled={!detailsSongs.length} onClick={saveShared}><Ic.plus s={18} />Save to my library</button>}
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
              <button role="tab" aria-selected={libTab === 'artists'} className={libTab === 'artists' ? 'on' : ''} onClick={() => setLibTab('artists')}>Artists</button>
              <button role="tab" aria-selected={libTab === 'stats'} className={libTab === 'stats' ? 'on' : ''} onClick={() => setLibTab('stats')}>Stats</button>
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
            ) : libTab === 'liked' ? (<>
              <div className="acts" style={{ margin: '20px 0' }}>
                <button className="btn pri" disabled={!likedSongs.length} onClick={() => playSong(likedSongs, 0)}><Ic.play s={18} />Play all</button>
                <button className="btn" disabled={!likedSongs.length} onClick={() => playShuffled(likedSongs)}><Ic.shuffle s={18} />Shuffle</button>
              </div>
              {likedSongs.length ? <div className="rows one">{likedSongs.map((s, i) => row(s, i, likedSongs))}</div>
                : <p className="empty">Songs you like show up here. Tap the heart on any song to save it.</p>}
            </>) : libTab === 'artists' ? (
              followed.length ? (
                <div className="grid lib">{followed.map((a) => (
                  <article key={a.id} className="card artist" tabIndex={0} onClick={() => openArtist({ id: a.id, name: a.name, image: a.image })} onKeyDown={(e) => e.key === 'Enter' && openArtist({ id: a.id, name: a.name, image: a.image })}>
                    <div className="cover round"><img src={getImg(a.image)} alt="" loading="lazy" /></div><h3>{decode(a.name)}</h3><p>Artist</p>
                  </article>
                ))}</div>
              ) : <p className="empty">Artists you follow show up here. Open an artist and tap Follow.</p>
            ) : stats?.plays ? (
              <div className="stats">
                <dl className="stat-tiles">
                  <div><dt>Time listened</dt><dd>{fmtDuration(stats.seconds)}</dd></div>
                  <div><dt>Songs played</dt><dd>{stats.plays}</dd></div>
                  <div><dt>Counting since</dt><dd>{fmtDate(stats.since)}</dd></div>
                </dl>
                <section className="shelf"><h2>Top artists</h2>
                  <ol className="rank">{topOf(stats.artists).map((a, i, all) => (
                    <li key={a.key}><button onClick={() => openArtist({ id: a.id, name: a.name })}>
                      <span className="rk">{i + 1}</span><span className="rname">{decode(a.name)}</span>
                      <span className="bar" style={{ '--w': `${(a.n / all[0].n) * 100}%` }} aria-hidden="true" /><span className="rn">{a.n} {a.n === 1 ? 'play' : 'plays'}</span>
                    </button></li>
                  ))}</ol>
                </section>
                <section className="shelf"><h2>Top songs</h2>
                  <ol className="rank">{topOf(stats.songs).map((s, i, all) => (
                    <li key={s.key}><div className="rowish">
                      <span className="rk">{i + 1}</span><img src={getImg(s.image)} alt="" loading="lazy" /><span className="rname"><b>{decode(s.name)}</b><small>{decode(s.artist)}</small></span>
                      <span className="bar" style={{ '--w': `${(s.n / all[0].n) * 100}%` }} aria-hidden="true" /><span className="rn">{s.n} {s.n === 1 ? 'play' : 'plays'}</span>
                    </div></li>
                  ))}</ol>
                </section>
                <p className="hint">A song counts once you’ve heard 30 seconds of it. Your stats are stored in your account only.</p>
              </div>
            ) : <p className="empty">Play some music and your listening stats will appear here. A song counts once you’ve heard 30 seconds of it.</p>}
          </>)}

          {/* ARTIST */}
          {tab === 'artist' && artist && (<>
            <button className="back" onClick={() => setTab(lastMain.current)}><Ic.back s={18} />Back</button>
            {artist.status === 'loading' && <header className="artist-head" aria-busy="true"><div className="avatar-lg sk" /><div><h1 className="h1">{decode(artist.name || 'Loading…')}</h1></div></header>}
            {artist.status === 'error' && (
              <div className="notice" role="alert"><p><b>We couldn’t load this artist.</b> Check your connection and try again.</p>
                <button className="btn" onClick={() => openArtist({ id: artist.id, name: artist.name, image: artist.image })}>Try again</button></div>
            )}
            {artist.status === 'ready' && (<>
              <header className="artist-head">
                <img className="avatar-lg" src={getImg(artist.image)} alt="" />
                <div>
                  <h1 className="h1">{decode(artist.name)}{artist.verified && <span className="tag inline">Verified</span>}</h1>
                  {artist.followers > 0 && <p className="sub">{compact(artist.followers)} followers</p>}
                  <div className="acts">
                    <button className="btn pri" disabled={!artist.songs.length} onClick={() => playSong(artist.songs, 0)}><Ic.play s={18} />Play</button>
                    <button className="btn" disabled={!artist.songs.length} onClick={() => playShuffled(artist.songs)}><Ic.shuffle s={18} />Shuffle</button>
                    <button className={`btn${isFollowing(artist.id) ? ' on' : ''}`} aria-pressed={isFollowing(artist.id)} onClick={() => toggleFollow(artist)}>
                      {isFollowing(artist.id) ? <><Ic.check s={18} />Following</> : <><Ic.plus s={18} />Follow</>}
                    </button>
                  </div>
                </div>
              </header>
              {artist.songs.length > 0 && <section className="shelf"><h2>Popular</h2><div className="rows">{artist.songs.slice(0, 10).map((s, i) => row(s, i, artist.songs))}</div></section>}
              {shelf('Albums', artist.albums, 'album')}{shelf('Singles', artist.singles, 'album')}{shelf('Fans also like', artist.similar, 'artist')}
              {!artist.songs.length && !artist.albums.length && !artist.singles.length && <p className="empty">There’s nothing to show for this artist yet.</p>}
            </>)}
          </>)}

          {/* PLANS */}
          {tab === 'plans' && <Plans state={plansState} plans={plansList} error={plansErr} plan={plan} member={member} busy={payBusy} onBuy={buy} onRetry={loadPlans} history={payments} onRetryHistory={loadPayments} reminder={reminder} />}

          {/* SETTINGS */}
          {tab === 'profile' && (
            <div className="set">
              <header className="me"><div className="avatar">{user.email[0].toUpperCase()}</div><div><h1 className="h1" style={{ margin: 0 }}>Settings</h1><p className="sub">{user.email}</p></div></header>
              <section><h2>Plan</h2>
                <div className="set-row">
                  <span>{member ? `${plan.id[0].toUpperCase()}${plan.id.slice(1)} until ${fmtDate(plan.expiresAt)}` : 'Free plan'}</span>
                  <button className="btn" onClick={() => setTab('plans')}>{member ? 'Add time' : 'See plans'}</button>
                </div>
              </section>
              <section><h2>Your library</h2>
                <div className="set-row"><span>Liked songs</span><b>{likedSongs.length}</b></div>
                <div className="set-row"><span>Playlists</span><b>{userPlaylists.length}</b></div>
                <div className="set-row"><span>Played recently</span><b>{history.length}</b></div>
              </section>
              <section><h2>Accent color</h2>
                <div className="set-row"><span>Used for buttons and highlights</span>
                  <div className="chips">{Object.entries(ACC).map(([k, c]) => <button key={k} className={`sw${accentEff === k ? ' on' : ''}`} style={{ '--c': c }} aria-label={k} aria-pressed={accentEff === k} onClick={() => (k === 'rose' || member ? setAccent(k) : upsell('Accent colors'))}>{k !== 'rose' && !member && <Ic.lock s={13} />}</button>)}</div>
                </div>
              </section>
              <section><h2>Playback</h2>
                <div className="set-row"><span>Audio quality</span><div className="chips">{QUALITIES.map(([k, l]) => <button key={k} className={`chip${quality === k ? ' on' : ''}`} onClick={() => handleQualityChange(k)}>{l}</button>)}</div></div>
                <div className="set-row"><span>Speed</span><div className="chips">{SPEEDS.map((s) => <button key={s} className={`chip${speed === s ? ' on' : ''}`} onClick={() => applySpeed(s)}>{s}×{!member && s !== 1 && <Ic.lock s={13} />}</button>)}</div></div>
                <div className="set-row"><span>Sleep timer</span><div className="chips">{SLEEP.map((m) => <button key={m} className={`chip${sleepMin === m ? ' on' : ''}`} onClick={() => applySleep(m)}>{m ? `${m} min` : 'Off'}{!member && m > 0 && <Ic.lock s={13} />}</button>)}</div></div>
              </section>
              <Sound member={member} upsell={upsell} crossfade={sound.crossfade} onCrossfade={(secs) => setSound((x) => ({ ...x, crossfade: secs }))}
                eq={sound.eq} eqSupported={eqSupported} onEqToggle={setEqOn}
                onEqGain={(i, v) => setSound((x) => ({ ...x, eq: { ...x.eq, gains: x.eq.gains.map((g, k) => (k === i ? v : g)) } }))}
                onEqPreset={(g) => setSound((x) => ({ ...x, eq: { ...x.eq, gains: [...g] } }))} />
              <section><h2>App</h2>
                <div className="set-row"><span>{install.installed ? 'Void is installed on this device' : 'Install Void for quick access and an app-like window'}</span>
                  {install.canInstall && <button className="btn" onClick={install.install}><Ic.download s={18} />Install</button>}</div>
                {install.ios && <p className="hint">On iPhone or iPad, tap the Share button in Safari, then “Add to Home Screen”.</p>}
                {!install.canInstall && !install.installed && !install.ios && <p className="hint">If your browser can install apps, you’ll find an Install option in its address bar or menu.</p>}
                <p className="hint">Offline, the app still opens, but search and streaming need a connection.</p>
              </section>
              <section><h2>Keyboard shortcuts</h2>
                <div className="set-row"><span>Play or pause</span><kbd>Space</kbd></div>
                <div className="set-row"><span>Seek 10 seconds</span><kbd>← →</kbd></div>
                <div className="set-row"><span>Next or previous</span><kbd>N / P</kbd></div>
                <div className="set-row"><span>Mute</span><kbd>M</kbd></div>
                <div className="set-row"><span>Focus search</span><kbd>/</kbd></div>
              </section>
              <button className="btn danger" onClick={() => setConfirmOut(true)}><Ic.logout s={18} />Sign out</button>
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
            <span className="meta"><b>{getName(currentSong)}</b><small className={playError ? 'err' : ''}>{playError ? 'Couldn’t play this track' : getDesc(currentSong)}</small></span>
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
            <button className={`play${busy ? ' busy' : ''}`} aria-busy={busy} aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay}>{isPlaying ? <Ic.pause s={22} /> : <Ic.play s={22} />}</button>
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
            <div className="np-title"><h2>{getName(currentSong)}</h2><p><button className="artist-link" onClick={() => { setTheaterMode(false); openArtistOf(currentSong); }}>{getDesc(currentSong)}</button></p></div>
            {playError && <p className="np-err" role="alert"><Ic.alert s={16} />This track couldn’t be played. <button onClick={() => playSong(queue, qIndex + 1)}>Skip to next</button></p>}
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
              {panel === 'lyrics' ? <Lyrics data={lyricsData} time={progress} canSeek onSeek={seekTo} onRetry={() => { lyricsFor.current = null; loadLyrics(currentSong); }} />
                : <>{queue.length < 2 && <p className="empty">Nothing else is queued. Use the queue button on any song to add it.</p>}{queue.map((s, i) => (
                  <div key={`${s.id}-${i}`} className={`row q${i === qIndex ? ' on' : ''}`}>
                    <button className="row-main" onClick={() => playSong(queue, i)}>
                      <img src={getImg(s.image)} alt="" /><span className="meta"><b>{getName(s)}</b><small>{getDesc(s)}</small></span>
                    </button>
                    <div className="row-acts"><button aria-label="Remove from queue" onClick={() => removeFromQueue(i)}><Ic.x s={16} /></button></div>
                  </div>
                ))}</>}
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

      {/* Dialogs */}
      {showPlaylistModal && (
        <Modal as="form" titleId="modal-new-h" onClose={() => setShowPlaylistModal(false)} onSubmit={(e) => { e.preventDefault(); createPlaylist(); }}>
          <h2 id="modal-new-h">New playlist</h2>
          <input data-autofocus aria-label="Playlist name" placeholder="Give it a name" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} />
          <div className="acts"><button type="button" className="btn" onClick={() => setShowPlaylistModal(false)}>Cancel</button><button type="submit" className="btn pri" disabled={!newPlaylistName.trim()}>Create playlist</button></div>
        </Modal>
      )}
      {showAddToPlaylistModal && (
        <Modal titleId="modal-add-h" onClose={() => setShowAddToPlaylistModal(false)}>
          <h2 id="modal-add-h">Add to playlist</h2>
          {userPlaylists.length ? (
            <div className="pick">{userPlaylists.map((pl) => (
              <button key={pl.id} onClick={() => addToPlaylist(pl.id)}><span className="pick-ic"><Ic.library s={18} /></span>{pl.name}</button>
            ))}</div>
          ) : <p className="empty">You don’t have any playlists yet.</p>}
          <div className="acts">
            <button className="btn" onClick={() => setShowAddToPlaylistModal(false)}>Cancel</button>
            <button className="btn pri" onClick={() => { setShowAddToPlaylistModal(false); setShowPlaylistModal(true); }}><Ic.plus s={18} />New playlist</button>
          </div>
        </Modal>
      )}
      {shareModal && (
        <Modal titleId="modal-share-h" onClose={() => setShareModal(null)}>
          <h2 id="modal-share-h">Share “{shareModal.name}”</h2>
          <p className="sub">Anyone signed in to Void who opens this link can listen and save a copy. Sharing again refreshes it with your latest songs.</p>
          <div className="copy-row">
            <input readOnly aria-label="Share link" value={shareModal.url} data-autofocus onFocus={(e) => e.target.select()} />
            <button className="btn pri" onClick={() => copyLink(shareModal.url)}>Copy link</button>
          </div>
          <div className="acts">
            <button className="btn danger" onClick={() => stopSharing(shareModal)}>Stop sharing</button>
            {navigator.share && <button className="btn" onClick={() => navigator.share({ title: shareModal.name, url: shareModal.url }).catch(() => {})}>Share…</button>}
            <button className="btn" onClick={() => setShareModal(null)}>Done</button>
          </div>
        </Modal>
      )}
      {confirmOut && (
        <Modal titleId="modal-out-h" onClose={() => setConfirmOut(false)}>
          <h2 id="modal-out-h">Sign out of Void?</h2>
          <p className="sub">Your music will stop. Your likes, playlists and history stay saved to your account.</p>
          <div className="acts"><button className="btn" data-autofocus onClick={() => setConfirmOut(false)}>Stay signed in</button><button className="btn danger" onClick={doSignOut}><Ic.logout s={18} />Sign out</button></div>
        </Modal>
      )}
      {ad && <AdBreak ad={ad} onDone={() => finishAd()} onUpgrade={() => finishAd('plans')} />}
    </div>
  );
}

class ErrorBoundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('Void crashed:', err, info?.componentStack); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="crash">
        <h1>Something broke</h1>
        <p>{String(this.state.err?.message || this.state.err)}</p>
        <button className="btn pri" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}

export default function Root() { return <ErrorBoundary><App /></ErrorBoundary>; }
