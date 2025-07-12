import {
  Calculator,
  Divide,
  Percent,
  TrendingUp,
  Landmark,
  Clock,
  Briefcase,
  Tally1,
} from 'lucide-react';
import type { Topic } from './types';

export const topics: Topic[] = [
  {
    id: 'bodmas',
    title: 'BODMAS',
    description: 'Master the order of mathematical operations.',
    icon: Divide,
    mcqs: [
      {
        question: 'What is the value of 10 + 2 * 5?',
        options: ['60', '20', '25', '30'],
        correctAnswer: '20',
      },
      {
        question: 'Solve: (5 + 3) * 2 - 1',
        options: ['15', '10', '16', '9'],
        correctAnswer: '15',
      },
    ],
  },
  {
    id: 'average',
    title: 'Average',
    description: 'Learn to calculate the central value of a set of numbers.',
    icon: Calculator,
    mcqs: [
      {
        question: 'What is the average of 2, 4, and 6?',
        options: ['2', '3', '4', '5'],
        correctAnswer: '4',
      },
      {
        question: 'The average of 5 numbers is 10. What is their sum?',
        options: ['15', '50', '5', '2'],
        correctAnswer: '50',
      },
    ],
  },
  {
    id: 'percentage',
    title: 'Percentage',
    description: 'Understand and calculate percentages.',
    icon: Percent,
    mcqs: [
      {
        question: 'What is 20% of 150?',
        options: ['20', '30', '40', '50'],
        correctAnswer: '30',
      },
      {
        question: 'If a shirt costs $40 and is on a 25% discount, what is the final price?',
        options: ['$10', '$25', '$30', '$35'],
        correctAnswer: '$30',
      },
    ],
  },
  {
    id: 'profit-and-loss',
    title: 'Profit and Loss',
    description: 'Calculate profits and losses in business transactions.',
    icon: TrendingUp,
    mcqs: [
      {
        question: 'If Cost Price is $50 and Selling Price is $70, what is the profit?',
        options: ['$10', '$20', '$30', '$120'],
        correctAnswer: '$20',
      },
      {
        question: 'An item bought for $100 is sold for $80. What is the loss percentage?',
        options: ['10%', '20%', '25%', '15%'],
        correctAnswer: '20%',
      },
    ],
  },
  {
    id: 'simple-interest',
    title: 'Simple Interest',
    description: 'Learn the basics of calculating simple interest.',
    icon: Landmark,
    mcqs: [
      {
        question: 'Calculate the simple interest on $1000 for 2 years at 5% per annum.',
        options: ['$50', '$100', '$200', '$10'],
        correctAnswer: '$100',
      },
    ],
  },
  {
    id: 'time-and-distance',
    title: 'Time and Distance',
    description: 'Solve problems related to speed, time, and distance.',
    icon: Clock,
    mcqs: [
      {
        question: 'A car travels at 60 km/h. How far will it travel in 3 hours?',
        options: ['120 km', '150 km', '180 km', '20 km'],
        correctAnswer: '180 km',
      },
    ],
  },
  {
    id: 'time-and-work',
    title: 'Time and Work',
    description: 'Understand the relationship between time taken and work done.',
    icon: Briefcase,
    mcqs: [
      {
        question: 'If A can do a piece of work in 10 days, what portion of the work can he do in 1 day?',
        options: ['1/10', '10', '1', '1/5'],
        correctAnswer: '1/10',
      },
    ],
  },
  {
    id: 'unitary-method',
    title: 'Unitary Method',
    description: 'Find the value of a single unit to find the value of multiple units.',
    icon: Tally1,
    mcqs: [
      {
        question: 'If 5 pens cost $10, what is the cost of 1 pen?',
        options: ['$1', '$2', '$5', '$0.5'],
        correctAnswer: '$2',
      },
    ],
  },
];
