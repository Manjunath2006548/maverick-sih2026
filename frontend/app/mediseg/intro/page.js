'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const features = [
  { icon: '🤖', title: 'Autonomous Navigation', desc: 'LiDAR + SLAM patrol of wards, OTs, labs, and pharmacies with obstacle avoidance in crowded corridors.' },
  { icon: '👁️', title: 'AI Vision Classification', desc: 'YOLOv8 object detection + CNN classification identifies waste type at 98% accuracy in real time.' },
  { icon: '🗂️', title: 'Smart Segregation', desc: 'Rotating dispenser routes each item into its colour-coded compartment per BMWM Rules 2018.' },
  { icon: '🔋', title: 'Battery-Electric', desc: 'Zero-emission 48V lithium pack with hot-swap bays for 24/7 operation between recharges.' },
  { icon: '📡', title: 'IoT Traceability', desc: 'Every batch logged to the cloud — source, weight, type, operator — for full regulatory compliance.' },
  { icon: '🛡️', title: 'Zero-Touch Safety', desc: 'HEPA-filtered airflow and UV decontamination keep hazardous exposure to healthcare staff at zero.' },
];

const workflow = [
  { step: '01', title: 'Collect', desc: 'On-demand or scheduled patrol to waste generation points.' },
  { step: '02', title: 'Classify', desc: 'AI vision detects and identifies the waste category.' },
  { step: '03', title: 'Segregate', desc: 'Robotic arm routes waste into the colour-matched bin.' },
  { step: '04', title: 'Track', desc: 'Batch data synced to cloud for traceability.' },
  { step: '05', title: 'Dispose', desc: 'Autonomous dock for treatment handoff & compliant manifests.' },
];

const stats = [
  { v: '100%', l: 'Automation', d: 'Zero manual waste handling' },
  { v: '98%', l: 'AI Accuracy', d: 'Verifiable classification' },
  { v: '24/7', l: 'Operation', d: 'Round-the-clock collection' },
  { v: '5', l: 'Compartment Types', d: 'Full BMWM colour coding' },
];

