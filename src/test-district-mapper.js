// Test script for the district mapper with congressional-districts library
const congressionalDistricts = require('congressional-districts');

console.log('Testing congressional-districts library...\n');

// Test 1: Get district for a ZIP code
console.log('Test 1: Get district for ZIP code 94102 (San Francisco)');
try {
  const districtInfo = congressionalDistricts.getDistrictByZip('94102');
  console.log('Result:', districtInfo);
} catch (error) {
  console.log('Error:', error.message);
}

console.log('\nTest 2: Get ZIP codes for CA-12');
try {
  const zipCodes = congressionalDistricts.getZipsByDistrict('CA', '12');
  console.log('Result:', zipCodes ? zipCodes.slice(0, 10) : null); // Show first 10
} catch (error) {
  console.log('Error:', error.message);
}

console.log('\nTest 3: Get districts for California');
try {
  const districts = congressionalDistricts.getDistrictsByState('CA');
  console.log('Result:', districts);
} catch (error) {
  console.log('Error:', error.message);
}

console.log('\nTest 4: Get all states');
try {
  const states = congressionalDistricts.getAllStates();
  console.log('Result:', states ? states.slice(0, 10) : null); // Show first 10
} catch (error) {
  console.log('Error:', error.message);
}

console.log('\nTest 5: Test multiple ZIP codes');
const testZipCodes = ['94102', '10001', '77001', '33101', '90210'];
testZipCodes.forEach(zip => {
  try {
    const districtInfo = congressionalDistricts.getDistrictByZip(zip);
    console.log(`${zip}:`, districtInfo);
  } catch (error) {
    console.log(`${zip}: Error - ${error.message}`);
  }
}); 