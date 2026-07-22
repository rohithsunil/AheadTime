// Lightweight haptic feedback — Android only (navigator.vibrate).
// iOS Safari/PWA does NOT support the Vibration API, and audio-based
// fallbacks produce audible clicks (annoying). So we silently no-op on iOS.
export function haptic(ms = 10) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  } catch {
    // ignore — haptics are non-critical
  }
}