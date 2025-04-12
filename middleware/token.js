import { supabase } from "../db/db.js";

export const verifyToken = async (req, res, next) => {
  const token = req.cookies?.["sb:token"]; // or use Authorization header

  if (!token) {
    return res.redirect("/login");
  }

  try {
    // 1. Validate token via Supabase Auth API
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.redirect("/login");
    }

    // 2. Attach user to request object
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
