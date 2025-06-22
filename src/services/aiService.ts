import { Policy, DigitalTwin, PolicySuggestion, CensusData, Congressman } from '../types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
  baseURL: 'https://api.openai.com/v1', // Explicitly set the base URL
});

export async function summarizePolicy(content: string, congressman?: Congressman, censusData?: CensusData): Promise<string> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`Calling OpenAI API for structured policy summary (attempt ${retryCount + 1})...`);
      console.log('API Key available:', !!import.meta.env.VITE_OPENAI_API_KEY);
      
      const systemPrompt = `You are a policy analyst summarizing legislative text. Do not rely on metadata like word count. Your job is to understand the actual content and impact of the bill.

Analyze the FULL content thoroughly and provide a detailed summary using this exact structure:

📄 BILL SUMMARY

Title of the bill (or infer from context)

What the bill proposes (in plain English)

Key provisions or changes proposed

The national or federal goal of the bill

🏛️ DISTRICT-LEVEL ANALYSIS

Congressperson: [Insert name]

District: [Insert district and state]

Use realistic demographic, economic, or educational data (e.g., Census, BLS)

Describe how this bill would likely affect the people living in this district

Call out relevant groups (e.g., low-income residents, veterans, students)

👥 CONSTITUENT IMPACT SNAPSHOT

Name 3–5 types of constituents directly impacted

Describe the nature of the impact (positive/negative/neutral)

Mention if the district has higher-than-average presence of any impacted group

📌 RELEVANCE SCORE

Score 1–5: how directly this bill affects the district

Justify your score using the bill's content and the district's demographics

Be extremely thorough, analytical, and detailed. Focus on the actual legislative content, specific provisions, and real-world implications. Use concrete examples and data-driven analysis.`;

      const userPrompt = `Analyze this policy document for ${congressman ? `${congressman.name} (${congressman.district}, ${congressman.state})` : 'CA-12 (San Francisco)'}:

${content}

${censusData ? `Census Data for ZIP ${censusData.zipCode}:
- Population: ${censusData.population.toLocaleString()}
- Median Income: $${censusData.medianIncome.toLocaleString()}
- Median Age: ${censusData.medianAge}
- Education: ${censusData.educationLevels.bachelors}% Bachelor's, ${censusData.educationLevels.highSchool}% High School
- Demographics: ${censusData.demographics.white}% White, ${censusData.demographics.hispanic}% Hispanic, ${censusData.demographics.asian}% Asian, ${censusData.demographics.black}% Black` : ''}

District Context: ${congressman ? `${congressman.district} (${congressman.state})` : 'CA-12 (San Francisco)'} is a diverse district with significant federal presence, tech industry, and strong commitment to diversity and inclusion programs. The district has high education levels, significant Asian and Hispanic populations, and many federal employees and contractors.

Provide a comprehensive, detailed analysis focusing on the actual legislative content and real-world implications.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });

      console.log('OpenAI response received:', completion.choices[0]?.message?.content);
      return completion.choices[0]?.message?.content || 'Unable to generate summary';
    } catch (error) {
      console.error(`Attempt ${retryCount + 1} failed:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          retryCount++;
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`Rate limited. Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            console.log('Max retries reached, using fallback summary');
            return generateStructuredFallbackSummary(content, congressman, censusData);
          }
        }
        if (error.message.includes('CORS')) {
          console.log('CORS error detected, using fallback summary');
          return generateStructuredFallbackSummary(content, congressman, censusData);
        }
        if (error.message.includes('401')) {
          return 'Authentication error: Please check your OpenAI API key.';
        }
      }
      
      console.log('Using fallback summary due to error');
      return generateStructuredFallbackSummary(content, congressman, censusData);
    }
  }
  
  return generateStructuredFallbackSummary(content, congressman, censusData);
}

function generateStructuredFallbackSummary(content: string, congressman?: Congressman, censusData?: CensusData): string {
  // Simple fallback that extracts key information from the content
  const words = content.toLowerCase().split(/\s+/);
  const wordCount = words.length;
  
  // Handle very short content
  if (wordCount < 5) {
    const wordText = wordCount === 1 ? 'word' : 'words';
    return `📄 BILL SUMMARY\n\nTitle of the bill: Document Analysis\n\nThe provided text "${content}" is very brief (${wordCount} ${wordText}). For meaningful policy analysis, please provide a more detailed policy document, bill text, or legislative content.\n\nKey provisions or changes proposed: Unable to determine due to limited content\n\nThe national or federal goal of the bill: Unable to determine\n\n🏛️ DISTRICT-LEVEL ANALYSIS\n\nCongressperson: ${congressman?.name || 'Not specified'}\n\nDistrict: ${congressman?.district || 'Not specified'}, ${congressman?.state || 'Not specified'}\n\nUse realistic demographic, economic, or educational data: Insufficient content for detailed demographic analysis\n\nDescribe how this bill would likely affect the people living in this district: Unable to determine due to limited content\n\nCall out relevant groups: Unable to identify specific groups due to insufficient content\n\n👥 CONSTITUENT IMPACT SNAPSHOT\n\nName 3–5 types of constituents directly impacted: Unable to determine due to limited content\n\nDescribe the nature of the impact: Unable to determine\n\nMention if the district has higher-than-average presence of any impacted group: Unable to determine\n\n📌 RELEVANCE SCORE\n\nScore 1–5: 1\n\nJustify your score: Insufficient content for meaningful analysis`;
  }
  
  // Look for common policy-related keywords
  const keywords = ['policy', 'bill', 'act', 'law', 'regulation', 'funding', 'education', 'health', 'tax', 'benefit', 'student', 'financial', 'aid', 'grant', 'program', 'diversity', 'inclusion', 'equity', 'dei', 'veteran', 'senior', 'disability', 'environment', 'climate', 'energy', 'transportation', 'housing', 'immigration'];
  const foundKeywords = keywords.filter(keyword => content.toLowerCase().includes(keyword));
  
  // Look for dollar amounts
  const dollarMatches = content.match(/\$[\d,]+(?:\.\d{2})?/g);
  const dollarAmounts = dollarMatches ? dollarMatches.slice(0, 3) : [];
  
  // Look for percentages
  const percentMatches = content.match(/\d+(?:\.\d+)?%/g);
  const percentages = percentMatches ? percentMatches.slice(0, 3) : [];
  
  // Check if content seems like policy text
  const hasPolicyKeywords = foundKeywords.length > 0;
  const hasNumbers = /\d/.test(content);
  const hasFormalLanguage = /(shall|must|required|prohibited|authorized|appropriated)/i.test(content);
  
  const wordText = wordCount === 1 ? 'word' : 'words';
  
  // Determine bill title from keywords
  let billTitle = 'Policy Document Analysis';
  if (content.toLowerCase().includes('diversity') || content.toLowerCase().includes('inclusion') || content.toLowerCase().includes('equity')) {
    billTitle = 'Diversity and Inclusion Policy';
  } else if (content.toLowerCase().includes('education') || content.toLowerCase().includes('student')) {
    billTitle = 'Education Policy';
  } else if (content.toLowerCase().includes('health') || content.toLowerCase().includes('medical')) {
    billTitle = 'Healthcare Policy';
  } else if (content.toLowerCase().includes('environment') || content.toLowerCase().includes('climate')) {
    billTitle = 'Environmental Policy';
  }
  
  let summary = `📄 BILL SUMMARY\n\nTitle of the bill: ${billTitle}\n\nThis document contains approximately ${wordCount} ${wordText}`;
  
  if (hasPolicyKeywords) {
    summary += ` and addresses ${foundKeywords.slice(0, 3).join(', ')} related matters`;
  } else if (hasFormalLanguage) {
    summary += ` and contains legislative or regulatory language`;
  } else if (hasNumbers) {
    summary += ` and includes numerical data and funding information`;
  } else {
    summary += ` and may not be a formal policy document`;
  }
  
  if (dollarAmounts.length > 0) {
    summary += `. Funding amounts include ${dollarAmounts.join(', ')}`;
  }
  
  if (percentages.length > 0) {
    summary += `. Changes of ${percentages.join(', ')}`;
  }
  
  summary += `\n\nKey provisions or changes proposed: ${hasPolicyKeywords ? `Addresses ${foundKeywords.slice(0, 3).join(', ')} related provisions` : 'Unable to determine specific provisions from content'}`;
  
  // Determine national goal based on keywords
  let nationalGoal = 'To implement legislative changes as outlined';
  if (content.toLowerCase().includes('diversity') || content.toLowerCase().includes('inclusion') || content.toLowerCase().includes('equity')) {
    nationalGoal = 'To address diversity, equity, and inclusion matters at the federal level';
  } else if (content.toLowerCase().includes('funding') || content.toLowerCase().includes('appropriation')) {
    nationalGoal = 'To modify federal funding allocations and priorities';
  } else if (content.toLowerCase().includes('education') || content.toLowerCase().includes('student')) {
    nationalGoal = 'To reform educational programs and policies nationwide';
  } else if (content.toLowerCase().includes('health') || content.toLowerCase().includes('medical')) {
    nationalGoal = 'To improve healthcare access and delivery systems';
  }
  
  summary += `\n\nThe national or federal goal of the bill: ${nationalGoal}`;
  
  // District-level analysis
  summary += `\n\n🏛️ DISTRICT-LEVEL ANALYSIS\n\nCongressperson: ${congressman?.name || 'Not specified'}\n\nDistrict: ${congressman?.district || 'Not specified'}, ${congressman?.state || 'Not specified'}\n\nUse realistic demographic, economic, or educational data: `;
  
  if (censusData) {
    summary += `Based on Census data for ZIP ${censusData.zipCode}, the district has a population of ${censusData.population.toLocaleString()}, median income of $${censusData.medianIncome.toLocaleString()}, median age of ${censusData.medianAge}, and education levels of ${censusData.educationLevels.bachelors}% Bachelor's degrees and ${censusData.educationLevels.highSchool}% High School graduates. Demographics show ${censusData.demographics.white}% White, ${censusData.demographics.hispanic}% Hispanic, ${censusData.demographics.asian}% Asian, and ${censusData.demographics.black}% Black residents.`;
  } else {
    summary += 'District demographic data not available for detailed analysis.';
  }
  
  summary += `\n\nDescribe how this bill would likely affect the people living in this district: `;
  
  if (censusData) {
    summary += `Given the district's demographics with ${censusData.demographics.hispanic}% Hispanic and ${censusData.demographics.asian}% Asian populations, and ${censusData.educationLevels.bachelors}% with higher education, this policy could significantly impact federal employees, tech workers, and communities that rely on federal programs. The median income of $${censusData.medianIncome.toLocaleString()} suggests many residents may be affected by changes to federal funding or programs.`;
  } else {
    summary += 'The impact would depend on the specific policy focus, but could affect federal employees, contractors, and communities that rely on federal programs.';
  }
  
  summary += `\n\nCall out relevant groups: `;
  
  if (censusData) {
    summary += `Low-income residents (given median income of $${censusData.medianIncome.toLocaleString()}), students and educators (${censusData.educationLevels.bachelors}% with higher education), Hispanic and Asian communities (${censusData.demographics.hispanic}% and ${censusData.demographics.asian}% respectively), and federal employees/contractors.`;
  } else {
    summary += 'Federal employees, contractors, students, low-income residents, and communities that rely on federal programs.';
  }
  
  // Constituent impact snapshot
  summary += `\n\n👥 CONSTITUENT IMPACT SNAPSHOT\n\nName 3–5 types of constituents directly impacted:\n\n1. Federal Employees: May be affected by changes to federal programs and office structures\n2. Tech Industry Workers: Could see impacts on federal contracts and diversity initiatives\n3. Students and Educators: May experience changes in federal educational programs\n4. Low-Income Residents: Could be affected by modifications to federal assistance programs\n5. Small Business Owners: May see changes in federal contracting and support programs`;
  
  summary += `\n\nDescribe the nature of the impact: The specific impact depends on the policy's focus, but could range from positive (increased funding for certain programs) to negative (reduced services or job losses) to neutral (administrative changes with minimal direct impact).`;
  
  summary += `\n\nMention if the district has higher-than-average presence of any impacted group: `;
  
  if (censusData) {
    summary += `Yes, this district has higher-than-average education levels (${censusData.educationLevels.bachelors}% with Bachelor's degrees) and significant diversity (${censusData.demographics.hispanic}% Hispanic, ${censusData.demographics.asian}% Asian), which may make federal employees, tech workers, and educated professionals more prevalent than in other districts.`;
  } else {
    summary += 'The district likely has higher-than-average presence of federal employees, tech workers, and educated professionals given its urban nature and federal presence.';
  }
  
  // Relevance score
  let relevanceScore = 3;
  let scoreReason = 'Moderate relevance based on general policy content';
  
  if (hasPolicyKeywords && hasFormalLanguage) {
    relevanceScore = 4;
    scoreReason = 'High relevance due to formal policy language and specific keywords';
  } else if (!hasPolicyKeywords && !hasFormalLanguage) {
    relevanceScore = 2;
    scoreReason = 'Low relevance - content may not be formal policy material';
  }
  
  // Adjust for district context
  if (content.toLowerCase().includes('diversity') || content.toLowerCase().includes('inclusion') || content.toLowerCase().includes('equity')) {
    relevanceScore = Math.min(5, relevanceScore + 1);
    scoreReason += ' - particularly relevant given the district\'s commitment to diversity and inclusion';
  }
  
  if (censusData && censusData.educationLevels.bachelors > 30) {
    relevanceScore = Math.min(5, relevanceScore + 1);
    scoreReason += ' - high education levels make federal policy changes more impactful';
  }
  
  summary += `\n\n📌 RELEVANCE SCORE\n\nScore 1–5: ${relevanceScore}\n\nJustify your score: ${scoreReason}`;
  
  return summary;
}

