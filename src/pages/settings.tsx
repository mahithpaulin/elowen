import { useEffect, useState } from 'react';
import { getSnapshot, saveSettings, wipeEverything } from '../storage/appstore';
import { getSession, setSession, signOut, wipeAllDatabases, type GoogleProfile } from '../storage/accounts';
import { initSignIn, getGoogleClientId, setGoogleClientId } from '../app/googleAuth';
import { canInstall, isIos, onInstallAvailability, showInstall, type InstallOutcome } from '../app/pwa';
import { ENGINES, engineInstalled, installEngine, clearEngineCache } from '../features/engines';
import { Card, Button, Eyebrow, Callout, Badge } from '../components/ui';

/** Settings: identity, display, offline engines, install, data ownership. */
export function SettingsPage() {
  const snap = getSnapshot();
  const s = snap.settings;
  const session = getSession();
  return (
    <>
      <h1>Settings</h1>
      <p className="muted" style={{ marginTop: -4 }}>
        Your identity on this device, reading comfort, offline engines, install, and data ownership.
      </p>

      <div className="grid2">
        <AccountCard signedIn={session !== null} session={session} />
        <AppInstallCard />
        <EnginesCard />

        <Card>
          <Eyebrow>Reading comfort</Eyebrow>
          <label className="row spread" style={{ margin: '8px 0' }}>
            <span>Text size</span>
            <input
              type="range"
              min={0.9}
              max={1.3}
              step={0.05}
              value={s.textSize}
              onChange={(e) => saveSettings({ textSize: Number(e.target.value) })}
              aria-label="Text size"
            />
          </label>
          <label className="row spread" style={{ margin: '8px 0' }}>
            <span>Reduce motion</span>
            <input
              type="checkbox"
              checked={s.reduceMotion}
              onChange={(e) => saveSettings({ reduceMotion: e.target.checked })}
            />
          </label>
          <label className="row spread" style={{ margin: '8px 0' }}>
            <span>High contrast</span>
            <input
              type="checkbox"
              checked={s.highContrast}
              onChange={(e) => saveSettings({ highContrast: e.target.checked })}
            />
          </label>
        </Card>

        <DataCard session={session} />
      </div>
      <WhatItNeverDoes />
      {snap.settings.demoSeeded ? (
        <p className="tiny" style={{ marginTop: 12 }}>
          Sample data was explored earlier — erase it with the button below when ready.
        </p>
      ) : null}
      <Card tight style={{ marginTop: 8 }}>
        <DataWipeCard session={session} />
      </Card>
    </>
  );
}

/* ---------- Account ---------- */

