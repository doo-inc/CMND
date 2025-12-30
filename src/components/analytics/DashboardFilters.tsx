import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Filter, MapPin, Calendar, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

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
  const [isOpen, setIsOpen] = useState(false);
  
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

  const handleSegmentToggle = (segment: string) => {
    if (selectedSegments.includes(segment)) {
      onSegmentChange(selectedSegments.filter((s) => s !== segment));
    } else {
      onSegmentChange([...selectedSegments, segment]);
    }
  };

  const hasActiveFilters =
    selectedCountries.length > 0 || selectedSegments.length > 0 || dateRange.from || dateRange.to;

  const activeFilterCount = 
    (selectedCountries.length > 0 ? 1 : 0) + 
    (selectedSegments.length > 0 ? 1 : 0) + 
    (dateRange.from || dateRange.to ? 1 : 0);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="min-w-[120px] h-11 font-medium relative"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge 
              variant="default" 
              className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="font-semibold">Filters</span>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 h-3 w-3" />
                Clear All
              </Button>
            )}
          </div>

          <Separator />

          {/* Countries */}
          <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
                Countries
              </Label>
            <div className="max-h-[140px] overflow-y-auto space-y-1 pr-2">
                      {availableCountries.map((country) => (
                        <div
                          key={country}
                  className="flex items-center space-x-2 py-1.5 px-2 hover:bg-accent rounded cursor-pointer"
                          onClick={() => handleCountryToggle(country)}
                        >
                          <Checkbox
                            checked={selectedCountries.includes(country)}
                            onCheckedChange={() => handleCountryToggle(country)}
                    className="h-4 w-4"
                          />
                          <label className="text-sm cursor-pointer flex-1">
                            {country}
                          </label>
                        </div>
                      ))}
              {availableCountries.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No countries found</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Segments */}
          <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" />
                Segments
              </Label>
            <div className="space-y-1">
                      {availableSegments.map((segment) => (
                        <div
                          key={segment}
                  className="flex items-center space-x-2 py-1.5 px-2 hover:bg-accent rounded cursor-pointer"
                          onClick={() => handleSegmentToggle(segment)}
                        >
                          <Checkbox
                            checked={selectedSegments.includes(segment)}
                            onCheckedChange={() => handleSegmentToggle(segment)}
                    className="h-4 w-4"
                          />
                          <label className="text-sm cursor-pointer flex-1">
                            {segment}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

          <Separator />

          {/* Date Range */}
          <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
                Date Range
              </Label>
            <div className="grid grid-cols-2 gap-2">
                <DatePicker
                  date={dateRange.from}
                  onDateChange={(date) =>
                    onDateRangeChange({ ...dateRange, from: date })
                  }
                placeholder="Start"
                  disabled={(date) =>
                    dateRange.to ? date > dateRange.to : false
                  }
                className="h-9"
                />
                <DatePicker
                  date={dateRange.to}
                  onDateChange={(date) =>
                    onDateRangeChange({ ...dateRange, to: date })
                  }
                placeholder="End"
                  disabled={(date) =>
                    dateRange.from ? date < dateRange.from : false
                  }
                className="h-9"
                />
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-1.5">
                {selectedCountries.map((country) => (
                  <Badge
                    key={country}
                    variant="secondary"
                    className="gap-1 pl-2 pr-1 py-0.5 text-xs"
                  >
                    {country}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() =>
                        onCountryChange(selectedCountries.filter((c) => c !== country))
                      }
                    />
                  </Badge>
                ))}
                {selectedSegments.map((segment) => (
                  <Badge
                    key={segment}
                    variant="secondary"
                    className="gap-1 pl-2 pr-1 py-0.5 text-xs"
                  >
                    {segment}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() =>
                        onSegmentChange(selectedSegments.filter((s) => s !== segment))
                      }
                    />
                  </Badge>
                ))}
              {dateRange.from && (
                  <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 text-xs">
                  From {dateRange.from.toLocaleDateString()}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => onDateRangeChange({ ...dateRange, from: undefined })}
                    />
                </Badge>
              )}
              {dateRange.to && (
                  <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 text-xs">
                    To {dateRange.to.toLocaleDateString()}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => onDateRangeChange({ ...dateRange, to: undefined })}
                    />
                </Badge>
              )}
            </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
