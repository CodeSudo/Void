import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import toast, { Toaster } from 'react-hot-toast';

// --- 1. EMBEDDED FIREBASE CONFIG (Crash-Proof) ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, onSnapshot, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB_DEMO_KEY_FOR_UI_TESTING_ONLY", 
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Safely
let auth, db;
try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) { console.warn("Running in Offline Mode"); }

// --- API CONFIG ---
const API_BASE = "https://saavn.sumit.co/api";

const MOODS = [
  { id: 'm1', name: 'Party', color: '#e57373', query: 'Party Hits' },
  { id: 'm2', name: 'Romance', color: '#f06292', query: 'Love Songs' },
  { id: 'm3', name: 'Sad', color: '#ba68c8', query: 'Sad Songs' },
  { id: 'm4', name: 'Workout', color: '#ffb74d', query: 'Gym Motivation' },
  { id: 'm5', name: 'Chill', color: '#4db6ac', query: 'Chill Lo-Fi' },
  { id: 'm6', name: 'Retro', color: '#7986cb', query: 'Retro Classics' },
];

const ICONS = {
  Home: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  Search: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Library: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
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
  Download: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Back: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
};

function App() {
  const [view, setView] = useState('loading');
  const [tab, setTab] = useState('home');
  // FORCE LOGGED IN USER to prevent initial black screen
  const [user, setUser] = useState({ email: 'demo@aura.app', uid: 'local-user' });
  
  // Data
  const [homeData, setHomeData] = useState({ 
    trending: [], charts: [], newAlbums: [], radio: [], topArtists: [], editorial: [], fresh: [], nineties: [], hindiPop: [] 
  });
  const [resSongs, setResSongs] = useState([]);
  const [resAlbums, setResAlbums] = useState([]);
  const [resArtists, setResArtists] = useState([]);
  const [resPlaylists, setResPlaylists] = useState([]);
  const [moodPlaylists, setMoodPlaylists] = useState([]);
  
  const [history, setHistory] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Details & UI
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailsSongs, setDetailsSongs] = useState([]);
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsText, setLyricsText] = useState("");
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [songToAdd, setSongToAdd] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Auth
  const [authMode, setAuthMode] = useState('login');
  const [authInput, setAuthInput] = useState({ email: '', password: '' });

  // Player
  const audioRef = useRef(new Audio());
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

  // Helpers
  const getImg = (i) => { if(Array.isArray(i)) return i[i.length-1]?.url || i[0]?.url; return i || "https://via.placeholder.com/150"; }
  const getName = (i) => i?.name || i?.title || "Unknown";
  const getDesc = (i) => i?.primaryArtists || i?.description || "";
  const isLiked = (id) => likedSongs.some(s => String(s.id) === String(id));
  const formatTime = (s) => { if(isNaN(s)) return "0:00"; const m=Math.floor(s/60), sc=Math.floor(s%60); return `${m}:${sc<10?'0'+sc:sc}`; };

  // --- HYBRID SYNC: Firebase + LocalStorage Fallback ---
  const syncHistory = (newHist) => {
    setHistory(newHist);
    try { localStorage.setItem('musiq_history', JSON.stringify(newHist)); } catch {}
    if(auth && user.uid !== 'local-user') updateDoc(doc(db, "users", user.uid), { history: newHist }).catch(()=>{});
  };

  const syncLikes = (newLikes) => {
    setLikedSongs(newLikes);
    try { localStorage.setItem('musiq_liked', JSON.stringify(newLikes)); } catch {}
    // If Firebase active, strict sync happens in toggleLike
  };

  // --- DATA FETCHING ---
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
        trending: results[0]?.data?.results || [], 
        charts: results[1]?.data?.results || [], 
        newAlbums: results[2]?.data?.results || [], 
        editorial: results[3]?.data?.results || [],
        radio: results[4]?.data?.results || [],
        topArtists: results[5]?.data?.results || [], 
        love: results[6]?.data?.results || [],
        fresh: results[7]?.data?.results || [],
        nineties: results[8]?.data?.results || [],
        hindiPop: results[9]?.data?.results || []
      });
    } catch(e) { console.error("Home Error", e); } 
    finally { setLoading(false); setView('app'); }
  };

  const doSearch = async () => {
    if(!searchQuery) return;
    setLoading(true); setTab('search');
    try {
      const [s, a, ar, p] = await Promise.all([
        fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}`).then(r=>r.json()),
        fetch(`${API_BASE}/search/albums?query=${encodeURIComponent(searchQuery)}`).then(r=>r.json()),
        fetch(`${API_BASE}/search/artists?query=${encodeURIComponent(searchQuery)}`).then(r=>r.json()),
        fetch(`${API_BASE}/search/playlists?query=${encodeURIComponent(searchQuery)}`).then(r=>r.json())
      ]);
      setResSongs(s?.data?.results || []); setResAlbums(a?.data?.results || []); setResArtists(ar?.data?.results || []); setResPlaylists(p?.data?.results || []);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchLyrics = async () => {
    if(!currentSong) return;
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

  // --- PRO PLAYER LOGIC ---
  const playSong = (list, idx) => {
    if(!list || !list[idx]) return;
    setQueue(list); setQIndex(idx);
    const s = list[idx];
    setCurrentSong(s);
    syncHistory([s, ...history.filter(h => h.id !== s.id)].slice(0, 20));
    
    // Quality selection logic
    const urlObj = s.downloadUrl?.find(u => u.quality === quality);
    const url = urlObj ? urlObj.url : (s.downloadUrl?.[s.downloadUrl.length-1]?.url || s.downloadUrl?.[0]?.url);

    if(url) {
        if(audioRef.current.src !== url) {
            audioRef.current.src = url;
            audioRef.current.volume = volume;
            audioRef.current.play().catch(()=>{});
            setIsPlaying(true);
        } else { audioRef.current.play(); setIsPlaying(true); }
    } else toast.error("Audio unavailable");
  };

  const startRadio = async (song) => {
      toast.loading("Starting Radio...");
      try {
          // Fetch similar songs (mocking via search for artist)
          const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(song.primaryArtists)}`);
          const data = await res.json();
          const radioQueue = data.data?.results || [];
          if(radioQueue.length > 0) {
              playSong(radioQueue, 0);
              toast.dismiss();
              toast.success(`Radio started for ${song.name}`);
          }
      } catch(e) { toast.dismiss(); toast.error("Radio failed"); }
  };

  const handleQualityChange = (newQ) => {
    setQuality(newQ);
    if(currentSong && isPlaying) {
        playSong(queue, qIndex); 
        toast.success(`Quality set to ${newQ}`);
    }
  };

  const downloadSong = (song) => {
      const url = song.downloadUrl?.[song.downloadUrl.length-1]?.url;
      if(!url) return toast.error("Download failed");
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${song.name}.mp3`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Downloading...");
  };

  const togglePlay = () => {
    if(audioRef.current.paused) { audioRef.current.play(); setIsPlaying(true); } 
    else { audioRef.current.pause(); setIsPlaying(false); }
  };

  const handleSeek = (e) => {
    const w = e.currentTarget.clientWidth;
    const x = e.nativeEvent.offsetX;
    const seekTo = (x / w) * duration;
    audioRef.current.currentTime = seekTo;
    setProgress(seekTo);
  };

  const toggleShuffle = () => { setIsShuffle(!isShuffle); toast(!isShuffle ? 'Shuffle On' : 'Shuffle Off'); };
  const toggleRepeat = () => { 
    setRepeatMode(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none');
    toast(repeatMode === 'none' ? 'Repeat All' : repeatMode === 'all' ? 'Repeat One' : 'Repeat Off');
  };

  const removeFromQueue = (idx) => {
    const newQueue = queue.filter((_, i) => i !== idx);
    setQueue(newQueue);
    if(idx < qIndex) setQIndex(qIndex - 1);
    if(idx === qIndex) {
        if(newQueue.length > 0) playSong(newQueue, idx < newQueue.length ? idx : 0);
        else { audioRef.current.pause(); setCurrentSong(null); setIsPlaying(false); }
    }
  };

  const toggleLike = async (item) => {
    const liked = isLiked(item.id);
    let newLikes;
    
    // 1. Optimistic Update (Instant)
    if(liked) {
        newLikes = likedSongs.filter(s=>String(s.id)!==String(item.id));
        toast("Removed from Library", { icon: '💔' });
    } else {
        const clean = { id: String(item.id), name: getName(item), primaryArtists: getDesc(item), image: item.image||[], downloadUrl: item.downloadUrl||[], duration: item.duration||0 };
        newLikes = [...likedSongs, clean];
        toast.success("Added to Library");
    }
    syncLikes(newLikes);

    // 2. Cloud Sync (Lazy)
    if(auth && user.uid !== 'local-user') {
        const userRef = doc(db, "users", user.uid);
        if(liked) await updateDoc(userRef, { likedSongs: arrayRemove(item) });
        else {
             const clean = { id: String(item.id), name: getName(item), primaryArtists: getDesc(item), image: item.image||[], downloadUrl: item.downloadUrl||[], duration: item.duration||0 };
             await updateDoc(userRef, { likedSongs: arrayUnion(clean) });
        }
    }
  };

  const createPlaylist = async () => {
    if(!newPlaylistName.trim()) return;
    const newPl = { id: Date.now(), name: newPlaylistName, songs: [] };
    setUserPlaylists([...userPlaylists, newPl]);
    setNewPlaylistName(""); setShowPlaylistModal(false); toast.success("Playlist Created");
    
    if(auth && user.uid !== 'local-user') {
        try { await addDoc(collection(db, `users/${user.uid}/playlists`), newPl); } catch {}
    }
  };

  const addToPlaylist = async (playlistId) => {
    if(!songToAdd) return;
    const newPls = userPlaylists.map(pl => pl.id === playlistId ? { ...pl, songs: [...pl.songs, songToAdd] } : pl);
    setUserPlaylists(newPls);
    toast.success("Added to Playlist"); setShowAddToPlaylistModal(false);
    
    if(auth && user.uid !== 'local-user') {
        try {
            const clean = { id: String(songToAdd.id), name: getName(songToAdd), primaryArtists: getDesc(songToAdd), image: songToAdd.image||[], downloadUrl: songToAdd.downloadUrl||[] };
            await updateDoc(doc(db, `users/${user.uid}/playlists/${playlistId}`), { songs: arrayUnion(clean) });
        } catch {}
    }
  };

  // --- NAVIGATION ---
  const handleCardClick = async (item, type) => {
    if (type === 'song') { playSong([item], 0); }
    else if (type === 'playlist_custom') { setSelectedItem(item); setTab('details'); setDetailsSongs(item.songs || []); }
    else if (type === 'mood') {
        setLoading(true); setTab('mood'); setSelectedItem(item);
        try {
            const res = await fetch(`${API_BASE}/search/playlists?query=${encodeURIComponent(item.query)}`).then(r=>r.json());
            setMoodPlaylists(res?.data?.results || []);
        } catch(e) { console.error(e); } finally { setLoading(false); }
    }
    else {
      setSelectedItem(item); setTab('details'); setLoading(true); setDetailsSongs([]);
      try {
        let endpoint = type === 'album' ? `${API_BASE}/albums?id=${item.id}` : type === 'artist' ? `${API_BASE}/artists?id=${item.id}` : `${API_BASE}/playlists?id=${item.id}`;
        const res = await fetch(endpoint).then(r=>r.json());
        if(res.success) setDetailsSongs(res.data.songs || res.data.topSongs || []);
      } catch(e) { console.error(e); } finally { setLoading(false); }
    }
  };

  // --- AUTH & EFFECTS ---
  useEffect(() => {
    if(!auth) { fetchHome(); return; } 

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
            // Fallback to local storage if no user
            try {
                setHistory(JSON.parse(localStorage.getItem('musiq_history') || '[]'));
                setLikedSongs(JSON.parse(localStorage.getItem('musiq_liked') || '[]'));
            } catch {}
            fetchHome();
        }
    });
    return () => unsub();
  }, []);

  const handleAuth = async () => {
    if (!auth) { toast.error("Firebase not configured"); return; }
    const toastId = toast.loading("Authenticating...");
    try {
        if(authMode==='signup') {
            const c = await createUserWithEmailAndPassword(auth, authInput.email, authInput.password);
            await setDoc(doc(db, "users", c.user.uid), { email: authInput.email, likedSongs: [], history: [] });
        } else { await signInWithEmailAndPassword(auth, authInput.email, authInput.password); }
        toast.success("Welcome!", { id: toastId });
    } catch(e) { toast.error(e.message, { id: toastId }); }
  };

  useEffect(() => {
    const a = audioRef.current;
    const updateTime = () => { setProgress(a.currentTime); setDuration(a.duration||0); };
    const handleEnd = () => {
      if(repeatMode === 'one') { a.currentTime = 0; a.play(); }
      else if(isShuffle) { playSong(queue, Math.floor(Math.random() * queue.length)); }
      else if(qIndex < queue.length - 1) { playSong(queue, qIndex + 1); }
      else if(repeatMode === 'all') { playSong(queue, 0); }
      else { setIsPlaying(false); }
    };
    a.addEventListener('timeupdate', updateTime); a.addEventListener('ended', handleEnd);
    return () => { a.removeEventListener('timeupdate', updateTime); a.removeEventListener('ended', handleEnd); };
  }, [queue, qIndex, repeatMode, isShuffle]);

  useEffect(() => {
    const handleKey = (e) => {
        if(e.target.tagName==='INPUT') return;
        if(e.code==='Space') { e.preventDefault(); togglePlay(); }
        if(e.code==='ArrowRight') audioRef.current.currentTime += 5;
        if(e.code==='ArrowLeft') audioRef.current.currentTime -= 5;
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPlaying]);

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

  useEffect(() => { document.title = currentSong ? `${getName(currentSong)} • Aura` : "Aura Music"; }, [currentSong]);

  if(view==='loading') return <div style={{height:'100vh',background:'black',display:'flex',justifyContent:'center',alignItems:'center',color:'white'}}>Loading...</div>;

  if(view==='auth') return (
    <div className="auth-container">
        <Toaster/>
        <div className="auth-box">
            <h1 className="brand">Aura.</h1>
            <input className="auth-input" placeholder="Email" onChange={e=>setAuthInput({...authInput,email:e.target.value})}/>
            <input className="auth-input" type="password" placeholder="Password" onChange={e=>setAuthInput({...authInput,password:e.target.value})}/>
            <button className="auth-btn" onClick={handleAuth}>{authMode==='login'?'Sign In':'Sign Up'}</button>
            <p style={{color:'#666', marginTop:20, cursor:'pointer'}} onClick={()=>setAuthMode(authMode==='login'?'signup':'login')}>{authMode==='login'?'Create Account':'Login'}</p>
            <p style={{color:'#aaa', marginTop:10, fontSize:'0.8rem', cursor:'pointer'}} onClick={()=>{ setUser({email:'guest@aura.app', uid:'local-user'}); setView('app'); }}>Skip Login</p>
        </div>
    </div>
  );

  return (
    <div className="app-layout">
        <Toaster position="top-center" toastOptions={{style:{background:'#333', color:'#fff'}}}/>

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
            <div className="brand">Aura.</div>
            <div className="nav-links">
                <div className={`nav-item ${tab==='home'?'active':''}`} onClick={()=>setTab('home')}><Icons.Home/> Home</div>
                <div className={`nav-item ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}><Icons.Search/> Search</div>
                <div className={`nav-item ${tab==='library'?'active':''}`} onClick={()=>setTab('library')}><Icons.Library/> Liked Songs</div>
                <div className={`nav-item ${tab==='profile'?'active':''}`} onClick={()=>setTab('profile')}><span style={{fontSize:'1.2rem'}}>👤</span> Profile</div>
                
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
                    <Icons.Search/>
                    <input placeholder="Search songs, artists, albums..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}/>
                </div>
                <div className="user-pill" onClick={()=>setTab('profile')}>
                    <div className="avatar">{user.email[0].toUpperCase()}</div>
                </div>
            </div>

            <div className="scroll-area">
                {/* PROFILE VIEW */}
                {tab === 'profile' && (
                    <div className="profile-view">
                        <div className="profile-header">
                            <div className="profile-avatar-large">{user.email[0].toUpperCase()}</div>
                            <div className="profile-info">
                                <div className="profile-label">Profile</div>
                                <h1 className="profile-name">{user.email.split('@')[0]}</h1>
                                <button className="btn-logout" onClick={()=>{
                                    if(auth) signOut(auth);
                                    setUser(null); setView('auth'); 
                                }}>Logout</button>
                            </div>
                        </div>
                        <div className="section-header">Your Library ({likedSongs.length})</div>
                        <div className="grid">
                            {likedSongs.map((s, i) => (
                                <div key={s.id} className="card" onClick={()=>playSong(likedSongs, i)}>
                                    <img src={getImg(s.image)} alt=""/>
                                    <h3>{getName(s)}</h3>
                                    <p>{getDesc(s)}</p>
                                </div>
                            ))}
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
                                        <button className="icon-action" onClick={()=>startRadio(s)}><Icons.Radio/></button>
                                        <button className="icon-action" onClick={()=>downloadSong(s)}><Icons.Download/></button>
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
                                <div className="section-header">Songs</div>
                                <div className="grid">
                                    {resSongs.map(s => (
                                        <div key={s.id} className="card" onClick={()=>handleCardClick(s, 'song')}>
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
                        {resAlbums.length > 0 && (
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
                        {resArtists.length > 0 && (
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
                        {resPlaylists.length > 0 && (
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

                {/* HOME */}
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

                        {/* 3. Trending */}
                        <div className="section">
                            <div className="section-header">Trending Now</div>
                            <div className="horizontal-scroll">
                                {homeData.trending.map(s => (
                                    <div key={s.id} className="card" onClick={()=>handleCardClick(s, 'song')}>
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
                        </div>

                        {/* 4. Top Charts */}
                        <div className="section">
                            <div className="section-header">Top Charts</div>
                            <div className="horizontal-scroll">
                                {homeData.charts.map(p => (
                                    <div key={p.id} className="card" onClick={()=>handleCardClick(p, 'playlist')}>
                                        <img src={getImg(p.image)} alt=""/>
                                        <h3>{getName(p)}</h3>
                                        <p>{p.language}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 5. New Albums */}
                        <div className="section">
                            <div className="section-header">New Albums</div>
                            <div className="horizontal-scroll">
                                {homeData.newAlbums.map(a => (
                                    <div key={a.id} className="card" onClick={()=>handleCardClick(a, 'album')}>
                                        <img src={getImg(a.image)} alt=""/>
                                        <h3>{getName(a)}</h3>
                                        <p>{a.year}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 6. Radio (Artists) */}
                        <div className="section">
                            <div className="section-header">Radio Stations</div>
                            <div className="horizontal-scroll">
                                {homeData.radio.map(a => (
                                    <div key={a.id} className="card" onClick={()=>handleCardClick(a, 'artist')}>
                                        <img src={getImg(a.image)} alt="" style={{borderRadius:'50%'}}/>
                                        <h3 style={{textAlign:'center'}}>{getName(a)}</h3>
                                        <p style={{textAlign:'center', fontSize:'0.8rem'}}>Artist Radio</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* NEW: 6.5 Top Artists */}
                        <div className="section">
                            <div className="section-header">Top Artists</div>
                            <div className="horizontal-scroll">
                                {homeData.topArtists.map(a => (
                                    <div key={a.id} className="card" onClick={()=>handleCardClick(a, 'artist')}>
                                        <img src={getImg(a.image)} alt="" style={{borderRadius:'50%'}}/>
                                        <h3 style={{textAlign:'center'}}>{getName(a)}</h3>
                                        <p style={{textAlign:'center', fontSize:'0.8rem'}}>Artist</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 7. Editorial */}
                        <div className="section">
                            <div className="section-header">Editorial Picks</div>
                            <div className="horizontal-scroll">
                                {homeData.editorial.map(p => (
                                    <div key={p.id} className="card" onClick={()=>handleCardClick(p, 'playlist')}>
                                        <img src={getImg(p.image)} alt=""/>
                                        <h3>{getName(p)}</h3>
                                        <p>Featured</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 8. Fresh Hits */}
                        <div className="section">
                            <div className="section-header">Fresh Hits</div>
                            <div className="horizontal-scroll">
                                {homeData.fresh.map(p => (
                                    <div key={p.id} className="card" onClick={()=>handleCardClick(p, 'playlist')}>
                                        <img src={getImg(p.image)} alt=""/>
                                        <h3>{getName(p)}</h3>
                                        <p>New Music</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 9. 90s Magic */}
                        <div className="section">
                            <div className="section-header">Best of 90s</div>
                            <div className="horizontal-scroll">
                                {homeData.nineties.map(p => (
                                    <div key={p.id} className="card" onClick={()=>handleCardClick(p, 'playlist')}>
                                        <img src={getImg(p.image)} alt=""/>
                                        <h3>{getName(p)}</h3>
                                        <p>Nostalgia</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 10. Hindi Pop */}
                        <div className="section">
                            <div className="section-header">New Hindi Pop</div>
                            <div className="horizontal-scroll">
                                {homeData.hindiPop.map(a => (
                                    <div key={a.id} className="card" onClick={()=>handleCardClick(a, 'album')}>
                                        <img src={getImg(a.image)} alt=""/>
                                        <h3>{getName(a)}</h3>
                                        <p>{a.year}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
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
        <div className={`player-bar ${currentSong ? 'visible' : ''}`} style={{transform: currentSong ? 'translateY(0)' : 'translateY(100%)', transition:'transform 0.3s'}}>
            {currentSong && (
                <>
                    {/* Mobile Progress Bar (Visual only, top of player) */}
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
                        {/* TIMELINE */}
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
                        <input type="range" className="volume-slider" min="0" max="1" step="0.1" value={volume} onChange={e=>{setVolume(e.target.value); audioRef.current.volume=e.target.value}}/>
                        <select className="quality-select" value={quality} onChange={e=>handleQualityChange(e.target.value)}>
                            <option value="320kbps">320kbps</option>
                            <option value="160kbps">160kbps</option>
                            <option value="96kbps">96kbps</option>
                        </select>
                    </div>

                    {/* Mobile Controls (Only visible on small screens via CSS) */}
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
            <div className={`nav-tab ${tab==='profile'?'active':''}`} onClick={()=>setTab('profile')}>👤 Profile</div>
        </div>
    </div>
  );
}

export default App;
