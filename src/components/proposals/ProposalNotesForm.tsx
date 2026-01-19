import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Trash2, Edit2, Save, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useProfile } from "@/hooks/useProfile";
import type { Tables } from "@/integrations/supabase/types";

type Proposal = Tables<"proposals">;

export function ProposalNotesForm() {
  const { profile } = useProfile();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [aiModel, setAiModel] = useState<string>("");
  const [channels, setChannels] = useState("");
  const [integrations, setIntegrations] = useState("");
  const [volume, setVolume] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching proposals:', error);
        // Check if it's a "relation does not exist" error
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          toast.error('Proposals table not found. Please run the database migration first.');
        } else {
          toast.error(`Failed to load proposals: ${error.message || 'Unknown error'}`);
        }
        throw error;
      }
      setProposals(data || []);
    } catch (error: any) {
      // Error already handled above if it's from Supabase
      if (!error?.message?.includes('relation')) {
        console.error('Unexpected error fetching proposals:', error);
      }
      setProposals([]); // Set empty array to prevent further errors
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCompanyName("");
    setAiModel("");
    setChannels("");
    setIntegrations("");
    setVolume("");
    setAdditionalNotes("");
    setEditingId(null);
  };

  const handleEdit = (proposal: Proposal) => {
    setCompanyName(proposal.company_name || proposal.customer_name || "");
    setAiModel(proposal.ai_model || "");
    setChannels(proposal.channels || "");
    setIntegrations(proposal.integrations || "");
    setVolume(proposal.volume || "");
    setAdditionalNotes(proposal.additional_notes || "");
    setEditingId(proposal.id);
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      toast.error('Company name is required');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const proposalData = {
        customer_name: companyName.trim(), // Use company name as customer_name
        company_name: companyName.trim(),
        ai_model: aiModel || null,
        channels: channels.trim() || null,
        integrations: integrations.trim() || null,
        volume: volume.trim() || null,
        additional_notes: additionalNotes.trim() || null,
        created_by: user?.id || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('proposals')
          .update(proposalData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Proposal updated successfully');
      } else {
        const { error } = await supabase
          .from('proposals')
          .insert([proposalData]);

        if (error) throw error;
        toast.success('Proposal saved successfully');
      }

      resetForm();
      fetchProposals();
    } catch (error) {
      console.error('Error saving proposal:', error);
      toast.error('Failed to save proposal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;

    try {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Proposal deleted');
      fetchProposals();
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Failed to delete proposal');
    }
  };


  return (
    <div className="space-y-6">
      {/* Form */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {editingId ? 'Edit Proposal Notes' : 'New Proposal Notes'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Company Name *</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name"
              className="mt-1"
            />
          </div>

          <div>
            <Label>AI Model</Label>
            <Select value={aiModel} onValueChange={setAiModel}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select AI Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Text">Text</SelectItem>
                <SelectItem value="Voice">Voice</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Channels</Label>
            <Textarea
              value={channels}
              onChange={(e) => setChannels(e.target.value)}
              placeholder="WhatsApp, web, social, call, etc."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Integrations</Label>
            <Textarea
              value={integrations}
              onChange={(e) => setIntegrations(e.target.value)}
              placeholder="CRM, booking, payments, APIs, etc."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Volume</Label>
            <Input
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="Expected monthly usage"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Additional Notes</Label>
            <Textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Goals, timeline, constraints"
              rows={4}
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingId ? 'Update' : 'Save'}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved Proposal Notes List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Saved Proposal Notes ({proposals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading proposals...
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No proposals saved yet. Fill out the form above to create your first proposal.
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {proposals.map(proposal => (
                  <div
                    key={proposal.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{proposal.company_name || proposal.customer_name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(proposal)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(proposal.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {proposal.ai_model && (
                        <Badge variant="secondary">{proposal.ai_model}</Badge>
                      )}
                      {proposal.channels && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Channels: </span>
                          <span className="text-muted-foreground">{proposal.channels}</span>
                        </div>
                      )}
                      {proposal.integrations && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Integrations: </span>
                          <span className="text-muted-foreground">{proposal.integrations}</span>
                        </div>
                      )}
                      {proposal.volume && (
                        <p className="text-muted-foreground">Volume: {proposal.volume}</p>
                      )}
                      {proposal.additional_notes && (
                        <p className="text-muted-foreground text-xs mt-2">{proposal.additional_notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Created: {format(new Date(proposal.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
