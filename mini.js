// Small pure helpers for the mini player (geometry, the queue window, dragging).

const rad = (d) => (d * Math.PI) / 180;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// SVG arc along a circle between two angles in degrees (0 = right, 90 = down). Increasing angle sweeps clockwise.
export function arcPath(cx, cy, r, a1, a2) {
  const p = (a) => `${+(cx + r * Math.cos(rad(a))).toFixed(3)} ${+(cy + r * Math.sin(rad(a))).toFixed(3)}`;
  return `M ${p(a1)} A ${r} ${r} 0 0 ${a2 > a1 ? 1 : 0} ${p(a2)}`;
}

// The knob's slot turns from -135 degrees (silent) to +135 degrees (full)
export const knobAngle = (volume) => -135 + clamp(volume, 0, 1) * 270;

// Only a slice of a long queue is drawn on the little screen; indexes stay the real queue positions
export function windowOf(queue, qIndex, before = 2, after = 40) {
  const start = qIndex >= 0 ? Math.max(0, qIndex - before) : 0;
  const end = Math.min(queue.length, (qIndex >= 0 ? qIndex : 0) + after);
  return { start, items: queue.slice(start, end) };
}

// How far the player may be dragged from where it started without leaving the window
export function dragDelta(rect, dx, dy, vw, vh, margin = 8) {
  return { dx: clamp(dx, margin - rect.left, vw - margin - rect.right), dy: clamp(dy, margin - rect.top, vh - margin - rect.bottom) };
}
