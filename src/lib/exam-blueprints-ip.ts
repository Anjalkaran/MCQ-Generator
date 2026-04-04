
export const IP_BLUEPRINT = {
    examName: 'Inspector Posts (IP) Exam',
    totalDurationMinutes: 330, // 2:30 hrs (Paper-I) + 3:00 hrs (Paper-III)
    parts: [
      {
        partName: 'Paper-I: Acts, Rules and Postal Operations',
        totalQuestions: 125,
        sections: [
          {
            sectionName: 'Acts',
            randomFrom: {
              questions: 20,
              topics: [
                'The Post Office Act, 2023 (Act No.43 of 2023)',
                'Government Savings Promotion Act-1873',
                'Prevention of Money Laundering Act, 2002 and its Amendments (AML/CFT Norms)',
                'Consumer Protection Act, 2019',
                'Information Technology Act, 2000'
              ],
            },
          },
          {
            sectionName: 'Postal and Savings Rules',
            randomFrom: {
                questions: 30,
                topics: [
                    'The Post office Rules, 2024 & The Post office Regulations, 2024',
                    'Government Savings Promotion Rules, 2018',
                    'Post Office Savings Account Scheme, 2019',
                    'National Savings Recurring Deposit Scheme, 2019',
                    'National Savings Time Deposit Scheme, 2019',
                    'National Savings (Monthly Income Account) Scheme, 2019',
                    'Senior Citizens\' Savings Scheme, 2019',
                    'National Savings Certificate (VIII Issue) Scheme, 2019',
                    'Kisan Vikas Patra Scheme, 2019',
                    'Public Provident Fund Scheme, 2019',
                    'Sukanya Samridhi Account Scheme, 2019',
                    'Post office Life Insurance Scheme, 2011 & its amendments (SANKALAN)',
                    'Jansuraksha Schemes'
                ]
            }
          },
          {
            sectionName: 'Postal Manuals and Operations',
            randomFrom: {
              questions: 40,
              topics: [
                'Book of BO Rules',
                'Postal Manual Volume II',
                'Postal Manual Volume III',
                'Postal Manual Volume IV - Leave, pension, Gratuities, Recruitment rules',
                'Postal Manual Volume VIII',
                'Postal Manual Volume V (except Appendix-I)',
                'Postal Manual Volume VI, Part-I, Chapter-I',
                'Postal Manual Volume VI, Part-II (except telegraphic money orders)',
                'Postal Manual Volume VI, Part-III, Except Appendices',
                'Postal Manual Volume VII',
                'Post Office Guide Part-I',
                'Post Office Guide Part-II, Except Section VII & VIII'
              ]
            }
          },
          {
            sectionName: 'Optimization, IT and IPPB',
            randomFrom: {
              questions: 20,
              topics: [
                'Domestic/Foreign Post Guidelines issued by Directorate',
                'Digital Personal Identification Number (DIGIPIN)',
                'Mail Network Optimization Project and Parcel Network Optimization Project',
                'Centralized Delivery of Postal Articles by Delivery Staff, DNKs',
                'Guidelines on consolidation of products',
                'Post office Savings Bank Manual Volume I, II & III',
                'POSB (CBS) Manual Corrected and SB Orders',
                'Annual Reports and Book of Information of Department of posts',
                'APT Knowledge (IT 2.0)',
                'Core Banking Solutions, PLI-CIS',
                'India Post Payments Bank (IPPB)',
                'Preservation and disposal of Postal Records'
              ]
            }
          },
          {
            sectionName: 'Conduct and Engagement Rules',
            randomFrom: {
              questions: 15,
              topics: [
                'CCS (Conduct) Rules, 1964',
                'CCS (CCA) Rules, 1965',
                'CCS (Temporary Service) Rules, 1965',
                'GDS (Conduct & Engagement) Rules, 2020'
              ]
            }
          }
        ],
      },
      {
        partName: 'Paper-III: Constitutional, Financial and Aptitude',
        totalQuestions: 150,
        sections: [
          {
            sectionName: 'Constitutional and Legal Framework',
            randomFrom: {
              questions: 35,
              topics: [
                'Constitution of India',
                'Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)',
                'Central Administrative Tribunal Act, 1985',
                'Revenue Recovery Act, 1890',
                'Prevention of Corruption Act, 1988',
                'RTI Act, 2005 and RTI Rules, 2012',
                'Sexual Harassment of Women at Workplace Act, 2013'
              ]
            }
          },
          {
            sectionName: 'Financial and Procurement Rules',
            randomFrom: {
              questions: 35,
              topics: [
                'Manual on Procurement of Goods, Works and Consultancy',
                'CCS (GPF) Rules, 1961',
                'CCS (Pension) Rules, 2021',
                'CCS (Commutation of Pension) Rules, 1981',
                'National Pension System (NPS)',
                'General Financial Rules (GFR), 2017',
                'Fundamental Rules (FR) and Supplementary Rules (SR)',
                'P&T FHB Volume I and Postal FHB Volume II'
              ]
            }
          },
          {
            sectionName: 'Establishment and Administration',
            randomFrom: {
              questions: 30,
              topics: [
                'Casual labourers brochure',
                'Maintenance of APAR',
                'Service Discharge Benefit Scheme, 2010',
                'Financial Powers of Circle Heads',
                'Welfare measures for Departmental Employees and GDS',
                'Schedule of Financial Powers of Divisional Heads, Heads of Circle'
              ]
            }
          },
          {
            sectionName: 'General Aptitude and Knowledge',
            randomFrom: {
              questions: 50,
              topics: [
                'English language',
                'General knowledge & Current Affairs (Indian Economy, Polity, Sports, Culture & Science)',
                'Reasoning and Interpersonal Skills',
                'Mental Aptitude, Quantitative Aptitude, Intelligence and Ethics'
              ]
            }
          }
        ]
      }
    ],
  };
