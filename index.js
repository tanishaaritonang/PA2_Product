// server
import 'dotenv/config';
import express from "express";
import cors from 'cors';
import client, { progressConversation } from "./main.js";
// import supabase from "./main.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(cors()); // Add CORS middleware to handle cross-origin requests

// Add language detection middleware
const detectLanguage = (req, res, next) => {
    const preferredLanguage = req.headers['accept-language'] || 'en'; // Default to Indonesian
    // req.userLanguage = preferredLanguage.startsWith('end') ? 'id' : 'en';
    next();
};

app.use(detectLanguage);

// Chat endpoint
app.post("/chat", async (req, res) => {
    try {
        const { question, sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({
                error: "Session ID is required"
            });
        }

        console.log('Received question:', question);
        console.log('Session ID:', sessionId);
        
        // Pass both question and sessionId to progressConversation
        const response = await progressConversation(question, sessionId);
        console.log('Generated response:', response);
        
        res.json(response);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            error: req.userLanguage === 'en' 
                ? "Maaf, terjadi kesalahan pada server. Silakan coba lagi nanti."
                : "Sorry, there was a server error. Please try again later."
        });
    }
});

// Optional: Add endpoint to clear chat history
app.post("/clear-chat", async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({
                error: "Session ID is required"
            });
        }

        // Here you would implement the logic to clear the chat history
        // This depends on how you're storing the chat history in main.js
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error clearing chat:', error);
        res.status(500).json({
            error: req.userLanguage === 'id'
                ? "Gagal menghapus riwayat chat"
                : "Failed to clear chat history"
        });
    }
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "healthy" });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: req.userLanguage === 'id'
            ? "Terjadi kesalahan yang tidak terduga"
            : "An unexpected error occurred"
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
            .from('user_prompts')
            .select('prompt')
            .order('count', { ascending: false })
            .limit(3);
        
        if (error) throw error;
        
        res.json(data.map(item => item.prompt));
    } catch (error) {
        console.error('Error fetching popular prompts:', error);
        res.status(500).json({
            error: "Failed to fetch popular prompts"
        });
    }
});