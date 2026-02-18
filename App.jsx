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
  doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove 
} from 'firebase/firestore';

const API_BASE = "https://saavn.sumit.co/api";

function App() {
  // UI State
  const [view, setView] = useState('auth'); 
  const [tab, setTab] = useState('home');   
  const [loading, setLoading] = useState(false);

  // User State
  const [user, setUser] = useState(null);
  const [likedSongs, setLikedSongs] = useState([]);
  const [authMode, setAuthMode] = useState('login');
  const [authInput, setAuthInput] = useState({ email: '', password: '' });

  // Data
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
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
  // 1. FIREBASE AUTH LISTENER
  // ==============================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setView('app');
        
        // Load Data from Firestore
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setLikedSongs(docSnap.data().likedSongs || []);
          } else {
            // First login? Create doc
            await setDoc(docRef, { email: currentUser.email, likedSongs: [] });
          }
        } catch (err) {
          console.error("Error loading profile:", err);
        }
      } else {
        setUser(null);
        setLikedSongs([]);
        setView('auth');
        setSearchResults([]);
        setSearchQuery('');
      }
    });
    return () => unsubscribe();
  }, []);

  // ==============================
  // 2. AUTH ACTIONS
  // ==============================
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
  // 3. LOGIC (Data & Player)
  // ==============================
  const toggleLike = async (song) => {
    if (!user) return;
    
    // Optimistic Update
    const isLiked = likedSongs.some(s => s.id === song.id);
    const newLikes = isLiked ? likedSongs.filter(s => s.id !== song.id) : [...likedSongs, song];
    setLikedSongs(newLikes);

    // Cloud Update
    const ref = doc(db, "users", user.uid);
    try {
      if (isLiked) await updateDoc(ref, { likedSongs: arrayRemove(song) });
      else await updateDoc(ref, { likedSongs: arrayUnion(song) });
    } catch (e) { console.error("Sync error", e); }
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

  const playSong = (list, idx) => {
    if (idx < 0 || idx >= list.length) return;
    if (list !== queue) setQueue(list);
    setQIndex(idx);
    const song = list[idx];
    setCurrentSong(song);
    
    // Select URL based on quality
    let match = song.downloadUrl.find(u => u.quality === quality);
    let url = match ? match.url : song.downloadUrl[song.downloadUrl.length - 1].url;
    
    if (audioRef.current.src !== url) {
      audioRef.current.src = url;
      audioRef.current.volume = volume;
      audioRef.current.play().then(()=>setIsPlaying(true));
    } else {
      audioRef.current.play(); setIsPlaying(true);
    }
  };

  const handleQualityChange = (newQ) => {
    setQuality(newQ);
    if (currentSong) {
      const t = audioRef.current.currentTime;
      const p = !audioRef.current.paused;
      let match = currentSong.downloadUrl.find(u => u.quality === newQ);
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
  const isLiked = (id) => user && likedSongs.some(s => s.id === id);

  // ==============================
  // 4. RENDER VIEW
  // ==============================
  if (view === 'auth') {
    return (
      <div className="auth-container">
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
            <div className="avatar">{user.email ? user.email[0].toUpperCase() : 'U'}</div>
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
                 {/* Volume & Quality */}
                 <span style={{fontSize:'0.8rem', color:'#aaa'}}>🔊</span>
                 <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={volume} onChange={handleVolumeChange}
                    className="volume-slider"
                 />
                 <select className="quality-select" value={quality} onChange={(e)=>handleQualityChange(e.target.value)}>
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
