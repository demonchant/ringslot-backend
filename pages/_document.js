import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Primary favicon — SVG works in all modern browsers */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {/* Fallback PNG favicon (generated from SVG by browser, or add a real one) */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />

        {/* App meta */}
        <meta name="application-name" content="RingSlot" />
        <meta name="theme-color" content="#5b3de8" />

        {/* Open Graph */}
        <meta property="og:type"        content="website" />
        <meta property="og:site_name"   content="RingSlot" />
        <meta property="og:title"       content="RingSlot — Virtual SMS Verification Numbers" />
        <meta property="og:description" content="Get temporary phone numbers instantly. Receive OTP codes for any platform. Pay with crypto." />
        <meta property="og:url"         content="https://ringslot.shop" />

        {/* Twitter card */}
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:title"       content="RingSlot" />
        <meta name="twitter:description" content="Virtual SMS verification numbers. Pay with crypto." />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
