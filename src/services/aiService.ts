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

function generateFallbackTwins(censusData: CensusData): DigitalTwin[] {
  // Use the enhanced constituent generation function instead of hard-coded values
  return generateUniqueFallbackConstituents(censusData, 4);
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
          content: `You are creating realistic digital twin constituents based on Census data for ZIP code ${censusData.zipCode}. Generate ${count} UNIQUE individuals with diverse demographics, occupations, and personal stories that match the Census data.

CRITICAL REQUIREMENTS FOR UNIQUENESS:
1. Each constituent must have a DIFFERENT age (spread across 18-85 range)
2. Each constituent must have a DIFFERENT ethnicity/race (distribute across available demographics)
3. Each constituent must have a DIFFERENT occupation and career path
4. Each constituent must have DIFFERENT education levels
5. Each constituent must have DIFFERENT income levels appropriate for their background
6. Each constituent must have UNIQUE personal stories and life circumstances
7. Use "Constituent #X" format for names (e.g., "Constituent #1", "Constituent #2")

ANALYZE THE CENSUS DATA TO MAKE INTELLIGENT INFERENCES:
- Use the education distribution to determine realistic career paths
- Use the income distribution to create varied but realistic income levels
- Use the demographic breakdown to ensure representation matches the data
- Use the median age to create age-appropriate life circumstances
- Consider the population size for realistic community context

Return a JSON array with objects containing: id, name, age, education, annualIncome, occupation, demographics, zipCode, personalStory`
        },
        {
          role: "user",
          content: `Create ${count} UNIQUE and DIVERSE digital twin constituents for ZIP code ${censusData.zipCode} based on this Census data:

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

ANALYZE THIS DATA TO CREATE REALISTIC INFERENCES:
- What types of jobs would people with these education levels typically have?
- What income ranges would be realistic for different education and age combinations?
- What life circumstances would be common in a community with this demographic makeup?
- How would the median age and income affect family structures and housing situations?

IMPORTANT: Ensure each constituent is completely unique with different ages, ethnicities, occupations, education levels, and personal stories. Use "Constituent #1", "Constituent #2", etc. for names.`
        }
      ],
      max_tokens: 3000,
      temperature: 0.8,
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
        return generateUniqueFallbackConstituents(censusData, count);
      }
    }
    
    return generateUniqueFallbackConstituents(censusData, count);
  } catch (error) {
    console.error('Error generating constituents from Census data:', error);
    return generateUniqueFallbackConstituents(censusData, count);
  }
}

function generateUniqueFallbackConstituents(censusData: CensusData, count: number): DigitalTwin[] {
  const constituents: DigitalTwin[] = [];
  
  // Pre-generate unique values to ensure diversity
  const uniqueAges = generateUniqueAges(count, censusData.medianAge);
  const uniqueDemographics = generateUniqueDemographics(count, censusData.demographics);
  const uniqueOccupations = generateUniqueOccupations(count);
  const uniqueEducationLevels = generateUniqueEducationLevels(count, censusData.educationLevels);
  
  for (let i = 0; i < count; i++) {
    const name = `Constituent #${i + 1}`;
    const age = uniqueAges[i];
    const demographics = uniqueDemographics[i];
    const occupation = uniqueOccupations[i];
    const education = uniqueEducationLevels[i];
    
    // Generate realistic income based on education, occupation, and age
    const annualIncome = generateRealisticIncome(education, occupation, age, censusData.medianIncome);
    
    constituents.push({
      id: `constituent-${i + 1}`,
      name,
      age,
      education,
      annualIncome,
      occupation,
      demographics,
      zipCode: censusData.zipCode,
      personalStory: generateUniquePersonalStory(name, age, education, occupation, annualIncome, demographics, i, censusData),
      policyImpact: 'To be determined based on policy analysis'
    });
  }
  
  return constituents;
}

function generateUniqueAges(count: number, medianAge: number): number[] {
  const ages: number[] = [];
  const ageRanges = [
    { min: 18, max: 25, weight: 0.15 },   // Young adults
    { min: 26, max: 35, weight: 0.20 },   // Early career
    { min: 36, max: 45, weight: 0.20 },   // Mid career
    { min: 46, max: 55, weight: 0.20 },   // Established career
    { min: 56, max: 65, weight: 0.15 },   // Late career
    { min: 66, max: 85, weight: 0.10 }    // Retirement age
  ];
  
  for (let i = 0; i < count; i++) {
    let age: number;
    do {
      const range = ageRanges[Math.floor(Math.random() * ageRanges.length)];
      age = Math.floor(range.min + Math.random() * (range.max - range.min + 1));
    } while (ages.includes(age));
    ages.push(age);
  }
  
  return ages.sort(() => Math.random() - 0.5); // Shuffle
}

