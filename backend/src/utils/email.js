// src/utils/email.js — Resend API, RFC-compliant, anti-spam optimised
import logger from './logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL || 'RingSlot <noreply@ringslot.shop>';
const REPLY_TO       = process.env.SUPPORT_EMAIL     || 'support@ringslot.shop';
const SITE_URL       = process.env.FRONTEND_URL      || 'https://ringslot.shop';
const BACKEND_URL    = process.env.BACKEND_URL        || 'https://ringslot-backend.onrender.com';

// ── Core sender ───────────────────────────────────────────────
export async function sendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    logger.warn('[email] RESEND_API_KEY not set — skipping');
    return { ok: false, error: 'No API key' };
  }
  try {
    const body = {
      from:     FROM_EMAIL,
      to:       Array.isArray(to) ? to : [to],
      reply_to: REPLY_TO,
      subject,
      html,
      text: text || stripHtml(html),
      headers: {
        'List-Unsubscribe':      `<mailto:${REPLY_TO}?subject=unsubscribe>, <${SITE_URL}/unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID':       `rs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
    };

    const res  = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body:    JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      logger.error('[email] Resend API error', { status: res.status, message: data.message, name: data.name });
      return { ok: false, error: data.message };
    }

    logger.info('[email] Delivered', { id: data.id, to, subject });
    return { ok: true, id: data.id };
  } catch (err) {
    logger.error('[email] Network error', { error: err.message });
    return { ok: false, error: err.message };
  }
}

function stripHtml(html = '') {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 [ $1 ]')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&middot;/g, '·').replace(/&#8203;/g, '')
    .replace(/\n{3,}/g, '\n\n').trim();
}

