// Deploy as its own small Vercel project (this file at api/home.js), then set VITE_HOME_API to https://<project>.vercel.app/api/home
// JioSaavn's home feed has no CORS headers, so the browser can't call it directly. This function fetches it server-side.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const langs = String(req.query.languages || 'hindi,english');
  try {
    const upstream = await fetch('https://www.jiosaavn.com/api.php?__call=webapi.getLaunchData&api_version=4&_format=json&_marker=0&ctx=web6dot0', {
      headers: { Cookie: `L=${encodeURIComponent(langs)}`, 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(upstream.status).send(await upstream.text());
  } catch {
    res.status(502).json({ error: 'Could not reach JioSaavn' });
  }
}
