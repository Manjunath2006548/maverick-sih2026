'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ============ CONSTANTS ============ */

const WASTE_TYPES = [
  { id: 'yellow', name: 'Infectious / Pathological', short: 'Infectious', color: '#fbbf24', emoji: '🧬', desc: 'Soiled, anatomical, microbiological waste' },
  { id: 'red', name: 'Contaminated Recyclable', short: 'Recyclable', color: '#ef4444', emoji: '🧪', desc: 'IV tubes, catheters, bottles' },
  { id: 'white', name: 'Sharps', short: 'Sharps', color: '#e2e8f0', emoji: '🩸', desc: 'Needles, scalpels, blades' },
  { id: 'blue', name: 'Glassware', short: 'Glass', color: '#3b82f6', emoji: '🔬', desc: 'Broken / contaminated glass' },
  { id: 'black', name: 'Chemical / Radioactive', short: 'Chemical', color: '#475569', emoji: '☣️', desc: 'Solvents, reagents, pharmaceuticals' },
];

const WASTE_ITEMS = [
  { label: 'IV Drip Set', type: 'red', weight: 0.18 },
  { label: 'Used Syringe', type: 'white', weight: 0.04 },
  { label: 'Surgical Gloves', type: 'yellow', weight: 0.09 },
  { label: 'Placenta (Anatomical)', type: 'yellow', weight: 1.2 },
  { label: 'Blood Bag', type: 'yellow', weight: 0.5 },
  { label: 'Catheter Tube', type: 'red', weight: 0.12 },
  { label: 'Scalpel Blade', type: 'white', weight: 0.02 },
  { label: 'Broken Vial', type: 'blue', weight: 0.08 },
  { label: 'Culture Plate', type: 'yellow', weight: 0.15 },
  { label: 'Formaldehyde Reagent', type: 'black', weight: 0.65 },
  { label: 'Glass Ampule', type: 'blue', weight: 0.06 },
  { label: 'Chemo Waste Bag', type: 'black', weight: 0.35 },
  { label: 'Cotton Gauze', type: 'yellow', weight: 0.05 },
  { label: 'Medicine Bottle', type: 'blue', weight: 0.1 },
  { label: 'Insulin Pen', type: 'white', weight: 0.03 },
];

const CONTAINER = 60; // Litres total capacity
const CAP_LITRES = CONTAINER / 5; // 12L per compartment

const MAP_NODES = [
  { id: 'docking', label: 'Docking / Disposal', x: 16, y: 84 },
  { id: 'er', label: 'Emergency Ward', x: 16, y: 34 },
  { id: 'icu', label: 'ICU', x: 38, y: 16 },
  { id: 'ot', label: 'Operation Theater', x: 62, y: 16 },
  { id: 'lab', label: 'Pathology Lab', x: 84, y: 34 },
  { id: 'pharm', label: 'Pharmacy', x: 84, y: 66 },
  { id: 'warda', label: 'Ward A', x: 62, y: 84 },
  { id: 'wardb', label: 'Ward B', x: 38, y: 84 },
];

/* ============ HELPERS ============ */

const rnd = (min, max) => min + Math.random() * (max - min);

function pickRandomWaste() {
  return WASTE_ITEMS[Math.floor(Math.random() * WASTE_ITEMS.length)];
}

function genId() {
  return 'MS-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Date.now().toString().slice(-5);
}

/* ============ COMPONENT: Flow Demo Line ============ */

function SurveyMini({ type }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: type.color }} />
      <span className="text-xs text-gray-300 font-mono">{type.short}</span>
    </div>
  );
}

/* ============ MAIN PAGE ============ */

