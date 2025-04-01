import bcrypt from "bcrypt";
import crypto from "crypto";
import { supabase } from "../db/db.js";

// Helper function to generate a secure token
const generateAuthToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const handleLogin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required",
    });
  }

  try {
    // 1. Fetch user from database
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", username)
      .single();

    if (error) throw Error("User not found");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 2. Compare password hashes
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 3. Generate a new auth token
    const authToken = generateAuthToken();

    // 4. Store the token in the database
    const { error: updateError } = await supabase
      .from("users")
      .update({
        token: authToken,
      })
      .eq("id", user.id);

    if (updateError) throw updateError;

    res.cookie("sessionId", authToken, {
      // Use a proper session token
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour
      sameSite: "strict",
    });

    // 5. Return token to client (can be used in Authorization header)
    res.json({
      success: true,
      message: "Login successful",
      redirect: "/dashboard",
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Server error during login",
    });
  }
};

export default handleLogin;
