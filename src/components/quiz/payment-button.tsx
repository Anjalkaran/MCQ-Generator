'use client';

import { useState } from 'react';
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
    const { toast } = useToast();

    const createOrder = async () => {
        setLoading(true);

        // Check if Razorpay script is loaded
        if (!window.Razorpay) {
            toast({
                title: "Payment Gateway Not Ready",
                description: "The payment gateway is still loading. Please try again in a moment.",
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

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

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Anjalkaran",
                description: "Test Exam Plan",
                order_id: order.id,
                handler: function (response: any) {
                    onPaymentSuccess();
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
            
            // It's important to setLoading(false) here in case the user closes the Razorpay modal
            // without paying or it failing.
            setLoading(false);

        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message || 'Could not create payment order.', variant: "destructive" });
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={createOrder}
            disabled={loading}
            className="w-full"
            size="lg"
        >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Pay Now'}
        </Button>
    );
}
