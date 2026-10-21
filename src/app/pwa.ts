/**
 * PWA install: captures the browser's beforeinstallprompt and exposes a
 * deliberate "Install" action. iOS Safari never fires that event — the honest
 * answer there is the manual "Add to Home Screen" path, stated plainly.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    for (const l of listeners) l();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    for (const l of listeners) l();
  });
}

export function canInstall(): boolean {
  return deferred !== null;
}

export function onInstallAvailability(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable' | 'auth-blocked';

export async function showInstall(): Promise<InstallOutcome> {
  if (!deferred) return 'unavailable';
  try {
    await deferred.prompt();
    const choice = await deferred.userChoice;
    deferred = null;
    return choice.outcome;
  } catch {
    // Firefox cert policies etc. may reject prompt() from private code paths
    return 'auth-blocked';
  }
}
