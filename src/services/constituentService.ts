import { DigitalTwin, CensusData } from '../types';
import censusApi from './censusApi';
import { generateConstituentsFromCensusData } from './aiService';

class ConstituentService {
  private constituents: DigitalTwin[] = [];
  private censusData: CensusData[] = [];
  private isLoading = false;
  private lastDistrict: string | null = null;

  async getConstituents(district: string, count: number = 10): Promise<DigitalTwin[]> {
    // If we already have constituents for this district, return them
    if (this.lastDistrict === district && this.constituents.length > 0) {
      return this.constituents;
    }

    // If we're already loading, wait
    if (this.isLoading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          if (!this.isLoading) {
            resolve(this.constituents);
          } else {
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
      });
    }

    this.isLoading = true;
    this.lastDistrict = district;

    try {
      // First, try to get cached constituents
      console.log(`Checking cache for district ${district}...`);
      const cachedData = await this.getCachedConstituents(district);
      
      if (cachedData) {
        console.log(`Using cached constituents for district ${district}`);
        this.constituents = cachedData.constituents;
        this.censusData = cachedData.censusData ? [cachedData.censusData] : [];
        return this.constituents;
      }

      // If no cache, fetch census data and generate new constituents
      console.log(`No cache found, generating new constituents for district ${district}`);
      const districtCensusData = await censusApi.getDistrictData(district);
      
      if (!districtCensusData) {
        throw new Error('No census data available for district');
      }
      
      this.censusData = [districtCensusData];
      
      // Use the enhanced AI service to generate realistic constituents based on Census data
      console.log(`Generating ${count} realistic constituents using AI for district ${district}`);
      
      const constituentsData = await generateConstituentsFromCensusData(districtCensusData, count);
      this.constituents = constituentsData;
      
      // Cache the generated constituents
      await this.cacheConstituents(district, constituentsData, districtCensusData);
      
      console.log(`Successfully generated and cached ${constituentsData.length} realistic constituents`);
      return this.constituents;
    } catch (error) {
      console.error('Error fetching constituents:', error);
      // Fallback to simple generation if AI generation fails
      try {
        const constituentsData = await this.generateSimpleConstituents(district, count);
        this.constituents = constituentsData;
        return this.constituents;
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
        throw error;
      }
    } finally {
      this.isLoading = false;
    }
  }

  private async generateSimpleConstituents(district: string, count: number = 10): Promise<DigitalTwin[]> {
    try {
      const censusData = await censusApi.getDistrictData(district);
      if (!censusData) {
        console.warn(`No census data available for district ${district}, using fallback data`);
        return this.generateConstituentsWithFallbackData(district, count);
      }

      const constituents: DigitalTwin[] = [];
      const names = this.generateNamesFromDemographics();
      
      for (let i = 0; i < count; i++) {
        const name = names[Math.floor(Math.random() * names.length)];
        
        // Generate age based on median age with some variation
        const age = Math.floor(Math.max(18, Math.min(85, 
          (censusData.medianAge || 40) + (Math.random() - 0.5) * 30
        )));
        
        // Generate income based on median income with realistic distribution
        const medianIncome = Math.max(30000, censusData.medianIncome || 50000);
        const incomeMultiplier = 0.5 + Math.random() * 2; // 0.5x to 2.5x median
        const annualIncome = Math.floor(medianIncome * incomeMultiplier);
        
        // Select education level based on district demographics
        const education = this.selectEducationLevel(censusData.educationLevels);
        
        // Select occupation based on education and income
        const occupation = this.selectOccupation(education, annualIncome);
        
        // Generate demographic background
        const demographics = this.selectDemographicBackground(censusData.demographics);
        
        const constituent: DigitalTwin = {
          id: `constituent-${i + 1}`,
          name,
          age,
          education,
          annualIncome,
          occupation,
          demographics,
          zipCode: censusData.zipCode, // This is now the district identifier
          personalStory: this.generatePersonalStory(name, age, education, occupation, annualIncome, demographics),
          policyImpact: 'To be determined based on policy analysis',
          politicalPolicies: ['Universal healthcare access', 'Education funding', 'Economic development']
        };
        
        constituents.push(constituent);
      }
      
      return constituents;
    } catch (error) {
      console.error('Error generating simple constituents:', error);
      console.log('Using fallback data due to Census API error');
      return this.generateConstituentsWithFallbackData(district, count);
    }
  }

  private generateConstituentsWithFallbackData(district: string, count: number = 10): DigitalTwin[] {
    console.log(`Generating ${count} constituents with fallback data for district ${district}`);
    
    // Create fallback census data
    const fallbackCensusData: CensusData = {
      zipCode: district,
      population: 750000, // Typical district population
      medianIncome: 65000, // National median
      medianAge: 38,
      educationLevels: {
        lessThanHighSchool: 10,
        highSchool: 25,
        someCollege: 20,
        bachelors: 30,
        graduate: 15
      },
      demographics: {
        white: 60,
        black: 12,
        hispanic: 18,
        asian: 6,
        other: 4
      },
      ageGroups: {
        '18-24': 90000,
        '25-34': 135000,
        '35-44': 120000,
        '45-54': 112500,
        '55-64': 105000,
        '65-74': 90000,
        '75+': 97500
      },
      occupations: {
        management: 25,
        service: 20,
        salesOffice: 30,
        construction: 10,
        production: 15
      },
      homeownershipRate: 65,
      povertyRate: 12,
      collegeRate: 35,
      incomeDistribution: {
        'Under $25,000': 15,
        '$25,000-$50,000': 25,
        '$50,000-$100,000': 35,
        '$100,000-$200,000': 20,
        'Over $200,000': 5
      }
    };

    // Store the fallback data
    this.censusData = [fallbackCensusData];

    const constituents: DigitalTwin[] = [];
    const names = this.generateNamesFromDemographics();
    
    for (let i = 0; i < count; i++) {
      const name = names[Math.floor(Math.random() * names.length)];
      
      // Generate age based on fallback median age
      const age = Math.floor(Math.max(18, Math.min(85, 
        fallbackCensusData.medianAge + (Math.random() - 0.5) * 30
      )));
      
      // Generate income based on fallback median income
      const medianIncome = fallbackCensusData.medianIncome;
      const incomeMultiplier = 0.5 + Math.random() * 2;
      const annualIncome = Math.floor(medianIncome * incomeMultiplier);
      
      // Select education level based on fallback demographics
      const education = this.selectEducationLevel(fallbackCensusData.educationLevels);
      
      // Select occupation based on education and income
      const occupation = this.selectOccupation(education, annualIncome);
      
      // Generate demographic background
      const demographics = this.selectDemographicBackground(fallbackCensusData.demographics);
      
      const constituent: DigitalTwin = {
        id: `constituent-${i + 1}`,
        name,
        age,
        education,
        annualIncome,
        occupation,
        demographics,
        zipCode: district,
        personalStory: this.generatePersonalStory(name, age, education, occupation, annualIncome, demographics),
        policyImpact: 'To be determined based on policy analysis',
        politicalPolicies: ['Universal healthcare access', 'Education funding', 'Economic development']
      };
      
      constituents.push(constituent);
    }
    
    this.constituents = constituents;
    return constituents;
  }

  private generateNamesFromDemographics(): string[] {
    // Generate anonymized constituent names
    const names = [];
    for (let i = 1; i <= 20; i++) {
      names.push(`Constituent #${i}`);
    }
    return names;
  }

  private selectEducationLevel(educationLevels: CensusData['educationLevels']): string {
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

  private selectOccupation(education: string, income: number): string {
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

  private selectDemographicBackground(demographics: CensusData['demographics']): string {
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

  private generatePersonalStory(
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

  private async getCachedConstituents(district: string): Promise<{ constituents: DigitalTwin[], censusData?: CensusData } | null> {
    try {
      // Get auth token from localStorage or context
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/cache/constituents/${district}`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          constituents: data.constituents,
          censusData: data.censusData
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching cached constituents:', error);
      return null;
    }
  }

  private async cacheConstituents(district: string, constituents: DigitalTwin[], censusData: CensusData): Promise<void> {
    try {
      // Get auth token from localStorage or context
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/cache/constituents', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          district,
          constituents,
          censusData
        })
      });

      if (response.ok) {
        console.log(`Successfully cached constituents for district ${district}`);
      } else {
        console.warn(`Failed to cache constituents for district ${district}`);
      }
    } catch (error) {
      console.error('Error caching constituents:', error);
    }
  }

  async refreshConstituents(district: string, count: number = 10): Promise<DigitalTwin[]> {
    console.log('🔄 refreshConstituents called for district:', district, 'count:', count);
    
    // Clear local cache
    console.log('🗑️ Clearing local cache...');
    this.constituents = [];
    this.censusData = [];
    this.lastDistrict = null;
    
    // Invalidate database cache
    console.log('🗑️ Invalidating database cache...');
    await this.invalidateCache(district);
    
    // Force fresh generation by bypassing cache check
    try {
      console.log(`🆕 Forcing fresh generation of ${count} constituents for district ${district}`);
      
      // Fetch fresh census data
      console.log('📊 Fetching fresh census data...');
      const districtCensusData = await censusApi.getDistrictData(district);
      if (!districtCensusData) {
        throw new Error('No census data available for district');
      }
      
      console.log('✅ Census data fetched successfully');
      this.censusData = [districtCensusData];
      
      // Generate fresh constituents using AI service directly
      console.log('🤖 Generating fresh constituents with AI...');
      const constituentsData = await generateConstituentsFromCensusData(districtCensusData, count);
      console.log('✅ AI generation completed, got', constituentsData.length, 'constituents');
      
      this.constituents = constituentsData;
      
      // Cache the fresh constituents
      console.log('💾 Caching fresh constituents...');
      await this.cacheConstituents(district, constituentsData, districtCensusData);
      
      console.log(`🎉 Successfully generated and cached ${constituentsData.length} fresh constituents`);
      return this.constituents;
    } catch (error) {
      console.error('❌ Error in fresh generation:', error);
      // Fallback to simple generation if AI generation fails
      try {
        console.log('🔄 Falling back to simple generation...');
        const constituentsData = await this.generateSimpleConstituents(district, count);
        this.constituents = constituentsData;
        return this.constituents;
      } catch (fallbackError) {
        console.error('❌ Fallback method also failed:', fallbackError);
        throw error;
      }
    }
  }

  private async invalidateCache(district: string): Promise<void> {
    try {
      // Get auth token from localStorage or context
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/cache/constituents/${district}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        console.log(`Successfully invalidated cache for district ${district}`);
      } else {
        console.warn(`Failed to invalidate cache for district ${district}`);
      }
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  // New method to generate common constituent types for dashboard
  async getCommonConstituentTypes(district: string): Promise<DigitalTwin[]> {
    try {
      const districtCensusData = await censusApi.getDistrictData(district);
      if (!districtCensusData) {
        throw new Error('No census data available for district');
      }
      
      // Generate a diverse set of common constituent types
      const commonTypes = [
        { type: 'Student', count: 2 },
        { type: 'Working Professional', count: 3 },
        { type: 'Small Business Owner', count: 2 },
        { type: 'Senior Citizen', count: 2 },
        { type: 'Parent', count: 2 },
        { type: 'Veteran', count: 1 },
        { type: 'Healthcare Worker', count: 2 },
        { type: 'Teacher', count: 1 }
      ];

      const allConstituents: DigitalTwin[] = [];
      
      for (const { type, count } of commonTypes) {
        try {
          // Generate specific constituent types using AI
          const typeConstituents = await this.generateSpecificConstituentType(districtCensusData, type, count);
          allConstituents.push(...typeConstituents);
        } catch {
          console.warn(`Failed to generate ${type} constituents, using fallback`);
          // Fallback to general generation
          const fallbackConstituents = await generateConstituentsFromCensusData(districtCensusData, count);
          allConstituents.push(...fallbackConstituents);
        }
      }

      return allConstituents.slice(0, 15); // Limit to 15 total
    } catch (error) {
      console.error('Error generating common constituent types:', error);
      // Fallback to basic generation
      return this.getConstituents(district, 15);
    }
  }

  // Helper method to generate specific constituent types
  private async generateSpecificConstituentType(censusData: CensusData, type: string, count: number): Promise<DigitalTwin[]> {
    // This would ideally use the AI service with specific prompts for each type
    // For now, use the general AI generation
    return generateConstituentsFromCensusData(censusData, count);
  }

  getConstituentById(id: string): DigitalTwin | undefined {
    return this.constituents.find(constituent => constituent.id === id);
  }

  getConstituentsByDemographic(demographic: string): DigitalTwin[] {
    return this.constituents.filter(constituent => 
      constituent.demographics.toLowerCase() === demographic.toLowerCase()
    );
  }

  getConstituentsByIncomeRange(minIncome: number, maxIncome: number): DigitalTwin[] {
    return this.constituents.filter(constituent => 
      constituent.annualIncome >= minIncome && constituent.annualIncome <= maxIncome
    );
  }

  getConstituentsByEducation(education: string): DigitalTwin[] {
    return this.constituents.filter(constituent => 
      constituent.education.toLowerCase().includes(education.toLowerCase())
    );
  }

  getConstituentsByAgeRange(minAge: number, maxAge: number): DigitalTwin[] {
    return this.constituents.filter(constituent => 
      constituent.age >= minAge && constituent.age <= maxAge
    );
  }

  getCensusData(): CensusData[] {
    return this.censusData;
  }

  getDistrictPopulation(): number {
    // If we have district-level data (single entry), return that population
    if (this.censusData.length === 1 && this.censusData[0].zipCode.includes('-')) {
      return this.censusData[0].population;
    }
    
    // Fallback to ZIP code aggregation (old method)
    return this.censusData.reduce((total, data) => total + data.population, 0);
  }

  getCensusDemographics() {
    if (this.censusData.length === 0) {
      return null;
    }

    // If we have district-level data (single entry), return that directly
    if (this.censusData.length === 1 && this.censusData[0].zipCode.includes('-')) {
      return this.censusData[0].demographics;
    }

    // Fallback to ZIP code aggregation (old method)
    const totalPopulation = this.getDistrictPopulation();
    const aggregatedDemographics = this.censusData.reduce((acc, data) => {
      const zipPopulation = data.population;
      
      acc.white += (data.demographics.white / 100) * zipPopulation;
      acc.black += (data.demographics.black / 100) * zipPopulation;
      acc.hispanic += (data.demographics.hispanic / 100) * zipPopulation;
      acc.asian += (data.demographics.asian / 100) * zipPopulation;
      acc.other += (data.demographics.other / 100) * zipPopulation;
      
      return acc;
    }, { white: 0, black: 0, hispanic: 0, asian: 0, other: 0 });

    // Convert to percentages
    return {
      white: Math.round((aggregatedDemographics.white / totalPopulation) * 100),
      black: Math.round((aggregatedDemographics.black / totalPopulation) * 100),
      hispanic: Math.round((aggregatedDemographics.hispanic / totalPopulation) * 100),
      asian: Math.round((aggregatedDemographics.asian / totalPopulation) * 100),
      other: Math.round((aggregatedDemographics.other / totalPopulation) * 100)
    };
  }

  getCensusOccupations() {
    if (this.censusData.length === 0) {
      return null;
    }

    // If we have district-level data (single entry), return that directly
    if (this.censusData.length === 1 && this.censusData[0].zipCode.includes('-')) {
      const occupations = this.censusData[0].occupations;
      const occupationNames = {
        management: 'Management & Professional',
        service: 'Service Occupations',
        salesOffice: 'Sales & Office',
        construction: 'Construction & Maintenance',
        production: 'Production & Transportation'
      };

      return Object.entries(occupations)
        .map(([key, percentage]) => ({
          job: occupationNames[key as keyof typeof occupationNames],
          percentage: Math.round(percentage)
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5);
    }

    // Fallback to ZIP code aggregation (old method)
    const totalPopulation = this.getDistrictPopulation();
    const aggregatedOccupations = this.censusData.reduce((acc, data) => {
      const zipPopulation = data.population;
      const weight = zipPopulation / totalPopulation;
      
      acc.management += data.occupations.management * weight;
      acc.service += data.occupations.service * weight;
      acc.salesOffice += data.occupations.salesOffice * weight;
      acc.construction += data.occupations.construction * weight;
      acc.production += data.occupations.production * weight;
      
      return acc;
    }, { management: 0, service: 0, salesOffice: 0, construction: 0, production: 0 });

    // Convert to percentages and create top occupations list
    const occupationNames = {
      management: 'Management & Professional',
      service: 'Service Occupations',
      salesOffice: 'Sales & Office',
      construction: 'Construction & Maintenance',
      production: 'Production & Transportation'
    };

    const topOccupations = Object.entries(aggregatedOccupations)
      .map(([key, percentage]) => ({
        job: occupationNames[key as keyof typeof occupationNames],
        percentage: Math.round(percentage)
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    return topOccupations;
  }

  getCensusAgeGroups() {
    if (this.censusData.length === 0) {
      return null;
    }

    // If we have district-level data (single entry), return that directly
    if (this.censusData.length === 1 && this.censusData[0].zipCode.includes('-') && this.censusData[0].ageGroups) {
      const ageGroups = this.censusData[0].ageGroups;
      const totalPopulation = this.censusData[0].population;
      
      // Define the correct age order for sorting
      const ageOrder = ['18-24', '25-34', '35-44', '45-54', '55-64', '65-74', '75+'];
      
      return Object.entries(ageGroups)
        .map(([ageRange, count]) => ({
          ageRange,
          count,
          percentage: totalPopulation > 0 ? Math.round((count / totalPopulation) * 100) : 0
        }))
        .sort((a, b) => ageOrder.indexOf(a.ageRange) - ageOrder.indexOf(b.ageRange));
    }

    // Fallback: return null if no age data available
    return null;
  }

  getCensusEconomicIndicators() {
    if (this.censusData.length === 0) {
      return null;
    }

    // If we have district-level data (single entry), return that directly
    if (this.censusData.length === 1 && this.censusData[0].zipCode.includes('-')) {
      const data = this.censusData[0];
      return {
        medianIncome: data.medianIncome,
        homeownershipRate: data.homeownershipRate || 0,
        povertyRate: data.povertyRate || 0,
        collegeRate: data.collegeRate || 0
      };
    }

    // Fallback: return null if no economic data available
    return null;
  }

  getConstituentStats() {
    if (this.constituents.length === 0) {
      return null;
    }

    const totalIncome = this.constituents.reduce((sum, c) => sum + c.annualIncome, 0);
    const avgIncome = totalIncome / this.constituents.length;
    
    // Fix average age calculation to handle edge cases
    const validAges = this.constituents
      .map(c => c.age)
      .filter(age => typeof age === 'number' && !isNaN(age) && age > 0);
    
    const avgAge = validAges.length > 0 
      ? validAges.reduce((sum, age) => sum + age, 0) / validAges.length 
      : 0;

    const demographics = this.constituents.reduce((acc, c) => {
      acc[c.demographics] = (acc[c.demographics] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const education = this.constituents.reduce((acc, c) => {
      acc[c.education] = (acc[c.education] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Track job statistics
    const jobs = this.constituents.reduce((acc, c) => {
      acc[c.occupation] = (acc[c.occupation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get top 5 jobs
    const topJobs = Object.entries(jobs)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([job, count]) => ({ job, count, percentage: Math.round((count / this.constituents.length) * 100) }));

    return {
      totalConstituents: this.constituents.length,
      totalPopulation: this.getDistrictPopulation(),
      averageIncome: Math.round(avgIncome),
      averageAge: Math.round(avgAge),
      demographics,
      education,
      topJobs,
      incomeRange: {
        min: Math.min(...this.constituents.map(c => c.annualIncome)),
        max: Math.max(...this.constituents.map(c => c.annualIncome))
      },
      ageRange: {
        min: validAges.length > 0 ? Math.min(...validAges) : 0,
        max: validAges.length > 0 ? Math.max(...validAges) : 0
      }
    };
  }

  async clearCache() {
    this.constituents = [];
    this.censusData = [];
    this.lastDistrict = null;
    
    // Invalidate all cached constituents for the user
    await this.invalidateAllCache();
  }

  private async invalidateAllCache(): Promise<void> {
    try {
      // Get auth token from localStorage or context
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/cache/user-cache', {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        console.log('Successfully invalidated all cached data');
      } else {
        console.warn('Failed to invalidate all cached data');
      }
    } catch (error) {
      console.error('Error invalidating all cache:', error);
    }
  }
}

// Create singleton instance
export const constituentService = new ConstituentService();
export default constituentService; 