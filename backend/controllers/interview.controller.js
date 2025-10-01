import Candidate from '../models/candidates.model.js';
import { generateQuestions, scoreAnswer, generateSummary } from '../config/ai.js';

export const startInterview = async (req, res) => {
    try {
        const { candidateId, role = "Full Stack Developer" } = req.body;
        console.log('🎯 START INTERVIEW REQUEST:', { candidateId, role });
        
        console.log('🔍 LOOKING FOR CANDIDATE:', candidateId);
        const candidate = await Candidate.findById(candidateId);
        console.log('📋 CANDIDATE FOUND:', candidate ? 'YES' : 'NO');
        if (!candidate) {
            console.log('❌ CANDIDATE NOT FOUND:', candidateId);
            return res.status(404).json({ error: "Candidate not found" });
        }

        // Enforce single-test rule
        const existing = candidate.interviews || [];
        const last = existing[existing.length - 1];
        if (last) {
            // If there is an interview and it's completed, block new start
            if (last.completedAt) {
                return res.status(403).json({ success: false, error: "Interview already completed. Retake requires interviewer approval." });
            }
            // If there is an ongoing interview, resume instead of creating new
            return res.json({
                success: true,
                candidateId: candidate._id,
                interviewIndex: existing.length - 1,
                currentQuestion: Math.max(0, last.currentQuestion || 0),
                question: last.questions?.[Math.max(0, last.currentQuestion || 0)] || last.questions?.[0],
                totalQuestions: last.questions?.length || 0,
                resumed: true
            });
        }

        // Generate questions from AI
        console.log('🤖 GENERATING QUESTIONS FOR RESUME LENGTH:', candidate.resumeText ? candidate.resumeText.length : 'NO RESUME');
        const result = await generateQuestions(candidate.resumeText);
        console.log('📝 AI RESPONSE:', result);
        let questions = result.questions || [];
        console.log('❓ QUESTIONS GENERATED:', questions.length);

        // Fallback: ensure exactly 6 questions if AI returns none
        if (questions.length === 0) {
            console.log('⚠️ Falling back to default question set');
            questions = [
                { question: "What is JSX in React and how does it differ from HTML?", difficulty: "easy", timeLimit: 20 },
                { question: "Explain differences between var, let, and const.", difficulty: "easy", timeLimit: 20 },
                { question: "How does the Node.js event loop work?", difficulty: "medium", timeLimit: 60 },
                { question: "Describe React hooks useState and useEffect with examples.", difficulty: "medium", timeLimit: 60 },
                { question: "Design a scalable REST API for a blogging platform.", difficulty: "hard", timeLimit: 120 },
                { question: "Explain React reconciliation and how diffing updates the DOM.", difficulty: "hard", timeLimit: 120 }
            ];
        }

        // Create new interview session
        const interview = {
            startedAt: new Date(),
            questions: questions.map((q, index) => ({ 
                difficulty: q.difficulty || "medium",   // fallback
                questionText: q.question || q.questionText || `Q${index + 1}`,
                timeLimit: q.timeLimit || 120
            }))
        };

        candidate.interviews.push(interview);
        candidate.status = "interviewed";
        await candidate.save();

        const interviewIndex = candidate.interviews.length - 1;
        
        res.json({
            success: true,
            candidateId: candidate._id,
            interviewIndex,
            currentQuestion: 0,
            question: interview.questions[0],
            totalQuestions: interview.questions.length
        });
    } catch (error) {
        console.error("Start interview error:", error);
        res.status(500).json({ error: "Failed to start interview" });
    }
};


