import { useRef, useCallback } from "react";

export function usePullToRefresh(onRefresh) {
  const startY = useRef(null);
  const pulling = useRef(false);

  const onTouchStart = useCallback((e) => {
    // Only trigger if scrolled to top
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const onTouchEnd = useCallback(async (e) => {
    if (!pulling.current || startY.current === null) return;
    const dy = e.changedTouches[0].clientY - startY.current;
    pulling.current = false;
    startY.current = null;
    if (dy > 70) {
      await onRefresh();
    }
  }, [onRefresh]);

  return { onTouchStart, onTouchEnd };
}