import express from 'express';
import { getAnswer } from './openai-caching.js';
import { getCacheSize, clearCache } from './cache.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Example endpoint that uses the caching system
app.post('/api/ask', async (req, res) => {
  try {
    const { sessionId, question, context, conv_history } = req.body;

    if (!sessionId || !question) {
      return res.status(400).json({ error: 'sessionId and question are required' });
    }

    const answer = await getAnswer(
      sessionId,
      question,
      context || '',
      conv_history || ''
    );

    res.json({
      answer,
      sessionId,
      question
    });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to check cache size
app.get('/api/cache/size', (req, res) => {
  const size = getCacheSize();
  res.json({ cacheSize: size });
});

// Endpoint to clear cache
app.delete('/api/cache/clear', (req, res) => {
  clearCache();
  res.json({ message: 'Cache cleared successfully' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;