export const submitAnswer = async (req, res) => {
    try {
        const { candidateId, interviewIndex, questionIndex, answer } = req.body;
        
        const candidate = await Candidate.findById(candidateId);
        if (!candidate || !candidate.interviews[interviewIndex]) {
            return res.status(404).json({ error: "Interview not found" });
        }

        const interview = candidate.interviews[interviewIndex];
        if (interview.completedAt) {
            return res.status(403).json({ success: false, error: "Interview already completed. Further answers not accepted." });
        }
        const question = interview.questions[questionIndex];
        
        // Score the answer (AI returns { score: Number, feedback: String })
        let evaluation = await scoreAnswer(question.questionText, answer);
        // Safety net: if AI failed and returned an error-like payload, compute a heuristic score/feedback here
        if (!evaluation || evaluation.score == null || (evaluation.feedback || '').toLowerCase().includes('error')) {
            const normalized = (answer || '').toLowerCase();
            const keywords = (question.questionText || '').toLowerCase().split(/\W+/).filter(Boolean);
            const unique = Array.from(new Set(keywords)).slice(0, 8);
            let hits = 0;
            unique.forEach((k) => { if (normalized.includes(k)) hits += 1; });
            const density = normalized.length > 0 ? Math.min(1, hits / Math.max(3, unique.length)) : 0;
            const fallbackScore = Math.round(3 + density * 7); // 3..10
            const fallbackFeedback = hits > 0
              ? `Good coverage on: ${unique.filter((k) => normalized.includes(k)).slice(0,3).join(', ')}.`
              : 'Answer lacks relevant keywords from the question; add specifics and examples.';
            evaluation = { score: Number.isFinite(fallbackScore) ? fallbackScore : 0, feedback: fallbackFeedback };
        }

        // Save answer
        question.answer = {
            text: answer,
            score: evaluation.score || 0,      // numeric
            feedback: evaluation.feedback || "", // explanation
            submittedAt: new Date()
        };

        const nextQuestionIndex = questionIndex + 1;
        // persist current question pointer for resume flow
        interview.currentQuestion = nextQuestionIndex;
        
        // Check if interview is complete
        if (nextQuestionIndex >= interview.questions.length) {
            const totalScore = interview.questions.reduce((sum, q) => sum + (q.answer?.score || 0), 0);
            const finalScore = Math.round(totalScore / interview.questions.length);
            
            // Prepare results for AI summary generation
            const results = interview.questions.map((q, index) => ({
                questionIndex: index + 1,
                question: q.questionText,
                answer: q.answer?.text || 'No answer provided',
                score: q.answer?.score || 0,
                feedback: q.answer?.feedback || ''
            }));
            
            const summary = await generateSummary(results);
            
            interview.completedAt = new Date();
            interview.finalScore = finalScore;
            interview.summary = summary;
            candidate.status = "completed";
            
            await candidate.save();
            
            return res.json({
                success: true,
                completed: true,
                finalScore,
                summary,
                message: "Interview completed!"
            });
        }

        await candidate.save();

        res.json({
            success: true,
            completed: false,
            currentQuestion: nextQuestionIndex,
            question: interview.questions[nextQuestionIndex],
            totalQuestions: interview.questions.length,
            currentScore: evaluation.score,
            feedback: evaluation.feedback
        });
        
    } catch (error) {
        console.error("Submit answer error:", error);
        res.status(500).json({ error: "Failed to submit answer" });
    }
};


// Get interview status/progress
export const getInterviewStatus = async (req, res) => {
    try {
        const { candidateId, interviewIndex } = req.params;
        
        const candidate = await Candidate.findById(candidateId);
        if (!candidate || !candidate.interviews[interviewIndex]) {
            return res.status(404).json({ error: "Interview not found" });
        }

        const interview = candidate.interviews[interviewIndex];
        
        res.json({
            success: true,
            interview: {
                startedAt: interview.startedAt,
                completedAt: interview.completedAt,
                finalScore: interview.finalScore,
                summary: interview.summary,
                questions: interview.questions.map((q, index) => ({
                    index,
                    difficulty: q.difficulty,
                    questionText: q.questionText,
                    answer: q.answer,
                    timeLimit: q.timeLimit
                }))
            }
        });
    } catch (error) {
        console.error("Get interview status error:", error);
        res.status(500).json({ error: "Failed to get interview status" });
    }
};

// Allow interviewer-approved retake by clearing completion markers and deleting the last interview
export const allowRetake = async (req, res) => {
    try {
        const { candidateId } = req.params;
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            return res.status(404).json({ success: false, error: "Candidate not found" });
        }

        const interviews = candidate.interviews || [];
        if (interviews.length === 0) {
            return res.json({ success: true, message: "No interview to reset" });
        }

        // Remove the last interview entirely to ensure fresh start
        interviews.pop();
        candidate.interviews = interviews;
        candidate.status = "applied";
        await candidate.save();

        res.json({ success: true, message: "Retake allowed. Candidate can start a new interview." });
    } catch (error) {
        console.error("Allow retake error:", error);
        res.status(500).json({ success: false, error: "Failed to allow retake" });
    }
};