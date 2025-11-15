import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { AlertTriangle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CustomerAtRisk {
  id: string;
  name: string;
  renewal_date: string;
  contract_value: number;
  days_until_renewal: number;
}

export const CustomersAtRiskDetail = () => {
  const [customers, setCustomers] = useState<CustomerAtRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomersAtRisk();
  }, []);

  const fetchCustomersAtRisk = async () => {
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          renewal_date,
          annual_rate,
          setup_fee,
          customers!inner(id, name, status)
        `)
        .gte('renewal_date', today.toISOString())
        .lte('renewal_date', thirtyDaysFromNow.toISOString())
        .in('customers.status', ['done', 'active']);

      if (error) throw error;

      const customersMap = new Map<string, CustomerAtRisk>();
      
      data?.forEach(contract => {
        const customer = contract.customers;
        const renewalDate = new Date(contract.renewal_date);
        const daysUntil = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const contractValue = (contract.annual_rate || 0) + (contract.setup_fee || 0);

        if (!customersMap.has(customer.id)) {
          customersMap.set(customer.id, {
            id: customer.id,
            name: customer.name,
            renewal_date: contract.renewal_date,
            contract_value: contractValue,
            days_until_renewal: daysUntil,
          });
        } else {
          const existing = customersMap.get(customer.id)!;
          existing.contract_value += contractValue;
          // Keep the earliest renewal date
          if (new Date(contract.renewal_date) < new Date(existing.renewal_date)) {
            existing.renewal_date = contract.renewal_date;
            existing.days_until_renewal = daysUntil;
          }
        }
      });

      const customersList = Array.from(customersMap.values()).sort(
        (a, b) => a.days_until_renewal - b.days_until_renewal
      );

      setCustomers(customersList);
    } catch (error) {
      console.error("Error fetching customers at risk:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (customers.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No customers at risk in the next 30 days</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Customers At Risk Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">{customers.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Contract Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(customers.reduce((sum, c) => sum + c.contract_value, 0))}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Renewals Next 7 Days</p>
              <p className="text-2xl font-bold text-orange-500">
                {customers.filter(c => c.days_until_renewal <= 7).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {customers.map(customer => (
          <Card 
            key={customer.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/customers/${customer.id}`)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{customer.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Renewal: {new Date(customer.renewal_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={
                        customer.days_until_renewal <= 7 
                          ? "text-orange-500 font-medium" 
                          : "text-muted-foreground"
                      }>
                        {customer.days_until_renewal} days until renewal
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Contract Value</p>
                  <p className="text-lg font-bold">{formatCurrency(customer.contract_value)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
