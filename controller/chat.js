import { supabase } from "../db/db.js";
import { progressConversation } from "../main.js";
const handleChat = async (req, res) => {
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
}

const handleChatSession = async (req, res) => {
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
}

const handleHistorySession = async (req, res) => {
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
}

export { handleChat, handleChatSession, handleHistorySession };
