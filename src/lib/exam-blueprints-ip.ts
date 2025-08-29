
export const IP_BLUEPRINT = {
    examName: 'Inspector Posts Exam',
    totalDurationMinutes: 150,
    parts: [
      {
        partName: 'Paper-I',
        totalQuestions: 125,
        sections: [
          {
            sectionName: 'Acts',
            randomFrom: {
              questions: 60, // Approximate split
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
                questions: 65, // Approximate split
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
      // Paper II is omitted as it is descriptive (Noting & Drafting) and not MCQ-based.
      // The current application only supports MCQ exams.
      {
        partName: 'Paper-III',
        totalQuestions: 150,
        totalDurationMinutes: 180,
        sections: [
          {
            sectionName: 'Paper III Syllabus',
            randomFrom: {
              questions: 150,
              topics: [
                'Rules relating to Children Education Allowance and reimbursement of Tuition fees.',
                'General Financial Rules-2017',
                'C.C.S (Conduct) Rules, 1964',
                'C.C.S (Leave) Rules, 1972',
                'C.C.S (Pension) Rules, 2021',
                'Fundamental Rules and Supplementary Rules'
              ]
            }
          }
        ]
      }
    ],
  };
