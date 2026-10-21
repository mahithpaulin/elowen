/** Handwriting Lab exercise set — reference sentences for copy work. */

export interface HandwritingExercise {
  id: string;
  title: string;
  level: 'beginner' | 'intermediate';
  reference: string;
  focus: string; // human-readable focus, e.g. "even word spacing"
  kind: 'letters' | 'sentence' | 'paragraph';
}

export const HANDWRITING_EXERCISES: HandwritingExercise[] = [
  {
    id: 'hw-letters-cap',
    title: 'Capital letters A–E',
    level: 'beginner',
    reference: 'A B C D E',
    focus: 'Even letter heights across the row',
    kind: 'letters',
  },
  {
    id: 'hw-letters-cap-fj',
    title: 'Capital letters F–J',
    level: 'beginner',
    reference: 'F G H I J',
    focus: 'Upright slant, equal widths',
    kind: 'letters',
  },
  {
    id: 'hw-letters-low-a-e',
    title: 'Lowercase a–e',
    level: 'beginner',
    reference: 'a b c d e',
    focus: 'Consistent round shapes',
    kind: 'letters',
  },
  {
    id: 'hw-w-short',
    title: 'Short words',
    level: 'beginner',
    reference: 'cat dog pen sun map',
    focus: 'Clear word gaps',
    kind: 'sentence',
  },
  {
    id: 'hw-days',
    title: 'Days of the week',
    level: 'beginner',
    reference: 'Monday Tuesday Wednesday',
    focus: 'Even rhythm and joins',
    kind: 'sentence',
  },
  {
    id: 'hw-s1',
    title: 'Copy a sentence',
    level: 'beginner',
    reference: 'The cat sits on the warm roof.',
    focus: 'Aligned baselines, steady spacing',
    kind: 'sentence',
  },
  {
    id: 'hw-s2',
    title: 'Copy a longer sentence',
    level: 'intermediate',
    reference: 'She reads one page every night before the lamp is switched off.',
    focus: 'Letter-size consistency on long words',
    kind: 'sentence',
  },
  {
    id: 'hw-s3',
    title: 'Two-line copy',
    level: 'intermediate',
    reference: 'We walked to the field and watched the sun go down. Then we walked back slowly.',
    focus: 'Line spacing between the two lines',
    kind: 'paragraph',
  },
  {
    id: 'hw-drill-comma',
    title: 'Comma drill',
    level: 'intermediate',
    reference: 'Once, long ago, a king, a carpenter and a cook walked together.',
    focus: 'Tidy commas and clear gaps',
    kind: 'sentence',
  },
  {
    id: 'hw-drill-numbers',
    title: 'Numbers',
    level: 'beginner',
    reference: '1 2 3 4 5 6 7 8 9 10',
    focus: 'Same height for digits',
    kind: 'letters',
  },
];

/** Speaking Lab exercise set. */
export interface SpeakingExercise {
  id: string;
  title: string;
  level: 'beginner' | 'intermediate';
  target: string;
  focus: string;
}

export const SPEAKING_EXERCISES: SpeakingExercise[] = [
  {
    id: 'sp-greet',
    title: 'Greet and introduce',
    level: 'beginner',
    target: 'Good morning. My name is Beena.',
    focus: 'Full stops = short pause with a fall in voice.',
  },
  {
    id: 'sp-days',
    title: 'Days of the week',
    level: 'beginner',
    target: 'Monday, Tuesday, Wednesday, Thursday and Friday.',
    focus: 'Small rise on the commas, fall on the last word.',
  },
  {
    id: 'sp-count',
    title: 'Counting two to ten',
    level: 'beginner',
    target: 'Two, three, four, five, six, seven, eight, nine, ten.',
    focus: 'Even rhythm; do not rush five or nine.',
  },
  {
    id: 'sp-shop',
    title: 'At the shop',
    level: 'beginner',
    target: 'I would like one kilogram of tomatoes, please.',
    focus: 'Politeness: gentle fall on please.',
  },
  {
    id: 'sp-weather',
    title: 'Weather talk',
    level: 'beginner',
    target: 'It is raining heavily, so take an umbrella.',
    focus: 'the so-clause starts on a new breath.',
  },
  {
    id: 'sp-apology',
    title: 'Apologise politely',
    level: 'beginner',
    target: 'I am sorry. I will be more careful next time.',
    focus: 'Two short sentences, both falling.',
  },
  {
    id: 'sp-story-open',
    title: 'Story opening',
    level: 'intermediate',
    target: 'Long ago, a young sailor lived on a quiet island.',
    focus: 'Pause after “Long ago”; keep long-ago vowels clean.',
  },
  {
    id: 'sp-news-report',
    title: 'Report an event',
    level: 'intermediate',
    target: 'The library will stay open until nine o’clock this evening.',
    focus: 'Practise the l in open and full o’clock.',
  },
  {
    id: 'sp-interview',
    title: 'Interview answer',
    level: 'intermediate',
    target: 'I worked with airports documentation for three years, and I enjoyed the detail.',
    focus: 'Content words louder, function words lighter.',
  },
  {
    id: 'sp-reading-peace',
    title: 'Reading aloud: short line',
    level: 'beginner',
    target: 'The lake offers peace before dawn.',
    focus: 'Vowels: lake, peace, dawn.',
  },
  {
    id: 'sp-tongue',
    title: 'Slow tongue-twister',
    level: 'intermediate',
    target: 'She sells sea shells slowly on the shining shore.',
    focus: 'Clarity first; speed later.',
  },
  {
    id: 'sp-request',
    title: 'Make a request',
    level: 'beginner',
    target: 'Could you please help me lift this box?',
    focus: 'Rising voice on the question.',
  },
];
