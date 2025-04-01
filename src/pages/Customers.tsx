
import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomerCard, CustomerData } from "@/components/customers/CustomerCard";
import { Button } from "@/components/ui/button";
import { Plus, Search, ArrowUpDown } from "lucide-react";
import { customers } from "@/data/mockData";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const Customers = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "none">("none");
  const [sortBy, setSortBy] = useState<"name" | "contractSize">("name");

  const handleSort = (field: "name" | "contractSize") => {
    if (sortBy === field) {
      // Cycle through: none -> asc -> desc -> none
      if (sortOrder === "none") setSortOrder("asc");
      else if (sortOrder === "asc") setSortOrder("desc");
      else setSortOrder("none");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSortedCustomers = () => {
    let result = [...customers];
    
    if (sortOrder !== "none") {
      result.sort((a, b) => {
        if (sortBy === "contractSize") {
          return sortOrder === "asc" 
            ? a.contractSize - b.contractSize 
            : b.contractSize - a.contractSize;
        } else {
          // Sort by name
          return sortOrder === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
      });
    }
    
    return result;
  };

  const filteredCustomers = getSortedCustomers().filter((customer) => {
    // Filter by status
    if (filter !== "all" && customer.status !== filter) {
      return false;
    }
    
    // Filter by search term
    if (
      searchTerm &&
      !customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Customers</h1>
          <Button onClick={() => navigate("/customers/new")}>
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search customers..."
              className="pl-8 pr-4 py-2 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not-started">Not Started</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={() => handleSort("contractSize")}
            className="flex items-center gap-2"
          >
            <span>Sort by Contract Size</span>
            <ArrowUpDown className="h-4 w-4" />
            {sortBy === "contractSize" && sortOrder !== "none" && (
              <span className="text-xs">
                ({sortOrder === "asc" ? "Low to High" : "High to Low"})
              </span>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleSort("name")}
            className="flex items-center gap-2"
          >
            <span>Sort by Name</span>
            <ArrowUpDown className="h-4 w-4" />
            {sortBy === "name" && sortOrder !== "none" && (
              <span className="text-xs">
                ({sortOrder === "asc" ? "A to Z" : "Z to A"})
              </span>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
          
          {filteredCustomers.length === 0 && (
            <div className="col-span-3 py-16 text-center">
              <p className="text-gray-500 dark:text-gray-400">No customers found. Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Customers;
