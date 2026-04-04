
import { IP_BLUEPRINT } from './exam-blueprints-ip';

export const MTS_BLUEPRINT = {
  examName: 'MTS Exam',
  totalDurationMinutes: 60,
  parts: [
    {
      partName: 'Part-A: Postal Knowledge',
      totalQuestions: 30,
      sections: [
        {
          sectionName: 'Post Office Guide Part I',
          topics: [
            { name: 'Organization of the Department', questions: 2 },
            { name: 'Type of Post Offices', questions: 2 },
            { name: 'Business Hours', questions: 2 },
            { name: 'Payment of postage, stamps and stationery', questions: 2 },
            { name: 'General rules as to packing, sealing and posting manner of affixing Postage stamps', questions: 2 },
            { name: 'Methods of address', questions: 2 },
            { name: 'Post boxes and Post bags', questions: 2 },
            { name: 'Duties of Letter Box Peon', questions: 1 },
            { name: 'Official postal articles', questions: 2 },
            { name: 'Prohibited postal articles', questions: 2 },
            { name: 'Products and Services: Mails, Banking & Remittances, Insurance, Stamps and Business', questions: 4 },
          ],
        },
        {
          sectionName: 'Postal Manual Volume V',
          topics: [
            { name: 'Definitions', questions: 7 },
          ],
        },
      ],
    },
    {
      partName: 'Part-B: General Awareness and Basic Arithmetic',
      totalQuestions: 20,
      sections: [
        {
          sectionName: 'General Awareness / Knowledge',
          topics: [
            { name: 'Indian Geography', questions: 2 },
            { name: 'Civics', questions: 2 },
            { name: 'General Knowledge', questions: 2 },
            { name: 'Indian Culture & Freedom Struggle', questions: 2 },
            { name: 'Ethics and Morale study', questions: 2 },
          ],
        },
        {
          sectionName: 'Basic Arithmetic',
          topics: [
            { name: 'BODMAS', questions: 2 },
            { name: 'Percentage', questions: 1 },
            { name: 'Profit and loss', questions: 1 },
            { name: 'Simple interest', questions: 1 },
            { name: 'Average', questions: 1 },
            { name: 'Time and work', questions: 1 },
            { name: 'Time and distance', questions: 1 },
            { name: 'Unitary Method', questions: 2 },
          ],
        },
      ],
    },
  ],
};