export async function generateDigitalTwins(censusData: CensusData, policy: Policy): Promise<DigitalTwin[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are creating realistic digital twin constituents based on Census data for ZIP code ${censusData.zipCode}. Generate 4 diverse individuals with realistic demographics, occupations, and personal stories. Each twin should have a unique perspective on how the policy affects them.`
        },
        {
          role: "user",
          content: `Create 4 digital twin constituents for ZIP code ${censusData.zipCode} based on this policy:\n\n${policy.summary}\n\nReturn a JSON array with objects containing: id, name, age, education, annualIncome, occupation, demographics, zipCode, personalStory, policyImpact`
        }
      ],
      max_tokens: 1000,
      temperature: 0.8,
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      try {
        const twins = JSON.parse(response) as DigitalTwin[];
        return twins.map((twin: DigitalTwin, index: number) => ({
          ...twin,
          id: `twin-${index + 1}`,
          zipCode: censusData.zipCode,
        }));
      } catch (parseError) {
        console.error('Error parsing twins response:', parseError);
        return generateFallbackTwins(censusData);
      }
    }
    
    return generateFallbackTwins(censusData);
  } catch (error) {
    console.error('Error generating digital twins:', error);
    return generateFallbackTwins(censusData);
  }
}

<<<<<<< Updated upstream
function generateFallbackTwins(censusData: CensusData): DigitalTwin[] {
  const names = ['Constituent #1', 'Constituent #2', 'Constituent #3', 'Constituent #4'];
  const occupations = ['Student', 'Retail Worker', 'Teacher', 'Nurse'];
  const educationLevels = ['High School', 'Some College', "Bachelor's Degree", "Associate's Degree"];
  
  return names.map((name, index) => ({
    id: `twin-${index + 1}`,
    name,
    age: Math.floor(Math.random() * 30) + 20,
    education: educationLevels[Math.floor(Math.random() * educationLevels.length)],
    annualIncome: Math.floor(Math.random() * 40000) + 25000,
    occupation: occupations[Math.floor(Math.random() * occupations.length)],
    demographics: Math.random() > 0.5 ? 'Hispanic/Latino' : 'White',
    zipCode: censusData.zipCode,
    personalStory: `I'm ${name}, a ${Math.floor(Math.random() * 30) + 20}-year-old living in ${censusData.zipCode}. I work part-time while pursuing my education and depend on financial aid to make ends meet.`,
    policyImpact: index % 2 === 0 
      ? 'This policy would significantly reduce my financial aid eligibility, making it harder for me to continue my education.'
      : 'While this policy might provide new opportunities through work-study programs, the increased credit requirements could be challenging to meet.',
  }));
