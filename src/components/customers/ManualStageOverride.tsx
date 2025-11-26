import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ManualStageOverrideProps {
  customerId: string;
  currentStage: string;
  manualStage?: string | null;
  manualStageNote?: string | null;
  onUpdate: () => void;
}

const PIPELINE_STAGES = [
  "Lead",
  "Qualified",
  "Demo",
  "Proposal",
  "Contract",
  "Implementation",
  "Live",
];

export const ManualStageOverride = ({
  customerId,
  currentStage,
  manualStage,
  manualStageNote,
  onUpdate,
}: ManualStageOverrideProps) => {
  const [open, setOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>(manualStage || currentStage);
  const [note, setNote] = useState<string>(manualStageNote || "");
  const [loading, setLoading] = useState(false);

  const handleSetOverride = async () => {
    if (!selectedStage) {
      toast.error("Please select a stage");
      return;
    }

    if (!note.trim()) {
      toast.error("Please provide a reason for the override");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update both manual_stage and stage fields
      const { error } = await supabase
        .from("customers")
        .update({
          manual_stage: selectedStage,
          manual_stage_note: note.trim(),
          manual_stage_set_at: new Date().toISOString(),
          manual_stage_set_by: user?.id,
          stage: selectedStage, // Also update the actual stage field
        })
        .eq("id", customerId);

      if (error) throw error;

      toast.success("Manual stage override set successfully");
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error setting manual override:", error);
      toast.error("Failed to set manual override");
    } finally {
      setLoading(false);
    }
  };

  const handleClearOverride = async () => {
    setLoading(true);
    try {
      // Clear manual override fields - stage will be recalculated by trigger
      const { error } = await supabase
        .from("customers")
        .update({
          manual_stage: null,
          manual_stage_note: null,
          manual_stage_set_at: null,
          manual_stage_set_by: null,
        })
        .eq("id", customerId);

      if (error) throw error;

      // Trigger the pipeline recalculation by updating a lifecycle stage
      const { error: triggerError } = await supabase
        .from("lifecycle_stages")
        .update({ updated_at: new Date().toISOString() })
        .eq("customer_id", customerId)
        .limit(1);

      if (triggerError) console.error("Failed to trigger update:", triggerError);

      toast.success("Manual override cleared - stage recalculated");
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error clearing manual override:", error);
      toast.error("Failed to clear override");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          {manualStage ? "Edit Override" : "Override Stage"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manual Pipeline Stage Override</DialogTitle>
          <DialogDescription>
            Manually set the pipeline stage. This will be automatically cleared when the customer progresses beyond this stage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {manualStage && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Current Override: {manualStage}</p>
                  {manualStageNote && (
                    <p className="text-sm text-muted-foreground">{manualStageNote}</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="stage">Pipeline Stage</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger id="stage">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                    {stage === currentStage && (
                      <Badge variant="secondary" className="ml-2">Current</Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Reason for Override *</Label>
            <Textarea
              id="note"
              placeholder="Explain why this manual override is needed..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              This note helps team members understand why the stage was manually adjusted.
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {manualStage && (
            <Button
              variant="outline"
              onClick={handleClearOverride}
              disabled={loading}
            >
              Clear Override
            </Button>
          )}
          <Button onClick={handleSetOverride} disabled={loading}>
            {loading ? "Saving..." : "Set Override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
