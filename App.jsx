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
  // UI State
  const [view, setView] = useState('auth'); 
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('queue');
  
  // Data State
  const [user, setUser] = useState(null);
  const [likedSongs, setLikedSongs] = useState([]);
  const [authMode, setAuthMode] = useState('login');
  const [authInput, setAuthInput] = useState({ email: '', password: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Audio State
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null); // Controls player visibility
  const [currentQueue, setCurrentQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [quality, setQuality] = useState('320kbps');
  const [lyrics, setLyrics] = useState(null);

  // --- Auth & Init ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setView('home');
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setLikedSongs(docSnap.data().likedSongs || []);
        else await setDoc(doc(db, "users", currentUser.uid), { likedSongs: [] });
      } else {
        setUser(null); setLikedSongs([]); setView('auth');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && view === 'home' && searchResults.length === 0) fetchTrending();
  }, [user, view]);

  const handleAuth = async () => {
    if (!authInput.email || !authInput.password) return alert("Please fill all fields");
    setLoading(true);
    try {
      if (authMode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, authInput.email, authInput.password);
        await setDoc(doc(db, "users", cred.user.uid), { email: authInput.email, likedSongs: [] });
      } else {
        await signInWithEmailAndPassword(auth, authInput.email, authInput.password);
      }
      setAuthInput({ email: '', password: '' });
    } catch (error) { alert(error.message); } 
    finally { setLoading(false); }
  };

  const toggleLike = async (song) => {
    if (!user) return;
    const isAlreadyLiked = likedSongs.some(s => s.id === song.id);
    const newLikes = isAlreadyLiked ? likedSongs.filter(s => s.id !== song.id) : [...likedSongs, song];
    setLikedSongs(newLikes);

    const userRef = doc(db, "users", user.uid);
    try {
      await updateDoc(userRef, { likedSongs: isAlreadyLiked ? arrayRemove(song) : arrayUnion(song) });
    } catch (e) { console.error("Like failed", e); }
  };

  const isLiked = (id) => likedSongs.some(s => s.id === id);

  // --- API ---
  const fetchTrending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=Trending&limit=20`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data.results);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSearch = async () => {
    if (!searchQuery) { fetchTrending(); return; }
    setLoading(true); setView('home');
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data.results);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchLyrics = async (song) => {
    setLyrics("Loading lyrics...");
    if (!song.hasLyrics || song.hasLyrics === "false") { setLyrics("No lyrics available."); return; }
    try {
      const res = await fetch(`${API_BASE}/lyrics?id=${song.id}`);
      const data = await res.json();
      if (data.success && data.data?.lyrics) setLyrics(data.data.lyrics.replace(/<br>/g, '\n'));
      else setLyrics("No lyrics available.");
    } catch { setLyrics("Failed to load lyrics."); }
  };

  // --- Player Logic ---
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

  const getImg = (img) => Array.isArray(img) ? img[img.length - 1].url : img;
  const fmtTime = (s) => { const m = Math.floor(s/60); const sec = Math.floor(s%60); return `${m}:${sec<10?'0'+sec:sec}`; };

  // --- RENDER ---
  if (view === 'auth') {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h2>Musiq.</h2>
          <h3>{authMode === 'login' ? 'Welcome Back' : 'Join the Vibe'}</h3>
          <input className="auth-input" type="email" placeholder="Email" value={authInput.email} onChange={e => setAuthInput({...authInput, email: e.target.value})} />
          <input className="auth-input" type="password" placeholder="Password" value={authInput.password} onChange={e => setAuthInput({...authInput, password: e.target.value})} />
          {loading ? <div className="loader" style={{margin:'20px auto'}}></div> : (
            <button className="auth-submit" onClick={handleAuth}>{authMode === 'login' ? 'Log In' : 'Sign Up'}</button>
          )}
          <p className="auth-link" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
            {authMode === 'login' ? "New here? Create account" : "Have an account? Log In"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <div className="logo" onClick={() => { setView('home'); setSearchQuery(''); fetchTrending(); }}>Musiq.</div>
        <div className="search-container">
          <input 
            type="text" placeholder="Search artists, songs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div className="user-menu">
           <button className="btn-pill btn-primary" onClick={() => setView('library')}>My Library</button>
           <button className="btn-pill btn-sec" onClick={async () => { await signOut(auth); setUser(null); }}>Logout</button>
        </div>
      </header>

      <main>
        {loading && <div className="loader"></div>}

        {view === 'home' && (
          <>
            <h2>{searchQuery ? `Results for "${searchQuery}"` : "Trending Now"}</h2>
            <div className="grid">
              {searchResults.map((item) => (
                <div key={item.id} className="card" onClick={() => playQueue([item], 0)}>
                  <img src={getImg(item.image)} alt="" />
                  <h3>{item.name}</h3>
                  <p>{item.primaryArtists}</p>
                  <button 
                    className={`btn-heart ${isLiked(item.id) ? 'liked' : ''}`} 
                    onClick={(e) => { e.stopPropagation(); toggleLike(item); }}
                  >&#10084;</button>
                </div>
              ))}
              {!loading && searchResults.length === 0 && <p className="empty-state">No vibes found.</p>}
            </div>
          </>
        )}

        {view === 'library' && (
          <div className="detail-view">
            <h2>My Collection</h2>
            {likedSongs.length === 0 ? <p className="empty-state">Your library is empty. Go add some bangers.</p> : (
              <div className="track-list">
                {likedSongs.map((song, idx) => (
                  <div key={song.id} className={`track ${currentSong?.id === song.id ? 'active' : ''}`}>
                     <div style={{flex:1, display:'flex', alignItems:'center'}} onClick={() => playQueue(likedSongs, idx)}>
                        <img src={getImg(song.image)} alt="" />
                        <div className="track-info">
                          <span style={{color: 'white', fontWeight:'500'}}>{song.name}</span>
                          <span style={{fontSize:'0.8rem', opacity:0.7, display:'block'}}>{song.primaryArtists}</span>
                        </div>
                     </div>
                     <button className="btn-pill btn-sec" style={{padding:'5px 10px', fontSize:'0.8rem'}} onClick={() => toggleLike(song)}>Remove</button>
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
            <div className="sidebar-tab" onClick={() => setShowSidebar(false)} style={{flex:0, padding:'20px'}}>✕</div>
        </div>
        <div className="sidebar-content">
            {sidebarTab === 'queue' ? (
                currentQueue.length > 0 ? (
                    currentQueue.map((song, idx) => (
                        <div key={`${song.id}-${idx}`} className={`track ${currentIndex === idx ? 'active' : ''}`} onClick={() => playQueue(currentQueue, idx)}>
                            <img src={getImg(song.image)} alt="" style={{width:'35px', height:'35px'}} />
                            <div style={{overflow:'hidden'}}>
                                <h4 style={{fontSize:'0.85rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{song.name}</h4>
                                <p style={{fontSize:'0.75rem', color:'#888'}}>{song.primaryArtists}</p>
                            </div>
                        </div>
                    ))
                ) : <div className="empty-state" style={{fontSize:'0.9rem', marginTop:'20px'}}>Queue is empty</div>
            ) : (
                <div style={{padding:'10px', whiteSpace:'pre-wrap', lineHeight:'1.6', color:'#ddd', fontSize:'0.9rem', textAlign:'center'}}>
                    {currentSong ? (lyrics || "Loading...") : "Play a song to see lyrics"}
                </div>
            )}
        </div>
      </div>

      {/* PLAYER BAR - Only visible if currentSong exists */}
      <div className={currentSong ? "player visible" : "player"}>
        {currentSong && (
          <>
            <div className="player-info">
              <img src={getImg(currentSong.image)} alt="" />
              <div className="player-text">
                <h4>{currentSong.name}</h4>
                <p>{currentSong.primaryArtists}</p>
              </div>
              <button className={`btn-heart ${isLiked(currentSong.id) ? 'liked' : ''}`} style={{position:'static', opacity:1, transform:'scale(1)', background:'transparent'}} onClick={() => toggleLike(currentSong)}>&#10084;</button>
            </div>

            <div className="player-controls">
              <div className="buttons">
                <button className="btn-control" onClick={() => playQueue(currentQueue, currentIndex - 1)}>&#9664;</button>
                <button className="btn-play" onClick={togglePlay}>
                  {isPlaying ? <span>&#10074;&#10074;</span> : <span style={{marginLeft:'3px'}}>&#9658;</span>}
                </button>
                <button className="btn-control" onClick={() => playQueue(currentQueue, currentIndex + 1)}>&#9654;</button>
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
            
            <div style={{display:'flex', gap:'10px', alignItems:'center', width:'30%', justifyContent:'flex-end'}}>
               <select style={{background:'#222', color:'white', border:'none', borderRadius:'5px', padding:'5px', fontSize:'0.7rem'}} value={quality} onChange={(e) => setQuality(e.target.value)}>
                  <option value="320kbps">HQ</option>
                  <option value="160kbps">SQ</option>
               </select>
               <button className="btn-control" onClick={() => setShowSidebar(!showSidebar)}>&#9776;</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
