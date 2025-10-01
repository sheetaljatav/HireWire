import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const USE_AI = Boolean(process.env.GEMINI_API_KEY);

const openai = USE_AI
  ? new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    })
  : null;
// 🔹 Helper to safely parse AI JSON output
function safeJsonParse(rawContent) {
  try {
    // Remove ```json, ``` and extra whitespace
    const cleaned = rawContent.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("❌ JSON Parse Error:", err, "\nRaw content:", rawContent);
    return null;
  }
}

// -------------------------------
// Generate Interview Questions
// -------------------------------
export async function generateQuestions(resumeText) {
  if (!USE_AI) {
    // Structured question pool for Full Stack (React/Node) role
    const easyQuestions = [
      "What is JSX in React and how is it different from HTML?",
      "Explain the difference between var, let, and const in JavaScript.",
      "What is npm and how do you install packages using it?",
      "What are React components and how do you create them?",
      "What is the purpose of package.json in Node.js?"
    ];
    
    const mediumQuestions = [
      "Explain the concept of state and props in React. How do they differ?",
      "What is the Node.js event loop and how does it work?",
      "How do you handle asynchronous operations in JavaScript? Explain callbacks, promises, and async/await.",
      "What are React hooks and why were they introduced? Explain useState and useEffect.",
      "How do you create and use middleware in Express.js?",
      "What is the virtual DOM in React and how does it improve performance?"
    ];
    
    const hardQuestions = [
      "Design a scalable REST API for a social media platform. Explain your database schema, authentication strategy, and how you'd handle high traffic.",
      "How would you implement real-time features in a React/Node.js application? Discuss WebSockets, Socket.io, and performance considerations.",
      "Explain React's reconciliation algorithm. How does React determine what needs to be updated in the DOM?",
      "Design a caching strategy for a full-stack application. Discuss browser caching, Redis, CDNs, and cache invalidation.",
      "How would you implement server-side rendering (SSR) with React and Node.js? What are the benefits and challenges?"
    ];
    
    // Select 2 from each difficulty level
    const selectedEasy = easyQuestions.slice(0, 2);
    const selectedMedium = mediumQuestions.slice(0, 2);
    const selectedHard = hardQuestions.slice(0, 2);
    
    const questions = [
      ...selectedEasy.map((q, idx) => ({
        id: idx + 1,
        question: q,
        difficulty: "easy",
        timeLimit: 20
      })),
      ...selectedMedium.map((q, idx) => ({
        id: idx + 3,
        question: q,
        difficulty: "medium",
        timeLimit: 60
      })),
      ...selectedHard.map((q, idx) => ({
        id: idx + 5,
        question: q,
        difficulty: "hard",
        timeLimit: 120
      }))
    ];
    
    return { questions };
  }

  const prompt = `
You are an AI interviewer for a Full Stack Developer (React/Node.js) position. Based on this resume:

"${resumeText}"

Generate exactly 6 technical interview questions following this structure:
- 2 Easy questions (20 seconds each)
- 2 Medium questions (60 seconds each) 
- 2 Hard questions (120 seconds each)

Return only JSON in this exact format:
{
  "questions": [
    { "id": 1, "question": "Easy question here", "difficulty": "easy", "timeLimit": 20 },
    { "id": 2, "question": "Easy question here", "difficulty": "easy", "timeLimit": 20 },
    { "id": 3, "question": "Medium question here", "difficulty": "medium", "timeLimit": 60 },
    { "id": 4, "question": "Medium question here", "difficulty": "medium", "timeLimit": 60 },
    { "id": 5, "question": "Hard question here", "difficulty": "hard", "timeLimit": 120 },
    { "id": 6, "question": "Hard question here", "difficulty": "hard", "timeLimit": 120 }
  ]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        { role: "system", content: "You are an expert interviewer. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
    });

    const parsed = safeJsonParse(response.choices[0].message.content);
    return parsed || { questions: [] };
  } catch (error) {
    console.error("AI Error (generateQuestions):", error);
    return { questions: [] };
  }
}

// -------------------------------
// Score an Answer
// -------------------------------
function heuristicScore(question, answer) {
  const normalized = (answer || "").toLowerCase();
  const keywords = (question || "").toLowerCase().split(/\W+/).filter(Boolean);
  const unique = Array.from(new Set(keywords)).slice(0, 8);
  let hits = 0;
  unique.forEach((k) => {
    if (normalized.includes(k)) hits += 1;
  });
  const density = normalized.length > 0 ? Math.min(1, hits / Math.max(3, unique.length)) : 0;
  const score = Math.round(3 + density * 7); // 3..10
  const feedback = hits > 0
    ? `Good coverage on: ${unique.filter((k) => normalized.includes(k)).slice(0,3).join(', ')}.`
    : "Answer lacks relevant keywords from the question; add specifics and examples.";
  return { score, feedback };
}

export async function scoreAnswer(question, answer) {
  if (!USE_AI) {
    return heuristicScore(question, answer);
  }

  const prompt = `
Question: "${question}"
Candidate's Answer: "${answer}"

Give a score between 1 and 10 and short feedback. Return JSON:
{
  "score": 8,
  "feedback": "Good explanation, but missed edge cases."
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        { role: "system", content: "You are an expert evaluator. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
    });

    const parsed = safeJsonParse(response.choices[0].message.content);
    return parsed || heuristicScore(question, answer);
  } catch (error) {
    console.error("AI Error (scoreAnswer):", error);
    // Fallback to heuristic scoring on AI error instead of returning an error message
    return heuristicScore(question, answer);
  }
}

// -------------------------------
// Generate Final Summary
// -------------------------------
export async function generateSummary(results) {
  if (!USE_AI) {
    const scores = results.map((r) => r.score || 0);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length));
    const strengths = [];
    const weaknesses = [];
    results.forEach((r) => {
      if ((r.score || 0) >= 7) strengths.push(`Strong on: ${r.question.slice(0, 40)}...`);
      if ((r.score || 0) <= 4) weaknesses.push(`Improve: ${r.question.slice(0, 40)}...`);
    });
    const recommendation = overallScore >= 7
      ? "Recommended to advance."
      : overallScore >= 5
      ? "Borderline; consider additional interview."
      : "Not recommended at this time.";
    return { overallScore, strengths, weaknesses, recommendation };
  }

  const prompt = `
These are the interview results:

${JSON.stringify(results, null, 2)}

Generate a final evaluation in JSON:
{
  "overallScore": 7.5,
  "strengths": ["Good React skills", "Clear communication"],
  "weaknesses": ["Weak in system design"],
  "recommendation": "Suitable for frontend roles."
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        { role: "system", content: "You are an expert evaluator. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
    });

    const parsed = safeJsonParse(response.choices[0].message.content);
    return parsed || {
      overallScore: 0,
      strengths: [],
      weaknesses: [],
      recommendation: "Parsing failed.",
    };
  } catch (error) {
    console.error("AI Error (generateSummary):", error);
    return {
      overallScore: 0,
      strengths: [],
      weaknesses: [],
      recommendation: "Error while generating summary.",
    };
  }
}