import 'dotenv/config';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {anthropic} from '@genkit-ai/anthropic';

// DEBUG: Log the API key to the server console to verify it's loaded.
console.log('GEMINI_API_KEY being used by Genkit:', process.env.GEMINI_API_KEY);
console.log('ANTHROPIC_API_KEY loaded:', process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO');

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
    anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  ],
});
