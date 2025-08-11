
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
  planType: 'yearly' | 'promo';
  onPaymentSuccess: (details: { 
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
      planType: 'yearly' | 'promo';
  }) => void;
  onPaymentError: (error: string) => void;
}

export default function PaymentButton({ user, amount, planType, onPaymentSuccess, onPaymentError }: PaymentButtonProps) {
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
                    amount: amount,
                    planType: planType,
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
                name: planType === 'promo' ? "Anjalkaran Exam Special" : "Anjalkaran Pro",
                description: planType === 'promo' ? "Access until 17/08/2025" : "1-Year Unlimited Exam Access",
                order_id: order.id,
                handler: function (response: any) {
                    onPaymentSuccess({
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature,
                        planType: planType,
                    });
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                notes: {
                    userId: user.uid,
                    planType: planType,
                },
                theme: {
                    color: "#D62927" 
                },
                modal: {
                    ondismiss: function() {
                        setLoading(false);
                    }
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.on('payment.failed', function (response: any) {
                console.error("Payment Failed", response.error);
                const errorMessage = response.error.description || "An unknown error occurred.";
                toast({ title: "Payment Failed", description: errorMessage, variant: "destructive" });
                onPaymentError(errorMessage);
                setLoading(false);
            });
            paymentObject.open();
            
        } catch (error: any) {
            console.error("Order creation error:", error);
            const errorMessage = error.message || 'Could not initiate the payment process.';
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
            onPaymentError(errorMessage);
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
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Pay ₹${amount}`}
        </Button>
    );
}
