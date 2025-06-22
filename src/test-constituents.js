// Simple test script to verify constituent generation
// Run with: node src/test-constituents.js

import { getConstituentsForDistrict } from './services/censusApi.js';

async function testConstituents() {
  console.log('🧪 Testing Constituent Generation...\n');
  
  try {
    // Test with a known district
    const district = 'CA-12';
    console.log(`📊 Generating constituents for district: ${district}`);
    
    const constituents = await getConstituentsForDistrict(district, 5);
    
    console.log(`✅ Generated ${constituents.length} constituents\n`);
    
    // Display first constituent as example
    if (constituents.length > 0) {
      const example = constituents[0];
      console.log('📋 Example Constituent:');
      console.log(`   Name: ${example.name}`);
      console.log(`   Age: ${example.age}`);
      console.log(`   Education: ${example.education}`);
      console.log(`   Occupation: ${example.occupation}`);
      console.log(`   Income: $${example.annualIncome.toLocaleString()}`);
      console.log(`   Demographics: ${example.demographics}`);
      console.log(`   ZIP Code: ${example.zipCode}`);
      console.log(`   Story: ${example.personalStory.substring(0, 100)}...`);
    }
    
    console.log('\n🎉 Constituent generation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testConstituents(); 