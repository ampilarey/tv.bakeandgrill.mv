/** Routes that run 24/7 on TVs — must never auto-reload for SW/cache updates. */
export function isTvKioskPath(pathname = window.location.pathname) {
  return pathname.startsWith('/display') || pathname.startsWith('/pair');
}
