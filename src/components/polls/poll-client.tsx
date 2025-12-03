
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2 } from 'lucide-react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, increment, runTransaction } from 'firebase/firestore';

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

const initialPollData: PollData = {
    id: "ip-marks-2025",
    question: "IP exam mark paper 1 and paper 3 total",
    options: [
        { id: "opt12", text: "511-530", votes: 0 },
        { id: "opt11", text: "491-510", votes: 0 },
        { id: "opt1", text: "480-490", votes: 1 },
        { id: "opt2", text: "460-479", votes: 6 },
        { id: "opt3", text: "450-459", votes: 1 },
        { id: "opt4", text: "440-449", votes: 4 },
        { id: "opt5", text: "430-439", votes: 7 },
        { id: "opt6", text: "420-429", votes: 7 },
        { id: "opt7", text: "410-419", votes: 9 },
        { id: "opt8", text: "400-409", votes: 4 },
        { id: "opt9", text: "390-399", votes: 7 },
        { id: "opt10", text: "370-389", votes: 0 },
        { id: "opt13", text: "350-369", votes: 0 },
    ],
};

export function PollClient() {
    const { toast } = useToast();
    const [pollData, setPollData] = useState<PollData>(initialPollData);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const db = getFirebaseDb();
        if (!db) {
            toast({ title: "Error", description: "Could not connect to the database.", variant: "destructive"});
            setIsLoading(false);
            return;
        }

        const pollRef = doc(db, 'polls', initialPollData.id);

        const unsubscribe = onSnapshot(pollRef, (docSnap) => {
            if (docSnap.exists()) {
                setPollData(docSnap.data() as PollData);
            } else {
                // If the poll doesn't exist in Firestore, create it with initial data.
                setDoc(pollRef, initialPollData);
                setPollData(initialPollData);
            }
            setIsLoading(false);
        });

        const previousVote = localStorage.getItem(`poll_${initialPollData.id}`);
        if (previousVote) {
            setHasVoted(true);
            setSelectedOption(previousVote);
        }
        
        return () => unsubscribe();
    }, [toast]);

    const totalVotes = pollData.options.reduce((acc, option) => acc + option.votes, 0);

    const handleVote = async () => {
        if (!selectedOption) {
            toast({
                title: "No Selection",
                description: "Please select an option before submitting your vote.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        const db = getFirebaseDb();
        if (!db) {
             toast({ title: "Error", description: "Could not connect to the database.", variant: "destructive"});
             setIsLoading(false);
             return;
        }
        
        const pollRef = doc(db, 'polls', pollData.id);

        try {
            await runTransaction(db, async (transaction) => {
                const pollDoc = await transaction.get(pollRef);
                if (!pollDoc.exists()) {
                    throw "Poll does not exist.";
                }

                const currentData = pollDoc.data() as PollData;
                const newOptions = currentData.options.map(opt => {
                    if (opt.id === selectedOption) {
                        return { ...opt, votes: opt.votes + 1 };
                    }
                    return opt;
                });
                
                transaction.update(pollRef, { options: newOptions });
            });

            localStorage.setItem(`poll_${pollData.id}`, selectedOption);
            setHasVoted(true);
            toast({
                title: "Vote Submitted",
                description: "Thank you for participating!",
            });
        } catch (error) {
            console.error("Error submitting vote:", error);
            toast({ title: "Error", description: "Could not submit your vote.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>{pollData.question}</CardTitle>
                <CardDescription>Select one option to cast your vote. You can only vote once per device.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {hasVoted ? (
                        <div className="space-y-3">
                            {pollData.options.map(option => {
                                const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                                const isSelected = option.id === selectedOption;
                                return (
                                    <div key={option.id} className="space-y-1">
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="font-medium flex items-center">
                                                {option.text}
                                                {isSelected && <Check className="ml-2 h-4 w-4 text-primary" />}
                                            </div>
                                            <span className="text-muted-foreground">{option.votes} vote(s)</span>
                                        </div>
                                        <Progress value={percentage} className="h-2" />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <RadioGroup value={selectedOption ?? ''} onValueChange={setSelectedOption}>
                            {pollData.options.map(option => (
                                <div key={option.id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={option.id} id={option.id} />
                                    <Label htmlFor={option.id} className="cursor-pointer">{option.text}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row items-center gap-4">
                {!hasVoted && (
                    <div className="flex gap-2">
                        <Button onClick={handleVote} disabled={isLoading || !selectedOption}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Vote
                        </Button>
                        <Button variant="outline" onClick={() => setHasVoted(true)}>
                            Show Results
                        </Button>
                    </div>
                )}
                 <div className="text-sm text-muted-foreground ml-auto">
                    Total Votes: {totalVotes}
                </div>
            </CardFooter>
        </Card>
    );
}
