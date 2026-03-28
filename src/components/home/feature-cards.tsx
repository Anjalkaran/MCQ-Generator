
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BookCopy, FileText, TrendingUp, Trophy, BrainCircuit, HelpCircle } from 'lucide-react';
import { getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

type Language = 'en' | 'hi' | 'ta';

const translations = {
  en: {
    mcqs: {
      title: "Smartly Generated MCQs",
      description: "Generate unique, high-quality questions for any topic with our advanced system, tailored to different difficulty levels.",
    },
    mockTests: {
      title: "Realistic Mock Tests",
      description: "Simulate the real exam experience with full-length mock tests based on official blueprints or questions from previous years.",
    },
    practice: {
      title: "Topic-wise Practice",
      description: "Create a custom exam by selecting a specific topic, difficulty, and number of questions. Ideal for focused practice.",
    },
    analysis: {
      title: "Performance Analysis",
      description: "Track your progress with detailed, topic-wise performance analysis to identify your strengths and areas for improvement.",
    },
    leaderboard: {
      title: "Competitive Leaderboard",
      description: "See how you measure up against other users with separate leaderboards for topic quizzes and mock tests.",
    },
    askDoubt: {
      title: "Ask Your Doubt",
      description: "Get instant, material-based answers from our AI tutor to clarify your doubts on any topic, ensuring you're always prepared.",
    }
  },
  hi: {
    mcqs: {
      title: "स्मार्ट तरीके से बनाए गए एमसीक्यू",
      description: "हमारे एडवांस्ड सिस्टम के साथ किसी भी विषय के लिए अनोखे और उच्च-गुणवत्ता वाले प्रश्न बनाएं, जो अलग-अलग कठिनाई स्तरों के लिए तैयार किए गए हैं।",
    },
    mockTests: {
      title: "असली जैसे मॉक टेस्ट",
      description: "आधिकारिक ब्लूप्रिंट या पिछले वर्षों के प्रश्नों पर आधारित पूरे मॉक टेस्ट के साथ असली परीक्षा का अनुभव करें।",
    },
    practice: {
      title: "विषय-अनुसार अभ्यास",
      description: "किसी विशेष विषय, कठिनाई और प्रश्नों की संख्या का चयन करके एक कस्टम परीक्षा बनाएं। यह फोகस्ड प्रैक्टिस के लिए आदर्श है।",
    },
    analysis: {
      title: "प्रदर्शन का विश्लेषण",
      description: "अपनी ताकत और सुधार के क्षेत्रों की पहचान करने के लिए विस्तृत, विषय-अनुसार प्रदर्शन विश्लेषण के साथ अपनी प्रगति को ट्रैक करें।",
    },
    leaderboard: {
      title: "प्रतिस्पर्धी लीडरबोर्ड",
      description: "देखें कि आप दूसरे उपयोगकर्ताओं के मुकाबले कहां खड़े हैं, जिसमें टॉपिक क्विज़ और मॉक टेस्ट के लिए अलग-अलग लीडरबोर्ड हैं।",
    },
    askDoubt: {
      title: "अपना संदेह पूछें",
      description: "हमारे AI ट्यूटर से किसी भी विषय पर अपने संदेहों को दूर करने के लिए तुरंत उत्तर प्राप्त करें, ताकि आप हमेशा तैयार रहें।",
    }
  },
  ta: {
    mcqs: {
      title: "ஸ்மார்ட்டாக உருவாக்கப்பட்ட MCQ-கள்",
      description: "எங்கள் மேம்பட்ட அமைப்பு மூலம் எந்தவொரு தலைப்பிற்கும் தனித்துவமான, உயர்தரமான கேள்விகளை உருவாக்குங்கள்.",
    },
    mockTests: {
      title: "யதார்த்தமான மாதிரி தேர்வுகள்",
      description: "அதிகாரப்பூர்வ ப்ளூபிரிண்ட்கள் அல்லது முந்தைய ஆண்டு வினாக்களை அடிப்படையாகக் கொண்ட முழு நீள மாதிரி தேர்வுகள் மூலம் உண்மையான தேர்வு அனுபவத்தைப் பெறுங்கள்.",
    },
    practice: {
      title: "தலைப்பு வாரியாக பயிற்சி",
      description: "ஒரு குறிப்பிட்ட தலைப்பு, சிரமம் மற்றும் கேள்விகளின் எண்ணிக்கையைத் தேர்ந்தெடுத்து ஒரு தனிப்பயன் தேர்வை உருவாக்குங்கள்.",
    },
    analysis: {
      title: "செயல்திறன் பகுப்பாய்வு",
      description: "உங்கள் பலம் மற்றும் மேம்படுத்த வேண்டிய பகுதிகளை அடையாளம் காண விரிவான, தலைப்பு வாரியான செயல்திறன் பகுப்பாய்வு மூலம் உங்கள் முன்னேற்றத்தைக் கண்காணிக்கவும்.",
    },
    leaderboard: {
      title: "போட்டி லீடர்போர்டு",
      description: "மற்ற பயனர்களுடன் ஒப்பிடும்போது நீங்கள் எங்கே இருக்கிறீர்கள் என்பதை தலைப்பு வினாவிடை மற்றும் மாதிரித் தேர்வுகளுக்கான தனித்தனி லீடர்போர்டுகள் மூலம் பாருங்கள்.",
    },
    askDoubt: {
      title: "உங்கள் சந்தேகத்தைக் கேளுங்கள்",
      description: "எந்தவொரு தலைப்பிலும் உங்கள் சந்தேகங்களைத் தெளிவுபடுத்த, எங்கள் AI ஆசிரியரிடமிருந்து உடனடி, பாடப்பொருள் அடிப்படையிலான பதில்களைப் பெறுங்கள்.",
    }
  }
};


import { StaggerContainer, StaggerItem, HoverScale } from "@/components/animations/motion-wrapper";

export function FeatureCards({ language }: { language: Language }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const t = translations[language];

  const features = [
    {
      icon: <BrainCircuit className="h-10 w-10 text-red-600" />,
      title: t.mcqs.title,
      description: t.mcqs.description,
      href: "/dashboard"
    },
    {
      icon: <FileText className="h-10 w-10 text-red-600" />,
      title: t.mockTests.title,
      description: t.mockTests.description,
      href: "/dashboard/mock-test"
    },
    {
      icon: <BookCopy className="h-10 w-10 text-red-600" />,
      title: t.practice.title,
      description: t.practice.description,
      href: "/dashboard/topic-wise-mcq"
    },
    {
      icon: <TrendingUp className="h-10 w-10 text-red-600" />,
      title: t.analysis.title,
      description: t.analysis.description,
      href: "/dashboard/performance"
    },
    {
      icon: <Trophy className="h-10 w-10 text-red-600" />,
      title: t.leaderboard.title,
      description: t.leaderboard.description,
      href: "/dashboard/leaderboard"
    },
    {
      icon: <HelpCircle className="h-10 w-10 text-red-600" />,
      title: t.askDoubt.title,
      description: t.askDoubt.description,
      href: "/dashboard/q-and-a"
    }
  ];

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
        setLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getHref = (defaultHref: string) => {
    if (loading) return "#"; // Prevent navigation while checking auth state
    return user ? defaultHref : "/auth/login";
  };

  return (
    <StaggerContainer className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => (
        <StaggerItem key={feature.title} className="flex">
          <Link 
            href={getHref(feature.href)} 
            className="flex w-full group" 
            aria-disabled={loading}
          >
            <HoverScale className="w-full">
              <Card className="flex flex-col h-full text-center items-center p-8 bg-white/50 backdrop-blur-sm border border-slate-100 hover:border-red-100 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 rounded-3xl group">
                <div className="mb-6 p-4 bg-red-50 rounded-2xl group-hover:bg-red-600 group-hover:scale-110 transition-all duration-300">
                  <div className="group-hover:text-white transition-colors">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-slate-900 group-hover:text-red-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-500 leading-relaxed">
                  {feature.description}
                </p>
                
                <div className="mt-6 flex items-center text-red-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn More <TrendingUp className="ml-2 h-4 w-4" />
                </div>
              </Card>
            </HoverScale>
          </Link>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
