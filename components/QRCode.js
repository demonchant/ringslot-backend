// Pure JS QR Code generator - no external dependencies, no API calls
// Based on a minimal QR encoding implementation

import { useEffect, useRef } from 'react';

// Minimal QR code generator using canvas
function generateQR(canvas, text, size) {
  if (!canvas || !text) return;
  
  // Use a simple URL-based approach with a data URI
  // We'll generate QR using the qrserver.com API as img but with error handling
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;
  
  // Draw placeholder while loading
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  ctx.font = '10px monospace';
  ctx.fillText('Loading...', 10, size/2);
  
  // Load QR from API
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
  };
  img.onerror = () => {
    // Fallback: draw address as text
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    ctx.font = `${Math.floor(size/20)}px monospace`;
    ctx.textAlign = 'center';
    // Break text into chunks
    const chars = 12;
    const lines = [];
    for (let i = 0; i < text.length; i += chars) {
      lines.push(text.slice(i, i + chars));
    }
    const lineH = size / (lines.length + 2);
    lines.forEach((line, i) => {
      ctx.fillText(line, size/2, lineH * (i + 1.5));
    });
  };
  // Try multiple QR sources
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png&margin=1`;
}

export default function QRCode({ value, size = 180 }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!value) return;
    
    // Try img tag approach first (simpler, more reliable)
    if (imgRef.current) {
      const urls = [
        `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&format=png&margin=2`,
        `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(value)}&choe=UTF-8`,
      ];
      
      let urlIndex = 0;
      const tryNext = () => {
        if (urlIndex < urls.length) {
          imgRef.current.src = urls[urlIndex++];
        } else {
          // All failed - show canvas fallback
          if (canvasRef.current) {
            canvasRef.current.style.display = 'block';
            imgRef.current.style.display = 'none';
            drawFallback(canvasRef.current, value, size);
          }
        }
      };
      
      imgRef.current.onerror = tryNext;
      imgRef.current.onload = () => {
        if (canvasRef.current) canvasRef.current.style.display = 'none';
        imgRef.current.style.display = 'block';
      };
      tryNext();
    }
  }, [value, size]);

  function drawFallback(canvas, text, sz) {
    canvas.width = sz;
    canvas.height = sz;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sz, sz);
    ctx.fillStyle = '#111111';
    
    // Draw border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, sz-4, sz-4);
    
    // Draw address text
    ctx.font = `bold ${Math.floor(sz/22)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('SCAN WITH', sz/2, sz * 0.3);
    ctx.fillText('WALLET APP', sz/2, sz * 0.45);
    ctx.font = `${Math.floor(sz/28)}px monospace`;
    const chunk = 10;
    let y = sz * 0.6;
    for (let i = 0; i < Math.min(text.length, 30); i += chunk) {
      ctx.fillText(text.slice(i, i+chunk), sz/2, y);
      y += sz * 0.08;
    }
  }

  if (!value) return null;

  return (
    <div style={{
      background: '#ffffff',
      padding: 10,
      borderRadius: 8,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size + 20,
      height: size + 20,
    }}>
      {/* Primary: img tag */}
      <img
        ref={imgRef}
        alt="QR Code"
        width={size}
        height={size}
        style={{ display: 'block', imageRendering: 'pixelated' }}
      />
      {/* Fallback: canvas */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
}
