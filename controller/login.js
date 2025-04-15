import { supabase } from "../db/db.js";

const handleLogin = async (req, res) => {
  const { username: email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  try {
    // 1. Use Supabase Auth to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 2. Set session in cookie (optional if you're doing client-side auth)
    const { session, user } = data;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return res.status(500).json({
        success: false,
        message: "Error fetching user profile",
      });
    }

    res.cookie("sb:token", session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour
      sameSite: "strict",
    });

    // 3. Return success response
    return res.json({
      success: true,
      message: "Login successful",
      user,
      redirect: profile.role === "admin" ? "/dashboard" : "/",
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

export default handleLogin;
