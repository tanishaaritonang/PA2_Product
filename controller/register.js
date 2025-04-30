import { supabase } from "../db/db.js";

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

export default handleRegister;