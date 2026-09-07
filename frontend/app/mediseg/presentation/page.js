'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const slides = [
  {
    id: 1,
    num: '01',
    title: 'Smart Mobile Medical-Waste\nCollection & Segregation System',
    subtitle: 'An AI-Powered Autonomous Solution for Healthcare Waste Management',
    team: 'Team Autodesk Innovators',
    tag: 'SIH 2026 · Autodesk Problem Statement',
  },
  {
    id: 2,
    num: '02',
    title: 'Problem Statement',
    tag: 'The Challenge',
    content: [
      {
        icon: '⚠',
        text: 'Healthcare facilities generate ~2 million tonnes of biomedical waste annually in India alone.',
      },
      {
        icon: '🩸',
        text: 'Manual collection & segregation exposes healthcare workers to hazardous pathogens and sharps.',
      },
      {
        icon: '📉',
        text: 'Only ~30% of biomedical waste is properly segregated at source, causing severe operational inefficiency.',
      },
      {
        icon: '⚖️',
        text: 'Strict regulations (BMWM Rules 2016) require compliant, traceable, end-to-end handling.',
      },
      {
        icon: '🚨',
        text: 'Human error in segregation → contamination, health risks, and regulatory penalties.',
      },
    ],
    highlight: 'THE PROBLEM',
  },
  {
    id: 3,
    num: '03',
    title: 'Our Solution: MediSeg',
    tag: 'The Innovation',
    content: [
      'An AI-powered, battery-electric autonomous mobile robot that automates the entire biomedical waste lifecycle — collection, classification, segregation, and digital tracking.',
      'Vision-based waste classification using deep learning (YOLO / CNN) to identify waste category in real time.',
      'Autonomous navigation through hospital corridors with LiDAR + SLAM mapping.',
    ],
    features: [
      { icon: '🤖', label: 'Autonomous Navigation', desc: 'LiDAR + SLAM for safe movement' },
      { icon: '👁', label: 'AI Vision System', desc: 'Real-time waste classification' },
      { icon: '🗂', label: 'Smart Segregation', desc: 'Auto-dispensing compartments' },
      { icon: '🔋', label: 'Battery-Electric', desc: 'Sustainable & zero-emission' },
      { icon: '📡', label: 'IoT Tracking', desc: 'End-to-end digital traceability' },
      { icon: '🛡', label: 'Safety-First', desc: 'Minimal human exposure' },
    ],
  },
  {
    id: 4,
    num: '04',
    title: 'How It Works',
    tag: 'The System Architecture',
    workflow: [
      { step: '1', title: 'Collect', desc: 'Autonomous robot navigates to waste generation points (wards, OTs, labs) on demand or schedule.' },
      { step: '2', title: 'Classify', desc: 'AI vision camera scans the waste, classifying type: infectious, pathological, sharps, pharmaceutical, chemical, radioactive.' },
      { step: '3', title: 'Segregate', desc: 'Robotic arm / automated mechanism directs waste into the correct color-coded compartment inside the robot.' },
      { step: '4', title: 'Track', desc: 'Each bin logs weight, type, time, and source — synced to the cloud via IoT for full traceability.' },
      { step: '5', title: 'Dispose', desc: 'Robot autonomously docks at disposal station, generating compliance-ready digital manifests.' },
    ],
  },
  {
    id: 5,
    num: '05',
    title: 'Key Design Features',
    tag: 'Product Engineering',
    specs: [
      { label: 'Material', value: 'Medical-grade ABS + stainless steel' },
      { label: 'Capacity', value: '4 segregated compartments (60L total)' },
      { label: 'Sensors', value: 'RGB-D camera, LiDAR, load cells, RFID' },
      { label: 'Drive', value: 'Dual brushless DC motors, differential drive' },
      { label: 'Battery', value: 'Lithium-ion 48V, 8h runtime, swappable' },
      { label: 'AI Model', value: 'Custom YOLOv8 waste-classifier (~0.94 mAP)' },
      { label: 'Connectivity', value: 'Wi-Fi + 4G IoT gateway, cloud dashboard' },
      { label: 'Safety', value: 'E-stop, ultrasonic obstacle detection, CCTV' },
    ],
  },
  {
    id: 6,
    num: '06',
    title: 'Impact & Benefits',
    tag: 'Why It Matters',
    impact: [
      { stat: '100%', label: 'Continuous Automation', desc: 'Zero manual handling of hazardous waste' },
      { stat: '94%', label: 'Segregation Accuracy', desc: 'AI classification reduces human error' },
      { stat: '2x', label: 'Faster Collection', desc: 'Autonomous 24/7 operation' },
      { stat: '100%', label: 'Traceability', desc: 'Digital compliance & regulatory reporting' },
      { stat: '-40%', label: 'Infection Risk', desc: 'Reduced exposure to pathogens & sharps' },
      { stat: '0', label: 'Compromise', desc: 'On safety, quality & sustainability' },
    ],
  },
  {
    id: 7,
    num: '07',
    title: 'Product Development Roadmap',
    tag: 'Lifecycle via Autodesk Fusion',
    roadmap: [
      { phase: 'Concept & Ideation', desc: 'User research, sketches, ergonomic studies, requirement specs (Idea submission phase).' },
      { phase: '3D Modeling & Design', desc: 'Full parametric CAD model in Autodesk Fusion — body, drivetrain, segregation mechanism, electronics enclosure.' },
      { phase: 'Simulation & Analysis', desc: 'FEA structural analysis, motion studies, mechanism simulation, load testing.' },
      { phase: 'Generative Design', desc: 'AI-driven topology optimization of chassis & arm for lightweight, material-efficient parts.' },
      { phase: 'Manufacturing & Prototype', desc: 'Design-for-manufacturing (DFM), cost optimization, 3D-printable prototype validation.' },
      { phase: 'Scale & Deploy', desc: 'Scalable modular design for hospital fleets, quality control, and regulatory certification.' },
    ],
  },
];

