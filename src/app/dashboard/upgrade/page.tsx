
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PartyPopper } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function UpgradePage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <Card>
                <CardHeader className="text-center">
                    <div className="mx-auto bg-green-100 dark:bg-green-900/50 p-4 rounded-full w-fit">
                        <PartyPopper className="h-8 w-8 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl pt-4">You Have Full Access!</CardTitle>
                    <CardDescription className="max-w-md mx-auto">
                        All features and unlimited exams are enabled for your account. Happy studying!
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Button asChild>
                        <Link href="/dashboard">
                           Back to Dashboard
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
