// Test script to verify political policies generation
// Run with: node src/test-political-policies.js

import { generateConstituentsFromCensusData } from './services/aiService.ts';

async function testPoliticalPolicies() {
  console.log('🧪 Testing Political Policies Generation...\n');
  
  try {
    // Create mock census data
    const mockCensusData = {
      zipCode: 'CA-12',
      population: 750000,
      medianIncome: 65000,
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
    
    console.log(`📊 Generating constituents with political policies for district: ${mockCensusData.zipCode}`);
    
    const constituents = await generateConstituentsFromCensusData(mockCensusData, 3);
    
    console.log(`✅ Generated ${constituents.length} constituents with political policies\n`);
    
    // Display constituents and their political policies
    constituents.forEach((constituent, index) => {
      console.log(`📋 Constituent #${index + 1}:`);
      console.log(`   Name: ${constituent.name}`);
      console.log(`   Age: ${constituent.age}`);
      console.log(`   Occupation: ${constituent.occupation}`);
      console.log(`   Income: $${constituent.annualIncome.toLocaleString()}`);
      console.log(`   Political Policies:`);
      if (constituent.politicalPolicies && constituent.politicalPolicies.length > 0) {
        constituent.politicalPolicies.forEach((policy, policyIndex) => {
          console.log(`     ${policyIndex + 1}. ${policy}`);
        });
      } else {
        console.log(`     No policies generated`);
      }
      console.log('');
    });
    
    console.log('🎉 Political policies generation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPoliticalPolicies(); 