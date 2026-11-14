// Timed ("synced") lyrics from LRCLIB (https://lrclib.net), plus the parsing and lookup helpers around them.

export const cleanTitle = (n) => String(n || '').replace(/\s*[(\[][^)\]]*[)\]]/g, '').replace(/\s+-\s+.*$/, '').trim();

// "[01:23.45] some words" -> [{ t: 83.45, text }]; lines with several stamps repeat; tags like [ar:...] are skipped
export function parseLrc(lrc) {
  const out = [];
  for (const raw of String(lrc || '').split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of stamps) out.push({ t: +m[1] * 60 + +m[2] + (m[3] ? +m[3] / 10 ** m[3].length : 0), text });
  }
  return out.sort((a, b) => a.t - b.t);
}

// Index of the line being sung at time t (-1 before the first line)
export function activeIndex(lines, t) {
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (lines[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
  return ans;
}

// Best match from an LRCLIB search: a timed version whose length is close to the song's, else plain text
export function pickLyrics(results, dur) {
  const gap = (r) => Math.abs((+r.duration || 0) - dur);
  const near = (r, max) => !dur || gap(r) <= max;
  const best = (list) => (dur ? [...list].sort((a, b) => gap(a) - gap(b)) : list)[0];
  const synced = best(results.filter((r) => r.syncedLyrics && near(r, 6)));
  if (synced) {
    const lines = parseLrc(synced.syncedLyrics);
    if (lines.length > 3) return { synced: lines, plain: synced.plainLyrics || '' };
  }
  const plain = best(results.filter((r) => r.plainLyrics && near(r, 12)));
  return plain ? { synced: null, plain: plain.plainLyrics } : null;
}

// Resolves to { synced, plain } or null when nothing matches; throws when the lookup itself fails.
// `proxy` is only tried if the direct request fails (for example if the browser blocks it).
export async function fetchSyncedLyrics({ name, artist, duration }, { proxy = '', fetchFn = fetch, timeout = 8000 } = {}) {
  const qs = new URLSearchParams({ track_name: cleanTitle(name) || name });
  const who = String(artist || '').split(',')[0].trim();
  if (who) qs.set('artist_name', who);
  const get = async (base) => {
    const r = await fetchFn(`${base}?${qs}`, { signal: AbortSignal.timeout(timeout) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  let results;
  try { results = await get('https://lrclib.net/api/search'); } catch (e) { if (!proxy) throw e; results = await get(proxy); }
  return pickLyrics(Array.isArray(results) ? results : [], +duration || 0);
}
