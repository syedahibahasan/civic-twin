import { DigitalTwin, CensusData } from '../types';
import { getConstituentsForDistrict, fetchDistrictData } from './censusApi';

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
      // Fetch both census data and constituents
      const [districtCensusData, constituentsData] = await Promise.all([
        fetchDistrictData(district),
        getConstituentsForDistrict(district, count)
      ]);
      
      this.censusData = districtCensusData;
      this.constituents = constituentsData;
      return this.constituents;
    } catch (error) {
      console.error('Error fetching constituents:', error);
      throw error;
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

  getConstituentStats() {
    if (this.constituents.length === 0) {
      return null;
    }

    const totalIncome = this.constituents.reduce((sum, c) => sum + c.annualIncome, 0);
    const avgIncome = totalIncome / this.constituents.length;
    const avgAge = this.constituents.reduce((sum, c) => sum + c.age, 0) / this.constituents.length;

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
        min: Math.min(...this.constituents.map(c => c.age)),
        max: Math.max(...this.constituents.map(c => c.age))
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