import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { auth, db } from './firebase'; 
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove 
} from 'firebase/firestore';

const API_BASE = "https://saavn.sumit.co/api";

function App() {
  // Navigation & View State
  const [view, setView] = useState('loading'); // Start with a loading state
  const [tab, setTab] = useState('home');   
  const [loading, setLoading] = useState(false);

  // User State
  const [user, setUser] = useState(null);
  const [likedSongs, setLikedSongs] = useState([]);
  const [authMode, setAuthMode] = useState('login');
  const [authInput, setAuthInput] = useState({ email: '', password: '' });

  // Data State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Homepage Data
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [newAlbums, setNewAlbums] = useState([]);
  const [topPlaylists, setTopPlaylists] = useState([]);

  // Player State
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [qIndex, setQIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [quality, setQuality] = useState('320kbps');
  const [volume, setVolume] = useState(1);

  // ==============================
  // 1. DATA FETCHING (Defined First to avoid Crash)
  // ==============================
  const fetchHomepageData = async () => {
    setLoading(true);
    try {
      const [songs, albums, playlists] = await Promise.all([
        fetch(`${API_BASE}/search/songs?query=Top 50&limit=15`).then(r => r.json()),
        fetch(`${API_BASE}/search/albums?query=New&limit=15`).then(r => r.json()),
        fetch(`${API_BASE}/search/playlists?query=Hits&limit=15`).then(r => r.json())
      ]);

      if(songs.success && songs.data) setTrendingSongs(songs.data.results);
      if(albums.success && albums.data) setNewAlbums(albums.data.results);
      if(playlists.success && playlists.data) setTopPlaylists(playlists.data.results);

    } catch (e) { 
      console.error("Home load error", e); 
    } finally { 
      setLoading(false); 
    }
  };

  // ==============================
  // 2. AUTHENTICATION LISTENER
  // ==============================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // User Logged In
        setUser(currentUser);
        setView('app');
        fetchHomepageData(); // Safe to call now
        
        // Load Firestore Data
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setLikedSongs(docSnap.data().likedSongs || []);
          } else {
            await setDoc(docRef, { email: currentUser.email, likedSongs: [] });
          }
        } catch (err) { console.error("Firestore Error:", err); }

      } else {
        // User Logged Out
        setUser(null);
        setLikedSongs([]);
        setView('auth');
      }
    });
    return () => unsubscribe();
  }, []);

  // Auth Actions
  const handleAuth = async () => {
    if (!authInput.email || !authInput.password) return alert("Fill all fields");
    try {
      if (authMode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, authInput.email, authInput.password);
        await setDoc(doc(db, "users", cred.user.uid), { email: authInput.email, likedSongs: [] });
      } else {
        await signInWithEmailAndPassword(auth, authInput.email, authInput.password);
      }
    } catch (e) { alert(e.message); }
  };

  const logout = async () => {
    await signOut(auth);
    audioRef.current.pause();
    setIsPlaying(false);
    setCurrentSong(null);
  };

  // ==============================
  // 3. APP LOGIC
  // ==============================
  
  // Safe Image Helper (Prevents white screen crashes)
  const getImg = (imgArray) => {
    if (!imgArray) return "https://via.placeholder.com/150"; // Fallback
    if (Array.isArray(imgArray)) {
        return imgArray[imgArray.length - 1]?.url || imgArray[0]?.url;
    }
    return imgArray;
  };

  const toggleLike = async (song) => {
    if (!user) return;
    const isLiked = likedSongs.some(s => s.id === song.id);
    let newLikes = isLiked ? likedSongs.filter(s => s.id !== song.id) : [...likedSongs, song];
    setLikedSongs(newLikes);

    const ref = doc(db, "users", user.uid);
    try {
      if (isLiked) await updateDoc(ref, { likedSongs: arrayRemove(song) });
      else await updateDoc(ref, { likedSongs: arrayUnion(song) });
    } catch (e) { console.error(e); }
  };

  const doSearch = async () => {
    if (!searchQuery) { setSearchResults([]); return; }
    setLoading(true); setTab('search_results');
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data.results);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // Smart Play (Handles Albums/Playlists)
  const handleCardClick = async (item, type) => {
    if (type === 'song') {
      playSong([item], 0);
    } else {
      setLoading(true);
      try {
        let endpoint = type === 'album' 
          ? `${API_BASE}/albums?id=${item.id}` 
          : `${API_BASE}/playlists?id=${item.id}`;
        
        const res = await fetch(endpoint);
        const data = await res.json();
        
        if (data.success && data.data.songs) {
          playSong(data.data.songs, 0);
        } else {
          alert("No songs found.");
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
  };

  const playSong = (list, idx) => {
    if (idx < 0 || idx >= list.length) return;
    if (list !== queue) setQueue(list);
    setQIndex(idx);
    const song = list[idx];
    setCurrentSong(song);
    
    // Determine URL with Safety Check
    if(!song.downloadUrl) return alert("Audio unavailable");

    let match = song.downloadUrl.find(u => u.quality === quality);
    let url = match ? match.url : (song.downloadUrl[song.downloadUrl.length - 1]?.url || song.downloadUrl[0]?.url);
    
    if (audioRef.current.src !== url) {
      audioRef.current.src = url;
      audioRef.current.volume = volume;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.error("Playback error:", e));
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Player Events
  const togglePlay = () => {
    if (audioRef.current.paused) { audioRef.current.play(); setIsPlaying(true); }
    else { audioRef.current.pause(); setIsPlaying(false); }
  };

  useEffect(() => {
    const a = audioRef.current;
    const time = () => { setProgress(a.currentTime); setDuration(a.duration||0); };
    const end = () => playSong(queue, qIndex+1);
    a.addEventListener('timeupdate', time);
    a.addEventListener('ended', end);
    return () => { a.removeEventListener('timeupdate', time); a.removeEventListener('ended', end); };
  }, [queue, qIndex]);

  // ==============================
  // 4. RENDER
  // ==============================

  // 1. Initial Loading State (Prevents Black Screen on Load)
  if (view === 'loading') {
    return <div className="auth-wrapper"><div className="loader"></div></div>;
  }

  // 2. Auth Screen
  if (view === 'auth') {
    return (
      <div className="auth-wrapper">
        <div className="auth-box">
          <h1 className="logo" style={{fontSize:'3rem', marginBottom:'20px'}}>Musiq.</h1>
          <input placeholder="Email" type="email" value={authInput.email} onChange={e=>setAuthInput({...authInput,email:e.target.value})} className="auth-input"/>
          <input type="password" placeholder="Password" value={authInput.password} onChange={e=>setAuthInput({...authInput,password:e.target.value})} className="auth-input"/>
          <button className="auth-btn" onClick={handleAuth}>{authMode==='login'?'Sign In':'Sign Up'}</button>
          <p style={{color:'#666', marginTop:'15px', cursor:'pointer'}} onClick={()=>setAuthMode(authMode==='login'?'signup':'login')}>
            {authMode==='login'?'Create Account':'Have Account?'}
          </p>
        </div>
      </div>
    );
  }

  // 3. Main App
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo">Musiq.</div>
        <div className={`nav-item ${tab==='home'?'active':''}`} onClick={()=>{setTab('home'); setSearchQuery(''); setSearchResults([]);}}>
          <span>🏠</span> Home
        </div>
        <div className={`nav-item ${tab==='library'?'active':''}`} onClick={()=>setTab('library')}>
          <span>❤️</span> Liked Songs
        </div>
      </div>

      {/* Content */}
      <div className="main-content">
        <div className="header">
          <div className="search-bar">
            <span>🔍</span>
            <input 
              placeholder="Search songs, artists..." 
              value={searchQuery}
              onChange={e=>setSearchQuery(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&doSearch()}
            />
          </div>
          <div className="user-pill" onClick={logout}>
            <div className="avatar">{user.email ? user.email[0].toUpperCase() : 'U'}</div>
            <span style={{fontSize:'0.9rem', color:'#aaa', marginLeft:'10px'}}>Logout</span>
          </div>
        </div>

        <div className="scroll-area">
          {loading && <div className="loader"></div>}

          {/* SEARCH RESULTS */}
          {tab === 'search_results' && (
             <>
                <h2>Search Results</h2>
                <div className="grid">
                    {searchResults.map((item) => (
                      <div key={item.id} className="card" onClick={()=>handleCardClick(item, 'song')}>
                        <img src={getImg(item.image)} alt=""/>
                        <h3>{item.name}</h3>
                        <p>{item.primaryArtists}</p>
                        <div className={`card-heart ${user && likedSongs.some(s=>s.id===item.id)?'liked':''}`} onClick={(e)=>{e.stopPropagation(); toggleLike(item)}}>♥</div>
                      </div>
                    ))}
                </div>
                {searchResults.length === 0 && !loading && <p style={{color:'#666'}}>No results found.</p>}
             </>
          )}

          {/* HOMEPAGE */}
          {tab === 'home' && (
            <>
              {/* Section 1: Trending */}
              <div className="section">
                <div className="section-header">
                    <div className="section-title">Trending Now</div>
                    <div className="section-subtitle">Top hits of the week</div>
                </div>
                <div className="horizontal-scroll">
                    {trendingSongs.length > 0 ? trendingSongs.map((item, idx) => (
                      <div key={item.id} className="card" onClick={()=>handleCardClick(item, 'song')}>
                        <img src={getImg(item.image)} alt=""/>
                        <h3>{item.name || item.title}</h3>
                        <p>{item.primaryArtists}</p>
                      </div>
                    )) : <p style={{color:'#666', padding:'20px'}}>Loading...</p>}
                </div>
              </div>

              {/* Section 2: Albums */}
              <div className="section">
                <div className="section-header">
                    <div className="section-title">New Releases</div>
                    <div className="section-subtitle">Fresh albums for you</div>
                </div>
                <div className="horizontal-scroll">
                    {newAlbums.map((item) => (
                      <div key={item.id} className="card" onClick={()=>handleCardClick(item, 'album')}>
                        <img src={getImg(item.image)} alt=""/>
                        <h3>{item.name || item.title}</h3>
                        <p>{item.description || item.year}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Section 3: Playlists */}
              <div className="section">
                <div className="section-header">
                    <div className="section-title">Top Playlists</div>
                    <div className="section-subtitle">Curated for every mood</div>
                </div>
                <div className="horizontal-scroll">
                    {topPlaylists.map((item) => (
                      <div key={item.id} className="card" onClick={()=>handleCardClick(item, 'playlist')}>
                        <img src={getImg(item.image)} alt=""/>
                        <h3>{item.title || item.name}</h3>
                        <p>{item.language} • {item.songCount || 'Mix'}</p>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}

          {/* LIBRARY */}
          {tab === 'library' && (
            <>
              <h2>Liked Songs</h2>
              {likedSongs.length === 0 ? <p style={{color:'#666'}}>No songs liked yet.</p> : (
                 <div className="grid">
                    {likedSongs.map((item, idx) => (
                      <div key={item.id} className="card" onClick={()=>playSong(likedSongs, idx)}>
                        <img src={getImg(item.image)} alt=""/>
                        <h3>{item.name}</h3>
                        <p>{item.primaryArtists}</p>
                        <div className="card-heart liked" onClick={(e)=>{e.stopPropagation(); toggleLike(item)}}>♥</div>
                      </div>
                    ))}
                 </div>
              )}
            </>
          )}
        </div>

        {/* Player Bar */}
        <div className={`player-bar ${currentSong ? 'visible' : ''}`}>
          {currentSong && (
            <>
              <div className="p-left">
                <img src={getImg(currentSong.image)} alt=""/>
                <div>
                   <h4 style={{color:'white', fontSize:'0.95rem'}}>{currentSong.name}</h4>
                   <p style={{color:'#888', fontSize:'0.8rem'}}>{currentSong.primaryArtists}</p>
                </div>
              </div>
              
              <div className="p-center">
                 <div className="p-controls">
                    <span style={{color:'#aaa', cursor:'pointer'}} onClick={()=>playSong(queue, qIndex-1)}>⏮</span>
                    <div className="btn-play" onClick={togglePlay}>{isPlaying ? "||" : "▶"}</div>
                    <span style={{color:'#aaa', cursor:'pointer'}} onClick={()=>playSong(queue, qIndex+1)}>⏭</span>
                 </div>
                 <div className="progress-rail" onClick={(e)=>{
                    const w = e.currentTarget.clientWidth;
                    const x = e.nativeEvent.offsetX;
                    audioRef.current.currentTime = (x/w)*duration;
                 }}>
                    <div className="progress-fill" style={{width: `${(progress/duration)*100}%`}}></div>
                 </div>
              </div>

              <div className="p-right">
                 <span style={{fontSize:'0.8rem', color:'#aaa'}}>🔊</span>
                 <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={volume} onChange={(e)=>{
                        setVolume(e.target.value); 
                        audioRef.current.volume = e.target.value;
                    }}
                    className="volume-slider"
                 />
                 <select className="quality-select" value={quality} onChange={(e)=>{setQuality(e.target.value)}}>
                    <option value="320kbps">320kbps</option>
                    <option value="160kbps">160kbps</option>
                 </select>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
