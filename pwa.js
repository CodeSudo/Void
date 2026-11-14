import { useEffect, useState } from 'react';

// Registers the service worker (production only, so dev hot-reload isn't cached) and hands it the files this page
// already loaded, so the app shell opens offline from the next visit on.
export function registerSW() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const go = () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(async (reg) => {
    await navigator.serviceWorker.ready;
    const urls = [...new Set(performance.getEntriesByType('resource').map((r) => r.name).filter((u) => u.startsWith(window.location.origin)))];
    (reg.active || navigator.serviceWorker.controller)?.postMessage({ type: 'CACHE_URLS', urls });
  }).catch(() => {});
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
}

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
}

// canInstall: the browser offered an install prompt. ios: Safari has no prompt, so we explain Add to Home Screen instead.
export function useInstall() {
  const [evt, setEvt] = useState(null);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const [installed, setInstalled] = useState(standalone);
  useEffect(() => {
    const on = (e) => { e.preventDefault(); setEvt(e); };
    const done = () => { setInstalled(true); setEvt(null); };
    window.addEventListener('beforeinstallprompt', on); window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', done); };
  }, []);
  return {
    canInstall: !!evt, installed, ios: /iphone|ipad|ipod/i.test(navigator.userAgent) && !installed,
    install: async () => { if (!evt) return; evt.prompt(); await evt.userChoice; setEvt(null); },
  };
}
