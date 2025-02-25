const OpenAI = require('openai');
const { tavily } = require("@tavily/core");
const cors = require('cors');
require('dotenv').config();

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 8000,
  maxRetries: 1
});

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

// Function to generate optimized search query
async function generateSearchQuery(context, question) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a search query optimizer. Your task is to create a detailed and specific search query based on the provided context and question. The query should help find relevant supplementary information. Return only the search query, no other text."
      },
      {
        role: "user",
        content: `Context: ${context}\n\nUser Question: ${question}\n\nGenerate a comprehensive search query that will help find relevant additional information:`
      }
    ],
    temperature: 0.3,
    max_tokens: 100
  });
  
  return response.choices[0].message.content.trim();
}

// Function to perform web search
async function performWebSearch(context, question) {
  try {
    const optimizedQuery = await generateSearchQuery(context, question);
    console.log('Optimized search query:', optimizedQuery);
    
    const searchResults = await tvly.search({
      query: optimizedQuery,
      search_depth: "basic",
      max_results: 3
    });
    
    return searchResults.results.map(result => ({
      title: result.title,
      content: result.content,
      url: result.url
    }));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// Function to decide if web search is needed
async function shouldPerformWebSearch(context, question) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a decision maker. Determine if the given question requires additional web search to supplement the provided context. Consider whether the context alone provides sufficient information to answer the question comprehensively. Respond with 'true' if web search would be helpful, 'false' if the context is sufficient."
      },
      {
        role: "user",
        content: `Context: ${context}\n\nQuestion: ${question}\n\nShould I perform a web search? Answer only with 'true' or 'false':`
      }
    ],
    temperature: 0.1,
    max_tokens: 5
  });
  
  return response.choices[0].message.content.trim().toLowerCase() === 'true';
}

// CORS middleware
const corsMiddleware = cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Main handler
const qaHandler = async (req, res) => {
  try {
    const { context, question, conversationHistory } = req.body;
    
    console.log('Received request:', {
      contextLength: context?.length,
      question,
      historyLength: conversationHistory?.length
    });

    if (!context || !question) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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

    // Decide if web search is needed
    const needsWebSearch = await shouldPerformWebSearch(context, question);
    let searchResults = [];
    
    if (needsWebSearch) {
      searchResults = await performWebSearch(context, question);
    }

    // Combine context with search results if any
    const searchContext = searchResults.length > 0 
      ? "\n\nAdditional information from web search:\n" + 
        searchResults.map(r => `${r.title}: ${r.content}`).join('\n')
      : '';

    // Add timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 50000);
    });

    // Final response generation using apiCallPromise
    const apiCallPromise = openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful reading companion. Your goal is to help users understand and analyze text. Provide clear, informative answers that enhance comprehension while encouraging critical thinking. When appropriate, highlight key concepts, make connections, and explain complex ideas in simpler terms. Keep responses focused and concise."
        },
        {
          role: "user",
          content: `Here is the text passage to discuss: ${context}${searchContext}`
        },
        {
          role: "assistant",
          content: "I understand. I'll help you analyze this text. What would you like to know?"
        },
        ...(conversationHistory || []),
        {
          role: "user",
          content: question
        }
      ],
      temperature: 0.7,
    });

    // Race between timeout and API call
    const completion = await Promise.race([
      apiCallPromise,
      timeoutPromise
    ]);

    const answer = completion.choices[0].message.content.trim();
    
    res.json({ 
      answer,
      usedWebSearch: needsWebSearch,
      searchResults: needsWebSearch ? searchResults : null,
      conversationHistory: [
        ...(conversationHistory || []),
        { role: "user", content: question },
        { role: "assistant", content: answer }
      ]
    });

  } catch (error) {
    console.error('Error in QA handler:', error);
    
    // More specific error messages
    let errorMessage = "An error occurred while processing your request.";
    if (error.message === 'Request timeout') {
      errorMessage = "The request took too long to process. Please try again with a shorter text or question.";
    } else if (error.code === 'ECONNRESET' || error.type === 'request_timeout') {
      errorMessage = "Connection timeout. Please check your internet connection and try again.";
    }
    
    res.status(500).json({ error: errorMessage });
  }
};

module.exports = qaHandler; 
