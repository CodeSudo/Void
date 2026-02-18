import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import toast, { Toaster } from 'react-hot-toast';

// --- FIREBASE IMPORTS ---
import { auth, db } from './firebase'; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, onSnapshot, query } from 'firebase/firestore';

const API_BASE = "https://saavn.sumit.co/api";

// --- STATIC DATA ---
const MOODS = [
  { id: 'm1', name: 'Party', color: '#e57373', query: 'Party Hits' },
  { id: 'm2', name: 'Romance', color: '#f06292', query: 'Love Songs' },
  { id: 'm3', name: 'Sad', color: '#ba68c8', query: 'Sad Songs' },
  { id: 'm4', name: 'Workout', color: '#ffb74d', query: 'Gym Motivation' },
  { id: 'm5', name: 'Chill', color: '#4db6ac', query: 'Chill Lo-Fi' },
  { id: 'm6', name: 'Retro', color: '#7986cb', query: 'Retro Classics' },
];

// --- ICONS ---
const ICONS = {
  Search: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Home: () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  Explore: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  Radio: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>,
  Heart: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Play: () => <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Pause: () => <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  Next: () => <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>,
  Prev: () => <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>,
  Shuffle: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>,
  Repeat: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  RepeatOne: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="10" y="15" fontSize="8" fill="currentColor" style={{fontWeight:'bold'}}>1</text></svg>,
  Dots: () => <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/></svg>,
  Library: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  Back: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
  Mic: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  Plus: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
};