export default function MediSegIntro() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-isro-darker text-gray-100 overflow-x-hidden relative">
      {/* Themed background image */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/mediseg-bg.svg)' }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-isro-darker/60 via-isro-darker/40 to-isro-darker/85" />

      {/* ===== Nav ===== */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-isro-darker/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-emerald-500/20">
              MS
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">MediSeg</span>
              <p className="text-[11px] text-gray-500 font-mono">Autodesk · SIH 2026 · MedTech</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">Features</a>
            <a href="#workflow" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">How it works</a>
            <Link href="/mediseg/login" className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-all shadow-lg shadow-teal-500/25">
              Login / Launch
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/2 -left-28 w-[420px] h-[420px] bg-emerald-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(45,212,191,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.4) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-400/30 bg-teal-400/10 text-teal-300 text-xs font-medium mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Smart Mobile Medical-Waste Collection & Segregation System
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.05] mb-6">
              Reimagining
              <span className="block bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">Biomedical Waste</span>
              Management
            </h1>
            <p className="text-lg text-gray-400 max-w-xl leading-relaxed mb-8">
              An AI-powered, battery-electric autonomous rover that automates the collection,
              identification, segregation, and digital tracking of hazardous hospital waste —
              keeping healthcare workers safe and operations fully compliant.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/mediseg/login" className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-xl shadow-teal-500/25 text-center">
                🚀 Launch the Prototype
              </Link>
              <a href="#workflow" className="px-8 py-4 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/5 transition-all text-center">
                See How It Works
              </a>
            </div>
          </div>

          {/* Hero visual - robot + bins */}
          <div className="grid grid-cols-3 gap-3">
            {['yellow', 'red', 'white', 'blue', 'black'].map((c, i) => (
              <div key={c}
                className={`glass-card rounded-2xl p-4 flex flex-col items-center justify-center text-center aspect-square ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ transitionDelay: `${i * 100}ms`, background: `linear-gradient(160deg, ${({
                  yellow: '#fbbf24', red: '#ef4444', white: '#e2e8f0', blue: '#3b82f6', black: '#475569'
                })[c]}22, rgba(17,24,39,0.9))`, border: `1px solid ${({
                  yellow: '#fbbf24', red: '#ef4444', white: '#e2e8f0', blue: '#3b82f6', black: '#475569'
                })[c]}44` }}
              >
                <span className="text-4xl mb-2">{({
                  yellow: '🧬', red: '🧪', white: '🩸', blue: '🔬', black: '☣️'
                })[c]}</span>
                <span className="text-[11px] font-mono font-semibold" style={{ color: ({yellow:'#fbbf24',red:'#ef4444',white:'#cbd5e1',blue:'#60a5fa',black:'#94a3b8'})[c] }}>
                  {({yellow:'Yellow',red:'Red',white:'Sharps',blue:'Glass',black:'Chemical'})[c]}
                </span>
              </div>
            ))}
            <div className="col-span-3 flex items-center justify-center gap-3 glass-card rounded-2xl p-4">
              <span className="text-3xl animate-float">🤖</span>
              <div className="text-left">
                <div className="text-sm font-bold text-white">Autonomous Rover MS-01</div>
                <div className="text-[11px] text-gray-500 font-mono">LiDAR + SLAM · YOLOv8 Vision · 48V Electric · IoT Telemetry</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 text-center">
              <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
                {s.v}
              </div>
              <div className="text-sm font-semibold text-white mt-1">{s.l}</div>
              <div className="text-[11px] text-gray-500">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="relative z-10 py-20 border-t border-white/5 bg-gradient-to-b from-transparent to-isro-darkblue/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-mono text-teal-400 tracking-widest">WHY MEDISEG</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-3">Core Capabilities</h2>
            <p className="text-gray-500 max-w-2xl mx-auto mt-3">Six integrated subsystems working together to transform hospital waste handling.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className={`glass-card rounded-2xl p-6 hover:glow-green transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Workflow ===== */}
      <section id="workflow" className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-mono text-teal-400 tracking-widest">END-TO-END PIPELINE</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-3">How MediSeg Works</h2>
          </div>

          <div className="grid md:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {workflow.map((w, i) => (
              <div key={i} className="relative">
                <div className={`glass-card rounded-2xl p-5 h-full transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${i * 100}ms` }}>
                  <div className="text-2xl font-black text-teal-400 font-mono mb-2">{w.step}</div>
                  <h3 className="text-white font-bold mb-1">{w.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{w.desc}</p>
                </div>
                {i < workflow.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 z-10 text-teal-400">→</div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="glass-card rounded-2xl p-6 inline-block text-left max-w-2xl border-l-4 border-teal-400">
              <p className="text-gray-300 leading-relaxed text-sm">
                <span className="text-teal-300 font-semibold">🚀 Ready to see it in action?</span><br />
                Log in to the interactive prototype to operate the rover, run the AI classifier,
                segregate live waste, and review the traceability ledger.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative z-10 py-20 border-t border-white/5 bg-gradient-to-br from-isro-darkblue to-isro-darker">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
            Toward a Safer, Smarter &
            <span className="block bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">Compliant Healthcare Waste Future</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/mediseg/login" className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-xl shadow-teal-500/25">
              💻 User Login
            </Link>
            <Link href="/mediseg/presentation" className="px-8 py-4 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/5 transition-all">
              📊 View Concept Deck
            </Link>
            <Link href="/" className="px-8 py-4 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/5 transition-all">
              ← Home
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-600">
            MediSeg · AI-Powered Biomedical Waste Management · SIH 2026 · Autodesk Fusion · MedTech / HealthTech
          </p>
        </div>
      </footer>
    </div>
  );
}
