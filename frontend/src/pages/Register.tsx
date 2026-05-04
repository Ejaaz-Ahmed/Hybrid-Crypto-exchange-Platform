import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    country: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/users/register', {
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        country: formData.country,
      });
      // Auto-login after register is often preferred, but we'll redirect to login here
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <img src="/logo.jpg" alt="EAA Exchange Logo" className="h-24 object-contain mx-auto mb-4" />
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <p className="text-sm text-slate-500 mt-2">Join the professional trading network</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4 mt-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 text-sm border border-red-200">
                {error}
              </div>
            )}
            <Input
              label="Full Name"
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <Input
              label="Country"
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
            />
            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? 'Registering...' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-slate-500">
            Already have an account? <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign In</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
