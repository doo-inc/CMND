import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Globe, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Country {
  id: string;
  name: string;
  code: string | null;
  region: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const regions = [
  "North America",
  "Europe", 
  "Middle East",
  "Asia Pacific",
  "Africa",
  "South America"
];

export function CountryManagement() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCountry, setNewCountry] = useState({ name: "", code: "", region: "" });
  const { toast } = useToast();

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('region', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setCountries(data || []);
    } catch (error) {
      console.error("Error loading countries:", error);
      toast({
        title: "Error",
        description: "Failed to load countries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addCountry = async () => {
    if (!newCountry.name.trim()) {
      toast({
        title: "Error",
        description: "Country name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('countries')
        .insert({
          name: newCountry.name.trim(),
          code: newCountry.code.trim() || null,
          region: newCountry.region || null,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Country added successfully",
      });

      setNewCountry({ name: "", code: "", region: "" });
      setIsAddDialogOpen(false);
      loadCountries();
    } catch (error) {
      console.error("Error adding country:", error);
      toast({
        title: "Error",
        description: "Failed to add country",
        variant: "destructive",
      });
    }
  };

  const toggleCountryStatus = async (countryId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('countries')
        .update({ is_active: !currentStatus })
        .eq('id', countryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Country ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      loadCountries();
    } catch (error) {
      console.error("Error updating country:", error);
      toast({
        title: "Error",
        description: "Failed to update country",
        variant: "destructive",
      });
    }
  };

  const deleteCountry = async (countryId: string) => {
    try {
      const { error } = await supabase
        .from('countries')
        .delete()
        .eq('id', countryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Country deleted successfully",
      });

      loadCountries();
    } catch (error) {
      console.error("Error deleting country:", error);
      toast({
        title: "Error",
        description: "Failed to delete country",
        variant: "destructive",
      });
    }
  };

  // Group countries by region
  const groupedCountries = countries.reduce((acc, country) => {
    const region = country.region || "Other";
    if (!acc[region]) {
      acc[region] = [];
    }
    acc[region].push(country);
    return acc;
  }, {} as Record<string, Country[]>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Country Management
          </CardTitle>
          <CardDescription>
            Manage countries available in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Country Management
            </CardTitle>
            <CardDescription>
              Manage countries available in the system ({countries.length} total)
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Country
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Country</DialogTitle>
                <DialogDescription>
                  Add a new country to the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="country-name">Country Name *</Label>
                  <Input
                    id="country-name"
                    value={newCountry.name}
                    onChange={(e) => setNewCountry(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter country name"
                  />
                </div>
                <div>
                  <Label htmlFor="country-code">Country Code</Label>
                  <Input
                    id="country-code"
                    value={newCountry.code}
                    onChange={(e) => setNewCountry(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g., US, GB, DE"
                    maxLength={3}
                  />
                </div>
                <div>
                  <Label htmlFor="country-region">Region</Label>
                  <Select value={newCountry.region} onValueChange={(value) => setNewCountry(prev => ({ ...prev, region: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addCountry}>
                  Add Country
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedCountries).map(([region, regionCountries]) => (
          <div key={region} className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              {region} ({regionCountries.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {regionCountries.map((country) => (
                <div
                  key={country.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    country.is_active ? 'bg-background' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${!country.is_active ? 'text-muted-foreground' : ''}`}>
                      {country.name}
                    </span>
                    {country.code && (
                      <Badge variant="outline" className="text-xs">
                        {country.code}
                      </Badge>
                    )}
                    {!country.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCountryStatus(country.id, country.is_active)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCountry(country.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}