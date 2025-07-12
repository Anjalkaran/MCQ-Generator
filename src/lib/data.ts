import { History, Leaf, BrainCircuit, Landmark } from 'lucide-react';
import type { Topic } from './types';

export const topics: Topic[] = [
  {
    id: 'history-of-internet',
    title: 'History of the Internet',
    description: 'Explore the origins and evolution of the worldwide web.',
    icon: History,
    mcqs: [
      {
        question: 'What was the name of the precursor to the Internet?',
        options: ['ARPANET', 'TELENET', 'NSFNET', 'WEB-NET'],
        correctAnswer: 'ARPANET',
      },
      {
        question: 'Who is credited with inventing the World Wide Web?',
        options: ['Bill Gates', 'Steve Jobs', 'Tim Berners-Lee', 'Vint Cerf'],
        correctAnswer: 'Tim Berners-Lee',
      },
      {
        question: 'Which protocol is used to send email?',
        options: ['HTTP', 'FTP', 'SMTP', 'TCP/IP'],
        correctAnswer: 'SMTP',
      },
      {
        question: 'What does "HTTP" stand for?',
        options: ['HyperText Transfer Protocol', 'High-Tech Transfer Protocol', 'HyperText Transmission Protocol', 'Hyperlink Text Transfer Protocol'],
        correctAnswer: 'HyperText Transfer Protocol',
      },
      {
        question: 'In which decade was the first email sent?',
        options: ['1960s', '1970s', '1980s', '1990s'],
        correctAnswer: '1970s',
      },
    ],
  },
  {
    id: 'basics-of-photosynthesis',
    title: 'Basics of Photosynthesis',
    description: 'Learn how plants convert light energy into chemical energy.',
    icon: Leaf,
    mcqs: [
      {
        question: 'What is the primary pigment used in photosynthesis?',
        options: ['Chlorophyll', 'Carotenoid', 'Anthocyanin', 'Phycobilin'],
        correctAnswer: 'Chlorophyll',
      },
      {
        question: 'Which gas is absorbed by plants during photosynthesis?',
        options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'],
        correctAnswer: 'Carbon Dioxide',
      },
      {
        question: 'What is a byproduct of photosynthesis?',
        options: ['Carbon Dioxide', 'Water', 'Oxygen', 'Glucose'],
        correctAnswer: 'Oxygen',
      },
      {
        question: 'Where does photosynthesis primarily occur in a plant cell?',
        options: ['Mitochondria', 'Nucleus', 'Ribosome', 'Chloroplast'],
        correctAnswer: 'Chloroplast',
      },
    ],
  },
  {
    id: 'intro-to-ai',
    title: 'Introduction to AI',
    description: 'Discover the fundamental concepts of Artificial Intelligence.',
    icon: BrainCircuit,
    mcqs: [
      {
        question: 'What does "AI" stand for?',
        options: ['Automated Intelligence', 'Artificial Intelligence', 'Augmented Intellect', 'Algorithmic-learning Interface'],
        correctAnswer: 'Artificial Intelligence',
      },
      {
        question: 'Which of these is a subfield of AI?',
        options: ['Machine Learning', 'Data Mining', 'Cybersecurity', 'Web Development'],
        correctAnswer: 'Machine Learning',
      },
      {
        question: 'The Turing Test is used to measure a machine\'s ability to...',
        options: ['Solve complex math problems', 'Exhibit intelligent behavior equivalent to, or indistinguishable from, that of a human', 'Process large datasets', 'Recognize images'],
        correctAnswer: 'Exhibit intelligent behavior equivalent to, or indistinguishable from, that of a human',
      },
    ],
  },
  {
    id: 'world-capitals',
    title: 'World Capitals',
    description: 'Test your knowledge of capital cities from around the globe.',
    icon: Landmark,
    mcqs: [
        {
            question: 'What is the capital of Canada?',
            options: ['Toronto', 'Vancouver', 'Ottawa', 'Montreal'],
            correctAnswer: 'Ottawa',
        },
        {
            question: 'What is the capital of Australia?',
            options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
            correctAnswer: 'Canberra',
        },
        {
            question: 'What is the capital of Japan?',
            options: ['Kyoto', 'Osaka', 'Tokyo', 'Hiroshima'],
            correctAnswer: 'Tokyo',
        },
        {
            question: 'What is the capital of Brazil?',
            options: ['Rio de Janeiro', 'São Paulo', 'Salvador', 'Brasília'],
            correctAnswer: 'Brasília',
        },
    ]
  }
];
