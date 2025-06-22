// Test the free Census Bureau ACS API
const CENSUS_API_BASE = 'https://api.census.gov/data/2021/acs/acs5';

async function testCensusAPI() {
  try {
    console.log('Testing free Census Bureau ACS API...');
    
    // Test with a sample ZIP code
    const zipCode = '10001';
    const url = `${CENSUS_API_BASE}?get=B01003_001E,B03002_003E,B03002_004E,B03002_005E,B03002_006E,B03002_007E,B03002_012E,B19013_001E&for=zip%20code%20tabulation%20area:${zipCode}`;
    
    console.log('Requesting URL:', url);
    
    const response = await fetch(url);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      console.log('❌ API test failed:', response.status, response.statusText);
      return;
    }

    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (data && data.length >= 2) {
      console.log('✅ API test successful!');
      console.log('Total population:', data[1][0]);
      console.log('White population:', data[1][1]);
      console.log('Black population:', data[1][2]);
      console.log('Hispanic population:', data[1][6]);
      console.log('Median income:', data[1][7]);
    } else {
      console.log('❌ No data returned');
    }

  } catch (error) {
    console.error('❌ API test failed with error:', error);
  }
}

testCensusAPI(); 