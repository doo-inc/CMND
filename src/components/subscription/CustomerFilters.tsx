
import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

interface CustomerFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  segmentFilter: string;
  setSegmentFilter: (value: string) => void;
  countryFilter: string;
  setCountryFilter: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  uniqueSegments: string[];
  uniqueCountries: string[];
  viewMode: "timeline" | "renewals";
}

export const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  segmentFilter,
  setSegmentFilter,
  countryFilter,
  setCountryFilter,
  sortBy,
  setSortBy,
  uniqueSegments,
  uniqueCountries,
  viewMode
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Segments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Segments</SelectItem>
              {uniqueSegments.map(segment => (
                <SelectItem key={segment} value={segment}>{segment}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {uniqueCountries.map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="renewal_date">Renewal Date</SelectItem>
              <SelectItem value="customer_name">Customer Name</SelectItem>
              {viewMode === "timeline" && (
                <SelectItem value="annual_rate">Annual Rate</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
