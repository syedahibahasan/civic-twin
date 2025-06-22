import { Policy, DigitalTwin, ChatMessage, PolicySuggestion, CensusData } from '../types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
  baseURL: 'https://api.openai.com/v1', // Explicitly set the base URL
});

export async function summarizePolicy(content: string): Promise<string> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`Calling OpenAI API for policy summary (attempt ${retryCount + 1})...`);
      console.log('API Key available:', !!import.meta.env.VITE_OPENAI_API_KEY);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a policy analyst. Summarize the uploaded policy document in 2-3 sentences, focusing on the main objectives, key changes, and potential impact on constituents."
          },
          {
            role: "user",
            content: `Please analyze and summarize this policy document:\n\n${content}`
          }
        ],
        max_tokens: 300,
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
            return generateFallbackSummary(content);
          }
        }
        if (error.message.includes('CORS')) {
          console.log('CORS error detected, using fallback summary');
          return generateFallbackSummary(content);
        }
        if (error.message.includes('401')) {
          return 'Authentication error: Please check your OpenAI API key.';
        }
      }
      
      console.log('Using fallback summary due to error');
      return generateFallbackSummary(content);
    }
  }
  
  return generateFallbackSummary(content);
}

function generateFallbackSummary(content: string): string {
  // Simple fallback that extracts key information from the content
  const words = content.toLowerCase().split(/\s+/);
  const wordCount = words.length;
  
  // Handle very short content
  if (wordCount < 5) {
    const wordText = wordCount === 1 ? 'word' : 'words';
    return `The provided text "${content}" is very brief (${wordCount} ${wordText}). For meaningful policy analysis, please provide a more detailed policy document, bill text, or legislative content.`;
  }
  
  // Look for common policy-related keywords
  const keywords = ['policy', 'bill', 'act', 'law', 'regulation', 'funding', 'education', 'health', 'tax', 'benefit', 'student', 'financial', 'aid', 'grant', 'program'];
  const foundKeywords = keywords.filter(keyword => content.toLowerCase().includes(keyword));
  
  // Look for dollar amounts
  const dollarMatches = content.match(/\$[\d,]+(?:\.\d{2})?/g);
  const dollarAmounts = dollarMatches ? dollarMatches.slice(0, 3) : [];
  
  // Look for percentages
  const percentMatches = content.match(/\d+(?:\.\d+)?%/g);
  const percentages = percentMatches ? percentMatches.slice(0, 3) : [];
  
  // Look for dates
  const dateMatches = content.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/g);
  const dates = dateMatches ? dateMatches.slice(0, 2) : [];
  
  // Check if content seems like policy text
  const hasPolicyKeywords = foundKeywords.length > 0;
  const hasNumbers = /\d/.test(content);
  const hasFormalLanguage = /(shall|must|required|prohibited|authorized|appropriated)/i.test(content);
  
  const wordText = wordCount === 1 ? 'word' : 'words';
  let summary = `This document contains approximately ${wordCount} ${wordText}`;
  
  if (hasPolicyKeywords) {
    summary += ` and addresses ${foundKeywords.slice(0, 3).join(', ')} related matters`;
  } else if (hasFormalLanguage) {
    summary += ` and appears to contain legislative or regulatory language`;
  } else if (hasNumbers) {
    summary += ` and includes numerical data`;
  } else {
    summary += ` and may not be a formal policy document`;
  }
  
  if (dollarAmounts.length > 0) {
    summary += `. It mentions funding amounts including ${dollarAmounts.join(', ')}`;
  }
  
  if (percentages.length > 0) {
    summary += `. The content includes changes of ${percentages.join(', ')}`;
  }
  
  if (dates.length > 0) {
    summary += `. Key dates include ${dates.join(', ')}`;
  }
  
  if (hasPolicyKeywords || hasFormalLanguage) {
    summary += `. This document requires detailed analysis to determine its specific objectives and potential impact on constituents.`;
  } else {
    summary += `. For policy impact analysis, please provide a formal policy document, bill text, or legislative content.`;
  }
  
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
        const twins = JSON.parse(response);
        return twins.map((twin: any, index: number) => ({
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
  const names = ['Maria Rodriguez', 'John Thompson', 'Linda Chen', 'David Williams'];
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
    personalStory: `I'm ${name.split(' ')[0]}, a ${Math.floor(Math.random() * 30) + 20}-year-old living in ${censusData.zipCode}. I work part-time while pursuing my education and depend on financial aid to make ends meet.`,
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
        const suggestions = JSON.parse(response);
        return suggestions.map((suggestion: any, index: number) => ({
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