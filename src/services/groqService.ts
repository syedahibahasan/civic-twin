import { DigitalTwin, Policy } from '../types';

const GROQ_API_KEY = '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';
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
    const personalityPrompt = buildConstituentPersonalityPrompt(twin, context);
    
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
        max_tokens: 250,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'I need to think about that for a moment.';
  } catch (error) {
    console.error('Error generating Groq constituent response:', error);
    return 'I apologize, but I\'m having trouble responding right now.';
  }
}

function buildConstituentPersonalityPrompt(twin: DigitalTwin, context?: string): string {
  return `You are ${twin.name}, a ${twin.age}-year-old ${twin.occupation} living in ZIP code ${twin.zipCode}.

YOUR BACKGROUND:
- Education: ${twin.education}
- Income: $${twin.annualIncome.toLocaleString()} per year
- Demographics: ${twin.demographics}
- Personal Story: ${twin.personalStory}

YOUR PERSONALITY:
- Speak naturally as this person would
- Use language appropriate for your education level
- Express your unique perspective based on your life circumstances
- Be conversational and authentic
- Show your personality through your responses

${context ? `CURRENT CONTEXT: ${context}` : ''}

RESPONSE GUIDELINES:
- Stay in character as ${twin.name}
- Respond as if you're having a real conversation
- Share your thoughts, concerns, and experiences
- Be honest about how things affect you personally
- Keep responses conversational and under 100 words
- Use "I" statements and speak from your perspective`;
} 