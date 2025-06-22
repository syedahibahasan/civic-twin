declare module 'congressional-districts' {
  interface DistrictInfo {
    state: string;
    district: string;
  }

  interface CongressionalDistricts {
    getDistrictByZip(zipCode: string): DistrictInfo | null;
    getZipsByDistrict(state: string, district: string): string[] | null;
    getDistrictsByState(state: string): string[] | null;
    getAllStates(): string[];
  }

  const congressionalDistricts: CongressionalDistricts;
  export default congressionalDistricts;
} 