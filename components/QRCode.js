import { useEffect, useState } from 'react';

export default function QRCode({ value, size = 180 }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const sources = [
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=10&format=png`,
    `https://quickchart.io/qr?text=${encodeURIComponent(value)}&size=${size}&margin=2`,
  ];

  useEffect(() => {
    if (!value) return;
    setFailed(false);
    setAttempt(0);
    setSrc(sources[0]);
  }, [value, size]);

  function handleError() {
    const next = attempt + 1;
    if (next < sources.length) {
      setAttempt(next);
      setSrc(sources[next]);
    } else {
      setFailed(true);
    }
  }

  if (!value) return null;

  if (failed) {
    // Show address as copyable text when all QR sources fail
    return (
      <div style={{
        width: size, minHeight: size / 2,
        background: '#fff', borderRadius: 8,
        padding: 12, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8,
      }}>
        <div style={{ fontSize: 11, color: '#666', textAlign: 'center', fontWeight: 600 }}>
          📋 Copy address below
        </div>
        <div style={{
          fontSize: 9, color: '#111', wordBreak: 'break-all',
          textAlign: 'center', fontFamily: 'monospace', lineHeight: 1.5,
        }}>
          {value}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#ffffff',
      padding: 8,
      borderRadius: 8,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size + 16,
      height: size + 16,
    }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="QR Code — scan with crypto wallet"
          width={size}
          height={size}
          onError={handleError}
          style={{ display: 'block', imageRendering: 'pixelated' }}
        />
      )}
    </div>
  );
}