// ── Shared HTML wrapper ───────────────────────────────────────
// Uses table-based layout (required for Outlook/Gmail compatibility)
// Preheader = invisible text shown as preview in inbox
function wrap(preheader, body) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>RingSlot</title>
<style type="text/css">
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;outline:none;text-decoration:none}
  body{margin:0!important;padding:0!important;background-color:#f0ede8}
  a{color:#5b3de8}
  .preheader{display:none!important;mso-hide:all;visibility:hidden;opacity:0;color:transparent;height:0;width:0}
  @media screen and (max-width:600px){
    .container{width:100%!important;max-width:100%!important}
    .body-pad{padding:24px 20px!important}
    .otp-size{font-size:36px!important;letter-spacing:6px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f0ede8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

<!-- Preheader -->
<div class="preheader" style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0ede8">
<tr><td align="center" style="padding:32px 16px">
<table border="0" cellpadding="0" cellspacing="0" width="560" class="container" style="max-width:560px">

  <!-- LOGO ROW -->
  <tr><td align="center" style="padding-bottom:20px">
    <table border="0" cellpadding="0" cellspacing="0"><tr>
      <td style="background:linear-gradient(135deg,#6d4af7,#5b3de8);border-radius:12px;width:42px;height:42px;text-align:center;vertical-align:middle">
        <span style="font-size:24px;line-height:42px;display:inline-block;color:#fff;font-weight:900">&#9783;</span>
      </td>
      <td style="padding-left:12px;vertical-align:middle">
        <span style="font-size:22px;font-weight:800;color:#1a1714;letter-spacing:-0.04em;font-family:'Helvetica Neue',sans-serif">RingSlot</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- CARD -->
  <tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">

      <!-- HEADER BAND -->
      <tr><td style="background:linear-gradient(135deg,#6d4af7,#5b3de8);height:6px;border-radius:16px 16px 0 0">&nbsp;</td></tr>

      <!-- BODY -->
      <tr><td class="body-pad" style="padding:36px 40px">
        ${body}
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#f7f5f2;padding:20px 40px;border-top:1px solid #e8e4df;border-radius:0 0 16px 16px">
        <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
          <p style="margin:0 0 6px;font-size:13px;color:#8c8680">
            <a href="${SITE_URL}/dashboard" style="color:#5b3de8;text-decoration:none">Dashboard</a>
            &nbsp;&middot;&nbsp;
            <a href="${SITE_URL}/support" style="color:#5b3de8;text-decoration:none">Support</a>
            &nbsp;&middot;&nbsp;
            <a href="mailto:${REPLY_TO}" style="color:#5b3de8;text-decoration:none">${REPLY_TO}</a>
          </p>
          <p style="margin:0;font-size:12px;color:#b5b0aa">&copy; 2026 RingSlot &middot; ringslot.shop</p>
          <p style="margin:6px 0 0;font-size:11px;color:#c8c4c0">
            You received this email because of account activity on RingSlot.<br/>
            <a href="mailto:${REPLY_TO}?subject=unsubscribe" style="color:#a8a3a0;text-decoration:underline">Unsubscribe</a>
          </p>
        </td></tr></table>
      </td></tr>

    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Reusable HTML snippets ────────────────────────────────────
function h1(text) {
  return `<h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#1a1714;line-height:1.3;letter-spacing:-0.03em">${text}</h1>`;
}
function p(text, style = '') {
  return `<p style="margin:0 0 20px;font-size:15px;color:#4a4540;line-height:1.75;${style}">${text}</p>`;
}
function btn(url, label) {
  return `<table border="0" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr>
    <td style="background:linear-gradient(135deg,#6d4af7,#5b3de8);border-radius:10px">
      <a href="${url}" style="display:inline-block;padding:15px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;font-family:'Helvetica Neue',sans-serif;letter-spacing:-0.01em">${label}</a>
    </td>
  </tr></table>`;
}
function infoRow(label, value) {
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px">
    <tr>
      <td style="background:#f7f5f2;border-radius:8px;padding:11px 16px">
        <span style="font-size:11px;font-weight:700;color:#8c8680;text-transform:uppercase;letter-spacing:.06em;font-family:monospace">${label}</span>
        &nbsp;&nbsp;
        <span style="font-size:13px;font-weight:600;color:#1a1714;font-family:'Courier New',monospace">${value}</span>
      </td>
    </tr>
  </table>`;
}
function warning(text) {
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px">
    <tr><td style="background:#fdf8ee;border-left:4px solid #e8a020;border-radius:0 8px 8px 0;padding:12px 16px;font-size:13px;color:#7a6040;line-height:1.6">${text}</td></tr>
  </table>`;
}
function dangerNote(text) {
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:10px">
    <tr><td style="background:#fff5f5;border-left:4px solid #e53935;border-radius:0 8px 8px 0;padding:12px 16px;font-size:13px;color:#7a2020;line-height:1.6">${text}</td></tr>
  </table>`;
}
function otpBox(code) {
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0">
    <tr><td style="background:#f5f3ef;border:2px dashed #d0cdc8;border-radius:12px;padding:28px;text-align:center">
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#8c8680;text-transform:uppercase;letter-spacing:.12em">Verification Code</p>
      <p class="otp-size" style="margin:0;font-size:44px;font-weight:700;color:#5b3de8;letter-spacing:12px;font-family:'Courier New',monospace;line-height:1">${code}</p>
    </td></tr>
  </table>`;
}
function step(num, title, desc) {
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom:1px solid #ebe9e4;padding:14px 0">
    <tr>
      <td width="36" valign="top">
        <div style="width:30px;height:30px;background:rgba(91,61,232,0.1);border-radius:8px;text-align:center;line-height:30px;font-size:12px;font-weight:700;color:#5b3de8;font-family:monospace">${num}</div>
      </td>
      <td style="padding-left:12px;vertical-align:top">
        <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#1a1714">${title}</p>
        <p style="margin:0;font-size:13px;color:#8c8680">${desc}</p>
      </td>
    </tr>
  </table>`;
}

// ── 1. Welcome email ──────────────────────────────────────────
export async function sendWelcomeEmail({ to }) {
  const subject   = 'Welcome to RingSlot — your account is ready';
  const preheader = 'Get your first virtual phone number in 60 seconds.';

  const body = `
    ${h1('Welcome to RingSlot! 🎉')}
    ${p('Your account is active and ready to go. Here is how to get your first virtual number in under 60 seconds:')}
    ${step('01', 'Deposit crypto', 'Fund your wallet with USDT, BTC, ETH and more. Minimum $20.')}
    ${step('02', 'Choose a service', 'Pick from 100+ platforms — Telegram, Google, WhatsApp, Discord, Instagram and more.')}
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding:14px 0">
      <tr>
        <td width="36" valign="top">
          <div style="width:30px;height:30px;background:rgba(91,61,232,0.1);border-radius:8px;text-align:center;line-height:30px;font-size:12px;font-weight:700;color:#5b3de8;font-family:monospace">03</div>
        </td>
        <td style="padding-left:12px;vertical-align:top">
          <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#1a1714">Receive your OTP</p>
          <p style="margin:0;font-size:13px;color:#8c8680">Your code arrives in seconds. Full auto-refund if no OTP within 10 minutes.</p>
        </td>
      </tr>
    </table>
    ${btn(`${SITE_URL}/dashboard`, 'Go to My Dashboard →')}
    ${p('Questions? Just reply to this email or visit <a href="' + SITE_URL + '/support" style="color:#5b3de8">our support page</a>.', 'margin-bottom:0;font-size:14px;color:#8c8680')}
  `;

  const text = `Welcome to RingSlot!

Your account is ready. Here is how to get started:

1. Deposit crypto (min $20) — USDT, BTC, ETH, LTC and more
2. Pick a service — Telegram, Google, WhatsApp, Discord and 100+ more  
3. Get your OTP — arrives in seconds, full refund if not delivered

Go to your dashboard: ${SITE_URL}/dashboard

Questions? Reply to this email or visit: ${SITE_URL}/support

— The RingSlot Team`;

  return sendEmail({ to, subject, html: wrap(preheader, body), text });
}

// ── 2. Login verification ─────────────────────────────────────
export async function sendLoginVerificationEmail({ to, token, deviceLabel, ip, isFirstLogin }) {
  const verifyUrl = `${BACKEND_URL}/api/auth/verify-device/${token}`;
  const subject   = isFirstLogin
    ? 'Verify your RingSlot account — action required'
    : `New sign-in to RingSlot from ${deviceLabel}`;
  const preheader = isFirstLogin
    ? 'Please confirm your first sign-in to RingSlot. Link expires in 15 minutes.'
    : `New sign-in detected from ${deviceLabel}. Was that you?`;

  const timeStr = new Date().toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  const body = `
    ${h1(isFirstLogin ? 'Confirm your sign-in' : 'New device sign-in')}
    ${p(isFirstLogin
      ? 'Welcome! We noticed this is your first time signing in to RingSlot. Please confirm it was you by clicking the button below to access your account.'
      : 'Someone signed in to your RingSlot account from a device we do not recognise. If this was you, confirm below to continue.'
    )}
    ${infoRow('Device', deviceLabel)}
    ${infoRow('IP Address', ip || 'Unknown')}
    ${infoRow('Time', timeStr)}
    ${btn(verifyUrl, 'Confirm this sign-in →')}
    ${warning(`<strong>This link expires in 15 minutes.</strong> If you did not attempt to sign in, please <a href="${SITE_URL}/support" style="color:#5b3de8">contact our support team</a> immediately and change your password.`)}
    ${isFirstLogin ? '' : dangerNote(`<strong>Not you?</strong> Your account may be at risk. <a href="${SITE_URL}/auth/forgot-password" style="color:#c0392b">Reset your password immediately</a>.`)}
  `;

  const text = `${isFirstLogin ? 'Confirm your RingSlot sign-in' : 'New device sign-in detected'}

${isFirstLogin
  ? 'Please confirm your first sign-in to RingSlot.'
  : 'A sign-in to your account was detected from a new device.'}

Device:     ${deviceLabel}
IP Address: ${ip || 'Unknown'}
Time:       ${new Date().toISOString()}

Confirm here (expires in 15 minutes):
${verifyUrl}

If you did not attempt to sign in, contact us at ${REPLY_TO} immediately.

— RingSlot Security`;

  return sendEmail({ to, subject, html: wrap(preheader, body), text });
}

// ── 3. OTP notification ───────────────────────────────────────
export async function sendOTPEmail({ to, otp, service, number }) {
  const subject   = `Your ${service || 'RingSlot'} code: ${otp}`;
  const preheader = `${otp} is your ${service || 'RingSlot'} verification code. Enter it now.`;

  const timeStr = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  const body = `
    ${h1('Your verification code arrived')}
    ${p(service
      ? `We received a <strong>${service}</strong> SMS on your virtual number. Enter the code below to complete your verification.`
      : 'Your OTP has been received on your virtual number. Enter the code below.'
    )}
    ${otpBox(otp)}
    ${service ? infoRow('Service', service) : ''}
    ${number  ? infoRow('Phone Number', number) : ''}
    ${infoRow('Received', timeStr)}
    ${warning('Never share this code with anyone. RingSlot will never ask you for your verification code.')}
  `;

  const text = `Your ${service || 'RingSlot'} verification code: ${otp}

Code: ${otp}
${service ? `Service: ${service}\n` : ''}${number ? `Number: ${number}\n` : ''}Time: ${new Date().toISOString()}

Never share this code. Enter it in the app to verify your account.

— RingSlot`;

  return sendEmail({ to, subject, html: wrap(preheader, body), text });
}

// ── 4. Password reset ─────────────────────────────────────────
export async function sendPasswordResetEmail({ to, token }) {
  const resetUrl  = `${SITE_URL}/auth/reset-password?token=${token}`;
  const subject   = 'Reset your RingSlot password';
  const preheader = 'Click to reset your password. This link expires in 1 hour.';

  const timeStr = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  const body = `
    ${h1('Reset your password')}
    ${p('We received a request to reset the password for your RingSlot account. Click the button below to set a new password. If you did not request this, you can safely ignore this email.')}
    ${btn(resetUrl, 'Reset my password →')}
    ${infoRow('Requested', timeStr)}
    ${infoRow('Link expires', '1 hour from now')}
    ${warning('If you did not request a password reset, no action is needed. Your password will not change.')}
    ${dangerNote('<strong>Security tip:</strong> Never share this link. RingSlot staff will never ask for your reset link or password.')}
  `;

  const text = `Reset your RingSlot password

We received a request to reset your password.

Click here to reset it:
${resetUrl}

This link expires in 1 hour.

If you did not request this, ignore this email — your password will not change.

— RingSlot Security
${REPLY_TO}`;

  return sendEmail({ to, subject, html: wrap(preheader, body), text });
}
