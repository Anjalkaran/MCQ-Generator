import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Topic } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TopicCardProps {
  topic: Topic;
}

export function TopicCard({ topic }: TopicCardProps) {
  const Icon = topic.icon;
  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex-row items-center gap-4">
        <div className="bg-accent p-3 rounded-full">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-xl font-headline">{topic.title}</CardTitle>
          <CardDescription>{topic.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex items-end justify-end">
        <Button asChild>
          <Link href={`/quiz/${topic.id}`}>
            Start Quiz <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
