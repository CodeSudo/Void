import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const API_BASE = "https://saavn.sumit.co/api";

function App() {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('songs');
  const [searchResults, setSearchResults] = useState([]);
  const [view, setView] = useState('home'); // 'home' | 'detail'
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Audio State
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [currentQueue, setCurrentQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [quality, setQuality] = useState('320kbps');

  // --- API Functions ---

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setView('home');
    try {
      const res = await fetch(`${API_BASE}/search/${searchType}?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSearchResults(data.data.results);
      }
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (id, type) => {
    setLoading(true);
    try {
      let endpoint = type === 'albums' 
        ? `${API_BASE}/albums?id=${id}` 
        : `${API_BASE}/playlists?id=${id}`;
      
      const res = await fetch(endpoint);
      const data = await res.json();
      
      if (data.success && data.data) {
        setDetailData(data.data);
        setView('detail');
      }
    } catch (error) {
      console.error("Details failed", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Player Logic ---

  const playQueue = (queue, index, autoPlay = true) => {
    if (index < 0 || index >= queue.length) return;
    
    // If switching queues, update state
    if (queue !== currentQueue) {
      setCurrentQueue(queue);
    }

    setCurrentIndex(index);
    const song = queue[index];
    setCurrentSong(song);

    // Find URL based on quality
    let audioUrl = "";
    if (song.downloadUrl && song.downloadUrl.length > 0) {
      let match = song.downloadUrl.find(u => u.quality === quality);
      audioUrl = match ? match.url : song.downloadUrl[song.downloadUrl.length - 1].url;
    }

    if (!audioUrl) {
      alert("Audio not available");
      return;
    }

    // Set Audio source
    if (audioRef.current.src !== audioUrl) {
      audioRef.current.src = audioUrl;
      if (autoPlay) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.error("Playback failed", e));
      }
    }
  };

  // Handle Quality Change
  const handleQualityChange = (newQuality) => {
    setQuality(newQuality);
    if (currentSong) {
      const currTime = audioRef.current.currentTime;
      const wasPlaying = !audioRef.current.paused;
      
      // Trigger replay with new quality logic
      // We manually fetch the new URL here to force update without changing song index
      let match = currentSong.downloadUrl.find(u => u.quality === newQuality);
      let newUrl = match ? match.url : currentSong.downloadUrl[currentSong.downloadUrl.length - 1].url;

      if (audioRef.current.src !== newUrl) {
        audioRef.current.src = newUrl;
        audioRef.current.currentTime = currTime;
        if (wasPlaying) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    }
  };

  const togglePlay = () => {
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const playNext = () => playQueue(currentQueue, currentIndex + 1);
  const playPrev = () => playQueue(currentQueue, currentIndex - 1);

  const seek = (e) => {
    const width = e.currentTarget.clientWidth;
    const clickX = e.nativeEvent.offsetX;
    const duration = audioRef.current.duration;
    audioRef.current.currentTime = (clickX / width) * duration;
  };

  // --- Effects ---

  useEffect(() => {
    const audio = audioRef.current;
    
    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      playNext();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex, currentQueue]); // Re-bind if queue changes

  // --- Helpers ---
  const getImg = (imgArr) => Array.isArray(imgArr) ? imgArr[imgArr.length - 1].url : imgArr;
  const fmtTime = (s) => {
    if (!s) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' + sec : sec}`;
  };

  return (
    <div className="app">
      {/* Header */}
      <header>
        <div className="logo" onClick={() => { setView('home'); setSearchResults([]); setSearchQuery(''); }}>JioSaavn</div>
        <div className="search-container">
          <input 
            type="text" 
            placeholder="Search songs, albums, playlists..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <select 
            className="search-select" 
            value={searchType} 
            onChange={(e) => setSearchType(e.target.value)}
          >
            <option value="songs">Songs</option>
            <option value="albums">Albums</option>
            <option value="playlists">Playlists</option>
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {loading && <div className="loader"></div>}

        {/* Grid View */}
        {view === 'home' && (
          <>
            <h2>{searchResults.length > 0 ? "Search Results" : "Trending"}</h2>
            <div className="grid">
              {searchResults.map((item) => (
                <div 
                  key={item.id} 
                  className="card"
                  onClick={() => searchType === 'songs' ? playQueue([item], 0) : fetchDetails(item.id, searchType)}
                >
                  <img src={getImg(item.image)} alt={item.name} />
                  <h3>{item.name || item.title}</h3>
                  <p>{searchType === 'songs' ? item.primaryArtists : item.description || item.year}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Detail View */}
        {view === 'detail' && detailData && (
          <div className="detail-view">
            <button className="btn-reset" onClick={() => setView('home')} style={{marginBottom: '20px', color:'white'}}>
              &larr; Back
            </button>
            <div className="detail-header">
              <img src={getImg(detailData.image)} alt={detailData.name} />
              <div className="detail-info">
                <h1>{detailData.name}</h1>
                <p>{detailData.description || detailData.label} | {detailData.songCount || detailData.songs?.length} Songs</p>
                <button className="play-all-btn" onClick={() => playQueue(detailData.songs, 0)}>Play All</button>
              </div>
            </div>
            
            <div className="track-list">
              {detailData.songs && detailData.songs.map((song, idx) => (
                <div 
                  key={song.id} 
                  className={`track ${currentSong && currentSong.id === song.id ? 'active' : ''}`}
                  onClick={() => playQueue(detailData.songs, idx)}
                >
                  <span style={{width:'20px', textAlign:'center'}}>{idx + 1}</span>
                  <img src={getImg(song.image)} alt="" />
                  <div className="track-info">
                    <span className="track-title">{song.name}</span>
                    <span style={{fontSize:'0.8rem', opacity:0.7}}>{song.primaryArtists}</span>
                  </div>
                  <span>{fmtTime(song.duration)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Player Bar */}
      <div className="player">
        <div className="player-info">
          <img src={currentSong ? getImg(currentSong.image) : "https://via.placeholder.com/50"} alt="" />
          <div className="player-text">
            <h4>{currentSong ? currentSong.name : "Not Playing"}</h4>
            <p style={{fontSize:'0.8rem', color:'#b3b3b3'}}>
              {currentSong ? (currentSong.primaryArtists || currentSong.singers) : "Select a song"}
            </p>
          </div>
        </div>

        <div className="player-controls">
          <div className="buttons">
            <button className="btn-reset btn-control" onClick={playPrev}>&#9664;&#9664;</button>
            <button className="btn-reset btn-play" onClick={togglePlay}>
              {isPlaying ? <span>&#10074;&#10074;</span> : <span>&#9658;</span>}
            </button>
            <button className="btn-reset btn-control" onClick={playNext}>&#9654;&#9654;</button>
          </div>
          <div className="progress-container">
            <span>{fmtTime(currentTime)}</span>
            <div className="progress-bar" onClick={seek}>
              <div 
                className="progress-fill" 
                style={{width: `${(currentTime / duration) * 100}%`}}
              ></div>
            </div>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        <div className="volume-controls">
          <select 
            className="quality-select" 
            value={quality} 
            onChange={(e) => handleQualityChange(e.target.value)}
          >
            <option value="320kbps">320kbps</option>
            <option value="160kbps">160kbps</option>
            <option value="96kbps">96kbps</option>
            <option value="48kbps">48kbps</option>
          </select>
          <span style={{fontSize:'0.8rem'}}>Vol</span>
          <input 
            type="range" 
            min="0" max="1" step="0.1" 
            defaultValue="1" 
            onChange={(e) => { audioRef.current.volume = e.target.value }} 
            style={{width:'80px', cursor:'pointer'}}
          />
        </div>
      </div>
    </div>
  );
}

export default App;