import crypto from 'crypto';

export function hashDevice(ip, userAgent) {
  return crypto.createHash('sha256').update(`${ip}|${userAgent}`).digest('hex').slice(0, 32);
}

export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function parseDeviceLabel(userAgent = '') {
  const ua = userAgent.toLowerCase();
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return `${browser} on ${os}`;
}
