import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface CensusData {
  zipCode: string;
  population: number;
  medianIncome: number;
  medianAge: number;
  educationLevels: {
    lessThanHighSchool: number;
    highSchool: number;
    someCollege: number;
    bachelors: number;
    graduate: number;
  };
  demographics: {
    white: number;
    black: number;
    hispanic: number;
    asian: number;
    other: number;
  };
  ageGroups: {
    '18-24': number;
    '25-34': number;
    '35-44': number;
    '45-54': number;
    '55-64': number;
    '65-74': number;
    '75+': number;
  };
  occupations: {
    management: number;
    service: number;
    salesOffice: number;
    construction: number;
    production: number;
  };
  homeownershipRate: number;
  povertyRate: number;
  collegeRate: number;
  incomeDistribution: {
    'Under $25,000': number;
    '$25,000-$50,000': number;
    '$50,000-$100,000': number;
    '$100,000-$200,000': number;
    'Over $200,000': number;
  };
}

export class CensusApiService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getDistrictData(district: string): Promise<CensusData | null> {
    try {
      console.log(`Fetching Census data for district: ${district}`);
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/districts/census/${district}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Census API error for district ${district}:`, response.status, errorText);
        
        // Return null for 404 errors (no data available) instead of throwing
        if (response.status === 404) {
          console.warn(`No Census data available for district ${district}`);
          return null;
        }
        
        throw new Error(`Failed to fetch Census data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Successfully fetched Census data for district ${district}:`, data);
      return data;
    } catch (error) {
      console.error(`Error fetching Census data for district ${district}:`, error);
      throw error;
    }
  }

  async getStates(): Promise<string[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/districts/states`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch states: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.states || [];
    } catch (error) {
      console.error('Error fetching states:', error);
      throw error;
    }
  }

  async getDistrictsForState(state: string): Promise<string[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/districts/state/${state}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch districts for state ${state}: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.districts || [];
    } catch (error) {
      console.error(`Error fetching districts for state ${state}:`, error);
      throw error;
    }
  }
}

export const censusApi = new CensusApiService();

// Default export for easier importing
export default censusApi;

// Legacy function for backward compatibility
export async function fetchCensusData(district: string): Promise<CensusData | null> {
  return censusApi.getDistrictData(district);
}