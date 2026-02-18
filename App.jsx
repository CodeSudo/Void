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
  // Navigation
  const [view, setView] = useState('loading'); // Start in loading state
  const [tab, setTab] = useState('home');   
  const [loading, setLoading] = useState(false);

  // User
  const [user, setUser] = useState(null);
  const [likedSongs, setLikedSongs] = useState([]);
  const [authMode, setAuthMode] = useState('login');
  const [authInput, setAuthInput] = useState({ email: '', password: '' });

  // Data
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [newAlbums, setNewAlbums] = useState([]);
  const [topPlaylists, setTopPlaylists] = useState([]);

  // Details Page
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailsSongs, setDetailsSongs] = useState([]);

  // Player
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
  // 1. SAFE HELPERS (Prevents Crashes)
  // ==============================
  const getImg = (img) => {
    if (!img) return "https://via.placeholder.com/150"; // Fallback image
    if (Array.isArray(img) && img.length > 0) {
      // Get highest quality or first available
      return img[img.length - 1]?.url || img[0]?.url;
    }
    return img; // If it's already a string
  };

  const getName = (item) => item.name || item.title || "Unknown Title";
  const getDesc = (item) => item.primaryArtists || item.description || item.year || "";

  // ==============================
  // 2. DATA FETCHING
  // ==============================
  const fetchHomepageData = async () => {
    setLoading(true);
    try {
      const [songs, albums, playlists] = await Promise.all([
        fetch(`${API_BASE}/search/songs?query=Top 50&limit=15`).then(r => r.json()).catch(()=>({success:false})),
        fetch(`${API_BASE}/search/albums?query=New&limit=15`).then(r => r.json()).catch(()=>({success:false})),
        fetch(`${API_BASE}/search/playlists?query=Hits&limit=15`).then(r => r.json()).catch(()=>({success:false}))
      ]);

      if(songs?.success && songs?.data?.results) setTrendingSongs(songs.data.results);
      if(albums?.success && albums?.data?.results) setNewAlbums(albums.data.results);
      if(playlists?.success && playlists?.data?.results) setTopPlaylists(playlists.data.results);

    } catch (e) { 
      console.error("Home data error", e); 
    } finally { 
      setLoading(false); 
    }
  };

  // ==============================
  // 3. AUTHENTICATION
  // ==============================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setView('app');
        fetchHomepageData();
        
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setLikedSongs(docSnap.data().likedSongs || []);
          else await setDoc(docRef, { email: currentUser.email, likedSongs: [] });
        } catch (err) { console.error(err); }

      } else {
        setUser(null); setLikedSongs([]); setView('auth');
      }
    });
    return () => unsubscribe();
  }, []);

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
  // 4. LOGIC
  // ==============================
  
  const handleCardClick = async (item, type) => {
    if (type === 'song') {
      playSong([item], 0);
    } else {
      // Album/Playlist logic
      setSelectedItem(item);
      setTab('details');
      setLoading(true);
      setDetailsSongs([]); 

      try {
        let endpoint = type === 'album' 
          ? `${API_BASE}/albums?id=${item.id}` 
          : `${API_BASE}/playlists?id=${item.id}`;
        
        const res = await fetch(endpoint);
        const data = await res.json();
        
        if (data.success && data.data.songs) {
          setDetailsSongs(data.data.songs);
        } else {
          // Fallback if no songs found immediately
          setDetailsSongs([]); 
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
  };

  const playSong = (list, idx) => {
    if (!list || idx < 0 || idx >= list.length) return;
    if (list !== queue) setQueue(list);
    setQIndex(idx);
    const song = list[idx];
    setCurrentSong(song);
    
    if (!song.downloadUrl) return alert("Audio unavailable");

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

  const togglePlay = () => {
    if (audioRef.current.paused) { audioRef.current.play(); setIsPlaying(true); }
    else { audioRef.current.pause(); setIsPlaying(false); }
  };

  const handleQualityChange = (newQ) => {
    setQuality(newQ);
    if (currentSong && currentSong.downloadUrl) {
        const t = audioRef.current.currentTime;
        let match = currentSong.downloadUrl.find(u => u.quality === newQ);
        let url = match ? match.url : currentSong.downloadUrl[currentSong.downloadUrl.length - 1].url;
        if (audioRef.current.src !== url) {
            audioRef.current.src = url;
            audioRef.current.currentTime = t;
            if (isPlaying) audioRef.current.play();
        }
    }
  };

  useEffect(() => {
    const a = audioRef.current;
    const time = () => { setProgress(a.currentTime); setDuration(a.duration||0); };
    const end = () => playSong(queue, qIndex+1);
    a.addEventListener('timeupdate', time);
    a.addEventListener('ended', end);
    return () => { a.removeEventListener('timeupdate', time); a.removeEventListener('ended', end); };
  }, [queue, qIndex]);

  const isLiked = (id) => user?.likedSongs?.some(s => s.id === id);

  // ==============================
  // 5. RENDER
  // ==============================

  if (view === 'loading') return <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#000', color:'white'}}>Loading...</div>;

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

      {/* Main Content */}
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
            <div className="avatar">{user?.email ? user.email[0].toUpperCase() : 'U'}</div>
            <span style={{fontSize:'0.9rem', color:'#aaa', marginLeft:'10px'}}>Logout</span>
          </div>
        </div>

        <div className="scroll-area">
          {loading && <div style={{textAlign:'center', padding:'20px', color:'#555'}}>Loading...</div>}

          {/* DETAILS PAGE */}
          {tab === 'details' && selectedItem && (
             <div className="details-view">
               <button className="btn-back" onClick={() => setTab('home')} style={{marginBottom:'20px', background:'rgba(255,255,255,0.1)', border:'none', color:'white', padding:'8px 16px', borderRadius:'20px', cursor:'pointer'}}>← Back</button>
               <div className="details-header">
                  <img src={getImg(selectedItem.image)} alt="" className="details-img"/>
                  <div className="details-info">
                     <h1>{getName(selectedItem)}</h1>
                     <p>{getDesc(selectedItem)} • {detailsSongs.length} Songs</p>
                     <div className="action-buttons">
                        <button className="btn-play-all" onClick={() => playSong(detailsSongs, 0)}>▶ Play All</button>
                     </div>
                  </div>
               </div>
               
               <div className="details-songs">
                  {detailsSongs.map((song, idx) => (
                     <div key={song.id} className="song-row" onClick={() => playSong(detailsSongs, idx)}>
                        <span className="song-num">{idx + 1}</span>
                        <img src={getImg(song.image)} alt="" />
                        <div className="song-meta">
                           <h4>{getName(song)}</h4>
                           <p>{song.primaryArtists}</p>
                        </div>
                        <span className="song-dur">{Math.floor(song.duration/60)}:{String(song.duration%60).padStart(2, '0')}</span>
                     </div>
                  ))}
               </div>
             </div>
          )}

          {/* SEARCH RESULTS */}
          {tab === 'search_results' && (
             <>
                <h2>Search Results</h2>
                <div className="grid">
                    {searchResults.map((item) => (
                      <div key={item.id} className="card" onClick={()=>handleCardClick(item, 'song')}>
                        <img src={getImg(item.image)} alt=""/>
                        <h3>{getName(item)}</h3>
                        <p>{item.primaryArtists}</p>
                        <div className={`card-heart ${isLiked(item.id)?'liked':''}`} onClick={(e)=>{e.stopPropagation(); toggleLike(item)}}>♥</div>
                      </div>
                    ))}
                </div>
             </>
          )}

          {/* HOMEPAGE */}
          {tab === 'home' && (
            <>
              <div className="section">
                <div className="section-header">
                    <div className="section-title">Trending Now</div>
                </div>
                <div className="horizontal-scroll">
                    {trendingSongs.map((item) => (
                      <div key={item.id} className="card" onClick={()=>handleCardClick(item, 'song')}>
                        <img src={getImg(item.image)} alt=""/>
                        <h3>{getName(item)}</h3>
                        <p>{item.primaryArtists}</p>
                        <div className={`card-heart ${isLiked(item.id)?'liked':''}`} onClick={(e)=>{e.stopPropagation(); toggleLike(item)}}>♥</div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="section">
                <div className="section-header">
                    <div className="section-title">New Albums</div>
                </div>
                <div className="horizontal-scroll">
                    {newAlbums.map((item) => (
                      <div key={item.id} className="card" onClick={()=>handleCardClick(item, 'album')}>
                        <img src={getImg(item.image)} alt=""/>
                        <h3>{getName(item)}</h3>
                        <p>{item.year}</p>
                      </div>
                    ))}
                </div>
              </div>

              <div className="section">
                <div className="section-header">
                    <div className="section-title">Top Playlists</div>
                </div>
                <div className="horizontal-scroll">
                    {topPlaylists.map((item) => (
                      <div key={item.id} className="card" onClick={()=>handleCardClick(item, 'playlist')}>
                        <img src={getImg(item.image)} alt=""/>
                        <h3>{getName(item)}</h3>
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
              {likedSongs.length === 0 ? <p style={{color:'#666'}}>No songs liked yet.</p> : (
                 <div className="grid">
                    {likedSongs.map((item, idx) => (
                      <div key={item.id} className="card" onClick={()=>playSong(likedSongs, idx)}>
                        <img src={getImg(item.image)} alt=""/>
                        <h3>{getName(item)}</h3>
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
                   <h4 style={{color:'white', fontSize:'0.95rem'}}>{getName(currentSong)}</h4>
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
                    value={volume} onChange={(e)=>{setVolume(e.target.value); audioRef.current.volume=e.target.value}}
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
