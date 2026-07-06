'use client';

import { useEffect } from 'react';

export function AntiCopy() {
  useEffect(() => {
    const prevent = (e: Event) => {
      e.preventDefault();
    };

    const preventKey = (e: KeyboardEvent) => {
      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const ctrlShift = ctrl && e.shiftKey;

      if (key === 'F12') { e.preventDefault(); return; }
      if (ctrl && ['c', 'v', 'x', 'a', 'u', 'p', 's'].includes(key.toLowerCase())) { e.preventDefault(); return; }
      if (ctrlShift && ['i', 'j', 'c'].includes(key.toLowerCase())) { e.preventDefault(); return; }
    };

    const style = document.createElement('style');
    style.id = 'dds-anti-copy';
    style.textContent = `@media print{body{display:none!important}}*{user-select:none!important;-webkit-user-select:none!important;-moz-user-select:none!important}*::selection,*::-moz-selection{background:transparent!important}`;
    document.head.appendChild(style);

    const opts: AddEventListenerOptions = { capture: true };

    document.addEventListener('contextmenu', prevent, opts);
    document.addEventListener('keydown', preventKey, opts);
    document.addEventListener('copy', prevent, opts);
    document.addEventListener('cut', prevent, opts);
    document.addEventListener('paste', prevent, opts);
    document.addEventListener('dragstart', prevent, opts);

    return () => {
      document.removeEventListener('contextmenu', prevent, opts);
      document.removeEventListener('keydown', preventKey, opts);
      document.removeEventListener('copy', prevent, opts);
      document.removeEventListener('cut', prevent, opts);
      document.removeEventListener('paste', prevent, opts);
      document.removeEventListener('dragstart', prevent, opts);
      const s = document.getElementById('dds-anti-copy');
      if (s) s.remove();
    };
  }, []);

  return null;
}
