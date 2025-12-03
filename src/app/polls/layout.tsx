import { MainHeader } from "@/components/main-header";

export default function PollsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <MainHeader />
      <main className="flex-1 py-12 md:py-24">
        <div className="container px-4 md:px-6">
          {children}
        </div>
      </main>
       <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-background">
        <p className="text-xs text-muted-foreground">
          © 2024 Anjalkaran. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
