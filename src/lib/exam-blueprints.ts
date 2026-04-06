
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
            { id: 'MTS-PA-S1-T1', name: 'Organization of the Department', questions: 2 },
            { id: 'MTS-PA-S1-T2', name: 'Type of Post Offices', questions: 2 },
            { id: 'MTS-PA-S1-T3', name: 'Business Hours', questions: 2 },
            { id: 'MTS-PA-S1-T4', name: 'Payment of postage, stamps and stationery', questions: 2 },
            { id: 'MTS-PA-S1-T5', name: 'General rules as to packing, sealing and posting manner of affixing Postage stamps', questions: 2 },
            { id: 'MTS-PA-S1-T6', name: 'Methods of address', questions: 2 },
            { id: 'MTS-PA-S1-T7', name: 'Post boxes and Post bags', questions: 2 },
            { id: 'MTS-PA-S1-T8', name: 'Duties of Letter Box Peon', questions: 1 },
            { id: 'MTS-PA-S1-T9', name: 'Official postal articles', questions: 2 },
            { id: 'MTS-PA-S1-T10', name: 'Prohibited postal articles', questions: 2 },
            { id: 'MTS-PA-S1-T11', name: 'Products and Services: Mails, Banking & Remittances, Insurance, Stamps and Business', questions: 4 },
          ],
        },
        {
          sectionName: 'Postal Manual Volume V',
          topics: [
            { id: 'MTS-PA-S2-T1', name: 'Definitions', questions: 7 },
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
            { id: 'MTS-PB-S1-T1', name: 'Indian Geography', questions: 2 },
            { id: 'MTS-PB-S1-T2', name: 'Civics', questions: 2 },
            { id: 'MTS-PB-S1-T3', name: 'General Knowledge', questions: 2 },
            { id: 'MTS-PB-S1-T4', name: 'Indian Culture & Freedom Struggle', questions: 2 },
            { id: 'MTS-PB-S1-T5', name: 'Ethics and Morale study', questions: 2 },
          ],
        },
        {
          sectionName: 'Basic Arithmetic',
          topics: [
            { id: 'MTS-PB-S2-T1', name: 'BODMAS', questions: 2 },
            { id: 'MTS-PB-S2-T2', name: 'Percentage', questions: 1 },
            { id: 'MTS-PB-S2-T3', name: 'Profit and loss', questions: 1 },
            { id: 'MTS-PB-S2-T4', name: 'Simple interest', questions: 1 },
            { id: 'MTS-PB-S2-T5', name: 'Average', questions: 1 },
            { id: 'MTS-PB-S2-T6', name: 'Time and work', questions: 1 },
            { id: 'MTS-PB-S2-T7', name: 'Time and distance', questions: 1 },
            { id: 'MTS-PB-S2-T8', name: 'Unitary Method', questions: 2 },
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
            { id: 'PM-P1-SA-T1', name: 'Organization of the Department', questions: 2 },
            { id: 'PM-P1-SA-T2', name: 'Type of Post Offices', questions: 2 },
            { id: 'PM-P1-SA-T3', name: 'Business Hours', questions: 2 },
            { id: 'PM-P1-SA-T4', name: 'Payment of postage, stamps and stationery', questions: 2 },
            { id: 'PM-P1-SA-T5', name: 'General rules as to packing, sealing and posting manner of affixing Postage stamps', questions: 2 },
            { id: 'PM-P1-SA-T6', name: 'Methods of address', questions: 2 },
            { id: 'PM-P1-SA-T7', name: 'Post boxes and Post bags', questions: 2 },
            { id: 'PM-P1-SA-T8', name: 'Duties of Letter Box Peon', questions: 2 },
            { id: 'PM-P1-SA-T9', name: 'Official postal articles', questions: 2 },
            { id: 'PM-P1-SA-T10', name: 'Prohibited postal articles', questions: 2 },
            { id: 'PM-P1-SA-T11', name: 'Products and Services: Mails, Banking & Remittances, Insurance, Stamps and Business', questions: 3 },
            { id: 'PM-P1-SA-T12', name: 'Definitions', questions: 7 },
          ],
        },
        {
          sectionName: 'Part-B: General Awareness and Basic Arithmetic',
          topics: [
            { id: 'PM-P1-SB-T1', name: 'Indian Geography', questions: 2 },
            { id: 'PM-P1-SB-T2', name: 'Civics', questions: 2 },
            { id: 'PM-P1-SB-T3', name: 'General Knowledge', questions: 2 },
            { id: 'PM-P1-SB-T4', name: 'Indian Culture & Freedom Struggle', questions: 2 },
            { id: 'PM-P1-SB-T5', name: 'Ethics and Morale study', questions: 2 },
            { id: 'PM-P1-SB-T6', name: 'BODMAS', questions: 2 },
            { id: 'PM-P1-SB-T7', name: 'Percentage', questions: 1 },
            { id: 'PM-P1-SB-T8', name: 'Profit and loss', questions: 1 },
            { id: 'PM-P1-SB-T9', name: 'Simple interest', questions: 1 },
            { id: 'PM-P1-SB-T10', name: 'Average', questions: 1 },
            { id: 'PM-P1-SB-T11', name: 'Time and work', questions: 1 },
            { id: 'PM-P1-SB-T12', name: 'Time and distance', questions: 1 },
            { id: 'PM-P1-SB-T13', name: 'Unitary Method', questions: 2 },
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
            { id: 'PM-P2-S1-T1', name: 'Delivery of mails', questions: 1 },
            { id: 'PM-P2-S1-T2', name: 'Refusal of article', questions: 1 },
            { id: 'PM-P2-S1-T3', name: 'Payment of eMoney Order', questions: 1 },
            { id: 'PM-P2-S1-T4', name: 'Redirection', questions: 1 },
            { id: 'PM-P2-S1-T5', name: 'Instruction regarding address change', questions: 1 },
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
              'Book of receipts for High-Value delivery',
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
      partName: 'Paper-I: Postal Knowledge and General Awareness',
      totalQuestions: 100,
      sections: [
        {
          sectionName: 'Part-A: Postal Knowledge (50 Questions)',
          topics: [
            { id: 'PA-P1-SA-T1', name: 'Post Office Guide Part I', questions: 10, subTopics: ['Except Telegraphic Money Order'] },
            { id: 'PA-P1-SA-T2', name: 'Post Office Guide Part II', questions: 10, subTopics: ['Except British and Irish Postal Order'] },
            { id: 'PA-P1-SA-T3', name: 'IT Modernisation project terms of Dept. of Posts', questions: 10, subTopics: ['Basic terminologies related to IT Modernisation project of Department of Posts'] },
            { id: 'PA-P1-SA-T4', name: 'Products and Services', questions: 10, subTopics: ['Mails', 'Banking & Remittances', 'Insurance', 'Stamps and Business', 'India Post Website references'] },
            { id: 'PA-P1-SA-T5', name: 'Postal Manual VI Part I & III, SO Orders', questions: 5, subTopics: ['Postal Manual Volume VI Part I', 'Postal Manual Volume VI Part III (Chapter I & II)', 'Unlimited SO orders issued by Directorate'] },
            { id: 'PA-P1-SA-T6', name: 'Postal Manual VII & Foreign Post Manual', questions: 5, subTopics: ['Postal Manual Volume VII', 'Foreign Post Manual'] },
          ],
        },
        {
          sectionName: 'Part-B: General Knowledge, Arithmetic, and Reasoning (50 Questions)',
          topics: [
            { id: 'PA-P1-SB-T1', name: 'General Awareness / Knowledge', questions: 10, subTopics: ['Indian Geography', 'Civics', 'General Politics', 'Indian Culture & Freedom Struggle', 'Ethics and Morals'] },
            { id: 'PA-P1-SB-T2', name: 'Basic Arithmetic', questions: 20, subTopics: ['BODMAS', 'Percentage', 'Profit and Loss', 'Simple Interest', 'Average', 'Time and Work', 'Time and Distance', 'Unitary Method'] },
            { id: 'PA-P1-SB-T3', name: 'Reasoning and Analytical Ability', questions: 20, subTopics: ['Non-Verbal / Pictorial Reasoning'] },
          ],
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
          sectionName: 'Acts',
          topics: [
            { id: 'GB-P1-S1-T1', name: 'Consumer Protection Act, 2019', questions: 3 },
            { id: 'GB-P1-S1-T2', name: 'Prevention of Money Laundering Act, 2002', questions: 3 }
          ]
        },
        {
          sectionName: 'Inland/ Foreign Post',
          topics: [
            { id: 'GB-P1-S2-T1', name: 'Indian Post Office Rules, 1933', questions: 3 },
            { id: 'GB-P1-S2-T2', name: 'Post Office Guide Part I', questions: 3 },
            { id: 'GB-P1-S2-T3', name: 'Post Office Guide Part II', questions: 3 },
            { id: 'GB-P1-S2-T4', name: 'Guidelines/instructions issued by Directorate for Inland Post and Foreign Post services', questions: 3 },
            { id: 'GB-P1-S2-T5', name: 'Book of BO Rules', questions: 2 }
          ]
        },
        {
          sectionName: 'Mail Operations',
          topics: [
            { id: 'GB-P1-S3-T1', name: 'Postal Manual Volume V', questions: 4 },
            { id: 'GB-P1-S3-T2', name: 'Postal Manual Volume VII', questions: 3 },
            { id: 'GB-P1-S3-T3', name: 'Guidelines issued by Directorate on Mail Network optimization Project / PNOP / Business Development', questions: 3 }
          ]
        },
        {
          sectionName: 'Money Remittance',
          topics: [
            { id: 'GB-P1-S4-T1', name: 'Guidelines/ instructions issued by Directorate on eMO, IMTS and IFS MO', questions: 4 }
          ]
        },
        {
          sectionName: 'Saving Bank Scheme and Certificates',
          topics: [
            { id: 'GB-P1-S5-T1', name: 'Government Savings Promotion General Rules, 2018', questions: 1 },
            { id: 'GB-P1-S5-T2', name: 'Post Office Saving Account Scheme, 2019', questions: 1 },
            { id: 'GB-P1-S5-T3', name: 'National Savings Recurring Deposit Scheme, 2019', questions: 1 },
            { id: 'GB-P1-S5-T4', name: 'National Savings Time Deposit Scheme, 2019', questions: 1 },
            { id: 'GB-P1-S5-T5', name: 'National Savings (Monthly Income Account) Scheme, 2019', questions: 1 },
            { id: 'GB-P1-S5-T6', name: 'Senior Citizen Savings Scheme, 2019', questions: 1 },
            { id: 'GB-P1-S5-T7', name: 'National Savings Certificates (VIII Issue), Scheme, 2019', questions: 1 },
            { id: 'GB-P1-S5-T8', name: 'Kisan Vikas Patra Scheme, 2019', questions: 1 },
            { id: 'GB-P1-S5-T9', name: 'Public Provident Fund Scheme, 2019', questions: 1 },
            { id: 'GB-P1-S5-T10', name: 'Sukanya Samriddhi Account Scheme, 2019', questions: 1 },
            { id: 'GB-P1-S5-T11', name: 'Post Office Saving Bank Manual Volume I & II', questions: 1 },
            { id: 'GB-P1-S5-T12', name: 'SB orders issued by Directorate from 01.01.2007 onwards', questions: 1 },
            { id: 'GB-P1-S5-T13', name: 'Guidelines issued by Directorate on Core Banking Services', questions: 1 },
            { id: 'GB-P1-S5-T14', name: 'Post Office Saving Bank (CBS) Manual', questions: 1 }
          ]
        },
        {
          sectionName: 'Postal Life Insurance and Rural PLI',
          topics: [
            { id: 'GB-P1-S6-T1', name: 'Post Office Life Insurance Rules, 2011', questions: 3 },
            { id: 'GB-P1-S6-T2', name: 'Guidelines issued by Directorate on PLI/ RPLI and Core Insurance solution', questions: 4 }
          ]
        },
        {
          sectionName: 'Organization of the Department',
          topics: [
            { id: 'GB-P1-S7-T1', name: 'Postal Manual Volume II (Chapter - I - organization)', questions: 2 },
            { id: 'GB-P1-S7-T2', name: 'Citizen Charter of Department of Posts', questions: 2 },
            { id: 'GB-P1-S7-T3', name: 'Guidelines and instructions on complaint grievances handling', questions: 3 }
          ]
        },
        {
          sectionName: 'IT Modernization',
          topics: [
            { id: 'GB-P1-S8-T1', name: 'Guidelines issued by Directorate on IT modernization Project of Department of Posts', questions: 4 },
            { id: 'GB-P1-S8-T2', name: 'Handbook on Philately', questions: 2 },
            { id: 'GB-P1-S8-T3', name: 'Directorate instructions on Philately', questions: 2 }
          ]
        },
        {
          sectionName: 'Office Procedure',
          topics: [
            { id: 'GB-P1-S9-T1', name: 'Postal Manual Volume II - Chapter XI - Misc. Rules', questions: 2 },
            { id: 'GB-P1-S9-T2', name: 'Manual of Office Procedure', questions: 3 },
            { id: 'GB-P1-S9-T3', name: 'Annual Reports and Book of Information of D/o Posts', questions: 2 }
          ]
        },
        {
          sectionName: 'Material Management',
          topics: [
            { id: 'GB-P1-S10-T1', name: 'Postal Manual Volume II - Chapter VI, VIII, IX, XII', questions: 3 },
            { id: 'GB-P1-S10-T2', name: 'Chapter 6 of General Financial Rules, 2017', questions: 2 },
            { id: 'GB-P1-S10-T3', name: 'CVC guidelines on Public procurement and e-procurement', questions: 3 },
            { id: 'GB-P1-S10-T4', name: 'Manual on policies and procedure for purchase of goods and services', questions: 3 }
          ]
        },
        {
          sectionName: 'Establishment and Administrative matters',
          topics: [
            { id: 'GB-P1-S11-T1', name: 'Postal Manual Volume IV', questions: 1 },
            { id: 'GB-P1-S11-T2', name: 'Instructions issued by Directorate and DoP&T on maintenance of APAR', questions: 1 },
            { id: 'GB-P1-S11-T3', name: 'Schedule of Financial Powers of Divisional Heads and Head of the Circle', questions: 1 },
            { id: 'GB-P1-S11-T4', name: 'Welfare measures for Departmental Employees and GDS', questions: 1 },
            { id: 'GB-P1-S11-T5', name: 'DoP&T instructions on Establishment and administration', questions: 1 },
            { id: 'GB-P1-S11-T6', name: 'Brochure on reservation, instructions regarding sports person reservation', questions: 2 },
            { id: 'GB-P1-S11-T7', name: 'Recruitment Rules relating to various cadres in D/o Posts', questions: 1 },
            { id: 'GB-P1-S11-T8', name: 'Establishment Norms', questions: 2 }
          ]
        },
        {
          sectionName: 'General Knowledge & Subjective',
          topics: [
            { id: 'GB-P1-S12-T1', name: 'Current Affairs (15 questions for 30 marks)', questions: 15 },
            { id: 'GB-P1-S12-T2', name: 'Noting and Drafting (25 marks each)', questions: 0 }
          ]
        }
      ]
    },
    {
      partName: 'Paper-II: Service Rules and Financial Regulations',
      totalQuestions: 150,
      sections: [
        {
          sectionName: 'Subjects',
          topics: [
            { id: 'GB-P2-S1-T1', name: '1. Central Civil Services (Conduct) Rules, 1964', questions: 5 },
            { id: 'GB-P2-S1-T2', name: '2. Central Civil Services (Classification, Control and Appeal) Rules, 1965', questions: 5 },
            { id: 'GB-P2-S1-T3', name: '3. Schedule of Appointing/ Disciplinary /Appellate Authority', questions: 5 },
            { id: 'GB-P2-S1-T4', name: '4. Central Civil Services (Temporary Service) Rules, 1965', questions: 5 },
            { id: 'GB-P2-S1-T5', name: '5. Brochure on Casual laborer of DoPT and instructions issued by DoP', questions: 5 },
            { id: 'GB-P2-S1-T6', name: '6. Central Civil Services (Pension) Rules, 2021', questions: 5 },
            { id: 'GB-P2-S1-T7', name: '7. New Pension Scheme, 2004', questions: 5 },
            { id: 'GB-P2-S1-T8', name: '8. Central Civil Services (Commutation of Pension) Rules, 1981', questions: 5 },
            { id: 'GB-P2-S1-T9', name: '9. Central Civil Services (Leave) Rules, 1972', questions: 5 },
            { id: 'GB-P2-S1-T10', name: '10. Central Civil Services (Joining Time) Rules, 1979', questions: 5 },
            { id: 'GB-P2-S1-T11', name: '11. General Provident Fund (Central Service) Rules, 1960', questions: 5 },
            { id: 'GB-P2-S1-T12', name: '12. Central Services (Medical Attendance) Rules, 1944', questions: 5 },
            { id: 'GB-P2-S1-T13', name: '13. Fundamental and Supplementary Rules', questions: 5 },
            { id: 'GB-P2-S1-T14', name: '14. Central Civil Services (Leave Travel Concession) Rules, 1988', questions: 5 },
            { id: 'GB-P2-S1-T15', name: '15. Central Civil Services (Revised Pay) Rules, 2016', questions: 5 },
            { id: 'GB-P2-S1-T16', name: '16. Postal Financial Handbook Volume I and II', questions: 5 },
            { id: 'GB-P2-S1-T17', name: '17. General Financial Rules 2017 other than public procurement', questions: 5 },
            { id: 'GB-P2-S1-T18', name: '18. Rules relating to Children Education allowance and Hostel Subsidy', questions: 5 },
            { id: 'GB-P2-S1-T19', name: '19. Central Government Employees Group Insurance Scheme, 1980', questions: 5 },
            { id: 'GB-P2-S1-T20', name: '20. Gramin Dak Sevak (Conduct and Engagement) Rules, 2011', questions: 5 },
            { id: 'GB-P2-S1-T21', name: '21. Central Administrative Tribunal Act, 1985 and its Rules', questions: 5 },
            { id: 'GB-P2-S1-T22', name: '22. Right to Information Act 2005 and RTI Rules 2012', questions: 5 },
            { id: 'GB-P2-S1-T23', name: '23. Sexual Harassment of Women at Workplace Act, 2013', questions: 4 },
            { id: 'GB-P2-S1-T24', name: '24. Public Accountants Default Act, 1850', questions: 4 },
            { id: 'GB-P2-S1-T25', name: '25. Revenue Recovery Act, 1890', questions: 4 },
            { id: 'GB-P2-S1-T26', name: '26. Prevention of corruption Act, 1988 with (Amendment) 2018', questions: 5 },
            { id: 'GB-P2-S1-T27', name: '27. CCS (Recognition of Service Association) Rules, 1993', questions: 4 },
            { id: 'GB-P2-S1-T28', name: '28. Goods and Services Tax (GST) Act, 2017', questions: 4 },
            { id: 'GB-P2-S1-T29', name: '29. Postal Manual Vol II (Ch VII - Forged stamps, coins, etc)', questions: 4 },
            { id: 'GB-P2-S1-T30', name: '30. IPPB accounting and operations pertaining to Post offices', questions: 4 },
            { id: 'GB-P2-S1-T31', name: '31. Preservation and Disposal of Postal Records', questions: 4 },
            { id: 'GB-P2-S1-T32', name: '32. Inspection questionnaires', questions: 4 }
          ]
        }
      ]
    }
  ]
};

export { IP_BLUEPRINT };
