import express from 'express';
import { startInterview, submitAnswer, getInterviewStatus, allowRetake } from '../controllers/interview.controller.js';

const interviewRouter = express.Router();

/**
 * Interview routes
 * POST   /start                 -> initialize interview for a candidate
 * POST   /answer                -> submit answer for current question
 * GET    /status/:candidateId/:interviewIndex -> fetch interview status snapshot
 */

interviewRouter.post('/start', startInterview);
interviewRouter.post('/answer', submitAnswer);
interviewRouter.get('/status/:candidateId/:interviewIndex', getInterviewStatus);
// Protected: interviewer can allow a retake by resetting completion
// Keep route defined; actual auth middleware applied in backend/index.js or can be added here if desired
interviewRouter.post('/allow-retake/:candidateId', allowRetake);

export default interviewRouter;