function App() {
  // --- UI STATE ---
  const [view, setView] = useState('loading');
  const [tab, setTab] = useState('home'); 
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  
  // --- DATA STATE ---
  const [homeData, setHomeData] = useState({ 
    trending: [], charts: [], newAlbums: [], editorial: [], radio: [], topArtists: [], love: [], fresh: [], nineties: [], hindiPop: [] 
  });
  const [resSongs, setResSongs] = useState([]);
  const [resAlbums, setResAlbums] = useState([]);
  const [resArtists, setResArtists] = useState([]);
  const [resPlaylists, setResPlaylists] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [moodPlaylists, setMoodPlaylists] = useState([]);
  
  const [history, setHistory] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  
  // --- DETAILS STATE ---
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailsSongs, setDetailsSongs] = useState([]);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsText, setLyricsText] = useState("");
  
  // --- PLAYER STATE ---
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
  
  // --- AUTH STATE ---
  const [authMode, setAuthMode] = useState('login');
  const [authInput, setAuthInput] = useState({ email: '', password: '' });

  // --- HELPERS ---
  const getImg = (i) => { if(Array.isArray(i)) return i[i.length-1]?.url || i[0]?.url; return i || "https://via.placeholder.com/150"; }
  const getName = (i) => i?.name || i?.title || "Unknown";
  const getDesc = (i) => i?.primaryArtists || i?.description || i?.year || "";
  const isLiked = (id) => likedSongs.some(s => String(s.id) === String(id));
  const formatTime = (s) => { if(isNaN(s)) return "0:00"; const m=Math.floor(s/60), sc=Math.floor(s%60); return `${m}:${sc<10?'0'+sc:sc}`; }

  // --- 1. DATA FETCHING ---
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
    finally { setLoading(false); }
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
      setResSongs(s?.data?.results || []); 
      setResAlbums(a?.data?.results || []); 
      setResArtists(ar?.data?.results || []); 
      setResPlaylists(p?.data?.results || []);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  // --- 2. PLAYER LOGIC & HISTORY ---
  const addToHistory = async (song) => {
    // 1. Optimistic Update (Local State)
    const newHist = [song, ...history.filter(s => String(s.id) !== String(song.id))].slice(0, 15);
    setHistory(newHist);

    // 2. Persist
    if (user) {
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { history: newHist });
        } catch (e) { console.error("Error saving history", e); }
    } else {
        localStorage.setItem('musiq_history', JSON.stringify(newHist));
    }
  };

  const playSong = (list, idx) => {
    if(!list || !list[idx]) return;
    setQueue(list); setQIndex(idx);
    const s = list[idx];
    setCurrentSong(s);
    addToHistory(s);
    
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

  // --- 3. LIKE & PLAYLIST ---
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
        const clean = { id: String(item.id), name: getName(item), primaryArtists: getDesc(item), image: item.image||[], downloadUrl: item.downloadUrl||[], duration: item.duration||0 };
        setLikedSongs([...likedSongs, clean]);
        await updateDoc(userRef, { likedSongs: arrayUnion(clean) });
        toast.success("Added to Library");
    }
  };

  // --- 4. NAVIGATION HANDLER ---
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
        let endpoint = '';
        if(type === 'album') endpoint = `${API_BASE}/albums?id=${item.id}`;
        else if(type === 'playlist') endpoint = `${API_BASE}/playlists?id=${item.id}`;
        else if(type === 'artist') endpoint = `${API_BASE}/artists?id=${item.id}`;
        
        const res = await fetch(endpoint).then(r=>r.json());
        if(res.success) {
            // Check for topSongs (Artists) or songs (Albums/Playlists)
            const songs = res.data.songs || res.data.topSongs || [];
            setDetailsSongs(songs);
        }
      } catch(e) { console.error(e); } finally { setLoading(false); }
    }
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

  // --- 5. EFFECTS (Auth, Audio, Keys) ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
        if(u) {
            setUser(u); setView('app'); fetchHome();
            try {
                const userSnap = await getDoc(doc(db, "users", u.uid));
                if(userSnap.exists()) {
                    const data = userSnap.data();
                    setLikedSongs(data.likedSongs || []);
                    setHistory(data.history || []); // Load Cloud History
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

  // --- RENDER ---
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

        {/* 1. SIDEBAR */}
        <div className="sidebar">
            <div className="brand"><span>⚡</span> winamp</div>
            <div className="nav-section">
                <div className="nav-title">Menu</div>
                <div className={`nav-item ${tab==='home'?'active':''}`} onClick={()=>setTab('home')}><ICONS.Home/> Home</div>
                <div className={`nav-item ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}><ICONS.Search/> Search</div>
                <div className={`nav-item ${tab==='library'?'active':''}`} onClick={()=>setTab('library')}><ICONS.Library/> Library</div>
            </div>
            <div className="nav-section">
                <div className="nav-title">My Playlists</div>
                {userPlaylists.map(pl => (
                    <div key={pl.id} className="nav-item" onClick={()=>handleCardClick(pl, 'playlist_custom')}>🎵 {pl.name}</div>
                ))}
            </div>
        </div>

        {/* 2. MAIN CONTENT */}
        <div className="main-content">
            <div className="header">
                <div className="search-box">
                    <ICONS.Search/>
                    <input placeholder="Search music, artists..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}/>
                </div>
                <div className="user-pill" onClick={()=>signOut(auth)}>
                    <div className="avatar">{user.email[0].toUpperCase()}</div>
                </div>
            </div>

            <div className="scroll-area">
                {/* HOME TAB */}
                {tab === 'home' && (
                    <>
                        {/* Hero */}
                        <div className="hero">
                            <div className="hero-content">
                                <div style={{marginBottom:10, color:'#555', fontWeight:700, fontSize:'0.8rem'}}>Trending Now</div>
                                <h1>{homeData.trending[0] ? getName(homeData.trending[0]) : "Loading..."}</h1>
                                <p>Top Hit</p>
                                <div className="hero-stats">
                                    <button className="btn-listen" onClick={()=>playSong(homeData.trending, 0)}>
                                        <div style={{width:20,height:20,background:'var(--primary)',borderRadius:'50%',display:'flex',justifyContent:'center',alignItems:'center'}}><ICONS.Play/></div>
                                        Listen now
                                    </button>
                                </div>
                            </div>
                            <img className="hero-img" src={homeData.trending[0] ? getImg(homeData.trending[0].image) : ""} alt=""/>
                        </div>

                        {/* Sections Loop */}
                        {[
                            { title: "Recently Played", data: history, type: 'song' },
                            { title: "Top Artists", data: homeData.topArtists, type: 'artist' },
                            { title: "Trending Songs", data: homeData.trending, type: 'song' },
                            { title: "Top Charts", data: homeData.charts, type: 'playlist' },
                            { title: "New Albums", data: homeData.newAlbums, type: 'album' },
                            { title: "Artist Radio", data: homeData.radio, type: 'artist' },
                            { title: "Editorial Picks", data: homeData.editorial, type: 'playlist' },
                            { title: "Fresh Hits", data: homeData.fresh, type: 'playlist' },
                            { title: "Best of 90s", data: homeData.nineties, type: 'playlist' },
                            { title: "New Hindi Pop", data: homeData.hindiPop, type: 'album' }
                        ].map((section, idx) => (
                            section.data.length > 0 && (
                                <div key={idx} className="section">
                                    <div className="section-header">
                                        <div className="section-title">{section.title}</div>
                                    </div>
                                    <div className="horizontal-scroll">
                                        {section.data.map(item => (
                                            <div key={item.id} className="album-card" onClick={()=>section.type==='song' ? playSong(section.data, section.data.indexOf(item)) : handleCardClick(item, section.type)}>
                                                <img src={getImg(item.image)} alt="" style={section.type==='artist' ? {borderRadius:'50%'} : {}}/>
                                                <h4>{getName(item)}</h4>
                                                <p>{section.type === 'song' ? getDesc(item) : section.type}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}

                        {/* Moods */}
                        <div className="section">
                            <div className="section-header"><div className="section-title">Moods</div></div>
                            <div className="horizontal-scroll">
                                {MOODS.map(m => (
                                    <div key={m.id} className="album-card" style={{minWidth:'160px', background:m.color, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'16px'}} onClick={()=>handleCardClick(m, 'mood')}>
                                        <h3 style={{fontSize:'1.2rem', color:'white', textAlign:'center'}}>{m.name}</h3>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* SEARCH TAB */}
                {tab === 'search' && (
                    <div className="section">
                        {resSongs.length>0 && (
                            <>
                                <div className="section-header"><div className="section-title">Songs</div></div>
                                <div className="grid">
                                    {resSongs.map(s => (
                                        <div key={s.id} className="album-card" onClick={()=>playSong(resSongs, resSongs.indexOf(s))}>
                                            <img src={getImg(s.image)} alt=""/>
                                            <h4>{getName(s)}</h4>
                                            <p>{getDesc(s)}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        {/* Artists, Albums, Playlists results... */}
                        {['Artists', 'Albums', 'Playlists'].map(type => {
                            const data = type==='Artists' ? resArtists : type==='Albums' ? resAlbums : resPlaylists;
                            const t = type==='Artists' ? 'artist' : type==='Albums' ? 'album' : 'playlist';
                            if(data.length === 0) return null;
                            return (
                                <div key={type} style={{marginTop:40}}>
                                    <div className="section-header"><div className="section-title">{type}</div></div>
                                    <div className="horizontal-scroll">
                                        {data.map(item => (
                                            <div key={item.id} className="album-card" onClick={()=>handleCardClick(item, t)}>
                                                <img src={getImg(item.image)} alt="" style={t==='artist'?{borderRadius:'50%'}:{}}/>
                                                <h4>{getName(item)}</h4>
                                                <p>{type}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* DETAILS / MOOD VIEW */}
                {(tab === 'details' || tab === 'mood') && selectedItem && (
                    <div className="details-view">
                        <button className="btn-back" onClick={()=>setTab('home')}><ICONS.Back/> Back</button>
                        <div className="details-header" style={tab==='mood'?{background:selectedItem.color, borderRadius:24, padding:40, marginBottom:30}:{}}>
                            {tab!=='mood' && <img className="details-art" src={getImg(selectedItem.image)} alt=""/>}
                            <div className="details-meta">
                                <h1>{tab==='mood' ? `${selectedItem.name} Mix` : getName(selectedItem)}</h1>
                                <p>{tab==='mood' ? 'Curated for you' : getDesc(selectedItem)}</p>
                                {tab!=='mood' && <button className="btn-play-all" onClick={()=>playSong(detailsSongs, 0)}>Play All</button>}
                            </div>
                        </div>
                        {/* List for Details, Grid for Moods */}
                        {tab === 'mood' ? (
                            <div className="grid">
                                {moodPlaylists.map(p => (
                                    <div key={p.id} className="album-card" onClick={()=>handleCardClick(p, 'playlist')}>
                                        <img src={getImg(p.image)} alt=""/>
                                        <h4>{getName(p)}</h4>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="track-list-main">
                                {detailsSongs.map((s, i) => (
                                    <div key={i} className="track-row-main" onClick={()=>playSong(detailsSongs, i)}>
                                        <img src={getImg(s.image)} alt=""/>
                                        <div className="t-info">
                                            <h4>{getName(s)}</h4>
                                            <p>{getDesc(s)}</p>
                                        </div>
                                        <div className="t-actions">
                                            <button className="btn-control" onClick={(e)=>{e.stopPropagation(); toggleLike(s)}}><ICONS.Heart/></button>
                                            <button className="btn-control" onClick={(e)=>{e.stopPropagation(); setSongToAdd(s); setShowAddToPlaylistModal(true)}}><ICONS.Plus/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* 3. RIGHT PANEL (Queue) - Hidden on Mobile */}
        <div className="right-panel">
            <div className="user-profile">
                <div className="user-avatar" onClick={()=>signOut(auth)} title="Logout">
                    <div style={{width:'100%',height:'100%',background:'white',color:'black',display:'flex',justifyContent:'center',alignItems:'center',fontWeight:'bold'}}>
                        {user?.email?.[0].toUpperCase()}
                    </div>
                </div>
            </div>
            {currentSong && (
                <>
                    <div className="now-playing-art">
                        <img src={getImg(currentSong.image)} alt="Current"/>
                        <div className="now-playing-info">
                            <h2>{getName(currentSong)}</h2>
                            <p style={{color:'#ccc'}}>{getDesc(currentSong)}</p>
                        </div>
                    </div>
                    <div className="queue-header"><h3>Queue</h3></div>
                    <div className="queue-list" style={{overflowY:'auto', flex:1}}>
                        {queue.map((t, i) => (
                            <div key={i} className={`q-item ${i === qIndex ? 'active' : ''}`} onClick={()=>playSong(queue, i)}>
                                <div className="q-num">{i === qIndex ? <ICONS.Play/> : i+1}</div>
                                <div className="q-title">{getName(t)}</div>
                                <div className="q-dur">{formatTime(t.duration)}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>

        {/* 4. PLAYER BAR */}
        {currentSong && (
            <div className="player-bar">
                <div className="pb-track">
                    <img src={getImg(currentSong.image)} alt=""/>
                    <div className="pb-info">
                        <h4 style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:150}}>{getName(currentSong)}</h4>
                        <p style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:150}}>{getDesc(currentSong)}</p>
                    </div>
                    {isPlaying && <div className="visualizer"><div className="bar"/><div className="bar"/><div className="bar"/><div className="bar"/></div>}
                </div>

                <div className="pb-controls">
                    <div className="pb-buttons">
                        <button className={`btn-control ${isShuffle?'active':''}`} onClick={toggleShuffle}><ICONS.Shuffle/></button>
                        <button className="btn-control" onClick={()=>playSong(queue, qIndex-1)}><ICONS.Prev/></button>
                        <button className="btn-play-main" onClick={togglePlay}>{isPlaying ? <ICONS.Pause/> : <ICONS.Play/>}</button>
                        <button className="btn-control" onClick={()=>playSong(queue, qIndex+1)}><ICONS.Next/></button>
                        <button className={`btn-control ${repeatMode!=='none'?'active':''}`} onClick={toggleRepeat}>{repeatMode==='one'?<ICONS.RepeatOne/>:<ICONS.Repeat/>}</button>
                    </div>
                    <div className="pb-progress" onClick={handleSeek}>
                        <div className="pb-fill" style={{width: `${(progress/duration)*100}%`}}></div>
                    </div>
                </div>

                <div className="pb-right">
                    <button className={`btn-control ${showLyrics?'active':''}`} onClick={fetchLyrics}><ICONS.Mic/></button>
                    <select className="quality-select" value={quality} onChange={e=>{setQuality(e.target.value); toast.success(`Quality: ${e.target.value}`)}}>
                        <option value="320kbps">320kbps</option>
                        <option value="160kbps">160kbps</option>
                    </select>
                </div>
                
                {/* Mobile Control Hook */}
                <div className="mobile-controls" style={{display:'none'}}>
                   <button className="btn-play-mobile" onClick={togglePlay}>{isPlaying ? <ICONS.Pause/> : <ICONS.Play/>}</button>
                </div>
            </div>
        )}

        {/* 5. MOBILE NAV */}
        <div className="bottom-nav">
            <div className={`nav-tab ${tab==='home'?'active':''}`} onClick={()=>setTab('home')}><ICONS.Home/> Home</div>
            <div className={`nav-tab ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}><ICONS.Search/> Search</div>
            <div className={`nav-tab ${tab==='library'?'active':''}`} onClick={()=>setTab('library')}><ICONS.Library/> Library</div>
        </div>
    </div>
  );
}

export default App;
