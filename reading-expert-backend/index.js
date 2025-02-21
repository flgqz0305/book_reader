require('dotenv').config();
const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const app = express();
const OpenAI = require('openai');

// Log the environment and port for debugging
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

// Enable CORS with specific options
app.use(cors({
  origin: true, // Allow same-origin requests
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Define the API endpoint for Q&A
app.post('/api/qa', async (req, res) => {
  try {
    const { context, question } = req.body;
    
    if (!context || !question) {
      return res.status(400).json({ 
        error: 'Missing required fields: context and question are required' 
      });
    }

    console.log('Received context:', context);
    console.log('Received question:', question);

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert in technology trends, digital transformation, and AI. Provide thorough, balanced, and insightful responses based on the provided context."
        },
        {
          role: "user",
          content: `Context: ${context}\n\nQuestion: ${question}\n\nAnswer:`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const answer = completion.choices[0].message.content.trim();
    res.json({ answer });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something broke!',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3001; // Hardcoded port
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please try a different port or kill the process using this port.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  });
}

// Export for Vercel
module.exports = serverless(app);
