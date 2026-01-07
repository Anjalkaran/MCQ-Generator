
"use client";

import { useMemo, useState } from 'react';
import { useDashboard } from '@/app/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, Download } from 'lucide-react';
import type { Category, Topic, StudyMaterial } from '@/lib/types';
import { getStudyMaterials, logDownload } from '@/lib/firestore';

interface GroupedTopics {
  [categoryId: string]: {
    category: Category;
    topics: Topic[];
  };
}

function StudyMaterialList({ topicId, topicTitle }: { topicId: string, topicTitle: string }) {
    const [materials, setMaterials] = useState<StudyMaterial[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useDashboard();

    useState(() => {
        getStudyMaterials(topicId).then(data => {
            setMaterials(data);
            setIsLoading(false);
        });
    });

    const handleDownload = (material: StudyMaterial) => {
        if (user?.uid && user.displayName) {
             logDownload(user.uid, user.displayName, material, topicTitle).catch(console.error);
        }
        window.open(material.downloadUrl, '_blank');
    };

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;
    }

    if (materials.length === 0) {
        return <p className="text-sm text-muted-foreground px-4 pb-4">No study material available for this topic yet.</p>;
    }
    
    return (
        <div className="flex flex-col space-y-2 pl-4 pr-2 pb-2">
            {materials.map(material => (
                <div key={material.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                    <span className="text-sm font-medium">{material.fileName}</span>
                    <Button size="sm" variant="ghost" onClick={() => handleDownload(material)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </Button>
                </div>
            ))}
        </div>
    );
}

export default function StudyMaterialPage() {
  const { isLoading, categories, topics, userData } = useDashboard();
  const isIPUser = userData?.examCategory === 'IP';

  const groupedTopics = useMemo(() => {
    const userExamCategory = userData?.examCategory;
    if (!userExamCategory || !categories || !topics) return {};

    const userCategories = categories.filter(c => c.examCategories.includes(userExamCategory));
    
    const userTopics = topics.filter(t => t.examCategories.includes(userExamCategory));

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
        <h1 className="text-3xl font-bold tracking-tight">Study Material</h1>
        <p className="text-muted-foreground">
          Download study materials for your exam topics.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Select a Topic</CardTitle>
          <CardDescription>
            Choose a category below to see the available topics and download materials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedTopics).length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {Object.values(groupedTopics).map(({ category, topics }) => (
                <AccordionItem value={category.id} key={category.id}>
                  <AccordionTrigger className="text-lg font-semibold">{category.name}</AccordionTrigger>
                  <AccordionContent>
                     {topics.map(topic => (
                         <Accordion key={topic.id} type="single" collapsible>
                             <AccordionItem value={topic.id}>
                                <AccordionTrigger className="font-normal justify-start gap-2 pl-4 text-base hover:no-underline hover:bg-accent rounded-md">
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    {topic.title}
                                </AccordionTrigger>
                                <AccordionContent>
                                    <StudyMaterialList topicId={topic.id} topicTitle={topic.title} />
                                </AccordionContent>
                             </AccordionItem>
                         </Accordion>
                     ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
             <div className="text-center text-muted-foreground p-8">
                No topics with study material found for your selected exam category.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
