
export const IP_BLUEPRINT = {
    examName: 'Inspector Posts (IP) Exam',
    totalDurationMinutes: 390, // 150 (P1) + 60 (P2) + 180 (P3)
    parts: [
      {
        partName: 'Paper-I: Acts, Rules and Postal Operations',
        totalQuestions: 125,
        sections: [
          {
            sectionName: '1. Acts',
            topics: [
              { id: 'IP-P1-S1-T1', name: 'The Post Office Act, 2023 (Act No.43 of 2023)', questions: 3 },
              { id: 'IP-P1-S1-T2', name: 'Government Savings Promotion Act-1873', questions: 3 },
              { id: 'IP-P1-S1-T3', name: 'Prevention of Money Laundering Act, 2002 and its Amendments (Necessary on account of AML/CFT Norms)', questions: 3 },
              { id: 'IP-P1-S1-T4', name: 'Consumer Protection Act, 2019', questions: 2 },
              { id: 'IP-P1-S1-T5', name: 'Information Technology Act, 2000', questions: 2 }
            ]
          },
          {
            sectionName: '2. Rules',
            topics: [
              { id: 'IP-P1-S2-T1', name: 'The Post office Rules, 2024 & The Post office Regulations, 2024', questions: 3 },
              { id: 'IP-P1-S2-T2', name: 'Government Savings Promotion Rules, 2018', questions: 2 },
              { id: 'IP-P1-S2-T3', name: 'Post Office Savings Account Scheme, 2019', questions: 2 },
              { id: 'IP-P1-S2-T4', name: 'National Savings Recurring Deposit Scheme, 2019', questions: 2 },
              { id: 'IP-P1-S2-T5', name: 'National Savings Time Deposit Scheme, 2019', questions: 2 },
              { id: 'IP-P1-S2-T6', name: 'National Savings (Monthly Income Account) Scheme, 2019', questions: 2 },
              { id: 'IP-P1-S2-T7', name: 'Senior Citizens\' Savings Scheme, 2019', questions: 2 },
              { id: 'IP-P1-S2-T8', name: 'National Savings Certificate (VIII Issue) Scheme, 2019', questions: 2 },
              { id: 'IP-P1-S2-T9', name: 'Kisan Vikas Patra Scheme, 2019', questions: 2 },
              { id: 'IP-P1-S2-T10', name: 'Public Provident Fund Scheme, 2019', questions: 2 },
              { id: 'IP-P1-S2-T11', name: 'Sukanya Samriddhi Account Scheme, 2019', questions: 2 }
            ]
          },
          {
            sectionName: '3. POLI',
            topics: [
              { id: 'IP-P1-S3-T1', name: 'Post office Life Insurance Scheme, 2011 & its amendments compiled as SANKALAN (& subsequent instructions/guidelines if any)', questions: 5 }
            ]
          },
          {
            sectionName: '4. Postal Manuals/Rules',
            topics: [
              { id: 'IP-P1-S4-T1', name: 'Book of BO Rules', questions: 3 },
              { id: 'IP-P1-S4-T2', name: 'Postal Manual Volume II', questions: 4 },
              { id: 'IP-P1-S4-T3', name: 'Postal Manual Volume III', questions: 4 },
              { id: 'IP-P1-S4-T4', name: 'Postal Manual Volume IV - Leave, pension, Gratuities, Dealings on Examination, Recruitment rules of all Cadres and establishment norms', questions: 6 },
              { id: 'IP-P1-S4-T5', name: 'Postal Manual Volume VIII', questions: 3 }
            ]
          },
          {
            sectionName: 'Mail Operations and Money Remittances',
            topics: [
                { id: 'IP-P1-S4-T6', name: 'Postal Manual Volume V (except Appendix-I)', questions: 4 },
                { id: 'IP-P1-S4-T7', name: 'Postal Manual Volume VI, Part-I, Chapter-I', questions: 3 },
                { id: 'IP-P1-S4-T8', name: 'Postal Manual Volume VI, Part-II, except telegraphic money orders, British & Irish Postal Orders (to be deleted)', questions: 4 },
                { id: 'IP-P1-S4-T9', name: 'Postal Manual Volume VI, Part-III, Except Appendices', questions: 4 },
                { id: 'IP-P1-S4-T10', name: 'Postal Manual Volume VII', questions: 3 }
            ]
          },
          {
            sectionName: '5. Jansuraksha Schemes',
            topics: [
              { id: 'IP-P1-S5-T1', name: 'Jansuraksha Schemes', questions: 4 }
            ]
          },
          {
            sectionName: '6. Guidelines/Instructions relating to Inland/foreign Post',
            topics: [
              { id: 'IP-P1-S6-T1', name: 'Post Office Guide Part-I', questions: 4 },
              { id: 'IP-P1-S6-T2', name: 'Post Office Guide Part-II, Except Section VII & VIII', questions: 4 },
              { id: 'IP-P1-S6-T3', name: 'Domestic/Foreign Post Guidelines issued by Directorate', questions: 4 }
            ]
          },
          {
            sectionName: '7. Digital Personal Identification Number',
            topics: [
              { id: 'IP-P1-S7-T1', name: 'Basic understanding of Digital Personal Identification Number (DIGIPIN)', questions: 3 }
            ]
          },
          {
            sectionName: '8. Mail Network Optimization',
            topics: [
              { id: 'IP-P1-S8-T1', name: 'Guidelines issued by Directorate on Mail Network Optimization Project and Parcel Network Optimization Project, Policy Guidelines on Centralized Delivery of All types of Postal Articles by Delivery Staff, Dak Ghar Niryat Kendra (DNKs)', questions: 5 }
            ]
          },
          {
            sectionName: '9. Product Consolidation',
            topics: [
              { id: 'IP-P1-S9-T1', name: 'Guidelines issued by Directorate on consolidation of products', questions: 2 }
            ]
          },
          {
            sectionName: '10. Savings Bank and Savings Certificates',
            topics: [
              { id: 'IP-P1-S10-T1', name: 'Post office Savings Bank Manual Volume I, II & III read with SB orders issued by Directorate from time to time', questions: 4 },
              { id: 'IP-P1-S10-T2', name: 'POSB (CBS) Manual Corrected up to 31.12.2021 and subsequent SB Orders', questions: 4 }
            ]
          },
          {
            sectionName: '11. Annual Reports',
            topics: [
              { id: 'IP-P1-S11-T1', name: 'Annual Reports and Book of Information of Department of posts', questions: 2 }
            ]
          },
          {
            sectionName: '12. Information Technology',
            topics: [
              { id: 'IP-P1-S12-T1', name: 'APT Knowledge (IT 2. O)', questions: 4 },
              { id: 'IP-P1-S12-T2', name: 'Working knowledge on Core Banking Solutions, PLI-CIS', questions: 4 }
            ]
          },
          {
            sectionName: '13. India Post Payments Bank',
            topics: [
              { id: 'IP-P1-S13-T1', name: 'India Post Payments Bank', questions: 3 }
            ]
          },
          {
            sectionName: '14. Records Preservation',
            topics: [
              { id: 'IP-P1-S14-T1', name: 'Preservation and disposal of Postal Records', questions: 2 }
            ]
          },
          {
            sectionName: '15. Conduct Rules',
            topics: [
              { id: 'IP-P1-S15-T1', name: 'CCS (Conduct) Rules, 1964', questions: 4 }
            ]
          },
          {
            sectionName: '16. CCA Rules',
            topics: [
              { id: 'IP-P1-S16-T1', name: 'CCS (CCA) Rules, 1965', questions: 4 }
            ]
          },
          {
            sectionName: '17. Temporary Service Rules',
            topics: [
              { id: 'IP-P1-S17-T1', name: 'CCS (Temporary Service) Rules, 1965', questions: 2 }
            ]
          },
          {
            sectionName: '18. GDS Rules',
            topics: [
              { id: 'IP-P1-S18-T1', name: 'GDS (Conduct & Engagement) Rules, 2020 and orders/guidelines issued by the Directorate from time to time related to the GDS Matters', questions: 4 }
            ]
          }
        ]
      },
      {
        partName: 'Paper-II: Noting, Drafting and Charge Sheet',
        totalQuestions: 0,
        sections: [
          {
            sectionName: 'Subjective Assessment (50 Marks)',
            topics: [
              { id: 'IP-P2-S1-T1', name: 'Noting in approx. 200 words on a given topic (15 marks)', questions: 0 },
              { id: 'IP-P2-S1-T2', name: 'Drafting in approx. 200 words on a given topic (15 marks)', questions: 0 },
              { id: 'IP-P2-S1-T3', name: 'Draft Major Penalty Charge Sheet (20 marks)', questions: 0 }
            ]
          }
        ]
      },
      {
        partName: 'Paper-III: Constitutional and Financial Knowledge',
        totalQuestions: 150,
        sections: [
          {
            sectionName: '1. Constitution of India',
            topics: [
              { id: 'IP-P3-S1-T1', name: 'Constitution of India- Preamble to Constitution of India, Fundamental Rights, Directive Principles of State Policy, Fundamental Duties, Articles 124-147, Articles 214-232, 311, 338, 338 (a), 338 (b)', questions: 12 }
            ]
          },
          {
            sectionName: '2. Bharatiya Nagarik Suraksha Sanhita',
            topics: [
              { id: 'IP-P3-S2-T1', name: 'The Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS): (i) Section I - Short Title, extent and commencement, (ii) Section 2 - Definitions, (iii) Section 84: Proclamation for person absconding', questions: 8 }
            ]
          },
          {
            sectionName: '3. Central Administrative Tribunal Act',
            topics: [
              { id: 'IP-P3-S3-T1', name: 'Central Administrative Tribunal Act, 1985', questions: 5 }
            ]
          },
          {
            sectionName: '4. Revenue Recovery Act',
            topics: [
              { id: 'IP-P3-S4-T1', name: 'Revenue Recovery Act, 1890', questions: 4 }
            ]
          },
          {
            sectionName: '5. Prevention of Corruption Act',
            topics: [
              { id: 'IP-P3-S5-T1', name: 'Prevention of Corruption Act, 1988 as amended', questions: 5 }
            ]
          },
          {
            sectionName: '6. RTI Act',
            topics: [
              { id: 'IP-P3-S6-T1', name: 'RTI Act,2005 and RTI Rules,2012', questions: 5 }
            ]
          },
          {
            sectionName: '7. Manuals on Procurement',
            topics: [
              { id: 'IP-P3-S7-T1', name: 'Manuals on Procurement: (i) Manual on Procurement of Goods, (ii) Manual on Procurement of Works and (iii) Manual on Procurement of Consultancy & Other Services', questions: 10 }
            ]
          },
          {
            sectionName: '8. CCS (GPF) Rules',
            topics: [
              { id: 'IP-P3-S8-T1', name: 'CCS (GPF) Rules, 1961', questions: 5 }
            ]
          },
          {
            sectionName: '9. CCS (Pension) Rules',
            topics: [
              { id: 'IP-P3-S9-T1', name: 'CCS (Pension) Rules, 2021 and its amendments', questions: 10 }
            ]
          },
          {
            sectionName: '10. Commutation of Pension',
            topics: [
              { id: 'IP-P3-S10-T1', name: 'CCS (Commutation of Pension) Rules, 1981', questions: 5 }
            ]
          },
          {
            sectionName: '11. Sexual Harassment Act',
            topics: [
              { id: 'IP-P3-S11-T1', name: 'Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 and related instructions issued by the DoPT from time to time.', questions: 4 }
            ]
          },
          {
            sectionName: '12. NPS',
            topics: [
              { id: 'IP-P3-S12-T1', name: 'NPS: (i) Central Civil Services (Implementation of National Pension System) Rules, 2021 (as amended). (ii) Central Civil Services (Payment of Gratuity under National Pension System) Rules, 2021 (as amended)', questions: 8 }
            ]
          },
          {
            sectionName: '13. GFR 2017',
            topics: [
              { id: 'IP-P3-S13-T1', name: 'Chapter 2 and 6 of General Financial Rules, 2017 (and amendment thereof)', questions: 10 }
            ]
          },
          {
            sectionName: '14. FR and SR',
            topics: [
              { id: 'IP-P3-S14-T1', name: 'Fundamental Rules (FR) and Supplementary Rules (SR)', questions: 10 }
            ]
          },
          {
            sectionName: '15. Casual Labourers',
            topics: [
              { id: 'IP-P3-S15-T1', name: 'Brochure on casual labourers and instructions on Casual Labourers issued by DoP&T from time to time', questions: 4 }
            ]
          },
          {
            sectionName: '16. APAR',
            topics: [
              { id: 'IP-P3-S16-T1', name: 'Instructions issued by Directorate and DoP&T on maintenance of APAR', questions: 4 }
            ]
          },
          {
            sectionName: '17. Benefit Scheme',
            topics: [
              { id: 'IP-P3-S17-T1', name: 'Service Discharge Benefit Scheme, 2010', questions: 2 }
            ]
          },
          {
            sectionName: '18. Financial Powers',
            topics: [
              { id: 'IP-P3-S18-T1', name: 'Schedule of Financial Powers of Divisional Heads, Heads of Circle', questions: 4 }
            ]
          },
          {
            sectionName: '19. Welfare Measures',
            topics: [
              { id: 'IP-P3-S19-T1', name: 'Welfare measures available to Departmental Employees and Gramin Dak Sevak of DoP', questions: 4 }
            ]
          },
          {
            sectionName: '20. FHB Volume',
            topics: [
              { id: 'IP-P3-S20-T1', name: 'P&T FHB Volume I and Postal FHB Volume II', questions: 6 }
            ]
          },
          {
            sectionName: '21. English',
            topics: [
              { id: 'IP-P3-S21-T1', name: 'Questions on English language', questions: 10 }
            ]
          },
          {
            sectionName: '22. GK and Current Affairs',
            topics: [
              { id: 'IP-P3-S22-T1', name: 'Questions on General knowledge & Current Affairs (Indian Economy, Polity, Sports, Culture & Science)', questions: 10 }
            ]
          },
          {
            sectionName: '23. Aptitude and Reasoning',
            topics: [
              { id: 'IP-P3-S23-T1', name: 'Questions on Reasoning, Interpersonal Skills, Mental Aptitude, Quantitative Aptitude, Intelligence and Ethics', questions: 15 }
            ]
          }
        ]
      }
    ]
};
