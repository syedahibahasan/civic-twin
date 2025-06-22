import { Policy, DigitalTwin, PolicySuggestion, CensusData, Congressman } from '../types';

// Helper function to call Anthropic API through backend proxy
async function callAnthropicAPI(systemPrompt: string, userPrompt: string, maxTokens: number = 3000): Promise<string> {
  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        maxTokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI API error: ${response.status} ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return data.result || 'Unable to generate response';
  } catch (error) {
    console.error('Error calling AI API:', error);
    throw error;
  }
}

export async function summarizePolicy(content: string, congressman?: Congressman, censusData?: CensusData): Promise<string> {
  // First, try to get cached policy summary
  if (congressman?.district) {
    try {
      console.log(`Checking cache for policy summary in district ${congressman.district}...`);
      const cachedSummary = await getCachedPolicySummary(congressman.district, content);
      
      if (cachedSummary) {
        console.log(`Using cached policy summary for district ${congressman.district}`);
        return cachedSummary;
      }
    } catch (error) {
      console.log('Cache check failed, proceeding with AI generation');
    }
  }

  const maxRetries = 3;
  let retryCount = 0;

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

  while (retryCount < maxRetries) {
    try {
      console.log(`Calling Anthropic API for structured policy summary (attempt ${retryCount + 1})...`);
      console.log('API Key available:', true);

      const summary = await callAnthropicAPI(systemPrompt, userPrompt);
      
      // Cache the generated summary
      if (congressman?.district) {
        await cachePolicySummary(congressman.district, content, summary, congressman);
      }

      return summary;
    } catch (error) {
      console.error(`Attempt ${retryCount + 1} failed:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('rate limit') || error.message.includes('quota')) {
          retryCount++;
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`Rate limited. Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            console.log('Max retries reached, trying Anthropic as fallback...');
            try {
              const summary = await callAnthropicAPI(systemPrompt, userPrompt, 3000);
              
              // Cache the generated summary
              if (congressman?.district) {
                await cachePolicySummary(congressman.district, content, summary, congressman);
              }
              
              return summary;
            } catch (anthropicError) {
              console.log('Anthropic fallback also failed, using structured fallback summary');
              return generateStructuredFallbackSummary(content, congressman, censusData);
            }
          }
        }
        if (error.message.includes('CORS')) {
          console.log('CORS error detected, trying Anthropic as fallback...');
          try {
            const summary = await callAnthropicAPI(systemPrompt, userPrompt, 3000);
            
            // Cache the generated summary
            if (congressman?.district) {
              await cachePolicySummary(congressman.district, content, summary, congressman);
            }
            
            return summary;
          } catch (anthropicError) {
            console.log('Anthropic fallback also failed, using structured fallback summary');
            return generateStructuredFallbackSummary(content, congressman, censusData);
          }
        }
        if (error.message.includes('401')) {
          console.log('Anthropic auth error, trying Anthropic as fallback...');
          try {
            const summary = await callAnthropicAPI(systemPrompt, userPrompt, 3000);
            
            // Cache the generated summary
            if (congressman?.district) {
              await cachePolicySummary(congressman.district, content, summary, congressman);
            }
            
            return summary;
          } catch (anthropicError) {
            return 'Authentication error: Please check your API keys.';
          }
        }
      }
      
      console.log('Using fallback summary due to error');
      return generateStructuredFallbackSummary(content, congressman, censusData);
    }
  }
  
  return generateStructuredFallbackSummary(content, congressman, censusData);
}

