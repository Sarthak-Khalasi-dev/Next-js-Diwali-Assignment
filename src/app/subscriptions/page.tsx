import { CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SubscriptionsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <p className="text-gray-500 mt-1">Track recurring subscriptions</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <CreditCard className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Subscriptions module coming soon</p>
          <p className="text-sm text-gray-400 mt-1">This will be built on Day 6-8</p>
        </CardContent>
      </Card>
    </div>
  );
}
