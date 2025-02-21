const OpenAI = require('openai');
const cors = require('cors');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 8000,
  maxRetries: 1
});

// CORS middleware
const corsMiddleware = cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Serverless function handler
module.exports = async (req, res) => {
  // Handle CORS
  await new Promise((resolve, reject) => {
    corsMiddleware(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { context, question } = req.body;
    
    if (!context || !question) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    const trimmedContext = context.slice(0, 2000);
    const trimmedQuestion = question.slice(0, 200);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Provide very concise responses."
        },
        {
          role: "user",
          content: `Context: ${trimmedContext}\n\nQuestion: ${trimmedQuestion}\n\nAnswer:`
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const answer = completion.choices[0].message.content.trim();
    res.json({ answer });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'An error occurred while processing your request'
    });
  }
}; 