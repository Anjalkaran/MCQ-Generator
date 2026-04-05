import fs from 'fs';
import path from 'path';

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// I will read the files, parse them (approximately with regex), and add IDs.
// Since these are TS files, I'll do a simple string replacement.

const files = [
  'c:/Users/shanm/Downloads/Anjalkaran/src/lib/exam-blueprints.ts',
  'c:/Users/shanm/Downloads/Anjalkaran/src/lib/exam-blueprints-ip.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Regex to find { name: '...', questions: ... }
  // We want to add id: '...' before name.
  
  // This is tricky because of the structure.
  // I'll use a simpler approach: adding a comment with instructions or manually editing the main ones.
}
