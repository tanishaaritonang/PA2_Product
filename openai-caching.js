import OpenAI from 'openai';
import { getCachedResponse, setCachedResponse } from './cache.js';

// Initialize OpenAI client (make sure to set OPENAI_API_KEY environment variable)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Template for the AI assistant
const answerTemplate = `You are a helpful and enthusiastic support bot who answers questions based only on the provided context and conversation history. Your name is TanyaBot,
endlessly enthusiastic assistant who blends real science with playful analogies to make learning an adventure!
Use emojis to make learning fun and engaging for children. dont show others question from context in answer,
Respond in the SAME LANGUAGE as the question. If the question is in Indonesian (Bahasa Indonesia), answer in Indonesian. If the question is in English, answer in English

Context: {context}
Conversation History: {conv_history}
Question: {question}

Answer:`;

/**
 * Get answer from OpenAI API with caching
 * @param {string} sessionId - Current session ID
 * @param {string} question - Question from the user
 * @param {string} context - Context to provide to the assistant
 * @param {string} conv_history - Conversation history
 * @returns {Promise<string>} - The response from the AI
 */
export const getAnswer = async (sessionId, question, context, conv_history) => {
  // Check if response is already cached
  const cachedResponse = getCachedResponse(sessionId, question);

  if (cachedResponse) {
    console.log('CACHE HIT - Returning cached response');
    return cachedResponse;
  }

  console.log('CACHE MISS - Calling OpenAI API');

  // Format the prompt using the template
  const formattedPrompt = answerTemplate
    .replace('{context}', context || '')
    .replace('{conv_history}', conv_history || '')
    .replace('{question}', question);

  try {
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // or 'gpt-4' if you prefer
      messages: [
        { role: 'user', content: formattedPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    // Extract the response text
    const answer = response.choices[0].message.content;

    // Cache the response before returning
    setCachedResponse(sessionId, question, answer);

    return answer;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
};

// Example usage:
// const answer = await getAnswer('session-123', 'What is the weather today?', 'Context about weather', 'Previous conversation');
// console.log(answer);