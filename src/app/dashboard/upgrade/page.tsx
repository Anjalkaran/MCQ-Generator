
"use client";

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { useDashboard } from "@/app/dashboard/layout";
import PaymentButton from "@/components/quiz/payment-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { normalizeDate } from "@/lib/utils";
import { Gem, Loader2, PartyPopper, CheckCircle, Calendar, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { ADMIN_EMAILS, RAZORPAY_KEY_ID } from '@/lib/constants';

export default function UpgradePage() {
    const { user, userData, isLoading, setUserData } = useDashboard();
    const { toast } = useToast();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    
    useEffect(() => {
        setIsClient(true);
    }, []);

    const isAdmin = userData?.email ? ADMIN_EMAILS.includes(userData.email) : false;
    const proValidUntilDate = normalizeDate(userData?.proValidUntil);
    const isPro = !!(userData?.isPro && proValidUntilDate && proValidUntilDate > new Date());

    const handleSuccessfulPayment = async (paymentDetails: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
        planType: 'yearly' | 'promo_pa' | 'promo_mts_pm';
    }) => {
        if (!user) return;
        setPaymentState('processing');
        try {
            const response = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.uid,
                    ...paymentDetails,
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to verify payment and upgrade account.');
            }
            
            setPaymentState('success');
            toast({
                title: "Payment Successful!",
                description: "Congratulations! You now have unlimited access.",
                className: "bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700",
            });

            const proValidUntil = new Date(result.proValidUntil);
            setUserData(prev => prev ? ({ ...prev, isPro: true, proValidUntil }) : null);

            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);

        } catch (error: any) {
            setPaymentState('error');
            console.error("Error verifying payment and upgrading user:", error);
            toast({
                title: "Upgrade Failed",
                description: "Your payment was successful, but we had trouble updating your account. Please contact support with your payment details.",
                variant: "destructive",
                duration: 10000,
            });
        }
    };

    const handlePaymentError = (error: string) => {
        setPaymentState('error');
    }

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
                <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                <CardContent><p>Could not load user data. Please try logging in again.</p></CardContent>
            </Card>
        );
    }

    if (isPro && !isAdmin) {
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

    let standardPrice;
    if (userData.examCategory === 'PA') standardPrice = 799;
    else if (userData.examCategory === 'POSTMAN') standardPrice = 599;
    else standardPrice = 499;

    const isPAUser = userData.examCategory === 'PA';
    const isMtsOrPostmanUser = userData.examCategory === 'MTS' || userData.examCategory === 'POSTMAN';
    
    const showPromoPlan = isPAUser || isMtsOrPostmanUser;
    
    const promoDetails = isPAUser 
        ? { title: "PA Exam Special Offer", description: "Limited-time offer for PA aspirants!", amount: 99, validUntil: "August 17, 2025", planType: 'promo_pa' as const }
        : { title: "Exam Special Offer", description: "Limited-time deal for MTS & Postman!", amount: 149, validUntil: "August 31, 2025", planType: 'promo_mts_pm' as const };


    return (
        <>
            <Script id="razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="space-y-0.5 text-center">
                    <h1 className="text-2xl font-bold tracking-tight">Upgrade Your Plan</h1>
                    <p className="text-muted-foreground">Unlock unlimited exam access to continue practicing.</p>
                </div>
                
                {paymentState === 'success' ? (
                     <Card>
                        <CardContent className="text-center space-y-4 p-8">
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto animate-pulse" />
                            <h3 className="text-xl font-semibold">Upgrade Successful!</h3>
                            <p className="text-muted-foreground">Redirecting you to the dashboard...</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className={`grid grid-cols-1 ${showPromoPlan ? 'md:grid-cols-2' : 'md:grid-cols-1 justify-center'} gap-6`}>
                        {/* Promotional Plan */}
                        {showPromoPlan && (
                             <Card className="flex flex-col border-primary border-2 shadow-lg">
                                <CardHeader className="text-center">
                                    <div className="mx-auto bg-amber-400/10 p-4 rounded-full w-fit">
                                        <Star className="h-8 w-8 text-amber-500" />
                                    </div>
                                    <CardTitle className="text-2xl pt-4">{promoDetails.title}</CardTitle>
                                    <CardDescription>{promoDetails.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col items-center space-y-4">
                                    <div className="text-4xl font-bold">
                                        ₹{promoDetails.amount}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        <span>Valid until {promoDetails.validUntil}</span>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <PaymentButton
                                        user={userData}
                                        onPaymentSuccess={(details) => handleSuccessfulPayment({...details, planType: promoDetails.planType})}
                                        onPaymentError={handlePaymentError}
                                        amount={promoDetails.amount}
                                        planType={promoDetails.planType}
                                    />
                                </CardFooter>
                            </Card>
                        )}
                         {/* Standard Plan */}
                        <Card className={`flex flex-col ${!showPromoPlan ? 'border-primary border-2 shadow-lg' : 'border-muted'}`}>
                            <CardHeader className="text-center">
                                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                                    <Gem className="h-8 w-8 text-primary" />
                                </div>
                                <CardTitle className="text-2xl pt-4">Pro Plan</CardTitle>
                                <CardDescription>Unlimited access to all features.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col items-center space-y-4">
                                <div className="text-4xl font-bold">
                                    ₹{standardPrice}
                                    <span className="text-lg font-normal text-muted-foreground"> / year</span>
                                </div>
                                <p className="text-sm text-muted-foreground">This will grant you unlimited exam access for one full year.</p>
                            </CardContent>
                             <CardFooter>
                                <PaymentButton
                                    user={userData}
                                    onPaymentSuccess={(details) => handleSuccessfulPayment({...details, planType: 'yearly'})}
                                    onPaymentError={handlePaymentError}
                                    amount={standardPrice}
                                    planType="yearly"
                                />
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </div>
        </>
    )
}
