import cache from 'memory-cache';

// Simple in-memory cache for storing OpenAI API responses
// Cache responses for 30 minutes (1800000 ms)
const CACHE_TTL = 1800000;

// Create a key combining sessionId and question for caching
const createCacheKey = (sessionId, question) => {
  // Using a simple approach to combine sessionId and question
  return `${sessionId}:${question}`;
};

// Check if response is cached
export const getCachedResponse = (sessionId, question) => {
  const key = createCacheKey(sessionId, question);
  const cached = cache.get(key);
  return cached;
};

// Store response in cache
export const setCachedResponse = (sessionId, question, response) => {
  const key = createCacheKey(sessionId, question);
  cache.put(key, response, CACHE_TTL);
};

// Get the current cache size for monitoring
export const getCacheSize = () => {
  return cache.size();
};

// Clear the entire cache (useful for testing or maintenance)
export const clearCache = () => {
  cache.clear();
};

// Export the cache object for direct access if needed
export default cache;