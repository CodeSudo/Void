import { useEffect, useId, useRef, useState } from 'react';
import Backdrop from './Backdrop';
import { Ic } from './icons';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERKS = [
  'One search across JioSaavn, Apple Music, SoundCloud, Qobuz and YouTube.',
  'Likes, playlists and history stay with your account on every device.',
  'Synced lyrics, crossfade, an equalizer and a sleep timer built into the player.',
];

// mode: 'login' | 'signup' | 'reset'.
// onSubmit(mode, email, password) and onReset(email) resolve to an error message, or null on success.
export function AuthScreen({ mode, setMode, onSubmit, onReset, color, notice }) {
  const uid = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [touched, setTouched] = useState({});
  const emailRef = useRef(null);
  const passRef = useRef(null);
  const login = mode === 'login';
  const reset = mode === 'reset';

  const emailErr = !email.trim() ? 'Enter your email address.' : !EMAIL.test(email.trim()) ? 'That doesn’t look like a valid email address.' : '';
  const passErr = !password ? 'Enter your password.' : !login && password.length < 6 ? 'Use at least 6 characters.' : '';

  useEffect(() => {
    setError(''); setTouched({}); setSent(false);
    if (window.matchMedia('(pointer: fine)').matches) emailRef.current?.focus();
  }, [mode]);

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: !reset });
    if (emailErr) return emailRef.current.focus();
    if (!reset && passErr) return passRef.current.focus();
    setBusy(true); setError('');
    if (reset) {
      const err = await onReset(email.trim());
      setBusy(false);
      if (err) setError(err); else setSent(true);
      return;
    }
    const err = await onSubmit(mode, email.trim(), password);
    if (err) { setError(err); setBusy(false); }
  };

  const showEmailErr = touched.email && emailErr;
  const showPassErr = touched.password && passErr;

  return (
    <div className="auth">
      <Backdrop color={color} playing />
      <section className="auth-brand">
        <div className="mark" role="img" aria-label="Void">void</div>
        <p className="auth-tag">Every source. One queue.</p>
        <ul className="perks">
          {PERKS.map((p, i) => <li key={p} style={{ '--i': i }}><Ic.check s={16} />{p}</li>)}
        </ul>
      </section>

      <main className="auth-card" id="main">
        {notice && <p className="auth-notice" role="status"><Ic.share s={16} />{notice}</p>}
        {reset ? (
          <button type="button" className="back" onClick={() => setMode('login')}><Ic.back s={18} />Back to log in</button>
        ) : (
          <div className="seg auth-seg" role="group" aria-label="Account">
            <button type="button" aria-pressed={login} className={login ? 'on' : ''} onClick={() => setMode('login')}>Log in</button>
            <button type="button" aria-pressed={!login} className={!login ? 'on' : ''} onClick={() => setMode('signup')}>Sign up</button>
          </div>
        )}

        {reset && sent ? (
          <div className="sent-card" key="sent" role="status">
            <div className="sent-ic" aria-hidden="true"><Ic.check s={26} /></div>
            <h1>Check your inbox</h1>
            <p className="sub">If an account exists for <b>{email.trim()}</b>, a link to choose a new password is on its way. It can take a few minutes, so check your spam folder too.</p>
            <div className="acts">
              <button className="btn pri" onClick={() => setMode('login')}>Back to log in</button>
              <button className="btn" onClick={() => setSent(false)}>Use a different email</button>
            </div>
          </div>
        ) : (
          <form key={mode} noValidate onSubmit={submit} aria-labelledby={`${uid}-h`}>
            <div>
              <h1 id={`${uid}-h`}>{reset ? 'Reset your password' : login ? 'Welcome back' : 'Create your account'}</h1>
              <p className="sub">{reset ? 'Enter your email and we’ll send you a link to choose a new password.' : login ? 'Log in to pick up your library.' : 'Save likes and playlists across every device.'}</p>
            </div>

            <div className="field">
              <label htmlFor={`${uid}-e`}>Email</label>
              <div className="input" data-invalid={!!showEmailErr}>
                <input id={`${uid}-e`} ref={emailRef} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
                  value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  aria-invalid={!!showEmailErr} aria-describedby={showEmailErr ? `${uid}-ee` : undefined} />
              </div>
              {showEmailErr && <p className="field-err" id={`${uid}-ee`}>{emailErr}</p>}
            </div>

            {!reset && (
              <div className="field">
                <div className="label-row">
                  <label htmlFor={`${uid}-p`}>Password</label>
                  {login && <button type="button" className="link-btn small" onClick={() => setMode('reset')}>Forgot password?</button>}
                </div>
                <div className="input" data-invalid={!!showPassErr}>
                  <input id={`${uid}-p`} ref={passRef} type={show ? 'text' : 'password'} autoComplete={login ? 'current-password' : 'new-password'}
                    value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    aria-invalid={!!showPassErr} aria-describedby={showPassErr ? `${uid}-pe` : !login ? `${uid}-ph` : undefined} />
                  <button type="button" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((v) => !v)}>
                    {show ? <Ic.eyeOff s={19} /> : <Ic.eye s={19} />}
                  </button>
                </div>
                {showPassErr ? <p className="field-err" id={`${uid}-pe`}>{passErr}</p>
                  : !login && <p className="hint" id={`${uid}-ph`}>At least 6 characters.</p>}
              </div>
            )}

            <p className="form-err" role="alert">{error}</p>

            <button className="btn pri wide" type="submit" disabled={busy} aria-busy={busy}>
              {busy && <span className="spin" aria-hidden="true" />}
              {busy ? (reset ? 'Sending…' : login ? 'Logging in…' : 'Creating account…') : (reset ? 'Send reset link' : login ? 'Log in' : 'Create account')}
            </button>

            {!reset && (
              <p className="swap">
                {login ? 'New to Void?' : 'Already have an account?'}{' '}
                <button type="button" className="link-btn" onClick={() => setMode(login ? 'signup' : 'login')}>{login ? 'Create an account' : 'Log in'}</button>
              </p>
            )}
          </form>
        )}
      </main>
    </div>
  );
}

// Shown after the user confirms "Sign out" (see doSignOut in App.jsx).
export function SignedOutScreen({ onLogin, onSignup, color }) {
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return (
    <div className="auth out">
      <Backdrop color={color} />
      <main className="out-card" id="main">
        <div className="out-ic" aria-hidden="true"><i /></div>
        <h1 ref={heading} tabIndex={-1}>You’re signed out</h1>
        <p className="sub">Playback has stopped and this device is signed out. Your likes, playlists and history are saved to your account and will be here when you log back in.</p>
        <div className="acts">
          <button className="btn pri" onClick={onLogin}>Log back in</button>
          <button className="btn" onClick={onSignup}>Create a new account</button>
        </div>
      </main>
    </div>
  );
}
