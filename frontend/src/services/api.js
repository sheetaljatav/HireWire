import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Centralized API client with auth and error handling
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available (cookie first, then localStorage fallback)
api.interceptors.request.use((config) => {
  const token = Cookies.get('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // eslint-disable-next-line no-console
    console.error('API Error', error?.response?.data || error.message);
    const status = error?.response?.status;
    if (status === 401) {
      try {
        localStorage.removeItem('token');
      } catch {}
      // Force redirect to login if not already there
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (userData) => api.post('/auth/login', userData),
};

// Candidate API
export const candidateAPI = {
  // Parse resume without saving candidate
  parseResume: (formData) => {
    return api.post('/candidate/parse-resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  // Public route for candidates to self-register
  addCandidatePublic: (formData) => {
    return api.post('/public', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  // Protected route for interviewers
  addCandidate: (formData) => {
    return api.post('/candidate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getAllCandidates: () => api.get('/candidate'),
};

// Interview API
export const interviewAPI = {
  startInterview: (data) => api.post('/interview/start', data),
  submitAnswer: (data) => api.post('/interview/answer', data),
  getInterviewStatus: (candidateId, interviewIndex) => 
    api.get(`/interview/status/${candidateId}/${interviewIndex}`),
};

// Public API (no auth required)
export const publicAPI = {
  // Parse resume without saving candidate
  parseResume: (formData) => {
    return api.post('/public/parse-resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  addCandidate: (formData) => {
    return api.post('/public', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  startInterview: (data) => api.post('/interview/start', data),
  submitAnswer: (data) => api.post('/interview/answer', data),
  getInterviewStatus: (candidateId, interviewIndex) => 
    api.get(`/interview/status/${candidateId}/${interviewIndex}`),
};

export default api;
