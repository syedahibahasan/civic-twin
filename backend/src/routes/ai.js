import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

// Anthropic API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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

export default router; 