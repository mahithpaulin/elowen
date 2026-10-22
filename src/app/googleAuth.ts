/**
 * Google Identity Services (FedCM) sign-in — client-only, no secrets.
 *
 * The client ID comes from either a build-time env (`VITE_GOOGLE_CLIENT_ID`)
 * or a value the user pasted once in Settings (stored locally). Client IDs are
 * public values by design; no client secret exists for this flow because the
 * app never makes a backend token-exchange call.
 */

import type { GoogleProfile } from '../storage/accounts';

interface GsiId {
  initialize(cfg: {
    client_id: string;
    callback: (resp: { credential: string }) => void;
    use_fedcm_for_prompt?: boolean;
    auto_select?: boolean;
  }): void;
  renderButton(
    el: HTMLElement,
    opts: { theme?: string; size?: string; text?: string; shape?: string; width?: number },
  ): void;
  prompt(): void;
  disableAutoSelect(): void;
}
interface GsiNamespace {
  accounts: { id: GsiId };
}
declare global {
  interface Window {
    google?: GsiNamespace;
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const CID_KEY = 'elowen.google.clientId';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

export function getGoogleClientId(): string {
  const stored = localStorage.getItem(CID_KEY)?.trim();
  if (stored) return stored;
  const fromEnv = env?.VITE_GOOGLE_CLIENT_ID?.trim();
  return fromEnv ?? '';
}

export function setGoogleClientId(id: string): void {
  localStorage.setItem(CID_KEY, id.trim());
}

/** Serialised here because the GIS script must only load once. */
let scriptPromise: Promise<GsiId> | null = null;

function loadScript(): Promise<GsiId> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id);
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.onload = () => {
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else reject(new Error('The Google sign-in script loaded but did not initialise.'));
    };
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('The Google sign-in script could not be downloaded (offline?).'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export async function initSignIn(el: HTMLElement, onCredential: (p: GoogleProfile) => void): Promise<void> {
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error('No Google client ID is configured yet.');
  const gsi = await loadScript();
  gsi.initialize({
    client_id: clientId,
    callback: (resp) => {
      const profile = decodeJwtPayload(resp.credential);
      if (profile) onCredential(profile);
    },
    use_fedcm_for_prompt: true,
    auto_select: true,
  });
  gsi.renderButton(el, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: 260 });
}

/** Decodes the middle section of the JWT Google hands back. */
export function decodeJwtPayload(jwt: string): GoogleProfile | null {
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    // Google encodes the claims as UTF-8; atob alone would mangle names
    // outside Latin-1 (e.g. "മഹിത്" or "José").
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const raw = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    const sub = typeof raw.sub === 'string' ? raw.sub : '';
    if (!sub) return null;
    return {
      sub,
      name: typeof raw.name === 'string' ? raw.name : 'Google user',
      email: typeof raw.email === 'string' ? raw.email : '',
      picture: typeof raw.picture === 'string' ? raw.picture : '',
    };
  } catch {
    return null;
  }
}
