import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid token user" });
    }

    req.user = user; // includes id, name, role
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};
