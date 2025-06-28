
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, HandHeart } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Partnership, PartnershipType, PartnershipStatus } from "@/types/partnerships";
import { useToast } from "@/hooks/use-toast";

const AddEditPartnership = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    partnership_type: "reseller" as PartnershipType,
    country: "",
    region: "",
    start_date: "",
    renewal_date: "",
    expiry_date: "",
    status: "in_discussion" as PartnershipStatus,
    expected_value: "",
    owner_id: "",
    description: "",
    notes: "",
    // Contact fields
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    contact_role: ""
  });

  const { data: partnership, isLoading } = useQuery({
    queryKey: ['partnership', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('partnerships')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Partnership;
    },
    enabled: isEditing
  });

  const { data: primaryContact } = useQuery({
    queryKey: ['partnership-primary-contact', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('partnership_contacts')
        .select('*')
        .eq('partnership_id', id)
        .eq('is_primary', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: isEditing
  });

  useEffect(() => {
    if (partnership) {
      setFormData({
        name: partnership.name || "",
        partnership_type: partnership.partnership_type || "reseller",
        country: partnership.country || "",
        region: partnership.region || "",
        start_date: partnership.start_date || "",
        renewal_date: partnership.renewal_date || "",
        expiry_date: partnership.expiry_date || "",
        status: partnership.status || "in_discussion",
        expected_value: partnership.expected_value?.toString() || "",
        owner_id: partnership.owner_id || "",
        description: partnership.description || "",
        notes: partnership.notes || "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        contact_role: ""
      });
    }
  }, [partnership]);

  useEffect(() => {
    if (primaryContact) {
      setFormData(prev => ({
        ...prev,
        contact_name: primaryContact.name || "",
        contact_email: primaryContact.email || "",
        contact_phone: primaryContact.phone || "",
        contact_role: primaryContact.role || ""
      }));
    }
  }, [primaryContact]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const partnershipData = {
        name: data.name,
        partnership_type: data.partnership_type,
        country: data.country || null,
        region: data.region || null,
        start_date: data.start_date || null,
        renewal_date: data.renewal_date || null,
        expiry_date: data.expiry_date || null,
        status: data.status,
        expected_value: data.expected_value ? parseInt(data.expected_value) : null,
        owner_id: data.owner_id || null,
        description: data.description || null,
        notes: data.notes || null
      };

      let partnershipId: string;

      if (isEditing && id) {
        const { error } = await supabase
          .from('partnerships')
          .update(partnershipData)
          .eq('id', id);
        
        if (error) throw error;
        partnershipId = id;
      } else {
        const { data: newPartnership, error } = await supabase
          .from('partnerships')
          .insert([partnershipData])
          .select()
          .single();
        
        if (error) throw error;
        partnershipId = newPartnership.id;
      }

      // Handle contact data
      if (data.contact_name) {
        const contactData = {
          partnership_id: partnershipId,
          name: data.contact_name,
          email: data.contact_email || null,
          phone: data.contact_phone || null,
          role: data.contact_role || null,
          is_primary: true
        };

        if (isEditing && primaryContact) {
          const { error } = await supabase
            .from('partnership_contacts')
            .update(contactData)
            .eq('id', primaryContact.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('partnership_contacts')
            .insert([contactData]);
          
          if (error) throw error;
        }
      }

      return partnershipId;
    },
    onSuccess: (partnershipId) => {
      toast({
        title: isEditing ? "Partnership updated" : "Partnership created",
        description: `Partnership has been ${isEditing ? "updated" : "created"} successfully.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      queryClient.invalidateQueries({ queryKey: ['partnership', partnershipId] });
      
      navigate(`/partnerships/${partnershipId}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} partnership. Please try again.`,
        variant: "destructive",
      });
      console.error("Partnership save error:", error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isEditing && isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to={isEditing ? `/partnerships/${id}` : "/partnerships"}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HandHeart className="h-6 w-6 text-doo-purple-600" />
            {isEditing ? "Edit Partnership" : "Add Partnership"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Partner Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="partnership_type">Partnership Type *</Label>
                  <Select
                    value={formData.partnership_type}
                    onValueChange={(value) => handleInputChange('partnership_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reseller">Reseller</SelectItem>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="platform_partner">Platform Partner</SelectItem>
                      <SelectItem value="education_partner">Education Partner</SelectItem>
                      <SelectItem value="mou_partner">MoU Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={formData.region}
                    onChange={(e) => handleInputChange('region', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_discussion">In Discussion</SelectItem>
                      <SelectItem value="signed">Signed</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expected_value">Expected Value ($)</Label>
                  <Input
                    id="expected_value"
                    type="number"
                    value={formData.expected_value}
                    onChange={(e) => handleInputChange('expected_value', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Important Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="renewal_date">Renewal Date</Label>
                  <Input
                    id="renewal_date"
                    type="date"
                    value={formData.renewal_date}
                    onChange={(e) => handleInputChange('renewal_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => handleInputChange('expiry_date', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Primary Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Primary Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => handleInputChange('contact_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contact_role">Contact Role</Label>
                  <Input
                    id="contact_role"
                    value={formData.contact_role}
                    onChange={(e) => handleInputChange('contact_role', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="owner_id">Account Owner</Label>
                <Input
                  id="owner_id"
                  value={formData.owner_id}
                  onChange={(e) => handleInputChange('owner_id', e.target.value)}
                  placeholder="Team member name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  placeholder="Describe this partnership..."
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Internal notes..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              className="bg-doo-purple-600 hover:bg-doo-purple-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending 
                ? (isEditing ? "Updating..." : "Creating...") 
                : (isEditing ? "Update Partnership" : "Create Partnership")
              }
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AddEditPartnership;
