export interface Policy {
  id: string;
  title: string;
  content: string;
  summary: string;
  uploadedAt: Date;
}

export interface Congressman {
  id: string;
  name: string;
  email: string;
  district: string;
  state: string;
  party: string;
  avatar: string;
  phone?: string;
  termStart?: string;
  committee?: string;
}

export interface CensusData {
  zipCode: string;
  population: number;
  medianIncome: number;
  medianAge: number;
  educationLevels: {
    lessThanHighSchool: number;
    highSchool: number;
    someCollege: number;
    bachelors: number;
    graduate: number;
  };
  demographics: {
    white: number;
    black: number;
    hispanic: number;
    asian: number;
    other: number;
  };
  ageGroups?: {
    '18-24': number;
    '25-34': number;
    '35-44': number;
    '45-54': number;
    '55-64': number;
    '65-74': number;
    '75+': number;
  };
  occupations: {
    management: number;
    service: number;
    salesOffice: number;
    construction: number;
    production: number;
  };
  homeownershipRate?: number;
  povertyRate?: number;
  collegeRate?: number;
  incomeDistribution?: {
    'Under $25,000': number;
    '$25,000-$50,000': number;
    '$50,000-$100,000': number;
    '$100,000-$200,000': number;
    'Over $200,000': number;
  };
}

export interface DigitalTwin {
  id: string;
  name: string;
  age: number;
  education: string;
  annualIncome: number;
  occupation: string;
  demographics: string;
  zipCode: string;
  personalStory: string;
  policyImpact: string;
  politicalPolicies: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface PolicySuggestion {
  id: string;
  title: string;
  description: string;
  impactedPopulation: string;
  severity: 'low' | 'medium' | 'high';
}