export default function MediSeg() {
  const [mount, setMount] = useState(false);

  useEffect(() => {
    setMount(true);
  }, []);

  return (
    <div className="min-h-screen bg-isro-darker overflow-x-hidden relative">
      {/* Themed background image */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/mediseg-bg.svg)' }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-isro-darker/60 via-isro-darker/40 to-isro-darker/85" />
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-isro-darker/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center font-black text-white text-sm">
              MS
            </div>
            <div>
              <span className="text-sm font-bold text-white">MediSeg</span>
              <p className="text-[11px] text-gray-500 font-mono">Autodesk · SIH 2026</p>
            </div>
          </div>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Home
          </Link>
        </div>
      </nav>

      {/* Slide 1 - Hero */}
      <section className="relative z-10 min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 -left-20 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(45,212,191,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.4) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-400/30 bg-teal-400/10 text-teal-300 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {slides[0].tag}
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.1] mb-6 whitespace-pre-line">
            {slides[0].title}
          </h1>

          <p className="text-lg md:text-xl text-teal-200/80 max-w-3xl mx-auto mb-10 font-medium">
            {slides[0].subtitle}
          </p>

          <p className="text-sm text-gray-500 font-mono mb-12">{slides[0].team}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#problem" className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-xl shadow-teal-500/25">
              Explore the Solution
            </a>
            <a href="#design" className="px-8 py-4 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/5 transition-all">
              Product Engineering
            </a>
          </div>
        </div>

        {/* Slide indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((s) => (
            <div key={s.id} className={`w-2 h-2 rounded-full ${s.id === 1 ? 'bg-teal-400' : 'bg-white/20'}`} />
          ))}
        </div>
      </section>

      {/* Slide 2 - Problem */}
      <section id="problem" className="relative z-10 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-mono text-teal-400 tracking-widest">{slides[1].tag}</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-3">{slides[1].title}</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {slides[1].content.map((c, i) => (
              <div key={i} className={`glass-card rounded-2xl p-6 hover:glow-green transition-all duration-500 ${mount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="text-3xl mb-3">{c.icon}</div>
                <p className="text-gray-300 text-sm leading-relaxed">{c.text}</p>
              </div>
            ))}
            <div className="glass-card rounded-2xl p-6 border border-red-500/30 bg-red-500/5">
              <div className="text-3xl mb-3">💡</div>
              <p className="text-red-300 text-sm leading-relaxed font-semibold">{slides[1].highlight}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 3 - Solution */}
      <section className="relative z-10 py-24 border-t border-white/5 bg-gradient-to-b from-isro-darkblue/40 to-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-mono text-teal-400 tracking-widest">{slides[2].tag}</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-3">{slides[2].title}</h2>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto mb-12">
            {slides[2].content.map((c, i) => (
              <p key={i} className="text-gray-300 leading-relaxed text-center">
                {c}
              </p>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {slides[2].features.map((f, i) => (
              <div key={i} className={`glass-card rounded-2xl p-6 text-center hover:glow-green transition-all duration-500 ${mount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="text-white font-bold mb-1">{f.label}</h3>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slide 4 - How it works */}
      <section className="relative z-10 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-mono text-teal-400 tracking-widest">{slides[3].tag}</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-3">{slides[3].title}</h2>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {slides[3].workflow.map((w, i) => (
              <div key={i} className={`flex items-start gap-6 glass-card rounded-2xl p-6 transition-all duration-500 ${mount ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}`} style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-black shrink-0">
                  {w.step}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{w.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slide 5 - Design Specs */}
      <section id="design" className="relative z-10 py-24 border-t border-white/5 bg-gradient-to-b from-transparent to-isro-darkblue/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-mono text-teal-400 tracking-widest">{slides[4].tag}</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-3">{slides[4].title}</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {slides[4].specs.map((s, i) => (
              <div key={i} className={`flex items-center justify-between glass-card rounded-xl p-5 transition-all duration-500 ${mount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${i * 60}ms` }}>
                <span className="text-sm text-gray-400">{s.label}</span>
                <span className="text-sm font-semibold text-teal-300 text-right ml-4">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slide 6 - Impact */}
      <section className="relative z-10 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-mono text-teal-400 tracking-widest">{slides[5].tag}</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-3">{slides[5].title}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {slides[5].impact.map((imp, i) => (
              <div key={i} className={`glass-card rounded-2xl p-8 text-center hover:glow-green transition-all duration-500 ${mount ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent mb-2">
                  {imp.stat}
                </div>
                <h3 className="text-white font-bold text-sm mb-2">{imp.label}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{imp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slide 7 - Roadmap */}
      <section className="relative z-10 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-mono text-teal-400 tracking-widest">{slides[6].tag}</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-3">{slides[6].title}</h2>
          </div>

          <div className="max-w-4xl mx-auto">
            {slides[6].roadmap.map((r, i) => (
              <div key={i} className={`flex gap-6 transition-all duration-500 ${mount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  {i < slides[6].roadmap.length - 1 && (
                    <div className="w-px flex-1 bg-gradient-to-b from-teal-500/40 to-transparent my-1 min-h-[40px]" />
                  )}
                </div>
                <div className={`glass-card rounded-xl p-5 mb-6 flex-1 ${i % 2 === 0 ? 'border-l-4 border-teal-400' : 'border-l-4 border-emerald-500'}`}>
                  <h3 className="text-lg font-bold text-white mb-1">{r.phase}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing / CTA */}
      <section className="relative z-10 py-20 border-t border-white/5 bg-gradient-to-br from-isro-darkblue to-isro-darker">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
            Toward a Safer, Smarter, and Sustainable<br className="hidden md:block" />
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">Healthcare Waste Future</span>
          </h2>
          <p className="text-gray-400 mb-10 leading-relaxed">
            MediSeg transforms biomedical waste management with AI-driven automation,
            delivering safety, efficiency, traceability, and regulatory compliance for next-generation healthcare.
          </p>
          <Link href="/"
            className="inline-block px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-xl shadow-teal-500/25">
            Back to Home
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-600">
            MediSeg · Smart Mobile Medical-Waste Collection & Segregation System · SIH 2026 · Autodesk Fusion
          </p>
        </div>
      </footer>
    </div>
  );
}
