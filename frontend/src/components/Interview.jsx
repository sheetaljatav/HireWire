import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewAPI, candidateAPI } from '../services/api';
import { Button } from './ui/button';

const Interview = () => {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  
  const [candidate, setCandidate] = useState(null);
  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewIndex, setInterviewIndex] = useState(0);

  useEffect(() => {
    fetchCandidate();
  }, [candidateId]);

  useEffect(() => {
    let timer;
    if (timeLeft > 0 && interviewStarted) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && interviewStarted && !loading) {
      // Auto-submit when timer reaches 0
      console.log('⏰ Time up! Auto-submitting answer...');
      submitAnswer(true); // Pass true to indicate auto-submit
    }
    return () => clearTimeout(timer);
  }, [timeLeft, interviewStarted, loading]);

  const fetchCandidate = async () => {
    console.log('🔍 FETCHING CANDIDATE WITH ID:', candidateId);
    try {
      const response = await candidateAPI.getAllCandidates();
      console.log('📋 ALL CANDIDATES RESPONSE:', response.data);
      const foundCandidate = response.data.candidates.find(c => c._id === candidateId);
      console.log('👤 FOUND CANDIDATE:', foundCandidate);
      setCandidate(foundCandidate);
    } catch (err) {
      console.error('❌ FETCH CANDIDATE ERROR:', err);
      setError('Failed to fetch candidate details');
    }
  };

  const startInterview = async () => {
    console.log('🎯 STARTING INTERVIEW FOR CANDIDATE:', candidateId);
    setLoading(true);
    try {
      const requestData = {
        candidateId,
        role: 'Full Stack Developer'
      };
      console.log('📤 SENDING REQUEST:', requestData);
      const response = await interviewAPI.startInterview(requestData);
      console.log('📥 RESPONSE RECEIVED:', response.data);
      
      if (response.data.success) {
        console.log('✅ INTERVIEW STARTED SUCCESSFULLY');
        setInterview(response.data);
        setInterviewIndex(response.data.interviewIndex);
        setCurrentQuestion(0);
        setTimeLeft(response.data.question.timeLimit || 60);
        setInterviewStarted(true);
      }
    } catch (err) {
      console.error('❌ START INTERVIEW ERROR:', err);
      console.error('📩 ERROR RESPONSE:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (isAutoSubmit = false) => {
    if (!isAutoSubmit && !answer.trim()) {
      setError('Please provide an answer');
      return;
    }

    setLoading(true);
    try {
      const response = await interviewAPI.submitAnswer({
        candidateId,
        interviewIndex,
        questionIndex: currentQuestion,
        answer: answer.trim() || '(no answer)'
      });

      if (response.data.success) {
        if (response.data.completed) {
          // Interview completed
          navigate(`/results/${candidateId}/${interviewIndex}`);
        } else {
          // Move to next question
          setCurrentQuestion(response.data.currentQuestion);
          setAnswer('');
          setTimeLeft(response.data.question.timeLimit || 60);
          setInterview(prev => ({
            ...prev,
            question: response.data.question,
            currentQuestion: response.data.currentQuestion
          }));
        }
      }
    } catch (err) {
      setError('Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft <= 5) return 'text-red-600 animate-pulse';
    if (timeLeft <= 10) return 'text-red-600';
    if (timeLeft <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getTimeBackgroundColor = () => {
    if (timeLeft <= 5) return 'bg-red-50 border border-red-200';
    if (timeLeft <= 10) return 'bg-red-50';
    if (timeLeft <= 30) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  if (!candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading candidate details...</div>
      </div>
    );
  }

  if (!interviewStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start Interview</h3>
            <p className="text-sm text-gray-500 mb-6">
              Ready to interview <strong>{candidate.name}</strong>?
            </p>
            <div className="bg-gray-50 rounded-md p-4 mb-6">
              <p className="text-sm text-gray-700">
                • 6 questions total (2 Easy, 2 Medium, 2 Hard)<br/>
                • Time limits: Easy (20s), Medium (60s), Hard (120s)<br/>
                • AI will score each answer automatically
              </p>
            </div>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <Button
              onClick={startInterview}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? 'Starting...' : 'Start Interview'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Interview: {candidate.name}</h1>
              <p className="text-sm text-gray-600">{candidate.email}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                Question {currentQuestion + 1} of {interview.totalQuestions}
              </div>
              <div className={`rounded-lg p-2 ${getTimeBackgroundColor()}`}>
                <div className={`text-2xl font-bold ${getTimeColor()}`}>
                  {formatTime(timeLeft)}
                </div>
                {timeLeft <= 10 && (
                  <div className="text-xs text-red-600 font-medium">
                    TIME RUNNING OUT!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / interview.totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Question Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center mb-4">
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                interview.question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                interview.question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {interview.question.difficulty.toUpperCase()}
              </span>
              <span className="ml-2 text-sm text-gray-600">
                Time Limit: {interview.question.timeLimit || 60}s
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {interview.question.questionText}
            </h2>
          </div>

          <div className="mb-6">
            <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
              Your Answer
            </label>
            <textarea
              id="answer"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Type your answer here..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {answer.length} characters
            </div>
            <Button
              onClick={submitAnswer}
              disabled={loading || !answer.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? 'Submitting...' : currentQuestion === interview.totalQuestions - 1 ? 'Finish Interview' : 'Next Question'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;