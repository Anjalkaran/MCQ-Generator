'use client';

import { useState, useEffect } from 'react';
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
  planType: 'mts_monthly' | 'postman_monthly' | 'pa_monthly' | 'yearly';
  onPaymentSuccess: (details: { 
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
      planType: 'mts_monthly' | 'postman_monthly' | 'pa_monthly' | 'yearly';
  }) => void;
  onPaymentError: (error: string) => void;
}

export default function PaymentButton({ user, amount, planType, onPaymentSuccess, onPaymentError }: PaymentButtonProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Preload Razorpay script on mount
        if (!window.Razorpay && !document.getElementById('razorpay-checkout-js-dynamic')) {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.id = 'razorpay-checkout-js-dynamic';
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    const createOrder = async () => {
        setLoading(true);

        if (!window.Razorpay) {
            // Try to load it dynamically on click
            const loaded = await new Promise<boolean>((resolve) => {
                const existingScript = document.getElementById('razorpay-checkout-js-dynamic');
                if (existingScript) {
                    existingScript.addEventListener('load', () => resolve(true));
                    existingScript.addEventListener('error', () => resolve(false));
                } else {
                    const script = document.createElement('script');
                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    script.id = 'razorpay-checkout-js-dynamic';
                    script.async = true;
                    script.onload = () => resolve(true);
                    script.onerror = () => resolve(false);
                    document.body.appendChild(script);
                }
            });

            if (!loaded || !window.Razorpay) {
                toast({
                    title: "Payment Gateway Error",
                    description: "Failed to load the payment gateway. Please check your internet connection and try again.",
                    variant: "destructive",
                });
                setLoading(false);
                return;
            }
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
            
            let description = "1-Year Unlimited Exam Access";
            if (planType === 'mts_monthly') {
                description = "MTS Monthly Pro Subscription";
            } else if (planType === 'postman_monthly') {
                description = "Postman Monthly Pro Subscription";
            } else if (planType === 'pa_monthly') {
                description = "PA / SA Monthly Pro Subscription";
            }

            const options = {
                key: RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Anjalkaran Pro",
                description: description,
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
                    contact: user.phone || '',
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
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
            size="lg"
        >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Pay ₹${amount}`}
        </Button>
    );
}
