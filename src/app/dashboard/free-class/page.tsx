
"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { FreeClassManagement } from '@/components/admin/free-class-management';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import { ADMIN_EMAILS } from '@/lib/constants';

export default function AdminFreeClassPage() {
  const { user, userData, isLoading: isDashboardLoading } = useDashboard();
  
  if (isDashboardLoading) {
    return (
       <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userData || !ADMIN_EMAILS.includes(userData.email)) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
                <p>You do not have permission to view this page.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
       <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Free Class Registrations</h1>
          <p className="text-muted-foreground">
            View and manage registrations for the free online class.
          </p>
        </div>
        <FreeClassManagement />
    </div>
  );
}
