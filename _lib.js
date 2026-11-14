// Shared helpers for the payment endpoints. Files starting with "_" are not deployed as routes.
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// The server is the only source of truth for price and length. The app reads this list from /api/pay/plans.
const PERKS = ['No ads', 'All four accent colors', 'Playback speed control', 'Sleep timer', 'Crossfade between tracks', 'Five-band equalizer'];
const PLANS = {
  starter: { id: 'starter', name: 'Starter', price: 10, days: 7, perks: PERKS },
  plus: { id: 'plus', name: 'Plus', price: 25, days: 30, perks: PERKS },
  premium: { id: 'premium', name: 'Premium', price: 50, days: 90, perks: PERKS, badge: 'Best value' },
};

const httpError = (status, message) => Object.assign(new Error(message), { status });

function needConfig() {
  const missing = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'FIREBASE_SERVICE_ACCOUNT'].filter((k) => !process.env[k]);
  if (missing.length) throw httpError(503, `Payments aren’t configured on the server (missing ${missing.join(', ')}).`);
}

function admin() {
  if (!getApps().length) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    initializeApp({ credential: cert(sa) });
  }
  return { auth: getAuth(), db: getFirestore() };
}

async function requireUser(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) throw httpError(401, 'Please sign in again.');
  try { return await admin().auth.verifyIdToken(m[1]); } catch { throw httpError(401, 'Your session expired. Please sign in again.'); }
}

async function razorpay(path, method = 'GET', body) {
  const basic = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const r = await fetch(`https://api.razorpay.com/v1${path}`, { method, headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw httpError(502, j.error?.description || `Razorpay answered HTTP ${r.status}.`);
  return j;
}


// Confirms an order with Razorpay itself, then grants (or extends) the plan in Firestore. Safe to run repeatedly:
// each payment id is applied once. With `uid` (the app asking) a mismatch is an error; without it (the webhook) an
// order that isn't one of ours is simply ignored and null is returned.
async function settleOrder(orderId, uid) {
  const order = await razorpay(`/orders/${orderId}`);
  const plan = PLANS[order.notes?.plan];
  const owner = order.notes?.uid;
  const ours = !!owner && !!plan && order.amount === plan.price * 100 && (!uid || owner === uid);
  if (!ours) { if (uid) throw httpError(403, 'This order doesn’t belong to your account.'); return null; }

  const { items = [] } = await razorpay(`/orders/${orderId}/payments`);
  let pay = items.find((p) => p.status === 'captured') || items.find((p) => p.status === 'authorized');
  if (!pay) throw httpError(402, 'We haven’t received this payment yet.');
  if (pay.status === 'authorized') pay = await razorpay(`/payments/${pay.id}/capture`, 'POST', { amount: pay.amount, currency: 'INR' });
  if (pay.status !== 'captured' || pay.amount !== order.amount || pay.currency !== 'INR') throw httpError(402, 'The payment wasn’t completed.');

  const { db } = admin();
  const userRef = db.doc(`users/${owner}`);
  const granted = await db.runTransaction(async (tx) => {
    const payRef = db.doc(`payments/${pay.id}`);
    const [payDoc, userDoc] = await Promise.all([tx.get(payRef), tx.get(userRef)]);
    if (payDoc.exists) return userDoc.data()?.plan || null; // already applied
    const now = Date.now();
    const start = Math.max(now, userDoc.data()?.plan?.expiresAt || 0); // buying again extends what's left
    const next = { id: plan.id, expiresAt: start + plan.days * 86400000, updatedAt: now };
    tx.set(payRef, { uid: owner, plan: plan.id, orderId, amount: pay.amount, at: now });
    tx.set(userRef, { plan: next }, { merge: true });
    return next;
  });
  return { plan: granted, uid: owner };
}

// Wraps a handler with CORS, method checks and uniform JSON errors.
const route = (methods, fn) => async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!methods.includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  try { await fn(req, res); } catch (e) {
    if (!e.status) console.error(e);
    res.status(e.status || 500).json({ error: e.status ? e.message : 'Something went wrong on the server.' });
  }
};

module.exports = { PLANS, httpError, needConfig, admin, requireUser, razorpay, settleOrder, route };
