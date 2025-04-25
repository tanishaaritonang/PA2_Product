import { supabase } from "../db/db.js";

const handleRegister = async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  try {
    // Register user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const { session, user } = data;

    // Set cookie if session exists
    if (session) {
      res.cookie("sb:token", session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000, // 1 hour
        sameSite: "strict",
      });
    }

    // Return success response
    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

export default handleRegister;