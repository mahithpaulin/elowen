import { useState } from 'react';
import { getSnapshot, saveSettings, wipeEverything } from '../storage/appstore';
import { describeSpeechEngineAvailability } from '../engines/recognizers/asr';
import { Card, Button, Eyebrow, Callout, Badge } from '../components/ui';

/** Settings: display options, data ownership, and engine availability. */
export function SettingsPage() {
  const snap = getSnapshot();
  const s = snap.settings;
  const [confirm, setConfirm] = useState(false);
  const [wiped, setWiped] = useState(false);

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'elowen',
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
    <>
      <h1>Settings</h1>
      <p className="muted" style={{ marginTop: -4 }}>
        Appearance, ownership of your data, and what each optional engine needs.
      </p>

      <div className="grid2">
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

        <Card>
          <Eyebrow>Your data</Eyebrow>
          <p className="tiny">
            Everything lives in this browser (IndexedDB + localStorage). No account, no sync,
            no analytics. Export any time; the file is fully human-readable.
          </p>
          <div className="row">
            <Button accent onClick={exportJson}>
              Export all data (JSON)
            </Button>
            {confirm ? (
              <>
                <Button
                  danger
                  onClick={async () => {
                    await wipeEverything();
                    setConfirm(false);
                    setWiped(true);
                  }}
                >
                  Yes, erase everything
                </Button>
                <Button onClick={() => setConfirm(false)}>Cancel</Button>
              </>
            ) : (
              <Button danger onClick={() => setConfirm(true)}>
                Erase all data
              </Button>
            )}
          </div>
          {wiped ? <div className="feedback ok">All local Elowen data erased. A fresh start begins on reload.</div> : null}
        </Card>

        <Card>
          <Eyebrow>Optional engines</Eyebrow>
          <p className="tiny" style={{ fontWeight: 600 }}>{describeSpeechEngineAvailability().title}</p>
          <p className="tiny">{describeSpeechEngineAvailability().detail}</p>
          <p className="tiny" style={{ marginTop: 8 }}>
            <b>Handwriting OCR</b> — tesseract.js loaded once from a CDN when you press “Check
            letters”. Runs locally afterwards.
          </p>
          <Callout>
            Both engines are strictly optional. Without them the labs still score everything
            that is measurable offline — and they never invent text.
          </Callout>
        </Card>

        <Card>
          <Eyebrow>What Elowen never does</Eyebrow>
          <ul className="list-plain tiny">
            <li>No generative AI anywhere.</li>
            <li>No account, no cloud sync, no analytics, no cookies.</li>
            <li>Photos and audio are analysed in this tab and never uploaded.</li>
            <li>Rule-based grammar explanations — it says when it is unsure.</li>
          </ul>
          <div className="row">
            <Badge tone="ok">local-only</Badge>
            <Badge tone="ok">deterministic</Badge>
            <Badge tone="ok">no tracking</Badge>
          </div>
        </Card>
      </div>

      {snap.settings.demoSeeded ? (
        <p className="tiny" style={{ marginTop: 12 }}>
          Sample data was explored earlier — erase it with the button above when ready.
        </p>
      ) : null}
    </>
  );
}
