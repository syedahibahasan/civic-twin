import { DigitalTwin, Policy } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function generateGroqChatResponse(
  message: string,
  twin: DigitalTwin,
  policy?: Policy
): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/groq/policy-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        twin,
        policy
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.result || 'I need to think about that for a moment.';
  } catch (error) {
    console.error('Error generating Groq chat response:', error);
    return 'I apologize, but I\'m having trouble responding right now.';
  }
}

export async function generateGroqConstituentResponse(
  message: string,
  twin: DigitalTwin,
  context?: string
): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/groq/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        twin,
        context
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.result || 'I need to think about that for a moment.';
  } catch (error) {
    console.error('Error generating Groq constituent response:', error);
    // Return a fallback response instead of throwing
    return generateFallbackChatResponse(message, twin);
  }
}

function generateFallbackChatResponse(message: string, twin: DigitalTwin): string {
  const responses = [
    `Hi there! I'm ${twin.name}. Thanks for reaching out. I'm a ${twin.age}-year-old ${twin.occupation} from around here, and I'd be happy to chat about what's on your mind.`,
    `Hey, ${twin.name} here. I work as a ${twin.occupation} and I'm always interested in hearing about issues that affect our community. What would you like to discuss?`,
    `Hello! I'm ${twin.name}. As someone who ${twin.personalStory.toLowerCase()}, I think it's important we talk about things that matter to people like us. What's on your mind?`,
    `Hi, ${twin.name} speaking. I'm a ${twin.occupation} living in this area, and I care about how policies affect real people. What would you like to talk about?`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
} 