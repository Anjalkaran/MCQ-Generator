
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import type { UserData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

interface PaymentButtonProps {
    user: UserData;
    amount: number;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function PaymentButton({ user, amount }: PaymentButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handlePayment = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount: amount, userId: user.uid }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to create payment order.');
            }

            const order = await res.json();

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: 'Anjalkaran MCQ Generator',
                description: 'Yearly Subscription',
                order_id: order.id,
                handler: async function (response: any) {
                    const verificationRes = await fetch('/api/payment/verify', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            userId: user.uid
                        }),
                    });

                    if (!verificationRes.ok) {
                         const errorData = await verificationRes.json();
                         throw new Error(errorData.error || "Payment verification failed.");
                    }
                    
                    toast({
                        title: 'Payment Successful!',
                        description: 'Your account has been upgraded.',
                    });

                    // Reload the page to reflect the new subscription status
                    window.location.reload();
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                theme: {
                    color: '#D40000', // Matches your primary red color
                },
            };
            
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                toast({
                    title: 'Payment Failed',
                    description: response.error.description || 'Something went wrong.',
                    variant: 'destructive',
                });
            });
            rzp.open();

        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
            <Button onClick={handlePayment} disabled={isLoading} className="w-full mt-8" size="lg">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Pay Now
            </Button>
        </>
    );
}