=======
async function extractSpecificPolicyDetailsFromSummary(policySummary: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Extract specific details from this policy summary that would directly impact people. Focus on:

1. SPECIFIC DOLLAR AMOUNTS: Any funding amounts, thresholds, caps, or financial limits mentioned
2. SPECIFIC PERCENTAGES: Any percentage changes, rates, or proportions mentioned
3. SPECIFIC GROUPS: Exact groups mentioned in the constituent impact snapshot (e.g., "students with federal loans", "families earning under $75,000")
4. SPECIFIC PROVISIONS: Exact policy provisions that affect people directly
5. SPECIFIC TIMELINES: Any deadlines, phase-in periods, or effective dates
6. SPECIFIC ELIGIBILITY: Any eligibility criteria, income limits, or requirements
7. RELEVANCE SCORE: The relevance score and justification for the district
8. DISTRICT IMPACT: How the bill would affect the specific district mentioned
9. TARGET DEMOGRAPHICS: Specific demographic groups that would be most impacted
10. ECONOMIC IMPACT: Any economic factors, income levels, or financial considerations

Return this information in a structured format that can be used to generate realistic constituent profiles. Be specific about dollar amounts, percentages, and target groups.`
        },
        {
          role: "user",
          content: `Extract specific policy details from this summary:\n\n${policySummary}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content || 'Policy details unavailable';
  } catch (error) {
    console.error('Error extracting policy details from summary:', error);
    return 'Policy details unavailable';
  }
}

