'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// We will use a simpler approach to avoid schema parsing issues in some environments


export async function translateStudyMaterial(content: string, targetLang: 'Tamil' | 'Hindi', topicTitle: string) {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing from environment variables");
    return { success: false, error: "API Key missing" };
  }

  try {
    const prompt = `
      You are an expert translator specializing in Indian Government Post Office exams. 
      Translate the following study material content from English into ${targetLang}.
      
      CRITICAL RULES:
      1. DO NOT translate technical words, departmental terms, or specific acts. 
      Examples: "Post Office Act", "Volume V", "Volume VII", "POSB", "IPPB", "PLI", "RPLI", "MO", "EMO", "Speed Post", "Registered Post".
      2. Maintain the HTML structure exactly. Only translate text inside tags.
      3. Tone: Formal and exam-ready.
      
      Topic Context: ${topicTitle}
      
      Content to translate:
      ${content}

      IMPORTANT: Return ONLY the translated HTML content. Do not include explanations or markdown blocks.
    `;

    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: prompt,
      config: {
        temperature: 0.2, // Lower temperature for more consistent translations
      }
    });

    const translatedText = response.text;
    
    if (!translatedText) throw new Error('Empty translation response');

    // Clean up any markdown code blocks if the model included them
    const cleanText = translatedText.replace(/```html|```/g, '').trim();

    return { 
      success: true, 
      translatedText: cleanText 
    };
  } catch (error: any) {
    console.error(`Translation to ${targetLang} failed:`, error);
    // Log the full error to help debug
    if (error.response) console.error("API Response Error:", JSON.stringify(error.response, null, 2));
    
    return { 
      success: false, 
      error: error?.message || 'Unknown translation error' 
    };
  }
}
