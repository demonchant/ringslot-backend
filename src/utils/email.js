// src/utils/email.js  — Resend API  (backend, Node.js ESM)
import logger from './logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL || 'RingSlot <noreply@ringslot.shop>';
const SITE_URL       = process.env.FRONTEND_URL      || 'https://ringslot.shop';
const BACKEND_URL    = process.env.BACKEND_URL        || 'https://ringslot-backend.onrender.com';

// ── Core sender ───────────────────────────────────────────────
export async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    logger.warn('[email] RESEND_API_KEY not set — skipping');
    return { ok: false };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    const data = await res.json();
    if (!res.ok) {
      logger.error('[email] Resend error', { msg: data.message });
      return { ok: false };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    logger.error('[email] fetch failed', { error: err.message });
    return { ok: false };
  }
}

// ── Shared HTML shell ─────────────────────────────────────────
function shell(content) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f0ede8;font-family:'Helvetica Neue',Arial,sans-serif;padding:32px 0}
.wrap{max-width:520px;margin:0 auto;padding:0 16px}
.card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.hdr{background:linear-gradient(135deg,#5b47e0,#7c4df7);padding:28px 36px}
.logo{font-size:20px;font-weight:800;color:#fff;letter-spacing:-.04em;font-family:sans-serif}
.body{padding:36px}
.title{font-size:21px;font-weight:700;color:#1a1714;margin-bottom:10px;letter-spacing:-.03em}
.sub{font-size:14px;color:#6b6560;line-height:1.75;margin-bottom:24px}
.row{background:#f8f7f5;border-radius:10px;padding:12px 16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}
.rl{font-size:11px;color:#8c8680;font-weight:700;letter-spacing:.06em;text-transform:uppercase;flex-shrink:0}
.rv{font-size:13px;color:#1a1714;font-weight:600;font-family:'Courier New',monospace;text-align:right;word-break:break-all}
.otpbox{background:#f5f3ef;border:1.5px dashed #d0cdc8;border-radius:14px;padding:28px;text-align:center;margin-bottom:24px}
.otplabel{font-size:10px;font-weight:700;color:#8c8680;letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px}
.otpcode{font-family:'Courier New',monospace;font-size:44px;font-weight:700;color:#5b47e0;letter-spacing:10px;line-height:1}
.cta{display:block;margin:24px 0;padding:15px 28px;background:linear-gradient(135deg,#5b47e0,#7c4df7);color:#fff;border-radius:12px;text-align:center;font-weight:700;font-size:15px;text-decoration:none;box-shadow:0 4px 16px rgba(91,71,224,.3)}
.warn{font-size:12px;color:#9c8e7a;line-height:1.6;padding:12px 14px;background:#fdf9f1;border-left:3px solid #f5a623;border-radius:0 8px 8px 0;margin-top:20px}
.danger{font-size:12px;color:#922;line-height:1.6;padding:12px 14px;background:#fff5f5;border-left:3px solid #e53935;border-radius:0 8px 8px 0;margin-top:12px}
.step{display:flex;gap:14px;padding:12px 0;border-bottom:1px solid #ebe9e4;align-items:flex-start}
.num{width:30px;height:30px;border-radius:8px;background:rgba(91,71,224,.1);color:#5b47e0;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:monospace}
.st{font-size:13px;font-weight:600;color:#1a1714;margin-bottom:2px}
.sd{font-size:12px;color:#8c8680}
.ftr{padding:20px 36px;border-top:1px solid #ebe9e4;text-align:center;font-size:12px;color:#a8a3a0;line-height:1.8}
a{color:#5b47e0;text-decoration:none}
</style></head><body>
<div class="wrap"><div class="card">
<div class="hdr"><div class="logo">RingSlot</div></div>
<div class="body">${content}</div>
<div class="ftr">
  <a href="${SITE_URL}/dashboard">Dashboard</a> &middot;
  <a href="${SITE_URL}/support">Support</a> &middot;
  <a href="mailto:support@ringslot.shop">Contact</a>
</div>
</div>
<p style="text-align:center;margin-top:14px;font-size:11px;color:#b5b0aa">
  © 2026 RingSlot &middot; <a href="${SITE_URL}">ringslot.shop</a>
</p>
</div></body></html>`;
}

// ── 1. New device / first login verification ──────────────────
export async function sendLoginVerificationEmail({ to, token, deviceLabel, ip, isFirstLogin }) {
  const verifyUrl = `${BACKEND_URL}/api/auth/verify-device/${token}`;
  const subject   = isFirstLogin
    ? 'Verify your RingSlot account'
    : `New sign-in to your RingSlot account`;

  const heading = isFirstLogin
    ? 'Confirm your sign-in'
    : 'New device detected';

  const intro = isFirstLogin
    ? `Welcome! We noticed this is your first time signing in to RingSlot. Please confirm it was you by clicking the button below.`
    : `Someone just signed in to your RingSlot account from a device we don't recognise. If this was you, confirm the login below.`;

  const content = `
<div class="title">${heading}</div>
<div class="sub">${intro}</div>

<div class="row"><span class="rl">Device</span><span class="rv">${deviceLabel}</span></div>
<div class="row"><span class="rl">IP Address</span><span class="rv">${ip || 'Unknown'}</span></div>
<div class="row"><span class="rl">Time</span><span class="rv">${new Date().toLocaleString('en-US', { timeZoneName: 'short' })}</span></div>

<a href="${verifyUrl}" class="cta">Confirm this sign-in →</a>

<div class="warn">
  This link expires in <strong>15 minutes</strong>. If you did not attempt to sign in, 
  please <a href="${SITE_URL}/support">contact support</a> immediately and change your password.
</div>
${!isFirstLogin ? `<div class="danger"><strong>Not you?</strong> Someone may have your password. <a href="${SITE_URL}/login">Reset your password</a> now.</div>` : ''}
  `;

  return sendEmail({ to, subject, html: shell(content) });
}

// ── 2. OTP received notification ──────────────────────────────
export async function sendOTPEmail({ to, otp, service, number }) {
  const subject = service
    ? `Your ${service} verification code — ${otp}`
    : `Your RingSlot OTP — ${otp}`;

  const content = `
<div class="title">Your verification code is ready</div>
<div class="sub">${service
  ? `We received a <strong>${service}</strong> verification SMS on your virtual number.`
  : `Your OTP has been received on your virtual number.`
} Enter the code below to complete verification.</div>

<div class="otpbox">
  <div class="otplabel">Verification Code</div>
  <div class="otpcode">${otp}</div>
</div>

${service ? `<div class="row"><span class="rl">Service</span><span class="rv">${service}</span></div>` : ''}
${number  ? `<div class="row"><span class="rl">Number</span><span class="rv">${number}</span></div>` : ''}
<div class="row"><span class="rl">Received</span><span class="rv">${new Date().toLocaleString('en-US', { timeZoneName: 'short' })}</span></div>

<div class="warn">This code is valid for a limited time. Never share it with anyone. RingSlot will never ask for your OTP.</div>
  `;

  return sendEmail({ to, subject, html: shell(content) });
}

// ── 3. Welcome email ──────────────────────────────────────────
export async function sendWelcomeEmail({ to }) {
  const content = `
<div class="title">Welcome to RingSlot!</div>
<div class="sub">Your account is ready. Here's how to get your first virtual number in 60 seconds:</div>

<div class="step"><div class="num">01</div><div>
  <div class="st">Deposit crypto</div>
  <div class="sd">Fund your wallet with USDT, BTC, ETH and more. Minimum $20.</div>
</div></div>
<div class="step"><div class="num">02</div><div>
  <div class="st">Choose a service</div>
  <div class="sd">Pick from 100+ platforms — Telegram, Google, Discord, WhatsApp and more.</div>
</div></div>
<div class="step"><div class="num">03</div><div>
  <div class="st">Receive your OTP</div>
  <div class="sd">Code arrives in seconds. Full auto-refund if no OTP within 10 minutes.</div>
</div></div>

<a href="${SITE_URL}/dashboard" class="cta">Go to Dashboard →</a>
  `;

  return sendEmail({
    to,
    subject: 'Welcome to RingSlot — you\'re all set',
    html: shell(content),
  });
}

// ── 4. Password reset email ───────────────────────────────────
export async function sendPasswordResetEmail({ to, token }) {
  const resetUrl = `${SITE_URL}/auth/reset-password?token=${token}`;
  const subject  = 'Reset your RingSlot password';

  const content = `
<div class="title">Reset your password</div>
<div class="sub">We received a request to reset the password for your RingSlot account. Click the button below to choose a new password.</div>

<a href="${resetUrl}" class="cta">Reset Password →</a>

<div class="row"><span class="rl">Requested at</span><span class="rv">${new Date().toLocaleString('en-US', { timeZoneName: 'short' })}</span></div>
<div class="row"><span class="rl">Link expires</span><span class="rv">1 hour</span></div>

<div class="warn">
  If you did not request a password reset, you can safely ignore this email. Your password will not be changed.
</div>
<div class="danger" style="margin-top:12px;">
  <strong>Never share this link.</strong> RingSlot staff will never ask for your reset link.
</div>
  `;

  return sendEmail({ to, subject, html: shell(content) });
}
