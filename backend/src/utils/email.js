// email.js — Resend API, RFC-compliant, anti-spam optimised
import logger from './logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL || 'RingSlot <noreply@ringslot.shop>';
const REPLY_TO       = process.env.SUPPORT_EMAIL     || 'support@ringslot.shop';
const SITE_URL       = process.env.FRONTEND_URL      || 'https://ringslot.shop';
const BACKEND_URL    = process.env.BACKEND_URL        || 'https://ringslot-backend.onrender.com';

export async function sendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) { logger.warn('[email] RESEND_API_KEY not set'); return { ok: false }; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM_EMAIL, to: Array.isArray(to) ? to : [to],
        reply_to: REPLY_TO, subject, html,
        text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        headers: {
          'List-Unsubscribe': `<mailto:${REPLY_TO}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Entity-Ref-ID': `rs-${Date.now()}`,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) { logger.error('[email] Resend error', { status: res.status, msg: data.message }); return { ok: false, error: data.message }; }
    logger.info('[email] Sent', { id: data.id, to, subject });
    return { ok: true, id: data.id };
  } catch (err) { logger.error('[email] fetch error', { error: err.message }); return { ok: false, error: err.message }; }
}

// Shared HTML wrapper
function wrap(preheader, body) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>RingSlot</title>
<style>body{margin:0;padding:0;background:#f0ede8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif}
a{color:#00ff88}
.card{background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
.header{background:linear-gradient(135deg,#1a1a1a,#111);padding:24px 36px;border-bottom:3px solid #00ff88}
.body{padding:36px}
.h1{font-size:22px;font-weight:700;color:#1a1714;margin:0 0 12px;line-height:1.3}
.p{font-size:15px;color:#4a4540;line-height:1.75;margin:0 0 18px}
.btn{display:inline-block;background:#00ff88;color:#000000;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;margin:18px 0}
.info{background:#f7f5f2;border-radius:8px;padding:10px 16px;margin:6px 0;font-size:13px}
.otp{background:#f0fdf4;border:2px dashed #00cc6a;border-radius:12px;padding:28px;text-align:center;margin:20px 0}
.otp-code{font-family:'Courier New',monospace;font-size:44px;font-weight:700;color:#008844;letter-spacing:10px;line-height:1}
.warn{font-size:13px;color:#7a6040;padding:10px 14px;background:#fdf8ee;border-left:3px solid #e8a020;border-radius:0 8px 8px 0;margin-top:16px}
.danger{font-size:13px;color:#7a2020;padding:10px 14px;background:#fff5f5;border-left:3px solid #e53935;border-radius:0 8px 8px 0;margin-top:8px}
.footer{background:#f7f5f2;padding:18px 36px;border-top:1px solid #e8e4df;text-align:center;font-size:12px;color:#8c8680}
.preheader{display:none;max-height:0;overflow:hidden}</style>
</head><body>
<div class="preheader">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede8;padding:28px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td align="center" style="padding-bottom:18px">
  <span style="font-size:22px;font-weight:800;color:#1a1714;letter-spacing:-0.04em">⬛ RingSlot</span>
</td></tr>
<tr><td class="card">
  <div class="header">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="width:36px;height:36px;background:#00ff88;border-radius:9px;text-align:center;vertical-align:middle;font-size:18px;font-weight:900;color:#000;font-family:monospace">RS</td>
      <td style="padding-left:12px;vertical-align:middle"><span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.04em">RingSlot</span></td>
    </tr></table>
  </div>
  <div class="body">${body}</div>
  <div class="footer">
    <a href="${SITE_URL}/dashboard" style="color:#00ff88;text-decoration:none">Dashboard</a> &middot;
    <a href="${SITE_URL}/support" style="color:#00ff88;text-decoration:none">Support</a> &middot;
    <a href="mailto:${REPLY_TO}" style="color:#00ff88;text-decoration:none">${REPLY_TO}</a>
    <br/><span style="color:#b5b0aa">&copy; 2026 RingSlot &middot; ringslot.shop</span><br/>
    <a href="mailto:${REPLY_TO}?subject=unsubscribe" style="color:#a8a3a0;font-size:11px">Unsubscribe</a>
  </div>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ── 1. Welcome ────────────────────────────────────────────────
export async function sendWelcomeEmail({ to }) {
  const subject   = 'Welcome to RingSlot — your account is ready';
  const preheader = 'Get your first virtual phone number in 60 seconds.';
  const body = `
    <h1 class="h1">Welcome to RingSlot! 🎉</h1>
    <p class="p">Your account is active. Get your first virtual number in 3 steps:</p>
    <div class="info"><strong>1.</strong> Deposit crypto — USDT, BTC, ETH (min $20)</div>
    <div class="info"><strong>2.</strong> Pick a service — Telegram, Google, WhatsApp and 1,000+ more</div>
    <div class="info"><strong>3.</strong> Get your OTP — arrives in seconds. Full refund if it doesn't</div>
    <a href="${SITE_URL}/dashboard" class="btn">Go to My Dashboard →</a>
    <p class="p" style="font-size:14px;color:#8c8680">Questions? Reply to this email or visit our <a href="${SITE_URL}/support">support page</a>.</p>`;
  const text = `Welcome to RingSlot!\n\nYour account is ready.\n\n1. Deposit crypto (USDT, BTC, ETH - min $20)\n2. Pick a service (Telegram, Google, WhatsApp...)\n3. Get your OTP in seconds\n\nDashboard: ${SITE_URL}/dashboard\nSupport: ${SITE_URL}/support`;
  return sendEmail({ to, subject, html: wrap(preheader, body), text });
}

// ── 2. Login verification (new device) ───────────────────────
export async function sendLoginVerificationEmail({ to, token, deviceLabel, ip, isFirstLogin }) {
  const verifyUrl = `${BACKEND_URL}/api/auth/verify-device/${token}`;
  const subject   = isFirstLogin ? 'Confirm your RingSlot sign-in' : `New sign-in to RingSlot from ${deviceLabel}`;
  const preheader = isFirstLogin ? 'Click to confirm your first sign-in. Expires in 15 minutes.' : `New device detected: ${deviceLabel}. Was that you?`;
  const timeStr   = new Date().toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short' });
  const body = `
    <h1 class="h1">${isFirstLogin ? 'Confirm your sign-in' : 'New device sign-in'}</h1>
    <p class="p">${isFirstLogin
      ? 'Welcome! We detected your first sign-in to RingSlot. Please confirm it was you.'
      : 'A sign-in to your RingSlot account was attempted from a new device. If this was you, click confirm below.'
    }</p>
    <div class="info"><span style="color:#8c8680;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Device</span>&nbsp;&nbsp;<strong>${deviceLabel}</strong></div>
    <div class="info"><span style="color:#8c8680;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em">IP Address</span>&nbsp;&nbsp;<strong>${ip || 'Unknown'}</strong></div>
    <div class="info"><span style="color:#8c8680;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Time</span>&nbsp;&nbsp;<strong>${timeStr}</strong></div>
    <a href="${verifyUrl}" class="btn">Confirm this sign-in →</a>
    <div class="warn">⏱ <strong>This link expires in 15 minutes.</strong> If you did not attempt to sign in, <a href="${SITE_URL}/support">contact support</a> immediately and change your password.</div>
    ${!isFirstLogin ? `<div class="danger">🔒 <strong>Not you?</strong> <a href="${SITE_URL}/auth/forgot-password">Reset your password immediately</a>.</div>` : ''}`;
  const text = `${subject}\n\nDevice: ${deviceLabel}\nIP: ${ip || 'Unknown'}\nTime: ${new Date().toISOString()}\n\nConfirm here (expires 15 min):\n${verifyUrl}\n\nNot you? Contact ${REPLY_TO} immediately.`;
  return sendEmail({ to, subject, html: wrap(preheader, body), text });
}

// ── 3. OTP received ───────────────────────────────────────────
export async function sendOTPEmail({ to, otp, service, number }) {
  const subject   = `Your ${service || 'RingSlot'} code: ${otp}`;
  const preheader = `${otp} is your verification code. Enter it now.`;
  const timeStr   = new Date().toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short' });
  const body = `
    <h1 class="h1">Your verification code arrived</h1>
    <p class="p">${service ? `We received a <strong>${service}</strong> SMS on your virtual number.` : 'Your OTP has arrived.'}</p>
    <div class="otp">
      <div style="font-size:11px;font-weight:700;color:#008844;letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px">Verification Code</div>
      <div class="otp-code">${otp}</div>
    </div>
    ${service ? `<div class="info"><span style="color:#8c8680;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Service</span>&nbsp;&nbsp;<strong>${service}</strong></div>` : ''}
    ${number  ? `<div class="info"><span style="color:#8c8680;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Number</span>&nbsp;&nbsp;<strong>${number}</strong></div>` : ''}
    <div class="info"><span style="color:#8c8680;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Received</span>&nbsp;&nbsp;<strong>${timeStr}</strong></div>
    <div class="warn">Never share this code. RingSlot will never ask for your OTP.</div>`;
  const text = `Your ${service || 'RingSlot'} code: ${otp}\n\nCode: ${otp}\n${service ? `Service: ${service}\n` : ''}${number ? `Number: ${number}\n` : ''}Time: ${new Date().toISOString()}\n\nNever share this code.`;
  return sendEmail({ to, subject, html: wrap(preheader, body), text });
}

// ── 4. Password reset ─────────────────────────────────────────
export async function sendPasswordResetEmail({ to, token }) {
  const resetUrl  = `${SITE_URL}/auth/reset-password?token=${token}`;
  const subject   = 'Reset your RingSlot password';
  const preheader = 'Click to reset your password. Link expires in 1 hour.';
  const timeStr   = new Date().toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short' });
  const body = `
    <h1 class="h1">Reset your password</h1>
    <p class="p">We received a request to reset the password for your RingSlot account. Click below to set a new password.</p>
    <a href="${resetUrl}" class="btn">Reset my password →</a>
    <div class="info"><span style="color:#8c8680;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Requested</span>&nbsp;&nbsp;<strong>${timeStr}</strong></div>
    <div class="info"><span style="color:#8c8680;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Expires</span>&nbsp;&nbsp;<strong>1 hour from now</strong></div>
    <div class="warn">If you did not request this, ignore this email — your password will not change.</div>
    <div class="danger">🔒 <strong>Never share this link.</strong> RingSlot staff will never ask for your reset link.</div>`;
  const text = `Reset your RingSlot password\n\nReset link (expires 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.\nNever share this link.\n\n${REPLY_TO}`;
  return sendEmail({ to, subject, html: wrap(preheader, body), text });
}