export const POSTMAN_BLUEPRINT = {
  examName: 'Postman/Mail Guard Exam',
  totalDurationMinutes: 90,
  parts: [
    {
      partName: 'Paper-I: Basic Postal Knowledge and General Awareness',
      totalQuestions: 50,
      sections: [
        {
          sectionName: 'Part-A: Postal Knowledge',
          topics: [
            { name: 'Organization of the Department', questions: 2 },
            { name: 'Type of Post Offices', questions: 2 },
            { name: 'Business Hours', questions: 2 },
            { name: 'Payment of postage, stamps and stationery', questions: 2 },
            { name: 'General rules as to packing, sealing and posting manner of affixing Postage stamps', questions: 2 },
            { name: 'Methods of address', questions: 2 },
            { name: 'Post boxes and Post bags', questions: 2 },
            { name: 'Duties of Letter Box Peon', questions: 2 },
            { name: 'Official postal articles', questions: 2 },
            { name: 'Prohibited postal articles', questions: 2 },
            { name: 'Products and Services: Mails, Banking & Remittances, Insurance, Stamps and Business', questions: 3 },
            { name: 'Definitions', questions: 7 },
          ],
        },
        {
          sectionName: 'Part-B: General Awareness and Basic Arithmetic',
          topics: [
            { name: 'Indian Geography', questions: 2 },
            { name: 'Civics', questions: 2 },
            { name: 'General Knowledge', questions: 2 },
            { name: 'Indian Culture & Freedom Struggle', questions: 2 },
            { name: 'Ethics and Morale study', questions: 2 },
            { name: 'BODMAS', questions: 2 },
            { name: 'Percentage', questions: 1 },
            { name: 'Profit and loss', questions: 1 },
            { name: 'Simple interest', questions: 1 },
            { name: 'Average', questions: 1 },
            { name: 'Time and work', questions: 1 },
            { name: 'Time and distance', questions: 1 },
            { name: 'Unitary Method', questions: 2 },
          ],
        },
      ],
    },
    {
      partName: 'Paper-II: Knowledge of Postal Operations',
      totalQuestions: 25,
      sections: [
        {
          sectionName: 'Post Office Guide Part I',
          topics: [
            { name: 'Delivery of mails', questions: 1 },
            { name: 'Refusal of article', questions: 1 },
            { name: 'Payment of eMoney Order', questions: 1 },
            { name: 'Redirection', questions: 1 },
            { name: 'Instruction regarding address change', questions: 1 },
          ],
        },
        {
          sectionName: 'Postal Manual Volume VI - Part III',
          randomFrom: {
            questions: 10,
            topics: [
              'Head Postman',
              'Knowledge of Postal Business',
              'Supply of forms to be carried out',
              'Sale of stamps',
              "Postman's Book",
              'Address to be noted on Postal Articles',
              'Damaged articles to be noticed',
              'Receipts for articles issued for delivery',
              'Book of receipts for intimations and notices delivery',
              'Instruction for delivery',
              'Realization of postage before delivery',
              'Receipts of addresses for registered',
              'Delivery to illiterate addresses, Pardanashin women',
              'Delivery of insured articles addressed to minors',
              'Payment of e-Money Orders',
              'e-Money Orders addressed to minors',
              'Payment of e-Mo and delivery of registered letters to lunatics',
              'Duties of Village Postman',
            ],
          },
        },
        {
          sectionName: 'Postal Manual Vol. VII',
          randomFrom: {
            questions: 10,
            topics: [
              'Stamps and Seals',
              'Portfolio and its contents',
              'Stationery',
              'Preparation of daily report',
              'Mail Abstract',
              'Exchange of Mails',
              'Cage TB',
              'Disposal of Mails addressed to a section or a mail office',
              'Closing of transit bags',
              'Duties and responsibilities of Mail Guard/Agent',
              'Final duties before quitting Van or office',
              "'A' order and 'B' order",
            ],
          },
        },
      ],
    },
  ],
};

export const PA_BLUEPRINT = {
  examName: 'Postal Assistant / Sorting Assistant (PA/SA) Exam',
  totalDurationMinutes: 120,
  parts: [
    {
      partName: 'Part-A: Postal Knowledge',
      totalQuestions: 50,
      sections: [
        {
          sectionName: 'Post Office Guide Part I',
          topics: [{ name: 'Post Office Guide Part I', questions: 10 }],
        },
        {
          sectionName: 'Post Office Guide Part II',
          topics: [{ name: 'Post Office Guide Part II', questions: 10 }],
        },
        {
          sectionName: 'Basic terminologies related to IT Modernisation',
          topics: [{ name: 'Basic terminologies related to IT Modernisation', questions: 10 }],
        },
        {
          sectionName: 'Products and Services',
          randomFrom: {
            questions: 10,
            topics: [
              'Mails',
              'Banking & Remittances',
              'Insurance',
              'Stamps and Business',
            ],
          },
        },
        {
          sectionName: 'Postal Manuals',
          randomFrom: {
            questions: 5,
            topics: [
              'Postal Manual Volume VI Part I',
              'Postal Manual Volume VI Part III (Chapter I and II)',
              'Unlimited SO orders issued by Directorate',
            ],
          },
        },
        {
          sectionName: 'Manuals (Specific)',
          randomFrom: {
            questions: 5,
            topics: [
              'Postal Manual Volume VII',
              'Foreign Post Manual',
            ],
          },
        },
      ],
    },
    {
      partName: 'Part-B: General Knowledge, Arithmetic, and Reasoning',
      totalQuestions: 50,
      sections: [
        {
          sectionName: 'General Awareness / Knowledge',
          topics: [
            { name: 'Indian Geography', questions: 2 },
            { name: 'Civics', questions: 2 },
            { name: 'General Knowledge', questions: 2 },
            { name: 'Indian Culture & Freedom Struggle', questions: 2 },
            { name: 'Ethics and Morale Study', questions: 2 },
          ],
        },
        {
          sectionName: 'Basic Arithmetic',
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
              'Unitary Method',
            ],
          },
        },
        {
          sectionName: 'Reasoning and Analytical Ability',
          topics: [{ name: 'Non-Verbal / Pictorial Reasoning', questions: 20 }],
        },
      ],
    },
  ],
};


