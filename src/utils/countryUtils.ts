import { supabase } from "@/integrations/supabase/client";

export interface Country {
  id: string;
  name: string;
  code: string | null;
  region: string | null;
  is_active: boolean;
}

export const getActiveCountries = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('name')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching countries:', error);
      // Fallback to hardcoded list if database fails
      return [
        "United States", "Canada", "Mexico", "United Kingdom", "Germany", 
        "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland",
        "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain",
        "China", "Japan", "India", "Singapore", "Australia"
      ];
    }

    return data?.map(country => country.name) || [];
  } catch (error) {
    console.error('Error in getActiveCountries:', error);
    // Fallback to hardcoded list
    return [
      "United States", "Canada", "Mexico", "United Kingdom", "Germany", 
      "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland",
      "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain",
      "China", "Japan", "India", "Singapore", "Australia"
    ];
  }
};

export const getAllCountries = async (): Promise<Country[]> => {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('region', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all countries:', error);
    return [];
  }
};