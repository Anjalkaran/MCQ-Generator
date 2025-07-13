
"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { getUserData } from '@/lib/firestore';
import type { UserData } from '@/lib/types';
import { PaymentButton } from "./payment-button";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface PaymentButtonContainerProps {
    initialUserData: UserData;
}

export function PaymentButtonContainer({ initialUserData }: PaymentButtonContainerProps) {
    const [userData, setUserData] = useState<UserData>(initialUserData);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const fetchAndSetUserData = useCallback(async (currentUser: User | null) => {
        if (!currentUser) {
            setUserData(initialUserData); // Fallback to initial
            return;
        }
        setIsLoading(true);
        const data = await getUserData(currentUser.uid);
        if (data) {
            setUserData(data);
        }
        setIsLoading(false);
    }, [initialUserData]);
    
    useEffect(() => {
        const auth = getFirebaseAuth();
        if (auth?.currentUser) {
            fetchAndSetUserData(auth.currentUser);
        }
    }, [fetchAndSetUserData]);

    const handlePaymentSuccess = () => {
        // Force a reload of the dashboard page to reflect the new state
        router.refresh();
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }
    
    return <PaymentButton user={userData} onPaymentSuccess={handlePaymentSuccess} />
}
