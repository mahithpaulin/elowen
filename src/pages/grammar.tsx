import { useMemo, useState } from 'react';
import { checkGrammar } from '../engines/grammar/grammar';
import { getSnapshot, logGrammarCheck } from '../storage/appstore';
import { Button, Card, Badge, EmptyState, Eyebrow, Callout } from '../components/ui';
import type { GrammarIssue } from '../types';

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
];

/** Grammar Lab: rule-based checker with transparent, explainable output. */
export function GrammarPage() {
  const [text, setText] = useState('He was late because he miss the bus, and the the teacher asked why.');
  const result = useMemo(() => checkGrammar(text), [text]);

  const graded = useMemo(() => seedGrades(), []);

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
          onChange={(e) => setText(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '10px 13px',
            background: '#fffef9',
            resize: 'vertical',
          }}
          aria-label="Text to check"
        />
        <div className="row spread" style={{ marginTop: 8 }}>
          <span className="tiny">{result.tokenCount} words tokenised</span>
          <Button
            accent
            small
            onClick={() => {
              void logGrammarCheck(result.issues.length);
            }}
          >
            Record this check to progress
          </Button>
        </div>
      </Card>

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
        result.issues.map((it, i) => <IssueCard key={i} issue={it} text={text} />)
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
        <div className="row" style={{ marginTop: 10 }}>
          {(['error', 'possible', 'style'] as const).map((sev) => (
            <Badge key={sev} tone={sev === 'error' ? 'err' : 'outline'}>
              {graded[sev]}
            </Badge>
          ))}
        </div>
      </Card>
    </>
  );
}

function seedGrades(): Record<'error' | 'possible' | 'style', string> {
  void getSnapshot();
  return {
    error: definite(),
    possible: probable(),
    style: stylistic(),
  };
}
function definite(): string {
  return 'error — the rule catches a definite violation';
}
function probable(): string {
  return 'possible — likely issue, review it';
}
function stylistic(): string {
  return 'style — smoother alternative exists';
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

function IssueCard({ issue, text }: { issue: GrammarIssue; text: string }) {
  return (
    <div className={`issue ${issue.severity}`}>
      <div className="head">
        <Badge tone={issue.severity === 'error' ? 'err' : issue.severity === 'possible' ? 'copper' : 'outline'}>
          {issue.severity}
        </Badge>
        <span>{issue.message}</span>
        <span className="rid">{issue.ruleId}</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <MarkedExcerpt text={text} start={issue.start} end={issue.end} />
      </div>
      <p style={{ fontSize: '0.9rem', margin: '8px 0 0' }}>{issue.explanation}</p>
      {issue.suggestion ? (
        <p className="fix" style={{ margin: '6px 0 0' }}>
          Suggested fix:{' '}
          <b>
            {text.slice(0, issue.start)}
            {issue.suggestion}
            {text.slice(issue.end)}
          </b>
        </p>
      ) : null}
    </div>
  );
}

function MarkedExcerpt({ text, start, end }: { text: string; start: number; end: number }) {
  return (
    <div className="sent">
      {text.slice(0, start)}
      <mark className="hit">{text.slice(start, end) || '…'}</mark>
      {text.slice(end)}
    </div>
  );
}

export {}; // keeps the file a module when tree-shaking
