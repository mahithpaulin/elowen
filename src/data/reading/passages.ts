/**
 * Original reading passages written for Elowen. Level-marked, with MCQ and
 * short-answer questions whose keyword-based grading is deterministic.
 */

import type { Exercise } from '../../types';

export interface Passage {
  id: string;
  title: string;
  level: 'beginner' | 'intermediate';
  text: string[]; // paragraphs
  vocab: Array<{ word: string; meaning: string }>;
  questions: Exercise[];
  readAloudTarget: string;
}

export const PASSAGES: Passage[] = [
  {
    id: 'p-morning-market',
    title: 'The morning market',
    level: 'beginner',
    text: [
      'The market opens at six in the morning. Farmers arrive with baskets of tomatoes, onions and green chilies. They lay out the vegetables under bright umbrellas.',
      'By seven, the smell of fresh bread mixes with the sound of many voices. Old Annamma sells pumpkins by weight. Children run between the stalls while their mothers compare prices.',
      'By nine, most baskets are empty. The farmers pack their scales, and the street becomes quiet again until Monday.',
    ],
    vocab: [
      { word: 'stalls', meaning: 'table-like stands where goods are sold' },
      { word: 'compare', meaning: 'look at two or more things to see the difference' },
      { word: 'scales', meaning: 'a tool used to weigh things' },
    ],
    questions: [
      {
        type: 'mcq',
        prompt: 'When does the market open?',
        options: ['At six in the morning', 'At seven in the evening', 'At nine', 'After Monday'],
        answerIndex: 0,
        explanation: 'Paragraph 1 says: The market opens at six in the morning.',
      },
      {
        type: 'mcq', 
        prompt: 'What does Annamma sell?',
        options: ['Pumpkins', 'Bread', 'Tomatoes', 'Umbrellas'],
        answerIndex: 0,
        explanation: 'Annamma sells pumpkins by weight.',
      },
      {
        type: 'type',
        prompt: 'Who runs between the stalls?',
        accept: ['children', 'children run', 'the children'],
        explanation: 'Paragraph 2: Children run between the stalls.',
      },
    ],
    readAloudTarget: 'The market opens at six in the morning. Farmers arrive with baskets of tomatoes.',
  },
  {
    id: 'p-first-day',
    title: 'A first day at school',
    level: 'beginner',
    text: [
      'Deepa stood at the school gate. Her new uniform was stiff, and her bag was heavier than she expected.',
      'A girl with two ponytails waved. "Are you new too?" she asked. Deepa nodded and smiled. That morning felt lighter.',
      'By lunchtime they shared a bench. Deepa still did not know her way around, but at least she was not alone anymore.',
    ],
    vocab: [
      { word: 'uniform', meaning: 'special clothes students wear to school' },
      { word: 'nodded', meaning: 'moved the head to say yes' },
    ],
    questions: [
      {
        type: 'mcq',
        prompt: 'How did Deepa probably feel at first?',
        options: ['Nervous', 'Angry', 'Sleepy', 'Bored'],
        answerIndex: 0,
        explanation: 'The uniform felt stiff and her bag heavy — signs of nerves on a first day.',
      },
      {
        type: 'mcq',
        prompt: 'What changed for Deepa by lunchtime?',
        options: ['She had a friend', 'Her bag got lighter', 'She lost her uniform', 'She left school early'],
        answerIndex: 0,
        explanation: 'She shared a bench with the friendly girl.',
      },
      {
        type: 'type',
        prompt: 'What did Deepa do with her head when the girl asked a question?',
        accept: ['nodded', 'she nodded', 'nod', 'node'],
        explanation: 'Deepa nodded — moving the head to say yes.',
      },
    ],
    readAloudTarget: 'Deepa stood at the school gate. Her new uniform was stiff, and her bag was heavy.',
  },
  {
    id: 'p-rowing',
    title: 'The kayaking trip',
    level: 'intermediate',
    text: [
      'The river was calm, though the coach had warned us about the bend at the old dam. Ropes tied our three kayaks close together near the bank.',
      'First, we practised the forward stroke. Heavy rain for two days had raised the water, and a current pulled towards the far rocks. Coach Rangan gave us two instructions: stay low, and lean into the curve.',
      'When we finally set off, my paddle slipped on the first turn. Nobody laughed. The water carried us gently, and the drum of rain soon faded behind us. We reached the quiet pool beyond the bend, turned around, and looked back at the wide, grey morning.',
    ],
    vocab: [
      { word: 'current', meaning: 'the flow that pulls water in one direction' },
      { word: 'curve', meaning: 'a smooth bend' },
      { word: 'faded', meaning: 'became quieter or less clear' },
    ],
    questions: [
      {
        type: 'mcq',
        prompt: 'Why was the water strong?',
        options: ['Two days of rain', 'The kayaks were heavy', 'The dam opened', 'The coach shouted'],
        answerIndex: 0,
        explanation: 'Heavy rain for two days had raised the water.',
      },
      {
        type: 'mcq',
        prompt: 'Which instruction did the coach give?',
        options: [
          'Stay low and lean into the curve.',
          'Paddle fast all the time.',
          'Untie the kayaks at night.',
          'Avoid the quiet pool.',
        ],
        answerIndex: 0,
        explanation: 'Coach Rangan said stay low and lean into the curve.',
      },
      {
        type: 'type',
        prompt: 'What did the team do when they reached the quiet pool?',
        accept: ['turned around', 'they turned around', 'turn around'],
        explanation: 'Paragraph 4: they turned around and looked back.',
      },
      {
        type: 'mcq',
        prompt: 'What is the tone of the last line?',
        options: ['Calm reflection', 'Fear', 'Anger', 'Joking'],
        answerIndex: 0,
        explanation: 'The wide, grey morning and the gentle water create a calm feeling.',
      },
    ],
    readAloudTarget: 'The river was calm, though the coach had warned us about the bend at the old dam.',
  },
  {
    id: 'p-litter',
    title: 'The plastic problem',
    level: 'intermediate',
    text: [
      'Plastic bags were a wonder once: cheap, light, strong. Now they rarely stay where they are dropped. Wind lifts them into trees; rain pushes them into streams and rivers; the sea carries them for years. Scientists have even found plastic in the lungs of sea turtles.',
      'Cities answer differently. Some ban thin bags outright. Others collect them for road-building where plastic shavings blend into tar. Environmentalists argue for glass, cloth and paper — a return that only works when alternatives are easy and cheap to find.',
      'The real change, though, may happen quietly at home: a cloth bag on the door hook, a steel bottle in the school bag. Habits, not arguments, decide what the river looks like tomorrow.',
    ],
    vocab: [
      { word: 'outright', meaning: 'completely, with no conditions' },
      { word: 'alternatives', meaning: 'other choices', },
      { word: 'shavings', meaning: 'small thin pieces cut from something' },
    ],
    questions: [
      {
        type: 'mcq',
        prompt: 'Why were plastic bags "a wonder once"?',
        options: ['They were cheap, light and strong', 'They kept rivers clean', 'They fed sea turtles', 'They were expensive'],
        answerIndex: 0,
        explanation: 'Paragraph 1 lists cheap, light, strong.',
      },
      {
        type: 'mcq',
        prompt: 'Which line shows plastic found inside sea animals?',
        options: [
          'plastic in the lungs of sea turtles',
          'bags in trees',
          'blended into tar',
          'cloth bags at home',
        ],
        answerIndex: 0,
        explanation: 'Scientists found plastic in sea turtles’ lungs.',
      },
      {
        type: 'mcq',
        prompt: 'What decides "what the river looks like tomorrow"?',
        options: ['Habits at home', 'Long arguments', 'Weather', 'New roads'],
        answerIndex: 0,
        explanation: 'The last paragraph argues that habits decide, not arguments.',
      },
      {
        type: 'type',
        prompt: 'Name one material environmentalists argue for.',
        accept: ['glass', 'cloth', 'paper', 'glass cloth paper'],
        explanation: 'Any of: glass, cloth, paper.',
      },
    ],
    readAloudTarget: 'Plastic bags were a wonder once: cheap, light, strong.',
  },
  {
    id: 'p-waiting-room',
    title: 'The waiting room',
    level: 'beginner',
    text: [
      'The clinic waiting room had twelve chairs. At ten o’clock, all twelve were full.',
      'A small boy read a book about trains over and over. His mother explained the bus route to nobody in particular. An old man held a walking stick that tapped the floor in slow rhythm, as if he were playing a very quiet drum.',
      'A nurse opened the door and read a number. "Twenty-two?" The stick drum stopped. The old man stood up, thanked nobody loudly, and walked in with a smile.',
    ],
    vocab: [
      { word: 'clinic', meaning: 'a small doctor’s centre, smaller than a hospital' },
      { word: 'rhythm', meaning: 'a sound that repeats in a beat' },
    ],
    questions: [
      {
        type: 'mcq',
        prompt: 'How many chairs are in the waiting room?',
        options: ['Twelve', 'Ten', 'Twenty-two', 'Two'],
        answerIndex: 0,
        explanation: 'The writer counts twelve chairs, all full at ten o’clock.',
      },
      {
        type: 'mcq',
        prompt: 'What is the old man’s stick compared to?',
        options: ['A quiet drum', 'A loud bell', 'A train', 'A book'],
        answerIndex: 0,
        explanation: 'It "tapped in slow rhythm, as if playing a very quiet drum".',
      },
      {
        type: 'type',
        prompt: 'What instrument does the paragraph compare the walking stick to?',
        accept: ['drum', 'a drum'],
        explanation: 'A very quiet drum.',
      },
    ],
    readAloudTarget: 'The clinic waiting room had twelve chairs. At ten o’clock, all twelve were full.',
  },
  {
    id: 'p-two-goats',
    title: 'The two goats',
    level: 'beginner',
    text: [
      'A small wooden bridge crossed the river. It was so narrow that only one goat could walk on it at a time.',
      'One morning, a grey goat crossed from the east while a brown goat crossed from the west. Both stood in the middle and refused to move. The grey goat wondered loudly who was first. The brown goat decided it knew better.',
      'Neither goat fell, and neither goat was hurt. They simply stood there, arguing at the bridge, while the sun climbed higher and a third goat, patient and silent, walked around the long way and reached the other side first.',
    ],
    vocab: [
      { word: 'narrow', meaning: 'not wide; tight for space' },
      { word: 'refused', meaning: 'said no and would not do it' },
    ],
    questions: [
      {
        type: 'mcq',
        prompt: 'Why could only one goat cross at a time?',
        options: ['The bridge was narrow', 'The goats were lazy', 'The river was deep', 'The bridge was broken'],
        answerIndex: 0,
        explanation: 'Paragraph 1 says the bridge was so narrow that only one goat could walk on it at a time.',
      },
      {
        type: 'mcq',
        prompt: 'Which goat reached the other side first?',
        options: ['The third, patient goat', 'The grey goat', 'The brown goat', 'None of them'],
        answerIndex: 0,
        explanation: 'The third goat walked around the long way silently.',
      },
      {
        type: 'mcq',
        prompt: 'What lesson does the story suggest?',
        options: [
          'Being calm and practical wins over arguing',
          'Grey goats are stronger',
          'Bridges should be wide',
          'Goats should swim',
        ],
        answerIndex: 0,
        explanation: 'The silent, patient goat wins by not blocking others.',
      },
      {
        type: 'type',
        prompt: 'What word describes the third goat?',
        accept: ['patient', 'patient and silent', 'silent'],
        explanation: 'Patient and silent.',
      },
    ],
    readAloudTarget: 'A small wooden bridge crossed the river. It was so narrow that only one goat could walk on it at a time.',
  },
];
