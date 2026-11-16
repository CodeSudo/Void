import { useEffect, useId, useRef } from 'react';
import { Ic } from './icons';
import { arcPath, knobAngle, windowOf, dragDelta, clamp } from './mini';

// A hardware-style disc player: chrome disc that spins while music plays, a screen with the queue, and a volume knob.
// `h` holds the app's formatters: { name, desc, img, time }.
export default function MiniPlayer({ song, queue, qIndex, isPlaying, progress, duration, volume, isShuffle, repeatMode, pos, setPos, h,
  onClose, onToggle, onPrev, onNext, onSeek, onVolume, onMute, onShuffle, onRepeat, onPlayAt }) {
  const uid = useId().replace(/:/g, '');
  const wrap = useRef(null), list = useRef(null), drag = useRef(null), turn = useRef(null);
  const has = !!song;
  const pct = Math.round(volume * 100);
  const { start, items } = windowOf(queue, qIndex);
  const art = has ? h.img(song.image) : '';
  const done = duration ? Math.min(100, (progress / duration) * 100) : 0;

  useEffect(() => { // keep the current song in view
    const box = list.current, el = box?.querySelector('.on');
    if (box && el) box.scrollTop = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
  }, [qIndex, queue.length]);

  // Drag the player by its left grip (desktop only; on phones it sits above the bottom bar)
  const down = (e) => {
    if (window.matchMedia('(max-width: 860px)').matches) return;
    drag.current = { sx: e.clientX, sy: e.clientY, rect: wrap.current.getBoundingClientRect(), ox: pos.x, oy: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    const d = drag.current; if (!d) return;
    const m = dragDelta(d.rect, e.clientX - d.sx, e.clientY - d.sy, window.innerWidth, window.innerHeight);
    setPos({ x: d.ox + m.dx, y: d.oy + m.dy });
  };

  // The knob: drag sideways, use the arrow keys, or double-click to mute
  const setVol = (v) => onVolume(Math.round(clamp(v, 0, 1) * 100) / 100);
  const knobKey = (e) => {
    const step = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05, PageUp: 0.1, PageDown: -0.1 }[e.key];
    if (step) setVol(volume + step); else if (e.key === 'Home') setVol(0); else if (e.key === 'End') setVol(1); else return;
    e.preventDefault(); e.stopPropagation(); // arrows here mean volume, not the player-wide seek shortcuts
  };

  return (
    <section ref={wrap} className="mini" role="group" aria-label="Mini player" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
      <svg className="mini-svg" viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <path id={`${uid}-t`} d={arcPath(26, 20, 14.1, -84, -12)} />
          <path id={`${uid}-b`} d={arcPath(26, 20, 14.9, 84, 14)} />
        </defs>
        <circle cx="26" cy="20" r="12.6" fill="none" stroke="#111216" strokeWidth="2.4" />
        <circle cx="26" cy="20" r="13.85" fill="none" stroke="#2a2c33" strokeWidth=".12" />
        <circle cx="26" cy="20" r="11.35" fill="none" stroke="#2a2c33" strokeWidth=".12" />
        {[[-80, -14], [14, 80]].map(([a, b]) => (
          <g key={a} fill="none">
            <path d={arcPath(26, 20, 12.6, a, b)} stroke="#1a1b20" strokeWidth="3.1" strokeLinecap="round" />
            <path d={arcPath(26, 20, 12.6, a, b)} stroke="#555861" strokeWidth="2.2" strokeDasharray=".22 .3" />
          </g>
        ))}
        <text fontSize=".7" fill="#7a7d86" letterSpacing=".24"><textPath href={`#${uid}-t`}>VOID MUSIC PLAYER</textPath></text>
        <text fontSize=".7" fill="#7a7d86" letterSpacing=".24"><textPath href={`#${uid}-b`}>{has ? 'NOW PLAYING' : 'STANDBY'}</textPath></text>
      </svg>

      <div className={`mini-disc${has ? '' : ' empty'}`}>
        <div className={`mini-art${isPlaying ? '' : ' paused'}`} style={art ? { '--art': `url(${JSON.stringify(art)})` } : undefined} />
      </div>

      <div className="mini-bracket" aria-hidden="true" />
      <div className="mini-hub" aria-hidden="true" />
      <div ref={turn} className="mini-knob" role="slider" tabIndex={0} aria-label="Volume" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
        aria-valuetext={pct === 0 ? 'Muted' : `${pct}%`} style={{ '--a': `${knobAngle(volume)}deg` }}
        onKeyDown={knobKey} onDoubleClick={onMute}
        onPointerDown={(e) => { turn.current.drag = { x: e.clientX, v: volume }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { const d = turn.current.drag; if (d) setVol(d.v + (e.clientX - d.x) / 160); }}
        onPointerUp={() => { turn.current.drag = null; }}><i /></div>
      <p className="mini-vol" aria-hidden="true">VOL {String(pct).padStart(2, '0')}</p>

      <div className="mini-body">
        <div className="mini-slab" onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} />
        <button className="mini-screw" aria-label="Close mini player" onClick={onClose}><span aria-hidden="true">×</span></button>
        <div className="mini-plate">
          <div className="mini-vent" aria-hidden="true" />
          <div className="mini-pill" aria-hidden="true" />
          <div className="mini-screen">
            <header className="mini-head">
              <div><h3>{has ? 'Queue' : 'Void'}</h3><small>{has ? `${queue.length} ${queue.length === 1 ? 'TRACK' : 'TRACKS'}` : 'NOTHING PLAYING'}</small></div>
              <span className="v" aria-hidden="true">{`VOL ${pct}`}</span>
            </header>
            {has ? <div className="mini-cover"><img src={art} alt="" /></div> : <div className="mini-cover empty"><Ic.disc s="2.4em" /></div>}
            <input className="scrub mini-scrub" type="range" aria-label="Seek" min="0" max={duration || 0} step="1" disabled={!has} value={Math.min(progress, duration || 0)}
              style={{ '--p': `${done}%`, '--b': `${done}%` }} onChange={(e) => onSeek(+e.target.value)} onPointerUp={(e) => e.currentTarget.blur()} />
            <div className="mini-ctl">
              <span className="time">{h.time(progress)} / {h.time(duration)}</span>
              <button aria-label="Shuffle" aria-pressed={isShuffle} className={isShuffle ? 'on' : ''} onClick={onShuffle}><Ic.shuffle s="1.1em" /></button>
              <button aria-label={`Repeat: ${repeatMode}`} aria-pressed={repeatMode !== 'none'} className={repeatMode !== 'none' ? 'on' : ''} onClick={onRepeat}><Ic.repeat s="1.1em" />{repeatMode === 'one' && <sup>1</sup>}</button>
              <button className="go" aria-label={isPlaying ? 'Pause' : 'Play'} disabled={!has} onClick={onToggle}>{isPlaying ? <Ic.pause s="1.1em" /> : <Ic.play s="1.1em" />}</button>
            </div>
            <ol className="mini-list" ref={list} aria-label="Queue">
              {!items.length && <li className="mini-empty">Pick a song and it shows up here.</li>}
              {items.map((s, k) => {
                const i = start + k;
                return (
                  <li key={`${s.id}-${i}`}>
                    <button className={i === qIndex ? 'on' : ''} aria-current={i === qIndex ? 'true' : undefined} onClick={() => onPlayAt(i)}>
                      <span className="n">{i + 1}.</span>
                      <span className="t"><b>{h.name(s)}</b><small>{h.desc(s)}</small></span>
                      <span className="d">{h.time(s.duration)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <footer className="mini-now">
              <div className="t">{has ? <><b>{qIndex + 1}. {h.name(song)}</b><small>{h.desc(song)}</small></> : <small>Standing by</small>}</div>
              <button aria-label="Previous" disabled={!has} onClick={onPrev}><Ic.prev s="1.1em" /></button>
              <button aria-label="Next" disabled={!has} onClick={onNext}><Ic.next s="1.1em" /></button>
            </footer>
          </div>
          <div className="mini-pill" aria-hidden="true" />
          <div className="mini-vent" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
