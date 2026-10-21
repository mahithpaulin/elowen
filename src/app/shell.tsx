import React, { useEffect, useState } from 'react';
import { useHashRoute, navigate } from './router';
import { getSnapshot, subscribe, totalXp } from '../storage/appstore';
import { levelFromXp } from '../engines/scoring/scoring';
import { getSession } from '../storage/accounts';
import { canInstall, onInstallAvailability, showInstall } from './pwa';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', glyph: '⌂' },
  { to: '/learn', label: 'Learn', glyph: '✎' },
  { to: '/handwriting', label: 'Handwriting Lab', glyph: '✍' },
  { to: '/speaking', label: 'Speaking Lab', glyph: '🎙' },
  { to: '/grammar', label: 'Grammar Lab', glyph: '⚙' },
  { to: '/vocabulary', label: 'Vocabulary', glyph: '❖' },
  { to: '/reading', label: 'Reading', glyph: '📖' },
  { to: '/progress', label: 'Progress', glyph: '▲' },
  { to: '/settings', label: 'Settings', glyph: '⚙' },
];

/** Re-render helper: subscribing to appstore changes remounts content. */
function useStateKey(): [{}, (v: {}) => void] {
  const [v, setV] = useState({});
  return [v, setV];
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { path, parts } = useHashRoute();
  const [drawer, setDrawer] = useState(false);
  const [installable, setInstallable] = useState(() => canInstall());
  const [, reset] = useStateKey();
  const snap = getSnapshot();
  const account = getSession();
  useEffect(() => subscribe(() => reset({})), []);
  useEffect(() => setDrawer(false), [path]);
  useEffect(onInstallAvailability(() => setInstallable(canInstall())), []);

  const install = async () => {
    const outcome = await showInstall();
    if (outcome === 'unavailable') navigate('/settings');
  };

  // auto-seed demo path check
  const xp = totalXp(snap.events);
  const level = levelFromXp(xp);

  const current = '/' + (parts[0] ?? 'dashboard');

  const link = (n: (typeof NAV)[number]) => (
    <a href={`#${n.to}`} aria-current={current === n.to ? 'page' : undefined}>
      <span className="glyph" aria-hidden="true">
        {n.glyph}
      </span>
      {n.label}
    </a>
  );

  return (
    <div id="app-shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className={`side ${drawer ? 'open' : ''}`} aria-label="Main navigation">
        <div className="brand">
          <div className="mark" aria-hidden="true">
            E
          </div>
          <div>
            <div className="name">Elowen</div>
            <div className="tag">Write with precision. Speak with clarity.</div>
          </div>
        </div>
        <ul className="nav">{NAV.map(link)}</ul>
        {installable ? (
          <button className="btn accent small" style={{ margin: '10px 11px 0' }} onClick={install}>
            ⤓ Install as app
          </button>
        ) : null}
        {account ? (
          <div className="row" style={{ margin: '12px 11px 0', gap: 8 }}>
            {account.picture ? (
              <img
                src={account.picture}
                alt=""
                width={26}
                height={26}
                style={{ borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)' }}
              />
            ) : null}
            <span style={{ fontSize: '0.78rem', color: '#d8e4dd' }}>{account.name}</span>
          </div>
        ) : null}
        <div className="foot">
          Level {level} · {xp} learn moment{xp === 1 ? '' : 's'} collected.
          {account ? <><br />Storage: {account.email} (this device)</> : <><br />All data stays on this device.</>}
        </div>
      </aside>
      {drawer ? (
        <div
          className="scrim"
          onClick={() => setDrawer(false)}
          role="button"
          aria-label="Close menu"
          tabIndex={-1}
        />
      ) : null}
      <div>
        <div className="topbar">
          <div className="mark" aria-hidden="true">
            E
          </div>
          <div className="title">Elowen</div>
          <button onClick={() => setDrawer((d) => !d)} aria-expanded={drawer} aria-label="Toggle menu">
            Menu
          </button>
        </div>
        <main id="main" className="page">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Programmatic navigation helper for buttons. */
export function Go({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <a
      href={`#${to}`}
      style={{ textDecoration: 'none' }}
      onClick={() => navigate(to)}
    >
      {children}
    </a>
  );
}
