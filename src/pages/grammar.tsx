import { useMemo, useState } from 'react';
import { checkGrammar } from '../engines/grammar/grammar';
import { logGrammarCheck, splitSentences } from '../storage/appstore';
import { Button, Card, Badge, EmptyState, Eyebrow, Callout } from '../components/ui';
import type { GrammarIssue, IssueSeverity } from '../types';

const SAMPLES = [
  'he goes to school every day',
  'They is my cousins.',
  'I did not went home yesterday.',
  'She has finished her homework.',
  'My friends has arrived.',
  'between you and I, it is fine',
  'i borrowed a pen from she',
  'on Monday we visited the museum.',
  'I will discuss about the plan.',
  'the the results were good',
  'He teached english last year.',
  'Send it to her before Friday.',
];

const SEVERITY_INFO: Record<IssueSeverity, { label: string; tone: 'err' | 'copper' | 'outline' }> = {
  error: { label: 'error', tone: 'err' },
  possible: { label: 'possible', tone: 'copper' },
  style: { label: 'style', tone: 'outline' },
};

/** Grammar Lab: rule-based checker with transparent, explainable output. */
export function GrammarPage() {
  const [text, setText] = useState(
    'He was late because he miss the bus, and the the teacher asked why.',
  );
  const [saved, setSaved] = useState<string | null>(null);
  const result = useMemo(() => checkGrammar(text), [text]);
  const sentences = useMemo(() => splitSentences(text), [text]);

  const counts = useMemo(() => {
    const c: Record<IssueSeverity, number> = { error: 0, possible: 0, style: 0 };
    for (const it of result.issues) c[it.severity]++;
    return c;
  }, [result]);

  return (
    <>
      <h1>Grammar Lab</h1>
      <p className="muted" style={{ marginTop: -4 }}>
        A transparent rule engine — not a language model. It explains each finding, never
        silently rewrites your text, and tells you when it cannot be sure.
      </p>

      <Card>
        <Eyebrow>Check a sentence or paragraph</Eyebrow>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(null);
          }}
          rows={4}
          style={{
            width: '100%',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '10px 13px',
            background: '#fffef9',
            resize: 'vertical',
            fontSize: '1.02rem',
            lineHeight: 1.6,
          }}
          aria-label="Text to check"
          spellCheck={false}
          placeholder="Type or paste the text you want to check…"
        />
        <div className="row spread" style={{ marginTop: 8 }}>
          <span className="tiny">
            {result.tokenCount} words · {sentences.length} sentence{sentences.length === 1 ? '' : 's'}
          </span>
          <div className="row" style={{ gap: 8 }}>
            {text ? (
              <Button
                small
                onClick={() => {
                  setText('');
                  setSaved(null);
                }}
              >
                Clear
              </Button>
            ) : null}
            <Button
              accent
              small
              disabled={!text.trim() || saved != null}
              onClick={async () => {
                await logGrammarCheck(text, result.issues.length);
                setSaved(
                  `Recorded: ${sentences.length} sentence${sentences.length === 1 ? '' : 's'}, ${result.issues.length} finding${result.issues.length === 1 ? '' : 's'}.`,
                );
              }}
            >
              Record this check
            </Button>
          </div>
        </div>
        {saved ? <p className="tiny" style={{ marginTop: 6 }}>{saved}</p> : null}
      </Card>

      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        {(['error', 'possible', 'style'] as const).map((sev) => (
          <Badge key={sev} tone={SEVERITY_INFO[sev].tone}>
            {counts[sev]} {SEVERITY_INFO[sev].label}
          </Badge>
        ))}
        <span className="tiny">
          error = a definite violation · possible = likely, check it · style = a smoother option
        </span>
      </div>

      {result.issues.length === 0 ? (
        <>
          <Card className="tight">
            <div className="feedback ok">
              {result.tokenCount === 0
                ? 'Type something to analyse.'
                : 'No rule matches. The rule-based engine cannot fully judge style or rare grammar — absence of findings is not a certificate of correctness.'}
            </div>
          </Card>
          <RuleOverview />
        </>
      ) : (
        <>
          {result.issues.map((it, i) => (
            <IssueCard key={i} issue={it} text={text} />
          ))}
          <RuleOverview />
        </>
      )}

      <Card>
        <Eyebrow>Try common learner patterns</Eyebrow>
        <div className="tiles">
          {SAMPLES.map((s) => (
            <button key={s} className="tile" onClick={() => setText(s)}>
              {s}
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}

function RuleOverview() {
  return (
    <Card>
      <Eyebrow>What the rules cover (and what they do not)</Eyebrow>
      <ul className="list-plain" style={{ fontSize: '0.9rem' }}>
        <li>
          <b>Subject–verb agreement</b> for common subjects (he/she/it, I, we/you/they,
          common nouns) — a wider range of subjects would need more data.
        </li>
        <li><b>have/has, is/are, was/were</b> mismatches against known subjects.</li>
        <li><b>did/does + past or -s verb</b> (auxiliary + base-form).</li>
        <li><b>Pronoun case</b> after common prepositions (to/with/for/between …).</li>
        <li><b>Articles and time</b>: in/on/at with days, months, and parts of day — general a/an coverage lives in the Learn lessons.</li>
        <li><b>Redundant or wrong prepositions</b>: discuss about, married with, depend of, listen (the), explain me, arrive to, return back.</li>
        <li><b>Punctuation</b>: repeated functions words, doubled punctuation, missing space, capital “I”, sentence-start capital.</li>
        <li><b>Spelling</b>: authored misspelling table + dictionary distance-1 suggestions (labelled <i>possible</i>).</li>
      </ul>
      <Callout>
        It will never catch all errors in arbitrary English. When a rule does not fire, the
        sentence may still be wrong — that limitation is part of the design, not a bug.
      </Callout>
    </Card>
  );
}

/** Show a window of text around the finding instead of the whole document. */
function windowAround(text: string, start: number, end: number, pad = 42): {
  before: string;
  hit: string;
  after: string;
} {
  const from = Math.max(0, start - pad);
  const to = Math.min(text.length, end + pad);
  return {
    before: (from > 0 ? '…' : '') + text.slice(from, start),
    hit: text.slice(start, end) || '…',
    after: text.slice(end, to) + (to < text.length ? '…' : ''),
  };
}

function IssueCard({ issue, text }: { issue: GrammarIssue; text: string }) {
  const w = windowAround(text, issue.start, issue.end);
  const fixed = text.slice(0, issue.start) + (issue.suggestion ?? issue.excerpt) + text.slice(issue.end);
  return (
    <div className={`issue ${issue.severity}`}>
      <div className="head">
        <Badge tone={SEVERITY_INFO[issue.severity].tone}>{issue.severity}</Badge>
        <span>{issue.message}</span>
        <span className="rid">{issue.ruleId}</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <div className="sent">
          {w.before}
          <mark className="hit">{w.hit}</mark>
          {w.after}
        </div>
      </div>
      <p style={{ fontSize: '0.9rem', margin: '8px 0 0' }}>{issue.explanation}</p>
      {issue.suggestion ? (
        <p className="fix" style={{ margin: '6px 0 0' }}>
          Suggested fix: <b>{issue.suggestion}</b>
          <span className="tiny" style={{ display: 'block' }}>
            {fixed.length > 160 ? fixed.slice(0, 160) + '…' : fixed}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export {}; // keeps the file a module when tree-shaking
