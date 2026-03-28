
"use client";

import { useState } from 'react';
import { ChevronDown, ChevronRight, Code2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface JsonFormatGuideProps {
  type: 'question-bank' | 'topic-mcq';
  className?: string;
}

const QUESTION_BANK_SAMPLE = JSON.stringify([
  {
    "question": "Which Article of the Indian Constitution relates to the Right to Equality?",
    "options": ["Article 12", "Article 14", "Article 19", "Article 21"],
    "correctAnswer": "Article 14",
    "explanation": "Article 14 guarantees equality before the law and equal protection of the laws within the territory of India."
  },
  {
    "question": "The Headquarters of India Post is located in?",
    "options": ["Mumbai", "Kolkata", "New Delhi", "Chennai"],
    "correctAnswer": "New Delhi",
    "explanation": "India Post headquarters (Department of Posts) is located at Dak Bhavan, New Delhi."
  }
], null, 2);

const TOPIC_MCQ_SAMPLE = JSON.stringify([
  {
    "question": "What does 'HO' stand for in India Post?",
    "options": ["Head Office", "Home Office", "High Office", "Holding Office"],
    "correctAnswer": "Head Office",
    "explanation": "HO stands for Head Office, the main postal office in a postal division."
  },
  {
    "question": "The speed post service was introduced in India in which year?",
    "options": ["1984", "1986", "1988", "1990"],
    "correctAnswer": "1986",
    "explanation": "Speed Post service was introduced in India in 1986 for guaranteed time-bound delivery."
  }
], null, 2);

export function JsonFormatGuide({ type, className }: JsonFormatGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const sample = type === 'question-bank' ? QUESTION_BANK_SAMPLE : TOPIC_MCQ_SAMPLE;
  const label = type === 'question-bank' ? 'Question Bank' : 'Topic MCQ';

  const handleCopy = () => {
    navigator.clipboard.writeText(sample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("rounded-lg border border-blue-200 bg-blue-50/60 overflow-hidden", className)}>
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-100/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-sm font-semibold text-blue-800">
            View Required JSON Format for {label} Upload
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-blue-600" />
        ) : (
          <ChevronRight className="h-4 w-4 text-blue-600" />
        )}
      </button>

      {/* Expandable body */}
      {isOpen && (
        <div className="px-4 pb-4 border-t border-blue-200">
          {/* Field reference */}
          <div className="mt-3 mb-3 space-y-1.5">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Required Fields</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              {[
                { field: 'question', desc: 'The MCQ question text (string)', required: true },
                { field: 'options', desc: 'Array of 4 answer choices', required: true },
                { field: 'correctAnswer', desc: 'Must exactly match one of the options', required: true },
                { field: 'explanation', desc: 'Solution / explanation text', required: false },
              ].map(({ field, desc, required }) => (
                <div key={field} className="flex gap-2 bg-white/70 rounded-md px-3 py-2 border border-blue-100">
                  <code className="font-mono text-violet-700 font-bold shrink-0">{field}</code>
                  <span className="text-slate-500">{desc}</span>
                  {required && (
                    <span className="ml-auto text-red-500 font-bold shrink-0">*</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">* Required fields. The file must be a valid JSON array of question objects.</p>
          </div>

          {/* Code block */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-7 px-2 text-xs bg-white/80 hover:bg-white border border-blue-100"
              onClick={handleCopy}
            >
              {copied ? (
                <><Check className="h-3 w-3 mr-1 text-green-600" /> Copied!</>
              ) : (
                <><Copy className="h-3 w-3 mr-1" /> Copy</>
              )}
            </Button>
            <pre className="text-xs text-slate-800 bg-white/80 rounded-md p-4 pr-20 border border-blue-100 overflow-x-auto leading-relaxed font-mono">
              {sample}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
