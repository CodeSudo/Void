import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const API_BASE = "https://saavn.sumit.co/api";

function App() {
  // --- UI State ---
  const [view, setView] = useState('auth'); 
  const [tab, setTab] = useState('home');   
  const [loading, setLoading] = useState(false);

  // --- User State (Local Storage) ---
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authInput, setAuthInput] = useState({ username: '', password: '' });

  // --- Data State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // --- Homepage Data ---
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [newAlbums, setNewAlbums] = useState([]);
  const [topPlaylists, setTopPlaylists] = useState([]);

  // --- Player State ---
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
  // 1. DATA FETCHING
  // ==============================
  const fetchHomepageData = async () => {
    setLoading(true);
    try {
      // Fetch 3 categories in parallel
      const [songs, albums, playlists] = await Promise.all([
        fetch(`${API_BASE}/search/songs?query=Top 50&limit=15`).then(r => r.json()),
        fetch(`${API_BASE}/search/albums?query=New&limit=15`).then(r => r.json()),
        fetch(`${API_BASE}/search/playlists?query=Hits&limit=15`).then(r => r.json())
      ]);

      if(songs.success) setTrendingSongs(songs.data.results);
      if(albums.success) setNewAlbums(albums.data.results);
      if(playlists.success) setTopPlaylists(playlists.data.results);

    } catch (e) { console.error("Home data error", e); } 
    finally { setLoading(false); }
  };

  // ==============================
  // 2. AUTH (Local Storage)
  // ==============================
  useEffect(() => {
    const stored = localStorage.getItem('musiq_user');
    if (stored) {
      setUser(JSON.parse(stored));
      setView('app');
      fetchHomepageData(); // Load home data immediately
    }
  }, []);

  const handleAuth = () => {
    if (!authInput.username || !authInput.password) return alert("Fill all fields");
    const dbUsers = JSON.parse(localStorage.getItem('musiq_users') || "[]");

    if (authMode === 'signup') {
      if (dbUsers.find(u => u.username === authInput.username)) return alert("Username taken");
      const newUser = { ...authInput, likedSongs: [] };
      dbUsers.push(newUser);
      localStorage.setItem('musiq_users', JSON.stringify(dbUsers));
      login(newUser);
    } else {
      const found = dbUsers.find(u => u.username === authInput.username && u.password === authInput.password);
      if (found) login(found);
      else alert("Invalid credentials");
    }
  };

  const login = (u) => {
    setUser(u);
    localStorage.setItem('musiq_user', JSON.stringify(u));
    setView('app');
    fetchHomepageData();
    setAuthInput({ username: '', password: '' });
  };

  const logout = () => {
    setUser(null); localStorage.removeItem('musiq_user');
    setView('auth'); setCurrentSong(null); setIsPlaying(false);
    audioRef.current.pause();
  };

  // ==============================
  // 3. LOGIC (Search, Likes, Smart Play)
  // ==============================
  const toggleLike = (song) => {
    if (!user) return;
    const isLiked = user.likedSongs.some(s => s.id === song.id);
    let newLikes = isLiked ? user.likedSongs.filter(s => s.id !== song.id) : [...user.likedSongs, song];
    const updatedUser = { ...user, likedSongs: newLikes };
    setUser(updatedUser);
    localStorage.setItem('musiq_user', JSON.stringify(updatedUser));
    
    // Sync DB
    const dbUsers = JSON.parse(localStorage.getItem('musiq_users') || "[]");
    const idx = dbUsers.findIndex(u => u.username === user.username);
    if (idx !== -1) {
      dbUsers[idx] = updatedUser;
      localStorage.setItem('musiq_users', JSON.stringify(dbUsers));
    }
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

  // Handles clicking Cards (Songs vs Albums)
  const handleCardClick = async (item, type) => {
    if (type === 'song') {
      playSong([item], 0);
    } else {
      // It's an Album/Playlist -> Fetch songs inside
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

  // ==============================
  // 4. PLAYER ENGINE
  // ==============================
  const playSong = (list, idx) => {
    if (idx < 0 || idx >= list.length) return;
    if (list !== queue) setQueue(list);
    setQIndex(idx);
    const song = list[idx];
    setCurrentSong(song);
    
    // URL Safety Check
    if (!song.downloadUrl) return alert("Audio not available");

    let match = song.downloadUrl.find(u => u.quality === quality);
    let url = match ? match.url : (song.downloadUrl[song.downloadUrl.length - 1]?.url || song.downloadUrl[0]?.url);
    
    if (audioRef.current.src !== url) {
      audioRef.current.src = url;
      audioRef.current.volume = volume;
      audioRef.current.play().then(()=>setIsPlaying(true)).catch(e=>console.error(e));
    } else {
      audioRef.current.play(); setIsPlaying(true);
    }
  };

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

  const getImg = (i) => Array.isArray(i) ? i[i.length-1].url : i;
  const isLiked = (id) => user?.likedSongs.some(s => s.id === id);

  // ==============================
  // 5. RENDER
  // ==============================

  if (view === 'auth') {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1 className="logo" style={{fontSize:'3rem', marginBottom:'20px'}}>Musiq.</h1>
          <input placeholder="Username" value={authInput.username} onChange={e=>setAuthInput({...authInput,username:e.target.value})} className="auth-input"/>
          <input type="password" placeholder="Password" value={authInput.password} onChange={e=>setAuthInput({...authInput,password:e.target.value})} className="auth-input"/>
          <button className="auth-btn" onClick={handleAuth}>{authMode==='login'?'Sign In':'Sign Up'}</button>
          <p style={{color:'#666', marginTop:'15px', cursor:'pointer'}} onClick={()=>setAuthMode(authMode==='login'?'signup':'login')}>
            {authMode==='login'?'Create Account':'Have Account?'}
          </p>
        </div>
      </div>
    );
  }

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
            <div className="avatar">{user.username[0].toUpperCase()}</div>
            <span style={{fontSize:'0.9rem', color:'#aaa', marginLeft:'10px'}}>Logout</span>
          </div>
        </div>

        <div className="scroll-area">
          {loading && <div style={{textAlign:'center', padding:'20px', color:'#555'}}>Loading...</div>}

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
                        <div className={`card-heart ${isLiked(item.id)?'liked':''}`} onClick={(e)=>{e.stopPropagation(); toggleLike(item)}}>♥</div>
                      </div>
                    ))}
                </div>
                {searchResults.length === 0 && !loading && <p style={{color:'#666'}}>No results found.</p>}
             </>
          )}

          {/* HOMEPAGE (JioSaavn Style) */}
          {tab === 'home' && (
            <>
              {/* Section 1: Trending */}
              <div className="section">
                <div className="section-header">
                    <div className="section-title">Trending Now</div>
                    <div className="section-subtitle">Top hits of the week</div>
                </div>
                <div className="horizontal-scroll">
                    {trendingSongs.length > 0 ? trendingSongs.map((item) => (
                      <div key={item.id} className="card" onClick={()=>handleCardClick(item, 'song')}>
                        <img src={getImg(item.image)} alt=""/>
                        <h3>{item.name || item.title}</h3>
                        <p>{item.primaryArtists}</p>
                        <div className={`card-heart ${isLiked(item.id)?'liked':''}`} onClick={(e)=>{e.stopPropagation(); toggleLike(item)}}>♥</div>
                      </div>
                    )) : <p style={{color:'#666', padding:'10px'}}>Loading...</p>}
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
                        <p>{item.language}</p>
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
              {user.likedSongs.length === 0 ? <p style={{color:'#666'}}>No songs liked yet.</p> : (
                 <div className="grid">
                    {user.likedSongs.map((item, idx) => (
                      <div key={item.id} className="card" onClick={()=>playSong(user.likedSongs, idx)}>
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
