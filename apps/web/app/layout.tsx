import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import Nav from '@/components/Nav';
import PWARegister from '@/components/PWARegister';
import InstallPrompt from '@/components/InstallPrompt';

export const metadata: Metadata = {
  title: 'PantryPilot',
  description: 'Pantry-aware nutrition: receipts → inventory → meals → shopping list.',
  applicationName: 'PantryPilot',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PantryPilot',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e2820',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Capture the install event as early as possible — it often fires
            before React mounts, so listening only in a component misses it. */}
        <Script id="pp-install-capture" strategy="beforeInteractive">
          {`
            window.__pp_deferredPrompt = null;
            window.addEventListener('beforeinstallprompt', function (e) {
              e.preventDefault();
              window.__pp_deferredPrompt = e;
              window.dispatchEvent(new Event('pp-installable'));
            });
            window.addEventListener('appinstalled', function () {
              window.__pp_deferredPrompt = null;
              window.dispatchEvent(new Event('pp-installed'));
            });
          `}
        </Script>
      </head>
      <body>
        <PWARegister />
        <InstallPrompt />
        <div className="app">
          <Nav />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
