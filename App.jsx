import React, { useState, useRef, useEffect } from 'react';
import './App.css';
// Import Firebase functions
import { auth, db } from './firebase'; 
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';

const API_BASE = "https://saavn.sumit.co/api";

function App() {
  // --- Global UI State ---
  const [view, setView] = useState('auth'); 
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('queue');
  
  // --- Auth & User Data State ---
  const [user, setUser] = useState(null); // Firebase User Object
  const [likedSongs, setLikedSongs] = useState([]); // Array from Firestore
  const [authMode, setAuthMode] = useState('login');
  const [authInput, setAuthInput] = useState({ email: '', password: '' }); // Changed username to email

  // --- Data State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // --- Audio State ---
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [currentQueue, setCurrentQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [quality, setQuality] = useState('320kbps');
  const [lyrics, setLyrics] = useState(null);

  // ==============================
  // 1. FIREBASE AUTHENTICATION
  // ==============================

  // Listen for Auth Changes (Login/Logout/Refresh)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setView('home');
        // Fetch User Data (Liked Songs) from Firestore
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setLikedSongs(docSnap.data().likedSongs || []);
        } else {
          // Create doc if it doesn't exist (first time)
          await setDoc(doc(db, "users", currentUser.uid), { likedSongs: [] });
        }
      } else {
        setUser(null);
        setLikedSongs([]);
        setView('auth');
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Trending when logged in
  useEffect(() => {
    if (user && view === 'home' && searchResults.length === 0) {
      fetchTrending();
    }
  }, [user, view]);

  const handleAuth = async () => {
    if (!authInput.email || !authInput.password) return alert("Please fill all fields");
    setLoading(true);

    try {
      if (authMode === 'signup') {
        // Create User in Auth
        const cred = await createUserWithEmailAndPassword(auth, authInput.email, authInput.password);
        // Create User Document in Firestore
        await setDoc(doc(db, "users", cred.user.uid), {
          email: authInput.email,
          likedSongs: []
        });
      } else {
        // Login
        await signInWithEmailAndPassword(auth, authInput.email, authInput.password);
      }
      setAuthInput({ email: '', password: '' });
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentSong(null);
    setIsPlaying(false);
    audioRef.current.pause();
    setSearchResults([]);
  };

  // ==============================
  // 2. FIRESTORE DATA LOGIC
  // ==============================

  const toggleLike = async (song) => {
    if (!user) return;
    
    // Optimistic UI Update (Update local state immediately for speed)
    const isAlreadyLiked = likedSongs.some(s => s.id === song.id);
    let newLikes = [];
    
    if (isAlreadyLiked) {
      newLikes = likedSongs.filter(s => s.id !== song.id);
    } else {
      newLikes = [...likedSongs, song];
    }
    setLikedSongs(newLikes);

    // Update Firestore in background
    const userRef = doc(db, "users", user.uid);
    try {
      if (isAlreadyLiked) {
        await updateDoc(userRef, {
          likedSongs: arrayRemove(song)
        });
      } else {
        await updateDoc(userRef, {
          likedSongs: arrayUnion(song)
        });
      }
    } catch (error) {
      console.error("Error updating likes:", error);
      // Revert if failed (optional, but good practice)
    }
  };

  const isLiked = (id) => likedSongs.some(s => s.id === id);

  // ==============================
  // 3. API & PLAYBACK LOGIC (Same as before)
  // ==============================

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=Trending&limit=20`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data.results);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const fetchLyrics = async (song) => {
    setLyrics("Loading lyrics...");
    if (song.hasLyrics === "false" || song.hasLyrics === false) {
       setLyrics("Lyrics not available."); return;
    }
    try {
      const res = await fetch(`${API_BASE}/lyrics?id=${song.id}`);
      const data = await res.json();
      if (data.success && data.data?.lyrics) {
        setLyrics(data.data.lyrics.replace(/<br>/g, '\n'));
      } else { setLyrics("Lyrics not available."); }
    } catch (e) { setLyrics("Failed to load lyrics."); }
  };

  const playQueue = (queue, index) => {
    if (index < 0 || index >= queue.length) return;
    if (queue !== currentQueue) setCurrentQueue(queue);
    
    setCurrentIndex(index);
    const song = queue[index];
    setCurrentSong(song);
    fetchLyrics(song);

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

  const handleSearch = async () => {
    if (!searchQuery) { fetchTrending(); return; }
    setLoading(true); setView('home');
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data.results);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

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
            type="email" placeholder="Email" // Changed to Email type
            value={authInput.email} 
            onChange={e => setAuthInput({...authInput, email: e.target.value})} 
          />
          <input 
            type="password" placeholder="Password" 
            value={authInput.password} 
            onChange={e => setAuthInput({...authInput, password: e.target.value})} 
          />
          {loading ? <div className="loader" style={{margin:'10px auto'}}></div> : (
            <button className="auth-btn" onClick={handleAuth}>
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
          )}
          <p className="auth-link" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
            {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* HEADER */}
      <header>
        <div className="logo" onClick={() => { setView('home'); setSearchQuery(''); fetchTrending(); }}>JioSaavn</div>
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
           <button className="user-btn" onClick={handleLogout} style={{marginLeft:'10px', background:'#333'}}>Logout</button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main>
        {loading && <div className="loader"></div>}

        {/* Home View */}
        {view === 'home' && (
          <>
            <h2>{searchQuery ? `Results for "${searchQuery}"` : "Trending Now"}</h2>
            <div className="grid">
              {searchResults.map((item) => (
                <div key={item.id} className="card">
                  <div onClick={() => playQueue([item], 0)}>
                    <img src={getImg(item.image)} alt="" />
                    <h3>{item.name}</h3>
                    <p>{item.primaryArtists}</p>
                  </div>
                  <button className={`btn-heart ${isLiked(item.id) ? 'liked' : ''}`} onClick={(e) => { e.stopPropagation(); toggleLike(item); }}>&#10084;</button>
                </div>
              ))}
              {!loading && searchResults.length === 0 && <p className="empty-state">No songs found.</p>}
            </div>
          </>
        )}

        {/* Library View */}
        {view === 'library' && (
          <div className="detail-view">
            <h2>My Liked Songs</h2>
            {likedSongs.length === 0 ? <p className="empty-state">No liked songs yet.</p> : (
              <div className="track-list">
                {likedSongs.map((song, idx) => (
                  <div key={song.id} className={`track ${currentSong?.id === song.id ? 'active' : ''}`}>
                     <div style={{flex:1, display:'flex', alignItems:'center'}} onClick={() => playQueue(likedSongs, idx)}>
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

      {/* SIDEBAR */}
      <div className={`sidebar ${showSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
            <div className={`sidebar-tab ${sidebarTab === 'queue' ? 'active' : ''}`} onClick={() => setSidebarTab('queue')}>Up Next</div>
            <div className={`sidebar-tab ${sidebarTab === 'lyrics' ? 'active' : ''}`} onClick={() => setSidebarTab('lyrics')}>Lyrics</div>
        </div>
        <div className="sidebar-content">
            {sidebarTab === 'queue' ? (
                currentQueue.length > 0 ? (
                    currentQueue.map((song, idx) => (
                        <div key={`${song.id}-${idx}`} className={`queue-item ${currentIndex === idx ? 'active' : ''}`} onClick={() => playQueue(currentQueue, idx)}>
                            <img src={getImg(song.image)} alt="" />
                            <div className="queue-info">
                                <h4>{song.name}</h4>
                                <p>{song.primaryArtists}</p>
                            </div>
                            {currentIndex === idx && <span style={{marginLeft:'auto', fontSize:'0.8rem', color:'var(--primary)'}}>&#9835;</span>}
                        </div>
                    ))
                ) : <div className="lyrics-placeholder">Queue is empty</div>
            ) : (
                <div className="lyrics-container">
                    {currentSong ? (lyrics || "Loading...") : <div className="lyrics-placeholder">Play a song to see lyrics</div>}
                </div>
            )}
        </div>
      </div>

      {/* PLAYER BAR */}
      <div className="player">
        <div className="player-info">
          <img src={currentSong ? getImg(currentSong.image) : "https://via.placeholder.com/50"} alt="" />
          <div className="player-text">
            <h4>{currentSong ? currentSong.name : "Not Playing"}</h4>
            <p style={{fontSize:'0.8rem', color:'#b3b3b3'}}>{currentSong?.primaryArtists || ""}</p>
          </div>
          {currentSong && <button className={`btn-heart ${isLiked(currentSong.id) ? 'liked' : ''}`} onClick={() => toggleLike(currentSong)} style={{marginLeft:'10px'}}>&#10084;</button>}
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
           <button className={`btn-icon ${showSidebar ? 'active' : ''}`} onClick={() => setShowSidebar(!showSidebar)}>
             &#9776;
           </button>
        </div>
      </div>
    </div>
  );
}

export default App;
