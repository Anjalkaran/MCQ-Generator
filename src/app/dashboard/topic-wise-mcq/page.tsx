
"use client";

import { useMemo } from 'react';
import { useDashboard } from '@/app/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader2, BookCopy } from 'lucide-react';
import type { Category, Topic } from '@/lib/types';

interface GroupedTopics {
  [categoryId: string]: {
    category: Category;
    topics: Topic[];
  };
}

export default function TopicWiseMCQPage() {
  const { isLoading, categories, topics, userData } = useDashboard();
  const isIPUser = userData?.examCategory === 'IP';

  const groupedTopics = useMemo(() => {
    const userExamCategory = userData?.examCategory;
    if (!userExamCategory || !categories || !topics) return {};

    const userCategories = categories.filter(c => 
      c.examCategories?.includes(userExamCategory as any) && 
      !c.name.toLowerCase().includes("reasoning") &&
      !c.name.toLowerCase().includes("non-verbal")
    );

    const userTopics = topics.filter(t => 
      t.examCategories?.includes(userExamCategory as any)
    );

    return userCategories.reduce((acc, category) => {
      const topicsForCategory = userTopics
        .filter(topic => topic.categoryId === category.id)
        .sort((a, b) => a.title.localeCompare(b.title));

      if (topicsForCategory.length > 0) {
        acc[category.id] = {
          category,
          topics: topicsForCategory,
        };
      }
      return acc;
    }, {} as GroupedTopics);
  }, [categories, topics, userData]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Practice MCQ</h1>
        <p className="text-muted-foreground">
          Select a topic to generate a practice exam.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Select a Topic</CardTitle>
          <CardDescription>
            Choose a category below to see the available topics for your exam{isIPUser ? ' paper' : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedTopics).length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {Object.values(groupedTopics).map(({ category, topics }) => (
                <AccordionItem value={category.id} key={category.id}>
                  <AccordionTrigger className="text-lg font-semibold">{category.name}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col space-y-2">
                      {topics.map(topic => (
                        <Button
                          key={topic.id}
                          variant="ghost"
                          className="justify-start"
                          asChild
                        >
                          <Link href={`/dashboard/topic-wise-mcq/${topic.id}`}>
                            <BookCopy className="mr-2 h-4 w-4" />
                            {topic.title}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
             <div className="text-center text-muted-foreground p-8">
                No topics found for your selected exam category.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