function generateUniqueDemographics(count: number, demographics: CensusData['demographics']): string[] {
  const demoArray: string[] = [];
  const total = Object.values(demographics).reduce((sum, val) => sum + val, 0);
  
  // Create weighted array based on Census data
  const weightedDemos: string[] = [];
  Object.entries(demographics).forEach(([demo, percentage]) => {
    const demoCount = Math.ceil((percentage / total) * count);
    for (let i = 0; i < demoCount; i++) {
      weightedDemos.push(demo);
    }
  });
  
  // Ensure we have enough unique demographics
  const uniqueDemos = ['White', 'Black', 'Hispanic', 'Asian', 'Other'];
  const result: string[] = [];
  
  for (let i = 0; i < count; i++) {
    let demo: string;
    if (weightedDemos.length > 0) {
      const randomIndex = Math.floor(Math.random() * weightedDemos.length);
      demo = weightedDemos.splice(randomIndex, 1)[0];
    } else {
      demo = uniqueDemos[i % uniqueDemos.length];
    }
    result.push(demo);
  }
  
  return result.sort(() => Math.random() - 0.5); // Shuffle
}

function generateUniqueOccupations(count: number): string[] {
  const allOccupations = [
    // Healthcare
    'Registered Nurse', 'Medical Assistant', 'Physical Therapist', 'Dental Hygienist', 'Pharmacy Technician',
    // Technology
    'Software Engineer', 'Data Analyst', 'IT Support Specialist', 'Web Developer', 'Cybersecurity Analyst',
    // Education
    'Elementary School Teacher', 'High School Teacher', 'College Professor', 'Special Education Teacher', 'Librarian',
    // Business
    'Marketing Manager', 'Human Resources Specialist', 'Accountant', 'Financial Analyst', 'Project Manager',
    // Service
    'Restaurant Manager', 'Hotel Manager', 'Retail Supervisor', 'Customer Service Representative', 'Sales Representative',
    // Skilled Trades
    'Electrician', 'Plumber', 'Carpenter', 'HVAC Technician', 'Welder',
    // Transportation
    'Truck Driver', 'Bus Driver', 'Delivery Driver', 'Uber Driver', 'Logistics Coordinator',
    // Public Service
    'Police Officer', 'Firefighter', 'Paramedic', 'Social Worker', 'City Planner',
    // Creative
    'Graphic Designer', 'Photographer', 'Writer', 'Musician', 'Interior Designer',
    // Other
    'Real Estate Agent', 'Insurance Agent', 'Legal Assistant', 'Administrative Assistant', 'Research Assistant'
  ];
  
  const selectedOccupations: string[] = [];
  const shuffled = [...allOccupations].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < count; i++) {
    selectedOccupations.push(shuffled[i % shuffled.length]);
  }
  
  return selectedOccupations.sort(() => Math.random() - 0.5); // Shuffle
}

function generateUniqueEducationLevels(count: number, educationLevels: CensusData['educationLevels']): string[] {
  const educationOptions = [
    'High School Diploma',
    'Some College',
    'Associate\'s Degree',
    'Bachelor\'s Degree',
    'Master\'s Degree',
    'Doctorate'
  ];
  
  const result: string[] = [];
  const total = Object.values(educationLevels).reduce((sum, val) => sum + val, 0);
  
  // Create weighted array based on Census data
  const weightedEducation: string[] = [];
  if (educationLevels.highSchool > 0) {
    const eduCount = Math.ceil((educationLevels.highSchool / total) * count);
    for (let i = 0; i < eduCount; i++) {
      weightedEducation.push('High School Diploma');
    }
  }
  if (educationLevels.someCollege > 0) {
    const eduCount = Math.ceil((educationLevels.someCollege / total) * count);
    for (let i = 0; i < eduCount; i++) {
      weightedEducation.push('Some College');
    }
  }
  if (educationLevels.bachelors > 0) {
    const eduCount = Math.ceil((educationLevels.bachelors / total) * count);
    for (let i = 0; i < eduCount; i++) {
      weightedEducation.push('Bachelor\'s Degree');
    }
  }
  if (educationLevels.graduate > 0) {
    const eduCount = Math.ceil((educationLevels.graduate / total) * count);
    for (let i = 0; i < eduCount; i++) {
      weightedEducation.push('Master\'s Degree');
    }
  }
  
  for (let i = 0; i < count; i++) {
    let education: string;
    if (weightedEducation.length > 0) {
      const randomIndex = Math.floor(Math.random() * weightedEducation.length);
      education = weightedEducation.splice(randomIndex, 1)[0];
    } else {
      education = educationOptions[i % educationOptions.length];
    }
    result.push(education);
  }
  
  return result.sort(() => Math.random() - 0.5); // Shuffle
}

