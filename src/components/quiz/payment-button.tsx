'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { UserData } from '@/lib/types';
import { RAZORPAY_KEY_ID } from '@/lib/constants';

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface PaymentButtonProps {
  user: UserData;
  amount: number;
  onPaymentSuccess: () => void;
}

export default function PaymentButton({ user, amount, onPaymentSuccess }: PaymentButtonProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const createOrder = async () => {
        setLoading(true);

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
                body: JSON.stringify({ 
                    userId: user.uid, 
                    amount: amount 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create payment order.');
            }

            const order = await response.json();

            const options = {
                key: RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Anjalkaran Pro",
                description: "1-Year Unlimited Exam Access",
                order_id: order.id,
                handler: function (response: any) {
                    onPaymentSuccess();
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                notes: {
                    userId: user.uid,
                },
                theme: {
                    color: "#D62927" 
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.on('payment.failed', function (response: any) {
                console.error("Payment Failed", response.error);
                toast({ title: "Payment Failed", description: response.error.description || "An unknown error occurred.", variant: "destructive" });
                setLoading(false);
            });
            paymentObject.open();
            // Don't setLoading(false) here, it will be handled by the success/failure handlers or when the modal is closed by the user.
            
        } catch (error: any) {
            console.error("Order creation error:", error);
            toast({ title: "Error", description: error.message || 'Could not initiate the payment process.', variant: "destructive" });
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
