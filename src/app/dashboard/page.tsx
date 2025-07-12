"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { topics } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function DashboardPage() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [numberOfQuestions, setNumberOfQuestions] = useState<number>(10);
  const router = useRouter();

  const handleStartQuiz = () => {
    if (selectedTopic && numberOfQuestions > 0) {
      router.push(`/quiz/${selectedTopic}?questions=${numberOfQuestions}`);
    }
  };

  const maxQuestions = 50;

  return (
    <div className="flex justify-center items-start pt-10">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
              Anjalkaran MCQ Generator
            </CardTitle>
            <CardDescription className="mx-auto max-w-[700px] text-muted-foreground md:text-xl pt-2">
              Choose a topic to start a quiz and test your understanding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-6">
              <div className="w-full space-y-2">
                <Label htmlFor="topic-select">Topic</Label>
                <Select onValueChange={setSelectedTopic} value={selectedTopic || ''}>
                  <SelectTrigger id="topic-select" className="w-full">
                    <SelectValue placeholder="Select a topic..." />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full space-y-2">
                <Label htmlFor="num-questions">Number of Questions</Label>
                <Input
                  id="num-questions"
                  type="number"
                  value={numberOfQuestions}
                  onChange={(e) => setNumberOfQuestions(parseInt(e.target.value, 10))}
                  min="1"
                  max={maxQuestions}
                  disabled={!selectedTopic}
                  className="w-full"
                />
                {selectedTopic && <p className="text-sm text-muted-foreground">Max questions available: {maxQuestions}</p>}
              </div>
              <Button
                onClick={handleStartQuiz}
                disabled={!selectedTopic || numberOfQuestions <= 0 || (maxQuestions > 0 && numberOfQuestions > maxQuestions)}
                className="w-full"
                size="lg"
              >
                Start Quiz <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
