'use client';

import { useEffect, useState } from 'react';
import {
  getDeferredPrompt,
  isIos,
  isStandalone,
  triggerInstall,
  INSTALLABLE_EVENT,
  INSTALLED_EVENT,
} from '@/lib/pwa';

/** Always-available install affordance for the sidebar. Hidden once installed. */
export default function InstallButton() {
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setReady(true);
    const onInstallable = () => setInstalled(false);
    const onInstalled = () => setInstalled(true);
    window.addEventListener(INSTALLABLE_EVENT, onInstallable);
    window.addEventListener(INSTALLED_EVENT, onInstalled);
    return () => {
      window.removeEventListener(INSTALLABLE_EVENT, onInstallable);
      window.removeEventListener(INSTALLED_EVENT, onInstalled);
    };
  }, []);

  if (!ready || installed) return null;

  async function onClick() {
    if (getDeferredPrompt()) {
      const outcome = await triggerInstall();
      if (outcome === 'accepted') setInstalled(true);
      return;
    }
    // No native prompt available (iOS, or event not fired) → show instructions.
    setShowHelp(true);
  }

  return (
    <>
      <button className="install-cta" onClick={onClick}>
        ⬇ Install app
      </button>

      {showHelp && (
        <div className="install-modal" onClick={() => setShowHelp(false)}>
          <div className="install-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Install PantryPilot</h3>
            {isIos() ? (
              <p>
                In Safari, tap the <strong>Share</strong> button, then{' '}
                <strong>“Add to Home Screen”</strong>.
              </p>
            ) : (
              <p>
                In Chrome or Edge, open the browser menu (or the install icon in the
                address bar) and choose <strong>“Install PantryPilot”</strong>.
                <br />
                <br />
                If you don’t see it yet, refresh the page once — the option appears
                after the app finishes loading.
              </p>
            )}
            <button className="sm" onClick={() => setShowHelp(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