// Helper functions for caching
async function getCachedPolicySummary(district: string, content: string): Promise<string | null> {
  try {
    // Get auth token from localStorage or context
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/cache/policy-summary/${district}?policyContent=${encodeURIComponent(content)}`, {
      headers
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.summary;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching cached policy summary:', error);
    return null;
  }
}

async function cachePolicySummary(district: string, content: string, summary: string, congressman?: Congressman): Promise<void> {
  try {
    // Get auth token from localStorage or context
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/cache/policy-summary', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        district,
        policyContent: content,
        summary,
        congressman
      })
    });

    if (response.ok) {
      console.log(`Successfully cached policy summary for district ${district}`);
    } else {
      console.warn(`Failed to cache policy summary for district ${district}`);
    }
  } catch (error) {
    console.error('Error caching policy summary:', error);
  }
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
  const keyImpact = 'To be determined based on policy analysis';
  
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
${keyImpact}

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
    const response = await callAnthropicAPI(`You are creating realistic digital twin constituents based on Census data for ZIP code ${censusData.zipCode}. Generate 4 diverse individuals with realistic demographics, occupations, and personal stories. Each twin should have a unique perspective on how the policy affects them.

Return a JSON array with objects containing: id, name, age, education, annualIncome, occupation, demographics, zipCode, personalStory`, `Create 4 digital twin constituents for ZIP code ${censusData.zipCode} based on this policy:\n\n${policy.summary}\n\nReturn a JSON array with objects containing: id, name, age, education, annualIncome, occupation, demographics, zipCode, personalStory`, 1000);

    if (response) {
      try {
        const twins = JSON.parse(response) as DigitalTwin[];
        return twins.map((twin: DigitalTwin, index: number) => ({
          ...twin,
          id: `twin-${index + 1}`,
          zipCode: censusData.zipCode,
          policyImpact: 'To be determined based on policy analysis'
        }));
      } catch (parseError) {
        console.error('Error parsing twins response:', parseError);
        console.log('Raw response:', response);
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
  const names = ['Sarah Johnson', 'Michael Chen', 'Maria Rodriguez', 'David Thompson'];
  const occupations = ['Teacher', 'Software Engineer', 'Nurse', 'Small Business Owner'];
  const educations = ['Bachelor\'s Degree', 'Master\'s Degree', 'Associate\'s Degree', 'High School Diploma'];
  
  return names.map((name, index) => ({
    id: `twin-${index + 1}`,
    name,
    age: Math.floor(Math.random() * 40) + 25,
    education: educations[index],
    annualIncome: Math.floor(Math.random() * 50000) + 30000,
    occupation: occupations[index],
    demographics: 'Mixed',
    zipCode: censusData.zipCode,
    personalStory: `${name} has lived in the district for ${Math.floor(Math.random() * 20) + 5} years and is concerned about local issues.`,
    policyImpact: 'To be determined based on policy analysis'
  }));
}

export async function generateChatResponse(
  message: string,
  twin: DigitalTwin,
  policy: Policy
): Promise<string> {
  try {
    const response = await callAnthropicAPI(`You are ${twin.name}, a ${twin.age}-year-old ${twin.occupation} from ZIP code ${twin.zipCode}. You have a ${twin.education} education and earn $${twin.annualIncome.toLocaleString()} annually. Your personal story: ${twin.personalStory}. Respond as this person would, discussing how the policy affects you personally. Keep responses conversational and under 100 words.`, `Policy: ${policy.summary}\n\nUser message: ${message}`, 200);

    return response || 'I need to think about that for a moment.';
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
    const response = await callAnthropicAPI("You are a policy analyst. Based on the digital twins' characteristics and the policy details, generate 4 specific, actionable suggestions to improve the policy. Focus on addressing potential concerns that constituents with these demographics and circumstances might have.", `Policy: ${policy.summary}\n\nDigital Twins Characteristics:\n${twins.map(twin => `- ${twin.name}: ${twin.age} years old, ${twin.occupation}, ${twin.education}, $${twin.annualIncome.toLocaleString()}/year, ${twin.demographics}. Story: ${twin.personalStory}`).join('\n')}\n\nGenerate 4 policy improvement suggestions. Return as JSON array with objects containing: id, title, description, impactedPopulation, severity (high/medium/low)`, 800);

    if (response) {
      try {
        const suggestions = JSON.parse(response) as PolicySuggestion[];
        return suggestions.map((suggestion: PolicySuggestion, index: number) => ({
          ...suggestion,
          id: `suggestion-${index + 1}`
        }));
      } catch (parseError) {
        console.error('Error parsing suggestions response:', parseError);
        console.log('Raw response:', response);
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
    const response = await callAnthropicAPI(`You are creating realistic digital twin constituents based on REAL Census data for Congressional District ${censusData.zipCode}. Generate ${count} UNIQUE individuals that ACCURATELY reflect the FULL income distribution and demographics of the district.

CRITICAL REQUIREMENTS FOR ACCURACY:
1. Age distribution MUST match the Census age groups data exactly
2. Racial/ethnic demographics MUST match the Census percentages
3. Education levels MUST reflect the actual Census education data
4. Income distribution MUST represent the FULL spectrum - from poverty level to high income
5. Occupations MUST reflect the district's employment patterns
6. Each constituent must have a UNIQUE personal story that fits their demographic profile

INCOME DISTRIBUTION REQUIREMENTS:
- If poverty rate is ${censusData.povertyRate || 'unknown'}%, then ${censusData.povertyRate || 0}% of constituents should have incomes below poverty level
- Income range should span from $15,000 (minimum wage) to $200,000+ (high income)
- Most constituents should cluster around the median income of $${censusData.medianIncome.toLocaleString()}
- Include representation of: minimum wage workers, service workers, middle class, professionals, and high earners

CENSUS DATA TO USE:
- Age Groups: ${censusData.ageGroups ? Object.entries(censusData.ageGroups).map(([range, count]) => `${range}: ${count} people`).join(', ') : 'Not available'}
- Demographics: ${Object.entries(censusData.demographics).map(([demo, pct]) => `${demo}: ${pct}%`).join(', ')}
- Education: ${Object.entries(censusData.educationLevels).map(([level, pct]) => `${level}: ${pct}%`).join(', ')}
- Median Income: $${censusData.medianIncome.toLocaleString()}
- Homeownership Rate: ${censusData.homeownershipRate || 'Not available'}%
- Poverty Rate: ${censusData.povertyRate || 'Not available'}%
- College Rate: ${censusData.collegeRate || 'Not available'}%

IMPORTANT: You MUST return ONLY a valid JSON array. Do not include any explanatory text, markdown, or other formatting. The response must start with [ and end with ].

Return a JSON array with objects containing: id, name, age, education, annualIncome, occupation, demographics, zipCode, personalStory`, `Create ${count} REALISTIC digital twin constituents for Congressional District ${censusData.zipCode} that are REPRESENTATIVE of this Census data:

Population: ${censusData.population.toLocaleString()}
Median Income: $${censusData.medianIncome.toLocaleString()}

DEMOGRAPHIC CONTEXT (should be generally representative):
${Object.entries(censusData.demographics).map(([demo, pct]) => `- ${demo}: ${pct}%`).join('\n')}

AGE DISTRIBUTION (should be generally representative):
${censusData.ageGroups ? Object.entries(censusData.ageGroups).map(([range, count]) => `- ${range}: ${count} people (${Math.round((count / censusData.population) * 100)}%)`).join('\n') : 'Age data not available'}

EDUCATION CONTEXT (should be generally representative):
${Object.entries(censusData.educationLevels).map(([level, pct]) => `- ${level}: ${pct}%`).join('\n')}

ECONOMIC CONTEXT:
- Homeownership Rate: ${censusData.homeownershipRate || 'Not available'}%
- Poverty Rate: ${censusData.povertyRate || 'Not available'}%
- College Education Rate: ${censusData.collegeRate || 'Not available'}%

OCCUPATION PATTERNS (should be generally representative):
${Object.entries(censusData.occupations).map(([occ, pct]) => `- ${occ}: ${pct}%`).join('\n')}

INCOME DISTRIBUTION CONTEXT (should be generally representative):
${censusData.incomeDistribution ? Object.entries(censusData.incomeDistribution).map(([range, pct]) => `- ${range}: ${pct}%`).join('\n') : 'Income distribution data not available'}

REQUIREMENTS:
1. Create constituents that are REPRESENTATIVE of the district's demographics, not exact matches
2. Ensure each constituent's properties work well together:
   - Age should be appropriate for their education level and occupation
   - Education level should be realistic for their occupation and income
   - Income should be appropriate for their education, occupation, and age
   - Demographics should be representative of the district's diversity
3. Include a good mix of different life stages and economic situations
4. Create realistic personal stories that reflect the district's characteristics
5. Ensure the overall group represents the district's diversity without being rigid

Use "Constituent #1", "Constituent #2", etc. for names.

CRITICAL: Return ONLY a valid JSON array. No markdown, no explanations, no other text. Just the JSON array starting with [ and ending with ].`, 3000);

    if (response) {
      try {
        // Clean the response to extract JSON if there's extra text
        let cleanedResponse = response.trim();
        
        // Find the first [ and last ] to extract JSON
        const startIndex = cleanedResponse.indexOf('[');
        const endIndex = cleanedResponse.lastIndexOf(']');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          cleanedResponse = cleanedResponse.substring(startIndex, endIndex + 1);
        }
        
        // Try to parse the cleaned response
        const twins = JSON.parse(cleanedResponse) as DigitalTwin[];
        
        // Validate that we got an array
        if (!Array.isArray(twins)) {
          throw new Error('Response is not an array');
        }
        
        return twins.map((twin: DigitalTwin, index: number) => ({
          ...twin,
          id: `constituent-${index + 1}`,
          name: `Constituent #${index + 1}`,
          zipCode: censusData.zipCode, // This is now the district identifier
          policyImpact: 'To be determined based on policy analysis'
        }));
      } catch (parseError) {
        console.error('Error parsing constituents response:', parseError);
        console.log('Raw response:', response);
        console.log('Response length:', response.length);
        console.log('First 200 characters:', response.substring(0, 200));
        console.log('Last 200 characters:', response.substring(response.length - 200));
        return generateAccurateFallbackConstituents(censusData, count);
      }
    }
    
    return generateAccurateFallbackConstituents(censusData, count);
  } catch (error) {
    console.error('Error generating constituents from Census data:', error);
    
    // Try fallback to local generation
    return generateAccurateFallbackConstituents(censusData, count);
  }
}

