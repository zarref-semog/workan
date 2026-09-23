import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Render outside scroll containers so modal overflow cannot clip the menu.
export function FloatingPanel({ anchorRef, onClose, width, maxHeight = 320, children, ...props }) {
  const panel = useRef(null);
  const [position, setPosition] = useState({ visibility: 'hidden' });
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft || 0;
      const top = viewport?.offsetTop || 0;
      const viewportWidth = viewport?.width || window.innerWidth;
      const viewportHeight = viewport?.height || window.innerHeight;
      const menuWidth = Math.min(width || rect.width, viewportWidth - 16);
      const below = Math.max(0, top + viewportHeight - rect.bottom - 14);
      const above = Math.max(0, rect.top - top - 14);
      const desiredHeight = Math.min(panel.current?.scrollHeight || maxHeight, maxHeight);
      const up = below < desiredHeight && above > below;
      const height = Math.min(maxHeight, up ? above : below);
      setPosition({
        position: 'fixed', zIndex: 2147483646, visibility: 'visible',
        left: Math.max(left + 8, Math.min(rect.left, left + viewportWidth - menuWidth - 8)),
        top: up ? rect.top - 6 - Math.min(desiredHeight, height) : rect.bottom + 6,
        right: 'auto', width: menuWidth, maxWidth: 'none', maxHeight: height,
        overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box',
      });
    };
    const outside = (event) => {
      if (!anchor.contains(event.target) && !panel.current?.contains(event.target)) onClose();
    };
    const escape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
      anchor.focus();
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(anchor);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape, true);
    };
  }, [anchorRef, onClose, width, maxHeight]);
  return createPortal(<div {...props} ref={panel} data-floating-panel="true" style={position}
    onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>{children}</div>, document.body);
}
