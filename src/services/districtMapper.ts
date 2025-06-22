// District mapping service using the congressional-districts library
// This service provides ZIP code to congressional district mappings

import congressionalDistricts from 'congressional-districts';
import fs from 'fs';
import path from 'path';
import csvParse from 'csv-parse/sync';

interface DistrictMapping {
  zipCode: string;
  state: string;
  district: string;
  districtNumber: number;
}

const ZCCD_PATH = path.resolve(__dirname, '../data/zccd.csv');

interface ZipDistrictRow {
  state_fips: string;
  state_abbr: string;
  zcta: string;
  cd: string;
}

// Load and parse the CSV once at startup
let zipDistrictRows: ZipDistrictRow[] = [];
try {
  const csvData = fs.readFileSync(ZCCD_PATH, 'utf8');
  zipDistrictRows = csvParse.parse(csvData, {
    columns: true,
    skip_empty_lines: true,
  });
} catch (e) {
  console.error('Failed to load zccd.csv:', e);
}

class DistrictMapper {
  private cache: Map<string, DistrictMapping> = new Map();

  /**
   * Get congressional district for a ZIP code using the congressional-districts library
   */
  async getDistrictForZipCode(zipCode: string): Promise<DistrictMapping | null> {
    // Check cache first
    if (this.cache.has(zipCode)) {
      return this.cache.get(zipCode)!;
    }

    try {
      // Use the congressional-districts library
      const districtInfo = congressionalDistricts.getDistrictByZip(zipCode);
      
      if (districtInfo && districtInfo.state && districtInfo.district) {
        const mapping: DistrictMapping = {
          zipCode,
          state: districtInfo.state,
          district: `${districtInfo.state}-${districtInfo.district}`,
          districtNumber: parseInt(districtInfo.district, 10)
        };
        
        this.cache.set(zipCode, mapping);
        return mapping;
      }
    } catch (error) {
      console.warn(`Failed to get district for ZIP ${zipCode}:`, error);
    }

    return null;
  }

  /**
   * Get all ZIP codes for a congressional district
   */
  async getZipCodesForDistrict(state: string, districtNumber: number): Promise<string[]> {
    try {
      // Use the congressional-districts library to get ZIP codes for a district
      const zipCodes = congressionalDistricts.getZipsByDistrict(state, districtNumber.toString());
      
      if (zipCodes && Array.isArray(zipCodes)) {
        return zipCodes;
      }
    } catch (error) {
      console.warn(`Failed to get ZIP codes for district ${state}-${districtNumber}:`, error);
    }

    return [];
  }

  /**
   * Parse district string (e.g., "CA-12") to state and district number
   */
  parseDistrictString(districtString: string): { state: string; districtNumber: number } | null {
    const match = districtString.match(/^([A-Z]{2})-(\d+)$/);
    if (!match) return null;
    
    return {
      state: match[1],
      districtNumber: parseInt(match[2], 10)
    };
  }

  /**
   * Get ZIP codes for a district string (e.g., "CA-12")
   */
  async getZipCodesForDistrictString(districtString: string): Promise<string[]> {
    const match = districtString.match(/^([A-Z]{2})-(\d{1,2})$/);
    if (!match) return [];
    const state = match[1];
    const cd = match[2].replace(/^0+/, ''); // Remove leading zeros
    return zipDistrictRows
      .filter(row => row.state_abbr === state && row.cd === cd)
      .map(row => row.zcta);
  }

  /**
   * Get all districts for a state
   */
  getDistrictsForState(state: string): string[] {
    try {
      const districts = congressionalDistricts.getDistrictsByState(state);
      if (districts && Array.isArray(districts)) {
        return districts.map(district => `${state}-${district}`);
      }
    } catch (error) {
      console.warn(`Failed to get districts for state ${state}:`, error);
    }

    return [];
  }

  /**
   * Get all states with their districts
   */
  getAllStatesAndDistricts(): Record<string, string[]> {
    try {
      const allStates = congressionalDistricts.getAllStates();
      const result: Record<string, string[]> = {};
      
      allStates.forEach((state: string) => {
        result[state] = this.getDistrictsForState(state);
      });
      
      return result;
    } catch (error) {
      console.warn('Failed to get all states and districts:', error);
      return {};
    }
  }

  /**
   * Validate if a district exists
   */
  isValidDistrict(state: string, districtNumber: number): boolean {
    try {
      const districts = congressionalDistricts.getDistrictsByState(state);
      return districts ? districts.includes(districtNumber.toString()) : false;
    } catch (error) {
      console.warn(`Failed to validate district ${state}-${districtNumber}:`, error);
      return false;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
export const districtMapper = new DistrictMapper();
export default districtMapper; 