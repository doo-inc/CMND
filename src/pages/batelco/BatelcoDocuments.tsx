import React, { useState, useEffect } from "react";
import { BatelcoLayout } from "@/components/batelco/BatelcoLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Download,
  CheckCircle2,
  Circle,
  Search,
  Building2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

interface CustomerDocument {
  id: string;
  customer_id: string;
  name: string;
  document_type: string;
  file_path: string;
  file_size?: number;
  created_at: string;
}

interface CustomerWithContract {
  id: string;
  name: string;
  logo?: string;
  segment?: string;
  contracts: { id: string; name: string; status: string; value: number }[];
  documents: CustomerDocument[];
}

const BatelcoDocuments = () => {
  const [customers, setCustomers] = useState<CustomerWithContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Step 1: Find all Batelco customers
      const { data: allCustomers, error: custErr } = await supabase
        .from("customers")
        .select("id, name, logo, segment, partner_label");

      if (custErr) throw custErr;

      const batelcoCustomers = (allCustomers || []).filter(
        (c: any) => c.partner_label && String(c.partner_label).toLowerCase() === "batelco"
      );

      if (batelcoCustomers.length === 0) {
        setCustomers([]);
        return;
      }

      const batelcoCustomerIds = batelcoCustomers.map((c: any) => c.id);
      const customerInfoMap: Record<string, any> = {};
      batelcoCustomers.forEach((c: any) => { customerInfoMap[c.id] = c; });

      // Step 2: Fetch active contracts for those customers
      const { data: contractsData, error: contractsErr } = await supabase
        .from("contracts")
        .select("id, name, status, value, customer_id")
        .in("customer_id", batelcoCustomerIds)
        .eq("status", "active");

      if (contractsErr) throw contractsErr;

      const customerIds = [...new Set((contractsData || []).map((c: any) => c.customer_id))] as string[];
      if (customerIds.length === 0) {
        setCustomers([]);
        return;
      }

      const { data: documentsData, error: documentsError } = await supabase
        .from("documents")
        .select("*")
        .in("customer_id", customerIds)
        .in("document_type", ["Proposal", "Service Agreement"]);

      if (documentsError) throw documentsError;

      const customerMap = new Map<string, CustomerWithContract>();

      (contractsData || []).forEach((contract: any) => {
        const customer = customerInfoMap[contract.customer_id];
        if (!customer) return;

        if (!customerMap.has(customer.id)) {
          customerMap.set(customer.id, {
            id: customer.id,
            name: customer.name,
            logo: customer.logo,
            segment: customer.segment,
            contracts: [],
            documents: [],
          });
        }

        customerMap.get(customer.id)!.contracts.push({
          id: contract.id,
          name: contract.name,
          status: contract.status || "active",
          value: contract.value,
        });
      });

      (documentsData || []).forEach((doc: any) => {
        const customer = customerMap.get(doc.customer_id);
        if (customer) customer.documents.push(doc as CustomerDocument);
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({ title: "Error", description: "Failed to load documents.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedCustomers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCustomers(next);
  };

  const getDocumentsByType = (docs: CustomerDocument[], type: string) => docs.filter((d) => d.document_type === type);
  const hasDocumentType = (docs: CustomerDocument[], type: string) => docs.some((d) => d.document_type === type);

  const downloadDocument = async (doc: CustomerDocument) => {
    try {
      const { data, error } = await supabase.storage.from("documents").download(doc.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const filteredCustomers = customers.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalCustomers = customers.length;
  const withProposals = customers.filter((c) => hasDocumentType(c.documents, "Proposal")).length;
  const withAgreements = customers.filter((c) => hasDocumentType(c.documents, "Service Agreement")).length;
  const complete = customers.filter((c) => hasDocumentType(c.documents, "Proposal") && hasDocumentType(c.documents, "Service Agreement")).length;
  const completionPct = totalCustomers > 0 ? Math.round((complete / totalCustomers) * 100) : 0;

  return (
    <BatelcoLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">Documents</h1>
          <p className="text-muted-foreground mt-1">View service agreements & proposals for Batelco contracts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active Contracts</p><p className="text-2xl font-bold">{totalCustomers}</p></div><div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-red-500" /></div></div></CardContent></Card>
          <Card className="border-0 shadow-lg"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">With Proposals</p><p className="text-2xl font-bold">{withProposals}</p></div><div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><FileText className="h-5 w-5 text-blue-500" /></div></div></CardContent></Card>
          <Card className="border-0 shadow-lg"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">With Agreements</p><p className="text-2xl font-bold">{withAgreements}</p></div><div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center"><FileCheck className="h-5 w-5 text-green-500" /></div></div></CardContent></Card>
          <Card className="border-0 shadow-lg"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Complete</p><p className="text-2xl font-bold">{complete}/{totalCustomers}</p></div><div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div></div><Progress value={completionPct} className="mt-2 h-1.5" /></CardContent></Card>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>
        ) : filteredCustomers.length === 0 ? (
          <Card className="border-0 shadow-lg"><CardContent className="flex flex-col items-center justify-center py-12"><AlertCircle className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-lg font-medium">No Batelco customers with active contracts</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => {
              const isExpanded = expandedCustomers.has(customer.id);
              const hasProposal = hasDocumentType(customer.documents, "Proposal");
              const hasAgreement = hasDocumentType(customer.documents, "Service Agreement");
              const isComplete = hasProposal && hasAgreement;
              const proposals = getDocumentsByType(customer.documents, "Proposal");
              const agreements = getDocumentsByType(customer.documents, "Service Agreement");

              return (
                <Card key={customer.id} className={`border-0 shadow-lg transition-all ${isComplete ? "bg-gradient-to-r from-emerald-500/5 to-card" : "bg-card"}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => toggleExpanded(customer.id)} className="h-8 w-8 p-0">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                        {customer.logo ? (
                          <img src={customer.logo} alt={customer.name} className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-red-500" /></div>
                        )}
                        <div>
                          <span className="font-semibold">{customer.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {customer.segment && <Badge variant="secondary" className="text-xs">{customer.segment}</Badge>}
                            <span className="text-xs text-muted-foreground">{customer.contracts.length} active contract{customer.contracts.length !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            {hasProposal ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                            <span className="text-sm">Proposal</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {hasAgreement ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                            <span className="text-sm">Agreement</span>
                          </div>
                        </div>
                        {isComplete && <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Complete</Badge>}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-4 border-t border-border/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Proposals */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-500" />
                              Proposals
                              {proposals.length > 0 && <Badge variant="secondary" className="text-xs">{proposals.length}</Badge>}
                            </h4>
                          </div>
                          {proposals.length === 0 ? (
                            <div className="text-sm text-muted-foreground italic p-3 bg-muted/30 rounded-lg">No proposals uploaded yet</div>
                          ) : (
                            <div className="space-y-2">
                              {proposals.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                                  <div className="flex items-center gap-2 min-w-0 flex-1"><FileText className="h-4 w-4 text-blue-500 shrink-0" /><span className="text-sm truncate">{doc.name}</span></div>
                                  <div className="flex items-center gap-1">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => downloadDocument(doc)}><Download className="h-3.5 w-3.5" /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Service Agreements */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium flex items-center gap-2">
                              <FileCheck className="h-4 w-4 text-green-500" />
                              Service Agreements
                              {agreements.length > 0 && <Badge variant="secondary" className="text-xs">{agreements.length}</Badge>}
                            </h4>
                          </div>
                          {agreements.length === 0 ? (
                            <div className="text-sm text-muted-foreground italic p-3 bg-muted/30 rounded-lg">No service agreements uploaded yet</div>
                          ) : (
                            <div className="space-y-2">
                              {agreements.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                                  <div className="flex items-center gap-2 min-w-0 flex-1"><FileCheck className="h-4 w-4 text-green-500 shrink-0" /><span className="text-sm truncate">{doc.name}</span></div>
                                  <div className="flex items-center gap-1">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => downloadDocument(doc)}><Download className="h-3.5 w-3.5" /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </BatelcoLayout>
  );
};

export default BatelcoDocuments;
