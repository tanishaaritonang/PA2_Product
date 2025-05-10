import { supabase } from "../db/db.js";

const handleLogin = async (req, res) => {
  const { username: email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Oops! Email dan Passward harus ada...",
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
        message: "Oops! Sepertinya Password atau email kamu salah!, Coba lagi ya! 🤖",
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
    const response = {
      success: true,
      message: "Login successful", // English message
      user,
    };
    
    // Role-based redirection
    if (profile.role === "user") {
      response.redirect = "/";
    } else if (profile.role === "admin") {
      response.redirect = "/dashboard";
    }
    
    return res.json(response);

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

const handleRegister = async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Oops! Email dan Password harus ada...",
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
        message: error.message || "Registrasi gagal!",
      });
    }

    const { session, user } = data;

    // Check if email confirmation is required
    // Supabase returns null session when email confirmation is needed
    if (!session) {
      return res.status(200).json({
        success: true,
        message: "Registrasi berhasil! Silakan periksa email untuk konfirmasi akun Anda.",
        requiresEmailConfirmation: true,
        user: {
          email: user.email,
        },
      });
    }

    // If session exists (email confirmation not required), set cookie
    res.cookie("sb:token", session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour
      sameSite: "strict",
    });

    // Return success response
    return res.status(201).json({
      success: true,
      message: "Registrasi Berhasil!S",
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


const handleUserInfo = async (req, res) => {
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
}
export {handleLogin, handleRegister, handleUserInfo};
