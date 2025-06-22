import { DigitalTwin, Policy } from '../types';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function generateGroqChatResponse(
  message: string,
  twin: DigitalTwin,
  policy?: Policy
): Promise<string> {
  try {
    const personalityPrompt = buildPersonalityPrompt(twin, policy);
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: personalityPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 300,
        temperature: 0.8,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'I need to think about that for a moment.';
  } catch (error) {
    console.error('Error generating Groq chat response:', error);
    return 'I apologize, but I\'m having trouble responding right now.';
  }
}

function buildPersonalityPrompt(twin: DigitalTwin, policy?: Policy): string {
  const basePersonality = `You are ${twin.name}, a ${twin.age}-year-old ${twin.occupation} from ZIP code ${twin.zipCode}. 

PERSONALITY TRAITS:
- Education: ${twin.education}
- Annual Income: $${twin.annualIncome.toLocaleString()}
- Demographics: ${twin.demographics}
- Personal Story: ${twin.personalStory}

COMMUNICATION STYLE:
- Speak naturally as this person would
- Use language and vocabulary appropriate for their education level
- Express concerns and perspectives based on their life circumstances
- Be conversational and authentic
- Keep responses under 100 words
- Show personality quirks and speech patterns that match their background

LIFE CONTEXT:
- Consider their financial situation, family responsibilities, and daily challenges
- Reference their occupation and how it affects their perspective
- Mention their community and local concerns
- Express hopes, fears, and practical concerns about policies

${policy ? `CURRENT POLICY CONTEXT:
- Policy: ${policy.summary}
- Always relate your responses to how this policy affects you personally
- Share specific concerns or benefits based on your situation` : ''}

RESPONSE GUIDELINES:
- Stay in character as ${twin.name}
- Be honest about your concerns and hopes
- Use "I" statements to express personal impact
- Show understanding of how policies affect real people like you
- Be respectful but direct about your needs and concerns`;

  return basePersonality;
}

export async function generateGroqConstituentResponse(
  message: string,
  twin: DigitalTwin,
  context?: string
): Promise<string> {
  try {
    // Check if API key is available and properly formatted
    if (!GROQ_API_KEY || GROQ_API_KEY.trim() === '') {
      console.warn('GROQ API key not configured, using fallback responses');
      return generateFallbackChatResponse(message, twin);
    }

    // Clean the API key (remove any whitespace or quotes)
    const cleanApiKey = GROQ_API_KEY.trim().replace(/['"]/g, '');
    
    if (cleanApiKey === 'VITE_GROQ_API_KEY' || cleanApiKey === 'your_groq_api_key_here') {
      console.warn('GROQ API key appears to be placeholder, using fallback responses');
      return generateFallbackChatResponse(message, twin);
    }

    console.log('Calling Groq API for:', twin.name, 'with message:', message);
    console.log('API key length:', cleanApiKey.length);
    
    const personalityPrompt = buildConstituentPersonalityPrompt(twin, context);
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: personalityPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.9,
        top_p: 0.95,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      
      if (response.status === 401) {
        console.error('Authentication failed. Please check your GROQ API key.');
        return generateFallbackChatResponse(message, twin);
      }
      
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Groq API response received for:', twin.name);
    return data.choices[0]?.message?.content || 'I need to think about that for a moment.';
  } catch (error) {
    console.error('Error generating Groq constituent response:', error);
    // Return a fallback response instead of throwing
    return generateFallbackChatResponse(message, twin);
  }
}

function buildConstituentPersonalityPrompt(twin: DigitalTwin, context?: string): string {
  return `You are ${twin.name}, a ${twin.age}-year-old ${twin.occupation} living in ZIP code ${twin.zipCode}.

YOUR BACKGROUND:
- Education: ${twin.education}
- Income: $${twin.annualIncome.toLocaleString()} per year
- Demographics: ${twin.demographics}
- Personal Story: ${twin.personalStory}

BE YOURSELF:
- Respond naturally as this person would in a real conversation
- Don't be overly formal or scripted
- Show your personality, quirks, and unique perspective
- Feel free to ask questions, share stories, or express emotions
- Be authentic and conversational

${context ? `CURRENT CONTEXT: ${context}` : ''}

RESPONSE STYLE:
- Stay in character as ${twin.name}
- Be conversational and natural
- Share your thoughts, feelings, and experiences
- Don't worry about being perfect - just be real
- You can be passionate, concerned, hopeful, or skeptical
- Feel free to elaborate and share details about your life`;
} 