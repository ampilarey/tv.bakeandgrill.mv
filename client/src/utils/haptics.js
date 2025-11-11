/**
 * Haptic feedback utilities for mobile devices
 */

/**
 * Trigger vibration on supported devices
 * @param {number|Array} pattern - Vibration pattern in milliseconds
 */
export function vibrate(pattern = 10) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Light tap feedback
 */
export function lightTap() {
  vibrate(10);
}

/**
 * Medium tap feedback  
 */
export function mediumTap() {
  vibrate(20);
}

/**
 * Success feedback
 */
export function successFeedback() {
  vibrate([10, 50, 10]);
}

/**
 * Error feedback
 */
export function errorFeedback() {
  vibrate([50, 50, 50]);
}

/**
 * Selection feedback
 */
export function selectionFeedback() {
  vibrate(5);
}

