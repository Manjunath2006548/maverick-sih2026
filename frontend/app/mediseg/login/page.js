'use client';

import { useState } from 'react';
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

export default function MediSegLogin() {
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Operator');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwStrength, setPwStrength] = useState(null);
  const router = useRouter();

  const onPasswordChange = (val) => {
    setPassword(val);
    setPwStrength(mode === 'register' && val.length > 0 ? checkPasswordStrength(val) : null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim()) return setError('Please enter your full name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.');
      const strength = checkPasswordStrength(password);
      if (strength.passed < 4)
        return setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character.');
      setLoading(true);
      setTimeout(() => {
        localStorage.setItem('mediseg_user', JSON.stringify({ name, email, role }));
        setLoading(false);
        setMode('login');
        setError('');
        alert('Account created! Please sign in.');
      }, 700);
      return;
    }

    // login
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    setTimeout(() => {
      localStorage.setItem('mediseg_user', JSON.stringify({ name, email, role: 'Operator' }));
      setLoading(false);
      router.push('/mediseg');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-isro-darker flex items-center justify-center relative overflow-hidden py-10">
      {/* Themed background image */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/mediseg-bg.svg)' }} />
      <div className="absolute inset-0 bg-isro-darker/60" />
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(45,212,191,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-7">
          <Link href="/mediseg/intro" className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center font-black text-white text-xl shadow-xl shadow-emerald-500/25">
              MS
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white leading-tight">MediSeg</h1>
              <p className="text-xs text-gray-500 font-mono">Biomedical Waste Management</p>
            </div>
          </Link>
          <p className="text-sm text-gray-400">Sign in to operate the autonomous rover</p>
        </div>

        {/* Form card */}
        <div className="glass-card rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex mb-6 bg-isro-dark rounded-lg p-1 border border-white/5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setPwStrength(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'login' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
              }`}>
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setPwStrength(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'register' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
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
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20 transition-all"
                  placeholder="Dr. A. Sharma"
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
                className="w-full px-4 py-3 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20 transition-all"
                placeholder="you@mediseg.in"
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
                  className="w-full px-4 py-3 pr-12 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20 transition-all"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs font-mono select-none"
                  tabIndex={-1}>
                  {showPw ? 'HIDE' : 'SHOW'}
                </button>
              </div>

              {/* Password strength — only in Register mode */}
              {mode === 'register' && pwStrength && (
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
                    {pwStrength.passed >= 4 ? (
                      <span className="text-gray-500 ml-2 font-normal">— meets all requirements</span>
                    ) : (
                      <span className="text-gray-500 ml-2 font-normal">— need {4 - pwStrength.passed} more</span>
                    )}
                  </p>
                  <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {[
                      { key: 'length', label: '8+ characters' },
                      { key: 'upper', label: 'Uppercase letter' },
                      { key: 'lower', label: 'Lowercase letter' },
                      { key: 'digit', label: 'Number (0-9)' },
                      { key: 'special', label: 'Special char (!@#$)' },
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

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-teal-400/50 transition-all">
                  <option value="Admin">Facility Manager / Admin</option>
                  <option value="Operator">Rover Operator</option>
                  <option value="QA / Compliance">QA / Compliance Officer</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-lg hover:opacity-90 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 pt-4 border-t border-white/5 text-[10px] text-gray-600 text-center">
            New here? Switch to "Register" to create an account — or sign in with your facility credentials.
          </p>
        </div>

        <div className="flex items-center justify-between mt-6 text-sm">
          <Link href="/mediseg/intro" className="text-gray-500 hover:text-gray-300 transition-colors">
            ← Back to Intro
          </Link>
          <Link href="/mediseg/presentation" className="text-gray-500 hover:text-gray-300 transition-colors">
            Concept Deck →
          </Link>
        </div>
      </div>
    </div>
  );
}
