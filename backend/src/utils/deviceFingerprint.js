// src/utils/deviceFingerprint.js
// Creates a stable device hash from IP + User-Agent.
// Used to detect new/unknown devices on login.

import crypto from 'crypto';

/**
 * Build a SHA-256 hash from IP + User-Agent.
 * Stable across requests from the same browser/IP.
 */
export function hashDevice(ip, userAgent) {
  const raw = `${(ip || '').trim()}::${(userAgent || '').trim()}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Generate a cryptographically secure random token for email verification links.
 */
export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Parse a human-readable device label from the User-Agent string.
 * Returns something like "Chrome on Windows" or "Safari on iPhone".
 */
export function parseDeviceLabel(userAgent = '') {
  const ua = userAgent;

  // Browser
  let browser = 'Unknown Browser';
  if (ua.includes('Edg/') || ua.includes('EdgA/'))      browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';
  else if (ua.includes('Firefox/'))                      browser = 'Firefox';
  else if (ua.includes('SamsungBrowser/'))               browser = 'Samsung Browser';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/'))   browser = 'Safari';
  else if (ua.includes('MSIE') || ua.includes('Trident/'))      browser = 'Internet Explorer';
  else if (ua.includes('curl/'))  browser = 'curl';
  else if (ua.includes('axios/') || ua.includes('python') || ua.includes('node')) browser = 'API Client';

  // OS / platform
  let os = 'Unknown Device';
  if (ua.includes('iPhone'))           os = 'iPhone';
  else if (ua.includes('iPad'))        os = 'iPad';
  else if (ua.includes('Android'))     os = 'Android';
  else if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Macintosh'))  os = 'macOS';
  else if (ua.includes('Linux'))      os = 'Linux';
  else if (ua.includes('CrOS'))       os = 'ChromeOS';

  return `${browser} on ${os}`;
}
