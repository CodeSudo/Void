import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import toast, { Toaster } from 'react-hot-toast';

// --- ICONS ---
const Icons = {
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
};

// FIREBASE
import { auth, db } from './firebase'; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, onSnapshot, query } from 'firebase/firestore';

const API_BASE = "https://saavn.sumit.co/api";

function App() {
  // --- UI STATE ---
  const [view, setView] = useState('loading'); 
  const [tab, setTab] = useState('home');   
  const [loading, setLoading] = useState(false);

  // --- USER STATE ---
  const [user, setUser] = useState(null);
  const [likedSongs, setLikedSongs] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]); 
  const [authMode, setAuthMode] = useState('login');
  const [authInput, setAuthInput] = useState({ email: '', password: '' });

  // --- DATA STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  // Added separate states for all search categories
  const [resSongs, setResSongs] = useState([]);
  const [resAlbums, setResAlbums] = useState([]);
  const [resArtists, setResArtists] = useState([]);
  const [resPlaylists, setResPlaylists] = useState([]);
  const [homeData, setHomeData] = useState({ trending:[], albums:[], playlists:[] });
  
  // --- DETAILS & MODALS ---
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailsSongs, setDetailsSongs] = useState([]);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsText, setLyricsText] = useState("");
  const [showQueue, setShowQueue] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [songToAdd, setSongToAdd] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");

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

  // --- HELPERS ---
  const getImg = (i) => { if(Array.isArray(i)) return i[i.length-1]?.url || i[0]?.url; return i || "https://via.placeholder.com/150"; }
  const getName = (i) => i?.name || i?.title || "Unknown";
  const getDesc = (i) => i?.primaryArtists || i?.description || i?.year || "";
  const isLiked = (id) => likedSongs.some(s => String(s.id) === String(id));

  // --- 1. DATA FETCHING ---
  const fetchHome = async () => {
    setLoading(true);
    try {
      const [s, a, p] = await Promise.all([
        fetch(`${API_BASE}/search/songs?query=Top 50&limit=15`).then(r=>r.json()).catch(()=>({})),
        fetch(`${API_BASE}/search/albums?query=New&limit=15`).then(r=>r.json()).catch(()=>({})),
        fetch(`${API_BASE}/search/playlists?query=Hits&limit=15`).then(r=>r.json()).catch(()=>({}))
      ]);
      setHomeData({ 
        trending: s?.data?.results || [], 
        albums: a?.data?.results || [], 
        playlists: p?.data?.results || [] 
      });
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const doSearch = async () => {
    if(!searchQuery) return;
    setLoading(true); setTab('search');
    try {
      // Fetches 4 Categories
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

  // --- 2. PLAYER LOGIC ---
  const playSong = (list, idx) => {
    if(!list || idx < 0 || !list[idx]) return;
    if(list !== queue) setQueue(list);
    setQIndex(idx);
    const s = list[idx];
    setCurrentSong(s);
    
    const url = s.downloadUrl?.find(u=>u.quality===quality)?.url || s.downloadUrl?.[0]?.url;
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
        else { audioRef.current.pause(); setCurrentSong(null); setIsPlaying(false); }
    }
  };

  // --- 3. PLAYLISTS & LIKES ---
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
        const clean = { id: String(songToAdd.id), name: getName(songToAdd), primaryArtists: getDesc(songToAdd), image: songToAdd.image||[], downloadUrl: songToAdd.downloadUrl||[] };
        await updateDoc(ref, { songs: arrayUnion(clean) });
        toast.success("Added to Playlist"); setShowAddToPlaylistModal(false);
    } catch(e) { toast.error("Failed"); }
  };

  // --- 4. DETAILS VIEW & NAVIGATION ---
  const handleCardClick = async (item, type) => {
    if (type === 'song') { 
      playSong([item], 0); 
    } 
    else if (type === 'playlist_custom') { 
      setSelectedItem(item); setTab('details'); setDetailsSongs(item.songs || []); 
    } 
    else {
      // Handles Albums, Playlists, and ARTISTS
      setSelectedItem(item); setTab('details'); setLoading(true); setDetailsSongs([]);
      try {
        let endpoint = '';
        if(type === 'album') endpoint = `${API_BASE}/albums?id=${item.id}`;
        else if(type === 'playlist') endpoint = `${API_BASE}/playlists?id=${item.id}`;
        else if(type === 'artist') endpoint = `${API_BASE}/artists?id=${item.id}`; // Artist support
        
        const res = await fetch(endpoint).then(r=>r.json());
        
        if(res.success) {
            // Artists usually return 'topSongs', others return 'songs'
            const songs = res.data.songs || res.data.topSongs || [];
            setDetailsSongs(songs);
        }
      } catch(e) { console.error(e); } finally { setLoading(false); }
    }
  };

  // --- 5. AUTH & LIFECYCLE ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
        if(u) {
            setUser(u); setView('app'); fetchHome();
            try {
                const userSnap = await getDoc(doc(db, "users", u.uid));
                if(userSnap.exists()) setLikedSongs(userSnap.data().likedSongs || []);
                else await setDoc(doc(db, "users", u.uid), { email: u.email, likedSongs: [] });
                const q = query(collection(db, `users/${u.uid}/playlists`));
                onSnapshot(q, (snapshot) => setUserPlaylists(snapshot.docs.map(d => ({id: d.id, ...d.data()}))));
            } catch {}
        } else { setUser(null); setView('auth'); }
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
    document.title = currentSong ? `${getName(currentSong)} • Musiq` : "Musiq Web Player";
  }, [currentSong]);

  // --- RENDER ---
  if(view==='loading') return <div style={{height:'100vh',background:'black',display:'flex',justifyContent:'center',alignItems:'center'}}>Loading...</div>;

  if(view==='auth') return (
    <div className="auth-container">
        <Toaster/>
        <div className="auth-box">
            <h1 style={{color:'var(--primary)', marginBottom:30}}>Musiq.</h1>
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

        {/* --- OVERLAYS --- */}
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

        {/* --- SIDEBAR --- */}
        <div className="sidebar">
            <div className="brand">Musiq.</div>
            <div className="nav-links">
                <div className={`nav-item ${tab==='home'?'active':''}`} onClick={()=>setTab('home')}><Icons.Home/> Home</div>
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

        {/* --- MAIN CONTENT --- */}
        <div className="main-content">
            <div className="header">
                <div className="search-box">
                    <Icons.Search/>
                    <input placeholder="Search tracks..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}/>
                </div>
                <div className="user-pill" onClick={()=>signOut(auth)}>
                    <div className="avatar">{user.email[0].toUpperCase()}</div>
                    <span>Logout</span>
                </div>
            </div>

            <div className="scroll-area">
                {/* DETAILS */}
                {tab === 'details' && selectedItem && (
                    <div className="details-view">
                        <button className="btn-back" onClick={()=>setTab('home')}>← Back</button>
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

                {/* SEARCH */}
                {tab === 'search' && (
                    <div className="section">
                        {/* Songs */}
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

                        {/* Albums */}
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

                        {/* Artists */}
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

                        {/* Playlists */}
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

                {/* HOME */}
                {tab === 'home' && (
                    <>
                        <div className="hero">
                            <h1>Welcome Back</h1>
                        </div>
                        <div className="section">
                            <div className="section-header">Trending Songs</div>
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
                        <div className="section">
                            <div className="section-header">New Albums</div>
                            <div className="horizontal-scroll">
                                {homeData.albums.map(a => (
                                    <div key={a.id} className="card" onClick={()=>handleCardClick(a, 'album')}>
                                        <img src={getImg(a.image)} alt=""/>
                                        <h3>{getName(a)}</h3>
                                        <p>{a.year}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="section">
                            <div className="section-header">Top Playlists</div>
                            <div className="horizontal-scroll">
                                {homeData.playlists.map(p => (
                                    <div key={p.id} className="card" onClick={()=>handleCardClick(p, 'playlist')}>
                                        <img src={getImg(p.image)} alt=""/>
                                        <h3>{getName(p)}</h3>
                                        <p>{p.language}</p>
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
                    <div className="p-track">
                        <img src={getImg(currentSong.image)} alt=""/>
                        <div className="p-info">
                            <h4>{getName(currentSong)}</h4>
                            <p>{getDesc(currentSong)}</p>
                        </div>
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
                    </div>
                    <div className="p-right">
                        <button className={`btn-icon ${showLyrics?'active':''}`} onClick={fetchLyrics}><Icons.Mic/></button>
                        <button className={`btn-icon ${showQueue?'active':''}`} onClick={()=>setShowQueue(!showQueue)}><Icons.List/></button>
                        <input type="range" className="volume-slider" min="0" max="1" step="0.1" value={volume} onChange={e=>{setVolume(e.target.value); audioRef.current.volume=e.target.value}}/>
                    </div>
                </>
            )}
        </div>

        {/* BOTTOM NAV (Mobile) */}
        <div className="bottom-nav">
            <div className={`nav-tab ${tab==='home'?'active':''}`} onClick={()=>setTab('home')}><Icons.Home/> Home</div>
            <div className={`nav-tab ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}><Icons.Search/> Search</div>
            <div className={`nav-tab ${tab==='library'?'active':''}`} onClick={()=>setTab('library')}><Icons.Library/> Library</div>
        </div>
    </div>
  );
}

export default App;
