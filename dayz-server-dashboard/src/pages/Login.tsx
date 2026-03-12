import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Login() {
  const navigate = useNavigate();
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    if (!form.username || !form.password) {
      setValidationError('Please fill in all required fields');
      return;
    }

    if (isRegister) {
      if (!form.email) {
        setValidationError('Email is required');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setValidationError('Passwords do not match');
        return;
      }
      if (form.password.length < 6) {
        setValidationError('Password must be at least 6 characters');
        return;
      }
      try {
        await register(form.username, form.email, form.password);
        navigate('/dashboard');
      } catch {
        // Error handled in store
      }
    } else {
      try {
        await login(form.username, form.password);
        navigate('/dashboard');
      } catch {
        // Error handled in store
      }
    }
  };

  const displayError = error || validationError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-military-darker relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-surface-950/40 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(74,103,65,0.1) 50px, rgba(74,103,65,0.1) 51px), repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(74,103,65,0.1) 50px, rgba(74,103,65,0.1) 51px)',
          }}
        />
      </div>

      <div className="relative w-full max-w-md mx-4">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-xl mb-4 shadow-lg shadow-primary-900/30">
            <Crosshair className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">DayZ Server Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your servers with precision
          </p>
        </div>

        {/* Form Card */}
        <div className="military-card p-6">
          {/* Tab Switch */}
          <div className="flex mb-6 bg-surface-900/60 rounded-lg p-1">
            <button
              onClick={() => {
                setIsRegister(false);
                clearError();
                setValidationError('');
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                !isRegister
                  ? 'bg-primary-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsRegister(true);
                clearError();
                setValidationError('');
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                isRegister
                  ? 'bg-primary-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error Display */}
          {displayError && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-danger-900/30 border border-danger-700/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />
              <p className="text-sm text-danger-300">{displayError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              type="text"
              value={form.username}
              onChange={(e) =>
                setForm({ ...form, username: e.target.value })
              }
              placeholder="Enter username"
              autoComplete="username"
            />

            {isRegister && (
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="Enter email"
                autoComplete="email"
              />
            )}

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder="Enter password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-gray-500 hover:text-gray-300"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {isRegister && (
              <Input
                label="Confirm Password"
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                placeholder="Confirm password"
                autoComplete="new-password"
              />
            )}

            <Button
              type="submit"
              loading={isLoading}
              className="w-full mt-2"
              size="lg"
            >
              {isRegister ? 'Create Account' : 'Sign In'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          DayZ Server Management Dashboard v1.0
        </p>
      </div>
    </div>
  );
}
