// Debug script to test district-level census data
import fetch from 'node-fetch';

const CENSUS_API_BASE = 'https://api.census.gov/data/2021/acs/acs5';

function getStateFIPS(stateAbbr) {
  const stateFIPS = {
    'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09', 'DE': '10',
    'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19', 'KS': '20',
    'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
    'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36',
    'NC': '37', 'ND': '38', 'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
    'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54',
    'WI': '55', 'WY': '56', 'DC': '11'
  };
  return stateFIPS[stateAbbr] || '00';
}

async function testDistrictData(district) {
  try {
    const match = district.match(/^([A-Z]{2})-(\d+)$/);
    if (!match) {
      console.error(`Invalid district format: ${district}`);
      return;
    }
    
    const state = match[1];
    const cd = match[2].replace(/^0+/, '');
    
    const url = `${CENSUS_API_BASE}?get=B01003_001E,B03002_003E,B03002_004E,B03002_005E,B03002_006E,B03002_007E,B03002_012E,B19013_001E,B15003_022E,B15003_023E,B15003_024E,B15003_025E,B24010_001E,B24010_002E,B24010_003E,B24010_004E,B24010_005E,B24010_006E&for=congressional%20district:${cd}&in=state:${getStateFIPS(state)}`;
    
    console.log(`\n🔍 Testing district: ${district}`);
    console.log(`📡 URL: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch data: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    
    if (!data || data.length < 2) {
      console.error(`❌ No data returned for ${district}`);
      return;
    }

    const row = data[1];
    const totalPopulation = parseInt(row[0]) || 0;
    
    console.log(`✅ Success! District ${district} population: ${totalPopulation.toLocaleString()}`);
    console.log(`📊 Raw data length: ${row.length} fields`);
    console.log(`🔢 Population field: ${row[0]}`);
    
    return { district, population: totalPopulation, data: row };
    
  } catch (error) {
    console.error(`❌ Error testing ${district}:`, error.message);
    return null;
  }
}

// Test the district-level approach
async function runDistrictTest() {
  console.log('🚀 Testing district-level census data...\n');
  
  const results = [];
  
  // Test a few districts
  const testDistricts = ['CA-12', 'NY-12', 'TX-29'];
  
  for (const district of testDistricts) {
    const result = await testDistrictData(district);
    if (result) {
      results.push(result);
    }
  }
  
  console.log('\n📋 Summary:');
  console.log('==========');
  results.forEach(r => {
    console.log(`${r.district}: ${r.population.toLocaleString()} people`);
  });
  
  return results;
}

// Also test the old ZIP code approach for comparison
async function testZipCodeApproach(district) {
  try {
    console.log(`\n🔍 Testing ZIP code approach for ${district}...`);
    
    // Test the backend ZIP code endpoint
    const response = await fetch(`http://localhost:3001/api/districts/zipcodes/${district}`);
    
    if (!response.ok) {
      console.error(`❌ ZIP code endpoint failed: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log(`📦 Found ${data.zipCodes.length} ZIP codes for ${district}`);
    console.log(`📋 First 5 ZIP codes: ${data.zipCodes.slice(0, 5).join(', ')}`);
    
    return data.zipCodes;
    
  } catch (error) {
    console.error(`❌ Error testing ZIP approach:`, error.message);
    return null;
  }
}

async function runFullTest() {
  console.log('🔬 Full Debug Test\n');
  
  // Test district-level approach
  const districtResults = await runDistrictTest();
  
  // Test ZIP code approach for comparison
  if (districtResults.length > 0) {
    await testZipCodeApproach(districtResults[0].district);
  }
  
  console.log('\n✅ Debug test completed!');
}

runFullTest(); 