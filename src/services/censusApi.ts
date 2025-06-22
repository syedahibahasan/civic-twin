import { CensusData, DigitalTwin } from '../types';
import { generateConstituentsFromCensusData } from './aiService';

// Free Census Bureau API - no credentials required
const CENSUS_API_BASE = 'https://api.census.gov/data/2021/acs/acs5';

// Occupation categories with realistic distributions
const OCCUPATIONS = {
  'Healthcare': ['Doctor', 'Nurse', 'Medical Assistant', 'Pharmacist', 'Physical Therapist'],
  'Education': ['Teacher', 'Professor', 'School Administrator', 'Librarian', 'Tutor'],
  'Technology': ['Software Engineer', 'Data Analyst', 'IT Manager', 'Web Developer', 'Systems Administrator'],
  'Business': ['Manager', 'Accountant', 'Sales Representative', 'Marketing Specialist', 'HR Manager'],
  'Service': ['Restaurant Manager', 'Retail Supervisor', 'Customer Service Rep', 'Hotel Manager', 'Chef'],
  'Construction': ['Construction Manager', 'Electrician', 'Plumber', 'Carpenter', 'Architect'],
  'Government': ['Government Employee', 'Police Officer', 'Firefighter', 'Postal Worker', 'Administrator'],
  'Transportation': ['Truck Driver', 'Bus Driver', 'Delivery Driver', 'Pilot', 'Train Conductor'],
  'Manufacturing': ['Factory Worker', 'Machine Operator', 'Quality Control', 'Production Manager', 'Technician'],
  'Retail': ['Sales Associate', 'Store Manager', 'Cashier', 'Customer Service', 'Inventory Specialist']
};

// Real Census API call function using @peoplefinders/census
async function fetchRealCensusData(zipCode: string): Promise<CensusData | null> {
  try {
    // Use the free Census Bureau ACS API - no credentials required
    // B01003_001E = Total population
    // B03002_003E = White alone
    // B03002_004E = Black or African American alone
    // B03002_005E = American Indian and Alaska Native alone
    // B03002_006E = Asian alone
    // B03002_007E = Native Hawaiian and Other Pacific Islander alone
    // B03002_012E = Hispanic or Latino
    // B19013_001E = Median household income
    // B15003_022E = Bachelor's degree
    // B15003_023E = Master's degree
    // B15003_024E = Professional school degree
    // B15003_025E = Doctorate degree
    const url = `${CENSUS_API_BASE}?get=B01003_001E,B03002_003E,B03002_004E,B03002_005E,B03002_006E,B03002_007E,B03002_012E,B19013_001E,B15003_022E,B15003_023E,B15003_024E,B15003_025E&for=zip%20code%20tabulation%20area:${zipCode}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Failed to fetch census data for ZIP ${zipCode}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data || data.length < 2) {
      console.warn(`No data returned for ZIP ${zipCode}`);
      return null;
    }

    // Parse the Census data (first row is headers, second row is data)
    const row = data[1];
    console.log(`Raw Census data for ZIP ${zipCode}:`, row);
    
    const totalPopulation = parseInt(row[0]) || 0;
    const white = parseInt(row[1]) || 0;
    const black = parseInt(row[2]) || 0;
    const nativeAmerican = parseInt(row[3]) || 0;
    const asian = parseInt(row[4]) || 0;
    const pacificIslander = parseInt(row[5]) || 0;
    const hispanic = parseInt(row[6]) || 0;
    const rawMedianIncome = parseInt(row[7]) || 50000;
    const medianIncome = Math.max(30000, rawMedianIncome); // Ensure minimum $30k
    
    console.log(`Parsed median income for ZIP ${zipCode}: raw=${rawMedianIncome}, final=${medianIncome}`);
    
    // Education data
    const bachelors = parseInt(row[8]) || 0;
    const masters = parseInt(row[9]) || 0;
    const professional = parseInt(row[10]) || 0;
    const doctorate = parseInt(row[11]) || 0;
    const graduateTotal = bachelors + masters + professional + doctorate;
    
    // Calculate other races (total - sum of specific races)
    const other = totalPopulation - white - black - nativeAmerican - asian - pacificIslander;

    // Calculate median age (simplified - would need separate API call for accurate numbers)
    const medianAge = 35; // Default estimate

    const result: CensusData = {
      zipCode,
      population: totalPopulation,
      medianIncome,
      medianAge: Math.floor(medianAge),
      educationLevels: {
        lessThanHighSchool: Math.floor(totalPopulation * 0.08),
        highSchool: Math.floor(totalPopulation * 0.25),
        someCollege: Math.floor(totalPopulation * 0.20),
        bachelors: Math.floor(graduateTotal * 0.6), // Estimate from total graduate degrees
        graduate: Math.floor(graduateTotal * 0.4), // Estimate from total graduate degrees
      },
      demographics: {
        white: Math.floor((white / totalPopulation) * 100),
        black: Math.floor((black / totalPopulation) * 100),
        hispanic: Math.floor((hispanic / totalPopulation) * 100),
        asian: Math.floor((asian / totalPopulation) * 100),
        other: Math.floor((other / totalPopulation) * 100),
      },
    };

    return result;
  } catch (error) {
    console.error('Error fetching real census data:', error);
    return null;
  }
}

export async function fetchCensusData(zipCode: string): Promise<CensusData> {
  try {
    // Try to fetch real Census data first
    const realData = await fetchRealCensusData(zipCode);
    
    if (realData) {
      console.log(`Successfully fetched real Census data for ZIP ${zipCode}`);
      return realData;
    }

    // Fallback to mock data if real data fails
    console.log(`Using mock data for ZIP ${zipCode} (real data unavailable)`);
    
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
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return mockData;
  } catch (error) {
    console.error('Error fetching census data:', error);
    throw new Error('Failed to fetch census data');
  }
}

export async function fetchDistrictData(district: string): Promise<CensusData[]> {
  try {
    // Parse district string (e.g., "CA-12") to state and district number
    const match = district.match(/^([A-Z]{2})-(\d+)$/);
    if (!match) {
      console.warn(`Invalid district format: ${district}`);
      return [];
    }
    
    // Get ZIP codes for the district using the backend API
    const response = await fetch(`/api/districts/zipcodes/${district}`);
    
    if (!response.ok) {
      console.warn(`Failed to get ZIP codes for district ${district}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const zipCodes = data.zipCodes || [];
    
    if (zipCodes.length === 0) {
      console.warn(`No ZIP codes found for district ${district}`);
      return [];
    }

    console.log(`Found ${zipCodes.length} ZIP codes for district ${district}`);

    // Fetch data for all ZIP codes in the district
    const districtData = await Promise.all(
      zipCodes.map((zip: string) => fetchCensusData(zip))
    );

    return districtData;
  } catch (error) {
    console.error('Error fetching district data:', error);
    throw new Error('Failed to fetch district data');
  }
}

