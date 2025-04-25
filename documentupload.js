import { createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { promises as fs } from 'fs';
import dotenv from "dotenv";
dotenv.config();

try {
    // Read the uploaded file
    const text = await fs.readFile("datasets.txt", "utf-8");

    // Normalize line breaks: Replace \r\n (Windows) with \n (Unix)
    const normalizedText = text.replace(/\r\n/g, "\n");

    // Split by double newlines to separate each Q&A pair
    const qaPairs = normalizedText.split("\n\n").filter((pair) => pair.trim());

    // Create documents for each Q&A pair with metadata
    const documents = qaPairs.map((pair, index) => {
        // Split into lines and filter out empty lines
        const lines = pair.split("\n").filter((line) => line.trim());

        // Assume first line is question, rest are answer (join in case answer has multiple lines)
        const question = lines[0]?.replace(/^Question:\s*/i, "").trim() || "";
        const answer = lines.slice(1)
                          .join("\n")
                          ?.replace(/^Answer:\s*/i, "")
                          .trim() || "";

        return {
            pageContent: `${question}\n${answer}`.trim(),
            metadata: {
                question,
                answer,
                source: "datasets.txt", // Using filename since this isn't from upload
                pairId: index + 1,
                uploadedAt: new Date().toISOString(),
                // Note: No user_id here since this is a standalone script
            },
        };
    });

    // Validate environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY || !process.env.OPENAI_API_KEY) {
        throw new Error("Missing required environment variables");
    }

    // Initialize embeddings and Supabase client
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const client = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );

    // Store vectors with custom schema
    await SupabaseVectorStore.fromDocuments(documents, embeddings, {
        client,
        tableName: "documents",
        queryName: "match_documents",
        columns: {
            id: "id",
            content: "content",
            metadata: "metadata",
            embedding: "embedding",
            question: "question",
            answer: "answer",
            source: "source",
        },
    });

    console.log({
        success: true,
        message: "File processed successfully",
        pairsProcessed: documents.length,
    });

} catch (error) {
    console.error("Processing error:", error);
}