function generateFallbackTwinsFromSummary(censusData: CensusData, policy: Policy): DigitalTwin[] {
  // Analyze the policy summary for specific details
  const policySummary = policy.summary.toLowerCase();
  
  // Extract specific policy information from the summary
  const dollarAmounts = policySummary.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
  const percentages = policySummary.match(/\d+(?:\.\d+)?%/g) || [];
  const incomeLimits = policySummary.match(/(?:income|earn|salary).*?\$[\d,]+/g) || [];
  
  // Look for specific groups mentioned in the summary
  const hasStudents = policySummary.includes('student') || policySummary.includes('education') || policySummary.includes('loan');
  const hasHealthcare = policySummary.includes('health') || policySummary.includes('medical') || policySummary.includes('care') || policySummary.includes('insurance');
  const hasHousing = policySummary.includes('housing') || policySummary.includes('rent') || policySummary.includes('home') || policySummary.includes('property');
  const hasTax = policySummary.includes('tax') || policySummary.includes('deduction') || policySummary.includes('credit') || policySummary.includes('refund');
  const hasSocialSecurity = policySummary.includes('social security') || policySummary.includes('retirement') || policySummary.includes('pension');
  const hasVeteran = policySummary.includes('veteran') || policySummary.includes('military') || policySummary.includes('service member');
  const hasImmigration = policySummary.includes('immigration') || policySummary.includes('immigrant') || policySummary.includes('citizenship');
  const hasClimate = policySummary.includes('climate') || policySummary.includes('environment') || policySummary.includes('green') || policySummary.includes('renewable');
  const hasLowIncome = policySummary.includes('low-income') || policySummary.includes('poverty') || policySummary.includes('low income');
  const hasSeniors = policySummary.includes('senior') || policySummary.includes('elderly') || policySummary.includes('retiree');
  const hasSmallBusiness = policySummary.includes('small business') || policySummary.includes('entrepreneur') || policySummary.includes('business owner');
  
  // Select relevant occupations based on the summary analysis
  let relevantOccupations = ['Student', 'Teacher', 'Nurse', 'Small Business Owner'];
  let targetGroups = [];
  
  if (hasStudents) {
    relevantOccupations = ['Student', 'Teacher', 'School Administrator', 'Parent', 'College Professor', 'Student Loan Borrower'];
    targetGroups = ['students', 'borrowers', 'parents', 'educators'];
  } else if (hasHealthcare) {
    relevantOccupations = ['Nurse', 'Doctor', 'Patient', 'Healthcare Administrator', 'Medical Assistant', 'Uninsured Person'];
    targetGroups = ['patients', 'healthcare workers', 'uninsured', 'seniors'];
  } else if (hasHousing) {
    relevantOccupations = ['Renter', 'Homeowner', 'Real Estate Agent', 'Property Manager', 'Construction Worker', 'First-time Homebuyer'];
    targetGroups = ['renters', 'homeowners', 'first-time buyers', 'property owners'];
  } else if (hasTax) {
    relevantOccupations = ['Small Business Owner', 'Accountant', 'Tax Preparer', 'Retiree', 'Working Parent', 'Freelancer'];
    targetGroups = ['taxpayers', 'small business owners', 'retirees', 'families'];
  } else if (hasSocialSecurity) {
    relevantOccupations = ['Retiree', 'Social Security Recipient', 'Senior Citizen', 'Disabled Worker', 'Widow/Widower'];
    targetGroups = ['seniors', 'retirees', 'disabled workers', 'survivors'];
  } else if (hasVeteran) {
    relevantOccupations = ['Veteran', 'Active Duty Service Member', 'Military Spouse', 'Veteran Affairs Employee'];
    targetGroups = ['veterans', 'service members', 'military families'];
  } else if (hasImmigration) {
    relevantOccupations = ['Immigrant', 'Refugee', 'DACA Recipient', 'Immigration Attorney', 'Community Organizer'];
    targetGroups = ['immigrants', 'refugees', 'undocumented', 'legal residents'];
  } else if (hasClimate) {
    relevantOccupations = ['Environmental Scientist', 'Solar Installer', 'Electric Vehicle Owner', 'Energy Worker', 'Environmental Activist'];
    targetGroups = ['energy workers', 'environmental advocates', 'green technology workers'];
  }
  
  // Add specific groups based on summary mentions
  if (hasLowIncome) {
    relevantOccupations.push('Low-Income Worker', 'Service Worker', 'Part-time Employee');
    targetGroups.push('low-income families', 'service workers');
  }
  if (hasSeniors) {
    relevantOccupations.push('Retiree', 'Senior Citizen', 'Social Security Recipient');
    targetGroups.push('seniors', 'retirees');
  }
  if (hasSmallBusiness) {
    relevantOccupations.push('Small Business Owner', 'Entrepreneur', 'Freelancer');
    targetGroups.push('small business owners', 'entrepreneurs');
  }
  
  // Generate unique names based on demographics
  const generateUniqueName = (demographics: string, index: number) => {
    const names = [
      'Sarah Johnson', 'Michael Chen', 'Maria Rodriguez', 'David Thompson', 'Lisa Williams',
      'James Martinez', 'Jennifer Lee', 'Robert Garcia', 'Amanda Davis', 'Christopher Brown',
      'Jessica Wilson', 'Daniel Anderson', 'Ashley Taylor', 'Matthew Moore', 'Nicole Jackson',
      'Andrew White', 'Stephanie Harris', 'Joshua Clark', 'Rachel Lewis', 'Kevin Hall',
      'Emily Young', 'Ryan Allen', 'Brittany King', 'Brandon Wright', 'Megan Green',
      'Tyler Baker', 'Lauren Adams', 'Nathan Nelson', 'Kayla Carter', 'Justin Mitchell'
    ];
    return names[index % names.length];
  };
  
  // Generate realistic education based on Census distribution
  const generateRealisticEducation = () => {
    const rand = Math.random() * 100;
    if (rand < censusData.educationLevels.lessThanHighSchool) {
      return 'Less than High School';
    } else if (rand < censusData.educationLevels.lessThanHighSchool + censusData.educationLevels.highSchool) {
      return 'High School';
    } else if (rand < censusData.educationLevels.lessThanHighSchool + censusData.educationLevels.highSchool + censusData.educationLevels.someCollege) {
      return 'Some College';
    } else if (rand < censusData.educationLevels.lessThanHighSchool + censusData.educationLevels.highSchool + censusData.educationLevels.someCollege + censusData.educationLevels.bachelors) {
      return "Bachelor's Degree";
    } else {
      return "Master's Degree";
    }
  };
  
  // Generate realistic income based on Census median and summary context
  const generateRealisticIncome = (education: string, occupation: string) => {
    const baseIncome = censusData.medianIncome;
    let multiplier = 1.0;
    
    // Adjust based on education level from Census data
    if (education.includes('Master') || education.includes('Doctorate')) {
      multiplier = 1.5 + Math.random() * 0.5;
    } else if (education.includes('Bachelor')) {
      multiplier = 1.0 + Math.random() * 0.3;
    } else if (education.includes('Some College')) {
      multiplier = 0.8 + Math.random() * 0.2;
    } else if (education.includes('High School')) {
      multiplier = 0.7 + Math.random() * 0.2;
    } else {
      multiplier = 0.5 + Math.random() * 0.3;
    }
    
    // Adjust for occupation and summary context
    if (occupation.includes('Student')) {
      multiplier = 0.3 + Math.random() * 0.3;
    } else if (occupation.includes('Doctor') || occupation.includes('Professor')) {
      multiplier = 1.8 + Math.random() * 0.5;
    } else if (occupation.includes('Retiree') || occupation.includes('Senior')) {
      multiplier = 0.7 + Math.random() * 0.3;
    } else if (occupation.includes('Small Business')) {
      multiplier = 1.2 + Math.random() * 0.4;
    } else if (hasLowIncome && occupation.includes('Low-Income')) {
      multiplier = 0.4 + Math.random() * 0.3;
    }
    
    return Math.floor(baseIncome * multiplier);
  };
  
  // Generate realistic demographics based on Census data
  const generateRealisticDemographics = () => {
    const rand = Math.random() * 100;
    if (rand < censusData.demographics.white) return 'White';
    if (rand < censusData.demographics.white + censusData.demographics.hispanic) return 'Hispanic/Latino';
    if (rand < censusData.demographics.white + censusData.demographics.hispanic + censusData.demographics.black) return 'Black/African American';
    if (rand < censusData.demographics.white + censusData.demographics.hispanic + censusData.demographics.black + censusData.demographics.asian) return 'Asian';
    return 'Other';
  };
  
  // Generate realistic characteristics based on additional Census data
  const generateRealisticCharacteristics = () => {
    const characteristics = [];
    
    if (censusData.additionalData) {
      // Add veteran status based on veteran rate
      if (Math.random() * 100 < censusData.additionalData.veteranRate) {
        characteristics.push('Veteran');
      }
      
      // Add disability status based on disability rate
      if (Math.random() * 100 < censusData.additionalData.disabilityRate) {
        characteristics.push('Person with Disability');
      }
      
      // Add poverty status based on poverty rate
      if (Math.random() * 100 < censusData.additionalData.povertyRate) {
        characteristics.push('Low-Income');
      }
      
      // Add homeownership status based on homeownership rate
      if (Math.random() * 100 < censusData.additionalData.homeownershipRate) {
        characteristics.push('Homeowner');
      } else {
        characteristics.push('Renter');
      }
      
      // Add health insurance status based on health insurance rate
      if (Math.random() * 100 < censusData.additionalData.healthInsuranceRate) {
        characteristics.push('Has Health Insurance');
      } else {
        characteristics.push('No Health Insurance');
      }
    }
    
    // Add family and life circumstances that make policy relevant
    const age = Math.floor(Math.random() * 50) + 20; // 20-70 for family circumstances
    
    // Add parent status (more likely in middle age ranges)
    if (age >= 25 && age <= 55 && Math.random() < 0.6) {
      characteristics.push('Parent');
    }
    
    // Add caregiver status (more likely for middle-aged adults)
    if (age >= 35 && age <= 65 && Math.random() < 0.3) {
      characteristics.push('Caregiver');
    }
    
    // Add student loan debt (more likely for younger adults with higher education)
    if (age >= 22 && age <= 40 && Math.random() < 0.5) {
      characteristics.push('Student Loan Debt');
    }
    
    // Add small business owner (based on occupation, but also add as characteristic)
    if (Math.random() < 0.15) {
      characteristics.push('Small Business Owner');
    }
    
    // Add single parent status (subset of parents)
    if (characteristics.includes('Parent') && Math.random() < 0.3) {
      characteristics.push('Single Parent');
    }
    
    // Add immigrant status (based on demographics)
    if (Math.random() < 0.2) {
      characteristics.push('Immigrant');
    }
    
    // Add gig worker status (increasingly common)
    if (Math.random() < 0.25) {
      characteristics.push('Gig Worker');
    }
    
    // Add remote worker status (post-pandemic reality)
    if (Math.random() < 0.3) {
      characteristics.push('Remote Worker');
    }
    
    // Add essential worker status
    if (Math.random() < 0.2) {
      characteristics.push('Essential Worker');
    }
    
    // Add first-generation college student
    if (Math.random() < 0.15) {
      characteristics.push('First-Generation College Student');
    }
    
    // Add military spouse
    if (characteristics.includes('Veteran') && Math.random() < 0.1) {
      characteristics.push('Military Spouse');
    }
    
    // Add seasonal worker
    if (Math.random() < 0.1) {
      characteristics.push('Seasonal Worker');
    }
    
    // Add part-time worker
    if (Math.random() < 0.2) {
      characteristics.push('Part-Time Worker');
    }
    
    // Add multiple job holder
    if (Math.random() < 0.15) {
      characteristics.push('Multiple Job Holder');
    }
    
    // Add recent graduate
    if (age >= 22 && age <= 28 && Math.random() < 0.4) {
      characteristics.push('Recent Graduate');
    }
    
    // Add career changer
    if (age >= 30 && age <= 50 && Math.random() < 0.2) {
      characteristics.push('Career Changer');
    }
    
    // Add returning to workforce
    if (age >= 35 && age <= 55 && Math.random() < 0.15) {
      characteristics.push('Returning to Workforce');
    }
    
    return characteristics;
  };
  
  // Generate realistic age based on education and occupation
  const generateRealisticAge = (education: string, occupation: string) => {
    if (education.includes('Student') || occupation.includes('Student')) {
      return Math.floor(Math.random() * 10) + 18; // 18-27
    } else if (occupation.includes('Retiree') || occupation.includes('Senior')) {
      return Math.floor(Math.random() * 20) + 60; // 60-79
    } else if (education.includes('Master') || education.includes('Doctorate')) {
      return Math.floor(Math.random() * 15) + 25; // 25-39
    } else if (education.includes('Bachelor')) {
      return Math.floor(Math.random() * 20) + 22; // 22-41
    } else {
      return Math.floor(Math.random() * 30) + 25; // 25-54
    }
  };
  
  // Generate detailed personal story based on characteristics and policy context
  const generateDetailedPersonalStory = (name: string, age: number, occupation: string, education: string, income: number, characteristics: string[], demographics: string) => {
    let story = `I'm ${name}, a ${age}-year-old ${occupation.toLowerCase()} living in ZIP code ${censusData.zipCode}. `;
    
    // Add demographic and characteristic details with rich context
    if (characteristics.includes('Veteran')) {
      story += `I served in the military for several years and now rely on veteran benefits for healthcare and educational opportunities. The transition to civilian life has been challenging, and I'm still adjusting to finding stable employment that matches my skills. `;
    }
    if (characteristics.includes('Person with Disability')) {
      story += `I have a disability that affects my daily life and work capabilities, requiring accommodations and sometimes limiting my employment options. I worry about healthcare costs and accessibility in my community. `;
    }
    if (characteristics.includes('Low-Income')) {
      story += `I'm currently struggling to make ends meet on my limited income, often having to choose between essential expenses like rent, food, and healthcare. Every dollar counts, and I'm constantly looking for ways to stretch my budget. `;
    }
    if (characteristics.includes('Homeowner')) {
      story += `I own my home and am concerned about property values and housing costs. While I'm grateful for the stability of homeownership, I worry about rising property taxes and maintenance costs that could strain my budget. `;
    } else if (characteristics.includes('Renter')) {
      story += `I rent my home and worry about rising rent costs and housing stability. My lease is up for renewal soon, and I'm concerned about whether I'll be able to afford the increased rent or if I'll need to move to a less desirable area. `;
    }
    if (characteristics.includes('No Health Insurance')) {
      story += `I don't have health insurance and worry about medical expenses. I avoid seeking care until absolutely necessary, which could lead to more serious health problems down the road. A single medical emergency could devastate my finances. `;
    }
    
    // Add education and career details with context
    story += `I have a ${education.toLowerCase()} and work as a ${occupation.toLowerCase()}. `;
    
    // Add financial situation with detailed context
    if (income < censusData.medianIncome * 0.7) {
      story += `My annual income of $${income.toLocaleString()} is below the median for this area, so I'm particularly sensitive to any policy changes that could affect my finances. I live paycheck to paycheck and have little savings for emergencies. `;
    } else if (income > censusData.medianIncome * 1.3) {
      story += `My annual income of $${income.toLocaleString()} is above the median for this area, but I'm still concerned about how policy changes might affect my financial planning. I'm trying to save for retirement and my children's education while maintaining my current standard of living. `;
    } else {
      story += `My annual income of $${income.toLocaleString()} is around the median for this area. While I'm managing, I don't have much financial cushion and worry about unexpected expenses or changes in my circumstances. `;
    }
    
    // Add family and life circumstances with rich detail
    if (age < 30) {
      story += `I'm still early in my career and thinking about my future, including potential family planning and long-term financial goals. I'm trying to establish myself professionally while also considering whether to start a family, buy a home, or pursue further education. The decisions I make now will have long-term implications for my financial security. `;
    } else if (age > 60) {
      story += `I'm approaching or in retirement and need to carefully manage my savings and benefits. I'm concerned about healthcare costs, the adequacy of my retirement savings, and whether I'll be able to maintain my quality of life as I age. I worry about becoming a burden on my family or having to work longer than planned. `;
    } else {
      story += `I'm in the middle of my career and balancing current needs with future planning. I may have children to support, a mortgage to pay, and aging parents to care for. I'm trying to save for retirement while also helping my children with education costs and managing my own healthcare needs. `;
    }
    
    // Add specific life circumstances that make policy relevant
    if (characteristics.includes('Parent')) {
      story += `As a parent, I'm constantly thinking about how policy changes might affect my children's future opportunities, education, and quality of life. I want to ensure they have access to good schools, healthcare, and opportunities to succeed. `;
    }
    if (characteristics.includes('Caregiver')) {
      story += `I'm also a caregiver for an aging parent, which adds both emotional and financial stress to my situation. I worry about their healthcare needs and whether I'll be able to provide the support they need while maintaining my own financial stability. `;
    }
    if (characteristics.includes('Student Loan Debt')) {
      story += `I'm still paying off student loans from my education, which significantly impacts my monthly budget and ability to save for other goals. The debt affects my credit score and ability to qualify for other loans. `;
    }
    if (characteristics.includes('Small Business Owner')) {
      story += `Running my own business means my income can be unpredictable, and I'm particularly vulnerable to economic changes and policy shifts that might affect my customers or operating costs. `;
    }
    if (characteristics.includes('Single Parent')) {
      story += `As a single parent, I'm solely responsible for my children's well-being and financial support. This adds extra pressure to maintain stable employment and income, while also being available for my children's needs. `;
    }
    if (characteristics.includes('Immigrant')) {
      story += `As an immigrant, I'm working hard to build a better life for my family in this country. I'm concerned about how policy changes might affect my legal status, ability to work, and access to services that my family needs. `;
    }
    if (characteristics.includes('Gig Worker')) {
      story += `Working in the gig economy means my income is unpredictable and I don't have traditional employment benefits like health insurance or paid time off. I'm particularly vulnerable to policy changes that might affect my ability to work or access benefits. `;
    }
    if (characteristics.includes('Remote Worker')) {
      story += `Working remotely has changed my work-life balance and expenses, but it also means I'm more dependent on technology and internet access. Policy changes that affect remote work or digital infrastructure could significantly impact my employment. `;
    }
    if (characteristics.includes('Essential Worker')) {
      story += `As an essential worker, I've been on the front lines during challenging times. While I'm grateful for my job security, I worry about workplace safety, fair compensation, and access to benefits that reflect the importance of my work. `;
    }
    if (characteristics.includes('First-Generation College Student')) {
      story += `As a first-generation college student, I'm navigating higher education without family experience to guide me. I'm concerned about the cost of education and whether the investment will pay off in terms of career opportunities and financial stability. `;
    }
    if (characteristics.includes('Military Spouse')) {
      story += `As a military spouse, I've had to adapt to frequent moves and the challenges of maintaining a career while supporting my partner's service. I worry about employment opportunities, healthcare access, and the stability of our family life. `;
    }
    if (characteristics.includes('Seasonal Worker')) {
      story += `Working seasonally means my income fluctuates throughout the year, making it difficult to plan for long-term expenses or save consistently. I'm particularly sensitive to policy changes that might affect seasonal employment opportunities. `;
    }
    if (characteristics.includes('Part-Time Worker')) {
      story += `Working part-time means I don't have access to full benefits and my income is limited. I'm looking for ways to increase my hours or find additional work to make ends meet and build financial security. `;
    }
    if (characteristics.includes('Multiple Job Holder')) {
      story += `Working multiple jobs to make ends meet is exhausting and leaves little time for family or personal pursuits. I'm constantly juggling schedules and worried about what would happen if I lost one of my income sources. `;
    }
    if (characteristics.includes('Recent Graduate')) {
      story += `As a recent graduate, I'm trying to establish myself in my career while dealing with student loan debt and the high cost of living. I'm concerned about finding stable employment that pays enough to cover my expenses and start building my future. `;
    }
    if (characteristics.includes('Career Changer')) {
      story += `Changing careers later in life has been both exciting and challenging. I'm starting over in many ways, which means lower income initially and the need to build new skills and networks. I'm hopeful but also worried about the financial implications. `;
    }
    if (characteristics.includes('Returning to Workforce')) {
      story += `Returning to the workforce after time away has been challenging, as I'm competing with candidates who have more recent experience. I'm concerned about finding employment that pays enough to support my family and provides the flexibility I need. `;
    }
    
    return story;
  };
  
  // Generate detailed policy impact analysis
  const generateDetailedPolicyImpact = (occupation: string, characteristics: string[], income: number) => {
    let impact = '';
    
    if (hasStudents) {
      if (occupation.includes('Student')) {
        const loanAmount = dollarAmounts.length > 0 ? dollarAmounts[0] : '$25,000';
        const percentage = percentages.length > 0 ? percentages[0] : 'changes to';
        impact = `This policy would directly impact my student loan situation. I currently have ${loanAmount} in federal student loans, and the ${percentage} student loan provisions would significantly affect my monthly payments and overall debt burden. `;
        impact += `If the policy provides loan forgiveness, it could reduce my debt by a substantial amount, allowing me to save for other goals like buying a home or starting a family. `;
        impact += `However, I'm concerned about the eligibility requirements and whether I'll qualify for the benefits. I also worry about the long-term implications for future students and the overall cost of education. `;
        impact += `The immediate impact would be on my monthly budget - if my payments are reduced or forgiven, I could redirect that money toward rent, savings, or other essential expenses. `;
        impact += `Long-term, this could affect my ability to qualify for a mortgage, start a business, or make other major financial decisions. `;
      } else if (occupation.includes('Teacher')) {
        impact = `As an educator, this policy could significantly impact my students and our school's resources. `;
        impact += `If it provides more funding for education, it could help us improve classroom resources, reduce class sizes, or provide better support services. `;
        impact += `I'm particularly concerned about how this might affect students from low-income families and whether it will help reduce educational disparities. `;
        impact += `The policy could also impact my own professional development opportunities and salary prospects. `;
        impact += `Immediately, this could affect my classroom budget and ability to provide materials for my students. `;
        impact += `Long-term, it could influence teacher retention, school quality, and the overall educational outcomes in our community. `;
      }
    } else if (hasHealthcare) {
      if (occupation.includes('Nurse')) {
        impact = `Working in healthcare, I see firsthand how policy changes affect patient care and access. `;
        impact += `This policy could impact healthcare delivery systems, patient access to care, and the overall quality of healthcare services in our community. `;
        impact += `I'm concerned about how it might affect staffing levels, resource allocation, and the ability to provide quality care to all patients. `;
        impact += `The policy could also impact my own healthcare benefits and working conditions. `;
        impact += `Immediately, this could affect my workload, patient ratios, and access to necessary medical supplies and equipment. `;
        impact += `Long-term, it could influence healthcare costs, quality of care, and the sustainability of our healthcare system. `;
      } else if (characteristics.includes('No Health Insurance')) {
        const costAmount = dollarAmounts.length > 0 ? dollarAmounts[0] : 'healthcare costs';
        impact = `This policy could significantly impact my access to affordable healthcare. `;
        impact += `Currently without health insurance, I worry about medical expenses and avoid seeking care until absolutely necessary. `;
        impact += `If this policy expands healthcare access or reduces costs, it could change my ability to get preventive care and manage chronic conditions. `;
        impact += `I'm particularly interested in how it might affect ${costAmount} and whether I'll be able to afford coverage. `;
        impact += `The immediate impact would be on my ability to seek medical care without fear of financial ruin. `;
        impact += `Long-term, this could affect my overall health outcomes, ability to work, and quality of life. `;
      }
    } else if (hasHousing) {
      if (characteristics.includes('Renter')) {
        const rentAmount = dollarAmounts.length > 0 ? dollarAmounts[0] : 'rent costs';
        impact = `This housing policy could directly affect my living situation. `;
        impact += `As a renter, I'm concerned about rising rent costs and housing stability. `;
        impact += `If this policy provides rental assistance or rent control measures, it could help me maintain stable housing and plan for the future. `;
        impact += `I'm particularly interested in how it might affect ${rentAmount} and whether it will help address the housing affordability crisis in our area. `;
        impact += `The policy could also impact my ability to save for a down payment on a home. `;
        impact += `Immediately, this could affect my monthly rent payments and housing security. `;
        impact += `Long-term, it could influence my ability to build wealth through homeownership and achieve financial stability. `;
      } else if (characteristics.includes('Homeowner')) {
        const homeValue = dollarAmounts.length > 0 ? dollarAmounts[0] : 'property values';
        impact = `This housing policy could impact my property value and housing investment. `;
        impact += `As a homeowner, I'm concerned about how policy changes might affect property values, property taxes, and the overall housing market. `;
        impact += `If this policy affects ${homeValue}, it could impact my equity and financial planning. `;
        impact += `I'm also concerned about how it might affect the availability of affordable housing for others in our community. `;
        impact += `Immediately, this could affect my property taxes and home equity. `;
        impact += `Long-term, it could influence my retirement planning and ability to pass wealth to my children. `;
      }
    } else if (hasTax) {
      const taxAmount = dollarAmounts.length > 0 ? dollarAmounts[0] : 'tax burden';
      impact = `This tax policy could significantly impact my financial situation. `;
      impact += `With my current income of $${income.toLocaleString()}, any changes to tax rates, deductions, or credits could have a substantial effect on my take-home pay and overall financial planning. `;
      impact += `I'm particularly concerned about how it might affect my ${taxAmount} and whether I'll be able to maintain my current standard of living. `;
      impact += `The policy could also impact my ability to save for retirement, pay for my children's education, or make other important financial decisions. `;
      impact += `Immediately, this would affect my monthly take-home pay and ability to cover essential expenses. `;
      impact += `Long-term, it could influence my retirement savings, investment decisions, and overall financial security. `;
    } else if (hasSocialSecurity) {
      if (occupation.includes('Retiree')) {
        const benefitAmount = dollarAmounts.length > 0 ? dollarAmounts[0] : 'benefits';
        impact = `This Social Security policy could directly affect my retirement security. `;
        impact += `I rely on Social Security benefits for a significant portion of my retirement income. `;
        impact += `If this policy affects my ${benefitAmount}, it could impact my ability to cover basic living expenses, healthcare costs, and other essential needs. `;
        impact += `I'm particularly concerned about cost-of-living adjustments and whether benefits will keep pace with inflation. `;
        impact += `The policy could also affect my long-term financial planning and the security of future retirees. `;
        impact += `Immediately, this could affect my monthly income and ability to pay for essential expenses. `;
        impact += `Long-term, it could influence my quality of life in retirement and whether I need to return to work. `;
      }
    } else if (hasVeteran) {
      if (characteristics.includes('Veteran')) {
        const benefitAmount = dollarAmounts.length > 0 ? dollarAmounts[0] : 'veteran benefits';
        impact = `This veteran policy could significantly impact my access to services and benefits. `;
        impact += `As a veteran, I rely on various benefits and services for healthcare, education, and other support. `;
        impact += `If this policy affects my ${benefitAmount}, it could impact my quality of life and ability to access necessary services. `;
        impact += `I'm particularly concerned about healthcare access, educational opportunities, and support for veterans with disabilities. `;
        impact += `The policy could also affect how the government supports veterans transitioning to civilian life. `;
        impact += `Immediately, this could affect my access to healthcare, educational benefits, and other essential services. `;
        impact += `Long-term, it could influence my career prospects, health outcomes, and overall quality of life. `;
      }
    } else if (hasImmigration) {
      if (occupation.includes('Immigrant')) {
        impact = `This immigration policy could significantly impact my family's future in this country. `;
        impact += `As an immigrant, I'm concerned about how policy changes might affect my legal status, ability to work, and access to services. `;
        impact += `The policy could impact my family's stability, my children's education, and our long-term plans. `;
        impact += `I'm particularly concerned about the application process, processing times, and whether the policy will provide a path to citizenship. `;
        impact += `The policy could also affect my ability to sponsor family members or travel internationally. `;
        impact += `Immediately, this could affect my ability to work, access services, and maintain my current lifestyle. `;
        impact += `Long-term, it could influence my family's stability, my children's opportunities, and our ability to build a future in this country. `;
      }
    } else if (hasClimate) {
      if (occupation.includes('Environmental')) {
        impact = `This environmental policy could impact my work and our community's approach to climate change. `;
        impact += `Working in environmental protection, I'm passionate about addressing climate change and promoting sustainable practices. `;
        impact += `This policy could affect environmental regulations, funding for green initiatives, and our community's environmental priorities. `;
        impact += `I'm particularly interested in how it might promote renewable energy, reduce emissions, and create green jobs. `;
        impact += `The policy could also impact my career opportunities and the overall direction of environmental policy. `;
        impact += `Immediately, this could affect my job security, work responsibilities, and professional development opportunities. `;
        impact += `Long-term, it could influence the health of our environment, economic opportunities in green industries, and the quality of life for future generations. `;
      }
    } else {
      const policyAmount = dollarAmounts.length > 0 ? dollarAmounts[0] : 'financial situation';
      impact = `This policy could have significant implications for my daily life and financial situation. `;
      impact += `With my current circumstances, any policy changes could affect my ability to maintain my standard of living and plan for the future. `;
      impact += `I'm particularly concerned about how it might affect my ${policyAmount} and whether it will help or hurt people in my situation. `;
      impact += `The policy could impact my family's stability, career opportunities, and long-term financial security. `;
      impact += `I'm interested in understanding the full implications and how it might affect our community as a whole. `;
      impact += `Immediately, this could affect my monthly budget, access to services, or employment opportunities. `;
      impact += `Long-term, it could influence my financial security, quality of life, and ability to achieve my goals. `;
    }
    
    // Add specific impact analysis based on additional characteristics
    if (characteristics.includes('Single Parent')) {
      impact += `As a single parent, I'm particularly concerned about how this policy might affect my ability to provide for my children. Any changes to my income, benefits, or access to services could have immediate consequences for my family's well-being. `;
    }
    if (characteristics.includes('Gig Worker')) {
      impact += `Working in the gig economy means I'm particularly vulnerable to policy changes that might affect my ability to work, access benefits, or maintain my income. I worry about regulations that could limit my work opportunities or increase my costs. `;
    }
    if (characteristics.includes('Remote Worker')) {
      impact += `As a remote worker, I'm concerned about how this policy might affect my work arrangements, technology access, or ability to work from home. Changes to remote work policies or digital infrastructure could significantly impact my employment. `;
    }
    if (characteristics.includes('Essential Worker')) {
      impact += `As an essential worker, I'm particularly interested in how this policy might affect workplace safety, fair compensation, and access to benefits. I want to ensure that the importance of essential work is recognized and supported. `;
    }
    if (characteristics.includes('First-Generation College Student')) {
      impact += `As a first-generation college student, I'm concerned about how this policy might affect educational access, costs, and opportunities for people like me. I want to ensure that higher education remains accessible and affordable for future generations. `;
    }
    if (characteristics.includes('Military Spouse')) {
      impact += `As a military spouse, I'm concerned about how this policy might affect my employment opportunities, healthcare access, and family stability. Military families face unique challenges that should be considered in policy decisions. `;
    }
    if (characteristics.includes('Seasonal Worker')) {
      impact += `Working seasonally means I'm particularly sensitive to policy changes that might affect seasonal employment opportunities or income stability. I need policies that support workers with fluctuating income patterns. `;
    }
    if (characteristics.includes('Part-Time Worker')) {
      impact += `As a part-time worker, I'm concerned about how this policy might affect my access to benefits, job security, and opportunities for advancement. I want to ensure that part-time workers are treated fairly and have access to necessary benefits. `;
    }
    if (characteristics.includes('Multiple Job Holder')) {
      impact += `Working multiple jobs means I'm particularly vulnerable to policy changes that might affect any of my income sources. I need policies that support workers who are trying to make ends meet through multiple employment arrangements. `;
    }
    if (characteristics.includes('Recent Graduate')) {
      impact += `As a recent graduate, I'm concerned about how this policy might affect my ability to find stable employment, pay off student loans, and build financial security. I want policies that support young people entering the workforce. `;
    }
    if (characteristics.includes('Career Changer')) {
      impact += `Changing careers means I'm particularly concerned about how this policy might affect my ability to transition successfully, access training or education, and build financial security in my new field. `;
    }
    if (characteristics.includes('Returning to Workforce')) {
      impact += `Returning to the workforce means I'm concerned about how this policy might affect my ability to find suitable employment, access training or support services, and rebuild my financial security after time away from work. `;
    }
    
    return impact;
  };
  
  return Array.from({ length: 5 }, (_, index) => {
    const education = generateRealisticEducation();
    const occupation = relevantOccupations[Math.floor(Math.random() * relevantOccupations.length)];
    const income = generateRealisticIncome(education, occupation);
    const demographics = generateRealisticDemographics();
    const characteristics = generateRealisticCharacteristics();
    const age = generateRealisticAge(education, occupation);
    const name = generateUniqueName(demographics, index);
    
    // Generate detailed personal story and policy impact
    const personalStory = generateDetailedPersonalStory(name, age, occupation, education, income, characteristics, demographics);
    const policyImpact = generateDetailedPolicyImpact(occupation, characteristics, income);
    
    return {
      id: `twin-${index + 1}`,
      name,
      age,
      education,
      annualIncome: income,
      occupation,
      demographics,
      zipCode: censusData.zipCode,
      personalStory,
      policyImpact,
    };
  });
>>>>>>> Stashed changes
}

