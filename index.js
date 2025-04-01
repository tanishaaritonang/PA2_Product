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

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Read the uploaded file
    const text = await fs.readFile(req.file.path, "utf-8");

    // Process the text with LangChain
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      separators: ["\n\n", "\n", " ", ""],
      chunkOverlap: 50,
    });

    const output = await splitter.createDocuments([text]);

    // Initialize Supabase and OpenAI
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const openAIApiKey = process.env.OPENAI_API_KEY;
    const embeddings = new OpenAIEmbeddings({ openAIApiKey });

    const client = createClient(supabaseUrl, supabaseKey);

    // Store the vectors in Supabase
    await SupabaseVectorStore.fromDocuments(output, embeddings, {
      client,
      tableName: "documents",
    });

    // Clean up the uploaded file
    await fs.unlink(req.file.path);

    res.json({ message: "File processed and stored successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error processing file" });
  }
});
