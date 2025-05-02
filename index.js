// server
import "dotenv/config";
import express from "express";
import cors from "cors";
import client, { progressConversation } from "./main.js";
import handleLogin from "./controller/login.js"; // Import the handleLogin function
import {
  checkRole,
  guestOnly,
  loggedInOnly,
  verifyToken,
} from "./middleware/token.js";
import cookieParser from "cookie-parser";
import multer from "multer";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import dotenv from "dotenv";

import fs from "fs/promises";
import { supabase } from "./db/db.js";
import handleRegister from "./controller/register.js";

const app = express();

dotenv.config();

// Middleware
app.use(express.json());
app.use(express.static("public"));
app.use(cors()); // Add CORS middleware to handle cross-origin requests
const upload = multer({ dest: "uploads/" });

// Add language detection middleware
const detectLanguage = (req, res, next) => {
  const acceptedLanguage = req.headers["accept-language"];
  req.language = acceptedLanguage?.startsWith("en") ? "en" : "id"; // Hanya ID atau EN
  next();
};

app.use(detectLanguage);
app.use(cookieParser());

app.get("/", loggedInOnly, (req, res) => {
  res.sendFile("home.html", { root: "public" });
});

app.get("/login", guestOnly, (req, res) => {
  res.sendFile("login.html", { root: "public" });
});

app.get("/dashboard", checkRole("admin"), (req, res) => {
  res.sendFile("dashboard.html", { root: "public" });
});

// Login endpoint
app.post("/login", handleLogin);

app.post("/register", handleRegister);

app.get("/register", guestOnly, (req, res) => {
  res.sendFile("register.html", { root: "public" });
});

// Chat endpoint
app.post("/chat", verifyToken, async (req, res) => {
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
    const response = await progressConversation(question, sessionId, req.user.id);
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

// add logout endpoint
app.post("/logout", (req, res) => {
  res.clearCookie("sb-access-token");
  res.clearCookie("sb:token");
  res.redirect("/login");
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
app.post("/upload", verifyToken, upload.single("file"), async (req, res) => {
  // Validate file exists
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


// Add these endpoints to your existing index.js server file

// Endpoint to fetch all chat sessions for the logged-in user
app.get("/chat-sessions", verifyToken, async (req, res) => {
  try {
    // Get user_id from the token verification middleware
    const userId = req.user.id;
    
    // Query sessions table to get all sessions for this user
    const { data, error } = await supabase
      .from("sessions")
      .select("id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
      
    if (error) throw error; 
    
    
    // For each session, get the first question as preview
    const sessionsWithPreview = await Promise.all(data.map(async (session) => {
      const { data: messages, error: msgError } = await supabase
        .from("messages")
        .select("body")
        .eq("session_id", session.id)
        .eq("message_type", "question")
        .order("created_at", { ascending: true })
        .limit(1);
        
      if (msgError) throw msgError;
      
      return {
        ...session,
        preview: messages.length > 0 ? messages[0].body : "Chat session"
      };
    }));
    
    res.json(sessionsWithPreview);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    res.status(500).json({
      error: "Failed to fetch chat sessions",
      details: error.message
    });
  }
});

// Endpoint to fetch all messages for a specific session
app.get("/session-messages/:sessionId", verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    // First verify that this session belongs to the user
    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();
      
    if (sessionError || !sessionData) {
      return res.status(403).json({
        error: "You don't have permission to access this session"
      });
    }
    
    // Get all messages for this session
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("body, message_type, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
      
    if (msgError) throw msgError;
    
    res.json(messages);
  } catch (error) {
    console.error("Error fetching session messages:", error);
    res.status(500).json({
      error: "Failed to fetch session messages",
      details: error.message
    });
  }
});


// Add this endpoint to your index.js file

// User info endpoint - returns logged in user's email
app.get("/user-info", verifyToken, async (req, res) => {
  try {
    // User data is already available from the verifyToken middleware
    const user = req.user;
    
    res.json({
      email: user.email
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({
      error: "Failed to fetch user information"
    });
  }
});


// Add these endpoints to your existing index.js file to support the dashboard statistics

// Generic endpoint for Supabase stats
app.post("/api/supabase-stats", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const { table, count, query } = req.body;
    
    if (!table) {
      return res.status(400).json({
        error: "Table name is required"
      });
    }
    
    // Simple count query
    if (count) {
      const { data, error, count: totalCount } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      
      return res.json({ count: totalCount });
    }
    
    // Custom query logic could be added here
    // Example: if (query === 'last7days') { ... }
    
    return res.status(400).json({
      error: "Invalid query parameters"
    });
  } catch (error) {
    console.error(`Stats API error:`, error);
    res.status(500).json({
      error: "Failed to fetch statistics",
      details: error.message
    });
  }
});

// Users statistics endpoint
app.get("/api/stats/users", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    res.json({ count });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({
      error: "Failed to fetch user statistics",
      details: error.message
    });
  }
});

// Sessions statistics endpoint
app.get("/api/stats/sessions", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const { data, error, count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    res.json({ count });
  } catch (error) {
    console.error("Error fetching session stats:", error);
    res.status(500).json({
      error: "Failed to fetch session statistics",
      details: error.message
    });
  }
});

// Messages statistics endpoint
app.get("/api/stats/messages", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const { data, error, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    res.json({ count });
  } catch (error) {
    console.error("Error fetching message stats:", error);
    res.status(500).json({
      error: "Failed to fetch message statistics",
      details: error.message
    });
  }
});

// QA entries statistics endpoint
app.get("/api/stats/qa-entries", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const { data, error, count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    res.json({ count });
  } catch (error) {
    console.error("Error fetching QA entry stats:", error);
    res.status(500).json({
      error: "Failed to fetch QA entries statistics",
      details: error.message
    });
  }
});

// Example Node.js endpoint (using Express)
app.get('/api/activity-data', async (req, res) => {
  try {
    // 1. Calculate date range
    const dateRange = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      dateRange.push(date.toISOString().split('T')[0]);
    }

    // 2. Fetch data from Supabase
    const [sessions, messages] = await Promise.all([
      supabase
        .from('sessions')
        .select('created_at')
        .gte('created_at', dateRange[0])
        .lte('created_at', dateRange[dateRange.length - 1]),
      supabase
        .from('messages')
        .select('created_at')
        .gte('created_at', dateRange[0])
        .lte('created_at', dateRange[dateRange.length - 1])
    ]);

    if (sessions.error || messages.error) {
      throw new Error('Database error');
    }

    // 3. Process data
    const countByDay = (data, range) => {
      const counts = Array(range.length).fill(0);
      data.forEach(item => {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        const index = range.indexOf(date);
        if (index !== -1) counts[index]++;
      });
      return counts;
    };

    // 4. Return processed data
    res.json({
      sessionsCount: countByDay(sessions.data, dateRange),
      messagesCount: countByDay(messages.data, dateRange)
    });

  } catch (error) {
    console.error('Activity data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});