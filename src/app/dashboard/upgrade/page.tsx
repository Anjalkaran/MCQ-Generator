
"use client";

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { useDashboard } from "@/app/dashboard/layout";
import PaymentButton from "@/components/quiz/payment-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { normalizeDate } from "@/lib/utils";
import { Gem, Loader2, PartyPopper } from "lucide-react";
import { useRouter } from "next/navigation";
import { ADMIN_EMAIL, RAZORPAY_KEY_ID } from '@/lib/constants';

export default function UpgradePage() {
    const { userData, isLoading } = useDashboard();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
        setIsClient(true);
    }, []);

    const proValidUntilDate = normalizeDate(userData?.proValidUntil);
    const isPro = !!(userData?.isPro && proValidUntilDate && proValidUntilDate > new Date()) || userData?.email === ADMIN_EMAIL;

    if (isLoading || !isClient) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!userData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Could not load user data. Please try logging in again.</p>
                </CardContent>
            </Card>
        );
    }

    if (isPro) {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-green-100 dark:bg-green-900/50 p-4 rounded-full w-fit">
                            <PartyPopper className="h-8 w-8 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl pt-4">You are a Pro User!</CardTitle>
                        <CardDescription className="max-w-md mx-auto">
                            You already have unlimited access to all exams. Your subscription is valid until {proValidUntilDate?.toLocaleDateString()}.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const onPaymentSuccess = () => {
        toast({
            title: "Payment Successful!",
            description: "Congratulations! You now have unlimited access.",
            className: "bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700",
        });
        
        // Force a full page reload to clear all caches and fetch new user data
        window.location.href = '/dashboard';
    }

    const price = userData.examCategory === 'PA' ? 749 : 499;

    return (
        <>
            <Script 
                id="razorpay-checkout-js"
                src="https://checkout.razorpay.com/v1/checkout.js"
                strategy="lazyOnload"
            />
            <div className="space-y-6 max-w-2xl mx-auto">
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">Upgrade Your Plan</h1>
                    <p className="text-muted-foreground">
                        Unlock unlimited exam access to continue practicing.
                    </p>
                </div>
                
                <Card>
                    <CardHeader className="text-center">
                         <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                            <Gem className="h-8 w-8 text-primary" />
                         </div>
                        <CardTitle className="text-2xl pt-4">Free Limit Reached</CardTitle>
                        <CardDescription className="max-w-md mx-auto">
                            You've used up your free exam allocation. To unlock unlimited practice, please complete the payment below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-4">
                        <div className="text-4xl font-bold">
                            ₹{price}
                            <span className="text-lg font-normal text-muted-foreground"> / year</span>
                        </div>
                        <p className="text-sm text-muted-foreground">This will grant you unlimited exam access for one year.</p>
                        <div className="w-full max-w-sm pt-4">
                             <PaymentButton
                                user={userData}
                                onPaymentSuccess={onPaymentSuccess}
                                amount={price}
                             />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    )
}
