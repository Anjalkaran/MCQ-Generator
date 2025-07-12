import { MainHeader } from "@/components/main-header";
import { TopicCard } from "@/components/quiz/topic-card";
import { topics } from "@/lib/data";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                  Expand Your Knowledge
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Choose a topic to start a quiz and test your understanding.
                </p>
              </div>
            </div>
            <div className="mx-auto grid grid-cols-1 gap-6 py-12 sm:grid-cols-2 md:grid-cols-3 lg:gap-12">
              {topics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} QuizWiz. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
