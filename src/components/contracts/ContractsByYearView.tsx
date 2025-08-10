import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/contractUtils";

interface DBContract {
  id: string;
  customer_id: string | null;
  name: string | null; // type/name of contract
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  setup_fee: number | null;
  annual_rate: number | null;
  value: number | null; // legacy
  payment_frequency: string | null; // annual | quarterly | semi_annual | one_time
}

interface DBCustomer { id: string; name: string | null; }

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function parseISO(d: string | null): Date | null {
  if (!d) return null;
  const date = new Date(d);
  return isNaN(date.getTime()) ? null : date;
}

function isSameMonth(date: Date, year: number, monthIndex: number) {
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}

const statusBadge = (status?: string | null) => {
  const s = (status || "").toLowerCase();
  const base = "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border";
  switch (s) {
    case "active":
      return <span className={`${base} border-green-200 bg-green-100 text-green-800`}>Active</span>;
    case "pending":
      return <span className={`${base} border-blue-200 bg-blue-100 text-blue-800`}>Pending</span>;
    case "expired":
      return <span className={`${base} border-red-200 bg-red-100 text-red-800`}>Expired</span>;
    case "draft":
      return <span className={`${base} border-gray-200 bg-gray-100 text-gray-800`}>Draft</span>;
    default:
      return <span className={`${base} border-muted bg-muted/50 text-foreground`}>{status || "-"}</span>;
  }
};

const ContractsByYearView: React.FC = () => {
  const [contracts, setContracts] = useState<DBContract[]>([]);
  const [customers, setCustomers] = useState<DBCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: contractData, error: cErr }, { data: customerData, error: cuErr }] = await Promise.all([
        supabase.from("contracts").select(
          "id, customer_id, name, status, start_date, end_date, setup_fee, annual_rate, value, payment_frequency"
        ),
        supabase.from("customers").select("id, name")
      ]);

      if (cErr) console.error("Error fetching contracts", cErr);
      if (cuErr) console.error("Error fetching customers", cuErr);

      setContracts((contractData as DBContract[]) || []);
      setCustomers((customerData as DBCustomer[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach(c => { if (c.id) map.set(c.id, c.name || "Unknown Customer"); });
    return map;
  }, [customers]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    contracts.forEach(c => {
      const s = parseISO(c.start_date); const e = parseISO(c.end_date);
      if (s) years.add(s.getFullYear());
      if (e) years.add(e.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [contracts]);

  useEffect(() => {
    if (!yearOptions.includes(selectedYear) && yearOptions.length > 0) {
      setSelectedYear(yearOptions[0]);
    }
  }, [yearOptions, selectedYear]);

  type MonthData = {
    monthIndex: number;
    monthlyARR: number;
    monthlyRevenue: number;
    activatedCount: number;
    activeCount: number;
    rows: DBContract[];
  };

  const monthlyData: MonthData[] = useMemo(() => {
    const data: MonthData[] = [];

    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(selectedYear, m, 1);
      const monthEnd = new Date(selectedYear, m + 1, 0, 23, 59, 59, 999);

      const rows = contracts.filter(c => {
        const s = parseISO(c.start_date);
        const e = parseISO(c.end_date);
        if (!s) return false;

        const freq = (c.payment_frequency || "annual").toLowerCase();
        if (freq === "one_time") {
          return isSameMonth(s, selectedYear, m);
        }

        const startsBeforeEnd = s <= monthEnd;
        const endsAfterStart = !e || e >= monthStart;
        return startsBeforeEnd && endsAfterStart;
      });

      const activatedThisMonth = contracts.filter(c => {
        const s = parseISO(c.start_date);
        return !!(s && isSameMonth(s, selectedYear, m));
      });

      const monthlyARR = rows.reduce((sum, c) => {
        const freq = (c.payment_frequency || "annual").toLowerCase();
        if (freq === "one_time") return sum; // no recurring
        const annual = (c.annual_rate ?? c.value ?? 0);
        return sum + annual / 12;
      }, 0);

      const setupFeesThisMonth = activatedThisMonth.reduce((sum, c) => sum + (c.setup_fee || 0), 0);
      const monthlyRevenue = monthlyARR + setupFeesThisMonth;

      data.push({
        monthIndex: m,
        monthlyARR,
        monthlyRevenue,
        activatedCount: activatedThisMonth.length,
        activeCount: rows.length,
        rows
      });
    }

    return data;
  }, [contracts, selectedYear]);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Contracts by Year</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Contracts by Year</h2>
        <div className="w-40">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="glass-input">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="glass-card">
              {yearOptions.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {monthlyData.map(({ monthIndex, monthlyARR, monthlyRevenue, activatedCount, activeCount, rows }) => (
        <Card key={monthIndex} className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{monthNames[monthIndex]} {selectedYear}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">Active: {activeCount}</Badge>
                <Badge variant="outline">Activated: {activatedCount}</Badge>
                <span className="ml-2">ARR: <strong>{formatCurrency(Math.round(monthlyARR))}</strong></span>
                <span className="ml-4">Revenue: <strong>{formatCurrency(Math.round(monthlyRevenue))}</strong></span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6">No active contracts this month.</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Annual Rate</TableHead>
                      <TableHead>Setup Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((c) => {
                      const s = parseISO(c.start_date);
                      const activated = !!(s && isSameMonth(s, selectedYear, monthIndex));
                      const customerName = (c.customer_id && customerMap.get(c.customer_id)) || "Unknown Customer";
                      const annual = c.annual_rate ?? c.value ?? 0;
                      const freq = (c.payment_frequency || "annual").replace("_", "-");
                      const dateRange = `${s ? s.toISOString().slice(0,10) : "-"} → ${parseISO(c.end_date)?.toISOString().slice(0,10) || "-"}`;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">
                            {customerName}
                            {activated && <span className="ml-2 text-xs text-muted-foreground">(Activated this month)</span>}
                          </TableCell>
                          <TableCell>{c.name || "Service Agreement"}</TableCell>
                          <TableCell>{statusBadge(c.status)}</TableCell>
                          <TableCell>{dateRange}</TableCell>
                          <TableCell className="capitalize">{freq.replace("_", "-")}</TableCell>
                          <TableCell>{formatCurrency(annual)}</TableCell>
                          <TableCell>{formatCurrency(c.setup_fee || 0)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ContractsByYearView;
