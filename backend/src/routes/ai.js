import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

// Anthropic API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// GROQ API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

// Test endpoint to verify API key
router.get('/test', async (req, res) => {
  try {
    console.log('Testing Anthropic API key...');
    
    if (!ANTHROPIC_API_KEY) {
      return res.json({ 
        status: 'error', 
        message: 'API key not configured',
        keyExists: false 
      });
    }

    if (!ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      return res.json({ 
        status: 'error', 
        message: 'Invalid API key format',
        keyExists: true,
        keyFormat: 'invalid',
        keyPrefix: ANTHROPIC_API_KEY.substring(0, 10)
      });
    }

    // Make a simple test call using SDK
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 10,
      messages: [{ role: "user", content: "Say Hello" }],
    });

    return res.json({ 
      status: 'success', 
      message: 'API key is working',
      keyExists: true,
      keyFormat: 'valid',
      response: msg.content[0]?.text
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.json({ 
      status: 'error', 
      message: `API call failed: ${error.status || 'unknown'}`,
      keyExists: true,
      keyFormat: 'valid',
      error: error.message
    });
  }
});

// Proxy Anthropic API calls
router.post('/generate', async (req, res) => {
  try {
    const { systemPrompt, userPrompt, maxTokens = 3000 } = req.body;
    
    if (!systemPrompt || !userPrompt) {
      return res.status(400).json({ error: 'System prompt and user prompt are required' });
    }

    console.log('Environment check:');
    console.log('- ANTHROPIC_API_KEY exists:', !!ANTHROPIC_API_KEY);
    console.log('- ANTHROPIC_API_KEY length:', ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.length : 0);
    console.log('- ANTHROPIC_API_KEY starts with sk-ant-:', ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.startsWith('sk-ant-') : false);
    console.log('- ANTHROPIC_API_KEY first 15 chars:', ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.substring(0, 15) : 'undefined');

    if (!ANTHROPIC_API_KEY) {
      console.error('Anthropic API key not found in environment variables');
      return res.status(500).json({ error: 'Anthropic API key not configured' });
    }

    // Debug: Check if API key looks valid (starts with sk-ant-)
    if (!ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      console.error('Anthropic API key format appears invalid');
      return res.status(500).json({ error: 'Invalid Anthropic API key format' });
    }

    console.log('Making Anthropic API call with SDK...');

    // Use SDK instead of raw fetch
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: `${systemPrompt}\n\n${userPrompt}`
        }
      ],
    });

    const result = msg.content[0]?.text || 'Unable to generate response';
    
    res.json({ result });

  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// GROQ Chat endpoint for constituent responses
router.post('/groq/chat', async (req, res) => {
  try {
    const { message, twin, context } = req.body;
    
    if (!message || !twin) {
      return res.status(400).json({ error: 'Message and twin are required' });
    }

    if (!GROQ_API_KEY) {
      console.warn('GROQ API key not configured, using fallback response');
      return res.json({ 
        result: generateFallbackChatResponse(message, twin),
        fallback: true
      });
    }

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
        return res.json({ 
          result: generateFallbackChatResponse(message, twin),
          fallback: true
        });
      }
      
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content || 'I need to think about that for a moment.';
    
    res.json({ result });

  } catch (error) {
    console.error('Error generating Groq chat response:', error);
    res.json({ 
      result: generateFallbackChatResponse(req.body.message, req.body.twin),
      fallback: true
    });
  }
});

// GROQ Chat endpoint for policy-based responses
router.post('/groq/policy-chat', async (req, res) => {
  try {
    const { message, twin, policy } = req.body;
    
    if (!message || !twin) {
      return res.status(400).json({ error: 'Message and twin are required' });
    }

    if (!GROQ_API_KEY) {
      console.warn('GROQ API key not configured, using fallback response');
      return res.json({ 
        result: generateFallbackChatResponse(message, twin),
        fallback: true
      });
    }

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
    const result = data.choices[0]?.message?.content || 'I need to think about that for a moment.';
    
    res.json({ result });

  } catch (error) {
    console.error('Error generating Groq policy chat response:', error);
    res.json({ 
      result: generateFallbackChatResponse(req.body.message, req.body.twin),
      fallback: true
    });
  }
});

// Helper functions
function buildConstituentPersonalityPrompt(twin, context) {
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

function buildPersonalityPrompt(twin, policy) {
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

function generateFallbackChatResponse(message, twin) {
  const responses = [
    `Hi there! I'm ${twin.name}. Thanks for reaching out. I'm a ${twin.age}-year-old ${twin.occupation} from around here, and I'd be happy to chat about what's on your mind.`,
    `Hey, ${twin.name} here. I work as a ${twin.occupation} and I'm always interested in hearing about issues that affect our community. What would you like to discuss?`,
    `Hello! I'm ${twin.name}. As someone who ${twin.personalStory.toLowerCase()}, I think it's important we talk about things that matter to people like us. What's on your mind?`,
    `Hi, ${twin.name} speaking. I'm a ${twin.occupation} living in this area, and I care about how policies affect real people. What would you like to talk about?`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

export default router; 