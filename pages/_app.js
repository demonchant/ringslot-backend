import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Prevent back button from going back to login/register after successful auth
    const handleRouteChange = () => {
      const authPages = ['/login', '/register'];
      if (authPages.includes(router.pathname)) {
        try {
          const token = localStorage.getItem('rs_token');
          if (token) router.replace('/dashboard');
        } catch {}
      }
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router]);

  return <Component {...pageProps} />;
}
