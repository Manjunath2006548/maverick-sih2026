'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!stored || !token) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(stored));
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/analysis/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative flex min-h-screen bg-isro-darker overflow-hidden">
      {/* Themed background image */}
      <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/app-bg.svg)' }} />
      <div className="absolute inset-0 z-0 bg-isro-darker/55" />

      <Sidebar user={user} active="dashboard" />

      <main className="relative z-10 flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Mission Control</h1>
            <p className="text-gray-500 text-sm">
              AI-Driven Anomaly Detection Dashboard | Component Burn-In & Screening
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Components', value: dashboardData?.data_info?.total_components || '---', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', color: 'blue' },
              { label: 'Lots Analyzed', value: dashboardData?.data_info?.lots || '---', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', color: 'orange' },
              { label: 'Anomalies Found', value: dashboardData?.outlier?.classifications?.REJECT || '---', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'red' },
              { label: 'Models Trained', value: dashboardData?.drift_accuracy ? Object.keys(dashboardData.drift_accuracy).length : '0', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'green' },
            ].map((stat, i) => (
              <div key={i} className="glass-card rounded-xl p-6 relative overflow-hidden group hover:glow-blue transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-isro-${stat.color}/10 flex items-center justify-center`}>
                    <svg className={`w-6 h-6 text-isro-${stat.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Module A Status */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-isro-blue/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-isro-lightblue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-isro-lightblue tracking-widest">MODULE A</span>
                  <h3 className="text-lg font-bold text-white">Outlier Detection</h3>
                </div>
              </div>

              {dashboardData?.outlier?.classifications ? (
                <div className="space-y-4">
                  {[
                    { label: 'PASS', count: dashboardData.outlier.classifications?.PASS || 0, color: 'green', pct: 100 },
                    { label: 'REVIEW', count: dashboardData.outlier.classifications?.REVIEW || 0, color: 'orange', pct: 50 },
                    { label: 'REJECT', count: dashboardData.outlier.classifications?.REJECT || 0, color: 'red', pct: 20 },
                  ].map((item) => {
                    const total = dashboardData.outlier.total_analyzed || 1;
                    const pct = (item.count / total * 100).toFixed(1);
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">{item.label}</span>
                          <span className="text-white font-mono">{item.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-isro-dark rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-isro-${item.color} rounded-full transition-all duration-1000`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-4 pt-4 border-t border-white/5 flex justify-between">
                    <span className="text-xs text-gray-500">Avg Risk Score</span>
                    <span className="text-sm font-mono text-white">{dashboardData.outlier.avg_risk || '---'}</span>
                  </div>

                  {dashboardData?.outlier?.detection_metrics?.available && (
                    <div className="mt-3 p-3 bg-isro-dark/60 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-300">Anomaly Detection Score</span>
                        <span className={`text-lg font-bold font-mono ${
                          dashboardData.outlier.detection_metrics.anomaly_detection_score_pct >= 90 ? 'text-isro-green' :
                          dashboardData.outlier.detection_metrics.anomaly_detection_score_pct >= 70 ? 'text-isro-orange' :
                          'text-red-400'
                        }`}>
                          {dashboardData.outlier.detection_metrics.anomaly_detection_score_pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-isro-darker rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-gradient-to-r from-isro-green to-isro-lightblue rounded-full transition-all duration-1000"
                          style={{ width: `${dashboardData.outlier.detection_metrics.anomaly_detection_score_pct}%` }} />
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                        <div>
                          <span className="block text-white font-mono text-xs">{dashboardData.outlier.detection_metrics.tp}</span>
                          <span className="text-gray-500">TP</span>
                        </div>
                        <div>
                          <span className="block text-white font-mono text-xs">{dashboardData.outlier.detection_metrics.tn}</span>
                          <span className="text-gray-500">TN</span>
                        </div>
                        <div>
                          <span className="block text-white font-mono text-xs">{dashboardData.outlier.detection_metrics.fp}</span>
                          <span className="text-gray-500">FP</span>
                        </div>
                        <div>
                          <span className={`block font-mono text-xs ${dashboardData.outlier.detection_metrics.fn > 0 ? 'text-red-400' : 'text-white'}`}>
                            {dashboardData.outlier.detection_metrics.fn}
                          </span>
                          <span className="text-gray-500">FN ⚠</span>
                        </div>
                      </div>
                      {dashboardData.outlier.detection_metrics.recall_aka_sensitivity !== undefined && (
                        <p className="text-[10px] text-gray-500 mt-2">
                          Recall (sensitivity): {(dashboardData.outlier.detection_metrics.recall_aka_sensitivity * 100).toFixed(1)}% | 
                          F1: {dashboardData.outlier.detection_metrics.f1_score?.toFixed(3)}
                        </p>
                      )}
                      {Array.isArray(dashboardData.outlier.detection_metrics.escaped_components) && dashboardData.outlier.detection_metrics.escaped_components.length > 0 && (
                        <p className="text-[10px] text-red-400 mt-1">
                          ⚠ Escaped: {dashboardData.outlier.detection_metrics.escaped_components.slice(0, 3).join(', ')}
                          {dashboardData.outlier.detection_metrics.escaped_components.length > 3 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No outlier analysis run yet</p>
                  <p className="text-gray-600 text-xs mt-1">Upload data and run Module A analysis</p>
                </div>
              )}
            </div>

            {/* Module B Status */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-isro-orange/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-isro-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-isro-orange tracking-widest">MODULE B</span>
                  <h3 className="text-lg font-bold text-white">Drift Prediction</h3>
                </div>
              </div>

              {dashboardData?.drift_accuracy && Object.keys(dashboardData.drift_accuracy).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(dashboardData.drift_accuracy).map(([param, metrics]) => (
                    <div key={param} className="p-3 bg-isro-dark/50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-300 uppercase">{param}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          metrics.r2_score > 0.8 ? 'bg-green-500/20 text-green-400' :
                          metrics.r2_score > 0.5 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          R2: {metrics.r2_score?.toFixed(3)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">MAE</span>
                          <span className="block text-white font-mono">{metrics.mean_absolute_error?.toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">RMSE</span>
                          <span className="block text-white font-mono">{metrics.root_mean_squared_error?.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No drift models trained yet</p>
                  <p className="text-gray-600 text-xs mt-1">Run Module B training to see metrics</p>
                </div>
              )}
            </div>

            {/* System Status */}
            <div className="glass-card rounded-2xl p-6 md:col-span-2">
              <h3 className="text-lg font-bold text-white mb-4">System Pipeline</h3>
              <div className="flex items-center justify-between gap-4">
                {[
                  { step: 'Data Ingestion', desc: 'CSV/Excel/Manual Upload', status: dashboardData?.data_info?.total_components ? 'complete' : 'pending' },
                  { step: 'Module A', desc: 'Outlier Detection', status: dashboardData?.outlier?.classifications ? 'complete' : 'pending' },
                  { step: 'Module B', desc: 'Drift Prediction', status: dashboardData?.drift_accuracy ? 'complete' : 'pending' },
                  { step: 'Report', desc: 'Explainability & QA', status: dashboardData?.drift_accuracy ? 'complete' : 'pending' },
                ].map((item, i) => (
                  <div key={i} className="flex-1 relative">
                    <div className={`w-full h-1 rounded-full ${item.status === 'complete' ? 'bg-isro-green' : 'bg-isro-dark'}`} />
                    <div className="mt-3">
                      <p className={`text-sm font-medium ${item.status === 'complete' ? 'text-white' : 'text-gray-500'}`}>
                        {item.step}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                    </div>
                    {i < 3 && (
                      <div className="absolute top-0 right-0 -mt-3.5 text-gray-600">→</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
