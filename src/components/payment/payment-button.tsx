
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap } from 'lucide-react';
import type { UserData } from '@/lib/types';
import Script from 'next/script';
import { getUserData } from '@/lib/firestore';
import { format } from 'date-fns';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentButtonProps {
    user: UserData;
    onPaymentSuccess: () => void;
}

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const FREE_TIER_LIMIT = 1;

const getAmount = (examCategory: 'MTS' | 'POSTMAN' | 'PA'): number => {
    if (examCategory === 'PA') {
        return 749;
    }
    return 499;
}

export function PaymentButton({ user, onPaymentSuccess }: PaymentButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const isExpired = user.paidUntil && new Date(user.paidUntil) < new Date();
    const hasUsedFreeTier = user.topicExamsTaken >= FREE_TIER_LIMIT;

    const handlePayment = async () => {
        setIsLoading(true);

        if (!RAZORPAY_KEY_ID) {
            toast({
                title: 'Configuration Error',
                description: 'Payment gateway is not configured correctly. Please contact support.',
                variant: 'destructive',
            });
            setIsLoading(false);
            return;
        }

        try {
            // 1. Create Order
            const orderRes = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid }),
            });

            if (!orderRes.ok) {
                const errorData = await orderRes.json();
                throw new Error(errorData.error || 'Failed to create payment order.');
            }
            const order = await orderRes.json();

            // 2. Open Razorpay Checkout
            const options = {
                key: RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: 'Anjalkaran Exam Prep',
                description: `Unlock unlimited access for ${user.examCategory}`,
                order_id: order.id,
                handler: async function (response: any) {
                    // 3. Verify Payment
                    const verifyRes = await fetch('/api/payment/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            userId: user.uid,
                        }),
                    });

                    if (!verifyRes.ok) {
                        const errorData = await verifyRes.json();
                        throw new Error(errorData.error || 'Payment verification failed.');
                    }
                    
                    toast({
                        title: 'Payment Successful!',
                        description: 'You now have unlimited access.',
                    });
                    onPaymentSuccess();
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                theme: {
                    color: '#FF0000'
                }
            };
            
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                toast({
                    title: 'Payment Failed',
                    description: response.error.description,
                    variant: 'destructive',
                });
            });
            rzp.open();

        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const amount = getAmount(user.examCategory);
    let title = "You've used all your free exams!";
    let ctaText = `Unlock for ₹${amount}`;

    if (isExpired) {
        title = "Your subscription has expired!";
        ctaText = `Renew for ₹${amount}`;
    }

    return (
        <>
            <Script
                id="razorpay-checkout-js"
                src="https://checkout.razorpay.com/v1/checkout.js"
                onLoad={() => console.log('Razorpay SDK loaded.')}
            />
            <div className="text-center p-4 border border-dashed rounded-lg bg-red-50/50 dark:bg-red-900/10 space-y-3">
                <p className="font-semibold text-primary">{title}</p>
                <p className="text-sm text-muted-foreground">
                    To continue practicing, please unlock unlimited access.
                </p>
                <Button onClick={handlePayment} disabled={isLoading} size="lg">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                    {ctaText}
                </Button>
            </div>
        </>
    );
}
