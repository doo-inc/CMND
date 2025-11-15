import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Download, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateWeeklyReport, generateMonthlyReport } from "@/utils/reportGeneration";
import { toast } from "sonner";

interface ReportPreview {
  lifecycleChanges: number;
  newCustomers: number;
  newLeads: number;
  churns: number;
}

export const UpdatesPanel = () => {
  const [weeklyPreview, setWeeklyPreview] = useState<ReportPreview | null>(null);
  const [monthlyPreview, setMonthlyPreview] = useState<ReportPreview | null>(null);
  const [weeklyGenerating, setWeeklyGenerating] = useState(false);
  const [monthlyGenerating, setMonthlyGenerating] = useState(false);
  const [weeklyTimestamp, setWeeklyTimestamp] = useState<Date | null>(null);
  const [monthlyTimestamp, setMonthlyTimestamp] = useState<Date | null>(null);

  const fetchWeeklyPreview = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [lifecycleData, customersData, leadsData, churnsData] = await Promise.all([
        supabase
          .from('lifecycle_stages')
          .select('customer_id, name, status_changed_at')
          .gte('status_changed_at', sevenDaysAgo.toISOString()),
        supabase
          .from('customers')
          .select('id')
          .gte('created_at', sevenDaysAgo.toISOString())
          .neq('status', 'churned'),
        supabase
          .from('customers')
          .select('id')
          .eq('status', 'lead')
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase
          .from('customers')
          .select('id')
          .eq('status', 'churned')
          .gte('churn_date', sevenDaysAgo.toISOString()),
      ]);

      // Get unique customers with lifecycle changes (latest stage only)
      const customerStages = new Map();
      lifecycleData.data?.forEach(stage => {
        const existing = customerStages.get(stage.customer_id);
        if (!existing || new Date(stage.status_changed_at) > new Date(existing.status_changed_at)) {
          customerStages.set(stage.customer_id, stage);
        }
      });

      setWeeklyPreview({
        lifecycleChanges: customerStages.size,
        newCustomers: customersData.data?.length || 0,
        newLeads: leadsData.data?.length || 0,
        churns: churnsData.data?.length || 0,
      });
      setWeeklyTimestamp(new Date());
    } catch (error) {
      console.error("Error fetching weekly preview:", error);
    }
  };

  const fetchMonthlyPreview = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [lifecycleData, customersData, leadsData, churnsData] = await Promise.all([
        supabase
          .from('lifecycle_stages')
          .select('customer_id, name, status_changed_at')
          .gte('status_changed_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('customers')
          .select('id')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .neq('status', 'churned'),
        supabase
          .from('customers')
          .select('id')
          .eq('status', 'lead')
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('customers')
          .select('id')
          .eq('status', 'churned')
          .gte('churn_date', thirtyDaysAgo.toISOString()),
      ]);

      // Get unique customers with lifecycle changes (latest stage only)
      const customerStages = new Map();
      lifecycleData.data?.forEach(stage => {
        const existing = customerStages.get(stage.customer_id);
        if (!existing || new Date(stage.status_changed_at) > new Date(existing.status_changed_at)) {
          customerStages.set(stage.customer_id, stage);
        }
      });

      setMonthlyPreview({
        lifecycleChanges: customerStages.size,
        newCustomers: customersData.data?.length || 0,
        newLeads: leadsData.data?.length || 0,
        churns: churnsData.data?.length || 0,
      });
      setMonthlyTimestamp(new Date());
    } catch (error) {
      console.error("Error fetching monthly preview:", error);
    }
  };

  const handleGenerateWeekly = async () => {
    setWeeklyGenerating(true);
    try {
      await generateWeeklyReport();
      await fetchWeeklyPreview();
      toast.success("Weekly report generated and downloaded");
    } catch (error) {
      console.error("Error generating weekly report:", error);
      toast.error("Failed to generate weekly report");
    } finally {
      setWeeklyGenerating(false);
    }
  };

  const handleGenerateMonthly = async () => {
    setMonthlyGenerating(true);
    try {
      await generateMonthlyReport();
      await fetchMonthlyPreview();
      toast.success("Monthly report generated and downloaded");
    } catch (error) {
      console.error("Error generating monthly report:", error);
      toast.error("Failed to generate monthly report");
    } finally {
      setMonthlyGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Weekly Update Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Weekly Update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {weeklyTimestamp && (
            <p className="text-xs text-muted-foreground">
              Last generated: {weeklyTimestamp.toLocaleTimeString()}
            </p>
          )}
          
          {weeklyPreview && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lifecycle changes:</span>
                <span className="font-medium">{weeklyPreview.lifecycleChanges}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New customers:</span>
                <span className="font-medium">{weeklyPreview.newCustomers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New leads:</span>
                <span className="font-medium">{weeklyPreview.newLeads}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Churns:</span>
                <span className="font-medium">{weeklyPreview.churns}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateWeekly} 
              disabled={weeklyGenerating}
              className="flex-1"
              size="sm"
            >
              {weeklyGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Update Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Monthly Update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {monthlyTimestamp && (
            <p className="text-xs text-muted-foreground">
              Last generated: {monthlyTimestamp.toLocaleTimeString()}
            </p>
          )}
          
          {monthlyPreview && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lifecycle changes:</span>
                <span className="font-medium">{monthlyPreview.lifecycleChanges}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New customers:</span>
                <span className="font-medium">{monthlyPreview.newCustomers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New leads:</span>
                <span className="font-medium">{monthlyPreview.newLeads}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Churns:</span>
                <span className="font-medium">{monthlyPreview.churns}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateMonthly} 
              disabled={monthlyGenerating}
              className="flex-1"
              size="sm"
            >
              {monthlyGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
