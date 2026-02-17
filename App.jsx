import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const API_BASE = "https://saavn.sumit.co/api";

function App() {
  // --- Global State ---
  const [view, setView] = useState('auth'); // 'auth' | 'home' | 'detail' | 'library'
  const [loading, setLoading] = useState(false);
  
  // --- Auth State ---
  const [user, setUser] = useState(null); // { username, likedSongs: [] }
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authInput, setAuthInput] = useState({ username: '', password: '' });

  // --- Data State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [detailData, setDetailData] = useState(null);

  // --- Audio State ---
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [currentQueue, setCurrentQueue] = useState([]); // List of songs playing
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [quality, setQuality] = useState('320kbps');

  // ==============================
  // 1. AUTHENTICATION LOGIC
  // ==============================

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('jioSaavn_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setView('home');
    }
  }, []);

  const handleAuth = () => {
    if (!authInput.username || !authInput.password) return alert("Please fill all fields");

    const users = JSON.parse(localStorage.getItem('jioSaavn_users') || "[]");

    if (authMode === 'signup') {
      if (users.find(u => u.username === authInput.username)) {
        return alert("User already exists!");
      }
      const newUser = { ...authInput, likedSongs: [] };
      users.push(newUser);
      localStorage.setItem('jioSaavn_users', JSON.stringify(users));
      loginUser(newUser);
    } else {
      const foundUser = users.find(u => u.username === authInput.username && u.password === authInput.password);
      if (foundUser) loginUser(foundUser);
      else alert("Invalid credentials");
    }
  };

  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem('jioSaavn_user', JSON.stringify(userData));
    setView('home');
    setAuthInput({ username: '', password: '' });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('jioSaavn_user');
    setView('auth');
    setCurrentSong(null);
    setIsPlaying(false);
    audioRef.current.pause();
  };

  // ==============================
  // 2. LIKED SONGS LOGIC
  // ==============================

  const toggleLike = (song) => {
    if (!user) return;
    
    let updatedLikes;
    const isLiked = user.likedSongs.some(s => s.id === song.id);

    if (isLiked) {
      updatedLikes = user.likedSongs.filter(s => s.id !== song.id);
    } else {
      updatedLikes = [...user.likedSongs, song];
    }

    const updatedUser = { ...user, likedSongs: updatedLikes };
    setUser(updatedUser);
    localStorage.setItem('jioSaavn_user', JSON.stringify(updatedUser));

    // Update main database
    const allUsers = JSON.parse(localStorage.getItem('jioSaavn_users') || "[]");
    const userIndex = allUsers.findIndex(u => u.username === user.username);
    if (userIndex !== -1) {
      allUsers[userIndex] = updatedUser;
      localStorage.setItem('jioSaavn_users', JSON.stringify(allUsers));
    }
  };

  const isLiked = (id) => user?.likedSongs.some(s => s.id === id);

  // ==============================
  // 3. API & PLAYER LOGIC (Existing)
  // ==============================

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setView('home');
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data.results);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const fetchDetails = async (id, type) => {
    setLoading(true);
    try {
      let endpoint = type === 'albums' ? `${API_BASE}/albums?id=${id}` : `${API_BASE}/playlists?id=${id}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) { setDetailData(data.data); setView('detail'); }
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const playQueue = (queue, index) => {
    if (index < 0 || index >= queue.length) return;
    if (queue !== currentQueue) setCurrentQueue(queue);
    
    setCurrentIndex(index);
    const song = queue[index];
    setCurrentSong(song);

    let match = song.downloadUrl.find(u => u.quality === quality);
    let url = match ? match.url : song.downloadUrl[song.downloadUrl.length - 1].url;

    if (audioRef.current.src !== url) {
      audioRef.current.src = url;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error(e));
    }
  };

  const togglePlay = () => {
    if (audioRef.current.paused) { audioRef.current.play(); setIsPlaying(true); }
    else { audioRef.current.pause(); setIsPlaying(false); }
  };

  useEffect(() => {
    const audio = audioRef.current;
    const updateTime = () => { setCurrentTime(audio.currentTime); setDuration(audio.duration || 0); };
    const handleEnded = () => playQueue(currentQueue, currentIndex + 1);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);
    return () => { audio.removeEventListener('timeupdate', updateTime); audio.removeEventListener('ended', handleEnded); };
  }, [currentIndex, currentQueue]);

  // Helpers
  const getImg = (img) => Array.isArray(img) ? img[img.length - 1].url : img;
  const fmtTime = (s) => { const m = Math.floor(s/60); const sec = Math.floor(s%60); return `${m}:${sec<10?'0'+sec:sec}`; };

  // ==============================
  // 4. RENDER
  // ==============================

  if (view === 'auth') {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h2>JioSaavn Clone</h2>
          <h3>{authMode === 'login' ? 'Login' : 'Sign Up'}</h3>
          <input 
            type="text" placeholder="Username" 
            value={authInput.username} 
            onChange={e => setAuthInput({...authInput, username: e.target.value})} 
          />
          <input 
            type="password" placeholder="Password" 
            value={authInput.password} 
            onChange={e => setAuthInput({...authInput, password: e.target.value})} 
          />
          <button className="auth-btn" onClick={handleAuth}>
            {authMode === 'login' ? 'Login' : 'Create Account'}
          </button>
          <p className="auth-link" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
            {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <div className="logo" onClick={() => setView('home')}>JioSaavn</div>
        <div className="search-container">
          <input 
            type="text" placeholder="Search songs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div className="user-menu">
           <button className="user-btn" onClick={() => setView('library')}>❤️ My Library</button>
           <button className="user-btn" onClick={logout} style={{marginLeft:'10px', background:'#333'}}>Logout ({user?.username})</button>
        </div>
      </header>

      <main>
        {loading && <div className="loader"></div>}

        {/* HOME VIEW */}
        {view === 'home' && (
          <>
            <h2>{searchResults.length > 0 ? "Search Results" : "Trending Now"}</h2>
            <div className="grid">
              {searchResults.map((item) => (
                <div key={item.id} className="card">
                  <div onClick={() => playQueue([item], 0)}>
                    <img src={getImg(item.image)} alt="" />
                    <h3>{item.name}</h3>
                    <p>{item.primaryArtists}</p>
                  </div>
                  {/* Heart Button on Card */}
                  <button 
                    className={`btn-heart ${isLiked(item.id) ? 'liked' : ''}`} 
                    onClick={(e) => { e.stopPropagation(); toggleLike(item); }}
                    style={{marginTop:'5px'}}
                  >
                    &#10084;
                  </button>
                </div>
              ))}
              {searchResults.length === 0 && <p className="empty-state">Search for a song to start listening!</p>}
            </div>
          </>
        )}

        {/* LIBRARY VIEW */}
        {view === 'library' && (
          <div className="detail-view">
            <h2>My Liked Songs</h2>
            {user.likedSongs.length === 0 ? (
              <p className="empty-state">You haven't liked any songs yet.</p>
            ) : (
              <div className="track-list">
                {user.likedSongs.map((song, idx) => (
                  <div key={song.id} className={`track ${currentSong?.id === song.id ? 'active' : ''}`}>
                     <div style={{display:'flex', alignItems:'center', flex:1}} onClick={() => playQueue(user.likedSongs, idx)}>
                        <img src={getImg(song.image)} alt="" />
                        <div className="track-info">
                          <span className="track-title">{song.name}</span>
                          <span style={{fontSize:'0.8rem', opacity:0.7}}>{song.primaryArtists}</span>
                        </div>
                     </div>
                     <button className="btn-heart liked" onClick={() => toggleLike(song)}>&#10084;</button>
                     <span style={{marginLeft:'15px'}}>{fmtTime(song.duration)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* PLAYER BAR */}
      <div className="player">
        <div className="player-info">
          <img src={currentSong ? getImg(currentSong.image) : "https://via.placeholder.com/50"} alt="" />
          <div className="player-text">
            <h4>{currentSong ? currentSong.name : "Not Playing"}</h4>
            <p style={{fontSize:'0.8rem', color:'#b3b3b3'}}>{currentSong?.primaryArtists || ""}</p>
          </div>
          {currentSong && (
             <button 
                className={`btn-heart ${isLiked(currentSong.id) ? 'liked' : ''}`} 
                onClick={() => toggleLike(currentSong)}
                style={{marginLeft:'15px'}}
             >
               &#10084;
             </button>
          )}
        </div>

        <div className="player-controls">
          <div className="buttons">
            <button className="btn-reset btn-control" onClick={() => playQueue(currentQueue, currentIndex - 1)}>&#9664;&#9664;</button>
            <button className="btn-reset btn-play" onClick={togglePlay}>
              {isPlaying ? <span>&#10074;&#10074;</span> : <span>&#9658;</span>}
            </button>
            <button className="btn-reset btn-control" onClick={() => playQueue(currentQueue, currentIndex + 1)}>&#9654;&#9654;</button>
          </div>
          <div className="progress-container">
            <span>{fmtTime(currentTime)}</span>
            <div className="progress-bar" onClick={(e) => {
               const width = e.currentTarget.clientWidth;
               const clickX = e.nativeEvent.offsetX;
               audioRef.current.currentTime = (clickX / width) * duration;
            }}>
              <div className="progress-fill" style={{width: `${(currentTime / duration) * 100}%`}}></div>
            </div>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>
        
        <div className="volume-controls">
           <select className="quality-select" value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="320kbps">320k</option>
              <option value="160kbps">160k</option>
           </select>
        </div>
      </div>
    </div>
  );
}

export default App;