export async function generateChatResponse(
  message: string,
  twin: DigitalTwin,
  policy: Policy
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are ${twin.name}, a ${twin.age}-year-old ${twin.occupation} from ZIP code ${twin.zipCode}. You have a ${twin.education} education and earn $${twin.annualIncome.toLocaleString()} annually. Your personal story: ${twin.personalStory}. Respond as this person would, discussing how the policy affects you personally. Keep responses conversational and under 100 words.`
        },
        {
          role: "user",
          content: `Policy: ${policy.summary}\n\nUser message: ${message}`
        }
      ],
      max_tokens: 200,
      temperature: 0.8,
    });

    return completion.choices[0]?.message?.content || 'I need to think about that for a moment.';
  } catch (error) {
    console.error('Error generating chat response:', error);
    return 'I apologize, but I\'m having trouble responding right now.';
  }
}

export async function generatePolicySuggestions(
  twins: DigitalTwin[],
  policy: Policy
): Promise<PolicySuggestion[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a policy analyst. Based on the digital twins' feedback and the policy details, generate 4 specific, actionable suggestions to improve the policy. Focus on addressing the concerns raised by the constituents."
        },
        {
          role: "user",
          content: `Policy: ${policy.summary}\n\nDigital Twins Feedback:\n${twins.map(twin => `- ${twin.name}: ${twin.policyImpact}`).join('\n')}\n\nGenerate 4 policy improvement suggestions. Return as JSON array with objects containing: id, title, description, impactedPopulation, severity (high/medium/low)`
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      try {
        const suggestions = JSON.parse(response) as PolicySuggestion[];
        return suggestions.map((suggestion: PolicySuggestion, index: number) => ({
          ...suggestion,
          id: `suggestion-${index + 1}`,
        }));
      } catch (parseError) {
        console.error('Error parsing suggestions response:', parseError);
        return generateFallbackSuggestions();
      }
    }
    
    return generateFallbackSuggestions();
  } catch (error) {
    console.error('Error generating policy suggestions:', error);
    return generateFallbackSuggestions();
  }
}

function generateFallbackSuggestions(): PolicySuggestion[] {
  return [
    {
      id: 'suggestion-1',
      title: 'Reduce Minimum Credit Hour Requirement',
      description: 'Consider lowering the credit hour requirement from 12 to 9 hours to accommodate part-time students who must work to support themselves.',
      impactedPopulation: '68% of simulated constituents would benefit',
      severity: 'high',
    },
    {
      id: 'suggestion-2',
      title: 'Implement Graduated Income Thresholds',
      description: 'Create sliding scale eligibility rather than hard income cutoffs to avoid cliff effects that penalize slight income increases.',
      impactedPopulation: '45% of simulated constituents would benefit',
      severity: 'medium',
    },
    {
      id: 'suggestion-3',
      title: 'Expand Work-Study Opportunities',
      description: 'Increase funding for work-study programs to offset reduced traditional aid eligibility.',
      impactedPopulation: '82% of simulated constituents would benefit',
      severity: 'medium',
    },
    {
      id: 'suggestion-4',
      title: 'Add Regional Cost-of-Living Adjustments',
      description: 'Adjust income thresholds based on local cost of living to ensure fair access across different geographic areas.',
      impactedPopulation: '37% of simulated constituents would benefit',
      severity: 'low',
    },
  ];
}

export async function generateConstituentsFromCensusData(censusData: CensusData, count: number = 10): Promise<DigitalTwin[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are creating realistic digital twin constituents based on Census data for ZIP code ${censusData.zipCode}. Generate ${count} diverse individuals with realistic demographics, occupations, and personal stories that match the Census data.

IMPORTANT: Ensure that:
1. Education levels match realistic career paths
2. Income levels are appropriate for the education and occupation
3. Occupations are realistic for the education level and income
4. Demographics reflect the actual Census data
5. Ages are realistic for the occupation and education level
6. Use "Constituent #X" format for names (e.g., "Constituent #1", "Constituent #2")

Return a JSON array with objects containing: id, name, age, education, annualIncome, occupation, demographics, zipCode, personalStory`
        },
        {
          role: "user",
          content: `Create ${count} realistic digital twin constituents for ZIP code ${censusData.zipCode} based on this Census data:

Population: ${censusData.population.toLocaleString()}
Median Income: $${censusData.medianIncome.toLocaleString()}
Median Age: ${censusData.medianAge}

Education Levels:
- Less than High School: ${censusData.educationLevels.lessThanHighSchool}%
- High School: ${censusData.educationLevels.highSchool}%
- Some College: ${censusData.educationLevels.someCollege}%
- Bachelor's Degree: ${censusData.educationLevels.bachelors}%
- Graduate Degree: ${censusData.educationLevels.graduate}%

Demographics:
- White: ${censusData.demographics.white}%
- Black: ${censusData.demographics.black}%
- Hispanic: ${censusData.demographics.hispanic}%
- Asian: ${censusData.demographics.asian}%
- Other: ${censusData.demographics.other}%

Generate realistic constituents that reflect this demographic and economic profile. Use "Constituent #1", "Constituent #2", etc. for names. Ensure education, occupation, and income are logically consistent.`
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      try {
        const twins = JSON.parse(response) as DigitalTwin[];
        return twins.map((twin: DigitalTwin, index: number) => ({
          ...twin,
          id: `constituent-${index + 1}`,
          name: `Constituent #${index + 1}`,
          zipCode: censusData.zipCode,
          policyImpact: 'To be determined based on policy analysis'
        }));
      } catch (parseError) {
        console.error('Error parsing constituents response:', parseError);
        console.log('Raw response:', response);
        return generateFallbackConstituents(censusData, count);
      }
    }
    
    return generateFallbackConstituents(censusData, count);
  } catch (error) {
    console.error('Error generating constituents from Census data:', error);
    return generateFallbackConstituents(censusData, count);
  }
}

