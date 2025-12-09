# OpenAI Caching System

This implementation provides a simple in-memory caching solution for OpenAI API responses in your Node.js application.

## Files Included

- `cache.js` - Core caching module with in-memory cache
- `openai-caching.js` - Main implementation with `getAnswer()` function
- `example-server.js` - Example Express server integration
- `cached-main.js` - Cached version of your existing main.js with integrated caching
- `caching-readme.md` - This documentation

## Installation

1. Install the required dependency:
```bash
npm install memory-cache
```

2. Make sure you have your OpenAI API key set as an environment variable:
```bash
OPENAI_API_KEY=your_api_key_here
```

## How It Works

1. **Cache Key Creation**: Combines `sessionId` and `question` to create a unique cache key
2. **Cache Check**: Before calling OpenAI API, checks if response is already cached
3. **Cache Hit**: Returns cached response with logging "CACHE HIT"
4. **Cache Miss**: Calls OpenAI API, stores response in cache, returns result with logging "CACHE MISS"

## Usage

### Using the getAnswer function:
```javascript
import { getAnswer } from './openai-caching.js';

const answer = await getAnswer(
  sessionId,      // Unique session identifier
  question,       // User's question
  context,        // Context for the AI
  conv_history    // Conversation history
);
```

### API Endpoint Example:
```
POST /api/ask
{
  "sessionId": "session-123",
  "question": "What is the capital of France?",
  "context": "Geography knowledge base",
  "conv_history": "Previous conversation..."
}
```

## Integration with Your Existing Application

For direct integration with your existing `main.js` file, I've created `cached-main.js`, which is a version of your existing file with caching integrated:

1. Replace your existing `main.js` with `cached-main.js`, or
2. Copy the caching logic into your existing `main.js`

The cached version of `progressConversation` function:
- Checks if the same question was asked in the same session
- Logs "CACHE HIT" when returning cached data
- Logs "CACHE MISS" when calling the API
- Caches responses using session ID and question as the key
- Maintains all existing functionality (Supabase storage, conversation history, etc.)

## Cache Management Endpoints

- `GET /api/cache/size` - Get current cache size
- `DELETE /api/cache/clear` - Clear the entire cache

## Configuration

- Cache Time-to-Live (TTL): 30 minutes (1800000 ms)
- Cache storage: In-memory using memory-cache library

## Integration with Existing Code

To integrate with your existing application:

1. Import the `getAnswer` function:
```javascript
import { getAnswer } from './openai-caching.js';
```

2. Replace your existing OpenAI API calls with:
```javascript
const answer = await getAnswer(sessionId, question, context, conv_history);
```

3. The caching will be handled automatically with the same interface.

## Benefits

- Reduces API calls for repeated questions in the same session
- Improves response times for cached content
- Simple, lightweight implementation
- Easy to integrate with Express or Next.js applications
- Clear logging for monitoring cache performance