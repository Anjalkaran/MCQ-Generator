
'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-mcqs.ts';
import '@/ai/flows/summarize-topic-material.ts';
import '@/ai/flows/generate-mock-test.ts';
import '@/ai/flows/generate-partwise-mcqs.ts';
import '@/ai/flows/generate-mock-test-from-bank.ts';
import '@/ai/flows/generate-live-mock-test.ts';
import '@/ai/flows/answer-question.ts';
import '@/ai/flows/generate-knowledge-mcqs.ts';


