// Crossfade volume ramps and the equalizer's Web Audio graph.

const fades = new WeakMap();
export const cancelFade = (el) => { fades.get(el)?.(); fades.delete(el); };

// Equal-power fade so the two tracks keep an even loudness while they overlap.
// shape 'in' rises from silence to `to`; 'out' falls from the current volume to silence.
export function fadeVolume(el, to, ms, done, { shape = 'in', now = () => performance.now(), raf = (f) => requestAnimationFrame(f), caf = (h) => cancelAnimationFrame(h) } = {}) {
  cancelFade(el);
  const from = el.volume, t0 = now();
  let h;
  const step = () => {
    const k = Math.min(1, (now() - t0) / ms);
    if (k >= 1) { el.volume = shape === 'in' ? to : 0; fades.delete(el); done?.(); return; }
    el.volume = Math.max(0, Math.min(1, shape === 'in' ? to * Math.sin(k * Math.PI / 2) : from * Math.cos(k * Math.PI / 2)));
    h = raf(step);
  };
  fades.set(el, () => caf(h));
  h = raf(step);
}

export const EQ_BANDS = [60, 230, 910, 3600, 14000];
export const EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0], 'Bass boost': [6, 4, 0, -1, -2], Vocal: [-2, -1, 3, 3, 0], 'Treble boost': [-2, 0, 0, 3, 6], Warm: [3, 2, 0, -2, -3],
};

// One shared filter chain; every audio element that is "bound" feeds into it. Nothing here runs until the equalizer is first turned on.
export function createEq(Ctx = globalThis.AudioContext || globalThis.webkitAudioContext) {
  let ctx, filters, input;
  const bound = new WeakSet();
  const ensure = () => {
    if (ctx) return;
    ctx = new Ctx();
    filters = EQ_BANDS.map((f, i) => {
      const b = ctx.createBiquadFilter();
      b.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
      b.frequency.value = f; if (b.type === 'peaking') b.Q.value = 1; b.gain.value = 0;
      return b;
    });
    input = ctx.createGain();
    input.connect(filters[0]);
    filters.forEach((f, i) => { if (i < filters.length - 1) f.connect(filters[i + 1]); });
    filters[filters.length - 1].connect(ctx.destination);
  };
  return {
    // The element must have crossOrigin set before it loads, or the browser mutes it once it is bound.
    bind(el) { ensure(); if (bound.has(el)) return; ctx.createMediaElementSource(el).connect(input); bound.add(el); },
    isBound: (el) => bound.has(el),
    setGains(gains) { ensure(); gains.forEach((v, i) => { const p = filters[i].gain; if (p.setTargetAtTime) p.setTargetAtTime(v, ctx.currentTime, 0.03); else p.value = v; }); },
    resume: () => ctx?.resume?.(),
  };
}
