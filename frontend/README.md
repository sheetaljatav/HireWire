# InterPrep Frontend

Modern React frontend for the AI-powered interview assistant.

## Features

- 🔐 **Authentication** - Login/Register for interviewers
- 📋 **Dashboard** - View all candidates and their status
- 📁 **File Upload** - PDF resume upload with auto-parsing
- 💬 **Interview Chat** - Real-time interview interface with timer
- 📊 **Results** - Detailed interview results with AI scoring
- 🎨 **Modern UI** - Built with Tailwind CSS and shadcn/ui

## Components

### Authentication
- `Login.jsx` - Login form for interviewers
- `Register.jsx` - Registration form

### Main App
- `Dashboard.jsx` - Main dashboard showing all candidates
- `AddCandidate.jsx` - Form to add new candidates with resume upload
- `Interview.jsx` - Live interview interface with questions and timer
- `InterviewResults.jsx` - Detailed results page with AI summary

### API Integration
- `services/api.js` - Axios-based API client for backend communication

## Routes

- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Main dashboard (protected)
- `/add-candidate` - Add new candidate (protected)
- `/interview/:candidateId` - Start/conduct interview
- `/results/:candidateId/:interviewIndex` - View interview results

## Usage

1. **Register/Login** as an interviewer
2. **Add candidates** by uploading their PDF resumes
3. **Start interviews** from the dashboard
4. **Conduct interviews** with AI-generated questions
5. **View results** with AI scoring and summaries

## Tech Stack

- React 18 with Hooks (no Context API or TanStack Query)
- React Router for navigation
- Axios for API calls
- Tailwind CSS for styling
- shadcn/ui components

## API Endpoints Used

- `POST /api/auth/register` - Register interviewer
- `POST /api/auth/login` - Login interviewer
- `POST /api/candidate` - Add candidate with resume
- `GET /api/candidate` - Get all candidates
- `POST /api/interview/start` - Start interview
- `POST /api/interview/answer` - Submit answer
- `GET /api/interview/status/:id/:index` - Get interview results

## Setup

```bash
npm install
npm run dev
```+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
