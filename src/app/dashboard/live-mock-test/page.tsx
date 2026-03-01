
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
import { ADMIN_EMAILS } from '@/lib/constants';
import { useRouter } from 'next/navigation';

export default function LiveMockTestPage() {
    const { userData, isLoading: isDashboardLoading } = useDashboard();
    const router = useRouter();
    const [allLiveTests, setAllLiveTests] = useState<LiveTest[]>([]);
    const [isLoadingTests, setIsLoadingTests] = useState(true);

    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;

    useEffect(() => {
        if (!isDashboardLoading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [isAdmin, isDashboardLoading, router]);

    useEffect(() => {
        if (isAdmin) {
            const fetchTests = async () => {
                try {
                    const tests = await getLiveTests(true); // Fetch all tests
                    setAllLiveTests(tests);
                } catch (error) {
                    console.error("Failed to fetch tests:", error);
                } finally {
                    setIsLoadingTests(false);
                }
            };
            fetchTests();
        }
    }, [isAdmin]);

    if (isDashboardLoading || (isAdmin && isLoadingTests)) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAdmin) return null;
    
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
                <h1 className="text-3xl font-bold tracking-tight">Admin: Scheduled Weekly Tests</h1>
                <p className="text-muted-foreground">
                    This section is for managing historical scheduled tests. Standard users access the permanent module.
                </p>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upcoming">Current & Upcoming</TabsTrigger>
                    <TabsTrigger value="past">Previous Tests</TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                        {upcomingTests.length > 0 ? (
                            upcomingTests.map(test => <LiveTestCard key={test.id} test={test} />)
                        ) : (
                            <div className="col-span-full text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                                No scheduled tests found.
                            </div>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="past">
                     <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                        {pastTests.length > 0 ? (
                            pastTests.map(test => <PastLiveTestCard key={test.id} test={test} />)
                        ) : (
                            <div className="col-span-full text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                                No previous scheduled tests recorded.
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
