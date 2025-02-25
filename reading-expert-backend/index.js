require('dotenv').config();
const express = require('express');
const cors = require('cors');
const qaHandler = require('./api/qa');

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Route handler
app.post('/api/qa', async (req, res) => {
  try {
    await qaHandler(req, res);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
}); 