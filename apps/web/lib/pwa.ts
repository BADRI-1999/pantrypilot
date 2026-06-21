'use client';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __pp_deferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export const INSTALLABLE_EVENT = 'pp-installable';
export const INSTALLED_EVENT = 'pp-installed';

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null;
  return window.__pp_deferredPrompt ?? null;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

/** Triggers the native install dialog. Returns the outcome, or null if no prompt is available. */
export async function triggerInstall(): Promise<'accepted' | 'dismissed' | null> {
  const deferred = getDeferredPrompt();
  if (!deferred) return null;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  if (typeof window !== 'undefined') window.__pp_deferredPrompt = null;
  return outcome;
}
