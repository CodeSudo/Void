import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { safeLink } from './ads';

// The ad popup. It cannot be dismissed until `skipAfter` seconds have passed, then it can be skipped, and it ends by itself
// after `duration` seconds. onDone continues with the song you asked for; onUpgrade does that and opens the plans page.
export default function AdBreak({ ad, onDone, onUpgrade }) {
  const start = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const canSkip = elapsed >= ad.skipAfter;
  const link = safeLink(ad.url);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start.current) / 1000)), 250);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (elapsed >= ad.duration) onDone(); }, [elapsed]);

  return (
    <Modal titleId="ad-h" onClose={() => { if (canSkip) onDone(); }}>
      <div className="ad-card">
        <span className="ad-tag">Ad</span>
        {ad.image && <img className="ad-img" src={ad.image} alt={ad.alt} />}
        {ad.brand && <p className="ad-brand">{ad.brand}</p>}
        <h2 id="ad-h" tabIndex={-1} data-autofocus>{ad.title}</h2>
        {ad.body && <p className="sub">{ad.body}</p>}
        <div className="ad-progress" role="progressbar" aria-label="Ad progress" aria-valuemin={0} aria-valuemax={ad.duration} aria-valuenow={Math.min(elapsed, ad.duration)}>
          <i style={{ width: `${Math.min(100, (elapsed / ad.duration) * 100)}%` }} />
        </div>
        <div className="acts">
          {link?.internal && <button className="btn pri" onClick={onUpgrade}>{ad.cta}</button>}
          {link?.href && <a className="btn pri" href={link.href} target="_blank" rel="noopener noreferrer sponsored">{ad.cta}</a>}
          <button className="btn" disabled={!canSkip} onClick={onDone}>{canSkip ? 'Skip ad' : `Skip in ${ad.skipAfter - elapsed}`}</button>
        </div>
        {!link?.internal && <button className="link-btn small" onClick={onUpgrade}>Remove ads with a pass</button>}
        <p className="sr" aria-live="polite">{canSkip ? 'You can skip the ad now.' : ''}</p>
      </div>
    </Modal>
  );
}
