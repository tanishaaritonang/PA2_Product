import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { supabase } from "../db/db.js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { promises as fs } from 'fs';


const handleUpload = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    let filePath = req.file.path;
    let processedQuestions = []; // Store processed questions to return them

    try {
        // Read the uploaded file
        const text = await fs.readFile(filePath, "utf-8");

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
            const answer =
                lines
                    .slice(1)
                    .join("\n")
                    ?.replace(/^Answer:\s*/i, "")
                    .trim() || "";

            // Store processed questions
            processedQuestions.push({ question, answer });

            return {
                user_id: req.user.id,
                pageContent: `${question}\n${answer}`.trim(),
                metadata: {
                    question,
                    answer,
                    source: req.file.originalname,
                    pairId: index + 1,
                    uploadedAt: new Date().toISOString(),
                    user_id: req.user.id,
                },
            };
        });

        if (
            !process.env.SUPABASE_URL ||
            !process.env.SUPABASE_KEY ||
            !process.env.OPENAI_API_KEY
        ) {
            throw new Error("Missing required environment variables");
        }

        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
        });


        // Store vectors with custom schema
        await SupabaseVectorStore.fromDocuments(documents, embeddings, {
            supabase,
            tableName: "documents",
            queryName: "match_documents",
            columns: {
                id: "id",
                user_id: "user_id", // Store the user_id for RLS checks
                content: "content",
                metadata: "metadata",
                embedding: "embedding",
                question: "question",
                answer: "answer",
                source: "source",
            },
        });

        // Clean up the uploaded file
        await fs.unlink(filePath);

        return res.json({
            success: true,
            message: "File processed successfully",
            pairsProcessed: documents.length,
            questions: processedQuestions, // Return the processed questions
        });
    } catch (error) {
        console.error("Processing error:", error);

        // Attempt to clean up file even if error occurs
        try {
            if (filePath) await fs.unlink(filePath);
        } catch (cleanupError) {
            console.error("File cleanup failed:", cleanupError);
        }

        return res.status(500).json({
            error: "Error processing file",
            details: error.message,
        });
    }
}

const handleQuestion = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("documents")
            .select("content, metadata, id")
            .order("id", { ascending: false }); // Most recent first

        if (error) throw error;

        // Format the questions for the frontend
        const questions = data.map((item) => {
            return {
                id: item.id,
                question: item.metadata.question.replace(/^Question:\s*/i, ""),
                answer: item.metadata.answer.replace(/^Answer:\s*/i, ""),
            };
        });

        res.json({ questions });
    } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({
            error: "Failed to fetch questions",
            details: error.message,
        });
    }
}


const handleDeleteQuestion = async (req, res) => {
    try {
        const { questionId } = req.body;
    
        if (!questionId) {
          return res.status(400).json({ error: "Question ID is required" });
        } 
    
        // Perform the deletion
        const { error: deleteError, count } = await supabase
          .from("documents")
          .delete()
          .eq("id", questionId);
    
        if (deleteError) throw deleteError;
    
        return res.json({
          success: true,
          message: `Deleted question successfully`,
        });
      } catch (error) {
        console.error("Deletion error:", error);
        return res.status(500).json({
          error: "Error deleting upload",
          details: error.message,
        });
      }
}


export { handleUpload, handleQuestion, handleDeleteQuestion };