function generateRealisticIncome(education: string, occupation: string, age: number, medianIncome: number): number {
  let baseMultiplier = 1.0;
  
  // Adjust based on education
  if (education.includes('Doctorate')) baseMultiplier = 1.8;
  else if (education.includes('Master')) baseMultiplier = 1.5;
  else if (education.includes('Bachelor')) baseMultiplier = 1.3;
  else if (education.includes('Associate')) baseMultiplier = 1.1;
  else if (education.includes('Some College')) baseMultiplier = 0.9;
  else baseMultiplier = 0.7;
  
  // Adjust based on age/experience
  if (age < 25) baseMultiplier *= 0.7;
  else if (age < 35) baseMultiplier *= 0.9;
  else if (age < 45) baseMultiplier *= 1.1;
  else if (age < 55) baseMultiplier *= 1.2;
  else if (age < 65) baseMultiplier *= 1.1;
  else baseMultiplier *= 0.8;
  
  // Add some randomness
  const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  
  return Math.floor(Math.max(25000, medianIncome * baseMultiplier * randomFactor));
}

function generateUniquePersonalStory(
  name: string, 
  age: number, 
  education: string, 
  occupation: string, 
  income: number, 
  demographics: string,
  index: number,
  censusData: CensusData
): string {
  const familySituations = [
    'single parent with two children',
    'married with three kids',
    'recently divorced',
    'empty nester',
    'young professional living alone',
    'caring for elderly parents',
    'newly married couple',
    'retired with grandchildren nearby'
  ];
  
  const lifeCircumstances = [
    'recently moved to the area for work',
    'born and raised in the community',
    'returned after college to be near family',
    'moved here for better schools',
    'relocated for a job opportunity',
    'came back after military service',
    'moved here for retirement',
    'transferred from another state'
  ];
  
  const communityInvolvement = [
    'volunteers at the local food bank',
    'coaches youth sports',
    'serves on the PTA board',
    'participates in neighborhood watch',
    'attends city council meetings',
    'member of the local chamber of commerce',
    'volunteers at the library',
    'active in their church community'
  ];
  
  const concerns = [
    'worried about rising property taxes',
    'concerned about school funding',
    'focused on healthcare accessibility',
    'passionate about environmental protection',
    'interested in economic development',
    'concerned about public safety',
    'worried about affordable housing',
    'focused on transportation infrastructure'
  ];
  
  const familySituation = familySituations[index % familySituations.length];
  const lifeCircumstance = lifeCircumstances[index % lifeCircumstances.length];
  const involvement = communityInvolvement[index % communityInvolvement.length];
  const concern = concerns[index % concerns.length];
  
  // Add Census data context to make the story more realistic
  const incomeContext = income < censusData.medianIncome * 0.7 ? 'below the median income' :
                       income > censusData.medianIncome * 1.3 ? 'above the median income' :
                       'around the median income';
  
  const ageContext = age < 30 ? 'young professional' :
                    age < 50 ? 'mid-career professional' :
                    age < 65 ? 'established professional' :
                    'retired or semi-retired';
  
  return `${name} is a ${age}-year-old ${demographics.toLowerCase()} ${occupation.toLowerCase()} with a ${education.toLowerCase()}. They are a ${familySituation} who ${lifeCircumstance}. ${name} ${involvement} and is particularly ${concern}. With an annual income of $${income.toLocaleString()} (${incomeContext} for this area), they represent the diverse economic and social fabric of the ${censusData.population.toLocaleString()}-person community. As a ${ageContext}, they bring unique perspectives shaped by the local demographic makeup and economic conditions.`;
}