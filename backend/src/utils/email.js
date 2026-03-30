// src/utils/email.js — Resend API with full deliverability headers
import logger from './logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL || 'RingSlot <noreply@ringslot.shop>';
const REPLY_TO       = 'support@ringslot.shop';
const SITE_URL       = process.env.FRONTEND_URL      || 'https://ringslot.shop';
const BACKEND_URL    = process.env.BACKEND_URL        || 'https://ringslot-backend.onrender.com';

// ── Core sender ───────────────────────────────────────────────
export async function sendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    logger.warn('[email] RESEND_API_KEY not set — skipping');
    return { ok: false };
  }
  try {
    const payload = {
      from:     FROM_EMAIL,
      to:       Array.isArray(to) ? to : [to],
      reply_to: REPLY_TO,
      subject,
      html,
      // Always include plain-text — Gmail uses this to judge legitimacy
      text: text || htmlToText(html),
      headers: {
        // Unsubscribe header — reduces spam score significantly
        'List-Unsubscribe':       `<mailto:${REPLY_TO}?subject=unsubscribe>`,
        'List-Unsubscribe-Post':  'List-Unsubscribe=One-Click',
        // Precedence bulk tells providers this is transactional
        'X-Entity-Ref-ID':        `ringslot-${Date.now()}`,
      },
    };

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body:    JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      logger.error('[email] Resend error', { status: res.status, msg: data.message });
      return { ok: false, error: data.message };
    }
    logger.info('[email] Sent', { id: data.id, to, subject });
    return { ok: true, id: data.id };
  } catch (err) {
    logger.error('[email] fetch failed', { error: err.message });
    return { ok: false, error: err.message };
  }
}

// Strip HTML tags to produce a plain-text fallback
function htmlToText(html = '') {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;/g, '·')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, '\n')
    .trim();
}

