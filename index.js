// server
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
import dotenv from "dotenv";
import { handleChat, handleChatSession } from "./controller/chat.js";
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
} from "./controller/auth.js";
import path from "path";
import { fileURLToPath } from "url";
const app = express();
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

dotenv.config();

// Middleware
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(dirname, "views"));
app.use(cors()); // Add CORS middleware to handle cross-origin requests

// Add language detection middleware
const detectLanguage = (req, res, next) => {
  const acceptedLanguage = req.headers["accept-language"];
  req.language = acceptedLanguage?.startsWith("en") ? "en" : "id"; // Hanya ID atau EN
  next();
};

app.use(detectLanguage);
app.use(cookieParser());

app.get("/", loggedInOnly, async (req, res) => {
  res.render("home");
});

app.get("/login", guestOnly, async (req, res) => {
  res.render("login");
});

app.get("/dashboard", checkRole("admin"), (req, res) => {
  res.render("dashboard", { title: "Dashboard" });
});

app.get("/database", checkRole("admin"), (req, res) => {
  res.render("database", { title: "database" });
});

app.get("/analytics", checkRole("admin"), (req, res) => {
  res.render("analytics", { title: "analytics" });
});

app.post("/login", handleLogin);
app.post("/register", handleRegister);
app.post("/chat", verifyToken, handleChat);
app.get("/popular-prompts", handlePopularPrompts);
app.post("/upload", verifyToken, handleUpload);
app.get("/questions", handleQuestion);
app.post("/delete-question", handleDeleteQuestion);
app.get("/chat-sessions", verifyToken, handleChatSession);
app.get("/session-messages/:sessionId", verifyToken, handleChatSession);
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

app.get("/register", guestOnly, (req, res) => {
  res.render("register");
});

app.post("/logout", (req, res) => {
  res.clearCookie("sb-access-token");
  res.clearCookie("sb:token");
  res.redirect("/login");
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error:
      req.userLanguage === "id"
        ? "Terjadi kesalahan yang tidak terduga"
        : "An unexpected error occurred",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan pada port ${PORT}`);
});
