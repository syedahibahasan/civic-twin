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

export async function fetchCensusData(district: string): Promise<CensusData> {
  try {
    // Fetch district-level census data
    const districtData = await fetchDistrictCensusData(district);
    
    if (districtData) {
      console.log(`Successfully fetched district-level census data for ${district}`);
      return districtData;
    }

    // Fallback to mock data if district-level data fails
    console.log(`Using mock data for district ${district} (real data unavailable)`);
    
    const mockData: CensusData = {
      zipCode: district, // Use district as identifier
      population: Math.floor(Math.random() * 500000) + 200000,
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
      ageGroups: {
        '18-24': Math.floor(Math.random() * 50000) + 20000,
        '25-34': Math.floor(Math.random() * 80000) + 40000,
        '35-44': Math.floor(Math.random() * 70000) + 30000,
        '45-54': Math.floor(Math.random() * 60000) + 25000,
        '55-64': Math.floor(Math.random() * 50000) + 20000,
        '65-74': Math.floor(Math.random() * 40000) + 15000,
        '75+': Math.floor(Math.random() * 30000) + 10000
      },
      occupations: {
        management: Math.floor(Math.random() * 25) + 15,
        service: Math.floor(Math.random() * 20) + 10,
        salesOffice: Math.floor(Math.random() * 25) + 15,
        construction: Math.floor(Math.random() * 15) + 5,
        production: Math.floor(Math.random() * 15) + 5,
      },
      homeownershipRate: Math.floor(Math.random() * 30) + 50,
      povertyRate: Math.floor(Math.random() * 15) + 5,
      collegeRate: Math.floor(Math.random() * 20) + 20,
      incomeDistribution: {
        'Under $25,000': Math.floor(Math.random() * 20) + 10,
        '$25,000-$50,000': Math.floor(Math.random() * 15) + 20,
        '$50,000-$100,000': Math.floor(Math.random() * 20) + 30,
        '$100,000-$200,000': Math.floor(Math.random() * 15) + 20,
        'Over $200,000': Math.floor(Math.random() * 10) + 5
      }
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
    // Try to fetch district-level census data first (new approach)
    const districtData = await fetchDistrictCensusData(district);
    
    if (districtData) {
      console.log(`Successfully fetched district-level census data for ${district}`);
      return [districtData]; // Return as array to maintain compatibility
    }

    // Fallback to ZIP code approach if district-level fails
    console.log(`District-level data failed, falling back to ZIP code approach for ${district}`);
    
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
    const zipCodeData = await Promise.all(
      zipCodes.map((zip: string) => fetchCensusData(zip))
    );

    return zipCodeData;
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

// New function to fetch district-level census data directly
async function fetchDistrictCensusData(district: string): Promise<CensusData | null> {
  try {
    // Parse district string (e.g., "CA-12") to state and district number
    const match = district.match(/^([A-Z]{2})-(\d+)$/);
    if (!match) {
      console.warn(`Invalid district format: ${district}`);
      return null;
    }
    
    const state = match[1];
    const cd = match[2];
    
    // Use district-level API call with essential variables only
    // Core demographics: population, race, age groups, occupations, income
    const url = `${CENSUS_API_BASE}?get=B01003_001E,B03002_003E,B03002_004E,B03002_006E,B03002_012E,B19013_001E,B15003_022E,B15003_023E,B15003_024E,B15003_025E,B25003_002E,B25003_003E,B17001_002E,C24010_001E,C24010_002E,C24010_003E,C24010_004E,C24010_005E,C24010_006E&for=congressional%20district:${cd}&in=state:${getStateFIPS(state)}`;
    
    console.log(`Fetching district-level census data for ${district}: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Failed to fetch district census data for ${district}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data || data.length < 2) {
      console.warn(`No data returned for district ${district}`);
      return null;
    }

    // Parse the Census data (first row is headers, second row is data)
    const row = data[1];
    console.log(`Raw Census data for district ${district}:`, row);
    
    const totalPopulation = parseInt(row[0]) || 0;
    const white = parseInt(row[1]) || 0;
    const black = parseInt(row[2]) || 0;
    const asian = parseInt(row[3]) || 0;
    const hispanic = parseInt(row[4]) || 0;
    const medianIncome = parseInt(row[5]) || 50000;
    
    // Education data
    const bachelors = parseInt(row[6]) || 0;
    const masters = parseInt(row[7]) || 0;
    const professional = parseInt(row[8]) || 0;
    const doctorate = parseInt(row[9]) || 0;
    
    // Housing and poverty data
    const ownerOccupied = parseInt(row[10]) || 0;
    const renterOccupied = parseInt(row[11]) || 0;
    const belowPoverty = parseInt(row[12]) || 0;
    
    // Occupation data
    const totalEmployed = parseInt(row[13]) || 0;
    const management = parseInt(row[14]) || 0;
    const service = parseInt(row[15]) || 0;
    const salesOffice = parseInt(row[16]) || 0;
    const construction = parseInt(row[17]) || 0;
    const production = parseInt(row[18]) || 0;
    
    // Calculate "other" as the remainder
    const other = Math.max(0, totalPopulation - white - black - asian - hispanic);
    
    // Calculate occupation percentages
    const occPct = (n: number) => totalEmployed ? Math.round((n / totalEmployed) * 100) : 0;
    
    // Calculate additional percentages
    const totalHousingUnits = ownerOccupied + renterOccupied;
    const homeownershipRate = totalHousingUnits > 0 ? Math.round((ownerOccupied / totalHousingUnits) * 100) : 0;
    const povertyRate = totalPopulation > 0 ? Math.round((belowPoverty / totalPopulation) * 100) : 0;
    const totalGraduates = bachelors + masters + professional + doctorate;
    const collegeRate = totalPopulation > 0 ? Math.round((totalGraduates / totalPopulation) * 100) : 0;
    
    // Use mock/estimated values for other fields for now
    const result: CensusData = {
      zipCode: district, // Use district as identifier instead of ZIP
      population: totalPopulation,
      medianIncome: medianIncome,
      medianAge: 0, // Not available in this call
      educationLevels: {
        lessThanHighSchool: 0,
        highSchool: 0,
        someCollege: 0,
        bachelors: Math.round((bachelors / totalPopulation) * 100),
        graduate: Math.round(((masters + professional + doctorate) / totalPopulation) * 100),
      },
      demographics: {
        white: totalPopulation ? Math.round((white / totalPopulation) * 100) : 0,
        black: totalPopulation ? Math.round((black / totalPopulation) * 100) : 0,
        hispanic: totalPopulation ? Math.round((hispanic / totalPopulation) * 100) : 0,
        asian: totalPopulation ? Math.round((asian / totalPopulation) * 100) : 0,
        other: totalPopulation ? Math.round((other / totalPopulation) * 100) : 0,
      },
      ageGroups: {
        '18-24': Math.floor(totalPopulation * 0.12),
        '25-34': Math.floor(totalPopulation * 0.18),
        '35-44': Math.floor(totalPopulation * 0.16),
        '45-54': Math.floor(totalPopulation * 0.15),
        '55-64': Math.floor(totalPopulation * 0.14),
        '65-74': Math.floor(totalPopulation * 0.12),
        '75+': Math.floor(totalPopulation * 0.13)
      },
      occupations: {
        management: occPct(management),
        service: occPct(service),
        salesOffice: occPct(salesOffice),
        construction: occPct(construction),
        production: occPct(production),
      },
      // New economic and social indicators
      homeownershipRate: homeownershipRate,
      povertyRate: povertyRate,
      collegeRate: collegeRate,
      incomeDistribution: {
        'Under $25,000': Math.round(povertyRate * 1.5), // Estimate based on poverty rate
        '$25,000-$50,000': 25,
        '$50,000-$100,000': 35,
        '$100,000-$200,000': 25,
        'Over $200,000': 10
      }
    };

    console.log(`Successfully parsed district census data for ${district}:`, result);
    return result;
  } catch (error) {
    console.error('Error fetching district census data:', error);
    return null;
  }
}

// Helper function to convert state abbreviation to FIPS code
function getStateFIPS(stateAbbr: string): string {
  const stateFIPS: Record<string, string> = {
    'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09', 'DE': '10',
    'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19', 'KS': '20',
    'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
    'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36',
    'NC': '37', 'ND': '38', 'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
    'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54',
    'WI': '55', 'WY': '56', 'DC': '11'
  };
  return stateFIPS[stateAbbr] || '00';
}