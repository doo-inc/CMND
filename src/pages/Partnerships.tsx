
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Users, HandHeart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Partnership, PartnershipType, PartnershipStatus, PARTNERSHIP_TYPE_LABELS, PARTNERSHIP_STATUS_LABELS } from "@/types/partnerships";
import { Link } from "react-router-dom";
import { TopPerformersChart } from "@/components/partnerships/TopPerformersChart";

const Partnerships = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");

  const { data: partnerships = [], isLoading, refetch } = useQuery({
    queryKey: ['partnerships'],
    queryFn: async () => {
      console.log('Fetching partnerships from database...');
      const { data, error } = await supabase
        .from('partnerships')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching partnerships:', error);
        throw error;
      }
      
      console.log('Partnerships fetched:', data);
      return data as Partnership[];
    }
  });

  // Set up real-time subscription for partnerships
  useEffect(() => {
    console.log('Setting up real-time subscription for partnerships...');
    
    const channel = supabase
      .channel('partnerships_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partnerships'
        },
        (payload) => {
          console.log('Real-time partnership change:', payload);
          // Refetch partnerships when any change occurs
          refetch();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription...');
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Reset filters when component mounts (e.g., when navigating back from form)
  useEffect(() => {
    console.log('Partnerships component mounted, current filters:', {
      searchTerm,
      typeFilter,
      statusFilter,
      sortBy
    });
  }, []);

  const filteredPartnerships = partnerships
    .filter(partnership => {
      const matchesSearch = partnership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           partnership.country?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || partnership.partnership_type === typeFilter;
      const matchesStatus = statusFilter === "all" || partnership.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "start_date":
          return new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime();
        case "expected_value":
          return (b.expected_value || 0) - (a.expected_value || 0);
        default:
          return 0;
      }
    });

  const getStatusBadgeColor = (status: PartnershipStatus) => {
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

  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
    setSortBy("name");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HandHeart className="h-6 w-6 text-doo-purple-600" />
              Partnerships
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your resellers, consultants, and strategic alliances
            </p>
          </div>
          <Link to="/partnerships/new">
            <Button className="bg-doo-purple-600 hover:bg-doo-purple-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Partnership
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search partnerships..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="reseller">Reseller</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                  <SelectItem value="platform_partner">Technology Partner</SelectItem>
                  <SelectItem value="education_partner">Education Partner</SelectItem>
                  <SelectItem value="mou_partner">MOU Partner</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="in_discussion">In Discussion</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Partner Name</SelectItem>
                  <SelectItem value="start_date">Start Date</SelectItem>
                  <SelectItem value="expected_value">Expected Value</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || typeFilter !== "all" || statusFilter !== "all" || sortBy !== "name") && (
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="w-full sm:w-auto"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers Section */}
        <TopPerformersChart />

        {/* Partnerships Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPartnerships.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <HandHeart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No partnerships found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "Get started by adding your first partnership."}
              </p>
              {!searchTerm && typeFilter === "all" && statusFilter === "all" && (
                <Link to="/partnerships/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Partnership
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
            {filteredPartnerships.map((partnership) => (
              <Link key={partnership.id} to={`/partnerships/${partnership.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {partnership.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span>{partnership.country || 'Global'}</span>
                        </div>
                      </div>
                      <Badge className={getStatusBadgeColor(partnership.status)}>
                        {PARTNERSHIP_STATUS_LABELS[partnership.status] || 'Unknown'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Type:</span>
                        <Badge variant="outline">
                          {PARTNERSHIP_TYPE_LABELS[partnership.partnership_type] || 'Unknown Type'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                        <span className="font-medium">
                          {partnership.start_date 
                            ? new Date(partnership.start_date).toLocaleDateString()
                            : 'Not set'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Partnerships;
