import { CensusData, DigitalTwin } from '../types';

// District to ZIP code mappings (simplified - in production you'd use a more comprehensive mapping)
const DISTRICT_ZIP_MAPPINGS: Record<string, string[]> = {
  'CA-12': ['94102', '94103', '94104', '94105', '94107', '94108', '94109', '94110', '94111', '94112'],
  'NY-08': ['11201', '11205', '11206', '11211', '11216', '11217', '11221', '11222', '11225', '11226'],
  'TX-29': ['77001', '77002', '77003', '77004', '77005', '77006', '77007', '77008', '77009', '77010'],
  'FL-27': ['33101', '33102', '33109', '33125', '33126', '33127', '33128', '33129', '33130', '33131'],
  'CA-14': ['94010', '94011', '94012', '94013', '94014', '94015', '94016', '94017', '94018', '94019'],
  'NY-12': ['10001', '10002', '10003', '10004', '10005', '10006', '10007', '10008', '10009', '10010'],
  'TX-07': ['77001', '77002', '77003', '77004', '77005', '77006', '77007', '77008', '77009', '77010'],
  'FL-25': ['33101', '33102', '33109', '33125', '33126', '33127', '33128', '33129', '33130', '33131'],
};

// Occupation categories with realistic distributions
const OCCUPATIONS = {
  'Healthcare': ['Doctor', 'Nurse', 'Medical Assistant', 'Pharmacist', 'Physical Therapist'],
  'Education': ['Teacher', 'Professor', 'School Administrator', 'Librarian', 'Tutor'],
  'Technology': ['Software Engineer', 'Data Analyst', 'IT Manager', 'Web Developer', 'Systems Administrator'],
  'Business': ['Manager', 'Accountant', 'Sales Representative', 'Marketing Specialist', 'HR Manager'],
  'Service': ['Restaurant Manager', 'Retail Supervisor', 'Customer Service Rep', 'Hotel Manager', 'Chef'],
  'Construction': ['Construction Manager', 'Electrician', 'Plumber', 'Carpenter', 'Architect'],
  'Government': ['Government Employee', 'Police Officer', 'Firefighter', 'Postal Worker', 'Administrative Assistant'],
  'Finance': ['Financial Advisor', 'Bank Teller', 'Insurance Agent', 'Loan Officer', 'Accountant'],
};

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

export async function fetchDistrictData(district: string): Promise<CensusData[]> {
  try {
    const zipCodes = DISTRICT_ZIP_MAPPINGS[district] || [];
    
    if (zipCodes.length === 0) {
      // If district not found, generate some default ZIP codes
      const defaultZips = ['10001', '20001', '30001', '40001', '50001'];
      return Promise.all(defaultZips.map(zip => fetchCensusData(zip)));
    }

    // Fetch data for all ZIP codes in the district
    const districtData = await Promise.all(
      zipCodes.map(zip => fetchCensusData(zip))
    );

    return districtData;
  } catch (error) {
    console.error('Error fetching district data:', error);
    throw new Error('Failed to fetch district data');
  }
}

export function generateConstituentProfiles(districtData: CensusData[], count: number = 10): DigitalTwin[] {
  const constituents: DigitalTwin[] = [];
  
  // Generate names based on demographics
  const names = generateNamesFromDemographics();
  
  for (let i = 0; i < count; i++) {
    const randomZip = districtData[Math.floor(Math.random() * districtData.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    
    // Generate age based on median age with some variation
    const age = Math.floor(Math.max(18, Math.min(85, 
      randomZip.medianAge + (Math.random() - 0.5) * 30
    )));
    
    // Generate income based on median income with realistic distribution
    const incomeMultiplier = 0.5 + Math.random() * 2; // 0.5x to 2.5x median
    const annualIncome = Math.floor(randomZip.medianIncome * incomeMultiplier);
    
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
  // This would be more sophisticated in production
  // For now, we'll use a diverse set of names
  const names = [
    'Maria Rodriguez', 'James Johnson', 'Sarah Chen', 'Michael Thompson',
    'Emily Davis', 'David Wilson', 'Lisa Anderson', 'Robert Martinez',
    'Jennifer Garcia', 'Christopher Lee', 'Amanda White', 'Daniel Brown',
    'Jessica Taylor', 'Matthew Miller', 'Ashley Moore', 'Joshua Jackson',
    'Stephanie Martin', 'Andrew Lee', 'Nicole Garcia', 'Kevin Rodriguez',
    'Rachel Martinez', 'Ryan Anderson', 'Lauren Thompson', 'Brandon White',
    'Megan Johnson', 'Tyler Davis', 'Kayla Wilson', 'Jordan Brown',
    'Samantha Taylor', 'Cody Miller', 'Brittany Moore', 'Dustin Jackson',
    'Heather Martin', 'Travis Lee', 'Amber Garcia', 'Corey Rodriguez'
  ];
  
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