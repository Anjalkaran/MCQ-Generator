
const fs = require('fs');
const path = require('path');

// This is just a helper to construct the Firestore JSON for the POSTMAN syllabus update
const subTopics = [
  'SB', 'RD', 'SSA', 'PPF', 'SCSS', 'TD & MIS', 'MSSC', 'NSC & KVP', 'Misc', 'PLI/RPLI', 'IPPB', 'Money Remittances', 'Mails', 'Stamps', 'PM Jansuraksha & APY'
];

const postmanParts = [
  {
    partName: "Paper-I: Basic Postal Knowledge and General Awareness",
    totalQuestions: 50,
    sections: [
      {
        sectionName: "Part-A: Postal Knowledge",
        topics: [
          { id: "PM-P1-SA-T1", name: "Organization of the Department", questions: 2 },
          { id: "PM-P1-SA-T2", name: "Type of Post Offices", questions: 2 },
          { id: "PM-P1-SA-T3", name: "Business Hours", questions: 2 },
          { id: "PM-P1-SA-T4", name: "Payment of postage, stamps and stationery", questions: 2 },
          { id: "PM-P1-SA-T5", name: "General rules as to packing, sealing and posting manner of affixing Postage stamps", questions: 2 },
          { id: "PM-P1-SA-T6", name: "Methods of address", questions: 2 },
          { id: "PM-P1-SA-T7", name: "Post boxes and Post bags", questions: 2 },
          { id: "PM-P1-SA-T8", name: "Duties of Letter Box Peon", questions: 2 },
          { id: "PM-P1-SA-T9", name: "Official postal articles", questions: 2 },
          { id: "PM-P1-SA-T10", name: "Prohibited postal articles", questions: 2 },
          { 
            id: "PM-P1-SA-T11", 
            name: "Products and Services: Mails, Banking & Remittances, Insurance, Stamps and Business", 
            questions: 3,
            subTopics: subTopics
          },
          { id: "PM-P1-SA-T12", name: "Definitions", questions: 7 }
        ]
      },
      {
        sectionName: "Part-B: General Awareness and Basic Arithmetic",
        topics: [
          { id: "PM-P1-SB-T1", name: "Indian Geography", questions: 2 },
          { id: "PM-P1-SB-T2", name: "Civics", questions: 2 },
          { id: "PM-P1-SB-T3", name: "General Knowledge", questions: 2 },
          { id: "PM-P1-SB-T4", name: "Indian Culture & Freedom Struggle", questions: 2 },
          { id: "PM-P1-SB-T5", name: "Ethics and Morale study", questions: 2 },
          { id: "PM-P1-SB-T6", name: "BODMAS", questions: 2 },
          { id: "PM-P1-SB-T7", name: "Percentage", questions: 1 },
          { id: "PM-P1-SB-T8", name: "Profit and loss", questions: 1 },
          { id: "PM-P1-SB-T9", name: "Simple interest", questions: 1 },
          { id: "PM-P1-SB-T10", name: "Average", questions: 1 },
          { id: "PM-P1-SB-T11", name: "Time and work", questions: 1 },
          { id: "PM-P1-SB-T12", name: "Time and distance", questions: 1 },
          { id: "PM-P1-SB-T13", name: "Unitary Method", questions: 2 }
        ]
      }
    ]
  },
  {
    partName: "Paper-II: Knowledge of Postal Operations",
    totalQuestions: 25,
    sections: [
      {
        sectionName: "Post Office Guide Part I",
        topics: [
          { id: "PM-P2-S1-T1", name: "Delivery of mails", questions: 1 },
          { id: "PM-P2-S1-T2", name: "Refusal of article", questions: 1 },
          { id: "PM-P2-S1-T3", name: "Payment of eMoney Order", questions: 1 },
          { id: "PM-P2-S1-T4", name: "Redirection", questions: 1 },
          { id: "PM-P2-S1-T5", name: "Instruction regarding address change", questions: 1 }
        ]
      },
      {
        sectionName: "Postal Manual Volume VI - Part III",
        randomFrom: {
          questions: 10,
          topics: [
            "Head Postman", "Knowledge of Postal Business", "Supply of forms to be carried out", "Sale of stamps", "Postman's Book", "Address to be noted on Postal Articles", "Damaged articles to be noticed", "Receipts for articles issued for delivery", "Book of receipts for High-Value delivery", "Instruction for delivery", "Realization of postage before delivery", "Receipts of addresses for registered", "Delivery to illiterate addresses, Pardanashin women", "Delivery of insured articles addressed to minors", "Payment of e-Money Orders", "e-Money Orders addressed to minors", "Payment of e-Mo and delivery of registered letters to lunatics", "Duties of Village Postman"
          ]
        }
      },
      {
        sectionName: "Postal Manual Vol. VII",
        randomFrom: {
          questions: 10,
          topics: [
            "Stamps and Seals", "Portfolio and its contents", "Stationery", "Preparation of daily report", "Mail Abstract", "Exchange of Mails", "Cage TB", "Disposal of Mails addressed to a section or a mail office", "Closing of transit bags", "Duties and responsibilities of Mail Guard/Agent", "Final duties before quitting Van or office", "'A' order and 'B' order"
          ]
        }
      }
    ]
  }
];

const firestoreDoc = {
  fields: {
    examName: { stringValue: "Postman/Mail Guard Exam" },
    id: { stringValue: "POSTMAN" },
    parts: {
      arrayValue: {
        values: postmanParts.map(part => ({
          mapValue: {
            fields: {
              partName: { stringValue: part.partName },
              totalQuestions: { integerValue: part.totalQuestions },
              sections: {
                arrayValue: {
                  values: part.sections.map(section => {
                    const sectionFields = {
                      sectionName: { stringValue: section.sectionName }
                    };
                    if (section.topics) {
                      sectionFields.topics = {
                        arrayValue: {
                          values: section.topics.map(topic => {
                            const topicFields = {
                              id: { stringValue: topic.id },
                              name: { stringValue: topic.name },
                              questions: { integerValue: topic.questions }
                            };
                            if (topic.subTopics) {
                              topicFields.subTopics = {
                                arrayValue: {
                                  values: topic.subTopics.map(st => ({ stringValue: st }))
                                }
                              };
                            }
                            return { mapValue: { fields: topicFields } };
                          })
                        }
                      };
                    }
                    if (section.randomFrom) {
                      sectionFields.randomFrom = {
                        mapValue: {
                          fields: {
                            questions: { integerValue: section.randomFrom.questions },
                            topics: {
                              arrayValue: {
                                values: section.randomFrom.topics.map(t => ({ stringValue: t }))
                              }
                            }
                          }
                        }
                      };
                    }
                    return { mapValue: { fields: sectionFields } };
                  })
                }
              }
            }
          }
        }))
      }
    },
    totalDurationMinutes: { integerValue: 90 },
    updatedAt: { stringValue: new Date().toISOString() }
  }
};

fs.writeFileSync('postman_firestore.json', JSON.stringify(firestoreDoc, null, 2));
console.log('Generated postman_firestore.json');
