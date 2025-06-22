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
      
      const systemPrompt = `You are a senior policy analyst creating professional, easy-to-understand summaries of legislative documents. Your goal is to make complex policy accessible to congressional staff and constituents.

Write in a clear, professional tone. Use bullet points, bold headers, and structured formatting to make the content scannable and engaging. Focus on practical implications and real-world impact.

Format your response exactly like this:

## 📋 Executive Summary

**Bill Title:** [Clear, descriptive title]

**Purpose:** [One sentence explaining what this bill does]

**Key Impact:** [2-3 bullet points of main effects]

## 🏛️ District Analysis

**Representative:** [Name and district]

**Local Impact:** [How this specifically affects the district's residents]

**Affected Groups:** [Bullet points of key demographic groups]

## 👥 Constituent Impact

**Directly Impacted Constituents:**
• [Type 1]: [How they're affected]
• [Type 2]: [How they're affected]
• [Type 3]: [How they're affected]

**Economic Impact:** [Financial implications for the district]

## 📊 Relevance Assessment

**Relevance Score:** [1-5 stars] ⭐⭐⭐⭐⭐

**Reasoning:** [Clear explanation of why this matters to the district]

Be thorough but concise. Use data when available. Make complex policy accessible to non-experts.`;

      const userPrompt = `Analyze this policy document for ${congressman ? `${congressman.name} (${congressman.district}, ${congressman.state})` : 'CA-12 (San Francisco)'}:

${content}

${censusData ? `District Demographics (ZIP ${censusData.zipCode}):
• Population: ${censusData.population.toLocaleString()}
• Median Income: $${censusData.medianIncome.toLocaleString()}
• Median Age: ${censusData.medianAge}
• Education: ${censusData.educationLevels.bachelors}% Bachelor's, ${censusData.educationLevels.highSchool}% High School
• Demographics: ${censusData.demographics.white}% White, ${censusData.demographics.hispanic}% Hispanic, ${censusData.demographics.asian}% Asian, ${censusData.demographics.black}% Black` : ''}

District Context: ${congressman ? `${congressman.district} (${congressman.state})` : 'CA-12 (San Francisco)'} is a diverse urban district with significant federal presence, tech industry, and strong commitment to diversity and inclusion programs.

Provide a comprehensive, professional analysis that makes the policy accessible and highlights district-specific implications.`;

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
  
  // Handle very short content with a more helpful message
  if (wordCount < 10) {
    const wordText = wordCount === 1 ? 'word' : 'words';
    return `## 📋 Executive Summary

**Bill Title:** Document Analysis

**Purpose:** The provided text "${content}" is very brief (${wordCount} ${wordText}). For a comprehensive policy analysis, please upload a more detailed policy document, bill text, or legislative content.

**Key Impact:** 
• Insufficient content for meaningful analysis
• Please provide a longer document for detailed review

## 🏛️ District Analysis

**Representative:** ${congressman?.name || 'Not specified'} (${congressman?.district || 'Not specified'}, ${congressman?.state || 'Not specified'})

**Local Impact:** Unable to determine due to limited content

**Affected Groups:** Unable to identify specific groups due to insufficient content

## 👥 Constituent Impact

**Directly Impacted Constituents:**
• Unable to determine due to limited content

**Economic Impact:** Unable to assess due to insufficient information

## 📊 Relevance Assessment

**Relevance Score:** ⭐ (1/5)

**Reasoning:** The document contains insufficient content for meaningful policy analysis. Please upload a more detailed policy document to receive a comprehensive assessment.`;
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
  } else if (content.toLowerCase().includes('funding') || content.toLowerCase().includes('appropriation')) {
    billTitle = 'Federal Funding Policy';
  }
  
  // Build executive summary
  let purpose = `This document contains approximately ${wordCount} ${wordText}`;
  
  if (hasPolicyKeywords) {
    purpose += ` and addresses ${foundKeywords.slice(0, 3).join(', ')} related matters`;
  } else if (hasFormalLanguage) {
    purpose += ` and contains legislative or regulatory language`;
  } else if (hasNumbers) {
    purpose += ` and includes numerical data and funding information`;
  } else {
    purpose += ` and may not be a formal policy document`;
  }
  
  if (dollarAmounts.length > 0) {
    purpose += `. Funding amounts include ${dollarAmounts.join(', ')}`;
  }
  
  if (percentages.length > 0) {
    purpose += `. Changes of ${percentages.join(', ')}`;
  }
  
  // Key impact points
  let keyImpact = [];
  if (hasPolicyKeywords) {
    keyImpact.push(`Addresses ${foundKeywords.slice(0, 3).join(', ')} related provisions`);
  }
  if (dollarAmounts.length > 0) {
    keyImpact.push(`Involves federal funding of ${dollarAmounts.join(', ')}`);
  }
  if (percentages.length > 0) {
    keyImpact.push(`Proposes changes of ${percentages.join(', ')}`);
  }
  if (keyImpact.length === 0) {
    keyImpact.push('General policy implementation');
  }
  
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
  
  // District analysis
  let localImpact = 'The impact would depend on the specific policy focus, but could affect federal employees, contractors, and communities that rely on federal programs.';
  let affectedGroups = ['Federal employees and contractors', 'Students and educators', 'Low-income residents', 'Communities that rely on federal programs'];
  
  if (censusData) {
    localImpact = `Given the district's demographics with ${censusData.demographics.hispanic}% Hispanic and ${censusData.demographics.asian}% Asian populations, and ${censusData.educationLevels.bachelors}% with higher education, this policy could significantly impact federal employees, tech workers, and communities that rely on federal programs. The median income of $${censusData.medianIncome.toLocaleString()} suggests many residents may be affected by changes to federal funding or programs.`;
    
    affectedGroups = [
      `Low-income residents (median income $${censusData.medianIncome.toLocaleString()})`,
      `Students and educators (${censusData.educationLevels.bachelors}% with higher education)`,
      `Hispanic and Asian communities (${censusData.demographics.hispanic}% and ${censusData.demographics.asian}% respectively)`,
      'Federal employees and contractors'
    ];
  }
  
  // Constituent impact
  const constituentTypes = [
    'Federal Employees: May be affected by changes to federal programs and office structures',
    'Tech Industry Workers: Could see impacts on federal contracts and diversity initiatives',
    'Students and Educators: May experience changes in federal educational programs',
    'Low-Income Residents: Could be affected by modifications to federal assistance programs',
    'Small Business Owners: May see changes in federal contracting and support programs'
  ];
  
  const economicImpact = censusData 
    ? `Given the district's median income of $${censusData.medianIncome.toLocaleString()}, changes to federal programs could significantly impact household budgets and local economic activity.`
    : 'Changes to federal programs could impact household budgets and local economic activity depending on the specific policy focus.';
  
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
  
  const stars = '⭐'.repeat(relevanceScore) + '☆'.repeat(5 - relevanceScore);
  
  return `## 📋 Executive Summary

**Bill Title:** ${billTitle}

**Purpose:** ${purpose}

**Key Impact:** 
${keyImpact.map(impact => `• ${impact}`).join('\n')}

## 🏛️ District Analysis

**Representative:** ${congressman?.name || 'Not specified'} (${congressman?.district || 'Not specified'}, ${congressman?.state || 'Not specified'})

**Local Impact:** ${localImpact}

**Affected Groups:**
${affectedGroups.map(group => `• ${group}`).join('\n')}

## 👥 Constituent Impact

**Directly Impacted Constituents:**
${constituentTypes.map(type => `• ${type}`).join('\n')}

**Economic Impact:** ${economicImpact}

## 📊 Relevance Assessment

**Relevance Score:** ${stars} (${relevanceScore}/5)

**Reasoning:** ${scoreReason}`;
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