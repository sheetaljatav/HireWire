import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Form, Input, Button, Typography, Alert, Card } from 'antd';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.login(values);
      if (response.data.success) {
        setFormData({ email: '', password: '' });
        onLogin(response.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md" bordered={false}>
        <Typography.Title level={3} style={{ marginBottom: 8 }}>Welcome Back</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>Sign in to your interviewer account</Typography.Paragraph>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={onFinish} onValuesChange={(_, all) => setFormData(all)} autoComplete="off">
          <Form.Item label="Email Address" name="email" rules={[{ required: true, message: 'Please enter your email' }, { type: 'email' }]}>
            <Input placeholder="name@company.com" size="large" autoComplete="new-email" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please enter your password' }]}>
            <Input.Password placeholder="••••••••" size="large" autoComplete="new-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>Sign in</Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            <Typography.Text type="secondary">Don't have an account? </Typography.Text>
            <Link to="/register">Sign up</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;