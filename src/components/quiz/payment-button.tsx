'use client';

import { useState } from 'react';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { UserData } from '@/lib/types';

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface PaymentButtonProps {
  user: UserData;
  onPaymentSuccess: () => void;
}

export default function PaymentButton({ user, onPaymentSuccess }: PaymentButtonProps) {
    const [loading, setLoading] = useState(false);
    const [isRazorpayReady, setIsRazorpayReady] = useState(false);
    const { toast } = useToast();

    const createOrder = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: user.uid, examCategory: user.examCategory }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create payment order.');
            }

            const order = await response.json();

            if (!window.Razorpay) {
                toast({ title: "Error", description: "Razorpay SDK failed to load. Are you online?", variant: "destructive"});
                setLoading(false);
                return;
            }

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Anjalkaran",
                description: "Test Exam Plan",
                order_id: order.id,
                handler: async function (response: any) {
                    await verifyPayment(response);
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                theme: {
                    color: "#D62927" 
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();

            paymentObject.on('payment.failed', function (response: any) {
                toast({ title: "Payment Failed", description: response.error.description, variant: "destructive" });
                setLoading(false);
            });

        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message || 'Could not create payment order.', variant: "destructive" });
        } finally {
            // Don't set loading to false here, as Razorpay's own UI is now active
        }
    };

    const verifyPayment = async (paymentResponse: any) => {
        setLoading(true);
        try {
            const response = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    razorpay_order_id: paymentResponse.razorpay_order_id,
                    razorpay_payment_id: paymentResponse.razorpay_payment_id,
                    razorpay_signature: paymentResponse.razorpay_signature,
                    userId: user.uid,
                }),
            });

            const result = await response.json();

            if (result.isVerified) {
                toast({ title: "Success", description: "Payment successful and verified! Your limit has been reset." });
                onPaymentSuccess();
            } else {
                toast({ title: "Verification Failed", description: "Payment verification failed. Please contact support.", variant: "destructive" });
            }
        } catch (error) {
            console.error("Verification error:", error);
            toast({ title: "Error", description: "Could not verify payment.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Script 
                src="https://checkout.razorpay.com/v1/checkout.js" 
                onLoad={() => setIsRazorpayReady(true)}
                onError={() => {
                    toast({ title: "Error", description: "Could not load payment provider. Please check your network or ad blocker.", variant: "destructive" });
                }}
            />
            <Button
                onClick={createOrder}
                disabled={loading || !isRazorpayReady}
                className="w-full"
                size="lg"
            >
                {loading || !isRazorpayReady ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Pay Now'}
            </Button>
        </>
    );
}
