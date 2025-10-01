import mongoose from "mongoose";

/**
 * Question catalog (optional):
 * Central repository of reusable questions for roles/categories.
 * Not currently wired into flows but ready for future expansion.
 */
const questionCatalogSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    category: { type: String, default: "general" },
    role: [{ type: String }],
    expectedAnswer: { type: String },
    keyPoints: [{ type: String }],
    timeLimit: { type: Number, default: 60 },
    tags: [{ type: String }],
    aiGenerated: { type: Boolean, default: false },
    usage: {
      timesUsed: { type: Number, default: 0 },
      avgScore: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

const QuestionCatalog = mongoose.model("QuestionCatalog", questionCatalogSchema);
export default QuestionCatalog;



