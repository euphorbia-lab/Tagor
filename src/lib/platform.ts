// Detects whether the site is running inside the Tagor Android app (a
// Trusted Web Activity). Detection itself happens once, in BaseLayout's
// inline <head> script — Android only sets document.referrer to
// android-app://... on the TWA's cold-start navigation, never on later
// in-app page loads (this app has no client router, so every navigation is
// a full page load). This module only reads the result that script already
// cached in sessionStorage / stamped onto <html data-native>.

const NATIVE_FLAG_KEY = 'tagor-native';

/**
 * True only inside the Tagor Android app. Fails closed (false) if called
 * before the inline detection script ran or if storage is blocked, so a
 * detection failure can never leak native-only behavior onto the web.
 */
export function isNativeApp(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    if (sessionStorage.getItem(NATIVE_FLAG_KEY) === '1') return true;
  } catch {
    /* sessionStorage blocked — fall through to the DOM attribute */
  }
  return document.documentElement.getAttribute('data-native') === 'true';
}
