import React from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface PipelineFiltersProps {
  countries: string[];
  selectedCountries: string[];
  onCountryChange: (countries: string[]) => void;
  onClearFilters: () => void;
}

export const PipelineFilters: React.FC<PipelineFiltersProps> = ({
  countries,
  selectedCountries,
  onCountryChange,
  onClearFilters,
}) => {
  const handleCountryToggle = (country: string) => {
    if (selectedCountries.includes(country)) {
      onCountryChange(selectedCountries.filter((c) => c !== country));
    } else {
      onCountryChange([...selectedCountries, country]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCountries.length === countries.length) {
      onCountryChange([]);
    } else {
      onCountryChange([...countries]);
    }
  };

  return (
    <Card className="p-4 mb-6 backdrop-blur-sm bg-card/50 border-border/50 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Filters:</Label>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="hover-scale">
                <Filter className="h-3 w-3 mr-2" />
                Country
                {selectedCountries.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedCountries.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Select Countries</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs"
                  >
                    {selectedCountries.length === countries.length
                      ? "Clear All"
                      : "Select All"}
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {countries.map((country) => (
                    <div
                      key={country}
                      className="flex items-center space-x-2 hover:bg-accent p-2 rounded-md cursor-pointer transition-colors"
                      onClick={() => handleCountryToggle(country)}
                    >
                      <Checkbox
                        id={`country-${country}`}
                        checked={selectedCountries.includes(country)}
                        onCheckedChange={() => handleCountryToggle(country)}
                      />
                      <label
                        htmlFor={`country-${country}`}
                        className="text-sm flex-1 cursor-pointer"
                      >
                        {country}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {selectedCountries.length > 0 && (
            <>
              <div className="flex gap-2 flex-wrap">
                {selectedCountries.map((country) => (
                  <Badge
                    key={country}
                    variant="secondary"
                    className="animate-scale-in"
                  >
                    {country}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive transition-colors"
                      onClick={() => handleCountryToggle(country)}
                    />
                  </Badge>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-xs hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
