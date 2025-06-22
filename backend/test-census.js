import fetch from 'node-fetch';

const CENSUS_API_BASE = 'https://api.census.gov/data/2021/acs/acs5';

// Helper function to convert state abbreviation to FIPS code
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

async function testCensusAPI() {
  console.log('Testing Census API for district-level data...');
  
  const district = 'CA-12';
  const match = district.match(/^([A-Z]{2})-(\d+)$/);
  
  if (!match) {
    console.error('Invalid district format');
    return;
  }
  
  const state = match[1];
  const cd = match[2];
  const stateFIPS = getStateFIPS(state);
  
  console.log(`District: ${district}, State: ${state}, CD: ${cd}, FIPS: ${stateFIPS}`);
  
  // Test with the full query from the actual code
  const fullUrl = `${CENSUS_API_BASE}?get=B01003_001E,B03002_003E,B03002_004E,B03002_006E,B03002_012E,B19013_001E,B15003_022E,B15003_023E,B15003_024E,B15003_025E,B25003_002E,B25003_003E,B17001_002E,C24010_001E,C24010_002E,C24010_003E,C24010_004E,C24010_005E,C24010_006E&for=congressional%20district:${cd}&in=state:${stateFIPS}`;
  
  console.log('Testing full query:', fullUrl);
  
  try {
    const response = await fetch(fullUrl);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const rawText = await response.text();
    console.log('Raw response:', rawText);
    console.log('Response length:', rawText.length);
    
    if (rawText && rawText.trim() !== '') {
      try {
        const data = JSON.parse(rawText);
        console.log('Parsed JSON:', data);
        console.log('Number of rows:', data.length);
        if (data.length > 1) {
          console.log('Data row:', data[1]);
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
      }
    } else {
      console.log('Empty response');
    }
    
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testCensusAPI(); 