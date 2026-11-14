import { EQ_BANDS, EQ_PRESETS } from './audioFx';
import { Ic } from './icons';

const CROSS = [0, 3, 6, 9, 12];
const hz = (f) => (f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`);
const db = (v) => `${v > 0 ? '+' : ''}${v} dB`;
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// Settings section for crossfade and the equalizer (both are member perks).
export default function Sound({ member, upsell, crossfade, onCrossfade, eq, eqSupported, onEqToggle, onEqGain, onEqPreset }) {
  return (
    <>
      <section>
        <h2>Crossfade</h2>
        <div className="set-row">
          <span>Blend the end of a track into the next</span>
          <div className="chips" role="group" aria-label="Crossfade length">
            {CROSS.map((s) => (
              <button key={s} aria-pressed={crossfade === s} className={`chip${crossfade === s ? ' on' : ''}`} onClick={() => (s && !member ? upsell('Crossfade') : onCrossfade(s))}>
                {s ? `${s} s` : 'Off'}{!member && s > 0 && <Ic.lock s={13} />}
              </button>
            ))}
          </div>
        </div>
        <p className="hint">Used when a track ends on its own. YouTube tracks play without it.</p>
      </section>

      <section>
        <h2>Equalizer</h2>
        <div className="set-row">
          <span id="eq-label">Shape the sound</span>
          <button role="switch" aria-checked={eq.on} aria-labelledby="eq-label" className={`switch${eq.on ? ' on' : ''}`} onClick={() => (member ? onEqToggle(!eq.on) : upsell('The equalizer'))}>
            <i />{!member && <Ic.lock s={12} />}
          </button>
        </div>
        {eqSupported === false && <p className="hint warn">Your browser or the audio source blocks the equalizer, so it’s switched off.</p>}
        <div className={`eq${eq.on ? '' : ' off'}`}>
          <div className="chips" role="group" aria-label="Equalizer presets">
            {Object.entries(EQ_PRESETS).map(([name, g]) => (
              <button key={name} disabled={!eq.on} aria-pressed={same(eq.gains, g)} className={`chip${same(eq.gains, g) ? ' on' : ''}`} onClick={() => onEqPreset(g)}>{name}</button>
            ))}
          </div>
          <div className="bands">
            {EQ_BANDS.map((f, i) => (
              <div className="band" key={f}>
                <label htmlFor={`eq-${i}`}>{hz(f)}</label>
                <input id={`eq-${i}`} className="scrub" type="range" min="-12" max="12" step="1" value={eq.gains[i]} disabled={!eq.on}
                  style={{ '--p': `${((eq.gains[i] + 12) / 24) * 100}%`, '--b': `${((eq.gains[i] + 12) / 24) * 100}%` }} onChange={(e) => onEqGain(i, +e.target.value)} />
                <output htmlFor={`eq-${i}`}>{db(eq.gains[i])}</output>
              </div>
            ))}
          </div>
        </div>
        <p className="hint">Works with JioSaavn tracks. Other sources play without it.</p>
      </section>
    </>
  );
}
