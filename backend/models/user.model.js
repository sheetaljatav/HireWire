import mongoose from "mongoose";

/**
 * Interviewer/admin user account.
 * Password stored as bcrypt hash (see auth controller).
 */

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // store bcrypt hash
    role: {
      type: String,
      enum: ["interviewer", "admin"],
      default: "interviewer",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
