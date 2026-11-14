// The ad rules: what ads exist, which one to show, and when one is due. No network, no tracking, no third-party scripts.
//
// Ads come from public/ads.json (edit it any time, no rebuild needed for the app logic):
// { "everySongs": 5, "ads": [ { "id": "unique-id", "brand": "Sponsor", "title": "Headline", "body": "A sentence or two.",
//   "image": "https://…/banner.jpg", "alt": "Describe the image", "cta": "Learn more", "url": "https://sponsor.example",
//   "duration": 15, "skipAfter": 5, "weight": 1 } ] }
// "url" may also be "#plans" to open the plans page. With no ads listed, the built-in house ads below are used.

export const AD_EVERY = 5;
const clip = (s, n) => String(s ?? '').trim().slice(0, n);
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

export const HOUSE_ADS = [
  { id: 'house-adfree', brand: 'Void', title: 'Listen without interruptions', body: 'Any pass removes ads for as long as it lasts.', cta: 'See plans', url: '#plans', duration: 12, skipAfter: 5, weight: 1 },
  { id: 'house-perks', brand: 'Void', title: 'Crossfade, equalizer and more', body: 'Members get crossfade, a five-band equalizer, playback speed, a sleep timer and no ads.', cta: 'See plans', url: '#plans', duration: 12, skipAfter: 5, weight: 1 },
];

// A link is either the plans page or a plain http(s) URL; anything else (javascript:, data:, relative) is dropped
export function safeLink(url) {
  if (url === '#plans') return { internal: true };
  try { const u = new URL(String(url)); return u.protocol === 'https:' || u.protocol === 'http:' ? { href: u.href } : null; } catch { return null; }
}

export function sanitizeAd(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id || !raw.title) return null;
  const duration = num(raw.duration, 5, 30, 15);
  const image = safeLink(raw.image)?.href || '';
  const link = safeLink(raw.url);
  return {
    id: clip(raw.id, 60), brand: clip(raw.brand, 40), title: clip(raw.title, 80), body: clip(raw.body, 200),
    image, alt: clip(raw.alt, 100), cta: link ? clip(raw.cta, 24) || 'Learn more' : '', url: link ? (link.internal ? '#plans' : link.href) : '',
    duration, skipAfter: num(raw.skipAfter, 0, duration, Math.min(5, duration)), weight: num(raw.weight, 0, 100, 1),
  };
}

export function normalizeConfig(json) {
  const ads = (Array.isArray(json?.ads) ? json.ads : []).map(sanitizeAd).filter((a) => a && a.weight > 0);
  return { every: Math.round(num(json?.everySongs, 1, 50, AD_EVERY)), ads: ads.length ? ads : HOUSE_ADS.map(sanitizeAd) };
}

export async function loadAds(url, fetchFn = fetch) {
  try {
    const r = await fetchFn(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return normalizeConfig(await r.json());
  } catch { return normalizeConfig(null); } // missing, offline or malformed: the house ads still work
}

// Weighted pick that avoids repeating the last ad when there is a choice
export function pickAd(ads, lastId, rand = Math.random) {
  const pool = ads.length > 1 ? ads.filter((a) => a.id !== lastId) : ads;
  let r = rand() * pool.reduce((t, a) => t + a.weight, 0);
  for (const a of pool) { r -= a.weight; if (r < 0) return a; }
  return pool[pool.length - 1];
}

// Counts songs that were really listened to; an ad is due once `every` of them have gone by. Survives reloads.
export function createAdGate(key, { every = AD_EVERY, store = globalThis.localStorage } = {}) {
  let n = Math.max(0, parseInt(store.getItem(key), 10) || 0), limit = every;
  const save = () => { try { store.setItem(key, String(n)); } catch { /* storage full or blocked */ } };
  return {
    bump() { n += 1; save(); return n; },
    due: () => n >= limit,
    reset() { n = 0; save(); },
    setEvery(v) { limit = v; },
    get count() { return n; },
  };
}