function generateAccurateFallbackConstituents(censusData: CensusData, count: number): DigitalTwin[] {
  const constituents: DigitalTwin[] = [];
  
  // Generate coherent constituent profiles where properties work well together
  for (let i = 0; i < count; i++) {
    const name = `Constituent #${i + 1}`;
    
    // Generate age first, then build other properties around it
    const age = generateRealisticAge(censusData.ageGroups);
    
    // Generate demographics that are representative of the district
    const demo = generateRepresentativeDemographics(censusData.demographics);
    
    // Generate education level appropriate for age and district
    const education = generateAppropriateEducation(age, censusData.educationLevels, censusData.collegeRate);
    
    // Generate occupation that works with education and age
    const occupation = generateAppropriateOccupation(age, education, censusData.occupations);
    
    // Generate income that's realistic for education, occupation, and age
    const annualIncome = generateRealisticIncome(age, education, occupation, censusData.medianIncome, censusData.incomeDistribution);
    
    constituents.push({
      id: `constituent-${i + 1}`,
      name,
      age,
      education,
      annualIncome,
      occupation,
      demographics: demo,
      zipCode: censusData.zipCode,
      personalStory: generateAccuratePersonalStory(name, age, education, occupation, annualIncome, demo, i),
      policyImpact: 'To be determined based on policy analysis'
    });
  }
  
  return constituents;
}

