import { Ic } from './icons';

const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const fmtDate = (ms) => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// state: 'idle' | 'loading' | 'ready' | 'error' | 'off' (no payment server configured)
// history: { status: 'loading' | 'ready' | 'error', items: [{ id, plan, amount, at }] }
export default function Plans({ state, plans, error, plan, member, busy, onBuy, onRetry, history, onRetryHistory, reminder }) {
  const daysLeft = member ? Math.max(1, Math.ceil((plan.expiresAt - Date.now()) / 86400000)) : 0;
  return (
    <>
      <h1 className="h1">Plans</h1>
      <p className="sub plans-lead">Pay once for a pass. It never renews on its own. Prices are in Indian rupees.</p>

      {reminder}
      {member && (
        <div className="member-banner" role="status">
          <Ic.star s={20} fill />
          <p><b>{cap(plan.id)} is active.</b> It runs until {fmtDate(plan.expiresAt)} ({daysLeft} {daysLeft === 1 ? 'day' : 'days'} left). Buying again adds to the time you have left.</p>
        </div>
      )}

      {(state === 'idle' || state === 'loading') && <div className="plans-grid" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="plan-card sk" style={{ height: 330 }} />)}</div>}
      {state === 'off' && <p className="empty">Payments aren’t available right now.{import.meta.env.DEV && ' (VITE_PAY_API isn’t set.)'}</p>}
      {state === 'error' && (
        <div className="notice" role="alert"><p><b>We couldn’t load the plans.</b> {error}</p><button className="btn" onClick={onRetry}>Try again</button></div>
      )}
      {state === 'ready' && (
        <div className="plans-grid">
          {plans.map((p) => (
            <section key={p.id} className={`plan-card${p.badge ? ' best' : ''}`} aria-labelledby={`plan-${p.id}`}>
              {p.badge && <span className="tag">{p.badge}</span>}
              <h2 id={`plan-${p.id}`}>{p.name}</h2>
              <div>
                <p className="price">₹{p.price}<small> for {p.days} days</small></p>
                <p className="sub">About ₹{(p.price / p.days).toFixed(2)} a day</p>
              </div>
              <ul className="plan-perks">{p.perks.map((x) => <li key={x}><Ic.check s={16} />{x}</li>)}</ul>
              <button className={`btn wide${p.badge ? ' pri' : ''}`} disabled={!!busy} aria-busy={busy === p.id} onClick={() => onBuy(p.id)}>
                {busy === p.id ? <><span className="spin" aria-hidden="true" />Opening checkout…</> : member ? `Add ${p.days} days` : `Get ${p.name}`}
              </button>
            </section>
          ))}
        </div>
      )}
      <p className="plans-foot sub">Payments are handled by Razorpay (UPI, cards, netbanking and wallets). Void never sees your card or UPI details.</p>

      <section className="billing" aria-labelledby="billing-h">
        <h2 id="billing-h">Billing history</h2>
        {history.status === 'loading' && <p className="sub" aria-busy="true">Loading your payments…</p>}
        {history.status === 'error' && (
          <div className="notice" role="alert"><p><b>We couldn’t load your payments.</b> Check your connection and try again.</p><button className="btn" onClick={onRetryHistory}>Try again</button></div>
        )}
        {history.status === 'ready' && !history.items.length && <p className="sub">No payments yet. Your receipts will show up here after your first purchase.</p>}
        {history.status === 'ready' && history.items.length > 0 && (
          <div className="table-wrap">
            <table>
              <caption className="sr">Your payments, newest first</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Plan</th><th scope="col">Amount</th><th scope="col">Payment ID</th></tr></thead>
              <tbody>{history.items.map((p) => (
                <tr key={p.id}><td>{fmtDate(p.at)}</td><td>{cap(p.plan)}</td><td>{rupees(p.amount)}</td><td className="mono">{p.id}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
