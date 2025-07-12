
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MockTestForm() {

  return (
    <Card>
        <CardHeader className="text-center">
            <CardTitle>Mock Test</CardTitle>
            <CardDescription>
                This feature is coming soon. Prepare for a full-length mock exam experience.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center text-muted-foreground">
                <p>Stay tuned!</p>
            </div>
        </CardContent>
    </Card>
  );
}
