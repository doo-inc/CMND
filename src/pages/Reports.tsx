
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  FileText,
  Download,
  Calendar,
  Filter,
  LineChart,
  PieChart,
  ArrowDown,
  ArrowUp
} from "lucide-react";
import {
  // Remove Chart import as it doesn't exist in recharts
  Line,
  Bar,
  Pie
} from "recharts";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/StatCard";

// Sample data for charts
const lineChartData = [
  { name: "Jan", value: 400 },
  { name: "Feb", value: 300 },
  { name: "Mar", value: 600 },
  { name: "Apr", value: 800 },
  { name: "May", value: 500 },
  { name: "Jun", value: 900 },
  { name: "Jul", value: 700 }
];

const barChartData = [
  { name: "Onboarding", value: 75 },
  { name: "Integration", value: 45 },
  { name: "Go-Live", value: 25 },
  { name: "Co-Marketing", value: 15 }
];

const pieChartData = [
  { name: "Active", value: 60 },
  { name: "Onboarding", value: 25 },
  { name: "Pending", value: 15 }
];

const ReportsPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <div className="flex items-center space-x-4">
            <Select defaultValue="month">
              <SelectTrigger className="w-[160px] glass-input">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            <Button className="glass-button">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card animate-fade-in">
            <CardContent className="p-4 flex flex-col items-center">
              <div className="flex-1 flex items-center justify-center mb-4">
                <div className="w-full h-48">
                  <PieChart className="h-full w-full text-doo-purple-500 animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-semibold">Lifecycle Distribution</h3>
              <p className="text-sm text-muted-foreground mt-1">Customer Status</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardContent className="p-4 flex flex-col items-center">
              <div className="flex-1 flex items-center justify-center mb-4">
                <div className="w-full h-48">
                  <BarChart className="h-full w-full text-doo-purple-500 animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-semibold">Average Completion Time</h3>
              <p className="text-sm text-muted-foreground mt-1">By Lifecycle Stage</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <CardContent className="p-4 flex flex-col items-center">
              <div className="flex-1 flex items-center justify-center mb-4">
                <div className="w-full h-48">
                  <LineChart className="h-full w-full text-doo-purple-500 animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-semibold">Monthly MRR Growth</h3>
              <p className="text-sm text-muted-foreground mt-1">Contract Value Trend</p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card animate-slide-in">
          <CardHeader>
            <CardTitle className="text-xl">Key Performance Indicators</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatCard
                title="Avg. Time to Go-Live"
                value="28 days"
                description="12% faster"
                icon={<Calendar className="h-6 w-6" />}
              />
              
              <StatCard
                title="Onboarding Success"
                value="94%"
                description="3% increase"
                icon={<ArrowUp className="h-6 w-6" />}
              />
              
              <StatCard
                title="Churn Rate"
                value="1.2%"
                description="0.5% decrease"
                icon={<ArrowDown className="h-6 w-6" />}
              />
              
              <StatCard
                title="Avg. Contract Value"
                value="$24,800"
                description="5% increase"
                icon={<FileText className="h-6 w-6" />}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card animate-slide-in" style={{ animationDelay: "0.2s" }}>
          <CardHeader>
            <CardTitle className="text-xl">Detailed Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="customer">
              <TabsList className="glass-card">
                <TabsTrigger value="customer">Customer Lifecycle</TabsTrigger>
                <TabsTrigger value="contract">Contract Performance</TabsTrigger>
                <TabsTrigger value="agent">AI Agent Usage</TabsTrigger>
              </TabsList>
              
              <TabsContent value="customer" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Lifecycle Stage Analysis</h3>
                    <Button variant="outline" className="glass-input">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                  
                  <div className="glass-card border rounded-lg p-4">
                    <div className="text-center p-8">
                      <BarChart className="h-12 w-12 mx-auto text-doo-purple-500 mb-4" />
                      <p className="text-muted-foreground">
                        Detailed stage analysis visualization will appear here. This report shows the distribution of customers across different lifecycle stages and time spent in each stage.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="contract" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Contract Revenue Breakdown</h3>
                    <Button variant="outline" className="glass-input">
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                  
                  <div className="glass-card border rounded-lg p-4">
                    <div className="text-center p-8">
                      <LineChart className="h-12 w-12 mx-auto text-doo-purple-500 mb-4" />
                      <p className="text-muted-foreground">
                        Contract performance analytics visualization will appear here. This report shows revenue trends, contract renewals, and value distribution across customer segments.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="agent" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">AI Agent Performance</h3>
                    <Button variant="outline" className="glass-input">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter by Agent
                    </Button>
                  </div>
                  
                  <div className="glass-card border rounded-lg p-4">
                    <div className="text-center p-8">
                      <PieChart className="h-12 w-12 mx-auto text-doo-purple-500 mb-4" />
                      <p className="text-muted-foreground">
                        AI agent usage and performance metrics will appear here. This report shows interaction volume, success rates, and customer satisfaction across different AI agents.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