function generateFallbackConstituents(censusData: CensusData, count: number): DigitalTwin[] {
  const constituents: DigitalTwin[] = [];
  
  for (let i = 0; i < count; i++) {
    const name = `Constituent #${i + 1}`;
    const age = Math.floor(Math.max(18, Math.min(85, 
      censusData.medianAge + (Math.random() - 0.5) * 30
    )));
    
    // Generate realistic income based on median
    const incomeMultiplier = 0.5 + Math.random() * 2; // 0.5x to 2.5x median
    const annualIncome = Math.floor(Math.max(30000, censusData.medianIncome * incomeMultiplier));
    
    // Select education based on Census data
    const education = selectEducationFromCensus(censusData.educationLevels);
    
    // Select occupation based on education and income
    const occupation = selectRealisticOccupation(education, annualIncome);
    
    // Select demographics based on Census data
    const demographics = selectDemographicsFromCensus(censusData.demographics);
    
    constituents.push({
      id: `constituent-${i + 1}`,
      name,
      age,
      education,
      annualIncome,
      occupation,
      demographics,
      zipCode: censusData.zipCode,
      personalStory: generatePersonalStory(name, age, education, occupation, annualIncome, demographics),
      policyImpact: 'To be determined based on policy analysis'
    });
  }
  
  return constituents;
}

