import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import toast, { Toaster } from 'react-hot-toast';

// --- API CONFIG ---
const API_BASE = "https://saavn.sumit.co/api";

const MOODS = [
  { id: 'm1', name: 'Party', color: '#e57373', query: 'Party Hits' },
  { id: 'm2', name: 'Romance', color: '#f06292', query: 'Love Songs' },
  { id: 'm3', name: 'Sad', color: '#ba68c8', query: 'Sad Songs' },
  { id: 'm4', name: 'Workout', color: '#ffb74d', query: 'Gym Motivation' },
  { id: 'm5', name: 'Chill', color: '#4db6ac', query: 'Chill Lo-Fi' },
];

const ICONS = {
  Home: () => <span style={{fontSize:'1.5rem'}}>🏠</span>,
  Search: () => <span style={{fontSize:'1.5rem'}}>🔍</span>,
  Library: () => <span style={{fontSize:'1.5rem'}}>📚</span>,
  Play: () => <span style={{fontSize:'1.5rem'}}>▶</span>,
  Pause: () => <span style={{fontSize:'1.5rem'}}>⏸</span>,
  SkipFwd: () => <span style={{fontSize:'1.5rem'}}>⏭</span>,
  SkipBack: () => <span style={{fontSize:'1.5rem'}}>⏮</span>,
  Profile: () => <span style={{fontSize:'1.5rem'}}>👤</span>,
  Heart: () => <span>♥</span>,
  Plus: () => <span>+</span>,
  Shuffle: () => <span>🔀</span>,
  Repeat: () => <span>🔁</span>,
  List: () => <span>📜</span>,
  Mic: () => <span>🎤</span>
};

