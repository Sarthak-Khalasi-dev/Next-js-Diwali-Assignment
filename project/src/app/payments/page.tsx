import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-500 mt-1">Record and track payment records</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Wallet className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Payments module coming soon</p>
          <p className="text-sm text-gray-400 mt-1">This will be built on Day 12-13</p>
        </CardContent>
      </Card>
    </div>
  );
}
