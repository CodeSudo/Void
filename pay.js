import { auth } from './firebase';

// Base URL of the payment server (the home-proxy project), e.g. https://your-project.vercel.app/api/pay
export const PAY_API = (import.meta.env.VITE_PAY_API || '').replace(/\/$/, '');

// GET without a body (plans); POST with a body sends the signed-in user's token so the server knows who is paying.
export async function payFetch(path, body) {
  const headers = {};
  if (body) { headers['Content-Type'] = 'application/json'; headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`; }
  let res;
  try { res = await fetch(`${PAY_API}${path}`, { method: body ? 'POST' : 'GET', headers, body: body && JSON.stringify(body), signal: AbortSignal.timeout(15000) }); }
  catch { throw Object.assign(new Error('Couldn’t reach the payment server. Check your connection and try again.'), { network: true }); }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || `The payment server answered HTTP ${res.status}.`), { status: res.status });
  return json;
}

export const loadRazorpay = () => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = resolve;
  s.onerror = () => reject(new Error('Couldn’t load the Razorpay checkout. Check your connection and try again.'));
  document.head.appendChild(s);
});

// Resolves with Razorpay's success response; rejects with { cancelled: true } if the window is closed first.
export const openCheckout = ({ order, email, onFail }) => new Promise((resolve, reject) => {
  const rz = new window.Razorpay({
    key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
    name: 'Void', description: `${order.plan.name}, ${order.plan.days} days`, prefill: { email }, theme: { color: '#ff5d8f' },
    handler: resolve,
    modal: { ondismiss: () => reject(Object.assign(new Error('cancelled'), { cancelled: true })) },
  });
  rz.on('payment.failed', (f) => onFail?.(f.error?.description || 'The payment failed. You can try again.'));
  rz.open();
});
