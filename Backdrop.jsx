import { useEffect, useRef, useState } from 'react';

// Atmospheric backdrop: a drifting particle field plus three thin "groove" rings.
// It tints itself with the current artwork colour and swells while music plays.
// It is purely decorative (aria-hidden) and is skipped for reduced-motion, Save-Data and no-WebGL,
// where the CSS glow behind it is all you see. It does not analyse audio: cross-origin streams
// can't be read safely without risking silent playback, so "energy" follows play/pause instead.

const rgb = (s) => s.split(' ').map((n) => +n / 255);

const VERT = `
uniform float uTime, uEnergy, uPx;
attribute float aSeed;
varying float vSeed;
void main() {
  vSeed = aSeed;
  vec3 p = position + normalize(position) * sin(uTime * .6 + aSeed * 20.) * (.12 + uEnergy * .25);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_PointSize = (3. + aSeed * 7.) * (1. + uEnergy * .7) * uPx / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform vec3 uColor;
varying float vSeed;
void main() {
  float a = smoothstep(.5, 0., length(gl_PointCoord - .5)) * (.25 + vSeed * .45);
  gl_FragColor = vec4(uColor, a);
}`;

export default function Backdrop({ color = '255 93 143', playing = false, focus = false }) {
  const host = useRef(null);
  const live = useRef({});
  live.current = { color, playing, focus };
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const el = host.current;
    if (reduced || navigator.connection?.saveData || !el) return undefined;
    let dead = false;
    let cleanup = () => {};

    import('three').then((THREE) => {
      if (dead) return;
      let renderer;
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' }); } catch { return; }
      let px = Math.min(window.devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(px); renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 50);
      const world = new THREE.Group(); scene.add(world);

      const count = window.innerWidth < 700 ? 1400 : 2800;
      const pos = new Float32Array(count * 3), seed = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const r = 2.5 + Math.random() * 7, t = Math.random() * Math.PI * 2, u = Math.acos(2 * Math.random() - 1);
        pos.set([r * Math.sin(u) * Math.cos(t), r * Math.sin(u) * Math.sin(t) * 0.7, r * Math.cos(u)], i * 3);
        seed[i] = Math.random();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      const tint = new THREE.Color(...rgb(live.current.color));
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uEnergy: { value: 0 }, uPx: { value: px * 6 }, uColor: { value: tint } },
      });
      world.add(new THREE.Points(geo, mat));

      const ringMat = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.22, depthWrite: false });
      const rings = [1.6, 2.4, 3.3].map((r) => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 6, 160), ringMat);
        m.rotation.x = 1.15; world.add(m); return m;
      });

      const size = () => {
        const w = el.clientWidth || 1, h = el.clientHeight || 1;
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      };
      size();
      const ro = new ResizeObserver(size); ro.observe(el);

      const ptr = { x: 0, y: 0 };
      const move = (e) => { ptr.x = e.clientX / window.innerWidth - 0.5; ptr.y = e.clientY / window.innerHeight - 0.5; };
      window.addEventListener('pointermove', move, { passive: true });

      const target = new THREE.Color();
      let energy = 0.2, zoom = 0, last = performance.now(), raf = 0, frames = 0, acc = 0, stage = 0, first = true, quit = false;
      const stop = () => cancelAnimationFrame(raf);
      const frame = (now) => {
        raf = requestAnimationFrame(frame);
        const dt = Math.min((now - last) / 1000, 0.1); last = now;
        const L = live.current, k = (s) => Math.min(dt * s, 1);
        energy += ((L.playing ? 1 : 0.2) - energy) * k(2);
        zoom += ((L.focus ? 1 : 0) - zoom) * k(2.5);
        target.setRGB(...rgb(L.color)); tint.lerp(target, k(1.5)); ringMat.color.copy(tint);
        const t = (mat.uniforms.uTime.value += dt);
        mat.uniforms.uEnergy.value = energy;
        world.rotation.y += dt * (0.03 + energy * 0.05);
        rings.forEach((m, i) => { m.scale.setScalar(1 + zoom * 0.35 + Math.sin(t * 1.4 + i * 1.3) * 0.025 * energy); m.rotation.z += dt * 0.05 * (i + 1); });
        camera.position.x += (ptr.x * 1.2 - camera.position.x) * k(2);
        camera.position.y += (-ptr.y * 0.8 - camera.position.y) * k(2);
        camera.position.z = 6 - zoom * 0.8;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        if (first) { first = false; setReady(true); }
        // Adaptive quality: if the first few seconds run slowly, drop particles, then resolution, then give up.
        if (++frames <= 270) {
          acc += dt;
          if (frames % 90 === 0) {
            const avg = acc / 90; acc = 0;
            if (avg > 0.034 && stage === 0) { stage = 1; geo.setDrawRange(0, count >> 1); }
            else if (avg > 0.034 && stage === 1) { stage = 2; px = 1; renderer.setPixelRatio(1); mat.uniforms.uPx.value = 6; size(); }
            else if (avg > 0.045 && stage === 2) { quit = true; stop(); setReady(false); }
          }
        }
      };
      const vis = () => {
        stop();
        if (!document.hidden && !quit) { last = performance.now(); raf = requestAnimationFrame(frame); }
      };
      const lost = (e) => { e.preventDefault(); quit = true; stop(); setReady(false); };
      document.addEventListener('visibilitychange', vis);
      renderer.domElement.addEventListener('webglcontextlost', lost);
      camera.position.z = 6;
      raf = requestAnimationFrame(frame);

      cleanup = () => {
        stop(); ro.disconnect();
        window.removeEventListener('pointermove', move); document.removeEventListener('visibilitychange', vis);
        renderer.domElement.removeEventListener('webglcontextlost', lost);
        geo.dispose(); mat.dispose(); ringMat.dispose(); rings.forEach((m) => m.geometry.dispose());
        renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => { /* three failed to load: the CSS glow stays */ });

    return () => { dead = true; cleanup(); setReady(false); };
  }, [reduced]);

  return <div ref={host} className={`backdrop${ready ? ' on' : ''}`} aria-hidden="true" />;
}
