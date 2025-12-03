
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// This data would eventually come from Firestore
const pollData = {
    id: "ip-marks-2025",
    question: "IP Aspirants 2025: Paper 1 & 3 MARKS",
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
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentVotes, setCurrentVotes] = useState(pollData.options.map(opt => ({ ...opt })));

    useEffect(() => {
        // On component mount, check if the user has already voted.
        const previousVote = localStorage.getItem(`poll_${pollData.id}`);
        if (previousVote) {
            setHasVoted(true);
            setSelectedOption(previousVote);
        }
    }, []);

    const totalVotes = currentVotes.reduce((acc, option) => acc + option.votes, 0);

    const handleVote = () => {
        if (!selectedOption) {
            toast({
                title: "No Selection",
                description: "Please select an option before submitting your vote.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        // Simulate an API call to save the vote
        setTimeout(() => {
            setCurrentVotes(prevVotes => 
                prevVotes.map(opt => 
                    opt.id === selectedOption ? { ...opt, votes: opt.votes + 1 } : opt
                )
            );
            
            // Store the vote in localStorage to prevent re-voting
            localStorage.setItem(`poll_${pollData.id}`, selectedOption);

            setHasVoted(true);
            setIsLoading(false);
            toast({
                title: "Vote Submitted",
                description: "Thank you for participating!",
            });
        }, 500);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{pollData.question}</CardTitle>
                <CardDescription>Select one option to cast your vote or view the results.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {hasVoted ? (
                        <div className="space-y-3">
                            {currentVotes.map(option => {
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
                            {currentVotes.map(option => (
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
                    <Button onClick={handleVote} disabled={isLoading || !selectedOption}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Vote
                    </Button>
                )}
                 <div className="text-sm text-muted-foreground ml-auto">
                    Total Votes: {totalVotes}
                </div>
            </CardFooter>
        </Card>
    );
}
