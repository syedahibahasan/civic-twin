import { DigitalTwin } from '../types';
import { getConstituentsForDistrict } from './censusApi';

class ConstituentService {
  private constituents: DigitalTwin[] = [];
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
      this.constituents = await getConstituentsForDistrict(district, count);
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

    return {
      totalConstituents: this.constituents.length,
      averageIncome: Math.round(avgIncome),
      averageAge: Math.round(avgAge),
      demographics,
      education,
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
    this.lastDistrict = null;
  }
}

// Create singleton instance
export const constituentService = new ConstituentService();
export default constituentService; 