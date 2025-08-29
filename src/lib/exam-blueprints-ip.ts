
export const IP_BLUEPRINT = {
    examName: 'Inspector Posts Exam',
    totalDurationMinutes: 180, // Example, adjust as needed
    parts: [
      {
        partName: 'Paper-I',
        totalQuestions: 100, // Example total
        sections: [
          {
            sectionName: 'Acts',
            randomFrom: {
              questions: 50, // Assigning 50 questions, can be adjusted
              topics: [
                'The Post Office Act, 2023 (Act No.43 of 2023)',
                'Government Savings Promotion Act-1873',
                'Prevention of Money Laundering Act, 2002 and its Amendments',
                'Consumer Protection Act, 2019',
                'Information Technology Act, 2000'
              ],
            },
          },
          {
            sectionName: 'Rules',
            randomFrom: {
                questions: 50, // Assigning 50 questions, can be adjusted
                topics: [
                    'The Post office Rules, 2024 & The Post office Regulations, 2024',
                    'Government Savings Promotion Rules, 2018',
                    'Post Office Savings Account Scheme, 2019',
                    'National Savings Recurring Deposit Scheme, 2019',
                    'National Savings Time Deposit Scheme, 2019',
                    'National Savings (Monthly Income Account) Scheme, 2019',
                    'Senior Citizens\' Savings Scheme, 2019',
                    'National Savings Certificate (VIII Issue) Scheme, 2019',
                    'Kisan Vikas Patra Scheme, 2019'
                ]
            }
          }
        ],
      },
      {
        partName: 'Paper-II',
        totalQuestions: 50, // Example total
        sections: [
          {
            sectionName: 'General Awareness & English',
             // Add specific topics here for Paper II
            randomFrom: {
              questions: 50,
              topics: ['Topic for IP Paper 2 - A', 'Topic for IP Paper 2 - B'],
            },
          },
        ],
      },
    ],
  };

