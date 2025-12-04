
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';

interface PollOption {
    id: string;
    text: string;
    votes: number;
}

interface PollData {
    id: string;
    question: string;
    options: PollOption[];
}

export function PollClient() {
    const { toast } = useToast();
    const [pollData, setPollData] = useState<PollData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const pollId = "ip-marks-2025";

    useEffect(() => {
        const db = getFirebaseDb();
        if (!db) {
            toast({ title: "Error", description: "Could not connect to the database.", variant: "destructive"});
            setIsLoading(false);
            return;
        }

        const pollRef = doc(db, 'polls', pollId);

        // Initialize the poll on the server if it doesn't exist
        fetch('/api/polls/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pollId: pollId }),
        });

        const unsubscribe = onSnapshot(pollRef, (docSnap) => {
            if (docSnap.exists()) {
                setPollData(docSnap.data() as PollData);
            }
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, [toast, pollId]);

    const totalVotes = pollData ? pollData.options.reduce((acc, option) => acc + option.votes, 0) : 0;
    
    if (isLoading || !pollData) {
        return (
             <Card>
                <CardContent className="flex items-center justify-center p-10">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    <p>Loading Poll Results...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{pollData.question}</CardTitle>
                <CardDescription>Results are updated in real-time.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {pollData.options.sort((a, b) => b.votes - a.votes).map(option => {
                        const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                        return (
                            <div key={option.id} className="space-y-1.5">
                                <div className="flex justify-between items-center text-sm">
                                    <div className="font-medium flex items-center">
                                        {option.text}
                                    </div>
                                    <span className="text-muted-foreground">{option.votes} vote(s)</span>
                                </div>
                                <Progress value={percentage} className="h-3" />
                                <div className="text-xs text-right text-muted-foreground">{percentage.toFixed(1)}%</div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
             <CardFooter>
                 <div className="text-sm text-muted-foreground ml-auto">
                    Total Votes: {totalVotes}
                </div>
            </CardFooter>
        </Card>
    );
}
