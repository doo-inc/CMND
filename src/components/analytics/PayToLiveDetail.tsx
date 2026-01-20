import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Clock, Building2 } from "lucide-react";

interface PayToLiveRow {
  customer_id: string;
  customer_name: string;
  segment: string;
  country: string;
  estimated_deal_value: number;
  payment_date: string;
  go_live_date: string;
  days_to_live: number;
}

interface PayToLiveDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const PayToLiveDetail = ({ countries, dateFrom, dateTo }: PayToLiveDetailProps) => {
  const [rows, setRows] = useState<PayToLiveRow[]>([]);
  const [averageDays, setAverageDays] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get all Payment Processed stages that are done
        const { data: paymentStages, error: paymentError } = await supabase
          .from("lifecycle_stages")
          .select("customer_id, status_changed_at")
          .eq("name", "Payment Processed")
          .eq("status", "done")
          .not("status_changed_at", "is", null);

        // Get all Go Live stages that are done
        const { data: goLiveStages, error: goLiveError } = await supabase
          .from("lifecycle_stages")
          .select("customer_id, status_changed_at")
          .eq("name", "Go Live")
          .eq("status", "done")
          .not("status_changed_at", "is", null);

        if (paymentError || goLiveError) {
          throw paymentError || goLiveError;
        }

        if (!paymentStages || !goLiveStages) {
          setRows([]);
          return;
        }

        // Get customer details limited by filters
        let customersQuery = supabase
          .from("customers")
          .select("id, name, segment, country, estimated_deal_value, created_at");

        if (countries && countries.length > 0) {
          customersQuery = customersQuery.in("country", countries);
        }

        if (dateFrom) {
          customersQuery = customersQuery.gte("created_at", dateFrom.toISOString());
        }

        if (dateTo) {
          customersQuery = customersQuery.lte("created_at", dateTo.toISOString());
        }

        const { data: customers, error: customersError } = await customersQuery;
        if (customersError) {
          throw customersError;
        }

        const result: PayToLiveRow[] = [];

        paymentStages.forEach((payment) => {
          const goLive = goLiveStages.find((g) => g.customer_id === payment.customer_id);
          const customer = customers?.find((c) => c.id === payment.customer_id);

          if (goLive && customer && payment.status_changed_at && goLive.status_changed_at) {
            const paymentDate = new Date(payment.status_changed_at);
            const goLiveDate = new Date(goLive.status_changed_at);

            if (goLiveDate > paymentDate) {
              const diffTime = goLiveDate.getTime() - paymentDate.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              result.push({
                customer_id: customer.id,
                customer_name: customer.name,
                segment: customer.segment || "Unknown",
                country: customer.country || "Unknown",
                estimated_deal_value: customer.estimated_deal_value || 0,
                payment_date: payment.status_changed_at,
                go_live_date: goLive.status_changed_at,
                days_to_live: diffDays,
              });
            }
          }
        });

        const dayValues = result.map((r) => r.days_to_live);
        const avg =
          dayValues.length > 0
            ? dayValues.reduce((sum, d) => sum + d, 0) / dayValues.length
            : 0;

        setRows(result.sort((a, b) => b.days_to_live - a.days_to_live));
        setAverageDays(Math.round(avg));
      } catch (error) {
        console.error("Error fetching pay to live data:", error);
        setRows([]);
        setAverageDays(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Simple summary based only on underlying rows */}
      <Card>
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Average Pay to Live</p>
              <p className="text-2xl font-bold text-primary">
                {averageDays > 0 ? `${averageDays} days` : "N/A"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Customers counted</p>
            <p className="text-xl font-semibold">{rows.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Underlying rows */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Pay to Live Data</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No customers found with both Payment Processed and Go Live stages completed
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((row) => (
                <div
                  key={row.customer_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{row.customer_name}</span>
                      <Badge variant="outline">{row.segment}</Badge>
                      <span className="text-sm text-muted-foreground">🌍 {row.country}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Payment: {format(new Date(row.payment_date), "MMM dd, yyyy")}
                      </span>
                      <span>
                        Go Live: {format(new Date(row.go_live_date), "MMM dd, yyyy")}
                      </span>
                      <span>Value: {formatCurrency(row.estimated_deal_value)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">{row.days_to_live}</p>
                      <p className="text-sm text-muted-foreground">days</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/customers/${row.customer_id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

