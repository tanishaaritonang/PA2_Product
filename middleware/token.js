import { supabase } from "../db/db.js";

// Helper function to extract token from various sources
const getToken = (req) => {
  // 3. Check alternate cookie name (your example)
  if (req.cookies?.["sb:token"]) {
    return req.cookies["sb:token"];
  }

  return null;
};

// Basic token verification middleware
export const verifyToken = async (req, res, next) => {
  const token = getToken(req);

  if (!token) {
    return res.redirect("/login");
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.clearCookie("sb-access-token");
      res.clearCookie("sb:token");
      return res.redirect("/login");
    }

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

// Role checking middleware
export const checkRole = (requiredRole) => async (req, res, next) => {
  const token = getToken(req);

  if (!token) {
    return res.redirect("/login");
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) throw error;
    if (!user) return res.status(401).json({ error: "Invalid token" });

    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile)
      return res.status(403).json({ error: "User profile not found" });

    // Check role (now supports array of roles)
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(profile.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    req.user = user;
    req.user.role = profile.role; // Attach role to user object
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
};

// Guest middleware - only allows non-authenticated users
export const guestOnly = async (req, res, next) => {
  const token = getToken(req);

  if (!token) return next(); // No token, proceed

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) return next(); // Invalid token, proceed as guest

    // User is authenticated - redirect to home/dashboard
    return res.redirect("/");
  } catch (err) {
    console.error("Guest middleware error:", err);
    return next(); // On error, proceed as guest
  }
};

// Logged-in middleware - requires authentication
export const loggedInOnly = async (req, res, next) => {
  const token = getToken(req);

  if (!token) {
    return res
      .status(401)
      .redirect("/login?redirect=" + encodeURIComponent(req.originalUrl));
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Clear invalid token cookies
      res.clearCookie("sb-access-token");
      res.clearCookie("sb:token");
      return res.status(401).redirect("/login");
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("LoggedIn middleware error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
};

// Optional: Middleware to set user data if available but not required
export const optionalAuth = async (req, res, next) => {
  const token = getToken(req);

  if (!token) return next(); // No token, proceed without auth

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = user;

      // Optional: Add role if you want it available
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) {
        req.user.role = profile.role;
      }
    }

    next();
  } catch (err) {
    console.error("Optional auth error:", err);
    next(); // Continue even if auth fails
  }
};
