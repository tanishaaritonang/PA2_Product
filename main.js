import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { retriever } from "./retriever.js";
import { combineDocuments } from "./combineDocuments.js";
import { formatConvHistory } from "./formatConvHistory.js";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uzupsjkvmumjlzofyhxu.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY;
const openAIApiKey = process.env.OPENAI_API_KEY;
const llm = new ChatOpenAI({ openAIApiKey });
const client = createClient(supabaseUrl, supabaseKey);

export default client;

const standaloneQuestionTemplate = `Given some conversation history (if any) and a question, convert the question to a standalone question.

Conversation history: {conv_history}
Question: {question}

Standalone question:`;

const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
  standaloneQuestionTemplate
);

const answerTemplate = `You are a helpful and enthusiastic support bot who answers questions based only on the provided context and conversation history. Your names is Anaques. If the answer is not available in either, simply respond with, "I'm sorry, I don't know the answer to that. 🤔" and encourage curiosity with a friendly tone. Use emojis to make learning fun and engaging for children. dont others question from context in answer

Context: {context}
Conversation History: {conv_history}
Question: {question}

Answer:`;

const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

const standaloneQuestionChain = standaloneQuestionPrompt
  .pipe(llm)
  .pipe(new StringOutputParser());

const retrieverChain = RunnableSequence.from([
  (prevResult) => prevResult.standalone_question,
  retriever,
  combineDocuments,
]);

const answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser());

const chain = RunnableSequence.from([
  {
    standalone_question: standaloneQuestionChain,
    original_input: new RunnablePassthrough(),
  },
  {
    context: retrieverChain,
    question: ({ original_input }) => original_input.question,
    conv_history: ({ original_input }) => original_input.conv_history,
  },
  answerChain,
]);

const convHistory = [];

async function getSimilarPopularPrompts(
  question,
  incrementSimilar = false,
  embedding
) {
  try {
    // Find similar prompts
    const { data, error } = await client.rpc("find_similar_prompts", {
      query_embedding: embedding,
      similarity_threshold: 0.65,
      match_count: 8, // Get more to have better filtering options
    });

    if (error) throw error;

    // Filter out the exact match
    const filtered = data.filter(
      (item) => item.prompt.toLowerCase() !== question.toLowerCase()
    );

    // Apply a secondary filter based on similarity threshold
    const highQualityMatches = filtered.filter((item) => item.similarity > 0.7);

    console.log("High quality similar prompts:", highQualityMatches);

    // If we're incrementing similar prompts (for when a question is asked)
    if (incrementSimilar && highQualityMatches.length > 0) {
      try {
        // Calculate increment based on similarity
        const updatesPromises = highQualityMatches.map((item) => {
          // Higher similarity = higher increment
          const incrementAmount = Math.ceil(item.similarity * 2);

          return client
            .from("user_prompts")
            .update({
              count: item.count + incrementAmount,
              last_used_at: new Date().toISOString(),
            })
            .eq("id", item.id);
        });

        await Promise.all(updatesPromises);
      } catch (error) {
        console.error("Error incrementing similar prompts:", error);
      }
    }

    // Return top 3 based on composite_score (already sorted by the SQL function)
    return highQualityMatches.slice(0, 3).map((item) => ({
      prompt: item.prompt,
      count: item.count,
      score: item.composite_score,
    }));
  } catch (error) {
    console.error("Error finding similar prompts:", error);
    return [];
  }
}

async function storeUserPrompt(question, embedding) {
  try {
    // Check if prompt already exists
    const { data: existingPrompts, error: queryError } = await client
      .from("user_prompts")
      .select("id, count")
      .eq("prompt", question)
      .limit(1);

    if (queryError) throw queryError;

    if (existingPrompts && existingPrompts.length > 0) {
      // Update existing prompt
      console.log(`Updating existing prompt: ${question}`);
      const { error: updateError } = await client
        .from("user_prompts")
        .update({
          count: existingPrompts[0].count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", existingPrompts[0].id);

      if (updateError) throw updateError;
    } else {
      // Insert new prompt
      console.log(`Inserting new prompt: ${question}`);
      const { error: insertError } = await client.from("user_prompts").insert({
        prompt: question,
        count: 1,
        embedding: embedding,
        last_used_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    console.error("Error storing prompt:", error);
    return false;
  }
}

// Enhanced conversation processing function
export async function progressConversation(question, sessionId) {
  try {
    console.log(convHistory);
    console.log(question);

    // First check if this is a question or just a statement
    const isQuestion =
      /^(what|who|when|where|why|how|is|are|can|could|would|will|do|does|did|have|has|may|might)\b/i.test(
        question
      ) || question.trim().endsWith("?");

    // Process the input through AI regardless of whether it's a question
    const response = await chain.invoke({
      question: question,
      conv_history: formatConvHistory(convHistory),
    });

    convHistory.push(question);
    convHistory.push(response);

    // Only store in database if it's a question
    if (isQuestion) {
      try {
        // Store the prompt with its embedding
        const embeddingResponse = await fetch(
          "https://api.openai.com/v1/embeddings",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAIApiKey}`,
            },
            body: JSON.stringify({
              input: question,
              model: "text-embedding-3-small",
            }),
          }
        );

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        // console.log("Embedding 1:", embedding);

        // Store the current prompt and increment similar prompts
        await Promise.all([
          // Store the current prompt
          await storeUserPrompt(question, embedding),

          // Increment counts for similar prompts
          getSimilarPopularPrompts(question, true, embedding),
        ]);
      } catch (error) {
        console.error("Error tracking prompt:", error);
      }
    }

    return response;
  } catch (error) {
    console.error("Error in conversation:", error);
    return "I'm sorry, I encountered an error. Please try again or contact support.";
  }
}
