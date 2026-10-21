/**
 * Accounts: device-local profiles named by a Google identity.
 *
 * Fundamentals, unchanged from the founding decision:
 *  - All learner data stays in THIS browser (IndexedDB namespaced per account).
 *  - The Google credential (a signed JWT) is verified by Google; locally it is
 *    only decoded to a name/email/avatar + stable `sub`. Nothing is sent
 *    anywhere by Elowen, and there is no cloud sync.
 *  - The guest database never merges with an account behind your back: the
 *    copy is an explicit, one-time action you take at sign-in.
 */

import { DB_NAME, openDbNamed, wipeAll, type StoreName } from './db';

export interface GoogleProfile {
  sub: string;
  name: string;
  email: string;
  picture: string;
}

export interface AccountSession extends GoogleProfile {
  migratedGuest: boolean;
}

interface MigrationResult {
  copied: number;
}

function sessionKey(): string {
  return 'elowen.session';
}

export function getSession(): AccountSession | null {
  try {
    const raw = localStorage.getItem(sessionKey());
    if (!raw) return null;
    const session = JSON.parse(raw) as AccountSession;
    if (session && typeof session.sub === 'string' && session.sub) return session;
  } catch {
    /* corrupt → guest */
  }
  return null;
}

/** Writes the session and switches the whole store over. Call then reload. */
export function setSession(profile: GoogleProfile, migrateGuest: boolean): Promise<void> {
  const existing = getSession();
  return (async () => {
    if (migrateGuest && !existing) {
      // copy the guest database into the new account namespace (one-time)
      await copyGuestData(profile.sub);
    }
    localStorage.setItem(sessionKey(), JSON.stringify({ ...profile, migratedGuest: migrateGuest }));
  })();
}

export function signOut(): void {
  localStorage.removeItem(sessionKey());
}

export function isGuest(): boolean {
  return getSession() === null;
}

/** Copies every data store from the guest DB to `<sub>`'s DB. */
export async function copyGuestData(sub: string): Promise<MigrationResult> {
  const src = await openDbNamed(DB_NAME);
  const dst = await openDbNamed(`${DB_NAME}.${sub}`);
  const stores: StoreName[] = ['events', 'lessons', 'srs', 'handwriting', 'speaking', 'reading', 'kv'];
  let copied = 0;
  for (const store of stores) {
    const rows: unknown[] = await new Promise((resolve, reject) => {
      const tx = src.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as unknown[]);
      req.onerror = () => reject(req.error ?? new Error(`read ${store} failed`));
    });
    if (rows.length === 0) continue;
    await new Promise<void>((resolve, reject) => {
      const tx = dst.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      for (const row of rows) os.put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error(`write ${store} failed`));
    });
    copied += rows.length;
  }
  return { copied };
}

export async function wipeAllDatabases(): Promise<void> {
  await wipeAll(); // the namespaced one
  try {
    const guest = await openDbNamed(DB_NAME);
    const stores: StoreName[] = ['events', 'lessons', 'srs', 'handwriting', 'speaking', 'reading', 'kv'];
    for (const store of stores) {
      await new Promise<void>((resolve, reject) => {
        const tx = guest.transaction(store, 'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error(`clear ${store} failed`));
      });
    }
  } catch {
    /* guest DB may not exist yet */
  }
  signOut();
}
