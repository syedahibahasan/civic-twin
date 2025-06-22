import { DigitalTwin, CensusData } from '../types';
import { getConstituentsForDistrict, fetchDistrictData } from './censusApi';
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
      // Fetch census data first
      const districtCensusData = await fetchDistrictData(district);
      this.censusData = districtCensusData;
      
      if (districtCensusData.length === 0) {
        throw new Error('No census data available for district');
      }

      // Use the enhanced AI service to generate realistic constituents based on Census data
      console.log(`Generating ${count} realistic constituents using AI for district ${district}`);
      const representativeData = districtCensusData[0]; // Use first ZIP/district data as representative
      
      const constituentsData = await generateConstituentsFromCensusData(representativeData, count);
      this.constituents = constituentsData;
      
      console.log(`Successfully generated ${constituentsData.length} realistic constituents`);
      return this.constituents;
    } catch (error) {
      console.error('Error fetching constituents:', error);
      // Fallback to the original method if AI generation fails
      try {
        const constituentsData = await getConstituentsForDistrict(district, count);
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

  async refreshConstituents(district: string, count: number = 10): Promise<DigitalTwin[]> {
    this.constituents = [];
    this.censusData = [];
    this.lastDistrict = null;
    return this.getConstituents(district, count);
  }

  // New method to generate common constituent types for dashboard
  async getCommonConstituentTypes(district: string): Promise<DigitalTwin[]> {
    try {
      const districtCensusData = await fetchDistrictData(district);
      if (districtCensusData.length === 0) {
        throw new Error('No census data available for district');
      }

      const representativeData = districtCensusData[0];
      
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
          const typeConstituents = await this.generateSpecificConstituentType(representativeData, type, count);
          allConstituents.push(...typeConstituents);
        } catch (error) {
          console.warn(`Failed to generate ${type} constituents, using fallback`);
          // Fallback to general generation
          const fallbackConstituents = await generateConstituentsFromCensusData(representativeData, count);
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
    // For now, we'll use the general generation and filter/transform the results
    const constituents = await generateConstituentsFromCensusData(censusData, count * 2); // Generate more to filter from
    
    // Filter and transform to match the requested type
    const filteredConstituents = constituents
      .filter(constituent => {
        const occupation = constituent.occupation.toLowerCase();
        const story = constituent.personalStory.toLowerCase();
        
        switch (type.toLowerCase()) {
          case 'student':
            return occupation.includes('student') || story.includes('student') || story.includes('college') || story.includes('university');
          case 'working professional':
            return occupation.includes('engineer') || occupation.includes('manager') || occupation.includes('analyst') || occupation.includes('consultant');
          case 'small business owner':
            return occupation.includes('owner') || occupation.includes('entrepreneur') || story.includes('business') || story.includes('company');
          case 'senior citizen':
            return constituent.age > 65 || story.includes('retire') || story.includes('senior');
          case 'parent':
            return story.includes('parent') || story.includes('child') || story.includes('family');
          case 'veteran':
            return story.includes('veteran') || story.includes('military') || story.includes('service');
          case 'healthcare worker':
            return occupation.includes('nurse') || occupation.includes('doctor') || occupation.includes('medical') || occupation.includes('healthcare');
          case 'teacher':
            return occupation.includes('teacher') || occupation.includes('professor') || occupation.includes('educator');
          default:
            return true;
        }
      })
      .slice(0, count);

    return filteredConstituents;
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

  clearCache() {
    this.constituents = [];
    this.censusData = [];
    this.lastDistrict = null;
  }
}

// Create singleton instance
export const constituentService = new ConstituentService();
export default constituentService; 