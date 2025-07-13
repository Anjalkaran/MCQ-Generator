
import { CreateQuizForm } from "@/components/quiz/create-quiz-form";
import { getCategories, getTopics, getUserData } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MockTestForm } from "@/components/quiz/mock-test-form";
import { getFirebaseAuth } from "@/lib/firebase";
import { PaymentButtonContainer } from "@/components/payment/payment-button-container";
import type { UserData } from "@/lib/types";

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = "admin@anjalkaran.com";
const FREE_TOPIC_EXAM_LIMIT = 1;

async function DashboardContent({ categories, topics, userData }: { categories: any[], topics: any[], userData: UserData | null }) {
  const isPaid = userData?.paymentStatus === 'paid';
  const isAdmin = userData?.email === ADMIN_EMAIL;
  const hasReachedFreeLimit = !isAdmin && !isPaid && userData && userData.topicExamsTaken >= FREE_TOPIC_EXAM_LIMIT;

  if (hasReachedFreeLimit && userData) {
    return <PaymentButtonContainer initialUserData={userData} />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Create Your Own Exam</h1>
      </div>
      <Tabs defaultValue="topic-wise" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="topic-wise">Topic-wise MCQ</TabsTrigger>
          <TabsTrigger value="mock-test">Mock Test</TabsTrigger>
        </TabsList>
        <TabsContent value="topic-wise">
          <CreateQuizForm initialCategories={categories} initialTopics={topics} />
        </TabsContent>
        <TabsContent value="mock-test">
          <MockTestForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}


export default async function DashboardPage() {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  // We can't reliably get the current user on the server for every request,
  // so we'll pass what we can and let a client component handle the rest.
  // The layout already handles redirection for non-logged-in users.

  const [categories, topics] = await Promise.all([
    getCategories(),
    getTopics(),
  ]);
  
  // This initial fetch is a snapshot. The client will re-validate.
  const userData = currentUser ? await getUserData(currentUser.uid) : null;

  if (!currentUser) {
    // This case should ideally be handled by the layout redirecting to login.
    // We render a loader as a fallback.
    return (
       <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Create Your Own Exam</h1>
          </div>
          <Card>
            <CardHeader>
                <CardTitle>Loading User Data...</CardTitle>
                <CardDescription>Please wait while we fetch your details.</CardDescription>
            </CardHeader>
             <CardContent>
                <p>You must be logged in to access this page.</p>
            </CardContent>
          </Card>
        </div>
    );
  }

  return <DashboardContent categories={categories} topics={topics} userData={userData} />;
}
