import { useEffect, useRef, useState } from 'react';
import { IconFullscreen } from './icons.jsx';

// Floating control for the TV display. Toggles browser fullscreen and fades out
// after a few idle seconds so it does not clutter the screen, reappearing on any
// pointer movement.
export default function FullscreenButton() {
  const [isFull, setIsFull] = useState(false);
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef(null);

  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const reveal = () => {
      setVisible(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 3000);
    };
    reveal();
    window.addEventListener('mousemove', reveal);
    return () => {
      window.removeEventListener('mousemove', reveal);
      clearTimeout(hideTimer.current);
    };
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur transition-opacity hover:bg-white/20 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <IconFullscreen className="h-4 w-4" />
      {isFull ? 'Exit fullscreen' : 'Fullscreen'}
    </button>
  );
}
