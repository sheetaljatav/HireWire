import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { candidateAPI } from '../services/api';
import { Button } from './ui/button';
import { Table, Tag, Input, Select, Space } from 'antd';

const Dashboard = ({ onLogout }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await candidateAPI.getAllCandidates();
      if (response.data.success) {
        setCandidates(response.data.candidates);
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError(`Failed to fetch candidates: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const statusTagColor = (status) => {
    switch (status) {
      case 'applied':
        return 'blue';
      case 'interviewed':
        return 'gold';
      case 'completed':
        return 'green';
      case 'hired':
        return 'purple';
      case 'rejected':
        return 'red';
      default:
        return 'default';
    }
  };

  const getLatestScore = (candidate) => {
    if (candidate.interviews && candidate.interviews.length > 0) {
      const latestInterview = candidate.interviews[candidate.interviews.length - 1];
      return latestInterview.finalScore || 'In Progress';
    }
    return 'Not Started';
  };

  // Always call hooks at top-level: compute filtered data before any conditional returns
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchesSearch = [c.name, c.email, c.phone]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(search.toLowerCase()))
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [candidates, search, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">HireWire Dashboard</h1>
              <p className="text-gray-600">AI-Powered Interview Assistant</p>
            </div>
            <div className="flex space-x-4">
              <Link to="/add-candidate">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Add Candidate
                </Button>
              </Link>
              <Button
                onClick={onLogout}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{candidates.length}</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Candidates
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {candidates.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {candidates.filter(c => c.status === 'interviewed').length}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        In Progress
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {candidates.filter(c => c.status === 'interviewed').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {candidates.filter(c => c.status === 'completed').length}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Completed
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {candidates.filter(c => c.status === 'completed').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {candidates.filter(c => c.status === 'hired').length}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Hired
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {candidates.filter(c => c.status === 'hired').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Candidates Table (Ant Design) */}
          <div className="bg-white shadow sm:rounded-md p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">All Candidates</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage and review candidate interviews</p>
              </div>
              <Space>
                <Input.Search
                  allowClear
                  placeholder="Search name/email"
                  onSearch={setSearch}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 260 }}
                />
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'applied', label: 'Applied' },
                    { value: 'interviewed', label: 'Interviewed' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'hired', label: 'Hired' },
                    { value: 'rejected', label: 'Rejected' },
                  ]}
                  style={{ width: 160 }}
                />
              </Space>
            </div>

            <Table
              rowKey={(r) => r._id}
              dataSource={filteredCandidates}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              columns={[
                {
                  title: 'Candidate',
                  dataIndex: 'name',
                  render: (_, c) => (
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                        <span className="text-indigo-600 font-medium">
                          {c.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.email} • {c.phone}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (status) => <Tag color={statusTagColor(status)}>{status}</Tag>,
                },
                {
                  title: 'Latest Score',
                  render: (_, c) => <span className="text-sm text-gray-700">{getLatestScore(c)}</span>,
                },
                {
                  title: 'Actions',
                  render: (_, c) => (
                    <Space size="small">
                      {c.status === 'applied' && (
                        <Link to={`/interview/${c._id}`}>
                          <Button className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1">
                            Start Interview
                          </Button>
                        </Link>
                      )}
                      {c.interviews && c.interviews.length > 0 && (
                        <Link to={`/results/${c._id}/${c.interviews.length - 1}`}>
                          <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1">
                            View Results
                          </Button>
                        </Link>
                      )}
                      {c.resumeUrl && (
                        <a
                          href={c.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900 text-xs"
                        >
                          View Resume
                        </a>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;