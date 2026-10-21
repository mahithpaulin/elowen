import type { UnitData } from '../../types';

export const UNITS: UnitData[] = [
  {
    id: 'u-foundation',
    title: 'Foundations',
    blurb: 'Alphabet, sounds and everyday words.',
    lessons: [
      {
        id: 'l-beta-alpha',
        title: 'Each letter has a sound',
        level: 'beginner',
        topic: 'alphabet',
        explanation:
          'English has 26 letters: capitals A–Z and small a–z. A letter can sound different in different words — the letter \"c\" sounds like /k/ in cat, /s/ in city.',
        examples: [
          'cat — /k/',
          'ice — /s/',
          'gum — /g/',
          'gem — /dʒ/',
        ],
        exercises: [
          {
            type: 'mcq',
            prompt: 'Which word has the /k/ sound for the letter c?',
            options: ['coat', 'city', 'dance', 'cycle'],
            answerIndex: 0,
            explanation: 'In \"coat\" c says /k/. In city and dance it says /s/ before e, i, y.',
          },
          {
            type: 'mcq',
            prompt: 'Which letters are vowels?',
            options: ['a, e, i, o, u', 'b, c, d, f', 'a, b, c', 'x, y, z'],
            answerIndex: 0,
            explanation: 'a, e, i, o and u are vowels. y can act as a vowel too (happy) but it is not in the base set.',
          },
          {
            type: 'type',
            prompt: 'Write the small (lowercase) form of the letter B.',
            accept: ['b'],
            explanation: 'Capital B → small b.',
          },
        ],
      },
      {
        id: 'l-beta-vocab',
        title: 'Words you hear every day',
        level: 'beginner',
        topic: 'vocabulary-basic',
        explanation:
          'Build your speaking English from concrete things around you: family, food, home. Concrete learning: say the word as you touch the object.',
        examples: ['school — a place where you learn', 'chair — furniture you sit on', 'water — the drink we all need'],
        exercises: [
          {
            type: 'mcq',
            prompt: 'Which one is a fruit?',
            options: ['apple', 'table', 'window', 'teacher'],
            answerIndex: 0,
            explanation: 'An apple is a fruit. The rest are furniture and people.',
          },
          {
            type: 'mcq',
            prompt: 'You drink…',
            options: ['water', 'water bottle', 'wetter', 'watered'],
            answerIndex: 0,
            explanation: '\"Water” is the liquid. Water bottles hold it.',
          },
          {
            type: 'mcq',
            prompt: 'Which word shows a place where you get medical help?',
            options: ['hospital', 'market', 'library', 'kitchen'],
            answerIndex: 0,
            explanation: 'Hospital = medical care. Library = books.',
          },
        ],
      },
    ],
  },
  {
    id: 'u-parts-speech',
    title: 'Parts of speech',
    blurb: 'Nouns, verbs, adjectives, adverbs.',
    lessons: [
      {
        id: 'l-pos-noun-verb',
        title: 'Nouns and verbs',
        level: 'beginner',
        topic: 'parts-of-speech',
        explanation:
          'A noun names a person, place, thing or idea (teacher, park, hope). A verb shows action or state (run, is, seem). Most English sentences contain a noun phrase + a verb phrase.',
        examples: [
          'The dog (noun) barks (verb).',
          'Mira (noun) teaches (verb) history.',
          'Rain fell all morning.',
        ],
        exercises: [
          {
            type: 'mcq',
            prompt: 'Which word is a verb?',
            options: ['swim', 'river', 'blue', 'quickly'],
            answerIndex: 0,
            explanation: 'Swim is an action. River is a noun, blue is an adjective, quickly is an adverb.',
          },
          {
            type: 'mcq',
            prompt: 'Which one is a noun?',
            options: ['librarian', 'crazy', 'yell', 'again'],
            answerIndex: 0,
            explanation: 'A librarian is a person.',
          },
          {
            type: 'type',
            prompt: 'In \"The bus stops here\", what is the verb?',
            accept: ['stops'],
            explanation: 'Stops is the action word.',
          },
        ],
      },
      {
        id: 'l-pos-adj-adv',
        title: 'Adjectives describe; adverbs tell how',
        level: 'beginner',
        topic: 'parts-of-speech',
        explanation:
          'Adjectives describe nouns: a bright lamp. Adverbs describe how an action happens, often ending -ly: quickly, softly, happily.',
        examples: ['a quiet room', 'She sings loudly.', 'He adjusted the pose carefully.'],
        exercises: [
          {
            type: 'mcq',
            prompt: 'Choose the adjective: \"The ___ man gave a gift.\"',
            options: ['friendly', 'friendlyly', 'friendliness', 'befriend'],
            answerIndex: 0,
            explanation: '\"Friendly\" describes the man.',
          },
          {
            type: 'mcq',
            prompt: 'She answered the call ___ (quiet).',
            options: ['quietly', 'quiet', 'quietliness', 'quietness'],
            answerIndex: 0,
            explanation: 'It says HOW she answered → adverb quietly.',
          },
          {
            type: 'wordOrder',
            prompt: 'Put correctly: a / brown / small / dog',
            words: ['a', 'brown', 'small', 'dog'],
            answer: 'a small brown dog',
            explanation:
              'English order: determiner, size, colour, noun. Size comes before colour when both describe.',
          },
        ],
      },
    ],
  },
  {
    id: 'u-articles',
    title: 'Articles and determiners',
    blurb: 'a/an/the and this/that/these/those.',
    lessons: [
      {
        id: 'l-art-vowel',
        title: 'a / an before a vowel sound',
        level: 'beginner',
        topic: 'articles',
        explanation:
          'Use \"an\" before vowel SOUNDS (an egg, an hour — same with h: an hour), and \"a\" before consonant sounds (a book, a university — hmm: \"a university\" because uni starts with /j/).',
        examples: ['an apple', 'an hour', 'a pen', 'a university', 'a European city'],
        exercises: [
          {
            type: 'mcq',
            prompt: 'Choose the right article: “___ honest friend is rare.”',
            options: ['an', 'a', 'the', ''],
            answerIndex: 0,
            explanation: 'Honest starts with a silent h — vowel sound /ɒ/ → an.',
          },
          {
            type: 'mcq',
            prompt: '“I waited for ___ hour.”',
            options: ['an', 'a', 'the', 'some'],
            answerIndex: 0,
            explanation: 'Same rule: hour = /aʊə/, vowel sound → an hour.',
          },
          {
            type: 'mcq',
            prompt: '“She is ___ university student.”',
            options: ['a', 'an', 'the', 'some'],
            answerIndex: 0,
            explanation: '\"University\" starts with /juː/ sound (/j/), so \"a\".',
          },
        ],
      },
      {
        id: 'l-art-definite',
        title: 'The vs a-an vs no article',
        level: 'beginner',
        topic: 'articles',
        explanation:
          '\"The\" = a particular one both people know. \"a/an\" = any one of them. No article: plurals/habits, languages, meals, countries (most), abstract ideas.',
        examples: [
          'I saw a dog. The dog was brown. (second mention → the)',
          'Water is free.',
          'I speak English.',
        ],
        exercises: [
          {
            type: 'mcq',
            prompt: '“I bought a pen. ___ pen is blue.”',
            options: ['The', 'A', 'An', '—'],
            answerIndex: 0,
            explanation: 'The listener now knows exactly which pen → the.',
          },
          {
            type: 'mcq',
            prompt: '“Mount Everest is ___ highest mountain.”',
            options: ['the', 'a', 'an', 'this'],
            answerIndex: 0,
            explanation: 'Superlatives take the: the best, the tallest.',
          },
          {
            type: 'mcq',
            prompt: '“We had ___ lunch at one o’clock.”',
            options: ['(no article)', 'a', 'the', 'an'],
            answerIndex: 0,
            explanation: 'Meals take no article by default.',
          },
        ],
      },
    ],
  },
  {
    id: 'u-pronouns',
    title: 'Pronouns',
    blurb: 'I/me, he/him, she/her, they/them and possessives.',
    lessons: [
      {
        id: 'l-prn-subject-object',
        title: 'Subject vs object pronouns',
        level: 'beginner',
        topic: 'pronouns',
        explanation:
          'Subject: I, you, he, she, it, we, they — used for the doer. Object: me, you, him, her, it, us, them — after verbs (call me) and prepositions (with me).',
        examples: ['He called me yesterday.', 'Between you and me…', 'Give it to them.'],
        exercises: [
          {
            type: 'mcq',
            prompt: '“Mira thanked ___ (I) for helping.”',
            options: ['me', 'I', 'myself', 'mine'],
            answerIndex: 0,
            explanation: 'Object of the verb → me.',
          },
          {
            type: 'mcq',
            prompt: '“This is between you and ___.”',
            options: ['me', 'I', 'mine', 'my'],
            answerIndex: 0,
            explanation: 'After a preposition → me.',
          },
          {
            type: 'mcq',
            prompt: '“___ wants tea?” offered the waiter politely. Choose correct subject form.',
            options: ['Who', 'Whom', 'Whomever', 'Whos'],
            answerIndex: 0,
            explanation: 'Subject of an offer → who.',
          },
        ],
      },
      {
        id: 'l-prn-possessive',
        title: 'Possessives: my, mine, theirs',
        level: 'beginner',
        topic: 'pronouns',
        explanation:
          'Adjective possessives come before a noun (my book, their house). Pronoun possessives stand alone (That book is mine).',
        examples: ['my bag / mine', 'her idea / hers', 'their car / theirs'],
        exercises: [
          {
            type: 'mcq',
            prompt: '“This umbrella is ___ (she).”',
            options: ['hers', 'her', 'her’s', 'hers’'],
            answerIndex: 0,
            explanation: 'Standalone → hers.',
          },
          {
            type: 'type',
            prompt: 'Fill in: “We lost ___ tickets.”',
            accept: ['our'],
            explanation: 'Adjective possessive before a noun → our.',
          },
        ],
      },
    ],
  },
  {
    id: 'u-verbs',
    title: 'Verb forms and tenses',
    blurb: 'be/have/do, present, past, future.',
    lessons: [
      {
        id: 'l-verb-be',
        title: 'am / is / are',
        level: 'beginner',
        topic: 'tenses',
        explanation: 'I am, you are, he-she-it is, we are, they are. Questions invert: are you, is she.',
        examples: ['I am fine.', 'She is at work.', 'They are neighbours.'],
        exercises: [
          {
            type: 'mcq',
            prompt: '“My cousins ___ visiting tomorrow.”',
            options: ['are', 'is', 'am', 'be'],
            answerIndex: 0,
            explanation: 'Plural cousins → are.',
          },
          {
            type: 'type',
            prompt: 'Fill in: "You ___ late again!"',
            accept: ['are'],
            explanation: 'You → are.',
          },
          {
            type: 'mcq',
            prompt: '“Where ___ she from?”',
            options: ['is', 'are', 'am', 'were'],
            answerIndex: 0,
            explanation: 'She → is.',
          },
        ],
      },
      {
        id: 'l-verb-present-simple',
        title: 'Present simple: he works',
        level: 'beginner',
        topic: 'tenses',
        explanation: 'Habits and facts. Third person adds -s/-es: he works, she goes, it rains.',
        examples: ['We talk every evening.', 'He takes the bus.'],
        exercises: [
          {
            type: 'mcq',
            prompt: '“My father ___ tea every morning.”',
            options: ['drinks', 'drink', 'drinking', 'drank'],
            answerIndex: 0,
            explanation: 'Third-person singular → drinks.',
          },
          {
            type: 'mcq',
            prompt: '“She ___ to office by 9.”',
            options: ['reaches', 'reach', 'reaching', 'reached'],
            answerIndex: 0,
            explanation: 'She → verb + es',
          },
        ],
      },
      {
        id: 'l-verb-past-simple',
        title: 'Past simple: went, called',
        level: 'beginner',
        topic: 'tenses',
        explanation:
          'Finished actions: add -ed (worked) or use irregular forms (go → went, buy → bought).',
        examples: ['We played outside.', 'She went home early.', 'They bought bread.'],
        exercises: [
          {
            type: 'type',
            prompt: 'Write the past form of go.',
            accept: ['went'],
            explanation: 'go → went.',
          },
          {
            type: 'wordOrder',
            prompt: 'Put correctly: yesterday / I / visited / my grandmother',
            words: ['yesterday', 'I', 'visited', 'my grandmother'],
            answer: 'I visited my grandmother yesterday',
            explanation: 'Subject first, then the verb; time words move to the end (or the very front with comma).',
          },
        ],
      },
    ],
  },
  {
    id: 'u-agreement',
    title: 'Subject–verb agreement',
    blurb: 'The number of the subject matches the verb.',
    lessons: [
      {
        id: 'l-agr-basics',
        title: 'Match the verb to the subject',
        level: 'beginner',
        topic: 'subject-verb-agreement',
        explanation: 'He/she/it + verb-s; I/we/you/they + base verb. “My friends help; my friend helps.”',
        examples: ['They know the answer.', 'My brother knows it too.'],
        exercises: [
          {
            type: 'mcq',
            prompt: '“The students ___ (be) in the lab.”',
            options: ['are', 'is', 'was', 'be'],
            answerIndex: 0,
            explanation: 'Plural → are (present).',
          },
          {
            type: 'mcq',
            prompt: '“Every one of the answers ___ wrong.”',
            options: ['is', 'are', 'were', 'were being'],
            answerIndex: 0,
            explanation: 'The subject is every one, singular → is.',
          },
        ],
      },
    ],
  },
  {
    id: 'u-prepositions',
    title: 'Prepositions',
    blurb: 'in / on / at of place and time.',
    lessons: [
      {
        id: 'l-prep-time',
        title: 'in / on / at (time + days)',
        level: 'beginner',
        topic: 'prepositions',
        explanation:
          'in + months/years/parts of day (in May, in 2009, in the morning). on + days/dates (on Monday, on 4 June). at + clock times, night, noon (at 6 pm, at night).',
        examples: ['in the morning', 'on Friday', 'at 10 o’clock'],
        exercises: [
          {
            type: 'mcq',
            prompt: '“My class starts ___ nine.”',
            options: ['at', 'in', 'on', 'of'],
            answerIndex: 0,
            explanation: 'Clock time → at.',
          },
          {
            type: 'mcq',
            prompt: '“A heavy rain fell ___ Friday evening.”',
            options: ['on', 'in', 'at', 'for'],
            answerIndex: 0,
            explanation: 'Days take on — even with "evening" when the day is named → on Friday evening.',
          },
          {
            type: 'type',
            prompt: 'Fill one word: “Leaves turn gold ___ autumn.”',
            accept: ['in'],
            explanation: 'Seasons → in autumn.',
          },
        ],
      },
    ],
  },
  {
    id: 'u-sentences',
    title: 'Constructing sentences',
    blurb: 'Order, punctuation, capitals.',
    lessons: [
      {
        id: 'l-sent-order',
        title: 'Subject + verb +Object order',
        level: 'beginner',
        topic: 'sentence-construction',
        explanation: 'Standard order → The girl (S) reads (V) a book (O). Not \"Reads the girl a book\" — that\'s the passive when agreement is absent.',
        examples: ['I drink tea.', 'She closed the door.', 'Amit repairs phones for a living.'],
        exercises: [
          {
            type: 'wordOrder',
            prompt: 'Put correctly: the window / opened / Sam',
            words: ['the window', 'opened', 'Sam'],
            answer: 'Sam opened the window',
            explanation: 'Who acts first, then the verb, then what was acted on.',
          },
          {
            type: 'mcq',
            prompt: 'Which is correctly ordered?',
            options: [
              'Mani wrote a comic yesterday.', 
              'Mani yesterday a comic wrote.', 
              'Yesterday wrote Mani a comic.', 
              'A comic Mani yesterday wrote.',
            ],
            answerIndex: 0,
            explanation: 'Time expressions usually go last, not between the verb and its object.',
          },
        ],
      },
      {
        id: 'l-sent-capital',
        title: 'Capital letters end sentences',
        level: 'beginner',
        topic: 'punctuation',
        explanation: 'Full stop ., question mark ?, exclamation ! finish sentences; start the next with a capital letter. Commas , never end a sentence.',
        examples: ['She waved. Then she smiled.', 'Are you coming?!'],
        exercises: [
          {
            type: 'mcq',
            prompt: 'Which punctuation ENDS a question?',
            options: ['?', '!', '.', ','],
            answerIndex: 0,
            explanation: 'If it asks something → ?',
          },
          {
            type: 'type',
            prompt: 'Fix and type: "okay i will call you tomorrow" (one sentence, fix the capital)',
            accept: ['okay i will call you tomorrow', 'okay i will call you tomorrow?'],
            hint: 'Type the sentence with the corrected capital living inside.',
            explanation: 'The pronoun I is always capitalised: Okay, I will call you tomorrow. Note the comma after Okay (optional but polite).',
          },
        ],
      },
    ],
  },
  {
    id: 'u-spelling',
    title: 'Spelling and sounds',
    blurb: 'Common traps like receive, separate.',
    lessons: [
      {
        id: 'l-spell-common',
        title: 'Words that fool everyone',
        level: 'beginner',
        topic: 'spelling',
        explanation:
          'Some words break the noisy rule: i before e except after c (receive), double letters in accommodate, separate has no —e— after p? (sepa-rate).',
        examples: ['believe (noun belief)', 'receipt', 'separate'],
        exercises: [
          {
            type: 'mcq',
            prompt: 'Which spelling is right?',
            options: ['receive', 'recieve', 'receeve', 'receve'],
            answerIndex: 0,
            explanation: 'i before e except after c → receive.',
          },
          {
            type: 'mcq',
            prompt: 'Which spelling is right?',
            options: ['separate', 'seperate', 'sepperate', 'saprate'],
            answerIndex: 0,
            explanation: 'separate — often pronounced sePRate which leads people to drop an e.',
          },
          {
            type: 'type',
            prompt: 'Spell the word meaning all the time: always',
            accept: ['always'],
            explanation: 'always: "al-ways", ends -ays with no extra s.',
          },
        ],
      },
    ],
  },
  {
    id: 'u-conversation-paragraph',
    title: 'Conversation and writing',
    blurb: 'Everyday exchanges; first paragraphs.',
    lessons: [
      {
        id: 'l-conv-intro',
        title: 'Meeting new people',
        level: 'beginner',
        topic: 'conversation',
        explanation: 'Open with Hi/Hello, add a greeting, name, and how you feel: Hi, I’m Beena — nice to meet you.',
        examples: [
          'Hi, I’m Beena.',
          'Hi — I’m Beena, nice to meet you!',
          'How are you today?',
        ],
        exercises: [
          {
            type: 'mcq',
            prompt: 'Someone says “Hello”. Choose the natural reply.',
            options: ['Hi, nice to meet you.', 'I do not.', 'Yes please.', 'Fine rain.'],
            answerIndex: 0,
            explanation: 'Echo and add a friendly phrase.',
          },
          {
            type: 'type',
            prompt: 'Begin a standard self-introduction: “Good morning, my name …” (3)Write the missing word',
            accept: ['is'],
            explanation: 'Use “my name IS <name>.” — many learners also write “my name’s”, and that is fine.',
          },
        ],
      },
      {
        id: 'l-writing-para',
        title: 'Your first paragraph',
        level: 'beginner',
        topic: 'paragraph-writing',
        explanation:
          'Paragraph plan: (1) topic sentence, (2) two or three supporting sentences, (3) wrap-up. Leave a line break between paragraphs.',
        examples: [
          'My Sunday, step by step. I woke up slowly, then walked to the lake, then cooked lunch with my mother.',
        ],
        exercises: [
          {
            type: 'mcq',
            prompt: 'What starts a paragraph?',
            options: ['A topic sentence', 'A random detail', 'A question mark', 'The last idea'],
            answerIndex: 0,
            explanation: 'The topic sentence announces what the paragraph is about.',
          },
          {
            type: 'type',
            prompt: 'Pick the topic sentence for a paragraph about a school trip',
            accept: ['we visited the science museum'],
            explanation: 'A topic sentence gives the main one-line report — not a detail like “the bus was late”.',
          },
        ],
      },
    ],
  },
];

