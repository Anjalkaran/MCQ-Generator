'use client';

import { useState } from 'react';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface PaymentButtonProps {
  userId: string;
  userName: string;
  email: string;
  onPaymentSuccess: () => void;
}

export default function PaymentButton({ userId, userName, email, onPaymentSuccess }: PaymentButtonProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const createOrder = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create order: ${errorText}`);
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
                    name: userName,
                    email: email,
                },
                theme: {
                    color: "#D62927" 
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();

            paymentObject.on('payment.failed', function (response: any) {
                toast({ title: "Payment Failed", description: response.error.description, variant: "destructive" });
            });

        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: 'Could not create payment order. See console for details.', variant: "destructive" });
        } finally {
            setLoading(false);
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
                    userId,
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
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />
            <Button
                onClick={createOrder}
                disabled={loading}
                className="w-full"
                size="lg"
            >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Pay Now & Reset Limit'}
            </Button>
        </>
    );
}
