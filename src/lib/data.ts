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
    material: `The BODMAS rule is an acronym to help children remember the order of operations in calculations. It stands for Brackets, Orders, Division, Multiplication, Addition, Subtraction. 'Orders' means square roots or square numbers. Calculations should be done in this sequence. For example, in '10 + 2 * 5', multiplication comes before addition, so it is 10 + (2*5) = 20. In '(5 + 3) * 2 - 1', brackets come first, so (8) * 2 - 1 = 16 - 1 = 15.`,
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
    material: 'The average is the central value of a set of numbers. It is calculated by adding all the numbers in a set and then dividing by the count of numbers in that set. For example, the average of 2, 4, and 6 is (2 + 4 + 6) / 3 = 12 / 3 = 4. If the average of 5 numbers is 10, their sum is 5 * 10 = 50.',
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
    material: `A percentage is a number or ratio expressed as a fraction of 100. It is often denoted using the percent sign, "%". To calculate a percentage of a number, you convert the percentage to a decimal and multiply. For example, 20% of 150 is 0.20 * 150 = 30. For discounts, you calculate the discount amount and subtract it from the original price. A 25% discount on a $40 shirt is 0.25 * 40 = $10. The final price is $40 - $10 = $30.`,
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
    material: 'Profit is the gain in a business transaction, calculated as Selling Price (SP) minus Cost Price (CP). Loss is the amount lost, calculated as CP - SP. For example, if CP is $50 and SP is $70, the profit is $70 - $50 = $20. Loss percentage is (Loss / CP) * 100. If an item bought for $100 is sold for $80, the loss is $20. The loss percentage is (20 / 100) * 100 = 20%.',
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
    material: 'Simple Interest (SI) is calculated on the principal amount, or the original amount of a loan. The formula is SI = P * R * T / 100, where P is the principal amount, R is the rate of interest per annum, and T is the time in years. For $1000 at 5% for 2 years, SI = (1000 * 5 * 2) / 100 = $100.',
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
    material: 'The relationship between speed, time, and distance is Distance = Speed × Time. If you know two of the values, you can find the third. For example, if a car travels at a speed of 60 km/h for 3 hours, the distance it travels is 60 * 3 = 180 km.',
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
    material: 'If a person can complete a piece of work in \'n\' days, then the work done by that person in one day is 1/n. This concept is fundamental to solving problems related to time and work. For instance, if A can do a piece of work in 10 days, he does 1/10 of the work each day.',
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
    material: 'The unitary method is a technique for solving a problem by first finding the value of a single unit, and then finding the necessary value by multiplying the single unit value. For example, if 5 pens cost $10, the cost of 1 pen is $10 / 5 = $2. From this, you can find the cost of any number of pens.',
    mcqs: [
      {
        question: 'If 5 pens cost $10, what is the cost of 1 pen?',
        options: ['$1', '$2', '$5', '$0.5'],
        correctAnswer: '$2',
      },
    ],
  },
];
