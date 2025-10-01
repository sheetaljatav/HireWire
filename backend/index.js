import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRouter from './routes/auth.route.js';
import CandidateRouter from './routes/candidate.route.js';
import interviewRouter from './routes/interview.route.js';
dotenv.config();

connectDB();
const app = express();
const PORT = process.env.PORT || 5000;

// middlewares (MUST be before routes)
app.use(cors(
  { origin: 'https://hire-wire-vrg5.vercel.app', // Adjust as needed
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }
));
app.use(express.json());
// Serve local uploads when Cloudinary is not configured
app.use('/uploads', express.static('uploads'));

// routes
app.use('/api/auth', authRouter);
app.use('/api/candidate', CandidateRouter);
app.use('/api/interview', interviewRouter);

// Public routes for candidates (no auth required)
app.use('/api/public', CandidateRouter);

// routes
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
