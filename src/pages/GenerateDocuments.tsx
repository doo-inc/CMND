import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DocumentGenerationDialog } from "@/components/documents/DocumentGenerationDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GenerateDocuments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers-search', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('name');

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,contact_email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(10);
      if (error) throw error;
      return data;
    },
  });

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Documents</h1>
          <p className="text-muted-foreground">
            Search for a customer and generate their documents
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Customer</CardTitle>
            <CardDescription>
              Find a customer by name or email to generate documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {isLoading && (
              <p className="text-sm text-muted-foreground mt-4">Searching...</p>
            )}

            {customers && customers.length > 0 && (
              <div className="mt-6 space-y-2">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {customer.logo && (
                        <img
                          src={customer.logo}
                          alt={customer.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.contact_email || 'No email'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleCustomerSelect(customer)}
                      size="sm"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Documents
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {customers && customers.length === 0 && searchQuery && (
              <p className="text-sm text-muted-foreground mt-4">
                No customers found matching "{searchQuery}"
              </p>
            )}
          </CardContent>
        </Card>

        {selectedCustomer && (
          <DocumentGenerationDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            customerId={selectedCustomer.id}
            customerName={selectedCustomer.name}
            onSuccess={() => {
              setDialogOpen(false);
              setSelectedCustomer(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}