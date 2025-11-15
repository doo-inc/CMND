import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, Users, TrendingUp } from "lucide-react";

interface PartnershipRevenueMetricsProps {
  totalRevenue: number;
  contractCount: number;
  customerCount: number;
  averageDealSize: number;
}

export const PartnershipRevenueMetrics = ({
  totalRevenue,
  contractCount,
  customerCount,
  averageDealSize,
}: PartnershipRevenueMetricsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue Generated</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">From linked contracts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contracts Linked</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{contractCount}</div>
          <p className="text-xs text-muted-foreground">Active partnerships</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Customers Referred</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{customerCount}</div>
          <p className="text-xs text-muted-foreground">Unique customers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Deal Size</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${averageDealSize.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Per contract</p>
        </CardContent>
      </Card>
    </div>
  );
};