export async function generateConstituentProfiles(districtData: CensusData[], count: number = 10): Promise<DigitalTwin[]> {
  try {
    // Use the AI service to generate realistic constituents based on Census data
    // We'll use the first ZIP code's data as representative for the district
    const representativeData = districtData[0];
    
    if (!representativeData) {
      console.warn('No Census data available for constituent generation');
      return [];
    }
    
    console.log(`Generating ${count} constituents using AI for ZIP ${representativeData.zipCode}`);
    
    // Use the AI service to generate realistic constituents
    const constituents = await generateConstituentsFromCensusData(representativeData, count);
    
    console.log(`Successfully generated ${constituents.length} constituents using AI`);
    return constituents;
    
  } catch (error) {
    console.error('Error generating constituent profiles with AI:', error);
    
    // Fallback to simple generation if AI fails
    console.log('Falling back to simple constituent generation');
    return generateSimpleConstituents(districtData, count);
  }
}

function generateSimpleConstituents(districtData: CensusData[], count: number = 10): DigitalTwin[] {
  const constituents: DigitalTwin[] = [];
  const names = generateNamesFromDemographics();
  
  for (let i = 0; i < count; i++) {
    const randomZip = districtData[Math.floor(Math.random() * districtData.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    
    // Generate age based on median age with some variation
    const age = Math.floor(Math.max(18, Math.min(85, 
      randomZip.medianAge + (Math.random() - 0.5) * 30
    )));
    
    // Generate income based on median income with realistic distribution
    const medianIncome = Math.max(30000, randomZip.medianIncome || 50000);
    const incomeMultiplier = 0.5 + Math.random() * 2; // 0.5x to 2.5x median
    const annualIncome = Math.floor(medianIncome * incomeMultiplier);
    
    // Select education level based on district demographics
    const education = selectEducationLevel(randomZip.educationLevels);
    
    // Select occupation based on education and income
    const occupation = selectOccupation(education, annualIncome);
    
    // Generate demographic background
    const demographics = selectDemographicBackground(randomZip.demographics);
    
    const constituent: DigitalTwin = {
      id: `constituent-${i + 1}`,
      name,
      age,
      education,
      annualIncome,
      occupation,
      demographics,
      zipCode: randomZip.zipCode,
      personalStory: generatePersonalStory(name, age, education, occupation, annualIncome, demographics),
      policyImpact: 'To be determined based on policy analysis'
    };
    
    constituents.push(constituent);
  }
  
  return constituents;
}

function generateNamesFromDemographics(): string[] {
  // Generate anonymized constituent names
  const names = [];
  for (let i = 1; i <= 20; i++) {
    names.push(`Constituent #${i}`);
  }
  return names;
}

function selectEducationLevel(educationLevels: CensusData['educationLevels']): string {
  const total = Object.values(educationLevels).reduce((sum, val) => sum + val, 0);
  const random = Math.random() * total;
  
  let cumulative = 0;
  
  if (random < (cumulative += educationLevels.lessThanHighSchool)) {
    return 'High School Diploma';
  }
  if (random < (cumulative += educationLevels.highSchool)) {
    return 'High School Diploma';
  }
  if (random < (cumulative += educationLevels.someCollege)) {
    return 'Some College';
  }
  if (random < (cumulative += educationLevels.bachelors)) {
    return 'Bachelor\'s Degree';
  }
  return 'Master\'s Degree';
}

function selectOccupation(education: string, income: number): string {
  let category: keyof typeof OCCUPATIONS;
  
  if (education.includes('Master') || education.includes('Doctorate')) {
    category = income > 80000 ? 'Technology' : 'Education';
  } else if (education.includes('Bachelor')) {
    category = income > 60000 ? 'Technology' : 'Business';
  } else if (education.includes('Some College')) {
    category = income > 50000 ? 'Healthcare' : 'Service';
  } else {
    category = income > 40000 ? 'Construction' : 'Service';
  }
  
  const occupations = OCCUPATIONS[category];
  return occupations[Math.floor(Math.random() * occupations.length)];
}

function selectDemographicBackground(demographics: CensusData['demographics']): string {
  const total = Object.values(demographics).reduce((sum, val) => sum + val, 0);
  const random = Math.random() * total;
  
  let cumulative = 0;
  
  if (random < (cumulative += demographics.white)) {
    return 'White';
  }
  if (random < (cumulative += demographics.black)) {
    return 'Black';
  }
  if (random < (cumulative += demographics.hispanic)) {
    return 'Hispanic';
  }
  if (random < (cumulative += demographics.asian)) {
    return 'Asian';
  }
  return 'Other';
}

function generatePersonalStory(
  name: string, 
  age: number, 
  education: string, 
  occupation: string, 
  income: number, 
  demographics: string
): string {
  const stories = [
    `${name} is a ${age}-year-old ${occupation.toLowerCase()} with a ${education.toLowerCase()}. They've lived in the district for ${Math.floor(Math.random() * 20) + 5} years and are concerned about local economic development.`,
    
    `A ${demographics.toLowerCase()} resident, ${name} works as a ${occupation.toLowerCase()} and has a ${education.toLowerCase()}. They're passionate about education and healthcare access in their community.`,
    
    `${name}, ${age}, is a ${occupation.toLowerCase()} who recently completed their ${education.toLowerCase()}. They're focused on affordable housing and transportation issues in the district.`,
    
    `With ${Math.floor(Math.random() * 20) + 10} years of experience as a ${occupation.toLowerCase()}, ${name} has seen the district change significantly. They care about maintaining the community's character while supporting growth.`,
    
    `${name} is a ${age}-year-old ${occupation.toLowerCase()} with a ${education.toLowerCase()}. They're particularly concerned about environmental issues and sustainable development in the area.`
  ];
  
  return stories[Math.floor(Math.random() * stories.length)];
}

export async function getConstituentsForDistrict(district: string, count: number = 10): Promise<DigitalTwin[]> {
  try {
    const districtData = await fetchDistrictData(district);
    return generateConstituentProfiles(districtData, count);
  } catch (error) {
    console.error('Error getting constituents for district:', error);
    throw new Error('Failed to get constituents for district');
  }
}