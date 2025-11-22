import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Filter, MapPin, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DashboardFiltersProps {
  selectedCountries: string[];
  selectedSegments: string[];
  dateRange: { from: Date | undefined; to: Date | undefined };
  onCountryChange: (countries: string[]) => void;
  onSegmentChange: (segments: string[]) => void;
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  onClearFilters: () => void;
}

export function DashboardFilters({
  selectedCountries,
  selectedSegments,
  dateRange,
  onCountryChange,
  onSegmentChange,
  onDateRangeChange,
  onClearFilters,
}: DashboardFiltersProps) {
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [isCountryPopoverOpen, setIsCountryPopoverOpen] = useState(false);
  const [isSegmentPopoverOpen, setIsSegmentPopoverOpen] = useState(false);
  
  const availableSegments = ["Startup", "SME", "Large Enterprise"];

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('country')
        .not('country', 'is', null);

      if (error) throw error;

      const uniqueCountries = Array.from(
        new Set(data.map((c) => c.country).filter(Boolean))
      ).sort();
      
      setAvailableCountries(uniqueCountries as string[]);
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  const handleCountryToggle = (country: string) => {
    if (selectedCountries.includes(country)) {
      onCountryChange(selectedCountries.filter((c) => c !== country));
    } else {
      onCountryChange([...selectedCountries, country]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCountries.length === availableCountries.length) {
      onCountryChange([]);
    } else {
      onCountryChange(availableCountries);
    }
  };

  const handleSegmentToggle = (segment: string) => {
    if (selectedSegments.includes(segment)) {
      onSegmentChange(selectedSegments.filter((s) => s !== segment));
    } else {
      onSegmentChange([...selectedSegments, segment]);
    }
  };

  const handleSelectAllSegments = () => {
    if (selectedSegments.length === availableSegments.length) {
      onSegmentChange([]);
    } else {
      onSegmentChange(availableSegments);
    }
  };

  const hasActiveFilters =
    selectedCountries.length > 0 || selectedSegments.length > 0 || dateRange.from || dateRange.to;

  const getFilterSummary = () => {
    const parts: string[] = [];
    
    if (selectedCountries.length > 0) {
      if (selectedCountries.length === availableCountries.length) {
        parts.push("All Countries");
      } else if (selectedCountries.length === 1) {
        parts.push(selectedCountries[0]);
      } else {
        parts.push(`${selectedCountries.length} Countries`);
      }
    }
    
    if (selectedSegments.length > 0) {
      if (selectedSegments.length === availableSegments.length) {
        parts.push("All Segments");
      } else if (selectedSegments.length === 1) {
        parts.push(selectedSegments[0]);
      } else {
        parts.push(`${selectedSegments.length} Segments`);
      }
    }
    
    if (dateRange.from && dateRange.to) {
      parts.push(
        `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
      );
    } else if (dateRange.from) {
      parts.push(`From ${dateRange.from.toLocaleDateString()}`);
    } else if (dateRange.to) {
      parts.push(`Until ${dateRange.to.toLocaleDateString()}`);
    }
    
    return parts.length > 0 ? parts.join(" • ") : "No filters applied";
  };

  return (
    <Card className="border-2 border-dashed border-border/60 bg-muted/20">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Dashboard Filters</h3>
                <p className="text-sm text-muted-foreground">
                  {getFilterSummary()}
                </p>
              </div>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Country Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Countries
              </Label>
              <Popover open={isCountryPopoverOpen} onOpenChange={setIsCountryPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-11"
                  >
                    <span className="truncate">
                      {selectedCountries.length === 0
                        ? "All Countries"
                        : selectedCountries.length === availableCountries.length
                        ? "All Countries"
                        : selectedCountries.length === 1
                        ? selectedCountries[0]
                        : `${selectedCountries.length} selected`}
                    </span>
                    <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <span className="text-sm font-medium">Select Countries</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                        className="h-8 text-xs"
                      >
                        {selectedCountries.length === availableCountries.length
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {availableCountries.map((country) => (
                        <div
                          key={country}
                          className="flex items-center space-x-3 py-2 px-2 hover:bg-accent rounded-md cursor-pointer"
                          onClick={() => handleCountryToggle(country)}
                        >
                          <Checkbox
                            checked={selectedCountries.includes(country)}
                            onCheckedChange={() => handleCountryToggle(country)}
                          />
                          <label className="text-sm cursor-pointer flex-1">
                            {country}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Segment Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Segments
              </Label>
              <Popover open={isSegmentPopoverOpen} onOpenChange={setIsSegmentPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-11"
                  >
                    <span className="truncate">
                      {selectedSegments.length === 0
                        ? "All Segments"
                        : selectedSegments.length === availableSegments.length
                        ? "All Segments"
                        : selectedSegments.length === 1
                        ? selectedSegments[0]
                        : `${selectedSegments.length} selected`}
                    </span>
                    <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <span className="text-sm font-medium">Select Segments</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAllSegments}
                        className="h-8 text-xs"
                      >
                        {selectedSegments.length === availableSegments.length
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {availableSegments.map((segment) => (
                        <div
                          key={segment}
                          className="flex items-center space-x-3 py-2 px-2 hover:bg-accent rounded-md cursor-pointer"
                          onClick={() => handleSegmentToggle(segment)}
                        >
                          <Checkbox
                            checked={selectedSegments.includes(segment)}
                            onCheckedChange={() => handleSegmentToggle(segment)}
                          />
                          <label className="text-sm cursor-pointer flex-1">
                            {segment}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <DatePicker
                  date={dateRange.from}
                  onDateChange={(date) =>
                    onDateRangeChange({ ...dateRange, from: date })
                  }
                  placeholder="Start date"
                  disabled={(date) =>
                    dateRange.to ? date > dateRange.to : false
                  }
                  className="h-11"
                />
                <DatePicker
                  date={dateRange.to}
                  onDateChange={(date) =>
                    onDateRangeChange({ ...dateRange, to: date })
                  }
                  placeholder="End date"
                  disabled={(date) =>
                    dateRange.from ? date < dateRange.from : false
                  }
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
              {selectedCountries.length > 0 &&
                selectedCountries.length < availableCountries.length &&
                selectedCountries.map((country) => (
                  <Badge
                    key={country}
                    variant="secondary"
                    className="gap-1 pl-3 pr-1.5 py-1"
                  >
                    <MapPin className="h-3 w-3" />
                    {country}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() =>
                        onCountryChange(
                          selectedCountries.filter((c) => c !== country)
                        )
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              {selectedSegments.length > 0 &&
                selectedSegments.length < availableSegments.length &&
                selectedSegments.map((segment) => (
                  <Badge
                    key={segment}
                    variant="secondary"
                    className="gap-1 pl-3 pr-1.5 py-1"
                  >
                    <Filter className="h-3 w-3" />
                    {segment}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() =>
                        onSegmentChange(
                          selectedSegments.filter((s) => s !== segment)
                        )
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              {dateRange.from && (
                <Badge variant="secondary" className="gap-1 pl-3 pr-1.5 py-1">
                  <Calendar className="h-3 w-3" />
                  From {dateRange.from.toLocaleDateString()}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() =>
                      onDateRangeChange({ ...dateRange, from: undefined })
                    }
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {dateRange.to && (
                <Badge variant="secondary" className="gap-1 pl-3 pr-1.5 py-1">
                  <Calendar className="h-3 w-3" />
                  Until {dateRange.to.toLocaleDateString()}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() =>
                      onDateRangeChange({ ...dateRange, to: undefined })
                    }
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
