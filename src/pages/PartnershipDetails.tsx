
import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Trash2, HandHeart, FileText, Users, Clock, MapPin, Calendar, DollarSign, Link2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Partnership, PartnershipContact, PartnershipDocument, PartnershipTimeline, PARTNERSHIP_TYPE_LABELS, PARTNERSHIP_STATUS_LABELS } from "@/types/partnerships";
import { PartnershipRevenueMetrics } from "@/components/partnerships/PartnershipRevenueMetrics";
import { LinkedContractsTable } from "@/components/partnerships/LinkedContractsTable";
import { PartnershipRevenueChart } from "@/components/partnerships/PartnershipRevenueChart";
import { LinkContractDialog } from "@/components/partnerships/LinkContractDialog";
import { getLinkedContracts, getAvailableContracts, calculatePartnershipRevenue } from "@/utils/partnershipRevenue";

const PartnershipDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  const { data: partnership, isLoading } = useQuery({
    queryKey: ['partnership', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partnerships')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Partnership;
    }
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['partnership-contacts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partnership_contacts')
        .select('*')
        .eq('partnership_id', id)
        .order('is_primary', { ascending: false });
      
      if (error) throw error;
      return data as PartnershipContact[];
    }
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['partnership-documents', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partnership_documents')
        .select('*')
        .eq('partnership_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PartnershipDocument[];
    }
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['partnership-timeline', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partnership_timeline')
        .select('*')
        .eq('partnership_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PartnershipTimeline[];
    }
  });

  const { data: linkedContracts = [], refetch: refetchLinkedContracts } = useQuery({
    queryKey: ['partnership-linked-contracts', id],
    queryFn: async () => {
      if (!id) return [];
      return await getLinkedContracts(id);
    },
    enabled: !!id
  });

  const { data: availableContracts = [], refetch: refetchAvailableContracts } = useQuery({
    queryKey: ['partnership-available-contracts', id],
    queryFn: async () => {
      if (!id) return [];
      return await getAvailableContracts(id);
    },
    enabled: !!id
  });

  const revenueSummary = calculatePartnershipRevenue(linkedContracts);

  const handleContractLinked = () => {
    refetchLinkedContracts();
    refetchAvailableContracts();
    // Invalidate top performers query to refresh main partnerships page
    queryClient.invalidateQueries({ queryKey: ['top-partnerships-by-revenue'] });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!partnership) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <HandHeart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Partnership not found
          </h3>
          <Link to="/partnerships">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Partnerships
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'signed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'in_discussion':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/partnerships">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <HandHeart className="h-6 w-6 text-doo-purple-600" />
                {partnership.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusBadgeColor(partnership.status)}>
                  {PARTNERSHIP_STATUS_LABELS[partnership.status]}
                </Badge>
                <Badge variant="outline">
                  {PARTNERSHIP_TYPE_LABELS[partnership.partnership_type]}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={`/partnerships/${partnership.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {partnership.country && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Country</p>
                    <p className="font-medium">{partnership.country}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {partnership.start_date && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Start Date</p>
                    <p className="font-medium">{new Date(partnership.start_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {partnership.expected_value && partnership.expected_value > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Expected Value</p>
                    <p className="font-medium text-green-600">${partnership.expected_value.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Contacts</p>
                  <p className="font-medium">{contacts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline ({timeline.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {partnership.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {partnership.description}
                  </p>
                </CardContent>
              </Card>
            )}
            
            {partnership.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {partnership.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <PartnershipRevenueMetrics
              totalRevenue={revenueSummary.totalRevenue}
              contractCount={revenueSummary.contractCount}
              customerCount={revenueSummary.customerCount}
              averageDealSize={revenueSummary.averageDealSize}
            />

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Linked Contracts
                  </CardTitle>
                  <Button onClick={() => setIsLinkDialogOpen(true)} size="sm">
                    <Link2 className="h-4 w-4 mr-2" />
                    Link Contract
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <LinkedContractsTable
                  contracts={linkedContracts}
                  onContractUnlinked={handleContractLinked}
                />
              </CardContent>
            </Card>

            <PartnershipRevenueChart contracts={linkedContracts} />

            <LinkContractDialog
              open={isLinkDialogOpen}
              onOpenChange={setIsLinkDialogOpen}
              partnershipId={id!}
              partnershipName={partnership.name}
              availableContracts={availableContracts}
              onContractLinked={handleContractLinked}
            />
          </TabsContent>

          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Partnership Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No contacts added yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              {contact.name}
                              {contact.is_primary && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )}
                            </h4>
                            {contact.role && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">{contact.role}</p>
                            )}
                            <div className="mt-2 space-y-1">
                              {contact.email && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Email: {contact.email}
                                </p>
                              )}
                              {contact.phone && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Phone: {contact.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No documents uploaded yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {documents.map((document) => (
                      <div key={document.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{document.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Type: {document.document_type}
                            </p>
                            {document.file_size && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Size: {(document.file_size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Uploaded: {new Date(document.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No activity recorded yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {timeline.map((event) => (
                      <div key={event.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{event.event_type}</h4>
                            <p className="text-gray-700 dark:text-gray-300 mt-1">
                              {event.event_description}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              {new Date(event.created_at).toLocaleString()}
                              {event.created_by_name && ` • ${event.created_by_name}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PartnershipDetails;
