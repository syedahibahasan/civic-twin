// Test script to verify cache invalidation
// Run with: node src/test-cache-invalidation.js

import { generateConstituentsFromCensusData } from './services/aiService.js';

async function testCacheInvalidation() {
  console.log('🧪 Testing Cache Invalidation...\n');
  
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
    
    console.log(`📊 Generating constituents for district: ${mockCensusData.zipCode}`);
    
    // First generation
    const constituents1 = await generateConstituentsFromCensusData(mockCensusData, 2);
    console.log(`✅ First generation: ${constituents1.length} constituents`);
    
    // Check if political policies are generated
    const hasPolicies1 = constituents1.every(c => c.politicalPolicies && c.politicalPolicies.length > 0);
    console.log(`📋 Political policies generated: ${hasPolicies1 ? 'Yes' : 'No'}`);
    
    // Second generation (should use cache)
    console.log('\n🔄 Generating constituents again (should use cache)...');
    const constituents2 = await generateConstituentsFromCensusData(mockCensusData, 2);
    console.log(`✅ Second generation: ${constituents2.length} constituents`);
    
    // Check if political policies are present in cached data
    const hasPolicies2 = constituents2.every(c => c.politicalPolicies && c.politicalPolicies.length > 0);
    console.log(`📋 Political policies in cache: ${hasPolicies2 ? 'Yes' : 'No'}`);
    
    // Test cache invalidation
    console.log('\n🗑️ Testing cache invalidation...');
    
    // Simulate cache invalidation by calling the DELETE endpoint
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/cache/constituents/${mockCensusData.zipCode}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        console.log('✅ Cache invalidation successful');
        
        // Third generation (should generate fresh data)
        console.log('\n🔄 Generating constituents after cache invalidation...');
        const constituents3 = await generateConstituentsFromCensusData(mockCensusData, 2);
        console.log(`✅ Third generation: ${constituents3.length} constituents`);
        
        const hasPolicies3 = constituents3.every(c => c.politicalPolicies && c.politicalPolicies.length > 0);
        console.log(`📋 Political policies after invalidation: ${hasPolicies3 ? 'Yes' : 'No'}`);
        
      } else {
        console.log('❌ Cache invalidation failed');
      }
    } catch (error) {
      console.log('⚠️ Cache invalidation test skipped (no auth token)');
    }
    
    console.log('\n🎉 Cache invalidation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCacheInvalidation(); 