import { useEffect, useRef } from 'react';
import { activeIndex } from './lrc';

// data: { status: 'loading' | 'synced' | 'plain' | 'none' | 'error', lines?, plain? }
// Timed lyrics highlight the current line and scroll with the song; touching the list pauses the scrolling for a moment.
export default function Lyrics({ data, time, canSeek, onSeek, onRetry }) {
  const root = useRef(null);
  const items = useRef([]);
  const touched = useRef(0);
  const synced = data.status === 'synced';
  const idx = synced ? activeIndex(data.lines, time + 0.25) : -1;

  useEffect(() => {
    const sc = root.current?.closest('.panel-body');
    if (!sc) return undefined;
    const mark = () => { touched.current = Date.now(); };
    sc.addEventListener('wheel', mark, { passive: true }); sc.addEventListener('touchmove', mark, { passive: true });
    return () => { sc.removeEventListener('wheel', mark); sc.removeEventListener('touchmove', mark); };
  }, []);

  useEffect(() => {
    const el = items.current[idx], sc = el?.closest('.panel-body');
    if (!el || !sc || Date.now() - touched.current < 3000) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    sc.scrollTo({ top: el.offsetTop - sc.clientHeight / 2 + el.clientHeight / 2, behavior: calm ? 'auto' : 'smooth' });
  }, [idx]);

  if (data.status === 'loading') return <div ref={root} className="lrc-skeleton" aria-busy="true" aria-label="Loading lyrics">{[70, 90, 55, 80, 65, 85].map((w, i) => <div key={i} className="sk" style={{ width: `${w}%` }} />)}</div>;
  if (data.status === 'error') return <div ref={root} className="lrc-empty"><p>We couldn’t load the lyrics. Check your connection and try again.</p><button className="btn" onClick={onRetry}>Try again</button></div>;
  if (data.status === 'none') return <div ref={root} className="lrc-empty"><p>No lyrics found for this track.</p></div>;
  if (data.status === 'plain') return <div ref={root}><div className="lyrics">{data.plain}</div><p className="lrc-credit">These lyrics aren’t timed, so they won’t follow the song.</p></div>;
  return (
    <div ref={root}>
      <ol className="lrc" aria-label="Lyrics">
        {data.lines.map((l, i) => (
          <li key={i} ref={(el) => { items.current[i] = el; }} className={i === idx ? 'on' : i < idx ? 'past' : ''} aria-current={i === idx ? 'true' : undefined}>
            <button disabled={!canSeek} onClick={() => onSeek(l.t)} aria-label={l.text ? `Jump to “${l.text}”` : 'Jump to instrumental break'}>{l.text || '…'}</button>
          </li>
        ))}
      </ol>
      <p className="lrc-credit">Timed lyrics from LRCLIB</p>
    </div>
  );
}
