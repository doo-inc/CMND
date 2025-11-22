/**
 * Utility functions for managing filter state via URL query parameters
 */

export interface FilterParams {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Encode filter parameters to URL query string
 */
export const encodeFiltersToQueryString = (
  countries?: string[],
  dateFrom?: Date,
  dateTo?: Date
): string => {
  const params = new URLSearchParams();
  
  if (countries && countries.length > 0) {
    params.set('countries', countries.join(','));
  }
  
  if (dateFrom) {
    params.set('dateFrom', dateFrom.toISOString());
  }
  
  if (dateTo) {
    params.set('dateTo', dateTo.toISOString());
  }
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Decode filter parameters from URL query string
 */
export const decodeFiltersFromQueryString = (searchParams: URLSearchParams): FilterParams => {
  const countries = searchParams.get('countries')?.split(',').filter(Boolean) || [];
  const dateFromStr = searchParams.get('dateFrom');
  const dateToStr = searchParams.get('dateTo');
  
  return {
    countries: countries.length > 0 ? countries : undefined,
    dateFrom: dateFromStr ? new Date(dateFromStr) : undefined,
    dateTo: dateToStr ? new Date(dateToStr) : undefined,
  };
};

/**
 * Build a filtered URL for navigation
 */
export const buildFilteredUrl = (
  basePath: string,
  countries?: string[],
  dateFrom?: Date,
  dateTo?: Date
): string => {
  return `${basePath}${encodeFiltersToQueryString(countries, dateFrom, dateTo)}`;
};
