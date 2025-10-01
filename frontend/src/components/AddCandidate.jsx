import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { candidateAPI } from '../services/api';
import { Button } from './ui/button';

const AddCandidate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [parseLoading, setParseLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    if (selectedFile && selectedFile.type === 'application/pdf') {
      await parseResume(selectedFile);
    }
  };

  const parseResume = async (file) => {
    console.log('Parsing resume:', file.name);
    setParseLoading(true);
    setError('');
    
    const parseFormData = new FormData();
    parseFormData.append('file', file);
    
    try {
      const response = await candidateAPI.parseResume(parseFormData);
      console.log('Parse resume response:', response.data);
      
      if (response.data.success && response.data.extractedData) {
        const { name, email, phone } = response.data.extractedData;
        console.log('Extracted data:', { name, email, phone });
        
        // Auto-fill fields only if they're currently empty and extracted data is available
        setFormData(prevData => ({
          name: prevData.name || name || '',
          email: prevData.email || email || '',
          phone: prevData.phone || phone || '',
        }));
        
        if (name || email || phone) {
          setSuccess('Resume parsed! Fields have been auto-filled.');
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
      setParseLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const submitFormData = new FormData();
    submitFormData.append('name', formData.name);
    submitFormData.append('email', formData.email);
    submitFormData.append('phone', formData.phone);
    submitFormData.append('file', file);

    try {
      const response = await candidateAPI.addCandidate(submitFormData);
      if (response.data.message) {
        setSuccess('Candidate added successfully!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add candidate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">Add New Candidate</h2>
          <p className="mt-2 text-sm text-gray-600">
            Upload candidate resume and basic information
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter candidate's full name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter candidate's email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter candidate's phone number"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                Resume (PDF)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file"
                        name="file"
                        type="file"
                        className="sr-only"
                        accept=".pdf"
                        required
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF up to 5MB</p>
                  {file && (
                    <p className="text-sm text-green-600 mt-2">
                      Selected: {file.name}
                    </p>
                  )}
                  {parseLoading && (
                    <p className="text-sm text-blue-600 mt-2">
                      Parsing resume...
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Link to="/dashboard">
                <Button
                  type="button"
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Candidate'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddCandidate;