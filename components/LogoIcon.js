// components/LogoIcon.js
// The RingSlot brand logo — purple rounded square with 2x2 grid
// Matches the app icon: 3 white squares + 1 semi-transparent square (bottom-right)
// Used in Navbar, auth pages, footer, and browser tab favicon

export default function LogoIcon({ size = 32, className = '' }) {
  // The outer rounded square is rendered as a div with CSS
  // The inner SVG draws the 4 grid squares
  const r = Math.round(size * 0.22); // corner radius scales with size
  const p = Math.round(size * 0.15); // inner padding
  const inner = size - p * 2;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.26),
        background: 'linear-gradient(145deg, #7c5cf6, #5b3de8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: `0 ${Math.round(size*0.1)}px ${Math.round(size*0.4)}px rgba(91,61,232,0.45)`,
      }}
    >
      <svg
        width={inner}
        height={inner}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top-left square */}
        <rect x="1" y="1" width="8" height="8" rx="2" fill="white"/>
        {/* Top-right square */}
        <rect x="11" y="1" width="8" height="8" rx="2" fill="white"/>
        {/* Bottom-left square */}
        <rect x="1" y="11" width="8" height="8" rx="2" fill="white"/>
        {/* Bottom-right square — semi-transparent like the image */}
        <rect x="11" y="11" width="8" height="8" rx="2" fill="white" fillOpacity="0.38"/>
      </svg>
    </div>
  );
}