function selectEducationFromCensus(educationLevels: CensusData['educationLevels']): string {
  const total = Object.values(educationLevels).reduce((sum, val) => sum + val, 0);
  const random = Math.random() * total;
  
  let cumulative = 0;
  
  if (random < (cumulative += educationLevels.lessThanHighSchool)) {
    return 'High School Diploma';
  }
  if (random < (cumulative += educationLevels.highSchool)) {
    return 'High School Diploma';
  }
  if (random < (cumulative += educationLevels.someCollege)) {
    return 'Some College';
  }
  if (random < (cumulative += educationLevels.bachelors)) {
    return 'Bachelor\'s Degree';
  }
  return 'Master\'s Degree';
}

function selectRealisticOccupation(education: string, income: number): string {
  // More realistic occupation selection based on education and income
  if (education.includes('Master') || education.includes('Doctorate')) {
    if (income > 100000) return 'Software Engineer';
    if (income > 80000) return 'Data Scientist';
    if (income > 60000) return 'Teacher';
    return 'Research Analyst';
  } else if (education.includes('Bachelor')) {
    if (income > 80000) return 'Marketing Manager';
    if (income > 60000) return 'Accountant';
    if (income > 45000) return 'Administrative Assistant';
    return 'Customer Service Representative';
  } else if (education.includes('Some College')) {
    if (income > 50000) return 'Medical Assistant';
    if (income > 40000) return 'Sales Representative';
    return 'Retail Supervisor';
  } else {
    if (income > 45000) return 'Construction Worker';
    if (income > 35000) return 'Truck Driver';
    return 'Retail Associate';
  }
}