// ── HTML shell with proper email structure ────────────────────
function shell({ content, preheader = '' }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="format-detection" content="telephone=no"/>
  <title>RingSlot</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table{border-collapse:collapse!important}
    body{margin:0!important;padding:0!important;width:100%!important;background:#f0ede8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif}
    img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
    .preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;overflow:hidden;mso-hide:all}
    .wrapper{max-width:560px;margin:0 auto}
    .card{background:#ffffff;border-radius:16px;overflow:hidden}
    .header{background:linear-gradient(135deg,#6d4af7,#5b3de8);padding:28px 36px}
    .logo-row{display:flex;align-items:center;gap:12px}
    .logo-box{width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center}
    .logo-name{font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.04em;vertical-align:middle;margin-left:10px}
    .body{padding:36px}
    .title{font-size:22px;font-weight:700;color:#1a1714;margin-bottom:10px;line-height:1.3}
    .sub{font-size:15px;color:#5a5550;line-height:1.75;margin-bottom:24px}
    .btn{display:block;background:linear-gradient(135deg,#6d4af7,#5b3de8);color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:10px;font-size:15px;font-weight:700;text-align:center;margin:24px 0}
    .info-row{background:#f7f5f2;border-radius:8px;padding:11px 16px;margin-bottom:8px;font-size:13px;color:#3a3630}
    .info-label{display:inline-block;width:110px;color:#8c8680;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
    .info-val{font-family:'Courier New',monospace;color:#1a1714;font-weight:600}
    .otp-box{background:#f5f3ef;border:2px dashed #d0cdc8;border-radius:12px;padding:28px;text-align:center;margin:20px 0}
    .otp-label{font-size:11px;font-weight:700;color:#8c8680;letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px}
    .otp-code{font-family:'Courier New',monospace;font-size:44px;font-weight:700;color:#5b3de8;letter-spacing:10px;line-height:1}
    .warn{font-size:13px;color:#7a6a50;line-height:1.6;padding:12px 14px;background:#fdf9f1;border-left:3px solid #e8a020;border-radius:0 8px 8px 0;margin-top:20px}
    .danger-box{font-size:13px;color:#7a2020;line-height:1.6;padding:12px 14px;background:#fff5f5;border-left:3px solid #e53935;border-radius:0 8px 8px 0;margin-top:10px}
    .step{padding:12px 0;border-bottom:1px solid #ebe9e4}
    .step-num{display:inline-block;width:28px;height:28px;border-radius:7px;background:rgba(91,61,232,0.1);color:#5b3de8;font-weight:700;font-size:12px;text-align:center;line-height:28px;font-family:monospace;vertical-align:middle;margin-right:10px}
    .step-title{font-size:14px;font-weight:600;color:#1a1714;vertical-align:middle}
    .step-desc{font-size:13px;color:#8c8680;margin-top:3px;padding-left:38px}
    .footer{padding:20px 36px;border-top:1px solid #ebe9e4;text-align:center;font-size:12px;color:#a8a3a0;line-height:1.8}
    .footer a{color:#6d4af7;text-decoration:none}
    @media only screen and (max-width:600px){
      .body{padding:24px!important}
      .header{padding:24px!important}
      .otp-code{font-size:34px!important;letter-spacing:6px!important}
    }
  </style>
</head>
<body>
  <!-- Preheader (invisible preview text in inbox) -->
  <div class="preheader">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede8;padding:32px 16px">
    <tr><td align="center">
      <div class="wrapper">
        <div class="card">

          <!-- Header -->
          <div class="header">
            <table cellpadding="0" cellspacing="0"><tr><td>
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;text-align:center;vertical-align:middle">
                  <span style="font-size:20px;line-height:40px;display:inline-block">⊞</span>
                </td>
                <td style="padding-left:12px">
                  <span style="font-size:22px;font-weight:800;color:#ffffff;font-family:'Helvetica Neue',sans-serif;letter-spacing:-0.04em">RingSlot</span>
                </td>
              </tr></table>
            </td></tr></table>
          </div>

          <!-- Body -->
          <div class="body">
            ${content}
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin:0 0 6px">
              <a href="${SITE_URL}/dashboard">Dashboard</a> &nbsp;·&nbsp;
              <a href="${SITE_URL}/support">Support</a> &nbsp;·&nbsp;
              <a href="mailto:${REPLY_TO}">${REPLY_TO}</a>
            </p>
            <p style="margin:0;color:#c0bbb8">© 2026 RingSlot · <a href="${SITE_URL}">ringslot.shop</a></p>
            <p style="margin:6px 0 0;font-size:11px;color:#ccc8c4">
              You received this email because of activity on your RingSlot account.<br/>
              To stop receiving security emails, <a href="mailto:${REPLY_TO}?subject=unsubscribe">contact support</a>.
            </p>
          </div>

        </div>
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── 1. Login verification (new device) ────────────────────────
export async function sendLoginVerificationEmail({ to, token, deviceLabel, ip, isFirstLogin }) {
  const verifyUrl = `${BACKEND_URL}/api/auth/verify-device/${token}`;
  const subject   = isFirstLogin
    ? 'Confirm your RingSlot sign-in'
    : `New sign-in to RingSlot from ${deviceLabel}`;
  const preheader = isFirstLogin
    ? 'Click to confirm your first sign-in to RingSlot.'
    : `Someone signed in from ${deviceLabel}. Was that you?`;

  const content = `
<div class="title">${isFirstLogin ? 'Confirm your sign-in' : 'New device sign-in detected'}</div>
<div class="sub">${isFirstLogin
  ? 'We noticed this is your first sign-in to RingSlot. Please confirm it was you.'
  : `A sign-in to your RingSlot account was attempted from a new device. If this was you, confirm below.`
}</div>

<div class="info-row"><span class="info-label">Device</span> <span class="info-val">${deviceLabel}</span></div>
<div class="info-row"><span class="info-label">IP Address</span> <span class="info-val">${ip || 'Unknown'}</span></div>
<div class="info-row"><span class="info-label">Time</span> <span class="info-val">${new Date().toLocaleString('en-US', { timeZoneName: 'short', dateStyle: 'medium', timeStyle: 'short' })}</span></div>

<a href="${verifyUrl}" class="btn">Confirm this sign-in →</a>

<div class="warn">⏱ This link expires in <strong>15 minutes</strong>. If you did not attempt to sign in, <a href="${SITE_URL}/support" style="color:#5b3de8">contact support</a> immediately and change your password.</div>
${!isFirstLogin ? `<div class="danger-box">🔒 <strong>Not you?</strong> Someone may have your password. <a href="${SITE_URL}/auth/forgot-password" style="color:#5b3de8">Reset your password now</a>.</div>` : ''}
  `;

  const text = `${isFirstLogin ? 'Confirm your RingSlot sign-in' : 'New device sign-in detected'}

${isFirstLogin ? 'Please confirm your first sign-in to RingSlot.' : 'A sign-in was attempted from a new device.'}

Device: ${deviceLabel}
IP: ${ip || 'Unknown'}
Time: ${new Date().toISOString()}

Confirm here: ${verifyUrl}

This link expires in 15 minutes. If you did not sign in, contact support@ringslot.shop immediately.
  `;

  return sendEmail({ to, subject, html: shell({ content, preheader }), text });
}

// ── 2. OTP received ───────────────────────────────────────────
export async function sendOTPEmail({ to, otp, service, number }) {
  const subject   = `Your ${service || 'RingSlot'} verification code: ${otp}`;
  const preheader = `Your OTP code is ${otp}. Enter it now to complete verification.`;

  const content = `
<div class="title">Your verification code arrived</div>
<div class="sub">${service
  ? `We received a <strong>${service}</strong> SMS on your virtual number. Your code is below.`
  : `Your verification code has been received on your virtual number.`
}</div>

<div class="otp-box">
  <div class="otp-label">Verification Code</div>
  <div class="otp-code">${otp}</div>
</div>

${service ? `<div class="info-row"><span class="info-label">Service</span> <span class="info-val">${service}</span></div>` : ''}
${number  ? `<div class="info-row"><span class="info-label">Number</span> <span class="info-val">${number}</span></div>` : ''}
<div class="info-row"><span class="info-label">Received</span> <span class="info-val">${new Date().toLocaleString('en-US', { timeStyle: 'short', dateStyle: 'medium', timeZoneName: 'short' })}</span></div>

<div class="warn">⚠️ This code is valid for a limited time. Never share it with anyone. RingSlot will never ask for your OTP.</div>
  `;

  const text = `Your ${service || 'RingSlot'} verification code: ${otp}\n\nCode: ${otp}\n${service ? `Service: ${service}\n` : ''}${number ? `Number: ${number}\n` : ''}Received: ${new Date().toISOString()}\n\nNever share this code. RingSlot will never ask for it.`;

  return sendEmail({ to, subject, html: shell({ content, preheader }), text });
}

// ── 3. Welcome ────────────────────────────────────────────────
export async function sendWelcomeEmail({ to }) {
  const subject   = 'Welcome to RingSlot — your account is ready';
  const preheader = 'Get your first virtual number in 60 seconds.';

  const content = `
<div class="title">Welcome to RingSlot! 🎉</div>
<div class="sub">Your account is active. Here is how to get your first virtual number in under 60 seconds:</div>

<div class="step">
  <span class="step-num">01</span>
  <span class="step-title">Deposit crypto</span>
  <div class="step-desc">Fund your wallet with USDT, BTC, ETH and more. Minimum $20.</div>
</div>
<div class="step">
  <span class="step-num">02</span>
  <span class="step-title">Choose a service</span>
  <div class="step-desc">Pick from 100+ platforms including Telegram, Google, WhatsApp, Discord and more.</div>
</div>
<div class="step" style="border-bottom:none">
  <span class="step-num">03</span>
  <span class="step-title">Receive your OTP</span>
  <div class="step-desc">Your code arrives in seconds. Full auto-refund if no OTP within 10 minutes.</div>
</div>

<a href="${SITE_URL}/dashboard" class="btn">Go to Dashboard →</a>
  `;

  const text = `Welcome to RingSlot!\n\nYour account is ready. Here is how to get started:\n\n1. Deposit crypto (min $20) — USDT, BTC, ETH and more\n2. Pick a service — Telegram, Google, WhatsApp, Discord and 100+ more\n3. Get your OTP — arrives in seconds, full refund if it doesn't come\n\nGo to your dashboard: ${SITE_URL}/dashboard\n\nQuestions? Reply to this email or visit ${SITE_URL}/support`;

  return sendEmail({ to, subject, html: shell({ content, preheader }), text });
}

// ── 4. Password reset ─────────────────────────────────────────
export async function sendPasswordResetEmail({ to, token }) {
  const resetUrl  = `${SITE_URL}/auth/reset-password?token=${token}`;
  const subject   = 'Reset your RingSlot password';
  const preheader = 'Click the link below to choose a new password. Expires in 1 hour.';

  const content = `
<div class="title">Reset your password</div>
<div class="sub">We received a request to reset the password for your RingSlot account. Click the button below to set a new password.</div>

<a href="${resetUrl}" class="btn">Reset Password →</a>

<div class="info-row"><span class="info-label">Requested</span> <span class="info-val">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZoneName: 'short' })}</span></div>
<div class="info-row"><span class="info-label">Expires</span> <span class="info-val">1 hour from now</span></div>

<div class="warn">If you did not request a password reset, you can safely ignore this email. Your password will not change.</div>
<div class="danger-box">🔒 Never share this link. RingSlot staff will never ask for your reset link.</div>
  `;

  const text = `Reset your RingSlot password\n\nClick here to reset: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request this, ignore this email — your password will not change.\n\nNever share this link with anyone.`;

  return sendEmail({ to, subject, html: shell({ content, preheader }), text });
}