function App() {
  const [tab, setTab] = useState('home');
  const [user, setUser] = useState({ email: 'user@aura.app' }); 
  
  // Data State
  const [homeData, setHomeData] = useState({ trending: [], charts: [], newAlbums: [], topArtists: [] });
  const [resSongs, setResSongs] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Player State
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    fetch(`${API_BASE}/search/songs?query=Top 50&limit=15`)
      .then(r => r.json())
      .then(data => setHomeData(prev => ({ ...prev, trending: data.data.results || [] })))
      .catch(e => console.error(e));

    fetch(`${API_BASE}/search/playlists?query=Top Charts&limit=15`)
      .then(r => r.json())
      .then(data => setHomeData(prev => ({ ...prev, charts: data.data.results || [] })))
      .catch(e => console.error(e));
  }, []);

  const doSearch = async () => {
    if(!searchQuery) return;
    setTab('search');
    const toastId = toast.loading('Searching...');
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResSongs(data.data?.results || []);
      toast.dismiss(toastId);
    } catch(e) { 
        toast.error("Search failed");
        toast.dismiss(toastId);
    }
  };

  // --- PLAYER LOGIC ---
  const playSong = (song) => {
    setCurrentSong(song);
    const url = song.downloadUrl?.[song.downloadUrl.length-1]?.url || song.downloadUrl?.[0]?.url;
    
    if(url) {
      audioRef.current.src = url;
      audioRef.current.play()
        .then(() => {
            setIsPlaying(true);
            toast.success(`Playing: ${getName(song)}`, {
                style: { background: '#333', color: '#fff' },
                icon: '🎵'
            });
        })
        .catch(e => toast.error("Playback failed"));
    } else {
      toast.error("Audio not available");
    }
  };

  const togglePlay = () => {
    if(audioRef.current.paused) { 
        audioRef.current.play(); 
        setIsPlaying(true); 
    } else { 
        audioRef.current.pause(); 
        setIsPlaying(false); 
    }
  };

  const toggleShuffle = () => {
      setIsShuffle(!isShuffle);
      toast(!isShuffle ? "Shuffle On" : "Shuffle Off", { icon: '🔀' });
  };

  const toggleLike = (song) => {
      const exists = likedSongs.find(s => s.id === song.id);
      if(exists) {
          setLikedSongs(likedSongs.filter(s => s.id !== song.id));
          toast("Removed from Library", { icon: '💔' });
      } else {
          setLikedSongs([...likedSongs, song]);
          toast.success("Added to Library");
      }
  };

  useEffect(() => {
    const a = audioRef.current;
    const update = () => { setProgress(a.currentTime); setDuration(a.duration||0); };
    const end = () => setIsPlaying(false);
    a.addEventListener('timeupdate', update);
    a.addEventListener('ended', end);
    return () => { 
        a.removeEventListener('timeupdate', update);
        a.removeEventListener('ended', end);
    };
  }, []);

  // --- HELPERS ---
  const getImg = (i) => (Array.isArray(i) ? i[i.length-1]?.url : i) || "https://via.placeholder.com/150";
  const getName = (i) => i?.name || i?.title || "Unknown";
  const getDesc = (i) => i?.primaryArtists || i?.description || "";

  return (
    <div className="app-layout">
      {/* Toast Container */}
      <Toaster position="bottom-center" toastOptions={{style:{background:'#333', color:'#fff', borderRadius:'20px'}}}/>

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="brand">Aura.</div>
        <div className={`nav-item ${tab==='home'?'active':''}`} onClick={()=>setTab('home')}><ICONS.Home/> Home</div>
        <div className={`nav-item ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}><ICONS.Search/> Search</div>
        <div className={`nav-item ${tab==='library'?'active':''}`} onClick={()=>setTab('library')}><ICONS.Library/> Library</div>
        <div className={`nav-item ${tab==='profile'?'active':''}`} onClick={()=>setTab('profile')}><ICONS.Profile/> Profile</div>
      </div>

      {/* CONTENT */}
      <div className="main-content">
        <div className="header">
            <div className="search-box">
                <ICONS.Search/>
                <input placeholder="Search..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}/>
            </div>
            <div className="user-pill" onClick={()=>setTab('profile')}>U</div>
        </div>

        <div className="scroll-area">
            {tab === 'home' && (
                <>
                    <div className="hero">
                        <h1>{homeData.trending[0] ? getName(homeData.trending[0]) : "Trending"}</h1>
                        <button style={{padding:'10px 20px', borderRadius:'20px', border:'none', marginTop:'10px', cursor:'pointer'}} onClick={()=>playSong(homeData.trending[0])}>Play Now</button>
                    </div>
                    
                    <div className="section-header">Moods</div>
                    <div className="horizontal-scroll">
                        {MOODS.map(m => (
                            <div key={m.id} className="card" style={{minWidth:'140px', background:m.color, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={()=>toast(`Selected Mood: ${m.name}`)}>
                                <h3 style={{color:'white'}}>{m.name}</h3>
                            </div>
                        ))}
                    </div>

                    <div className="section-header" style={{marginTop:30}}>Trending</div>
                    <div className="horizontal-scroll">
                        {homeData.trending.map(s => (
                            <div key={s.id} className="card" onClick={()=>playSong(s)}>
                                <img src={getImg(s.image)} alt=""/>
                                <h3>{getName(s)}</h3>
                                <div className="card-actions">
                                    <button className="btn-card-action" onClick={(e)=>{e.stopPropagation(); toggleLike(s)}}><ICONS.Heart/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="section-header" style={{marginTop:30}}>Top Charts</div>
                    <div className="horizontal-scroll">
                        {homeData.charts.map(p => (
                            <div key={p.id} className="card">
                                <img src={getImg(p.image)} alt=""/>
                                <h3>{getName(p)}</h3>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {tab === 'search' && (
                <div className="grid">
                    {resSongs.map(s => (
                        <div key={s.id} className="card" onClick={()=>playSong(s)}>
                            <img src={getImg(s.image)} alt=""/>
                            <h3>{getName(s)}</h3>
                            <p>{getDesc(s)}</p>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'profile' && (
                <div className="profile-view" style={{padding:20, textAlign:'center'}}>
                    <h1>My Profile</h1>
                    <p>Logged in as: {user.email}</p>
                    <div className="section-header" style={{marginTop:40}}>Liked Songs</div>
                    <div className="grid">
                        {likedSongs.map(s => (
                            <div key={s.id} className="card" onClick={()=>playSong(s)}>
                                <img src={getImg(s.image)} alt=""/>
                                <h3>{getName(s)}</h3>
                            </div>
                        ))}
                        {likedSongs.length === 0 && <p>No liked songs yet.</p>}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* PLAYER */}
      {currentSong && (
        <div className="player-bar">
            {/* Mobile Progress Bar */}
            <div className="mobile-progress-bar" style={{width: `${(progress/duration)*100}%`}}></div>
            
            <div className="p-track">
                <img src={getImg(currentSong.image)} alt=""/>
                <div className="p-info">
                    <h4 style={{color:'white', margin:0}}>{getName(currentSong)}</h4>
                    <p style={{color:'#aaa', margin:0, fontSize:'0.8rem'}}>{getDesc(currentSong)}</p>
                </div>
            </div>
            <div className="p-center">
                <div className="p-controls">
                    <button className="btn-icon" onClick={toggleShuffle} style={{color: isShuffle ? '#d4acfb' : '#aaa'}}><ICONS.Shuffle/></button>
                    <button className="btn-icon"><ICONS.SkipBack/></button>
                    <button className="btn-play" onClick={togglePlay}>{isPlaying ? <ICONS.Pause/> : <ICONS.Play/>}</button>
                    <button className="btn-icon"><ICONS.SkipFwd/></button>
                    <button className="btn-icon"><ICONS.Repeat/></button>
                </div>
            </div>
            <div className="p-right">
                <button className="btn-icon" onClick={()=>toast('Lyrics feature coming soon')}><ICONS.Mic/></button>
                <button className="btn-icon" onClick={()=>toast('Queue feature coming soon')}><ICONS.List/></button>
            </div>
            
            <div className="mobile-controls" style={{display:'none'}}>
               <button className="btn-play-mobile" onClick={togglePlay}>{isPlaying ? <ICONS.Pause/> : <ICONS.Play/>}</button>
            </div>
        </div>
      )}

      {/* MOBILE NAV */}
      <div className="bottom-nav">
        <div className={`nav-tab ${tab==='home'?'active':''}`} onClick={()=>setTab('home')}><ICONS.Home/></div>
        <div className={`nav-tab ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}><ICONS.Search/></div>
        <div className={`nav-tab ${tab==='library'?'active':''}`} onClick={()=>setTab('library')}><ICONS.Library/></div>
        <div className={`nav-tab ${tab==='profile'?'active':''}`} onClick={()=>setTab('profile')}><ICONS.Profile/></div>
      </div>
    </div>
  );
}

export default App;
