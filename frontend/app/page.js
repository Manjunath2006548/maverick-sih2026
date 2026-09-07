'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-isro-darker relative overflow-hidden">
      {/* Themed background image */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/burnin-bg.svg)' }} />
      {/* Dark overlay to keep text readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-isro-darker/55 via-isro-darker/35 to-isro-darker/85" />

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-isro-blue/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-isro-orange/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-isro-blue/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(77,166,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(77,166,255,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-isro-blue to-isro-orange flex items-center justify-center font-bold text-white text-lg">
              ISRO
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">MAVERICK</h1>
              <p className="text-xs text-gray-500 font-mono">Department of Space | ISRO</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/mediseg/intro"
              className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-all shadow-lg shadow-teal-500/25">
              MediSeg Prototype 🏥
            </Link>
            <Link href="/mediseg/presentation"
              className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors border border-white/10 rounded-lg">
              Concept Deck
            </Link>
            <Link href="/login"
              className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/login"
              className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-isro-blue to-blue-600 text-white rounded-lg hover:opacity-90 transition-all shadow-lg shadow-isro-blue/25">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-isro-blue/30 bg-isro-blue/10 text-isro-lightblue text-xs font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-isro-green animate-pulse" />
              AI-Powered Component Screening System
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-tight mb-6">
              AI-Driven{' '}
              <span className="bg-gradient-to-r from-isro-lightblue to-isro-orange bg-clip-text text-transparent">
                Anomaly Detection
              </span>
              <br />
              in Component Burn-In & Screening
            </h1>

            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Detect latent defects that escape traditional screening. Our dual-module system
              combines dynamic outlier detection with predictive drift analysis to prevent
              catastrophic field failures in critical space-grade components.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login"
                className="px-8 py-4 bg-gradient-to-r from-isro-blue to-blue-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-xl shadow-isro-blue/30 text-base">
                Launch System
              </Link>
              <a href="#modules"
                className="px-8 py-4 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/5 transition-all text-base">
                View Architecture
              </a>
            </div>
          </div>

          {/* Module Cards */}
          <div id="modules" className="mt-32 grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Module A */}
            <div className={`glass-card rounded-2xl p-8 transition-all duration-700 hover:glow-blue ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-isro-lightblue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-mono text-isro-lightblue">MODULE A</span>
                  <h3 className="text-xl font-bold text-white">Dynamic Outlier Detection</h3>
                </div>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Lot-relative statistical analysis using Z-Score, IQR, and Isolation Forest.
                Detects components that pass absolute limits but exhibit anomalous drift within
                their lot distribution.
              </p>

              <div className="space-y-3">
                {['Z-Score Anomaly Detection', 'IQR-Based Bounds', 'Absolute Limit Checking', 'Majority Vote Consensus'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-isro-lightblue" />
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Module B */}
            <div className={`glass-card rounded-2xl p-8 transition-all duration-700 hover:glow-orange ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-isro-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-mono text-isro-orange">MODULE B</span>
                  <h3 className="text-xl font-bold text-white">Time-Series Drift Predictor</h3>
                </div>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Predicts 168h parametric values from 0h and 24h measurements using
                Gradient Boosting and Random Forest regression. Enables early rejection
                before full burn-in completion.
              </p>

              <div className="space-y-3">
                {['0h & 24h to 168h Prediction', 'Safety Slope Thresholds', 'Gradient Boosting Models', 'Early Rejection Decisions'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-isro-orange" />
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Evaluation Metrics */}
          <div className="mt-20 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-white mb-8">Evaluation Metrics</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Anomaly Detection Score',
                  desc: 'False Negative penalty system for missed defective parts',
                  icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
                  color: 'red'
                },
                {
                  title: 'Drift Prediction Accuracy',
                  desc: 'MAE between predicted and actual 168h ground-truth values',
                  icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
                  color: 'blue'
                },
                {
                  title: 'Explainability',
                  desc: 'Human-readable justification for every classification decision',
                  icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
                  color: 'green'
                }
              ].map((metric, i) => (
                <div key={i} className="glass-card rounded-xl p-6 text-center">
                  <div className={`w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center bg-isro-${metric.color}/10 border border-isro-${metric.color}/20`}>
                    <svg className={`w-7 h-7 text-isro-${metric.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={metric.icon} />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{metric.title}</h3>
                  <p className="text-xs text-gray-500">{metric.desc}</p>
                </div>
              ))}
            </div>
          </div>
        {/* MediSeg — Combined Portal */}
          <div className="mt-24 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-end justify-between gap-4 mb-10">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-400/30 bg-teal-500/10 text-teal-300 text-xs font-medium mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  All-In-One Project Portal
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                  MediSeg{' '}
                  <span className="bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                    Smart Medical-Waste System
                  </span>
                </h2>
                <p className="text-gray-400 mt-3 max-w-2xl leading-relaxed">
                  The complete solution in one place — from the problem introduction and secure
                  authentication to the interactive working prototype and full concept deck.
                </p>
              </div>
              <a href="/mediseg"
                className="px-6 py-3 text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-teal-500/25 whitespace-nowrap">
                Launch Prototype →
              </a>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  step: '01',
                  title: 'Introduction',
                  desc: 'Problem context, impact of unsafe medical waste, and the complete system architecture overview.',
                  href: '/mediseg/intro',
                  color: 'teal'
                },
                {
                  step: '02',
                  title: 'Sign In / Register',
                  desc: 'Secure portal entry with strong password validation, live strength meter, and session management.',
                  href: '/mediseg/login',
                  color: 'emerald'
                },
                {
                  step: '03',
                  title: 'Working Prototype',
                  desc: 'Interactive simulator — autonomous patrol, AI waste scanner (98% accuracy), BMWM 2018 segregation, tracking ledger.',
                  href: '/mediseg',
                  color: 'teal'
                },
                {
                  step: '04',
                  title: 'Concept Deck',
                  desc: 'Presentation slides covering the SIH problem statement, methodology, and expected outcomes.',
                  href: '/mediseg/presentation',
                  color: 'emerald'
                }
              ].map((card, i) => (
                <a key={i} href={card.href}
                  className="glass-card rounded-2xl p-6 block transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/40">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-emerald-600/20 border border-teal-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="text-2xl font-black text-white/10">{card.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-5">{card.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                    Open →
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/5 py-8">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-sm text-gray-600">
              Indian Space Research Organisation | Department of Space | Smart Automation Theme
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
