
"use client";

import { FreeClassRegistrationForm } from "@/components/auth/free-class-registration-form";
import { MainHeader } from "@/components/main-header";

export default function FreeClassRegistrationPage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
        <MainHeader />
        <main className="flex-1 flex items-center justify-center p-4 md:p-6">
            <div className="w-full max-w-lg">
                <FreeClassRegistrationForm />
            </div>
        </main>
    </div>
  );
}
