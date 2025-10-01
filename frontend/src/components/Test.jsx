import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { publicAPI } from '../services/api';
import { Button } from './ui/button';
import { Modal, Form, Input, Upload, Card, Alert, Button as AntButton } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';

const Test = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('welcome'); // 'welcome', 'register', 'interview', 'completed'
  const [candidateId, setCandidateId] = useState(null);
  const [interviewData, setInterviewData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [collectMode, setCollectMode] = useState(false); // collecting missing fields via chat
  const [missingQueue, setMissingQueue] = useState([]); // e.g., ['name','email']
  
  // Interview states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [interviewIndex, setInterviewIndex] = useState(0);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [messages, setMessages] = useState([]); // {id, role:'ai'|'user', text}
  const [finalScore, setFinalScore] = useState(null);
  const [finalSummary, setFinalSummary] = useState(null);

  // Load persisted progress
  useEffect(() => {
    const saved = localStorage.getItem('hirewire_progress');
    if (saved) {
      const p = JSON.parse(saved);
      if (p.step === 'interview' && p.candidateId && p.interviewData) {
        setShowResumeModal(true);
      }
    }
  }, []);

  const resumeProgress = () => {
    const saved = localStorage.getItem('hirewire_progress');
    if (!saved) return;
    const p = JSON.parse(saved);
    setCandidateId(p.candidateId);
    setInterviewData(p.interviewData);
    setInterviewIndex(p.interviewIndex || 0);
    setCurrentQuestion(p.currentQuestion || 0);
    setAnswer(p.answer || '');
    setTimeLeft(p.timeLeft || 60);
    setStep('interview');
    setShowResumeModal(false);
    if (p.interviewData?.question?.questionText) {
      setMessages((prev) => [
        ...prev,
        { id: `q-${Date.now()}`, role: 'ai', text: p.interviewData.question.questionText },
      ]);
    }
  };

  // Persist progress on changes
  useEffect(() => {
    const payload = {
      step,
      candidateId,
      interviewData,
      interviewIndex,
      currentQuestion,
      answer,
      timeLeft,
    };
    localStorage.setItem('hirewire_progress', JSON.stringify(payload));
  }, [step, candidateId, interviewData, interviewIndex, currentQuestion, answer, timeLeft]);

  // Timer effect
  useEffect(() => {
    let timer;
    if (timeLeft > 0 && step === 'interview') {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && step === 'interview' && interviewData && !loading) {
      // Auto-submit when time runs out
      submitAnswer();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, step, loading]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const parseResumeFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      console.log('Invalid file:', file?.type);
      return;
    }
    
    console.log('Parsing resume file:', file.name);
    setLoading(true);
    setError('');
    
    const parseFormData = new FormData();
    parseFormData.append('file', file);
    
    try {
      const response = await publicAPI.parseResume(parseFormData);
      console.log('Parse resume response:', response.data);
      
      if (response.data.success && response.data.extractedData) {
        const { name, email, phone } = response.data.extractedData;
        console.log('Extracted data:', { name, email, phone });
        
        // Auto-fill fields with extracted data
        setFormData(prevData => ({
          name: name || prevData.name || '',
          email: email || prevData.email || '',
          phone: phone || prevData.phone || '',
        }));
        
        if (name || email || phone) {
          setSuccess('Resume parsed successfully! Fields have been auto-filled.');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          console.warn('No data extracted from resume');
        }
      }
    } catch (err) {
      console.error('Resume parsing failed:', err);
      console.error('Error response:', err.response?.data);
      // Don't show error for parsing failure, just continue without auto-fill
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    // Ant Design Form onFinish passes form values, not event object
    setLoading(true);
    setError('');
    setSuccess('');

    const submitFormData = new FormData();
    // Use values from Ant Design form or fallback to formData state
    submitFormData.append('name', values?.name || formData.name);
    submitFormData.append('email', values?.email || formData.email);
    submitFormData.append('phone', values?.phone || formData.phone);
    submitFormData.append('file', file);

    try {
      const response = await publicAPI.addCandidate(submitFormData);
      if (response.data.candidate) {
        setCandidateId(response.data.candidate._id);
        setSuccess('Registration successful! Starting your interview...');
        setTimeout(() => {
          startInterview(response.data.candidate._id);
        }, 2000);
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.missingFields) {
        // Pre-fill any extracted values, then switch to chat collection
        const extracted = data.extractedData || {};
        setFormData((prev) => ({
          name: extracted.name || prev.name,
          email: extracted.email || prev.email,
          phone: extracted.phone || prev.phone,
        }));
        setMissingQueue(data.missingFields);
        setCollectMode(true);
        setStep('collect');
        setMessages([
          { id: 'sys-intro', role: 'ai', text: 'I parsed your resume but need a bit more info before we begin.' },
          { id: `ask-${data.missingFields[0]}`, role: 'ai', text: `Please provide your ${data.missingFields[0]}.` },
        ]);
      } else {
        setError(data?.error || 'Failed to register candidate');
      }
    } finally {
      setLoading(false);
    }
  };

  const startInterview = async (id) => {
    setLoading(true);
    try {
      const response = await publicAPI.startInterview({
        candidateId: id,
        role: 'Full Stack Developer'
      });
      
      if (response.data.success) {
        setInterviewData(response.data);
        setInterviewIndex(response.data.interviewIndex);
        setCurrentQuestion(response.data.currentQuestion);
        setTimeLeft(response.data.question?.timeLimit || 60);
        setStep('interview');
        setMessages([
          { id: 'greet', role: 'ai', text: 'Welcome to your HireWire interview. Answer succinctly with examples.' },
          { id: `q-0`, role: 'ai', text: response.data.question?.questionText || 'Loading question...' },
        ]);
      } else {
        throw new Error('Interview start failed');
      }
    } catch (err) {
      console.error('Start interview error:', err);
      setError(err.response?.data?.error || 'Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() && timeLeft > 0) {
      setError('Please provide an answer');
      return;
    }

    setLoading(true);
    try {
      const response = await publicAPI.submitAnswer({
        candidateId,
        interviewIndex,
        questionIndex: currentQuestion,
        answer: answer || 'No answer provided (time expired)'
      });

      if (response.data.success) {
        if (response.data.completed) {
          setFinalScore(response.data.finalScore ?? null);
          setFinalSummary(response.data.summary ?? null);
          setStep('completed');
        } else {
          setCurrentQuestion(response.data.currentQuestion);
          setAnswer('');
          setTimeLeft(response.data.question.timeLimit || 60);
          setInterviewData(prev => ({
            ...prev,
            question: response.data.question,
            currentQuestion: response.data.currentQuestion
          }));
          // push next question bubble
          setMessages((prev) => [
            ...prev,
            { id: `q-${response.data.currentQuestion}`, role: 'ai', text: response.data.question.questionText },
          ]);
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
    if (timeLeft <= 10) return 'text-red-600';
    if (timeLeft <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Welcome Step
  if (step === 'welcome') {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl w-full px-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome to HireWire</h1>
            <p className="text-gray-600 mt-2">Your AI-powered interview companion</p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-900">Resume Upload</div>
                <div className="text-xs text-gray-600 mt-1">PDF (required)</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-900">6 Questions</div>
                <div className="text-xs text-gray-600 mt-1">Easy → Hard</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-900">Timed</div>
                <div className="text-xs text-gray-600 mt-1">Auto-submit</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-900">AI Scoring</div>
                <div className="text-xs text-gray-600 mt-1">Instant feedback</div>
              </div>
            </div>
            <Button onClick={() => setStep('register')} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white">Start Interview</Button>
            <div className="mt-4 text-sm">
              <Link to="/login" className="text-indigo-600 hover:text-indigo-500">Interviewer login</Link>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-0 overflow-hidden">
            <div className="bg-gray-900 text-white px-6 py-3 text-sm">Preview</div>
            <div className="p-6 space-y-3 h-[360px] overflow-y-auto bg-gray-50">
              <div className="flex justify-start"><div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-2">Welcome! Upload your resume to begin.</div></div>
              <div className="flex justify-end"><div className="bg-indigo-600 text-white rounded-2xl rounded-br-none px-4 py-2">Here is my resume.pdf</div></div>
              <div className="flex justify-start"><div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-2">Thanks! Let’s start with an easy one...</div></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Collect missing fields via chat before starting
  const handleCollectSend = async () => {
    const currentKey = missingQueue[0];
    if (!currentKey || !answer.trim()) return;
    // push user message
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: answer }]);
    const value = answer.trim();
    setAnswer('');
    // basic validation
    const valid = (key, val) => {
      if (key === 'email') return /.+@.+\..+/.test(val);
      if (key === 'phone') return val.replace(/\D/g, '').length >= 10;
      if (key === 'name') return val.split(' ').filter(Boolean).length >= 2;
      return true;
    };
    if (!valid(currentKey, value)) {
      setMessages((prev) => [...prev, { id: `bad-${Date.now()}`, role: 'ai', text: `That ${currentKey} doesn’t look right. Please re-enter your ${currentKey}.` }]);
      return;
    }
    // store value
    setFormData((prev) => ({ ...prev, [currentKey]: value }));
    const nextQueue = missingQueue.slice(1);
    setMissingQueue(nextQueue);
    if (nextQueue.length > 0) {
      const nextKey = nextQueue[0];
      setMessages((prev) => [...prev, { id: `ask-${nextKey}`, role: 'ai', text: `Thanks! Now please provide your ${nextKey}.` }]);
      return;
    }
    // All collected → re-submit registration
    try {
      setLoading(true);
      const redo = new FormData();
      redo.append('name', valueFor('name'));
      redo.append('email', valueFor('email'));
      redo.append('phone', valueFor('phone'));
      if (file) redo.append('file', file);
      const resp = await publicAPI.addCandidate(redo);
      if (resp.data?.candidate?._id) {
        setCandidateId(resp.data.candidate._id);
        setMessages((prev) => [...prev, { id: 'ok-go', role: 'ai', text: 'Great, we are all set. Starting your interview…' }]);
        setTimeout(() => startInterview(resp.data.candidate._id), 800);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { id: 'fail', role: 'ai', text: 'Hmm, something went wrong saving your details. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const valueFor = (k) => {
    if (k === 'name') return formData.name || '';
    if (k === 'email') return formData.email || '';
    if (k === 'phone') return formData.phone || '';
    return '';
  };

  if (step === 'collect') {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b">
              <div className="font-semibold">Just a few details before we begin</div>
            </div>
            <div className="h-[50vh] overflow-y-auto p-6 space-y-3 bg-gray-50">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'}`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="border-t bg-white p-4">
              <div className="flex items-end gap-3">
                <textarea rows={2} className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Type here…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
                <Button onClick={handleCollectSend} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {loading ? 'Saving…' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Registration Step (refreshed UI)
  if (step === 'register') {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
        <Modal
          open={showResumeModal}
          onOk={resumeProgress}
          onCancel={() => setShowResumeModal(false)}
          okText="Resume Interview"
          cancelText="Start Fresh"
          title="Welcome back"
        >
          <p>We found an in-progress interview. Would you like to resume where you left off?</p>
        </Modal>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Upload Resume (PDF)" bordered={false} className="shadow">
            {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
            {success && <Alert type="success" showIcon message={success} style={{ marginBottom: 16 }} />}
            <Upload.Dragger
              name="file"
              multiple={false}
              accept=".pdf"
              maxCount={1}
              beforeUpload={(f) => { 
                setFile(f);
                parseResumeFile(f);
                return false; 
              }}
              onRemove={() => {
                setFile(null);
                // Reset form data when file is removed
                setFormData({ name: '', email: '', phone: '' });
              }}
              fileList={file ? [{ uid: '-1', name: file.name, status: 'done' }] : []}
              style={{ background: '#F9FAFB' }}
            >
              <p className="ant-upload-drag-icon">
                <svg className="mx-auto h-10 w-10 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 15a4 4 0 004 4h10a4 4 0 004-4V9a4 4 0 00-4-4h-3l-2-2H7a4 4 0 00-4 4v8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </p>
              <p className="ant-upload-text">Drag & drop your resume here, or click to browse</p>
              <p className="ant-upload-hint">PDF only, up to 5MB</p>
            </Upload.Dragger>
          </Card>

          <Card title="Your Details" bordered={false} className="shadow">
            <Form 
              layout="vertical" 
              onFinish={handleSubmit}
              initialValues={{
                name: formData.name,
                email: formData.email,
                phone: formData.phone
              }}
              key={`${formData.name}-${formData.email}-${formData.phone}`} // Force re-render when formData changes
            >
              <Form.Item 
                label="Full Name" 
                name="name"
                rules={[{ required: true, message: 'Please input your full name!' }]}
              >
                <Input size="large" placeholder="Jane Doe" />
              </Form.Item>
              <Form.Item 
                label="Email Address" 
                name="email"
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
              >
                <Input type="email" size="large" placeholder="jane@domain.com" />
              </Form.Item>
              <Form.Item 
                label="Phone Number" 
                name="phone"
                rules={[{ required: true, message: 'Please input your phone number!' }]}
              >
                <Input size="large" placeholder="+1 555 123 4567" />
              </Form.Item>
              <div className="flex justify-between">
                <AntButton onClick={() => setStep('welcome')}>Back</AntButton>
                <AntButton type="primary" htmlType="submit" loading={loading} disabled={!file}>
                  {loading ? 'Registering...' : 'Start Interview'}
                </AntButton>
              </div>
            </Form>
          </Card>
        </div>
      </div>
    )
  }

  // Interview Step
  if (step === 'interview' && interviewData) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <div className="text-xs text-gray-500">Question {currentQuestion + 1} of {interviewData.totalQuestions}</div>
                <div className="font-semibold">HireWire Interview</div>
              </div>
              <div className={`text-2xl font-bold ${getTimeColor()}`}>{formatTime(timeLeft)}</div>
            </div>
            <div className="h-[58vh] overflow-y-auto p-6 space-y-3 bg-gray-50">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'}`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="border-t bg-white p-4">
              <div className="flex items-end gap-3">
                <textarea rows={2} className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Type your response..." value={answer} onChange={(e) => setAnswer(e.target.value)} />
                <Button onClick={() => { if (!answer.trim()) return; setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'user', text: answer }]); submitAnswer(); }} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {loading ? 'Submitting...' : currentQuestion === interviewData.totalQuestions - 1 ? 'Submit' : 'Send'}
                </Button>
              </div>
              <div className="mt-1 text-xs text-gray-500">{answer.length} characters</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 h-fit">
            <div className="text-sm text-gray-500">Progress</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${((currentQuestion + 1) / interviewData.totalQuestions) * 100}%` }} />
            </div>
            <div className="mt-4 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-500">Candidate</span><span className="font-medium">{formData.name || 'Anonymous'}</span></div>
              <div className="flex items-center justify-between mt-2"><span className="text-gray-500">Difficulty</span><span className="font-medium capitalize">{interviewData.question?.difficulty || 'easy'}</span></div>
              <div className="flex items-center justify-between mt-2"><span className="text-gray-500">Time each</span><span className="font-medium">{interviewData.question?.timeLimit || 60}s</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Completed Step
  if (step === 'completed') {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 py-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">HireWire</div>
                  <div className="font-semibold">Interview Completed</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">Thank you, {formData.name || 'Candidate'}</div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gradient-to-r from-indigo-600 to-emerald-600 rounded-xl p-6 text-white">
                  <div className="text-sm opacity-90">Your overall score</div>
                  <div className="mt-2 flex items-end gap-4">
                    <div className="text-5xl font-bold leading-none">{finalSummary?.overallScore ?? finalScore ?? '—'}</div>
                    <div className="pb-1 opacity-90">/ 10</div>
                  </div>
                  <div className="mt-4 text-sm text-white/90">AI has analyzed your responses and produced a short summary.</div>
          </div>

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="font-semibold text-gray-900">Summary</div>
                  <p className="mt-2 text-gray-700 whitespace-pre-wrap">
                    {finalSummary?.recommendation || 'Your results have been recorded.'}
                  </p>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-emerald-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-emerald-700">Strengths</div>
                      <ul className="mt-2 list-disc list-inside text-sm text-emerald-900 space-y-1">
                        {(finalSummary?.strengths || []).slice(0,4).map((s, i) => (
                          <li key={`s-${i}`}>{s}</li>
                        ))}
                        {(!finalSummary?.strengths || finalSummary.strengths.length === 0) && <li>Recorded by reviewers</li>}
                      </ul>
                    </div>
                    <div className="bg-white border border-rose-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-rose-700">Areas to improve</div>
                      <ul className="mt-2 list-disc list-inside text-sm text-rose-900 space-y-1">
                        {(finalSummary?.weaknesses || []).slice(0,4).map((w, i) => (
                          <li key={`w-${i}`}>{w}</li>
                        ))}
                        {(!finalSummary?.weaknesses || finalSummary.weaknesses.length === 0) && <li>Will be shared in feedback</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white border rounded-xl p-5">
                  <div className="text-sm text-gray-500">Next steps</div>
                  <ul className="mt-2 text-sm text-gray-700 space-y-2">
                    <li>• Your results are available to interviewers</li>
                    <li>• Expect follow-up within 24–48 hours</li>
                    <li>• You may be invited to a live round</li>
                  </ul>
          </div>
          <Button
            onClick={() => {
              setStep('welcome');
              setFormData({ name: '', email: '', phone: '' });
              setFile(null);
              setCandidateId(null);
              setInterviewData(null);
              setCurrentQuestion(0);
              setAnswer('');
                    setTimeLeft(0);
                    setMessages([]);
                    setFinalScore(null);
                    setFinalSummary(null);
                    localStorage.removeItem('hirewire_progress');
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Take Another Test
          </Button>
                {candidateId != null && interviewIndex != null && (
                  <Button
                    onClick={() => {
                      // Navigate to detailed results (requires auth)
                      navigate(`/results/${candidateId}/${interviewIndex}`);
                    }}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white"
                  >
                    View Detailed Report
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Test;