export default function MediSegPrototype() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setView] = useState('robot');
  const [mounted, setMounted] = useState(false);
  const [bins, setBins] = useState(
    WASTE_TYPES.map((t) => ({ ...t, litres: 0, weight: 0, items: 0 }))
  );
  const [log, setLog] = useState([]);
  const [collection, setCollection] = useState({ total: 0, weight: 0, accurate: 0, classified: 0 });
  const [scanState, setScanState] = useState(null);
  const [autoRun, setAutoRun] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [robotPos, setRobotPos] = useState(MAP_NODES[0]);
  const [robotMoving, setRobotMoving] = useState(false);
  const [battery, setBattery] = useState(94);
  const [alert, setAlert] = useState(null);
  const [activeBin, setActiveBin] = useState(null);
  const [stats, setStats] = useState({ bins: 22, roomsCovered: 7, trips: 0, oee: 0.96 });

  const robotTimer = useRef(null);
  const autoTimer = useRef(null);

  const flash = useCallback((msg, kind = 'info') => {
    setAlert({ msg, kind, t: Date.now() });
    if (kind === 'danger') {
      // drop battery on errors
      setBattery((b) => Math.max(12, b - rnd(0.2, 0.6)));
    }
  }, []);

  /* ---- robot navigation ---- */
  useEffect(() => {
    if (!robotMoving) return;
    let step = 0;
    robotTimer.current = setInterval(() => {
      setBattery((b) => Math.max(10, b - 0.02 * speed));
      step += 1;
      const node = MAP_NODES[step % MAP_NODES.length];
      setRobotPos(node);
      setActiveBin(node);
      if (step % MAP_NODES.length === 0) {
        setStats((s) => ({ ...s, trips: s.trips + 1 }));
      }
    }, 1400 / speed);
    return () => clearInterval(robotTimer.current);
  }, [robotMoving, speed]);

  /* ---- auto collection ---- */
  useEffect(() => {
    if (!autoRun) return;
    autoTimer.current = setInterval(() => runScan(), 2200 / speed);
    return () => clearInterval(autoTimer.current);
  }, [autoRun, speed]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let stored = null;
    try {
      stored = localStorage.getItem('mediseg_user');
    } catch (e) {}
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (e) { setUser(null); }
    }
    setAuthChecked(true);
  }, []);

  const handleLogout = () => {
    try { localStorage.removeItem('mediseg_user'); } catch (e) {}
    setUser(null);
    router.push('/mediseg/login');
  };

  /* ---- AI scan pipeline ---- */
  const runScan = useCallback(
    (waste) => {
      const item = waste || pickRandomWaste();
      const type = WASTE_TYPES.find((t) => t.id === item.type);
      const startBin = collection.total === 0 ? bins : bins;

      const fakeBins = startBin.map((b) => ({ ...b }));
      const target = fakeBins.find((b) => b.id === item.type);

      const confidence = rnd(0.92, 0.985);
      const isAccurate = Math.random() > 0.02; // 98% base accuracy
      const actualBinId = isAccurate ? item.type : 'yellow';

      setScanState({ phase: 'detect', item, t: Date.now(), confidence: 0 });

      setTimeout(() => {
        setScanState({ phase: 'classify', item, t: Date.now(), confidence, type });
      }, 600 / Math.max(speed, 0.4));

      setTimeout(() => {
        const actualBin = fakeBins.find((b) => b.id === actualBinId);
        setScanState({ phase: 'segregate', item, t: Date.now(), confidence, type, target: WASTE_TYPES.find((x) => x.id === actualBinId) });
        flash(`AI classified "${item.label}" as ${item.type.toUpperCase()} (${(confidence * 100).toFixed(1)}%)`, 'success');
      }, 1300 / Math.max(speed, 0.4));

      setTimeout(() => {
        const actualBinObj = fakeBins.find((b) => b.id === actualBinId);
        if (actualBinObj) {
          actualBinObj.litres = Math.min(CAP_LITRES, actualBinObj.litres + item.weight);
          actualBinObj.weight += item.weight;
          actualBinObj.items += 1;
        }
        setBins(fakeBins);
        const entry = {
          id: genId(),
          item: item.label,
          type: item.type,
          typeName: WASTE_TYPES.find((x) => x.id === item.type)?.short,
          binId: actualBinId,
          binName: actualBinObj?.short,
          weight: item.weight,
          time: new Date(),
          source: activeBin?.label || MAP_NODES[Math.floor(Math.random() * MAP_NODES.length)].label,
          operator: 'Autonomous Rover MS-01',
        };
        setLog((l) => [entry, ...l].slice(0, 60));
        setCollection((c) => ({
          total: c.total + 1,
          weight: c.weight + item.weight,
          accurate: c.accurate + (isAccurate ? 1 : 0),
          classified: c.classified + 1,
        }));
        setScanState(null);
      }, 2100 / Math.max(speed, 0.4));
    },
    [bins, collection.total, speed, activeBin, flash]
  );

  const handleManualScan = () => runScan();

  const accuracy = collection.classified
    ? ((collection.accurate / collection.classified) * 100).toFixed(1)
    : '—';

  const totalPct = ((bins.reduce((s, b) => s + b.litres, 0) / CONTAINER) * 100).toFixed(0);
  const totalWeight = (bins.reduce((s, b) => s + b.weight, 0)).toFixed(2);

  const progress = (L) => Math.min(100, (L / CAP_LITRES) * 100);

  return (
    <div className="min-h-screen bg-isro-darker text-gray-100">
      {/* Themed background image */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/mediseg-bg.svg)' }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-isro-darker/70 via-isro-darker/55 to-isro-darker/90" />
      {/* ======= TOP BAR ======= */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-isro-darker/90 backdrop-blur-xl">
        <div className="max-w-[1500px] mx-auto px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-emerald-500/20">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm tracking-tight">MEDISEG · Autonomous Rover MS-01</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono">ONLINE</span>
              </div>
              <p className="text-[11px] text-gray-500 font-mono">Battery-Electric · AI Vision Nav · SIH 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              WiFi Link
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-gray-400">🔋 BAT</span>
              <span className="font-mono text-emerald-300">{battery.toFixed(0)}%</span>
              <div className="w-12 h-1.5 bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all" style={{ width: `${battery}%` }} />
              </div>
            </div>
            <Link href="/mediseg/presentation" className="text-xs text-gray-400 hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5">
              View Concept Deck
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                {user?.name?.charAt(0) || 'U'}
              </span>
              <span className="text-gray-300 max-w-[120px] truncate">{user?.name || 'User'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-300 transition-colors border border-white/10 px-3 py-1.5 rounded-lg hover:bg-red-500/10"
            >
              Logout
            </button>
            <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors">← Home</Link>
          </div>
        </div>
      </header>

      {/* ======= ALERT ======= */}
      {alert && (
        <div key={alert.t} className={`sticky top-[60px] z-50 mx-auto max-w-3xl mt-2 px-4 py-2 rounded-xl text-xs font-mono backdrop-blur-xl border ${
          alert.kind === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
          alert.kind === 'danger' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
          'bg-isro-blue/20 border-isro-lightblue/30 text-isro-lightblue'
        }`}>
          {alert.msg}
        </div>
      )}

      <div className="relative z-10 max-w-[1500px] mx-auto px-5 py-5 flex gap-5">
        {/* ======= SIDEBAR ======= */}
        <nav className="w-48 shrink-0 space-y-1">
          {[
            { id: 'robot', label: 'Robot View', icon: '🤖' },
            { id: 'scan', label: 'AI Scanner', icon: '🔍' },
            { id: 'seg', label: 'Segregation', icon: '🗂️' },
            { id: 'track', label: 'Tracking', icon: '📡' },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                view === v.id
                  ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 border border-teal-400/30 text-teal-300'
                  : 'text-gray-400 hover:bg-white/5 border border-transparent'
              }`}
            >
              <span>{v.icon}</span> {v.label}
            </button>
          ))}

          <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
            <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest px-4">Live Stats</div>
            <div className="px-4 text-xs space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Items</span><span className="font-mono text-white">{collection.total}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Weight</span><span className="font-mono text-white">{totalWeight} kg</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Accuracy</span><span className="font-mono text-emerald-300">{accuracy}%</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Capacity</span><span className="font-mono text-white">{totalPct}%</span></div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 space-y-3">
            <div className="px-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">Simulation</div>
            <div className="px-4 space-y-3">
              <button
                onClick={handleManualScan}
                disabled={!!scanState}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                {scanState ? 'Processing…' : '● Generate Waste'}
              </button>
              <button
                onClick={() => setAutoRun((a) => !a)}
                className={`w-full px-4 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
                  autoRun ? 'bg-red-500/15 border-red-500/30 text-red-300' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                {autoRun ? '■ Stop Auto-Run' : '▶ Auto-Collect Toggle'}
              </button>
              <div className="text-xs text-gray-400">Speed: <span className="font-mono text-teal-300">×{speed}</span></div>
              <input
                type="range" min="0.5" max="3" step="0.5" value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-teal-500"
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 px-4 space-y-2 text-[11px] text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Obstacle Sensor OK
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Lidar Mapping Active
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Airborne HEPA Filter
            </div>
          </div>
        </nav>

        {/* ======= MAIN CONTENT ======= */}
        <main className="flex-1 min-w-0 space-y-5">
          {view === 'robot' && (
            <div className="space-y-5">
              {/* Telemetry cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { l: 'Current Location', v: robotPos.label, s: '📍' },
                  { l: 'Waste Compartments', v: `${bins.filter((b) => b.items > 0).length}/5 active`, s: '🗂️' },
                  { l: 'Total Load', v: `${totalWeight} kg`, s: '⚖️' },
                  { l: 'Collection Trips', v: stats.trips, s: '🔄' },
                ].map((c, i) => (
                  <div key={i} className="glass-card rounded-xl p-4">
                    <div className="text-xs text-gray-500 flex items-center gap-2"><span>{c.s}</span>{c.l}</div>
                    <div className="text-lg font-bold text-white mt-1 font-mono">{c.v}</div>
                  </div>
                ))}
              </div>

              {/* Floor plan + robot */}
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-white font-bold text-lg">Hospital Floor — Autonomous Patrol</h2>
                    <p className="text-xs text-gray-500">LiDAR + SLAM | Realtime position tracking</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setRobotMoving((m) => !m)}
                      className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                        robotMoving ? 'bg-red-500/15 text-red-300 border border-red-500/30' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {robotMoving ? '⏸ Pause Route' : '▶ Start Route'}
                    </button>
                    <button onClick={() => setBattery((b) => Math.min(100, b + 40))} className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-all">
                      ⚡ Recharge
                    </button>
                  </div>
                </div>

                <svg viewBox="0 0 100 100" className="w-full h-auto rounded-xl border border-white/5 bg-isro-dark/40" style={{ maxHeight: 420 }}>
                  {/* grid */}
                  {[...Array(10)].map((_, i) => (
                    <line key={'v' + i} x1={i * 10} y1={0} x2={i * 10} y2={100} stroke="rgba(45,212,191,0.05)" />
                  ))}
                  {[...Array(10)].map((_, i) => (
                    <line key={'h' + i} x1={0} y1={i * 10} x2={100} y2={i * 10} stroke="rgba(45,212,191,0.05)" />
                  ))}

                  {/* corridors */}
                  <rect x="10" y="26" width="80" height="6" rx="1" fill="rgba(45,212,191,0.12)" />
                  <rect x="10" y="66" width="80" height="6" rx="1" fill="rgba(45,212,191,0.12)" />
                  <rect x="30" y="16" width="6" height="70" rx="1" fill="rgba(45,212,191,0.12)" />
                  <rect x="55" y="16" width="6" height="70" rx="1" fill="rgba(45,212,191,0.12)" />

                  {/* room nodes */}
                  {MAP_NODES.map((n) => (
                    <g key={n.id}>
                      <rect
                        x={n.x - 9} y={n.y - 9} width="18" height="18" rx="3"
                        fill={robotPos.id === n.id ? 'rgba(45,212,191,0.15)' : 'rgba(17,24,39,0.9)'}
                        stroke={robotPos.id === n.id ? '#2dd4bf' : 'rgba(255,255,255,0.15)'}
                        strokeWidth="0.5"
                      />
                      <text x={n.x} y={n.y - 13} textAnchor="middle" fontSize="2.6" fill="#94a3b8" fontFamily="monospace">
                        {n.label}
                      </text>
                      <circle cx={n.x} cy={n.y} r="1.1" fill={robotPos.id === n.id ? '#2dd4bf' : '#475569'}>
                        {robotPos.id === n.id && <animate attributeName="r" values="1;2.4;1" dur="1.4s" repeatCount="indefinite" />}
                      </circle>
                    </g>
                  ))}

                  {/* robot */}
                  <g transform={`translate(${robotPos.x}, ${robotPos.y})`}>
                    <rect x="-2.6" y="-3.2" width="5.2" height="6.4" rx="1.2" fill="#0f766e" stroke="#2dd4bf" strokeWidth="0.3">
                      <animateTransform attributeName="transform" type="translate" values="-0.4,-0.4;0.4,0.4;-0.4,-0.4" dur="1.6s" repeatCount="indefinite" />
                    </rect>
                    <circle cx="0" cy="-4.6" r="0.8" fill="#fbbf24">
                      <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <text y="-8" textAnchor="middle" fontSize="2.2" fill="#2dd4bf" fontFamily="monospace">ROV-MS1</text>
                  </g>
                </svg>

                {/* route status row */}
                <div className="flex items-center justify-between mt-4 text-xs text-gray-500 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Telemetry stream live · {robotPos.label} · Lidar scan 20Hz
                  </div>
                  <div className="font-mono text-teal-300">{robotMoving ? 'NAVIGATING…' : 'STANDBY'}</div>
                </div>
              </div>

              {/* Compartment live fill (bottom of robot view) */}
              <div className="grid grid-cols-5 gap-3">
                {bins.map((b) => (
                  <div key={b.id} className="glass-card rounded-xl p-3 text-center">
                    <div className="text-xl mb-1">{b.emoji}</div>
                    <div className="w-full h-16 bg-black/30 rounded-lg overflow-hidden relative border border-white/5">
                      <div
                        className="absolute bottom-0 left-0 right-0 transition-all duration-700 rounded-b-lg"
                        style={{ height: `${progress(b.litres)}%`, background: b.color, opacity: 0.55 }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color: b.color === '#e2e8f0' ? '#334155' : b.color }}>
                        {b.items}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] font-mono text-gray-400">{b.short}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'scan' && (
            <div className="space-y-5">
              <div className="grid lg:grid-cols-2 gap-5">
                {/* AI scanner */}
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-white font-bold text-lg">AI Vision Classifier</h2>
                      <p className="text-xs text-gray-500">YOLOv8 · Object detection → CNN classification</p>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono">INTEGRITY 98%</span>
                  </div>

                  {/* scan viewport */}
                  <div className="rounded-xl border-2 border-dashed border-white/10 bg-black/40 p-4 min-h-[220px] flex items-center justify-center relative overflow-hidden">
                    {!scanState && (
                      <div className="w-full text-center">
                        <div className="relative inline-block mb-3">
                          <div className="text-5xl">📷</div>
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse border-2 border-black/40" />
                        </div>
                        <p className="text-sm font-medium text-gray-300">Camera Live — Awaiting Waste Intake</p>
                        <p className="text-[10px] font-mono text-gray-500 mt-1">Feed paused · Press "Generate Waste" or enable Auto-Collect</p>
                        <button
                          onClick={handleManualScan}
                          disabled={!!scanState}
                          className="mt-4 px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                        >
                          ▶ Generate Waste Now
                        </button>
                      </div>
                    )}

                    {scanState?.phase === 'detect' && (
                      <div className="relative border border-teal-400/50 rounded-lg p-10 bg-gradient-to-br from-teal-500/10 to-emerald-500/5">
                        <div className="absolute inset-0 border-2 border-teal-400 scan-pulse" />
                        <div className="text-5xl mb-3 text-center">{scanState.item.label.includes('Syringe') || scanState.item.label.includes('Scalpel') || scanState.item.label.includes('Pen') ? '🩸' : scanState.item.emoji || '🧴'}</div>
                        <div className="flex items-center justify-center gap-2 text-teal-300 text-sm font-mono">
                          <span className="inline-block w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                          Detecting object…
                        </div>
                        <div className="absolute top-1 left-1 w-6 h-6 border-t-2 border-l-2 border-teal-400" />
                        <div className="absolute top-1 right-1 w-6 h-6 border-t-2 border-r-2 border-teal-400" />
                        <div className="absolute bottom-1 left-1 w-6 h-6 border-b-2 border-l-2 border-teal-400" />
                        <div className="absolute bottom-1 right-1 w-6 h-6 border-b-2 border-r-2 border-teal-400" />
                      </div>
                    )}

                    {scanState?.phase === 'classify' && (
                      <div className="w-full">
                        <div className="text-center text-white font-bold mb-4">{scanState.item.label}</div>
                        <div className="space-y-2">
                          {WASTE_TYPES.slice().sort((a, b) =>
                            (a.id === scanState.item.type ? 0 : 1) - (b.id === scanState.item.type ? 0 : 1)
                          ).map((t, i) => {
                            const isTrue = t.id === scanState.item.type;
                            const conf = isTrue ? scanState.confidence : scanState.confidence * rnd(0.2, 0.6);
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-isro-darker flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="inline-block w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-mono">Verifying access…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-isro-darker flex items-center justify-center relative overflow-hidden px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 glass-card rounded-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-3xl mb-5 shadow-xl shadow-emerald-500/25">
            🤖
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            You must be signed in to operate the MediSeg autonomous rover and access
            the live segregation dashboard.
          </p>
          <button
            onClick={() => router.push('/mediseg/login')}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-teal-500/25"
          >
            Sign In to Continue
          </button>
          <Link href="/mediseg/intro" className="block mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors">
            ← Back to Intro
          </Link>
        </div>
      </div>
    );
  }

  return (
                              <div key={t.id}>
                                <div className="flex justify-between text-xs mb-0.5 font-mono">
                                  <span style={{ color: t.color }}>{t.short} {isTrue ? '✓' : ''}</span>
                                  <span className={isTrue ? 'text-emerald-300' : 'text-gray-500'}>{isTrue ? '99.' : ''}{(conf * 100).toFixed(1).padStart(5, ' ')}%</span>
                                </div>
                                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${isTrue ? 'bg-emerald-400' : 'bg-gray-600'}`}
                                    style={{ width: `${conf * 100}%`, transition: `width ${0.3 + i * 0.2}s ease-out` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-center text-xs text-teal-300 font-mono mt-3 animate-pulse">CLASSIFYING…</div>
                      </div>
                    )}

                    {scanState?.phase === 'segregate' && (
                      <div className="text-center">
                        <div className="text-3xl animate-bounce mb-2">🤖🦾</div>
                        <p className="text-white font-bold mb-1">Routing to {scanState.target.short} compartment</p>
                        <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-full border" style={{ borderColor: scanState.target.color + '66', background: scanState.target.color + '22' }}>
                          <span className="w-3 h-3 rounded-full" style={{ background: scanState.target.color }} />
                          <span className="text-xs font-mono" style={{ color: scanState.target.color }}>{scanState.target.name}</span>
                        </div>
                        <div className="mt-3 flex justify-center gap-1">
                          {[0,1,2,3,4].map((i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400" style={{ animation: `float ${0.9}s ${i * 0.15}s infinite` }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Last classified / waste catalogue */}
                <div className="space-y-5">
                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-white font-bold text-lg mb-4">📦 Waste Catalogue</h3>
                    <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto scrollbar-thin">
                      {WASTE_ITEMS.map((w, i) => {
                        const t = WASTE_TYPES.find((x) => x.id === w.type);
                        return (
                          <button
                            key={i}
                            onClick={() => runScan(w)}
                            disabled={!!scanState}
                            className="text-left px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-teal-400/40 hover:bg-teal-400/5 transition-all disabled:opacity-50"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-300">{w.label}</span>
                              <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                            </div>
                            <div className="text-[10px] text-gray-600 mt-0.5 font-mono">{t.short} · {w.weight.toFixed(2)} kg</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-white font-bold text-lg mb-3">Model Output — Traceability</h3>
                    {log[0] ? (
                      <div className="text-xs font-mono space-y-2 text-gray-400">
                        <div className="flex justify-between"><span>Batch ID</span><span className="text-teal-300">{log[0].id}</span></div>
                        <div className="flex justify-between"><span>Source</span><span>{log[0].source}</span></div>
                        <div className="flex justify-between"><span>Operator</span><span>{log[0].operator}</span></div>
                        <div className="flex justify-between"><span>Segregated →</span><span style={{ color: bins.find((b) => b.id === log[0].binId)?.color }}>{log[0].binName}</span></div>
                        <div className="flex justify-between"><span>Timestamp</span><span>{log[0].time.toLocaleTimeString()}</span></div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 font-mono">Waiting for first classification…</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'seg' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-white font-bold text-lg">Segregation Compartments</h2>
                  <p className="text-xs text-gray-500">5 color-coded compartments per BMWM Rules 2018</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Total capacity</span>
                  <span className="font-mono text-teal-300">{totalPct}% / {CONTAINER}L</span>
                  <span className="w-24 h-2 bg-black/40 rounded-full overflow-hidden">
                    <span className="block h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-700" style={{ width: `${totalPct}%` }} />
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {bins.map((b) => {
                  const p = progress(b.litres);
                  const capLeft = (CAP_LITRES - b.litres).toFixed(2);
                  return (
                    <div key={b.id} className="glass-card rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: b.color }} />
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: b.color + '22', border: `1px solid ${b.color}44` }}>
                            {b.emoji}
                          </div>
                          <div>
                            <h3 className="text-white text-sm font-bold">{b.short}</h3>
                            <p className="text-[10px] text-gray-500">{b.name}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-1 rounded-md uppercase tracking-widest" style={{ background: b.color + '22', color: b.color }}>
                          {b.litres.toFixed(1)}L
                        </span>
                      </div>

                      <div className="h-24 bg-black/30 rounded-xl relative overflow-hidden border border-white/5">
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-b-xl transition-all duration-700"
                          style={{ height: `${p}%`, background: `linear-gradient(to top, ${b.color}dd, ${b.color}66)` }}
                        />
                        {p > 80 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white bg-red-500/80 px-2 py-0.5 rounded animate-pulse">NEAR FULL</span>
                          </div>
                        )}
                        <span className="absolute bottom-2 left-3 text-[10px] font-mono text-white/80">{b.items} items · {b.weight.toFixed(2)} kg</span>
                      </div>

                      <div className="mt-3 flex justify-between items-center text-[11px] text-gray-500 font-mono">
                        <span>⬇ {Math.max(0, capLeft)}L remain</span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Disposer Ready
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* dispenser / status card */}
                <div className="glass-card rounded-2xl p-5 border border-dashed border-teal-400/30 bg-teal-400/[0.04] flex flex-col items-center justify-center text-center">
                  <div className="text-4xl mb-2">⚙️</div>
                  <h3 className="text-white font-bold text-sm">Robotic Dispenser</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-[220px]">
                    Rotating carousel directs each classified item into its colour-matched compartment with zero contact.
                  </p>
                  <div className="mt-4 flex gap-2">
                    {bins.map((b) => (
                      <span key={b.id} className="w-4 h-4 rounded-md" style={{ background: b.color + '88' }} title={b.short} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'track' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { l: 'Items Collected', v: collection.total, s: '🗃️' },
                  { l: 'Total Weight', v: totalWeight + ' kg', s: '⚖️' },
                  { l: 'AI Accuracy', v: accuracy + '%', s: '🎯' },
                  { l: 'Compliance Logs', v: log.length, s: '📜' },
                ].map((c, i) => (
                  <div key={i} className="glass-card rounded-xl p-4">
                    <div className="text-xs text-gray-500"><span className="mr-2">{c.s}</span>{c.l}</div>
                    <div className="text-2xl font-bold text-white font-mono mt-1">{c.v}</div>
                  </div>
                ))}
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-bold text-lg">End-to-End Traceability Ledger</h2>
                  <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    {log.some((e) => true) ? 'LIVE SYNC' : 'AWAITING DATA'}
                  </span>
                </div>

                {log.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <div className="text-4xl mb-3">📡</div>
                    <p className="text-sm">No collection events yet — run the AI scanner to populate the ledger.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-gray-500 font-mono text-[10px] uppercase tracking-widest border-b border-white/5">
                          <th className="py-2 pr-4">Batch ID</th>
                          <th className="py-2 pr-4">Item</th>
                          <th className="py-2 pr-4">Classified</th>
                          <th className="py-2 pr-4">→ Compartment</th>
                          <th className="py-2 pr-4">Weight</th>
                          <th className="py-2 pr-4">Source</th>
                          <th className="py-2 pr-4">Operator</th>
                          <th className="py-2">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {log.slice(0, 14).map((e) => {
                          const bin = bins.find((b) => b.id === e.binId);
                          const isCorrect = e.binId === e.type;
                          return (
                            <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="py-2 pr-4 font-mono text-teal-300">{e.id}</td>
                              <td className="py-2 pr-4 text-gray-300">{e.item}</td>
                              <td className="py-2 pr-4">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: (bins.find((x) => x.id === e.type)?.color || '#888') + '22', color: bins.find((x) => x.id === e.type)?.color || '#888' }}>
                                  <SurveyMini type={bins.find((x) => x.id === e.type) || WASTE_TYPES[0]} />
                                </span>
                              </td>
                              <td className="py-2 pr-4">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: bin.color + '22', color: bin.color }}>
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: bin.color }} />
                                  {bin.short}
                                </span>
                              </td>
                              <td className="py-2 pr-4 font-mono text-gray-400">{e.weight.toFixed(2)} kg</td>
                              <td className="py-2 pr-4 text-gray-400">{e.source}</td>
                              <td className="py-2 pr-4 text-gray-500">{e.operator}</td>
                              <td className="py-2 text-gray-500 font-mono">{e.time.toLocaleTimeString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-3">Compliance Report (BMWM Rules 2018)</h2>
                <div className="grid md:grid-cols-3 gap-4 text-xs">
                  {[
                    { title: 'Segregation at Source', ok: collection.classified > 0, desc: 'AI-verified classification before disposal routing' },
                    { title: 'Colour-Coded Bags', ok: true, desc: 'Yellow / Red / White / Blue / Black compartments' },
                    { title: 'Digital Manifest', ok: collection.total > 0, desc: 'Formatter-ready manifest export for CPCB portal' },
                    { title: 'Tracking to Treatment', ok: true, desc: 'Dock-to-treatment chain recorded per batch' },
                    { title: 'No Manual Contact', ok: collection.total > 0, desc: 'Zero-touch autonomous handling pipeline' },
                    { title: 'Decontamination', ok: true, desc: 'HEPA-filtered internal airflow; UV decontamination cycle' },
                  ].map((c, i) => (
                    <div key={i} className={`rounded-xl p-4 border ${c.ok ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-white/10'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300 font-semibold">{c.title}</span>
                        <span className={`text-lg ${c.ok ? 'text-emerald-400' : 'text-gray-600'}`}>{c.ok ? '✓' : '◦'}</span>
                      </div>
                      <p className="text-gray-500 leading-relaxed">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* footer */}
      <footer className="relative z-10 border-t border-white/5 py-5 mt-8">
        <div className="max-w-[1500px] mx-auto px-5 flex items-center justify-between text-[11px] text-gray-600 flex-wrap gap-2">
          <span>MediSeg Prototype · AI-Powered Biomedical Waste Segregation · SIH 2026 · Autodesk Problem</span>
          <span className="font-mono">Fusion-ready · prototype.js {mounted ? '●' : '○'}</span>
        </div>
      </footer>

      <style jsx global>{`
        .scan-pulse { animation: scanPulse 1.2s ease-in-out infinite; }
        @keyframes scanPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}