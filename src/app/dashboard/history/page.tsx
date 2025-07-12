import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HistoryPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">MCQ History</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Past MCQs</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is where a list of past MCQ results will be shown.</p>
          <p>This page is currently under construction.</p>
        </CardContent>
      </Card>
    </div>
  );
}
