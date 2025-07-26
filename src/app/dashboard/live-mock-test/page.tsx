
"use client";

import { useState, useEffect } from 'react';
import { useDashboard } from "@/app/dashboard/layout";
import { getLiveTests } from '@/lib/firestore';
import type { LiveTest } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveTestCard } from '@/components/dashboard/live-test-card';
import { normalizeDate } from '@/lib/utils';
import { PastLiveTestCard } from '@/components/dashboard/past-live-test-card';

export default function LiveMockTestPage() {
    const { isLoading: isDashboardLoading } = useDashboard();
    const [allLiveTests, setAllLiveTests] = useState<LiveTest[]>([]);
    const [isLoadingTests, setIsLoadingTests] = useState(true);

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const tests = await getLiveTests(true); // Fetch all tests
                setAllLiveTests(tests);
            } catch (error) {
                console.error("Failed to fetch live tests:", error);
            } finally {
                setIsLoadingTests(false);
            }
        };
        fetchTests();
    }, []);

    if (isDashboardLoading || isLoadingTests) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    const now = new Date();
    const upcomingTests = allLiveTests
        .filter(test => normalizeDate(test.endTime)! > now)
        .sort((a, b) => normalizeDate(a.startTime)!.getTime() - normalizeDate(b.startTime)!.getTime());

    const pastTests = allLiveTests
        .filter(test => normalizeDate(test.endTime)! <= now)
        .sort((a, b) => normalizeDate(b.endTime)!.getTime() - normalizeDate(a.endTime)!.getTime());

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Live Mock Tests</h1>
                <p className="text-muted-foreground">
                    Join scheduled live tests or practice with past exams.
                </p>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upcoming">Upcoming Tests</TabsTrigger>
                    <TabsTrigger value="past">Past Tests</TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                        {upcomingTests.length > 0 ? (
                            upcomingTests.map(test => <LiveTestCard key={test.id} test={test} />)
                        ) : (
                            <div className="col-span-full text-center text-muted-foreground p-8">
                                No upcoming tests are scheduled at the moment. Please check back later.
                            </div>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="past">
                     <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                        {pastTests.length > 0 ? (
                            pastTests.map(test => <PastLiveTestCard key={test.id} test={test} />)
                        ) : (
                            <div className="col-span-full text-center text-muted-foreground p-8">
                                No past tests are available yet.
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
