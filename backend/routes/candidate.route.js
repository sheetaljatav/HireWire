import express from 'express';
import { addCandidate, getAllCandidates, parseResume } from '../controllers/candidate.controller.js';
import { requireAuth } from '../middleware/isAuth.js';
import { singleUpload } from '../config/multer.js';

const CandidateRouter = express.Router();

// Parse resume route (no auth required for public use)
CandidateRouter.post('/parse-resume', singleUpload, parseResume);

// Add candidate route
CandidateRouter.post('/', singleUpload, addCandidate);

// Get all candidates route
CandidateRouter.get('/', requireAuth, getAllCandidates);

export default CandidateRouter;
