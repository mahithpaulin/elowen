import { Component, useEffect, useState, type ReactNode } from 'react';
import { Shell } from './app/shell';
import { useHashRoute, navigate } from './app/router';
import { loadAll, getSnapshot, subscribe, wipeEverything, seedDemo } from './storage/appstore';
import { Loading, ErrorBoundaryFallback } from './components/ui';
import {
  DashboardPage,
  LearnPage,
  LessonPage,
  GrammarPage,
  VocabularyPage,
  ReadingPage,
  HandwritingPage,
  SpeakingPage,
  ProgressPage,
  SettingsPage,
} from './pages';

/** ClassError boundary — hooks can't catch render errors. */
class PageBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    return this.state.error ? (
      <ErrorBoundaryFallback error={this.state.error} />
    ) : (
      this.props.children
    );
  }
}

export function App() {
  return <PageBoundary><AppInner /></PageBoundary>;
}

function AppInner() {
  const { parts } = useHashRoute();
  const [snap, setSnap] = useState(getSnapshot());

  useEffect(() => {
    void loadAll();
    return subscribe(() => setSnap(getSnapshot()));
  }, []);

  if (!snap.loaded) return <Loading note="Opening your local data…" />;

  const onboarding = snap.events.length === 0;
  if (onboarding && (parts[0] ?? 'dashboard') === 'dashboard') {
    return (
      <Shell>
        <Welcome
          onDemo={async () => {
            await seedDemo();
            navigate('/dashboard');
          }}
        />
      </Shell>
    );
  }

  switch (parts[0]) {
    case undefined:
    case 'dashboard':
      return (
        <Shell>
          <DashboardPage />
        </Shell>
      );
    case 'learn':
      return (
        <Shell>
          {parts.length >= 3 ? (
            <LessonPage unitId={parts[1]!} lessonId={parts[2]!} />
          ) : (
            <LearnPage />
          )}
        </Shell>
      );
    case 'grammar':
      return (
        <Shell>
          <GrammarPage />
        </Shell>
      );
    case 'vocabulary':
      return (
        <Shell>
          <VocabularyPage />
        </Shell>
      );
    case 'reading':
      return (
        <Shell>
          <ReadingPage passageId={parts[1]} />
        </Shell>
      );
    case 'handwriting':
      return (
        <Shell>
          <HandwritingPage />
        </Shell>
      );
    case 'speaking':
      return (
        <Shell>
          <SpeakingPage />
        </Shell>
      );
    case 'progress':
      return (
        <Shell>
          <ProgressPage />
        </Shell>
      );
    case 'settings':
      return (
        <Shell>
          <SettingsPage />
        </Shell>
      );
    default:
      return (
        <Shell>
          <div className="state">
            <div className="big">Page not found</div>
            <button className="btn primary" onClick={() => navigate('/dashboard')}>
              Back to dashboard
            </button>
          </div>
        </Shell>
      );
  }
}

/** Welcome screen for a brand-new device (no events recorded yet). */
function Welcome({ onDemo }: { onDemo: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="hero">
        <h1>Welcome to Elowen</h1>
        <p>
          Write with precision. Speak with clarity. Elowen tracks your English lessons,
          analyses handwriting photos with deterministic image processing, and builds
          speaking practice around offline speech tools — all on your own device.
        </p>
        <div className="chiprow">
          <span className="chip">No account</span>
          <span className="chip">No uploads</span>
          <span className="chip">No generative AI</span>
        </div>
      </div>
      <div className="grid2">
        <div className="card">
          <h3>Start learning</h3>
          <p className="muted">Open the curriculum and finish your first lesson. Your progress stays private on this device.</p>
          <button
            className="btn primary"
            onClick={() => navigate('/learn')}
          >
            Curriculum →
          </button>
        </div>
        <div className="card">
          <h3>See a demo dashboard first</h3>
          <p className="muted">
            Loads labelled sample data so you can see how the dashboard looks. Wipe it from
            Settings anytime — real work then starts from zero.
          </p>
          <button
            className="btn accent"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onDemo();
            }}
          >
            {busy ? 'Loading sample…' : 'Load sample data'}
          </button>
        </div>
        <div className="card">
          <h3>Reset this device</h3>
          <p className="muted">Remove every trace of Elowen data from this browser.</p>
          <button
            className="btn danger"
            onClick={async () => {
              await wipeEverything();
              navigate('/dashboard');
            }}
          >
            Wipe local data
          </button>
        </div>
      </div>
    </>
  );
}
