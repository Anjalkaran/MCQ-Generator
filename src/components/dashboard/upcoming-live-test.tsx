
"use client";

import { useState, useEffect, useRef } from 'react';
import { CardDescription } from "@/components/ui/card";
import { getLiveTests } from '@/lib/firestore';
import type { LiveTest } from '@/lib/types';
import { normalizeDate } from '@/lib/utils';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

function Countdown({ test }: { test: LiveTest }) {
    const [timeRemaining, setTimeRemaining] = useState('');
    const startTime = normalizeDate(test.startTime);

    useEffect(() => {
        if (!startTime) return;

        const interval = setInterval(() => {
            const now = new Date();
            const distance = startTime.getTime() - now.getTime();

            if (distance > 0) {
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                let countdownString = '';
                if (days > 0) countdownString += `${days}d `;
                countdownString += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                
                setTimeRemaining(countdownString);
            } else {
                setTimeRemaining('Live Now!');
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime]);
    
    if (!startTime) return null;

    return (
        <div className="pt-4 text-center">
            <p className="font-bold text-base text-primary">{test.title}</p>
            <p className="text-sm text-muted-foreground">{format(startTime, 'dd/MM/yyyy p')}</p>
            <p className="text-lg font-semibold mt-2 tabular-nums tracking-wider">{timeRemaining || <Skeleton className="h-6 w-24 mx-auto" />}</p>
        </div>
    )
}

export function UpcomingLiveTest() {
    const [upcomingTests, setUpcomingTests] = useState<LiveTest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const plugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));

    useEffect(() => {
        const fetchAndSetTests = async () => {
            try {
                const allTests = await getLiveTests(true);
                const now = new Date();
                const nextTests = allTests
                    .filter(test => normalizeDate(test.endTime)! > now)
                    .sort((a, b) => normalizeDate(a.startTime)!.getTime() - normalizeDate(b.startTime)!.getTime());
                
                setUpcomingTests(nextTests);
            } catch (error) {
                console.error("Failed to fetch live tests for dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAndSetTests();
    }, []);

    if (isLoading) {
        return <Skeleton className="h-28 w-full" />;
    }

    if (upcomingTests.length === 0) {
        return (
             <CardDescription className="pt-4 text-center">
                MTS, PM, and PA Mock Test. Participate in scheduled live tests that simulate real exam conditions.
            </CardDescription>
        );
    }
    
    return (
        <Carousel 
            plugins={[plugin.current]}
            className="w-full max-w-xs mx-auto"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
        >
            <CarouselContent>
                {upcomingTests.map((test) => (
                <CarouselItem key={test.id}>
                    <Countdown test={test} />
                </CarouselItem>
                ))}
            </CarouselContent>
            {upcomingTests.length > 1 && (
                <>
                    <CarouselPrevious className="-left-8" />
                    <CarouselNext className="-right-8" />
                </>
            )}
        </Carousel>
    )
}
