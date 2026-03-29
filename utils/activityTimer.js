// utils/activityTimer.js
// Auto-signs out the user after 15 minutes of inactivity.
// Tracks: mousemove, keydown, click, scroll, touchstart.
// Call startActivityTimer() once on app mount (in _app.js).
// Call clearActivityTimer() on manual logout.

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_MS = 2 * 60 * 1000;  // warn 2 min before logout

let timer = null;
let warnTimer = null;
let onWarnCallback = null;
let onLogoutCallback = null;

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

function reset() {
  clearTimeout(timer);
  clearTimeout(warnTimer);

  // Dismiss any warning
  if (onWarnCallback) onWarnCallback(false);

  warnTimer = setTimeout(() => {
    if (onWarnCallback) onWarnCallback(true);
  }, TIMEOUT_MS - WARNING_MS);

  timer = setTimeout(() => {
    if (onLogoutCallback) onLogoutCallback();
  }, TIMEOUT_MS);
}

export function startActivityTimer({ onWarn, onLogout }) {
  if (typeof window === 'undefined') return;

  onWarnCallback = onWarn;
  onLogoutCallback = onLogout;

  EVENTS.forEach(ev => window.addEventListener(ev, reset, { passive: true }));
  reset(); // start the clock
}

export function clearActivityTimer() {
  clearTimeout(timer);
  clearTimeout(warnTimer);
  if (typeof window !== 'undefined') {
    EVENTS.forEach(ev => window.removeEventListener(ev, reset));
  }
  onWarnCallback = null;
  onLogoutCallback = null;
}
