
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { getUserData } from '@/lib/firestore';
import type { UserData } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { PaymentButton } from '../payment/payment-button';

const FREE_TOPIC_EXAM_LIMIT = 1;
const ADMIN_EMAIL = "admin@anjalkaran.com";

export function MockTestForm() {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAndSetUserData = async (currentUser: User | null) => {
        if (!currentUser) {
            setUserData(null);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const data = await getUserData(currentUser.uid);
        setUserData(data);
        setIsLoading(false);
    };

    useEffect(() => {
        const auth = getFirebaseAuth();
        if (!auth) {
            setIsLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            await fetchAndSetUserData(currentUser);
        });

        const handleFocus = async () => {
            if (auth.currentUser) {
                await fetchAndSetUserData(auth.currentUser);
            }
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            unsubscribe();
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    const handlePaymentSuccess = () => {
        if (user) {
            fetchAndSetUserData(user);
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader />
                <CardContent>
                    <div className="flex justify-center items-center h-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const isAdmin = user?.email === ADMIN_EMAIL;
    const isPaid = userData?.paymentStatus === 'paid';
    const hasReachedFreeLimit = !isAdmin && !isPaid && userData && userData.topicExamsTaken >= FREE_TOPIC_EXAM_LIMIT;

    if (hasReachedFreeLimit && userData) {
        return <PaymentButton user={userData} onPaymentSuccess={handlePaymentSuccess} />;
    }

  return (
    <Card>
        <CardHeader className="text-center">
            <CardTitle>Mock Test</CardTitle>
            <CardDescription>
                This feature is coming soon. Prepare for a full-length mock exam experience.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center text-muted-foreground">
                <p>Stay tuned!</p>
            </div>
        </CardContent>
    </Card>
  );
}
