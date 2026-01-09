
import { FreeClassRegistrationForm } from "@/components/home/free-class-registration-form";
import { MainHeader } from "@/components/main-header";

export default function FreeClassRegistrationPage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
        <MainHeader />
        <main className="flex-1 flex items-center justify-center py-12">
            <FreeClassRegistrationForm />
        </main>
    </div>
  );
}
