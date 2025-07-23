
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SupportPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
       <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
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
            <Send className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold">Telegram</h3>
              <p className="text-muted-foreground">Join our community for updates and discussions.</p>
              <Button variant="link" asChild className="p-0 h-auto">
                <a href="https://t.me/Anjalkaranacademy" target="_blank" rel="noopener noreferrer">@Anjalkaranacademy</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
