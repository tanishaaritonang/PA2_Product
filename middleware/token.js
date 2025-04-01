import { supabase } from "../db/db.js";

export const verifyToken = async (req, res, next) => {
  const token = req.cookies?.sessionId;

  if (!token) {
    return res.redirect("/login");
  }

  try {
    // Check token in database
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !user) {
      return res.redirect("/login");
    }

    // Check if token is expired
    if (new Date(user.token_expires_at) < new Date()) {
      return res.redirect("/login");
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during token verification",
    });
  }
};
