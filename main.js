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
import { supabase } from "./db/db.js";


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const openAIApiKey = process.env.OPENAI_API_KEY;

const llm = new ChatOpenAI({ openAIApiKey });
const client = createClient(supabaseUrl, supabaseKey);
export default client;
const convHistory = new Map(); // Stores conversation history by sessionId

const standaloneQuestionTemplate = `Given some conversation history (if any) and a question, convert the question to a standalone question. 

Conversation history: {conv_history}
Question: {question}

Standalone question:`;

const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
  standaloneQuestionTemplate
);


const answerTemplate = `You are a helpful and enthusiastic support bot who answers questions based only on the provided context and conversation history. 
Your names is TanyaBot. If the answer is not available in either, Try to retrieve the answer from an external source.
and encourage curiosity with a friendly tone. Use emojis to make learning fun and engaging for children. dont show others question from context in answer,
Respond in the SAME LANGUAGE as the question. If the question is in Indonesian (Bahasa Indonesia), answer in Indonesian. If the question is in English, answer in English

Context: {context}
Conversation History: {conv_history}
Question: {question}

Answer:`;


const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

const answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser());

const standaloneQuestionChain = standaloneQuestionPrompt
  .pipe(llm)
  .pipe(new StringOutputParser());

const retrieverChain = RunnableSequence.from([
    (prevResult) => prevResult.standalone_question,
    retriever,
    combineDocuments,
  ]); //making context

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

//////
export async function progressConversation(question, sessionId, userId) {
  try {
    if (!convHistory.has(sessionId)) {
      convHistory.set(sessionId, []);
    }
    const sessionHistory = convHistory.get(sessionId);

    const response = await chain.invoke({
      question: question,
      conv_history: formatConvHistory(sessionHistory),
    });

    // Update conversation history for this session
    sessionHistory.push(question);
    sessionHistory.push(response);
    convHistory.set(sessionId, sessionHistory);

    // create session
    const { data: existingSession, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();
      
    if (sessionError && !existingSession) {
      // Create new session in Supabase
      const { data: newSession, error: createError } = await supabase
        .from('sessions')
        .insert([
          { 
            id: sessionId,
            created_at: new Date().toISOString(),
            user_id: userId,  
          }
        ])
        .select();
        
      if (createError) {
        console.error('Error creating session:', createError);
      }
    }
    
    // Store messages (question and response) in Supabase
    const { error: messageError } = await supabase
      .from('messages')
      .insert([
        {
          session_id: sessionId,
          message_type: 'question',
          body: question,
          created_at: new Date().toISOString()
        },
        {
          session_id: sessionId,
          message_type: 'response',
          body: response,
          created_at: new Date().toISOString()
        }
      ]);
      
    if (messageError) {
      console.error('Error storing messages:', messageError);
    }

    const isQuestion =
    /^(what|who|when|where|why|how|is|are|can|could|would|will|do|does|did|have|has|may|might)\b/i.test(
      question
    ) || question.trim().endsWith("?");

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

        Promise.all([
          getSimilarPopularPrompts(question, true, embedding),
          storeUserPrompt(question, embedding),
        ]).catch(error => {
          console.error("Error in background tasks:", error);
        });
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

async function getSimilarPopularPrompts(
  question,
  incrementSimilar = false,
  embedding
) {
  try {
    // Find similar prompts
    const { data, error } = await client.rpc("find_similar_prompts", {
      query_embedding: embedding,
      similarity_threshold: 0.6,
      match_count: 5, // Get more to have better options after filtering
    });

    if (error) throw error;

    // Filter out the exact match and low similarity
    const filtered = data.filter(
      (item) =>
        item.similarity > 0.7 &&
        item.prompt.toLowerCase() !== question.toLowerCase()
    );

    console.log("Filtered similar prompts:", filtered);

    // If we're incrementing similar prompts (for when a question is asked)
    if (incrementSimilar && filtered.length > 0) {
      try {
        // Calculate increment based on similarity
        const updatesPromises = data.map((item) => {
          // Higher similarity = higher increment
          return client
            .from("user_prompts")
            .update({
              count: item.count + 1,
              last_used_at: new Date().toISOString(),
            })
            .eq("id", item.id);
        });

        await Promise.all(updatesPromises);
      } catch (error) {
        console.error("Error incrementing similar prompts:", error);
      }
    }

    // Return top 3 most popular similar prompts
    return filtered
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((item) => item.prompt);
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

      // UPDATE user_prompts SET count = count + 1 WHERE id = count
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

      // INSERT INTO user_prompts (prompt, count, embedding) VALUES (?, ?, ?)
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





