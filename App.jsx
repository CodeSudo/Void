import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import toast, { Toaster } from 'react-hot-toast';

// --- SAFE MODE: MOCK DATA (No API/Firebase calls) ---
const MOCK_DATA = {
  trending: [
    { id: '1', name: 'Starboy', primaryArtists: 'The Weeknd', image: 'https://i.scdn.co/image/ab67616d0000b2734718e28d24527d9774635ded' },
    { id: '2', name: 'Flowers', primaryArtists: 'Miley Cyrus', image: 'https://i.scdn.co/image/ab67616d0000b273f429549123dbe8552764ba1d' },
    { id: '3', name: 'As It Was', primaryArtists: 'Harry Styles', image: 'https://i.scdn.co/image/ab67616d0000b273b46f74097655d7f353ca6605' },
  ],
  charts: [
    { id: 'c1', name: 'Global Top 50', image: 'https://charts-images.scdn.co/assets/locale_en/regional/weekly/region_global_default.jpg' },
    { id: 'c2', name: 'Viral Hits', image: 'https://i.scdn.co/image/ab67706f00000002d6d48b11fd3b11da654c3519' },
  ]
};

// --- ICONS ---
const Icons = {
  Home: () => <span>🏠</span>, Search: () => <span>🔍</span>, Library: () => <span>📚</span>,
  Play: () => <span>▶</span>, Pause: () => <span>⏸</span>, Next: () => <span>⏭</span>, Prev: () => <span>⏮</span>,
  Shuffle: () => <span>🔀</span>, Repeat: () => <span>🔁</span>, Mic: () => <span>🎤</span>, List: () => <span>📜</span>,
  Back: () => <span>⬅</span>, Plus: () => <span>➕</span>, Heart: () => <span>♥</span>
};

function App() {
  const [tab, setTab] = useState('home');
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(30); // Fake progress
  const [duration, setDuration] = useState(100);

  // Fake Play Function
  const playSong = (song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    toast.success(`Playing: ${song.name}`);
  };

  const getImg = (i) => i || "https://via.placeholder.com/150";

  return (
    <div className="app-layout">
      <Toaster position="top-center" toastOptions={{style:{background:'#333', color:'#fff'}}}/>
      
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="brand" style={{color:'#d4acfb', fontSize:'1.5rem', fontWeight:'bold', marginBottom:'30px'}}>Aura.</div>
        <div className={`nav-item ${tab==='home'?'active':''}`} onClick={()=>setTab('home')}><Icons.Home/> Home</div>
        <div className={`nav-item ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}><Icons.Search/> Search</div>
        <div className={`nav-item ${tab==='library'?'active':''}`} onClick={()=>setTab('library')}><Icons.Library/> Library</div>
        <div className={`nav-item ${tab==='profile'?'active':''}`} onClick={()=>setTab('profile')}>👤 Profile</div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        <div className="header">
            <div className="search-box">
                <Icons.Search/>
                <input placeholder="Search is disabled in Safe Mode" disabled/>
            </div>
            <div className="user-pill" onClick={()=>setTab('profile')}>
                <div className="avatar">U</div>
            </div>
        </div>

        <div className="scroll-area">
            {tab === 'home' && (
                <>
                    <div className="hero">
                        <h1>{MOCK_DATA.trending[0].name}</h1>
                        <p>{MOCK_DATA.trending[0].primaryArtists}</p>
                        <button style={{padding:'10px 20px', marginTop:'10px', borderRadius:'20px', border:'none', cursor:'pointer'}} onClick={()=>playSong(MOCK_DATA.trending[0])}>Play Now</button>
                    </div>
                    
                    <div className="section-header">Trending Now</div>
                    <div className="horizontal-scroll">
                        {MOCK_DATA.trending.map(s => (
                            <div key={s.id} className="card" onClick={()=>playSong(s)}>
                                <img src={s.image} alt=""/>
                                <h3>{s.name}</h3>
                                <p>{s.primaryArtists}</p>
                            </div>
                        ))}
                    </div>

                    <div className="section-header" style={{marginTop:'30px'}}>Top Charts</div>
                    <div className="horizontal-scroll">
                        {MOCK_DATA.charts.map(c => (
                            <div key={c.id} className="card">
                                <img src={c.image} alt=""/>
                                <h3>{c.name}</h3>
                            </div>
                        ))}
                    </div>
                </>
            )}
            
            {tab !== 'home' && <div style={{padding:'40px', textAlign:'center'}}>Feature disabled in Safe Mode</div>}
        </div>
      </div>

      {/* PLAYER */}
      {currentSong && (
        <div className="player-bar">
            {/* Mobile Progress Line */}
            <div className="mobile-progress-bar" style={{width: '30%'}}></div>
            
            <div className="p-track">
                <img src={currentSong.image} alt=""/>
                <div className="p-info">
                    <h4 style={{margin:0, color:'white'}}>{currentSong.name}</h4>
                    <p style={{margin:0, fontSize:'0.8rem', color:'#aaa'}}>{currentSong.primaryArtists}</p>
                </div>
            </div>
            
            <div className="p-center">
                <div className="p-controls">
                    <button className="btn-icon"><Icons.Prev/></button>
                    <button className="btn-play" onClick={()=>setIsPlaying(!isPlaying)}>{isPlaying ? <Icons.Pause/> : <Icons.Play/>}</button>
                    <button className="btn-icon"><Icons.Next/></button>
                </div>
            </div>
            <div className="p-right"></div>
            
            {/* Mobile Play Button Hook */}
            <div className="mobile-controls" style={{display:'none'}}>
               <button className="btn-play-mobile" onClick={()=>setIsPlaying(!isPlaying)}>{isPlaying ? <Icons.Pause/> : <Icons.Play/>}</button>
            </div>
        </div>
      )}

      {/* MOBILE NAV */}
      <div className="bottom-nav">
        <div className="nav-tab" onClick={()=>setTab('home')}><Icons.Home/> Home</div>
        <div className="nav-tab" onClick={()=>setTab('search')}><Icons.Search/> Search</div>
        <div className="nav-tab" onClick={()=>setTab('profile')}>👤 Profile</div>
      </div>
    </div>
  );
}

export default App;
