
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench } from 'lucide-react';
import Link from 'next/link';

export function LoginForm() {
  return (
    <Card className="w-full max-w-sm text-center">
      <CardHeader>
        <div className="flex justify-center">
          <Wrench className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="mt-4">Under Maintenance</CardTitle>
        <CardDescription>
          Our app is currently undergoing scheduled maintenance. We will be back online shortly. Thank you for your patience!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Need help? <Link href="/support" className="underline">Contact Support</Link>
        </p>
      </CardContent>
    </Card>
  );
}
