import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Check, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from '../layouts/AuthLayout';
import ErrorMessage from '../components/ErrorMessage';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Full name is required.';
    }

    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirmation password is required.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Registration failed. Please check your information and try again.';
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Create Account</h2>
        <p className="text-sm text-gray-500 mt-1">Deploy TruthGuard adversarial verification</p>
      </div>

      {apiError && (
        <div className="mb-4">
          <ErrorMessage message={apiError} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
            Full Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <User className="w-5 h-5" />
            </div>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
              }}
              placeholder="Dr. Jane Doe"
              className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-sm ${
                errors.name ? 'border-red-400 bg-red-50/20' : 'border-gray-300'
              }`}
            />
          </div>
          {errors.name && <p className="text-xs text-red-600 mt-1 font-medium">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Mail className="w-5 h-5" />
            </div>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
              }}
              placeholder="analyst@enterprise.com"
              className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-sm ${
                errors.email ? 'border-red-400 bg-red-50/20' : 'border-gray-300'
              }`}
            />
          </div>
          {errors.email && <p className="text-xs text-red-600 mt-1 font-medium">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
            Password (min 8 characters)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-5 h-5" />
            </div>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
              }}
              placeholder="••••••••"
              className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-sm ${
                errors.password ? 'border-red-400 bg-red-50/20' : 'border-gray-300'
              }`}
            />
          </div>
          {errors.password && <p className="text-xs text-red-600 mt-1 font-medium">{errors.password}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Check className="w-5 h-5" />
            </div>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
              }}
              placeholder="••••••••"
              className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-sm ${
                errors.confirmPassword ? 'border-red-400 bg-red-50/20' : 'border-gray-300'
              }`}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-600 mt-1 font-medium">{errors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registering...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-600">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
