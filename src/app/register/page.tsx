import { RegisterForm } from "@/components/auth/register-form";
import Link from "next/link";
import { BrainCircuit } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <Link href="/" className="flex items-center justify-center">
            <BrainCircuit className="h-6 w-6 text-primary" />
            <span className="ml-2 text-xl font-bold font-headline">QuizWiz</span>
        </Link>
       </div>
      <RegisterForm />
    </div>
  );
}
