import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

// Dialog shell: moves focus in (to [data-autofocus] or the first control), keeps Tab inside,
// closes on Escape or a click on the scrim, and hands focus back to whatever opened it.
export default function Modal({ titleId, onClose, as: Tag = 'div', children, ...rest }) {
  const box = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    (box.current?.querySelector('[data-autofocus]') || box.current?.querySelector(FOCUSABLE))?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close.current(); return; }
      if (e.key !== 'Tab') return;
      const items = [...box.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.(); };
  }, []);

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && close.current()}>
      <Tag ref={box} className="modal-box" role="dialog" aria-modal="true" aria-labelledby={titleId} {...rest}>{children}</Tag>
    </div>
  );
}
