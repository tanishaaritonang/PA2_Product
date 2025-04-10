// server
import "dotenv/config";
import express from "express";
import cors from "cors";
import client, { progressConversation } from "./main.js";
import handleLogin from "./controller/login.js"; // Import the handleLogin function
import { verifyToken } from "./middleware/token.js";
import cookieParser from "cookie-parser";
import multer from "multer";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import dotenv from "dotenv";

import fs from "fs/promises";
import { supabase } from "./db/db.js";

const app = express();

dotenv.config();

// Middleware
app.use(express.json());
app.use(express.static("public"));
app.use(cors()); // Add CORS middleware to handle cross-origin requests
const upload = multer({ dest: "uploads/" });

// Add language detection middleware
const detectLanguage = (req, res, next) => {
  const preferredLanguage = req.headers["accept-language"] || "en"; // Default to Indonesian
  next();
};

app.use(detectLanguage);
app.use(cookieParser());

app.get("/login", (req, res) => {
  res.sendFile("login.html", { root: "public" });
});

app.get("/dashboard", verifyToken, (req, res) => {
  res.sendFile("dashboard.html", { root: "public" });
});

// Login endpoint
app.post("/login", handleLogin);

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { question, sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: "Session ID is required",
      });
    }

    console.log("Received question:", question);
    console.log("Session ID:", sessionId);

    // Pass both question and sessionId to progressConversation
    const response = await progressConversation(question, sessionId);
    console.log("Generated response:", response);

    res.json(response);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      error:
        req.userLanguage === "en"
          ? "Maaf, terjadi kesalahan pada server. Silakan coba lagi nanti."
          : "Sorry, there was a server error. Please try again later.",
    });
  }
});

// Optional: Add endpoint to clear chat history
app.post("/clear-chat", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: "Session ID is required",
      });
    }

    // Here you would implement the logic to clear the chat history
    // This depends on how you're storing the chat history in main.js

    res.json({ success: true });
  } catch (error) {
    console.error("Error clearing chat:", error);
    res.status(500).json({
      error:
        req.userLanguage === "id"
          ? "Gagal menghapus riwayat chat"
          : "Failed to clear chat history",
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error:
      req.userLanguage === "id"
        ? "Terjadi kesalahan yang tidak terduga"
        : "An unexpected error occurred",
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan pada port ${PORT}`);
});

// In index.js (server)
// Add endpoint to get popular prompts
app.get("/popular-prompts", async (req, res) => {
  try {
    const { data, error } = await client
      .from("user_prompts")
      .select("prompt")
      .order("count", { ascending: false })
      .limit(3);

    if (error) throw error;

    res.json(data.map((item) => item.prompt));
  } catch (error) {
    console.error("Error fetching popular prompts:", error);
    res.status(500).json({
      error: "Failed to fetch popular prompts",
    });
  }
});

// Update your /upload endpoint to return the processed questions
app.post("/upload", upload.single("file"), async (req, res) => {
  // Validate file exists
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  let filePath = req.file.path;
  let processedQuestions = []; // Store processed questions to return them

  try {
    // Read the uploaded file
    const text = await fs.readFile(filePath, "utf-8");

    // First split by double newlines to separate each Q&A pair
    const qaPairs = text.split("\n\n").filter((pair) => pair.trim());

    // Create documents for each Q&A pair with metadata
    const documents = qaPairs.map((pair, index) => {
      const [question, answer] = pair.split("\n");

      // Store processed questions
      processedQuestions.push({
        question: question?.replace(/^Question:\s*/i, "").trim() || "",
        answer: answer?.replace(/^Answer:\s*/i, "").trim() || "",
      });

      return {
        pageContent: `${question}\n${answer}`.trim(),
        metadata: {
          question: question?.trim() || "",
          answer: answer?.trim() || "",
          source: req.file.originalname,
          pairId: index + 1,
          uploadedAt: new Date().toISOString(), // Add timestamp
        },
      };
    });

    // Initialize services with validation
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
});

// Add this endpoint to your existing server code (index.js)
app.get("/questions", async (req, res) => {
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
});

// Add this endpoint to your server
app.post("/delete-question", async (req, res) => {
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
});
