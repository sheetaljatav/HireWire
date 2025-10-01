import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AddCandidate from './components/AddCandidate';
import Interview from './components/Interview';
import InterviewResults from './components/InterviewResults';
import './App.css';
import Test from './components/Test';
import TopNav from './components/layout/TopNav';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(Boolean(token));
    setLoading(false);
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" replace />} />
        <Route path="/register" element={!isAuthenticated ? <Register onLogin={handleLogin} /> : <Navigate to="/dashboard" replace />} />
        <Route path="/*" element={
          <TopNav>
            <Routes>
              <Route path="/" element={<Test />} />
              <Route path="/dashboard" element={isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
              <Route path="/add-candidate" element={isAuthenticated ? <AddCandidate /> : <Navigate to="/login" replace />} />
              <Route path="/interview/:candidateId" element={isAuthenticated ? <Interview /> : <Navigate to="/login" replace />} />
              <Route path="/results/:candidateId/:interviewIndex" element={isAuthenticated ? <InterviewResults /> : <Navigate to="/login" replace />} />
            </Routes>
          </TopNav>
        } />
      </Routes>
    </Router>
  );
}

export default App;
