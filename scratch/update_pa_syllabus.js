const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:\\Users\\shanm\\.gemini\\antigravity\\brain\\e474999c-4bbf-4b20-8158-bd90f17a8092\\.system_generated\\steps\\197\\output.txt', 'utf8'));

const partA_section = data.fields.parts.arrayValue.values[0].mapValue.fields.sections.arrayValue.values[0];

const new_gk_section = {
  mapValue: {
    fields: {
      sectionName: { stringValue: 'Part-B: General Awareness / Knowledge (10 Questions)' },
      topics: {
        arrayValue: {
          values: [
            { mapValue: { fields: { id: { stringValue: 'PA-P1-SB-T1-GK1' }, name: { stringValue: 'Indian Geography' }, questions: { integerValue: '2' } } } },
            { mapValue: { fields: { id: { stringValue: 'PA-P1-SB-T1-GK2' }, name: { stringValue: 'Civics' }, questions: { integerValue: '2' } } } },
            { mapValue: { fields: { id: { stringValue: 'PA-P1-SB-T1-GK3' }, name: { stringValue: 'General Knowledge' }, questions: { integerValue: '2' } } } },
            { mapValue: { fields: { id: { stringValue: 'PA-P1-SB-T1-GK4' }, name: { stringValue: 'Indian Culture & Freedom Struggle' }, questions: { integerValue: '2' } } } },
            { mapValue: { fields: { id: { stringValue: 'PA-P1-SB-T1-GK5' }, name: { stringValue: 'Ethics and Morale study' }, questions: { integerValue: '2' } } } }
          ]
        }
      }
    }
  }
};

const new_arith_section = {
  mapValue: {
    fields: {
      sectionName: { stringValue: 'Part-B: Basic Arithmetic (20 Questions)' },
      topics: {
        arrayValue: {
          values: [
            { mapValue: { fields: { id: { stringValue: 'PA-P1-SB-T2-A1' }, name: { stringValue: 'BODMAS' }, questions: { integerValue: '4' } } } },
            { mapValue: { fields: { id: { stringValue: 'PA-P1-SB-T2-A2' }, name: { stringValue: 'Percentage' }, questions: { integerValue: '2' } } } },
            { mapValue: { fields: { id: { stringValue: 'PA-P1-SB-T2-A3' }, name: { stringValue: 'Profit and loss' }, questions: { integerValue: '2' } } } },
            { mapValue: { fields: { id: { stringValue: 'PA-P1-SB-T2-A4' }, name: { stringValue: 'Simple interest' }, questions: { integerValue: '2' } } } },
            { mapValue: { fields: { id: { stringValue: 'PA-P1-SB-T2-A5' }, name: { stringValue: 'Average' }, questions: { integerValue: '2' } } } },
            { mapValue: { fields: { id: { stringValue: 'PA-P1-SB-T2-A6' }, name: { stringValue: 'Time and work' }, questions: { integerValue: '2' } } } },
            { mapValue: { fields: { id: { stringValue: 'PA-P1-SB-T2-A7' }, name: { stringValue: 'Time and distance' }, questions: { integerValue: '2' } } } },
            { mapValue: { fields: { id: { stringValue: 'PA-P1-SB-T2-A8' }, name: { stringValue: 'Unitary Method' }, questions: { integerValue: '2' } } } }
          ]
        }
      }
    }
  }
};

const new_reasoning_section = {
  mapValue: {
    fields: {
      sectionName: { stringValue: 'Part-B: Reasoning and Analytical Ability (20 Questions)' },
      topics: {
        arrayValue: {
          values: [
            { 
              mapValue: { 
                fields: { 
                  id: { stringValue: 'PA-P1-SB-T3' }, 
                  name: { stringValue: 'Reasoning and Analytical Ability' }, 
                  questions: { integerValue: '20' },
                  subTopics: { arrayValue: { values: [ { stringValue: 'Non-Verbal / Pictorial Reasoning' } ] } }
                } 
              } 
            }
          ]
        }
      }
    }
  }
};

const updatedParts = {
  arrayValue: {
    values: [
      {
        mapValue: {
          fields: {
            partName: { stringValue: 'Paper-I: Postal Knowledge and General Awareness' },
            totalQuestions: { integerValue: '100' },
            sections: {
              arrayValue: {
                values: [
                  partA_section,
                  new_gk_section,
                  new_arith_section,
                  new_reasoning_section
                ]
              }
            }
          }
        }
      }
    ]
  }
};

const updateDoc = {
  fields: {
    ...data.fields,
    parts: updatedParts,
    updatedAt: { timestampValue: new Date().toISOString() }
  }
};

console.log(JSON.stringify(updateDoc, null, 2));
