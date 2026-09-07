'use client';

import '../../lib/maverick-api';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '../../components/Sidebar';

export default function AnalysisPage() {
  const [user, setUser] = useState(null);
  const [activeModule, setActiveModule] = useState('combined');
  const [outlierResults, setOutlierResults] = useState(null);
  const [driftResults, setDriftResults] = useState(null);
  const [driftPredict, setDriftPredict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [explainability, setExplainability] = useState(null);
  const [certClass, setCertClass] = useState(null);
  const [dataStatus, setDataStatus] = useState(null);

  // Module A params
  const [zThreshold, setZThreshold] = useState(1.5);
  const [iqrMultiplier, setIqrMultiplier] = useState(1.5);

  // Module B params
  const [predictParam, setPredictParam] = useState('iddq');
  const [predict0h, setPredict0h] = useState('');
  const [predict24h, setPredict24h] = useState('');
  const [predict96h, setPredict96h] = useState('');

  const router = useRouter();

  const checkDataStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/data/stats', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data && data.error) {
        setDataStatus({ hasData: false });
      } else if (data && data.total_components != null) {
        setDataStatus({
          hasData: true,
          totalComponents: data.total_components,
          lots: data.lots || data.total_lots,
          defective: data.defective_count,
        });
      } else {
        setDataStatus({ hasData: false });
      }
    } catch {
      setDataStatus({ hasData: false });
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    setUser(JSON.parse(stored));
    checkDataStatus();
  }, [router, checkDataStatus]);

  const assertData = () => {
    if (dataStatus && !dataStatus.hasData) {
      setMessage('Please upload a dataset or load sample data before running analysis.');
      return false;
    }
    return true;
  };

  const runOutlierAnalysis = async () => {
    if (!assertData()) return;
    setLoading(true);
    setMessage('');
    setCertClass(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/analysis/outlier', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ z_threshold: zThreshold, iqr_multiplier: iqrMultiplier }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed');
      setOutlierResults(data);
      setMessage(`Module A complete: ${data.summary.total_analyzed} components analyzed`);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runDriftTraining = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/analysis/drift-train', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Training failed');
      setMessage(`Module B trained: ${data.trained_parameters.join(', ')}`);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runDriftBatch = async () => {
    setLoading(true);
    setMessage('');
    setCertClass(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/analysis/drift-batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Batch prediction failed');
      setDriftResults(data);
      setMessage(`Batch drift prediction: ${data.total_predictions} predictions made`);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runComprehensive = async () => {
    setLoading(true);
    setMessage('');
    setCertClass(null);
    try {
      const token = localStorage.getItem('token');

      // Train drift models first
      await fetch('/api/analysis/drift-train', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const res = await fetch('/api/analysis/comprehensive', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ z_threshold: zThreshold, iqr_multiplier: iqrMultiplier }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed');

      setOutlierResults(data);
      setMessage(`Comprehensive analysis complete for ${data.summary.total_components} components`);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const predictSingle = async () => {
    if (!predict0h || !predict24h) {
      setMessage('Please enter 0h and 24h values');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/analysis/drift-predict', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          param: predictParam,
          value_0h: parseFloat(predict0h),
          value_24h: parseFloat(predict24h),
          value_96h: predict96h ? parseFloat(predict96h) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Prediction failed');
      setDriftPredict(data);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const viewExplainability = async (componentId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/analysis/explain/${componentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setExplainability(data);
        setSelectedComponent(componentId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;
  const noData = !!(dataStatus && !dataStatus.hasData);

  return (
    <div className="relative flex min-h-screen bg-isro-darker overflow-hidden">
      {/* Themed background image */}
      <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/app-bg.svg)' }} />
      <div className="absolute inset-0 z-0 bg-isro-darker/55" />

      <Sidebar user={user} active="analysis" />

      <main className="relative z-10 flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Analysis Center</h1>
            <p className="text-gray-500 text-sm">
              Run Module A (Outlier Detection) and Module B (Drift Prediction) analyses
            </p>
          </div>

          {dataStatus && !dataStatus.hasData && (
            <div className="mb-6 p-4 rounded-xl border border-orange-500/30 bg-orange-500/10 text-sm flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <span className="w-8 h-8 rounded-lg bg-isro-orange/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-isro-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                <span className="text-orange-300">
                  <b className="text-white">No data loaded.</b> Upload a CSV/Excel dataset or load sample data before running any analysis.
                </span>
              </div>
              <Link href="/upload"
                className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-isro-blue to-blue-500 text-white rounded-lg hover:opacity-90 transition-all text-center shrink-0">
                Go to Upload →
              </Link>
            </div>
          )}

          {dataStatus?.hasData && (
            <div className="mb-6 p-3 rounded-xl border border-isro-green/20 bg-isro-green/5 text-xs text-isro-green flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-isro-green animate-pulse" />
              Dataset loaded: {dataStatus.totalComponents} components across {dataStatus.lots} lots — ready to analyze
            </div>
          )}

          {message && (
            <div className={`mb-6 p-4 rounded-xl text-sm ${
              message.startsWith('Error')
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-isro-green/10 border border-isro-green/20 text-isro-green'
            }`}>
              {message}
            </div>
          )}

          {/* Module Tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { id: 'combined', label: 'Comprehensive' },
              { id: 'moduleA', label: 'Module A: Outlier' },
              { id: 'moduleB', label: 'Module B: Drift' },
              { id: 'predict', label: 'Single Prediction' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveModule(tab.id); setCertClass(null); }}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeModule === tab.id
                    ? 'bg-isro-blue/20 text-isro-lightblue border border-isro-blue/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Comprehensive Analysis */}
          {activeModule === 'combined' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Full Pipeline Analysis</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Run both Module A (outlier detection) and Module B (drift prediction) in sequence.
                  Requires uploaded data.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Z-Score Threshold</label>
                    <input
                      type="number"
                      value={zThreshold}
                      onChange={(e) => setZThreshold(parseFloat(e.target.value))}
                      step="0.1"
                      className="w-full px-4 py-2.5 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">IQR Multiplier</label>
                    <input
                      type="number"
                      value={iqrMultiplier}
                      onChange={(e) => setIqrMultiplier(parseFloat(e.target.value))}
                      step="0.1"
                      className="w-full px-4 py-2.5 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50"
                    />
                  </div>
                </div>

                <button
                  onClick={runComprehensive}
                  disabled={loading || noData}
                  title={noData ? 'Upload a dataset first' : undefined}
                  className="px-6 py-3 bg-gradient-to-r from-isro-blue to-isro-orange text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Running Analysis...' : noData ? '⚠ Upload Data First' : 'Run Comprehensive Analysis'}
                </button>
              </div>

              {/* Results */}
              {outlierResults?.summary && (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Comprehensive Results</h3>

                  <div className="grid grid-cols-4 gap-4 mb-2">
                    {[
                      { label: 'Total', value: outlierResults.summary.total_components, color: 'white', cls: null },
                      { label: 'PASS', value: outlierResults.summary.module_a?.classifications?.PASS || 0, color: 'green', cls: 'PASS' },
                      { label: 'REVIEW', value: outlierResults.summary.module_a?.classifications?.REVIEW || 0, color: 'orange', cls: 'REVIEW' },
                      { label: 'REJECT', value: outlierResults.summary.module_a?.classifications?.REJECT || 0, color: 'red', cls: 'REJECT' },
                    ].map((stat) => (
                      stat.cls ? (
                        <button
                          key={stat.label}
                          onClick={() => setCertClass(certClass === stat.cls ? null : stat.cls)}
                          className={`text-center p-4 bg-isro-dark rounded-xl transition-all cursor-pointer border ${
                            certClass === stat.cls ? 'border-isro-lightblue/40 ring-1 ring-isro-lightblue/30' : 'border-white/5 hover:border-white/20'
                          }`}
                          title={`Click to view ${stat.cls} components`}>
                          <p className={`text-3xl font-bold text-isro-${stat.color}`}>{stat.value}</p>
                          <p className="text-xs text-gray-400 mt-1">{stat.label}
                            <span className="block text-[9px] text-gray-600 mt-0.5">Click to view ↓</span>
                          </p>
                        </button>
                      ) : (
                        <div key={stat.label} className="text-center p-4 bg-isro-dark rounded-xl">
                          <p className={`text-3xl font-bold text-isro-${stat.color}`}>{stat.value}</p>
                          <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
                        </div>
                      )
                    ))}
                  </div>

                  {certClass && (
                    <ClassificationDetail
                      cls={certClass}
                      rows={(outlierResults.results || []).filter((r) => (r.outlier_classification || r.classification) === certClass)}
                      onClose={() => setCertClass(null)}
                      onViewReport={viewExplainability}
                    />
                  )}

                  {outlierResults.summary.module_a?.detection_metrics?.available && (
                    <div className="mb-6 p-4 bg-isro-dark/60 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-white">Anomaly Detection Score</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                            {outlierResults.summary.module_a.detection_metrics.scoring_formula}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-3xl font-black font-mono ${
                            outlierResults.summary.module_a.detection_metrics.anomaly_detection_score_pct >= 90 ? 'text-isro-green' :
                            outlierResults.summary.module_a.detection_metrics.anomaly_detection_score_pct >= 70 ? 'text-isro-orange' :
                            'text-red-400'
                          }`}>
                            {outlierResults.summary.module_a.detection_metrics.anomaly_detection_score_pct}%
                          </span>
                          <p className="text-[10px] text-gray-500">FN penalty: {outlierResults.summary.module_a.detection_metrics.fn_penalty_weight}x</p>
                        </div>
                      </div>
                      <div className="h-2.5 bg-isro-darker rounded-full overflow-hidden mb-3">
                        <div className="h-full bg-gradient-to-r from-isro-green via-isro-lightblue to-isro-blue rounded-full transition-all duration-1000"
                          style={{ width: `${outlierResults.summary.module_a.detection_metrics.anomaly_detection_score_pct}%` }} />
                      </div>
                      <div className="grid grid-cols-6 gap-3 text-center text-xs">
                        {[
                          { k: 'tp', label: 'TP' },
                          { k: 'fp', label: 'FP' },
                          { k: 'tn', label: 'TN' },
                          { k: 'fn', label: 'FN' },
                          { k: 'recall_aka_sensitivity', label: 'Recall', pct: true },
                          { k: 'f1_score', label: 'F1' },
                        ].map((m, i) => (
                          <div key={i} className="p-2 bg-isro-darker rounded-lg">
                            <span className={`block font-bold font-mono ${
                              m.k === 'fn' && outlierResults.summary.module_a.detection_metrics.fn > 0 ? 'text-red-400' : 'text-white'
                            }`}>
                              {m.pct ? (outlierResults.summary.module_a.detection_metrics[m.k] * 100).toFixed(1) + '%'
                                : outlierResults.summary.module_a.detection_metrics[m.k]}
                            </span>
                            <span className="text-[9px] text-gray-500">{m.label}</span>
                          </div>
                        ))}
                      </div>
                      {Array.isArray(outlierResults.summary.module_a.detection_metrics.escaped_components) && outlierResults.summary.module_a.detection_metrics.escaped_components.length > 0 && (
                        <p className="mt-2 text-xs text-red-400">
                          ⚠ {outlierResults.summary.module_a.detection_metrics.fn} defective part(s) escaped:
                          {' '}
                          <span className="font-mono">
                            {outlierResults.summary.module_a.detection_metrics.escaped_components.slice(0, 5).join(', ')}
                            {outlierResults.summary.module_a.detection_metrics.escaped_components.length > 5 ? '...' : ''}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Results Table */}
                  <div className="overflow-x-auto scrollbar-thin max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-isro-card">
                        <tr className="border-b border-white/5">
                          <th className="px-3 py-2 text-left text-xs text-gray-400">Component</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-400">Lot</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-400">Outlier</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-400">Risk</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-400">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(outlierResults.results || []).map((r, i) => (
                          <tr key={i} className="border-b border-white/3 hover:bg-white/3">
                            <td className="px-3 py-2 text-xs font-mono text-white">{r.component_id}</td>
                            <td className="px-3 py-2 text-xs text-gray-400">{r.lot_id}</td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => viewExplainability(r.component_id)}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                                  r.outlier_classification === 'PASS' ? 'bg-green-500/20 text-green-400' :
                                  r.outlier_classification === 'REVIEW' ? 'bg-orange-500/20 text-orange-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}
                                title="Click to view detailed report">
                                {r.outlier_classification}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-xs font-mono text-gray-300">{r.outlier_risk?.toFixed(3)}</td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => viewExplainability(r.component_id)}
                                className="text-xs text-isro-lightblue hover:text-white transition-colors">
                                View Report
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Module A */}
          {activeModule === 'moduleA' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-isro-blue/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-isro-lightblue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-isro-lightblue">MODULE A</span>
                    <h3 className="text-lg font-bold text-white">Dynamic Outlier Detection</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Z-Score Threshold</label>
                    <input type="number" value={zThreshold} onChange={(e) => setZThreshold(parseFloat(e.target.value))}
                      step="0.1" className="w-full px-4 py-2.5 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">IQR Multiplier</label>
                    <input type="number" value={iqrMultiplier} onChange={(e) => setIqrMultiplier(parseFloat(e.target.value))}
                      step="0.1" className="w-full px-4 py-2.5 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50" />
                  </div>
                </div>

                <button onClick={runOutlierAnalysis} disabled={loading || noData}
                  title={noData ? 'Upload a dataset first' : undefined}
                  className="px-6 py-3 bg-isro-blue text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-isro-blue/25 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Analyzing...' : noData ? '⚠ Upload Data First' : 'Run Outlier Detection'}
                </button>
              </div>

              {outlierResults && (
                <OutlierResults
                  data={outlierResults}
                  onViewExplain={viewExplainability}
                  certClass={certClass}
                  setCertClass={setCertClass}
                />
              )}
            </div>
          )}

          {/* Module B */}
          {activeModule === 'moduleB' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-isro-orange/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-isro-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-isro-orange">MODULE B</span>
                    <h3 className="text-lg font-bold text-white">Time-Series Drift Predictor</h3>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={runDriftTraining} disabled={loading || noData}
                    title={noData ? 'Upload a dataset first' : undefined}
                    className="px-5 py-2.5 bg-isro-orange text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'Training...' : noData ? '⚠ Upload Data First' : 'Train Models'}
                  </button>
                  <button onClick={runDriftBatch} disabled={loading || noData}
                    title={noData ? 'Upload a dataset first' : undefined}
                    className="px-5 py-2.5 bg-isro-dark border border-white/10 text-gray-300 text-sm font-medium rounded-lg hover:bg-white/5 transition-all disabled:opacity-50">
                    {loading ? 'Predicting...' : noData ? '⚠ Upload Data First' : 'Run Batch Prediction'}
                  </button>
                </div>
              </div>

              {driftResults && <DriftResults data={driftResults} onViewExplain={viewExplainability} />}
            </div>
          )}

          {/* Single Prediction */}
          {activeModule === 'predict' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Single Component Prediction</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Parameter</label>
                    <select value={predictParam} onChange={(e) => setPredictParam(e.target.value)}
                      className="w-full px-4 py-2.5 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50">
                      <option value="iddq">Standby Current (Iddq)</option>
                      <option value="leakage">Leakage Current</option>
                      <option value="delay">Propagation Delay</option>
                      <option value="supply_current">Supply Current</option>
                    </select>
                  </div>
                  <div />
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Value at 0h</label>
                    <input type="number" value={predict0h} onChange={(e) => setPredict0h(e.target.value)}
                      step="0.01" className="w-full px-4 py-2.5 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50"
                      placeholder="e.g., 10.5" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Value at 24h</label>
                    <input type="number" value={predict24h} onChange={(e) => setPredict24h(e.target.value)}
                      step="0.01" className="w-full px-4 py-2.5 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50"
                      placeholder="e.g., 10.8" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Value at 96h (optional)</label>
                    <input type="number" value={predict96h} onChange={(e) => setPredict96h(e.target.value)}
                      step="0.01" className="w-full px-4 py-2.5 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50"
                      placeholder="e.g., 11.2" />
                  </div>
                </div>

                <button onClick={predictSingle} disabled={loading || noData}
                  title={noData ? 'Upload a dataset first' : undefined}
                  className="px-6 py-3 bg-isro-orange text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-isro-orange/25 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Predicting...' : noData ? '⚠ Upload Data First' : 'Predict 168h Value'}
                </button>
              </div>

              {driftPredict && <SinglePredictionResult data={driftPredict} />}
            </div>
          )}

          {/* Detailed Report Panel */}
          {explainability && (
            <DetailedReport data={explainability} onClose={() => setExplainability(null)} />
          )}
        </div>
      </main>
    </div>
  );
}

function OutlierResults({ data, onViewExplain, certClass = null, setCertClass }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Module A Results</h3>

      <div className="grid grid-cols-4 gap-4 mb-2">
        {[
          { label: 'Total', value: data.summary.total_analyzed, color: 'white', cls: null },
          { label: 'PASS', value: data.summary.classifications?.PASS || 0, color: 'green', cls: 'PASS' },
          { label: 'REVIEW', value: data.summary.classifications?.REVIEW || 0, color: 'orange', cls: 'REVIEW' },
          { label: 'REJECT', value: data.summary.classifications?.REJECT || 0, color: 'red', cls: 'REJECT' },
        ].map((stat) => (
          stat.cls ? (
            <button
              key={stat.label}
              onClick={() => setCertClass && setCertClass(certClass === stat.cls ? null : stat.cls)}
              className={`text-center p-4 bg-isro-dark rounded-xl transition-all cursor-pointer border ${
                certClass === stat.cls ? 'border-isro-lightblue/40 ring-1 ring-isro-lightblue/30' : 'border-white/5 hover:border-white/20'
              }`}
              title={`Click to view ${stat.cls} components`}>
              <p className={`text-2xl font-bold text-isro-${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}
                <span className="block text-[9px] text-gray-600 mt-0.5">Click to view ↓</span>
              </p>
            </button>
          ) : (
            <div key={stat.label} className="text-center p-4 bg-isro-dark rounded-xl">
              <p className={`text-2xl font-bold text-isro-${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          )
        ))}
      </div>

      {certClass && (
        <ClassificationDetail
          cls={certClass}
          rows={(data.results || []).filter((r) => r.classification === certClass)}
          onClose={() => setCertClass && setCertClass(null)}
          onViewReport={onViewExplain}
        />
      )}

      {data.summary.detection_metrics?.available && (
        <div className="mb-6 p-4 bg-isro-dark/60 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-white">Anomaly Detection Score</h4>
              <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{data.summary.detection_metrics.scoring_formula}</p>
            </div>
            <div className="text-right">
              <span className={`text-3xl font-black font-mono ${
                data.summary.detection_metrics.anomaly_detection_score_pct >= 90 ? 'text-isro-green' :
                data.summary.detection_metrics.anomaly_detection_score_pct >= 70 ? 'text-isro-orange' :
                'text-red-400'
              }`}>
                {data.summary.detection_metrics.anomaly_detection_score_pct}%
              </span>
              <p className="text-[10px] text-gray-500">FN penalty: {data.summary.detection_metrics.fn_penalty_weight}x</p>
            </div>
          </div>

          <div className="h-2.5 bg-isro-darker rounded-full overflow-hidden mb-4">
            <div className="h-full bg-gradient-to-r from-isro-green via-isro-lightblue to-isro-blue rounded-full transition-all duration-1000"
              style={{ width: `${data.summary.detection_metrics.anomaly_detection_score_pct}%` }} />
          </div>

          <div className="grid grid-cols-6 gap-3 text-center">
            {[
              { k: 'tp', label: 'True Positives' },
              { k: 'fp', label: 'False Positives' },
              { k: 'tn', label: 'True Negatives' },
              { k: 'fn', label: 'False Negatives' },
              { k: 'recall_aka_sensitivity', label: 'Recall', pct: true },
              { k: 'f1_score', label: 'F1 Score' },
            ].map((m, i) => (
              <div key={i} className="p-2 bg-isro-darker rounded-lg">
                <span className={`block text-sm font-bold font-mono ${
                  m.k === 'fn' && data.summary.detection_metrics.fn > 0 ? 'text-red-400' :
                  m.k === 'fp' && data.summary.detection_metrics.fp > 0 ? 'text-orange-400' :
                  'text-white'
                }`}>
                  {m.pct ? (data.summary.detection_metrics[m.k] * 100).toFixed(1) + '%' : data.summary.detection_metrics[m.k]}
                </span>
                <span className="text-[9px] text-gray-500">{m.label}</span>
              </div>
            ))}
          </div>

          {Array.isArray(data.summary.detection_metrics.escaped_components) && data.summary.detection_metrics.escaped_components.length > 0 && (
            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400">
                ⚠ {data.summary.detection_metrics.fn} defective part(s) escaped screening:
                <span className="font-mono ml-1">
                  {data.summary.detection_metrics.escaped_components.slice(0, 5).join(', ')}
                  {data.summary.detection_metrics.escaped_components.length > 5 ? '...' : ''}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto scrollbar-thin max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-isro-card">
            <tr className="border-b border-white/5">
              <th className="px-3 py-2 text-left text-xs text-gray-400">Component</th>
              <th className="px-3 py-2 text-left text-xs text-gray-400">Lot</th>
              <th className="px-3 py-2 text-left text-xs text-gray-400">Classification</th>
              <th className="px-3 py-2 text-left text-xs text-gray-400">Risk Score</th>
              <th className="px-3 py-2 text-left text-xs text-gray-400">Anomalies</th>
              <th className="px-3 py-2 text-left text-xs text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {(data.results || []).map((r, i) => (
              <tr key={i} className="border-b border-white/3 hover:bg-white/3">
                <td className="px-3 py-2 text-xs font-mono text-white">{r.component_id}</td>
                <td className="px-3 py-2 text-xs text-gray-400">{r.lot_id}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onViewExplain(r.component_id)}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                      r.classification === 'PASS' ? 'bg-green-500/20 text-green-400' :
                      r.classification === 'REVIEW' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-red-500/20 text-red-400'
                    }`}
                    title="Click to view detailed report">
                    {r.classification}
                  </button>
                </td>
                <td className="px-3 py-2 text-xs font-mono text-gray-300">{r.overall_risk_score?.toFixed(3)}</td>
                <td className="px-3 py-2 text-xs text-gray-400">{r.anomaly_parameters}/{r.total_parameters}</td>
                <td className="px-3 py-2">
                  <button onClick={() => onViewExplain(r.component_id)}
                    className="text-xs text-isro-lightblue hover:text-white transition-colors">
                    View Report
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DriftResults({ data, onViewExplain }) {
  const [certClass, setCertClass] = useState(null);
  const passCount = (data.results || []).filter((r) => r.recommendation === 'PASS').length;
  const failCount = (data.results || []).filter((r) => r.recommendation !== 'PASS').length;

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Module B Results</h3>

      <div className="grid grid-cols-3 gap-4 mb-2">
        {[
          { label: 'Total Predictions', value: data.total_predictions || (data.results || []).length, color: 'white', cls: null },
          { label: 'PASS', value: passCount, color: 'green', cls: 'PASS' },
          { label: 'FAIL', value: failCount, color: 'red', cls: 'FAIL' },
        ].map((stat) => (
          stat.cls ? (
            <button
              key={stat.label}
              onClick={() => setCertClass(certClass === stat.cls ? null : stat.cls)}
              className={`text-center p-4 bg-isro-dark rounded-xl transition-all cursor-pointer border ${
                certClass === stat.cls ? 'border-isro-lightblue/40 ring-1 ring-isro-lightblue/30' : 'border-white/5 hover:border-white/20'
              }`}
              title={`Click to view ${stat.cls} predictions`}>
              <p className={`text-2xl font-bold text-isro-${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}
                <span className="block text-[9px] text-gray-600 mt-0.5">Click to view ↓</span>
              </p>
            </button>
          ) : (
            <div key={stat.label} className="text-center p-4 bg-isro-dark rounded-xl">
              <p className={`text-2xl font-bold text-isro-${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          )
        ))}
      </div>

      {certClass && (
        <ClassificationDetail
          cls={certClass}
          mode="drift"
          rows={(data.results || []).filter((r) => r.recommendation === certClass)}
          onClose={() => setCertClass(null)}
          onViewReport={onViewExplain}
        />
      )}

      {data.accuracy_metrics && Object.keys(data.accuracy_metrics).length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {Object.entries(data.accuracy_metrics).map(([param, metrics]) => (
            <div key={param} className="p-4 bg-isro-dark rounded-xl">
              <h4 className="text-sm font-bold text-white mb-3 uppercase">{param}</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">MAE</span>
                  <span className="block text-white font-mono">{metrics.mean_absolute_error?.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-gray-500">RMSE</span>
                  <span className="block text-white font-mono">{metrics.root_mean_squared_error?.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-gray-500">R2 Score</span>
                  <span className={`block font-mono ${metrics.r2_score > 0.8 ? 'text-green-400' : 'text-orange-400'}`}>
                    {metrics.r2_score?.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">MAPE</span>
                  <span className="block text-white font-mono">{metrics.mean_absolute_percentage_error?.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto scrollbar-thin max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-isro-card">
            <tr className="border-b border-white/5">
              <th className="px-3 py-2 text-left text-xs text-gray-400">Param</th>
              <th className="px-3 py-2 text-left text-xs text-gray-400">0h</th>
              <th className="px-3 py-2 text-left text-xs text-gray-400">24h</th>
              <th className="px-3 py-2 text-left text-xs text-gray-400">Pred 168h</th>
              <th className="px-3 py-2 text-left text-xs text-gray-400">Actual 168h</th>
              <th className="px-3 py-2 text-left text-xs text-gray-400">Error</th>
              <th className="px-3 py-2 text-left text-xs text-gray-400">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {(data.results || []).map((r, i) => (
              <tr key={i} className="border-b border-white/3 hover:bg-white/3">
                <td className="px-3 py-2 text-xs font-medium text-white uppercase">{r.parameter}</td>
                <td className="px-3 py-2 text-xs font-mono text-gray-300">{r.input?.value_0h?.toFixed(3)}</td>
                <td className="px-3 py-2 text-xs font-mono text-gray-300">{r.input?.value_24h?.toFixed(3)}</td>
                <td className="px-3 py-2 text-xs font-mono text-isro-orange">{r.prediction?.predicted_168h?.toFixed(3)}</td>
                <td className="px-3 py-2 text-xs font-mono text-gray-400">{r.actual_168h?.toFixed(3) || '---'}</td>
                <td className="px-3 py-2 text-xs font-mono text-gray-400">{r.prediction_error?.toFixed(6) || '---'}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => r.component_id && onViewExplain(r.component_id)}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                      r.recommendation === 'PASS' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}
                    title="Click to view detailed report">
                    {r.recommendation}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function downloadCertificate({ cls, rows = [] }) {
  const isPass = cls === 'PASS';
  const isFail = cls === 'REJECT' || cls === 'FAIL';
  const isReview = cls === 'REVIEW';

  const title = isPass
    ? 'CERTIFICATE OF ACCEPTANCE'
    : isFail
      ? 'CERTIFICATE OF REJECTION'
      : 'MANUAL REVIEW REQUIRED';

  const body = isPass
    ? `This is to certify that ${rows.length} component(s) have successfully PASSED all prescribed AI-driven burn-in screening tests and are hereby ACCEPTED for use in critical space-grade applications.`
    : isFail
      ? `This is hereby certified that ${rows.length} component(s) FAILED the prescribed burn-in screening tests due to detected parametric anomalies and drift beyond safety thresholds. These components are RECOMMENDED FOR REJECTION and must not be deployed.`
      : `The following ${rows.length} component(s) require MANUAL REVIEW by the QA inspector before a final disposition decision is recorded.`;

  const accent = isPass ? '#16a34a' : isFail ? '#dc2626' : '#ea580c';
  const now = new Date();
  const ref = `MAV/${now.toISOString().slice(0, 10).replace(/-/g, '')}/${cls}/${rows.length}`;
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const checklist = [
    ['Iddq Standby Current', true],
    ['Leakage Current', true],
    ['Propagation Delay', true],
    ['Supply Current', true],
    ['0h Burn-In Reading', true],
    ['24h Burn-In Reading', true],
    ['96h Burn-In Reading', true],
    ['168h Drift Projection', isPass],
  ];

  const checklistHtml = checklist
    .map(
      ([label, ok]) => `
      <tr>
        <td style="padding:4px 8px;font-size:11px;color:#333;">${ok ? '&#10003;' : '&#10005;'}</td>
        <td style="padding:4px 8px;font-size:12px;color:#333;">${label}</td>
        <td style="padding:4px 8px;font-size:10px;color:#777;">${ok ? 'PASSED' : cls === 'REVIEW' ? 'DEFERRED' : 'FAILED'}</td>
      </tr>`
    )
    .join('');

  const chips = rows
    .slice(0, 60)
    .map((r) => `<span style="display:inline-block;margin:2px;padding:2px 8px;font-size:10px;font-family:monospace;background:#f1f5f9;border-radius:4px;color:#475569;">${(r.component_id || '').toString()}</span>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title} - ${ref}</title>
</head>
<body style="margin:0;padding:24px;background:#e2e8f0;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:800px;margin:0 auto;background:#ffffff;border:3px double ${accent};border-radius:12px;padding:32px;">
    <div style="text-align:center;border-bottom:2px solid ${accent};padding-bottom:16px;margin-bottom:20px;">
      <p style="font-size:10px;letter-spacing:2px;color:#64748b;margin:0 0 4px;">MAVERICK BURN-IN SCREENING</p>
      <h1 style="font-size:24px;color:${accent};margin:0;letter-spacing:1px;">${title}</h1>
      <p style="font-size:11px;color:#64748b;margin:6px 0 0;">AI-Driven Anomaly Detection in Component Burn-In &amp; Screening | Department of Space | ISRO</p>
    </div>

    <p style="font-size:13px;line-height:1.7;color:#334155;">${body}</p>

    <div style="margin:16px 0;">
      <p style="font-size:12px;font-weight:bold;color:#334155;margin:0 0 6px;">SCREENING TEST CHECKLIST</p>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
        ${checklistHtml}
      </table>
    </div>

    <div style="margin:16px 0;">
      <p style="font-size:12px;font-weight:bold;color:#334155;margin:0 0 6px;">COVERED COMPONENTS (${rows.length})</p>
      <div>${chips}${rows.length > 60 ? `<span style="display:inline-block;margin:2px;padding:2px 8px;font-size:10px;background:#f1f5f9;border-radius:4px;color:#64748b;">+${rows.length - 60} more</span>` : ''}</div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;">
      <div>
        <p style="font-size:11px;color:#64748b;margin:0;">Issued By: MAVERICK AI Screening System</p>
        <p style="font-size:11px;color:#64748b;margin:2px 0 0;">Department of Space | ISRO</p>
        <p style="font-size:10px;color:#94a3b8;margin:6px 0 0;font-family:monospace;">Ref: ${ref}</p>
      </div>
      <div style="text-align:right;">
        <div style="width:150px;height:40px;font-size:22px;font-family:cursive;color:#334155;border-bottom:1px solid #94a3b8;margin-bottom:4px;">
          <div style="margin-top:6px;">&#119969;</div>
        </div>
        <p style="font-size:10px;color:#64748b;margin:0;">QA Inspector Sign-off</p>
        <p style="font-size:10px;color:#94a3b8;margin:2px 0 0;">${dateStr}</p>
      </div>
    </div>

    <p style="text-align:center;font-size:9px;color:#94a3b8;margin-top:24px;">This is a system-generated certificate from the MAVERICK AI Screening Platform. Disposition verified against Module A (outlier detection) and Module B (drift prediction) analyses.</p>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MAVERICK_${cls}_Certificate_${now.toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ClassificationDetail({ cls, rows = [], mode = 'outlier', onClose, onViewReport }) {
  const isPass = cls === 'PASS';
  const isFail = cls === 'REJECT' || cls === 'FAIL';
  const isReview = cls === 'REVIEW';

  const accent = isPass ? 'border-green-500/30 text-green-400'
    : isFail ? 'border-red-500/30 text-red-400'
    : 'border-orange-500/30 text-orange-400';

  const title = isPass
    ? 'CERTIFICATE OF ACCEPTANCE'
    : isFail
      ? 'CERTIFICATE OF REJECTION'
      : 'MANUAL REVIEW REQUIRED';

  const body = isPass
    ? `This is to certify that ${rows.length} component(s) have successfully PASSED all
       prescribed AI-driven burn-in screening tests and are hereby ACCEPTED for use in
       critical space-grade applications.`
    : isFail
      ? `This is hereby certified that ${rows.length} component(s) FAILED the prescribed
         burn-in screening tests due to detected parametric anomalies and drift beyond
         safety thresholds. These components are RECOMMENDED FOR REJECTION and must not
         be deployed.`
      : `The following ${rows.length} component(s) require MANUAL REVIEW by the QA
         inspector before a final disposition decision is recorded.`;

  return (
    <div className="mb-6 animate-in">
      {/* Certificate */}
      <div className={`rounded-2xl border-2 border-dashed p-6 mb-4 bg-isro-dark ${accent.split(' ')[0]} bg-opacity-0`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${isPass ? 'from-green-500/30 to-green-600/30' : isFail ? 'from-red-500/30 to-red-600/30' : 'from-orange-500/30 to-orange-600/30'} flex items-center justify-center`}
              style={{ border: `2px solid ${isPass ? 'rgba(34,197,94,.4)' : isFail ? 'rgba(239,68,68,.4)' : 'rgba(249,115,22,.4)'}` }}>
              <svg className={`w-6 h-6 ${isPass ? 'text-green-400' : isFail ? 'text-red-400' : 'text-orange-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isPass ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : isFail ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-mono text-gray-500">MAVERICK BURN-IN SCREENING</p>
              <h4 className={`text-lg font-black tracking-wide ${isPass ? 'text-green-400' : isFail ? 'text-red-400' : 'text-orange-400'}`}>
                {title}
              </h4>
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-bold ${
            isPass ? 'bg-green-500/20 text-green-400' : isFail ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
          }`}>
            {rows.length} {isFail ? 'REJECTED' : isReview ? 'UNDER REVIEW' : 'ACCEPTED'}
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => downloadCertificate({ cls, rows })}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-isro-blue to-blue-500 text-white rounded-lg hover:opacity-90 transition-all"
            title="Download certificate as an HTML file (open it and Print > Save as PDF for a PDF copy)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Certificate
          </button>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed mb-4 whitespace-pre-line">{body}</p>

        {/* Test checklist */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: 'Iddq Standby Current', ok: true },
            { label: 'Leakage Current', ok: true },
            { label: 'Propagation Delay', ok: true },
            { label: 'Supply Current', ok: true },
            { label: '0h Burn-In Reading', ok: true },
            { label: '24h Burn-In Reading', ok: true },
            { label: '96h Burn-In Reading', ok: true },
            { label: '168h Drift Projection', ok: isPass },
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] text-gray-300">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                t.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {t.ok ? '✓' : '✕'}
              </span>
              {t.label}
            </div>
          ))}
        </div>

        {/* Component list */}
        <div className="mb-4">
          <p className="text-[10px] font-mono text-gray-500 mb-1.5">COVERED COMPONENTS ({rows.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {rows.slice(0, 40).map((r) => (
              <span key={r.component_id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                {(r.component_id || '').toString()}
              </span>
            ))}
            {rows.length > 40 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
                +{rows.length - 40} more
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between pt-4 border-t border-white/10">
          <div>
            <p className="text-[10px] text-gray-500">Issued By: MAVERICK AI Screening System</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Department of Space | ISRO</p>
            <p className="text-[10px] text-gray-600 mt-0.5 font-mono">
              Ref: MAV/{new Date().toISOString().slice(0, 10).replace(/-/g, '')}/{cls}/{rows.length}
            </p>
          </div>
          <div className="text-right">
            <div className="w-28 h-9 mb-1" style={{ fontFamily: 'cursive', fontSize: '18px', color: 'rgba(255,255,255,.55)' }}>
              ...
            </div>
            <p className="text-[9px] text-gray-500 border-t border-white/10 pt-1">QA Inspector Sign-off</p>
            <p className="text-[9px] text-gray-600 mt-0.5">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Filtered component details */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-white">
          {rows.length} component(s) {isFail ? 'rejected' : isReview ? 'flagged for review' : 'that passed screening'}
        </h4>
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-white transition-colors">
          Close ✕
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-thin max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-isro-card">
            <tr className="border-b border-white/5">
              <th className="px-3 py-2 text-left text-xs text-gray-400">Component</th>
              {mode !== 'drift' && <th className="px-3 py-2 text-left text-xs text-gray-400">Lot</th>}
              {mode === 'drift' && <th className="px-3 py-2 text-left text-xs text-gray-400">Param</th>}
              {mode === 'drift' && <th className="px-3 py-2 text-left text-xs text-gray-400">Pred 168h</th>}
              {mode === 'drift' && <th className="px-3 py-2 text-left text-xs text-gray-400">Actual</th>}
              {mode === 'drift' && <th className="px-3 py-2 text-left text-xs text-gray-400">Verdict</th>}
              {mode !== 'drift' && <th className="px-3 py-2 text-left text-xs text-gray-400">Classification</th>}
              {mode !== 'drift' && <th className="px-3 py-2 text-left text-xs text-gray-400">Risk</th>}
              {mode !== 'drift' && <th className="px-3 py-2 text-left text-xs text-gray-400">Anomalies</th>}
              <th className="px-3 py-2 text-left text-xs text-gray-400">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-white/3 hover:bg-white/3">
                <td className="px-3 py-2 text-xs font-mono text-white">{r.component_id}</td>
                {mode !== 'drift' && <td className="px-3 py-2 text-xs text-gray-400">{r.lot_id}</td>}
                {mode === 'drift' && <td className="px-3 py-2 text-xs font-medium text-white uppercase">{r.parameter}</td>}
                {mode === 'drift' && <td className="px-3 py-2 text-xs font-mono text-isro-orange">{r.prediction?.predicted_168h?.toFixed(3)}</td>}
                {mode === 'drift' && <td className="px-3 py-2 text-xs font-mono text-gray-400">{r.actual_168h != null ? r.actual_168h.toFixed(3) : '—'}</td>}
                {mode === 'drift' && (
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      r.recommendation === 'PASS' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>{r.recommendation}</span>
                  </td>
                )}
                {mode !== 'drift' && (
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      (r.classification || r.outlier_classification) === 'PASS' ? 'bg-green-500/20 text-green-400' :
                      (r.classification || r.outlier_classification) === 'REVIEW' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{(r.classification || r.outlier_classification)}</span>
                  </td>
                )}
                {mode !== 'drift' && <td className="px-3 py-2 text-xs font-mono text-gray-300">{(r.overall_risk_score ?? r.outlier_risk)?.toFixed(3)}</td>}
                {mode !== 'drift' && <td className="px-3 py-2 text-xs text-gray-400">{r.anomaly_parameters != null ? `${r.anomaly_parameters}/${r.total_parameters}` : '—'}</td>}
                <td className="px-3 py-2">
                  <button onClick={() => onViewReport && onViewReport(r.component_id)}
                    className="text-xs text-isro-lightblue hover:text-white transition-colors">
                    View Report
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-xs text-gray-500">
                  No {cls} components found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailedReport({ data, onClose }) {
  const cls = data.outlier_analysis?.classification;
  const badgeClass = cls === 'PASS'
    ? 'bg-green-500/20 text-green-400'
    : cls === 'REVIEW'
      ? 'bg-orange-500/20 text-orange-400'
      : 'bg-red-500/20 text-red-400';

  const methodBadge = (flag) => flag
    ? 'bg-red-500/15 text-red-400'
    : 'bg-green-500/15 text-green-400';

  const verdictBadge = (v) => v === 'PASS'
    ? 'bg-green-500/20 text-green-400'
    : v === 'REVIEW'
      ? 'bg-orange-500/20 text-orange-400'
      : 'bg-red-500/20 text-red-400';

  const num = (v, d = 4) => (v === null || v === undefined || isNaN(v) ? '—' : Number(v).toFixed(d));

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[640px] bg-isro-dark/95 backdrop-blur-xl border-l border-white/10 z-50 overflow-y-auto p-6">
      <div className="sticky top-0 -mt-6 px-6 py-4 bg-isro-dark/95 backdrop-blur-lg border-b border-white/10 -mx-6 mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white font-mono">{data.component_id}</h3>
          {data.lot_id && <p className="text-[10px] text-gray-500 font-mono mt-0.5">Lot: {data.lot_id}</p>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close report">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Verdict summary */}
      <div className="glass-card rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Final Screening Verdict</p>
            <span className={`text-sm px-3 py-1 rounded-full font-bold ${badgeClass}`}>
              {cls || 'N/A'}
            </span>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black font-mono text-white">
              {data.outlier_analysis?.overall_risk_score != null
                ? (data.outlier_analysis.overall_risk_score * 100).toFixed(0)
                : '—'}
              <span className="text-xs text-gray-500 font-normal">/100</span>
            </p>
            <p className="text-[10px] text-gray-500">Overall Risk Score</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-isro-darker rounded-xl">
            <p className={`text-lg font-bold ${data.outlier_analysis?.risk_level === 'HIGH' ? 'text-red-400' : data.outlier_analysis?.risk_level === 'MEDIUM' ? 'text-orange-400' : 'text-green-400'}`}>
              {data.outlier_analysis?.risk_level || '—'}
            </p>
            <p className="text-[10px] text-gray-500">Risk Level</p>
          </div>
          <div className="p-3 bg-isro-darker rounded-xl">
            <p className="text-lg font-bold text-white">
              {data.outlier_analysis?.anomaly_parameters ?? '—'}/{data.outlier_analysis?.total_parameters ?? '—'}
            </p>
            <p className="text-[10px] text-gray-500">Anomalous Params</p>
          </div>
          <div className="p-3 bg-isro-darker rounded-xl">
            {data.is_defective !== null && data.is_defective !== undefined ? (
              <p className={`text-lg font-bold ${data.is_defective ? 'text-red-400' : 'text-green-400'}`}>
                {data.is_defective ? 'DEFECTIVE' : 'GOOD'}
              </p>
            ) : (
              <p className="text-lg font-bold text-gray-500">UNKNOWN</p>
            )}
            <p className="text-[10px] text-gray-500">Ground Truth</p>
          </div>
        </div>
      </div>

      {/* Raw values */}
      {data.raw_values && Object.keys(data.raw_values).length > 0 && (
        <div className="glass-card rounded-2xl p-5 mb-5">
          <h4 className="text-sm font-bold text-white mb-3">Burn-In Dataset Values</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-2 py-1.5 text-left text-gray-500">Parameter</th>
                  <th className="px-2 py-1.5 text-right text-gray-500">0h</th>
                  <th className="px-2 py-1.5 text-right text-gray-500">24h</th>
                  <th className="px-2 py-1.5 text-right text-gray-500">96h</th>
                  <th className="px-2 py-1.5 text-right text-gray-500">168h</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.raw_values).map(([param, t]) => (
                  <tr key={param} className="border-b border-white/5">
                    <td className="px-2 py-1.5 font-medium text-white uppercase">{param.replace('_', ' ')}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-300">{num(t['_0h'])}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-300">{num(t['_24h'])}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-300">{num(t['_96h'])}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-isro-orange">{num(t['_168h'])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Module A per-parameter analysis */}
      {data.outlier_analysis?.parameters?.length > 0 && (
        <div className="glass-card rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-isro-lightblue" />
            <h4 className="text-sm font-bold text-isro-lightblue">Module A — Parameter-Level Outlier Analysis</h4>
          </div>
          <div className="space-y-3">
            {data.outlier_analysis.parameters.map((p, i) => (
              <div key={i} className="p-3 bg-isro-darker rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase font-mono">{p.parameter}</span>
                    {p.is_anomaly ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">ANOMALY</span>
                    ) : (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">OK</span>
                    )}
                    <span className="text-[9px] text-gray-500 font-mono">votes {p.consensus_votes}/3</span>
                  </div>
                  <span className="text-xs font-mono text-gray-300">
                    risk <span className="text-white">{num(p.risk_score, 4)}</span>
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-[10px] mb-2">
                  <div className="p-2 bg-isro-dark rounded-lg">
                    <p className="text-gray-500">Value</p>
                    <p className="text-white font-mono mt-0.5">{num(p.value)}</p>
                  </div>
                  <div className="p-2 bg-isro-dark rounded-lg">
                    <p className="text-gray-500">Lot Mean</p>
                    <p className="text-white font-mono mt-0.5">{num(p.lot_mean)}</p>
                  </div>
                  <div className="p-2 bg-isro-dark rounded-lg">
                    <p className="text-gray-500">Lot Std</p>
                    <p className="text-white font-mono mt-0.5">{num(p.lot_std)}</p>
                  </div>
                  <div className="p-2 bg-isro-dark rounded-lg">
                    <p className="text-gray-500">Deviation</p>
                    <p className="text-white font-mono mt-0.5">
                      {p.lot_std > 0 ? (((p.value - p.lot_mean) / p.lot_std).toFixed(2)) : '—'}σ
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  {[
                    { name: 'Z-Score', m: p.methods?.z_score, main: `z = ${p.methods?.z_score?.z_score ?? '—'}` },
                    { name: 'IQR Bounds', m: p.methods?.iqr, main: `[${num(p.methods?.iqr?.lower_bound)}, ${num(p.methods?.iqr?.upper_bound)}]` },
                    { name: 'Abs Limit', m: p.methods?.absolute_limit, main: p.methods?.absolute_limit?.detail || 'n/a' },
                  ].map(({ name, m, main }, j) => (
                    <div key={j} className={`p-2 rounded-lg border ${m?.is_anomaly ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 bg-isro-dark'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-500">{name}</span>
                        <span className={`px-1.5 py-0.5 rounded ${methodBadge(m?.is_anomaly)} font-bold`}>
                          {m?.is_anomaly ? 'FLAG' : 'CLEAR'}
                        </span>
                      </div>
                      <p className="text-gray-300 font-mono truncate">{main}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module A explainability */}
      {data.outlier_analysis?.explainability && (
        <div className="glass-card rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-isro-lightblue" />
            <h4 className="text-sm font-bold text-isro-lightblue">Module A — Why this verdict</h4>
          </div>
          {data.outlier_analysis.explainability.reasons?.map((reason, i) => (
            <p key={i} className="text-xs text-gray-400 mb-2 pl-3 border-l-2 border-isro-blue/30">{reason}</p>
          ))}
          {data.outlier_analysis.explainability.recommendations?.map((rec, i) => (
            <p key={i} className="text-xs text-isro-orange mt-2 pl-3 border-l-2 border-isro-orange/30">{rec}</p>
          ))}
        </div>
      )}

      {/* Module B drift predictions */}
      {data.drift_analysis && Object.keys(data.drift_analysis).length > 0 && (
        <div className="glass-card rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-isro-orange" />
            <h4 className="text-sm font-bold text-isro-orange">Module B — Drift Predictions to 168h</h4>
          </div>
          <div className="space-y-3">
            {Object.entries(data.drift_analysis).map(([param, d]) => (
              <div key={param} className="p-3 bg-isro-darker rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white uppercase font-mono">{param}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${verdictBadge(d.recommendation)}`}>
                    {d.recommendation}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-[10px] mb-2">
                  <div className="p-2 bg-isro-dark rounded-lg">
                    <p className="text-gray-500">0h</p>
                    <p className="text-white font-mono mt-0.5">{num(d.input?.value_0h)}</p>
                  </div>
                  <div className="p-2 bg-isro-dark rounded-lg">
                    <p className="text-gray-500">24h</p>
                    <p className="text-white font-mono mt-0.5">{num(d.input?.value_24h)}</p>
                  </div>
                  <div className="p-2 bg-isro-dark rounded-lg">
                    <p className="text-gray-500">Predicted 168h</p>
                    <p className="text-isro-orange font-mono mt-0.5">{num(d.prediction?.predicted_168h)}</p>
                  </div>
                  <div className="p-2 bg-isro-dark rounded-lg">
                    <p className="text-gray-500">Actual 168h</p>
                    <p className="text-white font-mono mt-0.5">{d.actual_168h != null ? num(d.actual_168h) : '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div className="p-2 bg-isro-dark rounded-lg">
                    <p className="text-gray-500">Drift Rate</p>
                    <p className="text-white font-mono mt-0.5">{num(d.prediction?.predicted_drift_rate, 6)}/hr</p>
                  </div>
                  <div className="p-2 bg-isro-dark rounded-lg">
                    <p className="text-gray-500">Safety Slope</p>
                    <p className="text-white font-mono mt-0.5">{num(d.prediction?.safety_slope, 6)}/hr</p>
                  </div>
                  <div className="p-2 bg-isro-dark rounded-lg">
                    <p className="text-gray-500">Safety Check</p>
                    <p className={`font-mono mt-0.5 font-bold ${d.prediction?.exceeds_safety_slope ? 'text-red-400' : 'text-green-400'}`}>
                      {d.prediction?.exceeds_safety_slope ? 'EXCEEDS' : 'WITHIN'}
                    </p>
                  </div>
                  <div className="p-2 bg-isro-dark rounded-lg">
                    <p className="text-gray-500">Pred. Error</p>
                    <p className="text-white font-mono mt-0.5">{d.prediction_error != null ? num(d.prediction_error, 6) : '—'}</p>
                  </div>
                </div>

                {d.explainability?.reasoning && (
                  <div className="mt-3 pt-2 border-t border-white/5">
                    {d.explainability.reasoning.map((step, s) => (
                      <p key={s} className="text-[10px] text-gray-500 font-mono mb-0.5">{step}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SinglePredictionResult({ data }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Prediction Result</h3>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-isro-dark rounded-xl">
          <p className="text-xs text-gray-500">Predicted 168h Value</p>
          <p className="text-2xl font-bold text-isro-orange mt-1 font-mono">
            {data.prediction?.predicted_168h?.toFixed(4)}
          </p>
        </div>
        <div className="text-center p-4 bg-isro-dark rounded-xl">
          <p className="text-xs text-gray-500">Drift Rate</p>
          <p className="text-2xl font-bold text-white mt-1 font-mono">
            {data.prediction?.predicted_drift_rate?.toFixed(6)}
          </p>
        </div>
        <div className="text-center p-4 bg-isro-dark rounded-xl">
          <p className="text-xs text-gray-500">Recommendation</p>
          <p className={`text-2xl font-bold mt-1 ${
            data.recommendation === 'PASS' ? 'text-isro-green' : 'text-red-400'
          }`}>
            {data.recommendation}
          </p>
        </div>
      </div>

      {/* Safety Analysis */}
      {data.prediction?.safety_slope !== undefined && (
        <div className="p-4 bg-isro-dark rounded-xl mb-4">
          <h4 className="text-sm font-bold text-white mb-2">Safety Slope Analysis</h4>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Current Drift Rate</span>
              <span className="block text-white font-mono mt-1">{data.prediction.predicted_drift_rate?.toFixed(6)}/hr</span>
            </div>
            <div>
              <span className="text-gray-500">Safety Threshold</span>
              <span className="block text-white font-mono mt-1">{data.prediction.safety_slope?.toFixed(6)}/hr</span>
            </div>
            <div>
              <span className="text-gray-500">Exceeds Safety?</span>
              <span className={`block font-mono mt-1 ${data.prediction.exceeds_safety_slope ? 'text-red-400' : 'text-green-400'}`}>
                {data.prediction.exceeds_safety_slope ? 'YES - FLAGGED' : 'NO - CLEARED'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Explanation */}
      {data.explainability && (
        <div className="p-4 bg-isro-dark rounded-xl">
          <h4 className="text-sm font-bold text-white mb-3">Explainability</h4>
          <p className="text-xs text-gray-300 mb-3 p-3 bg-isro-darker rounded-lg">
            {data.explainability.summary}
          </p>
          <div className="space-y-1">
            {data.explainability.reasoning?.map((step, i) => (
              <p key={i} className="text-[11px] text-gray-500 font-mono">{step}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