export const GROUPB_BLUEPRINT = {
  examName: 'P.S. Group B Exam',
  totalDurationMinutes: 180,
  parts: [
    {
      partName: 'Paper-I: Postal Operations and Rules',
      totalQuestions: 125,
      sections: [
        {
          sectionName: 'Acts and Statutory Rules',
          topics: [
            { name: 'Consumer Protection Act, 2019', questions: 5 },
            { name: 'Prevention of Money Laundering Act, 2002', questions: 5 },
            { name: 'Indian Post Office Rules, 1933', questions: 10 }
          ]
        },
        {
          sectionName: 'Post Office Guides & Foreign Post',
          topics: [
            { name: 'Post Office Guide Part I', questions: 10 },
            { name: 'Post Office Guide Part II', questions: 10 },
            { name: 'Domestic and Foreign Post Guidelines', questions: 10 },
            { name: 'Book of BO (Branch Office) Rules', questions: 5 }
          ]
        },
        {
          sectionName: 'Mail Operations & Business Development',
          topics: [
            { name: 'Postal Manual Volume V', questions: 15 },
            { name: 'MNOP (Mail Network Optimization Project)', questions: 5 },
            { name: 'Business Development Guidelines', questions: 5 }
          ]
        },
        {
          sectionName: 'Money Remittance & Remittance Services',
          topics: [
            { name: 'eMO, iMO, IMTS, and IFS MO Guidelines', questions: 15 }
          ]
        },
        {
          sectionName: 'Savings Bank Schemes & Rules',
          topics: [
            { name: 'POSB General Rules, 1981', questions: 5 },
            { name: 'Post Office Saving Account Rules, 1981', questions: 5 },
            { name: 'Recurring Deposit & Time Deposit Rules', questions: 5 },
            { name: 'MIS, Senior Citizen, and Certificate Rules', questions: 10 },
            { name: 'SB Orders issued by Directorate', questions: 5 }
          ]
        }
      ]
    },
    {
      partName: 'Paper-II: Service Rules and Financial Regulations',
      totalQuestions: 150,
      sections: [
        {
          sectionName: 'Service and Conduct Rules',
          topics: [
            { name: 'CCS (CCA) Rules, 1965', questions: 15 },
            { name: 'CCS (Temporary Service) Rules, 1965', questions: 5 },
            { name: 'CCS (Pension) Rules, 1972', questions: 15 },
            { name: 'CCS (Leave) Rules, 1972', questions: 15 },
            { name: 'Fundamental and Supplementary Rules (FR & SR)', questions: 10 }
          ]
        },
        {
          sectionName: 'Financial Handbooks & GFR',
          topics: [
            { name: 'Postal Financial Handbook (Volume I & II)', questions: 20 },
            { name: 'General Financial Rules (GFR)', questions: 10 },
            { name: 'Schedule of Financial Powers of Divisional Heads', questions: 10 }
          ]
        },
        {
          sectionName: 'Administrative Procedures & Manuals',
          topics: [
            { name: 'Manual of Office Procedure', questions: 10 },
            { name: 'Maintenance of APAR and Recruitment Rules', questions: 10 },
            { name: 'Postal Manual Volume II (Org & Misc Rules)', questions: 10 },
            { name: 'GPF (Central Services) Rules, 1960', questions: 5 },
            { name: 'GDS (Conduct and Engagement) Rules, 2011', questions: 5 }
          ]
        },
        {
          sectionName: 'Anti-Corruption & Grievance Redressal',
          topics: [
            { name: 'Prevention of Corruption Act, 1988', questions: 5 },
            { name: 'Central Administrative Tribunal Act, 1985', questions: 5 },
            { name: 'Citizen Charter of the Department of Posts', questions: 5 },
            { name: 'Complaint and Grievance Handling Guidelines', questions: 5 }
          ]
        }
      ]
    }
  ]
};

export { IP_BLUEPRINT };
