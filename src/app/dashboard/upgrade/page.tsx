"use client";

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { useDashboard } from "@/context/dashboard-context";
import PaymentButton from "@/components/quiz/payment-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { normalizeDate, checkIsPro } from "@/lib/utils";
import { Gem, Loader2, PartyPopper, CheckCircle, Calendar, Star, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { ADMIN_EMAILS } from '@/lib/constants';
import { Button } from "@/components/ui/button";

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
    const isPro = checkIsPro(userData);

    const handleSuccessfulPayment = async (paymentDetails: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
        planType: 'mts_monthly' | 'postman_monthly' | 'pa_monthly' | 'yearly';
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
                description: "Congratulations! Your account has been upgraded to Anjalkaran Pro.",
                className: "bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-800 dark:text-green-100",
            });

            const proValidUntil = new Date(result.proValidUntil);
            
            let subscribedCategory: 'MTS' | 'POSTMAN' | 'PA' | 'IP' | 'GROUP B' = 'MTS';
            if (planType === 'pa_monthly') {
                subscribedCategory = 'PA';
            } else if (planType === 'postman_monthly') {
                subscribedCategory = 'POSTMAN';
            } else if (planType === 'mts_monthly') {
                subscribedCategory = 'MTS';
            } else if (userData?.examCategory) {
                subscribedCategory = userData.examCategory as any;
            }

            setUserData(prev => prev ? ({ 
                ...prev, 
                isPro: true, 
                proValidUntil, 
                subscribedCategory: subscribedCategory
            }) : null);

            setTimeout(() => {
                router.push('/dashboard');
            }, 2500);

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
            <div className="max-w-md mx-auto pt-10">
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-600">Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Could not load user data. Please try logging in again.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isPro && !isAdmin) {
        return (
            <div className="space-y-6 max-w-2xl mx-auto pt-6">
                <Card className="border-green-200 shadow-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-green-100 dark:bg-green-900/50 p-4 rounded-full w-fit">
                            <PartyPopper className="h-8 w-8 text-green-500 animate-bounce" />
                        </div>
                        <CardTitle className="text-2xl pt-4">You Have Pro Access!</CardTitle>
                        <CardDescription className="max-w-md mx-auto">
                            All premium features and unlimited exams are enabled for your subscription.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center text-slate-600 dark:text-slate-300">
                        {proValidUntilDate ? (
                            <p className="flex items-center justify-center gap-2">
                                <Calendar className="h-4 w-4 text-emerald-500" />
                                Your subscription is valid until:{' '}
                                <span className="font-semibold">{proValidUntilDate.toLocaleDateString('en-GB')}</span>
                            </p>
                        ) : (
                            <p className="font-semibold text-emerald-600">Your account has unlimited access.</p>
                        )}
                        {userData.subscribedCategory && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                Subscribed Category: <span className="font-semibold text-slate-800 dark:text-slate-100">{userData.subscribedCategory}</span>
                            </p>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-center border-t pt-4">
                        <Button onClick={() => router.push('/dashboard')} variant="default">
                            Back to Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const currentCat = userData.examCategory;
    
    // Determine the subscription price & details for the current category
    let planTitle = "Pro Plan";
    let planPrice = 99;
    let planType: 'mts_monthly' | 'postman_monthly' | 'pa_monthly' | 'yearly' = 'mts_monthly';
    let isEliteFree = false;

    if (currentCat === 'MTS') {
        planTitle = "MTS Monthly Pro";
        planPrice = 99;
        planType = 'mts_monthly';
    } else if (currentCat === 'POSTMAN') {
        planTitle = "Postman Monthly Pro";
        planPrice = 99;
        planType = 'postman_monthly';
    } else if (currentCat === 'PA') {
        planTitle = "PA / SA Monthly Pro";
        planPrice = 199;
        planType = 'pa_monthly';
    } else if (currentCat === 'IP' || currentCat === 'GROUP B') {
        isEliteFree = true;
    }

    return (
        <>
            <Script id="razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            <div className="space-y-6 max-w-4xl mx-auto py-8">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                        Upgrade Your Plan
                    </h1>
                    <p className="text-lg text-slate-500 max-w-md mx-auto">
                        Unlock unlimited exams, daily tests, and premium study materials for your category.
                    </p>
                </div>
                
                {paymentState === 'success' ? (
                     <Card className="max-w-md mx-auto border-green-200">
                        <CardContent className="text-center space-y-4 p-8">
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto animate-pulse" />
                            <h3 className="text-xl font-bold text-slate-900">Upgrade Successful!</h3>
                            <p className="text-slate-500">Redirecting you to the dashboard...</p>
                        </CardContent>
                    </Card>
                ) : isEliteFree ? (
                    <Card className="max-w-md mx-auto border-emerald-200 shadow-md">
                        <CardHeader className="text-center">
                            <div className="mx-auto bg-amber-100 dark:bg-amber-950 p-4 rounded-full w-fit">
                                <Star className="h-8 w-8 text-amber-500 fill-amber-500 animate-spin-slow" />
                            </div>
                            <CardTitle className="text-2xl pt-4">Elite Access Enabled!</CardTitle>
                            <CardDescription>
                                Preparation for {currentCat === 'IP' ? 'Inspector Post' : 'Postal Service Group B'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center text-slate-600">
                            <p>You have full access to all features for this course. Subscription options for {currentCat} will be configured later.</p>
                        </CardContent>
                        <CardFooter className="flex justify-center">
                            <Button onClick={() => router.push('/dashboard')}>
                                Go to Dashboard
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <div className="max-w-md mx-auto">
                        <Card className="flex flex-col border-primary border-2 shadow-xl bg-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-red-600 text-white text-xs px-3 py-1 font-semibold rounded-bl">
                                Active Category
                            </div>
                            <CardHeader className="text-center pb-2">
                                <div className="mx-auto bg-red-50 p-4 rounded-full w-fit text-red-600">
                                    <Gem className="h-8 w-8 animate-pulse" />
                                </div>
                                <CardTitle className="text-2xl pt-4 font-bold text-slate-900">{planTitle}</CardTitle>
                                <CardDescription className="text-sm">For {currentCat} Preparation</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col items-center space-y-6 px-8">
                                <div className="text-center">
                                    <div className="text-5xl font-black text-slate-900">
                                        ₹{planPrice}
                                        <span className="text-base font-normal text-slate-500"> / month</span>
                                    </div>
                                    <p className="text-xs text-red-600 font-semibold mt-1">Cancel anytime</p>
                                </div>
                                
                                <div className="w-full border-t border-slate-100 pt-4 space-y-3">
                                    <div className="flex items-center text-sm text-slate-600 gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                        <span>Unlimited Premium Mock Tests</span>
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600 gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                        <span>Unlimited Topic-wise MCQs</span>
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600 gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                        <span>Part-wise Exam Practice Generators</span>
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600 gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                        <span>Full Exam Performance History</span>
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600 gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                        <span>
                                            {(currentCat === 'MTS' || currentCat === 'POSTMAN') && "Access to both MTS & Postman Exams & Quizzes"}
                                            {currentCat === 'PA' && "Access to PA/SA, Postman & MTS Exams & Quizzes"}
                                        </span>
                                    </div>
                                </div>
                                
                                <p className="text-xs text-center text-slate-400">
                                    Your subscription will be valid for 1 month from the time of payment.
                                </p>
                            </CardContent>
                            <CardFooter className="px-8 pb-8 pt-4">
                                <PaymentButton
                                    user={userData}
                                    onPaymentSuccess={(details) => handleSuccessfulPayment({...details, planType})}
                                    onPaymentError={handlePaymentError}
                                    amount={planPrice}
                                    planType={planType}
                                />
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </div>
        </>
    );
}
