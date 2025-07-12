import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is where the user's profile information will be displayed.</p>
          <p>This page is currently under construction.</p>
        </CardContent>
      </Card>
    </div>
  );
}
