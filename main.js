import { ChatMessageHistory } from "langchain/memory";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { retriever } from "./retriever.js";
import { combineDocuments } from "./combineDocuments.js";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { formatConvHistory } from "./formatConvHistory.js";

const openAIApiKey = process.env.OPENAI_API_KEY;
const llm = new ChatOpenAI({ openAIApiKey });

const standaloneQuestionTemplate = `Given some conversation history (if any) and a question, convert the question to a standalone question. 
conversation history: {conv_history}
question: {question} 
standalone question:`
const standaloneQuestionPrompt = PromptTemplate.fromTemplate(standaloneQuestionTemplate)

const answerTemplate = `
You are a helpful and enthusiastic support bot who answers questions based only on the provided context and conversation history. If the answer is not available in either, simply respond with, "I'm sorry, I don't know the answer to that. 🤔" and encourage curiosity with a friendly tone. Use emojis to make learning fun and engaging for children.

Context: {context}

Conversation History: {conv_history}

Question: {question}

Answer:
`;
const answerPrompt = PromptTemplate.fromTemplate(answerTemplate)

const standaloneQuestionChain = standaloneQuestionPrompt
    .pipe(llm)
    .pipe(new StringOutputParser())

const retrieverChain = RunnableSequence.from([
    prevResult => prevResult.standalone_question,
    retriever,
    combineDocuments
])

const answerChain = answerPrompt
    .pipe(llm)
    .pipe(new StringOutputParser())

const chain = RunnableSequence.from([
    {
        standalone_question: standaloneQuestionChain,
        original_input: new RunnablePassthrough()
    },
    {
        context: retrieverChain,
        question: ({ original_input }) => original_input.question,
        conv_history: ({ original_input }) => original_input.conv_history
    },
    answerChain
])

const convHistory = []


// Enhanced conversation processing function
export async function progressConversation(question, sessionId) {
    try {
        console.log(convHistory)
        console.log(question)
        const response = await chain.invoke({
            question: question,
            conv_history: formatConvHistory(convHistory)
        })
        convHistory.push(question)
        convHistory.push(response)

        
        return response;
    } catch (error) {
        console.error('Error in conversation:', error);
        return "I'm sorry, I encountered an error. Please try again or contact support.";
    }
}

