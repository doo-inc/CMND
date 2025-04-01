
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { CustomerCard } from "@/components/customers/CustomerCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Calendar, FileText, Link } from "lucide-react";
import { dashboardStats, customers } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button onClick={() => navigate("/customers/new")}>
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboardStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Customers */}
          <Card className="col-span-2 bg-card dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">
                Recent Customers
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/customers")}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customers.slice(0, 4).map((customer) => (
                  <CustomerCard key={customer.id} customer={customer} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-card dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/customers")}>
                <Users className="mr-2 h-4 w-4" />
                Manage Customers
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/lifecycle")}>
                <Calendar className="mr-2 h-4 w-4" />
                Customer Lifecycle
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/contracts")}>
                <FileText className="mr-2 h-4 w-4" />
                Contracts & Documents
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/integrations")}>
                <Link className="mr-2 h-4 w-4" />
                Integration Center
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
