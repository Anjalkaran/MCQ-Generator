
"use client";

import { useState } from "react";
import { MainHeader } from "@/components/main-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FeatureCards } from "@/components/home/feature-cards";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const translations = {
  en: {
    title: "Your Ultimate Postal Exam Prep Tool",
    description: "Elevate your preparation with smartly generated quizzes, realistic mock tests, and detailed performance tracking.",
    button: "Start Practicing Now",
    footer: "© 2025 Anjalkaran. All rights reserved.",
    label: "English"
  },
  hi: {
    title: "डाक परीक्षा की तैयारी के लिए आपका सबसे बेहतरीन टूल",
    description: "स्मार्ट क्विज़, असली जैसे मॉक टेस्ट और अपनी तैयारी की विस्तृत रिपोर्ट के साथ अपनी तैयारी को और बेहतर बनाएं।",
    button: "अभी प्रैक्टिस शुरू करें",
    footer: "© 2025 अंजलकरन। सर्वाधिकार सुरक्षित।",
    label: "हिन्दी"
  },
  ta: {
    title: "உங்கள் தபால் தேர்வு தயாரிப்பிற்கான சிறந்த கருவி",
    description: "ஸ்மார்ட் வினாவிடை, யதார்த்தமான மாதிரி தேர்வுகள் மற்றும் விரிவான செயல்திறன் கண்காணிப்பு மூலம் உங்கள் தயாரிப்பை அடுத்த கட்டத்திற்கு கொண்டு செல்லுங்கள்.",
    button: "இப்போதே பயிற்சி தொடங்குங்கள்",
    footer: "© 2025 அஞ்சல்காரன். அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
    label: "தமிழ்"
  },
};

type Language = keyof typeof translations;

export default function Home() {
  const [language, setLanguage] = useState<Language>('en');
  const t = translations[language];

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <MainHeader />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="mb-4">
                <Select onValueChange={(value: Language) => setLanguage(value)} defaultValue={language}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(translations) as Language[]).map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {translations[lang].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                {t.title}
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                {t.description}
              </p>
              <Button asChild size="lg">
                <Link href="/auth/login">
                  {t.button}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="w-full pb-12 md:pb-24 lg:pb-32">
          <div className="container px-4 md:px-6">
            <FeatureCards language={language} />
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-background">
        <p className="text-xs text-muted-foreground">
          {t.footer}
        </p>
      </footer>
    </div>
  );
}
