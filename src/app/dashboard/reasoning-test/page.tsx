
"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function ReasoningTestPage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Reasoning Test</h1>
                <p className="text-muted-foreground">
                    This feature is currently being improved.
                </p>
            </div>
            <Card>
                <CardHeader className="items-center text-center">
                    <div className="p-3 bg-primary/10 rounded-full">
                       <Wrench className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>Updating Soon</CardTitle>
                    <CardDescription>
                        The reasoning test feature is temporarily unavailable as we are making improvements. It will be back online shortly. Thank you for your patience!
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
