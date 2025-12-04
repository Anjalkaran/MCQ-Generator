
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

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
    const [voted, setVoted] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const pollId = "ip-marks-2025";

    useEffect(() => {
        const db = getFirebaseDb();
        if (!db) {
            toast({ title: "Error", description: "Could not connect to the database.", variant: "destructive"});
            setIsLoading(false);
            return;
        }

        const pollRef = doc(db, 'polls', pollId);

        // Ensure the poll is initialized on the server
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
        }, (error) => {
            console.error("Error fetching poll data:", error);
            toast({ title: "Error", description: "Could not load poll data.", variant: "destructive"});
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, [toast, pollId]);

    const handleVote = async () => {
        if (!selectedOption) return;

        const db = getFirebaseDb();
        if (!db) {
            toast({ title: "Error", description: "Could not connect to database.", variant: "destructive"});
            return;
        }

        setIsSubmitting(true);
        const pollRef = doc(db, 'polls', pollId);

        try {
            await runTransaction(db, async (transaction) => {
                const pollDoc = await transaction.get(pollRef);
                if (!pollDoc.exists()) {
                    throw "Poll document does not exist!";
                }

                const currentPollData = pollDoc.data() as PollData;
                const newOptions = currentPollData.options.map(option => {
                    if (option.id === selectedOption) {
                        return { ...option, votes: option.votes + 1 };
                    }
                    return option;
                });
                
                transaction.update(pollRef, { options: newOptions });
            });
            
            toast({ title: "Success", description: "Your vote has been counted." });
            setVoted(true);

        } catch (error) {
            console.error("Error submitting vote:", error);
            toast({ title: "Error", description: "Could not submit your vote.", variant: "destructive"});
        } finally {
            setIsSubmitting(false);
        }
    };


    const totalVotes = pollData ? pollData.options.reduce((acc, option) => acc + option.votes, 0) : 0;
    
    if (isLoading) {
        return (
             <Card>
                <CardContent className="flex items-center justify-center p-10">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    <p>Loading Poll...</p>
                </CardContent>
            </Card>
        )
    }
    
    if (!pollData) {
        return (
            <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                    Could not load the poll. Please try refreshing the page.
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{pollData.question}</CardTitle>
                <CardDescription>
                    {voted ? "Results are updated in real-time." : "Select an option and cast your vote."}
                </CardDescription>
            </CardHeader>
            
            {voted ? (
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
            ) : (
                <CardContent>
                    <RadioGroup value={selectedOption ?? undefined} onValueChange={setSelectedOption}>
                        {pollData.options.map(option => (
                             <Label key={option.id} htmlFor={option.id} className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                                <RadioGroupItem value={option.id} id={option.id} />
                                <span className="font-normal flex-1 cursor-pointer">
                                   {option.text}
                                </span>
                            </Label>
                        ))}
                    </RadioGroup>
                </CardContent>
            )}

             <CardFooter className="justify-between">
                 <div>
                    {!voted && (
                         <Button variant="ghost" onClick={() => setVoted(true)}>Show Results</Button>
                    )}
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        Total Votes: {totalVotes}
                    </div>
                    {!voted && (
                         <Button onClick={handleVote} disabled={!selectedOption || isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Vote
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}
