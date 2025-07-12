import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <Link href="/" className="flex items-center justify-center">
          <BrainCircuit className="h-6 w-6 text-primary" />
          <span className="ml-2 text-xl font-bold font-headline">Anjalkaran MCQ Generator</span>
        </Link>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Check Your Email</CardTitle>
          <CardDescription>
            We have sent a password recovery link to your email. Please check your inbox (and spam folder) to proceed.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild className="w-full">
                <Link href="/login">Back to Login</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
