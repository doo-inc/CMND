
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, User, Trash, Link } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CustomerReferralsProps {
  customerId: string | null;
}

export interface Referral {
  id: string;
  customer_id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  status: "new" | "contacted" | "converted" | "lost";
  notes?: string;
  created_at: string;
}

export function CustomerReferrals({ customerId }: CustomerReferralsProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const { data: referrals = [], refetch: refetchReferrals } = useQuery({
    queryKey: ["customer-referrals", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      // Using 'any' type assertion to work around the missing referrals table in types
      const { data, error } = await supabase
        .from('referrals' as any)
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching referrals:", error);
        return [];
      }
      
      return (data || []) as Referral[];
    },
    enabled: !!customerId
  });

  const handleAddReferral = async () => {
    if (!customerId) {
      toast.error("Customer ID is required");
      return;
    }

    if (!name || !email || !company) {
      toast.error("Name, email, and company are required");
      return;
    }

    try {
      const { error } = await supabase
        .from('referrals' as any)
        .insert({
          customer_id: customerId,
          name,
          company,
          email,
          phone: phone || null,
          notes: notes || null,
          status: "new"
        });

      if (error) {
        console.error("Error adding referral:", error);
        toast.error("Failed to add referral");
        return;
      }

      toast.success("Referral added successfully");
      resetForm();
      setOpen(false);
      refetchReferrals();
    } catch (err) {
      console.error("Error in add referral:", err);
      toast.error("An unexpected error occurred");
    }
  };

  const handleUpdateStatus = async (referralId: string, status: Referral["status"]) => {
    try {
      const { error } = await supabase
        .from('referrals' as any)
        .update({ status })
        .eq("id", referralId);

      if (error) {
        console.error("Error updating referral status:", error);
        toast.error("Failed to update status");
        return;
      }

      toast.success("Status updated");
      refetchReferrals();
    } catch (err) {
      console.error("Error in update status:", err);
      toast.error("An unexpected error occurred");
    }
  };

  const handleDeleteReferral = async (referralId: string) => {
    try {
      const { error } = await supabase
        .from('referrals' as any)
        .delete()
        .eq("id", referralId);

      if (error) {
        console.error("Error deleting referral:", error);
        toast.error("Failed to delete referral");
        return;
      }

      toast.success("Referral deleted");
      refetchReferrals();
    } catch (err) {
      console.error("Error in delete referral:", err);
      toast.error("An unexpected error occurred");
    }
  };

  const resetForm = () => {
    setName("");
    setCompany("");
    setEmail("");
    setPhone("");
    setNotes("");
  };

  const getStatusBadgeStyle = (status: Referral["status"]) => {
    switch (status) {
      case "new":
        return "bg-blue-500 hover:bg-blue-600";
      case "contacted":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "converted":
        return "bg-green-500 hover:bg-green-600";
      case "lost":
        return "bg-gray-500 hover:bg-gray-600";
      default:
        return "";
    }
  };

  return (
    <Card className="w-full glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Link className="mr-2 h-5 w-5" />
          Referrals
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Referral
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Referral</DialogTitle>
              <DialogDescription>
                Add information about a new business referral from this customer.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Contact Name*</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="company">Company*</Label>
                  <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email*</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleAddReferral}>Add Referral</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {referrals.length > 0 ? (
          <div className="divide-y">
            {referrals.map((referral) => (
              <div key={referral.id} className="py-3">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <h3 className="font-medium">{referral.name}</h3>
                  </div>
                  <Badge className={getStatusBadgeStyle(referral.status)}>
                    {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mt-1">
                  <div>
                    <span className="text-muted-foreground">Company:</span>{" "}
                    {referral.company}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {referral.email}
                  </div>
                  {referral.phone && (
                    <div>
                      <span className="text-muted-foreground">Phone:</span>{" "}
                      {referral.phone}
                    </div>
                  )}
                  {referral.notes && (
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground">Notes:</span>{" "}
                      {referral.notes}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex justify-end space-x-2">
                  <select 
                    className="text-xs px-2 py-1 rounded border bg-background"
                    value={referral.status}
                    onChange={(e) => handleUpdateStatus(referral.id, e.target.value as Referral["status"])}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteReferral(referral.id)}
                  >
                    <Trash className="h-3.5 w-3.5 mr-1 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No referrals recorded for this customer yet.</p>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add First Referral
              </Button>
            </DialogTrigger>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
