
export const MTS_BLUEPRINT = {
  examName: 'MTS Exam',
  totalDurationMinutes: 60,
  parts: [
    {
      partName: 'Part-A',
      totalQuestions: 30,
      sections: [
        {
          sectionName: 'Post Office Guide Part I & Products/Services',
          topics: [
            { name: 'Organization of the Department', questions: 2 },
            { name: 'Type of Post Offices', questions: 1 },
            { name: 'Business Hours', questions: 1 },
            { name: 'Payment of postage, stamps and stationery', questions: 2 },
            {
              name: 'General rules as to packing, sealing and posting, manner of affixing postage stamps',
              questions: 1,
            },
            { name: 'Methods of address', questions: 2 },
            { name: 'Post boxes and Post bags', questions: 1 },
            { name: 'Duties of Letter Box peon', questions: 1 },
            { name: 'Official postal articles', questions: 1 },
            { name: 'Prohibited postal articles', questions: 2 },
            { name: 'Domestic Item – Mails', questions: 1 },
            { name: 'International items and services', questions: 1 },
            { name: 'Stamps', questions: 1 },
            { name: 'Jan Suraksha Scheme', questions: 1 },
            { name: 'SCSS', questions: 1 },
            { name: 'SSA', questions: 1 },
            { name: 'TD and MIS', questions: 1 },
            { name: 'Recurring Deposit', questions: 1 },
            { name: 'PLI/RPLI', questions: 2 },
            { name: 'Definitions', questions: 6 },
          ],
        },
      ],
    },
    {
      partName: 'Part-B',
      totalQuestions: 20,
      sections: [
        {
          sectionName: 'General Awareness/Knowledge',
          topics: [
            { name: 'Indian Geography', questions: 2 },
            { name: 'Civics', questions: 2 },
            { name: 'General knowledge', questions: 1 },
            { name: 'Indian culture & freedom struggle', questions: 2 },
            { name: 'Ethics and morale study', questions: 1 },
            { name: 'current affairs', questions: 2 },
          ],
        },
        {
          sectionName: 'Basic Arithmetics',
          topics: [
            { name: 'BODMAS', questions: 2 },
            { name: 'Percentage', questions: 1 },
            { name: 'Profit and loss', questions: 1 },
            { name: 'Simple interest', questions: 1 },
            { name: 'Average', questions: 1 },
            { name: 'Time and work', questions: 1 },
            { name: 'Time and distance', questions: 1 },
            { name: 'Unitary method', questions: 2 },
          ],
        },
      ],
    },
  ],
};

export const POSTMAN_BLUEPRINT = {
  examName: 'Postman Exam',
  totalDurationMinutes: 90,
  parts: [
    {
      partName: 'Part-A',
      totalQuestions: 50,
      sections: [
        {
          sectionName: 'Post Office Guide Part I & Products/Services',
          topics: [
            { name: 'Organization of the Department', questions: 2 },
            { name: 'Type of Post Offices', questions: 2 },
            { name: 'Business Hours', questions: 2 },
            {
              name: 'Payment of postage, stamps and stationery',
              questions: 2,
            },
            {
              name: 'General rules as to packing, sealing and posting, manner of affixing postage stamps',
              questions: 2,
            },
            { name: 'Methods of address', questions: 2 },
            { name: 'Post boxes and Post bags', questions: 2 },
            { name: 'Duties of Letter Box peon', questions: 2 },
            { name: 'Official postal articles', questions: 2 },
            { name: 'Prohibited postal articles', questions: 2 },
            { name: 'PLI/RPLI', questions: 2 },
          ],
          randomFrom: {
            questions: 8,
            topics: [
              'Domestic Item – Mails',
              'International items and services',
              'Stamps',
              'SCSS',
              'SSA',
              'PPF',
              'TD and MIS',
              'Recurring Deposit',
              'Savings Bank Account',
              'KVP',
              'NSC',
              'Jan Suraksha Scheme',
            ],
          },
        },
        {
          sectionName: 'Manuals',
          topics: [
            { name: 'Postal Manual Volume V', questions: 10 },
            { name: 'Postal Manual Volume VI - Part III(PM)', questions: 5 },
            { name: 'PM Vol VII', questions: 5 },
          ],
        },
      ],
    },
    {
      partName: 'Part-B',
      totalQuestions: 25,
      sections: [
        {
          sectionName: 'General Awareness/Knowledge',
          randomFrom: {
            questions: 10,
            topics: [
              'Indian Geography',
              'Civics',
              'General knowledge',
              'Indian culture & freedom struggle',
              'Ethics and morale study',
              'current affairs'
            ],
          },
        },
        {
          sectionName: 'Basic Arithmetics',
          randomFrom: {
            questions: 10,
            topics: ['Basic Arithmetics'],
          },
        },
        {
            sectionName: 'Reasoning and Analytical Ability',
            questions: 5,
        }
      ],
    },
  ],
};

export const PA_BLUEPRINT = {
  examName: 'PA Exam',
  totalDurationMinutes: 120,
  parts: [
    {
      partName: 'Part-A',
      totalQuestions: 50,
      sections: [
        {
          sectionName: 'Products & Services and POG-I',
          randomFrom: {
            questions: 10,
            topics: [
              'Organization of the Department',
              'Type of Post Offices',
              'Business Hours',
              'Payment of postage, stamps and stationery',
              'General rules as to packing, sealing and posting, manner of affixing postage stamps',
              'Methods of address',
              'Post boxes and Post bags',
              'Duties of Letter Box peon',
              'Official postal articles',
              'Prohibited postal articles',
              'Domestic Item – Mails',
              'International items and services',
              'Stamps',
              'PLI/RPLI',
              'SCSS',
              'SSA',
              'PPF',
              'Recurring Deposit',
              'Savings Bank Account',
              'TD and MIS',
            ],
          },
        },
        {
          sectionName: 'Post Office Guide Part II',
          topics: [{ name: 'Post Office Guide Part II', questions: 10 }],
        },
        {
          sectionName: 'Modernization Project',
          topics: [{ name: 'Modernization Project', questions: 10 }],
        },
        {
          sectionName: 'Postal Manuals & Orders',
           randomFrom: {
            questions: 5,
            topics: [
              'Postal Manual Volume VI – Part I',
              'Postal Manual Volume VI – Part III',
              'SB Orders',
            ],
          },
        },
        {
          sectionName: 'Postal Manuals',
          randomFrom: {
            questions: 5,
            topics: [
              'Postal Manual Volume VII',
              'Foreign Post Manual'
            ],
          }
        },
        {
          sectionName: 'Postal Manual Volume V',
          topics: [{ name: 'Postal Manual Volume V', questions: 10 }],
        },
      ],
    },
    {
      partName: 'Part-B',
      totalQuestions: 50,
      sections: [
        {
          sectionName: 'General Awareness/Knowledge',
          randomFrom: {
            questions: 10,
            topics: [
              'Indian Geography',
              'Civics',
              'General knowledge',
              'Indian culture & freedom struggle',
              'Ethics and morale study',
              'current affairs',
            ],
          },
        },
        {
          sectionName: 'Basic Arithmetics',
          randomFrom: {
            questions: 20,
            topics: [
              'BODMAS',
              'Percentage',
              'Profit and loss',
              'Simple interest',
              'Average',
              'Time and work',
              'Time and distance',
              'Unitary method',
            ],
          },
        },
        {
          sectionName: 'Logical Reasoning',
          topics: [{ name: 'Logical Reasoning', questions: 10 }],
        },
        {
          sectionName: 'Non-Verbal Reasoning',
          questions: 10,
        },
      ],
    },
  ],
};
