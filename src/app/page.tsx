
"use client";

import { useState } from "react";
import { MainHeader } from "@/components/main-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FeatureCards } from "@/components/home/feature-cards";
import { cn } from "@/lib/utils";

const translations = {
  en: {
    title: "Your Ultimate Postal Exam Prep Tool",
    description: "Elevate your preparation with smartly generated quizzes, realistic mock tests, and detailed performance tracking.",
    button: "Start Practicing Now",
    footer: "© 2025 Anjalkaran. All rights reserved.",
  },
  hi: {
    title: "आपकी अंतिम डाक परीक्षा तैयारी उपकरण",
    description: "स्मार्ट रूप से उत्पन्न क्विज़, यथार्थवादी मॉक टेस्ट और विस्तृत प्रदर्शन ट्रैकिंग के साथ अपनी तैयारी को बढ़ाएं।",
    button: "अभी अभ्यास शुरू करें",
    footer: "© 2025 अंजलकरन। सर्वाधिकार सुरक्षित।",
  },
  ta: {
    title: "உங்கள் இறுதி தபால் தேர்வு தயாரிப்புக் கருவி",
    description: "புத்திசாலித்தனமாக உருவாக்கப்பட்ட வினாடி வினாக்கள், யதார்த்தமான மாதிரி சோதனைகள் மற்றும் விரிவான செயல்திறன் கண்காணிப்பு மூலம் உங்கள் தயாரிப்பை உயர்த்துங்கள்.",
    button: "இப்போதே பயிற்சி தொடங்கவும்",
    footer: "© 2025 அஞ்சல்காரன். அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
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
              <div className="flex gap-2 mb-4">
                {(Object.keys(translations) as Language[]).map((lang) => (
                  <Button
                    key={lang}
                    variant={language === lang ? "default" : "outline"}
                    onClick={() => setLanguage(lang)}
                    className="uppercase"
                  >
                    {lang}
                  </Button>
                ))}
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
            <FeatureCards />
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
