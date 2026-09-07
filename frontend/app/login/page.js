'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function checkPasswordStrength(pw) {
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /[0-9]/.test(pw),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  if (passed <= 2) return { level: 'Weak', color: 'bg-red-500', checks, passed };
  if (passed <= 4) return { level: 'Medium', color: 'bg-orange-500', checks, passed };
  return { level: 'Strong', color: 'bg-green-500', checks, passed };
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('engineer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwStrength, setPwStrength] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const router = useRouter();

  const onPasswordChange = useCallback((val) => {
    setPassword(val);
    if (!isLogin && val.length > 0) {
      setPwStrength(checkPasswordStrength(val));
    } else {
      setPwStrength(null);
    }
  }, [isLogin]);

  const isStrongEnough = (pw) => {
    const s = checkPasswordStrength(pw);
    return s.passed >= 4;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin && !isStrongEnough(password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin
        ? { email, password }
        : { email, password, name, role };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      if (isLogin) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setIsLogin(true);
        setError('');
        alert('Registration successful! Please sign in.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-isro-darker flex items-center justify-center relative overflow-hidden">
      {/* Themed background image */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/login-bg.svg)' }} />
      {/* Dark overlay to keep text readable */}
      <div className="absolute inset-0 bg-isro-darker/60" />

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-isro-blue/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-isro-orange/8 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(77,166,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(77,166,255,0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-isro-blue to-isro-orange flex items-center justify-center font-bold text-white text-xl mb-4 shadow-xl shadow-isro-blue/30">
            ISRO
          </div>
          <h1 className="text-2xl font-bold text-white">MAVERICK</h1>
          <p className="text-sm text-gray-500 mt-1">Burn-In Anomaly Detection System</p>
        </div>

        {/* Login Form */}
        <div className="glass-card rounded-2xl p-8">
          <div className="flex mb-6 bg-isro-dark rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); setPwStrength(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                isLogin ? 'bg-isro-blue text-white shadow' : 'text-gray-500 hover:text-gray-300'
              }`}>
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                !isLogin ? 'bg-isro-blue text-white shadow' : 'text-gray-500 hover:text-gray-300'
              }`}>
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50 focus:ring-1 focus:ring-isro-lightblue/20 transition-all"
                  placeholder="Enter your name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                className="w-full px-4 py-3 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50 focus:ring-1 focus:ring-isro-lightblue/20 transition-all"
                placeholder="name@isro.gov.in"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-12 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50 focus:ring-1 focus:ring-isro-lightblue/20 transition-all"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs font-mono select-none"
                  tabIndex={-1}>
                  {showPw ? 'HIDE' : 'SHOW'}
                </button>
              </div>

              {/* Password Strength Bar — only in Register mode */}
              {!isLogin && pwStrength && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all ${
                          i <= pwStrength.passed ? pwStrength.color : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-[11px] font-medium ${
                    pwStrength.passed <= 2 ? 'text-red-400' :
                    pwStrength.passed <= 4 ? 'text-orange-400' : 'text-green-400'
                  }`}>
                    {pwStrength.level}
                    {pwStrength.passed < 4 && (
                      <span className="text-gray-500 ml-2 font-normal">
                        — need {['Uppercase', 'Lowercase', 'Number', 'Special char (!@#$)', '8+ chars']
                          .filter((_, i) => !pwStrength.passed || i < pwStrength.passed - 1).length > 0
                          ? `${4 - pwStrength.passed} more requirement${4 - pwStrength.passed > 1 ? 's' : ''}`
                          : ''}
                      </span>
                    )}
                    {pwStrength.passed >= 4 && (
                      <span className="text-gray-500 ml-2 font-normal">— meets all requirements</span>
                    )}
                  </p>
                  <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {[
                      { key: 'length', label: '8+ characters' },
                      { key: 'upper', label: 'Uppercase letter' },
                      { key: 'lower', label: 'Lowercase letter' },
                      { key: 'digit', label: 'Number (0-9)' },
                      { key: 'special', label: 'Special character (!@#$...)' },
                    ].map((c) => (
                      <span key={c.key} className={`text-[10px] flex items-center gap-1 ${
                        pwStrength.checks[c.key] ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        {pwStrength.checks[c.key] ? '✓' : '○'} {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50 transition-all">
                  <option value="engineer">Engineer</option>
                  <option value="qa_inspector">QA Inspector</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-isro-blue to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-all shadow-lg shadow-isro-blue/25 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {isLogin && (
            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-[10px] text-gray-500 text-center">
                Contact your system administrator for account credentials
              </p>
            </div>
          )}
        </div>

        <Link href="/" className="block text-center mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
