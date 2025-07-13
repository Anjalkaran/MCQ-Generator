
"use client";

import { useDashboard } from "@/app/dashboard/layout";
import { PaymentButton } from "@/components/payment/payment-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

export default function UpgradePage() {
    const { user, userData, isLoading } = useDashboard();

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || !userData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Authentication Required</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>You must be logged in to access this page.</p>
                </CardContent>
            </Card>
        );
    }
    
    if (userData.paymentStatus === 'paid') {
        return (
             <Card className="text-center">
                <CardHeader>
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <CardTitle className="mt-4 text-2xl font-bold">You are already subscribed!</CardTitle>
                    <CardDescription>You have unlimited access to all features.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    const price = (userData.examCategory === 'PA') ? 749 : 499;

    return (
        <div className="flex justify-center items-center h-full">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Upgrade Your Plan</CardTitle>
                    <CardDescription>
                        Get unlimited access to all features for your <span className="font-bold">{userData.examCategory}</span> exams.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <div className="my-8">
                        <span className="text-5xl font-bold">₹{price}</span>
                        <span className="text-muted-foreground">/year</span>
                    </div>
                    <ul className="text-left space-y-2 text-muted-foreground">
                        <li className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2"/>
                            Unlimited Topic-wise Exams
                        </li>
                        <li className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2"/>
                            Unlimited Mock Tests
                        </li>
                         <li className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2"/>
                            Detailed Performance Analysis
                        </li>
                    </ul>
                    <PaymentButton user={userData} amount={price} />
                </CardContent>
            </Card>
        </div>
    );
}
