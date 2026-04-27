const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:\\Users\\shanm\\.gemini\\antigravity\\brain\\e474999c-4bbf-4b20-8158-bd90f17a8092\\.system_generated\\steps\\89\\output.txt', 'utf8'));

// Navigate to the topics array
const parts = data.fields.parts.arrayValue.values;
const firstPart = parts[0].mapValue.fields;
const sections = firstPart.sections.arrayValue.values;
const firstSection = sections[0].mapValue.fields;
const topics = firstSection.topics.arrayValue.values;

console.log('Current topics count:', topics.length);

// Remove the last topic if it's "SB Orders"
const lastTopic = topics[topics.length - 1].mapValue.fields;
if (lastTopic.name.stringValue === 'SB Orders') {
    console.log('Removing SB Orders topic');
    topics.pop();
} else {
    console.log('SB Orders not found as the last topic');
}

// Write the updated fields back to a file
const update = {
    name: data.name,
    fields: data.fields
};

fs.writeFileSync('updated_pa_syllabus.json', JSON.stringify(update, null, 2));
console.log('Updated syllabus saved to updated_pa_syllabus.json');