/* ------------------------- intermediate units ------------------------- */

export const INTERMEDIATE_UNITS: UnitData[] = [
  {
    id: 'i-past-perfect',
    title: 'Past tenses in depth',
    blurb: 'Irregular past, past continuous, used to.',
    lessons: [
      {
        id: 'li-past-irregulars',
        title: 'Irregular past verbs',
        level: 'intermediate',
        topic: 'tenses',
        explanation:
          'Common irregulars to memorise in pairs: buy/bought, teach/taught, throw/threw, hold/held, catch/caught, drive/drove.',
        examples: ['She taught us English.', 'He caught the last train.'],
        exercises: [
          {
            type: 'type',
            prompt: 'Past form of teach?',
            accept: ['taught'],
            explanation: 'teach → taught.',
          },
          {
            type: 'mcq',
            prompt: '“The cup ___ when it fell.”',
            options: ['broke', 'broked', 'broken', 'brake'],
            answerIndex: 0,
            explanation: 'break → broke (past), broken (past participle).',
          },
        ],
      },
      {
        id: 'li-used-to',
        title: 'used to vs would for old habits',
        level: 'intermediate',
        topic: 'tenses',
        explanation:
          'used to + verb → past habit/state no longer true. No \"use to\" in the affirmative, no \"did used to\": did not use to.',
        examples: ['I used to play chess.', 'She didn’t use to read at night.'],
        exercises: [
          {
            type: 'mcq',
            prompt: '“As a child I ___ swim every weekend.”',
            options: ['used to', 'use to', 'was used', 'am used'],
            answerIndex: 0,
            explanation: 'used to + base verb for past habits.',
          },
          {
            type: 'type',
            prompt: 'Fix: “He don’t use to smoke.” → write the corrected phrase for the first two words',
            accept: ['he doesn’t use to smoke', "he doesn't use to smoke", 'he did not use to smoke'],
            explanation: 'Negatives: doesn’t/didn’t + use (no d after use).',
          },
        ],
      },
    ],
  },
  {
    id: 'i-perfect',
    title: 'Present perfect vs past simple',
    blurb: 'have/has + past participle when the result counts.',
    lessons: [
      {
        id: 'li-pp-vs-ps',
        title: 'Result or finished time?',
        level: 'intermediate',
        topic: 'tenses',
        explanation:
          'Past simple: finished time (yesterday, in 2009, last week). Present perfect: no finished time or still connects — have/has + participle (have written, has been). Signal words: already, yet, just, ever, since, for.',
        examples: [
          'I visited Delhi in 2019. (done)',
          'I have visited Delhi twice. (still counts now)',
        ],
        exercises: [
          {
            type: 'mcq',
            prompt: '“She ___ here since Monday.”',
            options: ['has been', 'was', 'is being', 'were'],
            answerIndex: 0,
            explanation: 'since + present perfect → has been.',
          },
          {
            type: 'mcq',
            prompt: '“We ___ tennis last Sunday.”',
            options: ['played', 'have played', 'were play', 'has played'],
            answerIndex: 0,
            explanation: 'last Sunday = finished time → past simple played.',
          },
        ],
      },
    ],
  },
  {
    id: 'i-future',
    title: 'Future forms',
    blurb: 'will vs going to vs present continuous.',
    lessons: [
      {
        id: 'li-future',
        title: 'will / going to',
        level: 'intermediate',
        topic: 'tenses',
        explanation:
          'will → decision on the spot or prediction: I’ll help. going to + verb → plan already made: I’m going to join chess club.',
        examples: ['I will call you soon. (no promise preparation)',
          "We're going to repaint the hall this weekend. (plan)"],
        exercises: [
          {
            type: 'mcq',
            prompt: '“Mira has a ticket. She ___ tonight.”',
            options: ['is going to travel', 'will travels', 'travel', 'is travelled'],
            answerIndex: 0,
            explanation: 'A plan with evidence → going to.',
          },
          {
            type: 'mcq',
            prompt: '“You look thirsty. I ___ you a glass of juice.”',
            options: ["'ll bring", "am bring", 'brings', 'brought'],
            answerIndex: 0,
            explanation: 'Offer at the moment → will (’ll).',
          },
        ],
      },
    ],
  },
  {
    id: 'i-conditionals',
    title: 'Conditionals',
    blurb: 'If + present → will.',
    lessons: [
      {
        id: 'li-cond-1',
        title: 'First conditional',
        level: 'intermediate',
        topic: 'conditionals',
        explanation: 'Real future conditions: If it rains, we will stay in. Never say “If it will rain”: present in the if-clause, will for the result.',
        examples: ['If you water the plant, it will grow.', 'If he arrives late, they will wait.'],
        exercises: [
          {
            type: 'mcq',
            prompt: '“If the bus is late, I ___ late.”',
            options: ['will be', 'am', 'be', 'will being'],
            answerIndex: 0,
            explanation: 'if + present; result with will.',
          },
          {
            type: 'type',
            prompt: 'Fix the if-clause: “If it will rain, we stay in.” → write the whole if-clause part only',
            accept: ['if it rains'],
            explanation: 'Present after if: If it rains…',
          },
        ],
      },
    ],
  },
  {
    id: 'i-comparative',
    title: 'Comparing things',
    blurb: 'bigger, more useful, the best.',
    lessons: [
      {
        id: 'li-comparative',
        title: 'Comparatives and superlatives',
        level: 'intermediate',
        topic: 'comparatives',
        explanation:
          'Short words: big → bigger → the biggest. Long words: more useful → the most useful. Irregular: good-better-best, bad-worse-worst, far-farther-furthest.',
        examples: ['a bigger park', 'the most useful app', 'better late than never'],
        exercises: [
          {
            type: 'mcq',
            prompt: '“This road is ___ than that one.” (crowded)',
            options: ['more crowded', 'crowdedest', 'crowder', 'most crowded'],
            answerIndex: 0,
            explanation: 'Two+ syllables → more + word.',
          },
          {
            type: 'type',
            prompt: 'Superlative of good?',
            accept: ['best'],
            explanation: 'good → better → the best.',
          },
        ],
      },
    ],
  },
  {
    id: 'i-connectors',
    title: 'Connectors',
    blurb: 'because, however, although, so.',
    lessons: [
      {
        id: 'li-connectors',
        title: 'Joining ideas',
        level: 'intermediate',
        topic: 'connectors',
        explanation:
          'Add ideas: and / also. Contrast: but / however / although. Cause: because. Effect: so. One connector marks ONE relationship — avoid stacking four.',
        examples: ['It was raining, so we stayed in.', 'Although he was tired, he finished.'],
        exercises: [
          {
            type: 'mcq',
            prompt: '“The exam was tough; ___, she passed with distinction.”',
            options: ['however', 'because', 'so that', 'moreover'],
            answerIndex: 0,
            explanation: 'Contrast connector starting a new clause: however (with a semicolon or full stop before).',
          },
          {
            type: 'mcq',
            prompt: '“___ he was ill, he attended the meeting.”',
            options: ['Although', 'However', 'Meanwhile', 'Therefore'],
            answerIndex: 0,
            explanation: 'Although introduces the subordinate clause of contrast.',
          },
        ],
      },
    ],
  },
];
