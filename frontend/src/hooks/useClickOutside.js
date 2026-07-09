import { useEffect } from 'react';

export default function useClickOutside(ref, onOutsideClick, active = true) {
  useEffect(() => {
    if (!active) return;
    function handler(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onOutsideClick(event);
      }
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [ref, onOutsideClick, active]);
}
