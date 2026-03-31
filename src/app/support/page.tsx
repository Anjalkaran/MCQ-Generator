
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageCircle, Send, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MainHeader } from "@/components/main-header";
import { GovernmentDisclaimer } from "@/components/government-disclaimer";

export default function SupportPage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <MainHeader />
      <main className="flex-1 py-12 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-0.5 text-center">
              <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
              <p className="text-muted-foreground">
                Get in touch with us for any questions or issues.
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  We're here to help! Reach out to us through any of the channels below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Mail className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Email</h3>
                    <p className="text-muted-foreground">For general inquiries and support requests.</p>
                    <Button variant="link" asChild className="p-0 h-auto">
                      <a href="mailto:support@anjalkaran.com">support@anjalkaran.com</a>
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <MessageCircle className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">WhatsApp</h3>
                    <p className="text-muted-foreground">For quick questions and chat support.</p>
                    <Button variant="link" asChild className="p-0 h-auto">
                      <a href="https://wa.me/9003142899" target="_blank" rel="noopener noreferrer">9003142899</a>
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Users className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Telegram Community</h3>
                    <p className="text-muted-foreground">Join our community for updates and discussions.</p>
                    <Button variant="link" asChild className="p-0 h-auto">
                      <a href="https://t.me/anjalkaran" target="_blank" rel="noopener noreferrer">@anjalkaran</a>
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Send className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Telegram Chat</h3>
                    <p className="text-muted-foreground">For individual chat and direct support.</p>
                    <Button variant="link" asChild className="p-0 h-auto">
                      <a href="https://t.me/Anjalkaranacademy" target="_blank" rel="noopener noreferrer">@Anjalkaranacademy</a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <footer className="py-12 w-full border-t bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col gap-8">
            <p className="text-xs text-muted-foreground text-center sm:text-left">
              &copy; 2025 Anjalkaran. All rights reserved.
            </p>
            <GovernmentDisclaimer />
          </div>
        </div>
      </footer>
    </div>
  );
}


