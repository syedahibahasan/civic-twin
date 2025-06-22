import { CensusData } from '../types';

const CENSUS_API_KEY = 'efbf8450e2ce9dc0e8b8d6dd3a2d1a8105c6b721';
const BASE_URL = 'https://api.census.gov/data/2021/acs/acs5';

export async function fetchCensusData(zipCode: string): Promise<CensusData> {
  try {
    // In a real implementation, we'd make actual API calls
    // For now, we'll return mock data based on the ZIP code
    const mockData: CensusData = {
      zipCode,
      population: Math.floor(Math.random() * 50000) + 20000,
      medianIncome: Math.floor(Math.random() * 30000) + 40000,
      medianAge: Math.floor(Math.random() * 20) + 30,
      educationLevels: {
        lessThanHighSchool: Math.floor(Math.random() * 15) + 5,
        highSchool: Math.floor(Math.random() * 25) + 20,
        someCollege: Math.floor(Math.random() * 20) + 15,
        bachelors: Math.floor(Math.random() * 25) + 20,
        graduate: Math.floor(Math.random() * 15) + 10,
      },
      demographics: {
        white: Math.floor(Math.random() * 40) + 30,
        black: Math.floor(Math.random() * 20) + 10,
        hispanic: Math.floor(Math.random() * 25) + 15,
        asian: Math.floor(Math.random() * 20) + 10,
        other: Math.floor(Math.random() * 10) + 5,
      },
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return mockData;
  } catch (error) {
    console.error('Error fetching census data:', error);
    throw new Error('Failed to fetch census data');
  }
}