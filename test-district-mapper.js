import congressionalDistricts from 'congressional-districts';

async function testDistrictMapping() {
  try {
    console.log('Testing district mapping...');
    
    // Check what methods are available
    console.log('Available methods:', Object.keys(congressionalDistricts));
    
    // Test with a sample district
    const testDistrict = 'CA-12';
    console.log(`Testing district: ${testDistrict}`);
    
    const match = testDistrict.match(/^([A-Z]{2})-(\d+)$/);
    if (!match) {
      console.log('❌ Invalid district format');
      return;
    }
    
    const state = match[1];
    const districtNumber = match[2];
    
    console.log(`State: ${state}, District: ${districtNumber}`);
    
    // Test the available methods
    console.log('\nTesting available methods:');
    
    if (congressionalDistricts.getNumOfDistricts) {
      console.log('getNumOfDistricts:', congressionalDistricts.getNumOfDistricts());
    }
    
    if (congressionalDistricts.getDistricts) {
      console.log('getDistricts:', congressionalDistricts.getDistricts());
    }
    
    if (congressionalDistricts.confirm) {
      console.log('confirm method exists');
    }
    
    // Try to get districts for California
    console.log('\nTrying to get districts for CA...');
    try {
      const caDistricts = congressionalDistricts.getDistricts('CA');
      console.log('CA districts:', caDistricts);
    } catch (e) {
      console.log('Error getting CA districts:', e.message);
    }
    
    // Try to get number of districts for CA
    console.log('\nTrying to get number of districts for CA...');
    try {
      const numDistricts = congressionalDistricts.getNumOfDistricts('CA');
      console.log('Number of districts in CA:', numDistricts);
    } catch (e) {
      console.log('Error getting number of districts:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing district mapping:', error);
  }
}

testDistrictMapping(); 