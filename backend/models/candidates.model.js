import mongoose from "mongoose";

/**
 * Candidate interview domain schema
 *
 * A Candidate may undergo multiple interviews. Each interview contains
 * an ordered list of questions and optional answers, and it culminates
 * in a final score with an AI-generated summary. This schema favors
 * embedded subdocuments to keep an interview self-contained for
 * simplified reads in the dashboard and PDF export flows.
 */

/**
 * An answer provided by the candidate for a single question.
 */
const answerSchema = new mongoose.Schema({
  text: { type: String },
  score: { type: Number },
  submittedAt: { type: Date, default: Date.now },
  feedback: { type: String }
}, { _id: false });

// Question subdocument
/**
 * A single question asked during the interview.
 */
const questionSchema = new mongoose.Schema({
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  questionText: { type: String, required: true },
  answer: { type: answerSchema } // not required, because answer may come later
}, { _id: false });

// Summary subdocument
/**
 * High-level AI summary produced after the interview completes.
 */
const summarySchema = new mongoose.Schema({
  overallScore: { type: Number },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  recommendation: { type: String }
}, { _id: false });

// Interview subdocument
/**
 * An interview session
 */
const interviewSchema = new mongoose.Schema({
  startedAt: { type: Date, required: true },
  completedAt: { type: Date },
  finalScore: { type: Number },
  summary: { type: summarySchema },
  questions: { type: [questionSchema], default: [] }
}, { _id: false });

// Candidate schema
/**
 * Candidate root document
 */
const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, index: true }, // not strictly unique
  phone: { type: String },
  resumeUrl: { type: String, required: true },
  resumeText: { type: String }, // Store extracted text from resume
  status: { 
    type: String, 
    enum: ["applied", "interviewed", "completed", "hired", "rejected"], 
    default: "applied" 
  },
  interviews: { type: [interviewSchema], default: [] }
}, { timestamps: true });

const Candidate = mongoose.model("Candidate", candidateSchema);
export default Candidate;