function selectDemographicsFromCensus(demographics: CensusData['demographics']): string {
  const total = Object.values(demographics).reduce((sum, val) => sum + val, 0);
  const random = Math.random() * total;
  
  let cumulative = 0;
  
  if (random < (cumulative += demographics.white)) {
    return 'White';
  }
  if (random < (cumulative += demographics.black)) {
    return 'Black';
  }
  if (random < (cumulative += demographics.hispanic)) {
    return 'Hispanic';
  }
  if (random < (cumulative += demographics.asian)) {
    return 'Asian';
  }
  return 'Other';
}

function generatePersonalStory(
  name: string, 
  age: number, 
  education: string, 
  occupation: string, 
  income: number, 
  demographics: string
): string {
  const stories = [
    `${name} is a ${age}-year-old ${occupation.toLowerCase()} with a ${education.toLowerCase()}. They've lived in the area for ${Math.floor(Math.random() * 20) + 5} years and are concerned about local economic development.`,
    
    `A ${demographics.toLowerCase()} resident, ${name} works as a ${occupation.toLowerCase()} and has a ${education.toLowerCase()}. They're passionate about education and healthcare access in their community.`,
    
    `${name}, ${age}, is a ${occupation.toLowerCase()} who recently completed their ${education.toLowerCase()}. They're focused on affordable housing and transportation issues in the district.`,
    
    `With ${Math.floor(Math.random() * 20) + 10} years of experience as a ${occupation.toLowerCase()}, ${name} has seen the district change significantly. They care about maintaining the community's character while supporting growth.`,
    
    `${name} is a ${age}-year-old ${occupation.toLowerCase()} with a ${education.toLowerCase()}. They're particularly concerned about environmental issues and sustainable development in the area.`
  ];
  
  return stories[Math.floor(Math.random() * stories.length)];
}