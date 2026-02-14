import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createNotification } from "@/utils/notificationHelpers";
import {
  Plus,
  CheckCircle2,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  Trash2,
  User,
  Bot,
  BarChart3,
  Puzzle,
  FileText,
} from "lucide-react";

interface ProposalRequest {
  id: string;
  customer_id: string | null;
  customer_name: string;
  ai_model: string;
  volume_details: string | null;
  custom_integration: string | null;
  additional_notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  completed_at: string | null;
  completed_by: string | null;
}

interface SimpleCustomer {
  id: string;
  name: string;
}

const AI_MODELS = ["Text", "Voice", "Avatar", "Hybrid (Text + Voice)", "Hybrid (Text + Avatar)", "Full Suite"];

export function ProposalRequests() {
  const [requests, setRequests] = useState<ProposalRequest[]>([]);
  const [customers, setCustomers] = useState<SimpleCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDone, setShowDone] = useState(false);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [volumeDetails, setVolumeDetails] = useState("");
  const [customIntegration, setCustomIntegration] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const pendingRequests = requests.filter(r => r.status === "pending");
  const doneRequests = requests.filter(r => r.status === "done");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [customersRes, requestsRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name")
          .order("name"),
        supabase
          .from("proposal_requests")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (customersRes.data) setCustomers(customersRes.data);
      if (requestsRes.data) setRequests(requestsRes.data as ProposalRequest[]);
      if (requestsRes.error) console.error("Error fetching requests:", requestsRes.error);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("proposal-requests-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "proposal_requests" },
        () => fetchData()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const resetForm = () => {
    setSelectedCustomerId("");
    setAiModel("");
    setVolumeDetails("");
    setCustomIntegration("");
    setAdditionalNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId || !aiModel) {
      toast.error("Please select a customer and AI model");
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("proposal_requests")
        .insert({
          customer_id: customer.id,
          customer_name: customer.name,
          ai_model: aiModel,
          volume_details: volumeDetails || null,
          custom_integration: customIntegration || null,
          additional_notes: additionalNotes || null,
          created_by: user?.id || null,
        });

      if (error) throw error;

      // Send notification to team
      await createNotification({
        type: "team",
        title: "New Proposal Request",
        message: `Proposal requested for ${customer.name} — ${aiModel}${volumeDetails ? ` (${volumeDetails})` : ""}`,
        related_type: "proposal_request",
      });

      toast.success("Proposal request submitted");
      resetForm();
      fetchData();
    } catch (err) {
      console.error("Error submitting request:", err);
      toast.error("Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkDone = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("proposal_requests")
        .update({
          status: "done",
          completed_at: now,
          completed_by: user?.id || null,
          updated_at: now,
        })
        .eq("id", id);

      if (error) throw error;

      // Find the request to include customer name in notification
      const req = requests.find(r => r.id === id);
      if (req) {
        await createNotification({
          type: "team",
          title: "Proposal Request Completed",
          message: `Proposal for ${req.customer_name} has been marked as done`,
          related_type: "proposal_request",
        });
      }

      toast.success("Marked as done");
      fetchData();
    } catch (err) {
      console.error("Error marking done:", err);
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("proposal_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Request deleted");
      fetchData();
    } catch (err) {
      console.error("Error deleting:", err);
      toast.error("Failed to delete");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatRelative = (dateStr: string) => {
    const now = Date.now();
    const d = new Date(dateStr).getTime();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  };

  const RequestCard = ({ req, showActions = true }: { req: ProposalRequest; showActions?: boolean }) => (
    <div className="p-4 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-sm">{req.customer_name}</h4>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              <Bot className="h-3 w-3 mr-1" />
              {req.ai_model}
            </Badge>
            {req.status === "pending" ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-green-300 text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Done
              </Badge>
            )}
          </div>

          {req.volume_details && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{req.volume_details}</span>
            </div>
          )}
          {req.custom_integration && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Puzzle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{req.custom_integration}</span>
            </div>
          )}
          {req.additional_notes && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{req.additional_notes}</span>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/70">
            Requested {formatRelative(req.created_at)}
            {req.completed_at && ` · Completed ${formatRelative(req.completed_at)}`}
          </p>
        </div>

        {showActions && req.status === "pending" && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20"
              onClick={() => handleMarkDone(req.id)}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Done
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(req.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Submit New Request Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            New Proposal Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Customer Name *
                </Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5" />
                  AI Model *
                </Label>
                <Select value={aiModel} onValueChange={setAiModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Volume Details
                </Label>
                <Input
                  value={volumeDetails}
                  onChange={e => setVolumeDetails(e.target.value)}
                  placeholder="e.g., 10k messages/month, 500 voice hours"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <Puzzle className="h-3.5 w-3.5" />
                  Custom Integration
                </Label>
                <Input
                  value={customIntegration}
                  onChange={e => setCustomIntegration(e.target.value)}
                  placeholder="e.g., Salesforce, HubSpot, custom API"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Additional Notes
              </Label>
              <Textarea
                value={additionalNotes}
                onChange={e => setAdditionalNotes(e.target.value)}
                placeholder="Any special requirements, timeline, or context..."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={isSubmitting || !selectedCustomerId || !aiModel} className="w-full sm:w-auto">
              {isSubmitting ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Request
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Pending
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingRequests.length}</Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No pending requests</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <RequestCard key={req.id} req={req} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Done Requests */}
      <Card>
        <CardHeader className="pb-3">
          <button
            onClick={() => setShowDone(!showDone)}
            className="flex items-center justify-between w-full text-left"
          >
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Completed
              {doneRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">{doneRequests.length}</Badge>
              )}
            </CardTitle>
            {showDone ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {showDone && (
          <CardContent>
            {doneRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No completed requests yet</p>
            ) : (
              <div className="space-y-3">
                {doneRequests.map(req => (
                  <RequestCard key={req.id} req={req} showActions={false} />
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
