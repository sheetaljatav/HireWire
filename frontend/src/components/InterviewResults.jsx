import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { interviewAPI } from '../services/api';
import { Button } from './ui/button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const InterviewResults = () => {
  const { candidateId, interviewIndex } = useParams();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    fetchInterviewResults();
  }, [candidateId, interviewIndex]);

  const fetchInterviewResults = async () => {
    try {
      const response = await interviewAPI.getInterviewStatus(candidateId, interviewIndex);
      if (response.data.success) {
        setInterview(response.data.interview);
      }
    } catch (err) {
      setError('Failed to fetch interview results');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 8) return 'bg-green-100';
    if (score >= 6) return 'bg-yellow-100';
    if (score >= 4) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOverallRating = (score) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Average';
    return 'Needs Improvement';
  };

  const reportRef = useRef(null);
  const A4_WINDOW_WIDTH = 794; // px approximation for A4 width at 96 DPI to avoid clipping

  const exportPdf = async () => {
    setExportError('');
    setExportLoading(true);
    try {
      // Generate a clean, tabular PDF (no DOM capture)
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 36; // 0.5 inch
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const drawHeading = (text) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text(text, margin, y);
        y += 18;
      };

      const drawSubHeading = (text) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(text, margin, y);
        y += 14;
      };

      const drawText = (label, value) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        const full = `${label}: ${value || '-'}`;
        const lines = pdf.splitTextToSize(full, contentWidth);
        lines.forEach((line) => {
          ensurePage(12);
          pdf.text(line, margin, y);
          y += 12;
        });
      };

      const ensurePage = (lineHeight) => {
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      const drawTable = (columns, rows) => {
        // Basic table renderer: headers + rows with wrapping and page breaks
        const colWidths = columns.map((c) => Math.floor(c.width * contentWidth));
        const headerHeight = 16;
        const rowLineHeight = 12;

        // Header
        ensurePage(headerHeight + 6);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        let x = margin;
        columns.forEach((col, idx) => {
          pdf.text(col.title, x, y);
          x += colWidths[idx];
        });
        y += 6;
        pdf.setDrawColor(200);
        pdf.line(margin, y, margin + contentWidth, y);
        y += 8;

        // Rows
        pdf.setFont('helvetica', 'normal');
        rows.forEach((row) => {
          // compute wrapped lines per cell
          const wrappedCells = columns.map((col, idx) => {
            const cell = row[idx] == null ? '-' : String(row[idx]);
            return pdf.splitTextToSize(cell, colWidths[idx] - 6);
          });
          const maxLines = Math.max(...wrappedCells.map((w) => w.length));
          const rowHeight = Math.max(rowLineHeight, maxLines * rowLineHeight);
          ensurePage(rowHeight + 6);
          let cx = margin;
          for (let i = 0; i < columns.length; i += 1) {
            const lines = wrappedCells[i];
            let cy = y + rowLineHeight - 2;
            lines.forEach((ln) => {
              pdf.text(ln, cx + 3, cy);
              cy += rowLineHeight;
            });
            // cell borders (light)
            pdf.setDrawColor(230);
            pdf.rect(cx, y - 4, colWidths[i], rowHeight + 6);
            cx += colWidths[i];
          }
          y += rowHeight + 6;
        });
      };

      // Document content
      drawHeading('Interview Report');
      drawText('Candidate ID', candidateId);
      drawText('Interview Index', interviewIndex);
      drawText('Completed At', interview?.completedAt ? new Date(interview.completedAt).toLocaleString() : '-');
      drawText('Final Score', interview?.finalScore != null ? `${interview.finalScore}/10` : '-');
      if (interview?.summary?.overallScore != null) {
        drawText('AI Overall Score', `${interview.summary.overallScore}/10`);
      }
      if (interview?.summary?.recommendation) {
        drawText('Recommendation', interview.summary.recommendation);
      }

      y += 6;
      drawSubHeading('Questions');

      const columns = [
        { title: '#', width: 0.06 },
        { title: 'Difficulty', width: 0.12 },
        { title: 'Score', width: 0.08 },
        { title: 'Question', width: 0.32 },
        { title: 'Answer', width: 0.26 },
        { title: 'Feedback', width: 0.16 },
      ];
      const rows = (interview?.questions || []).map((q, idx) => [
        String(idx + 1),
        (q.difficulty || '').toUpperCase(),
        q?.answer?.score != null ? `${q.answer.score}/10` : '-',
        q.questionText || '-',
        q?.answer?.text || '-',
        q?.answer?.feedback || '-',
      ]);

      drawTable(columns, rows);

      pdf.save(`hirewire-report-${candidateId}-${interviewIndex}.pdf`);
    } catch (e) {
      setExportError('Failed to export PDF. Please try on desktop Chrome/Edge and ensure cross-origin assets are accessible.');
      // eslint-disable-next-line no-console
      console.error('PDF export failed:', e);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading interview results...</div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error || 'Interview not found'}</div>
          <Link to="/dashboard">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Interview Results</h1>
              <p className="text-gray-600">
                Interview completed on {new Date(interview.completedAt).toLocaleDateString()}
              </p>
            </div>
            <Link to="/dashboard">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto py-8 px-6" ref={reportRef} style={{ maxWidth: 742, background: '#ffffff' }}>
        {/* Overall Score Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBgColor(interview.finalScore)} mb-4`}>
              <span className={`text-3xl font-bold ${getScoreColor(interview.finalScore)}`}>
                {interview.finalScore}/10
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {getOverallRating(interview.finalScore)}
            </h2>
            <p className="text-gray-600 mb-6">Overall Interview Performance</p>
            
            {/* Score breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {interview.questions.filter(q => q.difficulty === 'easy' && q.answer).length}/{interview.questions.filter(q => q.difficulty === 'easy').length}
                </div>
                <div className="text-sm text-gray-600">Easy Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {interview.questions.filter(q => q.difficulty === 'medium' && q.answer).length}/{interview.questions.filter(q => q.difficulty === 'medium').length}
                </div>
                <div className="text-sm text-gray-600">Medium Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {interview.questions.filter(q => q.difficulty === 'hard' && q.answer).length}/{interview.questions.filter(q => q.difficulty === 'hard').length}
                </div>
                <div className="text-sm text-gray-600">Hard Questions</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        {interview.summary && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">AI Assessment Summary</h3>
            
            {/* Overall Score */}
            {interview.summary.overallScore && (
              <div className="mb-6">
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <span className="text-lg font-semibold text-gray-700">Overall Score</span>
                  <span className={`text-2xl font-bold ${getScoreColor(interview.summary.overallScore)}`}>
                    {interview.summary.overallScore}/10
                  </span>
                </div>
              </div>
            )}

            {/* Strengths */}
            {interview.summary.strengths && interview.summary.strengths.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-green-700 mb-3">Strengths</h4>
                <ul className="bg-green-50 border-l-4 border-green-400 p-4 space-y-2">
                  {interview.summary.strengths.map((strength, index) => (
                    <li key={index} className="text-green-800 flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {interview.summary.weaknesses && interview.summary.weaknesses.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-red-700 mb-3">Areas for Improvement</h4>
                <ul className="bg-red-50 border-l-4 border-red-400 p-4 space-y-2">
                  {interview.summary.weaknesses.map((weakness, index) => (
                    <li key={index} className="text-red-800 flex items-start">
                      <span className="text-red-600 mr-2">•</span>
                      {weakness}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendation */}
            {interview.summary.recommendation && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <h4 className="text-lg font-semibold text-blue-700 mb-2">Recommendation</h4>
                <p className="text-blue-800 leading-relaxed">{interview.summary.recommendation}</p>
              </div>
            )}
          </div>
        )}

        {/* Detailed Question Results */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Question-by-Question Analysis</h3>
          <div className="space-y-6">
            {interview.questions.map((question, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 mr-2">
                        Question {index + 1}
                      </span>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {question.questionText}
                    </h4>
                  </div>
                  {question.answer && (
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(question.answer.score)}`}>
                        {question.answer.score}/10
                      </div>
                      <div className="text-xs text-gray-500">Score</div>
                    </div>
                  )}
                </div>
                
                {question.answer ? (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Answer:</h5>
                    <div className="bg-gray-50 rounded-md p-4 mb-2">
                      <p className="text-gray-700">{question.answer.text}</p>
                    </div>
                    {question.answer.feedback && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-2">
                        <h6 className="text-sm font-medium text-blue-800 mb-1">AI Feedback:</h6>
                        <p className="text-sm text-blue-700">{question.answer.feedback}</p>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Submitted: {new Date(question.answer.submittedAt).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-700 text-sm">No answer provided</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <Link to="/dashboard">
            <Button className="bg-gray-600 hover:bg-gray-700 text-white">
              Back to Dashboard
            </Button>
          </Link>
          <Button
            onClick={exportPdf}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={exportLoading}
          >
            {exportLoading ? 'Exporting…' : 'Export PDF'}
          </Button>
        </div>
        {exportError && (
          <div className="mt-4 text-center text-sm text-red-600">{exportError}</div>
        )}
      </div>
    </div>
  );
};

export default InterviewResults;