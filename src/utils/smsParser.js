export function parseOTP(text) {
  if (!text) return text;
  const patterns = [
    /\b(\d{4,8})\b/,
    /code[:\s]+([A-Z0-9]{4,10})/i,
    /OTP[:\s]+([A-Z0-9]{4,10})/i,
    /verification[:\s]+([A-Z0-9]{4,10})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return text;
}