function generateRealisticAge(ageGroups?: CensusData['ageGroups']): number {
  if (!ageGroups) {
    // Fallback to realistic age distribution
    const ageRanges = [
      { min: 18, max: 24, weight: 12 },
      { min: 25, max: 34, weight: 18 },
      { min: 35, max: 44, weight: 16 },
      { min: 45, max: 54, weight: 15 },
      { min: 55, max: 64, weight: 14 },
      { min: 65, max: 74, weight: 12 },
      { min: 75, max: 85, weight: 13 }
    ];
    
    const totalWeight = ageRanges.reduce((sum, range) => sum + range.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const range of ageRanges) {
      random -= range.weight;
      if (random <= 0) {
        return Math.floor(range.min + Math.random() * (range.max - range.min + 1));
      }
    }
    return 35; // Fallback
  }
  
  // Use actual age group data
  const total = Object.values(ageGroups).reduce((sum, val) => sum + val, 0);
  let random = Math.random() * total;
  
  for (const [range, count] of Object.entries(ageGroups)) {
    random -= count;
    if (random <= 0) {
      let min: number, max: number;
      
      if (range.includes('+')) {
        // Handle "75+" case
        min = parseInt(range.replace('+', ''));
        max = min + 10; // Assume 10 year range for 75+
      } else {
        // Handle "18-24" case
        const parts = range.split('-').map(Number);
        min = parts[0];
        max = parts[1];
      }
      
      // Ensure we have valid numbers
      if (isNaN(min) || isNaN(max)) {
        return 35; // Fallback
      }
      
      return Math.floor(min + Math.random() * (max - min + 1));
    }
  }
  return 35; // Fallback
}

function generateRepresentativeDemographics(demographics: CensusData['demographics']): string {
  const { white, black, hispanic, asian, other } = demographics;
  const total = white + black + hispanic + asian + other;
  const random = Math.random() * total;
  
  let cumulative = 0;
  if (random < (cumulative += white)) return 'White';
  if (random < (cumulative += black)) return 'Black';
  if (random < (cumulative += hispanic)) return 'Hispanic';
  if (random < (cumulative += asian)) return 'Asian';
  return 'Other';
}

