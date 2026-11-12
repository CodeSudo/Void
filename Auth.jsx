import { useEffect, useId, useRef, useState } from 'react';
import Backdrop from './Backdrop';
import { Ic } from './icons';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERKS = [
  'One search across JioSaavn, Apple Music, SoundCloud, Qobuz and YouTube.',
  'Likes, playlists and history stay with your account on every device.',
  'Lyrics, playback speed and a sleep timer built into the player.',
];

// Log in / sign up. `onSubmit(mode, email, password)` resolves to an error message, or null on success
// (the parent then swaps the view, so this component simply unmounts).
export function AuthScreen({ mode, setMode, onSubmit, color }) {
  const uid = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});
  const emailRef = useRef(null);
  const passRef = useRef(null);
  const login = mode === 'login';

  const emailErr = !email.trim() ? 'Enter your email address.' : !EMAIL.test(email.trim()) ? 'That doesn’t look like a valid email address.' : '';
  const passErr = !password ? 'Enter your password.' : !login && password.length < 6 ? 'Use at least 6 characters.' : '';

  useEffect(() => {
    setError(''); setTouched({});
    if (window.matchMedia('(pointer: fine)').matches) emailRef.current?.focus();
  }, [mode]);

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (emailErr) return emailRef.current.focus();
    if (passErr) return passRef.current.focus();
    setBusy(true); setError('');
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
        <div className="seg auth-seg" role="group" aria-label="Account">
          <button type="button" aria-pressed={login} className={login ? 'on' : ''} onClick={() => setMode('login')}>Log in</button>
          <button type="button" aria-pressed={!login} className={!login ? 'on' : ''} onClick={() => setMode('signup')}>Sign up</button>
        </div>

        <form key={mode} noValidate onSubmit={submit} aria-labelledby={`${uid}-h`}>
          <div>
            <h1 id={`${uid}-h`}>{login ? 'Welcome back' : 'Create your account'}</h1>
            <p className="sub">{login ? 'Log in to pick up your library.' : 'Save likes and playlists across every device.'}</p>
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

          <div className="field">
            <label htmlFor={`${uid}-p`}>Password</label>
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

          <p className="form-err" role="alert">{error}</p>

          <button className="btn pri wide" type="submit" disabled={busy} aria-busy={busy}>
            {busy && <span className="spin" aria-hidden="true" />}
            {busy ? (login ? 'Logging in…' : 'Creating account…') : (login ? 'Log in' : 'Create account')}
          </button>

          <p className="swap">
            {login ? 'New to Void?' : 'Already have an account?'}{' '}
            <button type="button" className="link-btn" onClick={() => setMode(login ? 'signup' : 'login')}>{login ? 'Create an account' : 'Log in'}</button>
          </p>
        </form>
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
