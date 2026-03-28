import 'dotenv/config';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// DEBUG: Log the API key to the server console to verify it's loaded.
console.log('GEMINI_API_KEY being used by Genkit:', process.env.GEMINI_API_KEY);

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
  ],
});
