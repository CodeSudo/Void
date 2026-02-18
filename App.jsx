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

  // --- Music Data ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // --- Player State ---
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [qIndex, setQIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [quality, setQuality] = useState('320kbps');
  const [volume, setVolume] = useState(1); // Volume 0-1

  // ==============================
  // 1. AUTH (Local Storage)
  // ==============================
  useEffect(() => {
    const stored = localStorage.getItem('musiq_user');
    if (stored) {
      setUser(JSON.parse(stored));
      setView('app');
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
    setAuthInput({ username: '', password: '' });
  };

  const logout = () => {
    setUser(null); localStorage.removeItem('musiq_user');
    setView('auth'); setCurrentSong(null); setIsPlaying(false);
    audioRef.current.pause();
    setSearchResults([]);
  };

  // ==============================
  // 2. LOGIC
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
    if (!searchQuery) return;
    setLoading(true); setTab('home');
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data.results);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // ==============================
  // 3. PLAYER
  // ==============================
  const playSong = (list, idx) => {
    if (idx < 0 || idx >= list.length) return;
    if (list !== queue) setQueue(list);
    setQIndex(idx);
    const song = list[idx];
    setCurrentSong(song);
    
    // Quality Check
    let match = song.downloadUrl.find(u => u.quality === quality);
    let url = match ? match.url : song.downloadUrl[song.downloadUrl.length - 1].url;
    
    if (audioRef.current.src !== url) {
      audioRef.current.src = url;
      audioRef.current.volume = volume; // Set Volume
      audioRef.current.play().then(()=>setIsPlaying(true));
    } else {
      audioRef.current.play(); setIsPlaying(true);
    }
  };

  const handleQualityChange = (newQuality) => {
    setQuality(newQuality);
    if (currentSong) {
        const t = audioRef.current.currentTime;
        const p = !audioRef.current.paused;
        let match = currentSong.downloadUrl.find(u => u.quality === newQuality);
        let url = match ? match.url : currentSong.downloadUrl[currentSong.downloadUrl.length - 1].url;
        if (audioRef.current.src !== url) {
            audioRef.current.src = url;
            audioRef.current.currentTime = t;
            if (p) audioRef.current.play();
        }
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    audioRef.current.volume = vol;
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
  // 4. VIEW
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
      {/* 1. Sidebar */}
      <div className="sidebar">
        <div className="logo">Musiq.</div>
        <div className={`nav-item ${tab==='home'?'active':''}`} onClick={()=>setTab('home')}>
          <span>🏠</span> Home
        </div>
        <div className={`nav-item ${tab==='library'?'active':''}`} onClick={()=>setTab('library')}>
          <span>❤️</span> Liked Songs
        </div>
      </div>

      {/* 2. Main Content */}
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
          {tab === 'home' && (
            <>
              {!loading && searchResults.length === 0 ? (
                <div style={{textAlign:'center', marginTop:'10vh', color:'#555'}}>
                  <h1 style={{fontSize:'3rem', marginBottom:'10px'}}>Welcome Back</h1>
                  <p>Start searching to play music.</p>
                </div>
              ) : (
                <>
                  <h2>Results</h2>
                  <div className="grid">
                    {searchResults.map((item) => (
                      <div key={item.id} className="card" onClick={()=>playSong([item], 0)}>
                        <img src={getImg(item.image)} alt=""/>
                        <h3>{item.name}</h3>
                        <p>{item.primaryArtists}</p>
                        <div className={`card-heart ${isLiked(item.id)?'liked':''}`} onClick={(e)=>{e.stopPropagation(); toggleLike(item)}}>♥</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

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

        {/* 3. Player Bar */}
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
                 {/* Volume Slider */}
                 <span style={{fontSize:'0.8rem', color:'#aaa'}}>🔊</span>
                 <input 
                    type="range" 
                    min="0" max="1" step="0.05" 
                    value={volume} 
                    onChange={handleVolumeChange}
                    className="volume-slider"
                 />
                 
                 <select className="quality-select" value={quality} onChange={(e) => handleQualityChange(e.target.value)}>
                    <option value="320kbps">320kbps</option>
                    <option value="160kbps">160kbps</option>
                 </select>
                 <span className="time-text">
                    {Math.floor(progress/60)}:{Math.floor(progress%60).toString().padStart(2,'0')}
                 </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