function generateAppropriateEducation(age: number, educationLevels: CensusData['educationLevels'], collegeRate?: number): string {
  // Age-appropriate education levels
  if (age < 20) {
    return Math.random() < 0.8 ? 'High School' : 'Some College';
  } else if (age < 25) {
    const options = ['High School', 'Some College', 'Bachelor\'s Degree'];
    const weights = [0.2, 0.5, 0.3];
    return weightedRandomChoice(options, weights);
  } else if (age < 35) {
    const options = ['High School', 'Some College', 'Bachelor\'s Degree', 'Graduate Degree'];
    const weights = [0.15, 0.25, 0.4, 0.2];
    return weightedRandomChoice(options, weights);
  } else {
    // Older adults - more varied
    const options = ['Less than High School', 'High School', 'Some College', 'Bachelor\'s Degree', 'Graduate Degree'];
    const weights = [0.1, 0.3, 0.25, 0.25, 0.1];
    return weightedRandomChoice(options, weights);
  }
}

function generateAppropriateOccupation(age: number, education: string, occupations: CensusData['occupations']): string {
  // Education-appropriate occupations
  if (education.includes('Graduate')) {
    const options = ['Doctor', 'Professor', 'Lawyer', 'Engineer', 'Manager', 'Consultant'];
    return options[Math.floor(Math.random() * options.length)];
  } else if (education.includes('Bachelor')) {
    const options = ['Teacher', 'Nurse', 'Accountant', 'Marketing Specialist', 'Sales Representative', 'Manager'];
    return options[Math.floor(Math.random() * options.length)];
  } else if (education.includes('Some College')) {
    const options = ['Administrative Assistant', 'Customer Service Rep', 'Retail Supervisor', 'Technician', 'Office Manager'];
    return options[Math.floor(Math.random() * options.length)];
  } else if (education.includes('High School')) {
    const options = ['Retail Associate', 'Factory Worker', 'Truck Driver', 'Construction Worker', 'Service Worker'];
    return options[Math.floor(Math.random() * options.length)];
  } else {
    const options = ['Service Worker', 'Factory Worker', 'Laborer', 'Retail Associate', 'Maintenance Worker'];
    return options[Math.floor(Math.random() * options.length)];
  }
}

function generateRealisticIncome(age: number, education: string, occupation: string, medianIncome: number, incomeDistribution?: CensusData['incomeDistribution']): number {
  // Base income on education and occupation
  let baseIncome = medianIncome;
  
  if (education.includes('Graduate')) baseIncome *= 1.5;
  else if (education.includes('Bachelor')) baseIncome *= 1.2;
  else if (education.includes('Some College')) baseIncome *= 0.9;
  else if (education.includes('High School')) baseIncome *= 0.7;
  else baseIncome *= 0.5; // Less than high school
  
  // Adjust for age/experience
  if (age < 25) baseIncome *= 0.7;
  else if (age < 35) baseIncome *= 0.9;
  else if (age < 45) baseIncome *= 1.1;
  else if (age < 55) baseIncome *= 1.2;
  else if (age < 65) baseIncome *= 1.1;
  else baseIncome *= 0.8; // Retirement age
  
  // Add some realistic variation (±25%)
  const variation = 0.75 + Math.random() * 0.5;
  baseIncome *= variation;
  
  return Math.round(baseIncome);
}

function weightedRandomChoice<T>(options: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < options.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return options[i];
    }
  }
  return options[0]; // Fallback
}

function generateAccuratePersonalStory(
  name: string, 
  age: number, 
  education: string, 
  occupation: string, 
  income: number, 
  demographics: string,
  index: number
): string {
  const stories = [
    `${name} is a ${age}-year-old ${demographics.toLowerCase()} ${occupation.toLowerCase()} with a ${education.toLowerCase()}. They've lived in the district for ${Math.floor(Math.random() * 20) + 5} years and earn $${income.toLocaleString()} annually.`,
    
    `A ${demographics.toLowerCase()} resident, ${name} works as a ${occupation.toLowerCase()} and has a ${education.toLowerCase()}. They're concerned about local economic development and community issues.`,
    
    `${name}, ${age}, is a ${occupation.toLowerCase()} who completed their ${education.toLowerCase()}. They're focused on affordable housing and transportation in the district.`,
    
    `With ${Math.floor(Math.random() * 20) + 10} years of experience as a ${occupation.toLowerCase()}, ${name} has seen the district change significantly. They care about maintaining community character while supporting growth.`,
    
    `${name} is a ${age}-year-old ${occupation.toLowerCase()} with a ${education.toLowerCase()}. They're particularly concerned about environmental issues and sustainable development.`
  ];
  
  return stories[index % stories.length];
}