function AccountCard({
  signedIn,
  session,
}: {
  signedIn: boolean;
  session: ReturnType<typeof getSession>;
}) {
  const [btnHost, setBtnHost] = useState<HTMLDivElement | null>(null);
  const [cid, setCid] = useState(getGoogleClientId());
  const [cidDraft, setCidDraft] = useState('');
  const [err, setErr] = useState('');
  const [clientPicked, setClientPicked] = useState(false);

  useEffect(() => {
    if (signedIn || clientPicked || !btnHost) return;
    let cancelled = false;
    initSignIn(btnHost, (p) => {
      if (!cancelled) void signInNow(p, btnHost.dataset.migrate === 'true');
    }).catch((e) => {
      if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
    });
    return () => {
      cancelled = true;
    };
  }, [btnHost, signedIn, clientPicked]);

  const signInNow = (p: GoogleProfile, migrate: boolean) =>
    setSession(p, migrate).then(() => window.location.reload());

  const signOutNow = () => {
    // Google's own auto-select must stop before we switch back to guest.
    const g = window.google;
    try {
      g?.accounts.id.disableAutoSelect();
    } catch {
      /* already gone */
    }
    signOut();
    window.location.reload();
  };

  if (signedIn && session) {
    return (
      <Card>
        <Eyebrow>Account</Eyebrow>
        <div className="row" style={{ gap: 12, margin: '10px 0' }}>
          {session.picture ? (
            <img
              src={session.picture}
              alt=""
              width={44}
              height={44}
              style={{ borderRadius: '50%', border: '1px solid var(--line)' }}
            />
          ) : (
            <div className="brand .mark" style={{ width: 44, height: 44 }} />
          )}
          <div>
            <b>{session.name}</b>
            <div className="tiny">{session.email}</div>
          </div>
        </div>
        <p className="tiny">
          Progress lives on this device, inside a storage space named by this account.
          {session.migratedGuest ? ' Your earlier guest progress was copied in.' : ''}
        </p>
        <Button onClick={signOutNow}>Sign out (stay on this device)</Button>
      </Card>
    );
  }

  return (
    <Card>
      <Eyebrow>Account</Eyebrow>
      {cid ? (
        <>
          <p className="tiny" style={{ marginBottom: 10 }}>
            Signing in with Google names your profile and gives progress its own storage space on
            this device. The token is processed by Google and decoded locally — Elowen has no
            backend to send it to, and nothing syncs to any cloud.
          </p>
          <div ref={setBtnHost} data-migrate="true" />
          <label className="row" style={{ marginTop: 10, gap: 6, fontSize: '0.8rem' }}>
            <input
              type="checkbox"
              defaultChecked
              onChange={(e) => {
                const host = btnHost;
                if (host) host.dataset.migrate = String(e.target.checked);
              }}
            />
            Bring my existing guest progress into the account
          </label>
          {err ? <div className="feedback bad">{err}</div> : null}
        </>
      ) : (
        <>
          <p className="tiny">
            Google sign-in needs an OAuth client ID tied to this site's address. It costs nothing and
            takes a minute on console.cloud.google.com:
          </p>
          <ol className="list-plain tiny" style={{ paddingLeft: 16 }}>
            <li>APIs &amp; Services → OAuth consent screen → External → your app name.</li>
            <li>Credentials → Create OAuth Client ID → Web application.</li>
            <li>Authorised JavaScript origins: <code className="k">{location.origin}</code></li>
            <li>Paste the client ID here once — it is stored on this device.</li>
          </ol>
          <div className="answerline" style={{ marginTop: 8 }}>
            <input
              type="text"
              value={cidDraft}
              onChange={(e) => setCidDraft(e.target.value)}
              placeholder="1234567890-abcdefgh.apps.googleusercontent.com"
              aria-label="Google OAuth client ID"
            />
            <Button
              accent
              disabled={!cidDraft.trim().endsWith('.apps.googleusercontent.com')}
              onClick={() => {
                setGoogleClientId(cidDraft);
                setCid(getGoogleClientId());
                setClientPicked(true);
              }}
            >
              Save
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

/* ---------- Install as app ---------- */

function AppInstallCard() {
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => onInstallAvailability(() => setTick((t) => t + 1)), []);
  const [outcome, setOutcome] = useState<InstallOutcome | ''>('');

  const install = async () => {
    setBusy(true);
    setOutcome(await showInstall());
    setBusy(false);
    setTick((t) => t + 1);
  };

  const ios = isIos();
  return (
    <Card>
      <Eyebrow>Install as an app</Eyebrow>
      <p className="tiny" style={{ marginBottom: 10 }}>
        {ios
          ? 'On iPhone/iPad: tap the Share button in Safari, then “Add to Home Screen”. Everything below works offline afterwards.'
          : 'Installs like a native app with its own icon and a full-screen window. After the first load it works with no internet.'}
      </p>
      <div className="row">
        <Button primary onClick={install} disabled={!canInstall() || busy}>
          {canInstall() ? 'Install Elowen' : busy ? 'Opening…' : 'Reopen this page to install'}
        </Button>
        {outcome === 'accepted' ? <Badge tone="ok">installed</Badge> : null}
        {outcome === 'dismissed' ? <Badge tone="outline">cancelled</Badge> : null}
      </div>
      <p className="tiny" style={{ marginTop: 8 }}>
        Offline support covers the whole app. The two optional engines (letters OCR, speech
        transcript) additionally download once from Settings below — then they work offline too.
      </p>
    </Card>
  );
}

/* ---------- Engines ---------- */

function EnginesCard() {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [pct, setPct] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, boolean> = {};
      for (const def of ENGINES) next[def.id] = await engineInstalled(def);
      if (!cancelled) setStatuses(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (def: (typeof ENGINES)[number]) => {
    setBusy((b) => ({ ...b, [def.id]: true }));
    setErr(null);
    try {
      await installEngine(def, (p) => setPct((x) => ({ ...x, [def.id]: p })));
      setStatuses((s) => ({ ...s, [def.id]: true }));
    } catch (e) {
      setErr({ id: def.id, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy((b) => ({ ...b, [def.id]: false }));
    }
  };

  return (
    <Card>
      <Eyebrow>Optional engines — download once, use offline</Eyebrow>
      {ENGINES.map((def) => (
        <div key={def.id} style={{ borderBottom: '1px dashed var(--line)', padding: '10px 0' }}>
          <div className="row spread">
            <b style={{ fontSize: '0.94rem' }}>{def.label}</b>
            <Badge tone={statuses[def.id] ? 'ok' : 'outline'}>
              {statuses[def.id] ? 'offline-ready' : 'not downloaded'}
            </Badge>
          </div>
          <p className="tiny">{def.detail}</p>
          <p className="tiny" style={{ marginTop: 2 }}>
            Used by: {def.usedBy} · {def.wireSize} · {def.licence}
          </p>
          <div className="row" style={{ marginTop: 6 }}>
            {statuses[def.id] ? (
              <Button small onClick={() => run(def)} disabled={!!busy[def.id]}>
                Re-download
              </Button>
            ) : (
              <Button accent small onClick={() => run(def)} disabled={!!busy[def.id]}>
                {busy[def.id] ? 'Downloading…' : `Install (${def.wireSize})`}
              </Button>
            )}
            {busy[def.id] && pct[def.id] > 0 ? (
              <div className="progress" style={{ flex: 1 }} aria-label="download progress">
                <span style={{ width: `${pct[def.id]}%` }} />
              </div>
            ) : null}
            {busy[def.id] && !pct[def.id] ? <span className="tiny">downloading — big files show no % until done</span> : null}
          </div>
          {err && err.id === def.id ? <div className="feedback bad">{err.text}</div> : null}
        </div>
      ))}
      <div className="row" style={{ marginTop: 10 }}>
        <Button
          danger
          small
          onClick={async () => {
            await clearEngineCache();
            setStatuses(Object.fromEntries(ENGINES.map((d) => [d.id, false])));
          }}
        >
          Remove downloaded engines
        </Button>
      </div>
      <Callout>
        Engines are optional. Without them the labs still score everything measurable offline — and
        they never invent text.
      </Callout>
    </Card>
  );
}

/* ---------- Data ---------- */

function DataCard({ session }: { session: ReturnType<typeof getSession> }) {
  const snap = getSnapshot();
  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'elowen',
      account: session ? { name: session.name, email: session.email } : 'guest',
      events: snap.events,
      lessons: snap.lessons,
      srs: snap.srs,
      handwriting: snap.handwriting,
      speaking: snap.speaking,
      settings: snap.settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elowen-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card>
      <Eyebrow>Your data</Eyebrow>
      <p className="tiny">
        Everything lives in this browser{session ? ` (account: ${session.email})` : ' (guest space)'}.
        No cloud, no analytics. Export any time; the file is readable JSON.
      </p>
      <div className="row">
        <Button accent onClick={exportJson}>
          Export all data (JSON)
        </Button>
      </div>
    </Card>
  );
}

function DataWipeCard({ session }: { session: ReturnType<typeof getSession> }) {
  const [confirm, setConfirm] = useState(false);
  const [wiped, setWiped] = useState(false);
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      {wiped ? (
        <div className="feedback ok" style={{ flex: 1 }}>
          All Elowen data erased — a fresh start begins on reload.
        </div>
      ) : confirm ? (
        <Button
          danger
          onClick={async () => {
            await wipeAllDatabases();
            await wipeEverything();
            setConfirm(false);
            setWiped(true);
          }}
        >
          Yes, erase everything
        </Button>
      ) : (
        <Button danger onClick={() => setConfirm(true)}>
          Erase all data
        </Button>
      )}
      {confirm ? (
        <Button onClick={() => setConfirm(false)}>Cancel</Button>
      ) : null}
      <span className="tiny">{session ? '(this account and the guest space)' : '(the guest space)'}</span>
    </div>
  );
}

/* ---------- Never does ---------- */

function WhatItNeverDoes() {
  return (
    <Card>
      <Eyebrow>What Elowen never does</Eyebrow>
      <ul className="list-plain tiny">
        <li>No generative AI anywhere.</li>
        <li>No cloud sync, no analytics, no cookies, no server. The optional Google sign-in only
          names a local profile; its credential is processed by Google and decoded locally.</li>
        <li>Photos and audio are analysed in this tab and never uploaded.</li>
        <li>Rule-based grammar explanations — it says when it is unsure.</li>
      </ul>
      <div className="row">
        <Badge tone="ok">local-only</Badge>
        <Badge tone="ok">deterministic</Badge>
        <Badge tone="ok">no tracking</Badge>
      </div>
    </Card>
  );
}
