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

const DISMISS_KEY = 'pp-install-dismissed';

export default function InstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed
    if (localStorage.getItem(DISMISS_KEY) === '1') return; // user dismissed before

    const show = () => {
      setCanInstall(true);
      setVisible(true);
    };

    // The event may have already fired (captured in the head script) before mount.
    if (getDeferredPrompt()) show();

    const onInstallable = () => show();
    const onInstalled = () => setVisible(false);

    window.addEventListener(INSTALLABLE_EVENT, onInstallable);
    window.addEventListener(INSTALLED_EVENT, onInstalled);

    // iOS never fires beforeinstallprompt — show manual hint instead.
    if (isIos()) {
      setIosHint(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener(INSTALLABLE_EVENT, onInstallable);
      window.removeEventListener(INSTALLED_EVENT, onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  async function install() {
    const outcome = await triggerInstall();
    if (outcome === 'accepted') setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Install PantryPilot">
      <div className="install-icon">🧭</div>
      <div className="install-text">
        <strong>Install PantryPilot</strong>
        {iosHint ? (
          <span>
            Tap the Share button, then <em>“Add to Home Screen”</em>.
          </span>
        ) : (
          <span>Add it to your device for a full-screen, app-like experience.</span>
        )}
      </div>
      <div className="install-actions">
        {canInstall && !iosHint && (
          <button className="sm" onClick={install}>
            Install
          </button>
        )}
        <button className="sm ghost" onClick={dismiss}>
          {iosHint ? 'Got it' : 'Not now'}
        </button>
      </div>
    </div>
  );
}
