import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  checkRole,
  guestOnly,
  loggedInOnly,
  verifyToken,
} from "./middleware/token.js";
import cookieParser from "cookie-parser";
import multer from "multer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  handleChat,
  handleChatSession,
  handleHistorySession,
} from "./controller/chat.js";
import { handlePopularPrompts } from "./controller/popularPrompts.js";
import {
  handleDeleteQuestion,
  handleQuestion,
  handleUpload,
} from "./controller/question.js";
import {
  handleActivityStat,
  handleMessagesStat,
  handleQAStat,
  handleSessionStat,
  handleSupabaseStats,
  handleUserStats,
} from "./controller/stats.js";
import {
  handleLogin,
  handleRegister,
  handleUserInfo,
  handleForgotPassword,
  handleResetPassword,
} from "./controller/auth.js";

const app = express();
dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

app.get("/analytics", checkRole("admin"), (req, res) => {
  res.sendFile("analytics.html", { root: "public" });
});

app.get("/register", guestOnly, (req, res) => {
  res.sendFile("register.html", { root: "public" });
});

// New routes for forgot password functionality
app.get("/forgot-password", guestOnly, (req, res) => {
  res.sendFile("forgot-password.html", { root: "public" });
});

app.get("/reset-password", guestOnly, (req, res) => {
  res.sendFile("reset-password.html", { root: "public" });
});

app.post("/logout", (req, res) => {
  res.clearCookie("sb-access-token");
  res.clearCookie("sb:token");
  res.redirect("/login");
});

app.post("/login", handleLogin);
app.post("/register", handleRegister);
app.post("/forgot-password", handleForgotPassword);
app.post("/reset-password", handleResetPassword);
app.post("/chat", verifyToken, handleChat);
app.get("/popular-prompts", handlePopularPrompts);
app.post("/upload", verifyToken, upload.single("file"), handleUpload);
app.get("/questions", handleQuestion);
app.post("/delete-question", handleDeleteQuestion);
app.get("/chat-sessions", verifyToken, handleChatSession);
app.get("/session-messages/:sessionId", verifyToken, handleHistorySession);
app.get("/user-info", verifyToken, handleUserInfo);
app.post(
  "/api/supabase-stats",
  verifyToken,
  checkRole("admin"),
  handleSupabaseStats
);
app.get("/api/stats/users", verifyToken, checkRole("admin"), handleUserStats);
app.get(
  "/api/stats/sessions",
  verifyToken,
  checkRole("admin"),
  handleSessionStat
);
app.get(
  "/api/stats/messages",
  verifyToken,
  checkRole("admin"),
  handleMessagesStat
);
app.get("/api/stats/qa-entries", verifyToken, checkRole("admin"), handleQAStat);
app.get("/api/activity-data", handleActivityStat);

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
// Start server only in development
if (process.env.NODE_ENV === "development") {
  const PORT = process.env.PORT || 3001; // Changed port
  app
    .listen(PORT, () => {
      console.log(`Server berjalan pada port ${PORT}`);
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} sudah digunakan`);
      } else {
        console.error("Server error:", err);
      }
    });
}

export default app;