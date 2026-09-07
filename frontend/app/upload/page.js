'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';

export default function UploadPage() {
  const [user, setUser] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [manualEntry, setManualEntry] = useState({
    component_id: '', lot_id: '', measurements: {}
  });
  const [manualEntries, setManualEntries] = useState([]);
  const [activeTab, setActiveTab] = useState('csv');
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    setUser(JSON.parse(stored));
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/csv', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');

      setUploadResult(data);
      setMessage(`Successfully uploaded ${data.rows} records with ${data.columns.length} columns`);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/data/sample', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUploadResult(data);
      setMessage(`Sample data generated: ${data.total_count} components across ${data.lots.length} lots (${data.defective_count} defective)`);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addManualEntry = () => {
    if (!manualEntry.component_id || !manualEntry.lot_id) {
      setMessage('Please enter component ID and lot ID');
      return;
    }
    setManualEntries([...manualEntries, { ...manualEntry }]);
    setManualEntry({ component_id: '', lot_id: '', measurements: {} });
    setMessage(`Added component ${manualEntry.component_id}. Total entries: ${manualEntries.length + 1}`);
  };

  const submitManualEntries = async () => {
    if (manualEntries.length === 0) {
      setMessage('No entries to submit');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/upload/manual', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(manualEntries.map(e => ({
          component_id: e.component_id,
          lot_id: e.lot_id,
          measurements: e.measurements,
        }))),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Submit failed');

      setUploadResult(data);
      setMessage(`Uploaded ${data.message}`);
      setManualEntries([]);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
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

      <Sidebar user={user} active="upload" />

      <main className="relative z-10 flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Data Ingestion</h1>
            <p className="text-gray-500 text-sm">
              Upload component parametric data for burn-in analysis
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-xl text-sm ${
              message.startsWith('Error')
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-isro-green/10 border border-isro-green/20 text-isro-green'
            }`}>
              {message}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            {[
              { id: 'csv', label: 'CSV / Excel Upload' },
              { id: 'manual', label: 'Manual Entry' },
              { id: 'sample', label: 'Sample Data' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-isro-blue/20 text-isro-lightblue border border-isro-blue/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* CSV Upload */}
          {activeTab === 'csv' && (
            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-lg font-bold text-white mb-4">Upload Parametric Data File</h3>
              <p className="text-sm text-gray-400 mb-6">
                Upload a CSV or Excel file containing component measurements at different time intervals (0h, 24h, 96h, 168h).
              </p>

              <div className="border-2 border-dashed border-white/10 rounded-xl p-12 text-center hover:border-isro-blue/30 transition-all">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <svg className="w-12 h-12 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-400 mb-2">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-600">CSV, XLSX, or XLS files supported</p>
                </label>
              </div>

              {loading && (
                <div className="mt-4 flex items-center gap-3 text-isro-lightblue">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm">Processing file...</span>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry */}
          {activeTab === 'manual' && (
            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-lg font-bold text-white mb-4">Manual Component Entry</h3>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Component ID</label>
                  <input
                    type="text"
                    value={manualEntry.component_id}
                    onChange={(e) => setManualEntry({ ...manualEntry, component_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50"
                    placeholder="COMP-00001"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Lot ID</label>
                  <input
                    type="text"
                    value={manualEntry.lot_id}
                    onChange={(e) => setManualEntry({ ...manualEntry, lot_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-isro-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-isro-lightblue/50"
                    placeholder="LOT-A001"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-3">Parametric Measurements (key=value pairs)</p>
              <textarea
                value={Object.entries(manualEntry.measurements).map(([k, v]) => `${k}: ${v}`).join('\n')}
                onChange={(e) => {
                  const measurements = {};
                  e.target.value.split('\n').forEach(line => {
                    const [key, value] = line.split(':').map(s => s.trim());
                    if (key && value) measurements[key] = parseFloat(value);
                  });
                  setManualEntry({ ...manualEntry, measurements });
                }}
                className="w-full px-4 py-3 bg-isro-dark border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-isro-lightblue/50 h-32"
                placeholder={`iddq_0h: 10.5\niddq_24h: 10.8\nleakage_0h: 4.2\nleakage_24h: 4.5\ndelay_0h: 2.3\ndelay_24h: 2.35`}
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={addManualEntry}
                  className="px-5 py-2.5 bg-isro-dark border border-white/10 text-gray-300 text-sm font-medium rounded-lg hover:bg-white/5 transition-all">
                  Add Entry
                </button>
                <button
                  onClick={submitManualEntries}
                  disabled={manualEntries.length === 0}
                  className="px-5 py-2.5 bg-isro-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50">
                  Submit {manualEntries.length} Entries
                </button>
              </div>

              {manualEntries.length > 0 && (
                <div className="mt-6 p-4 bg-isro-dark/50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Queued Entries ({manualEntries.length})</p>
                  <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-2">
                    {manualEntries.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-isro-dark rounded-lg text-sm">
                        <span className="text-white font-mono">{entry.component_id}</span>
                        <span className="text-gray-400">{entry.lot_id}</span>
                        <span className="text-gray-500 text-xs">{Object.keys(entry.measurements).length} params</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sample Data */}
          {activeTab === 'sample' && (
            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-lg font-bold text-white mb-4">Generate Sample Data</h3>
              <p className="text-sm text-gray-400 mb-6">
                Generate realistic synthetic burn-in data with known defective components for testing.
                Includes 200 components across 5 lots with ~8% defect rate.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Components', value: '200', desc: 'Total parts in dataset' },
                  { label: 'Lots', value: '5', desc: 'Distinct manufacturing lots' },
                  { label: 'Defect Rate', value: '~8%', desc: 'Known defective parts' },
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-isro-dark rounded-xl text-center">
                    <p className="text-2xl font-bold text-white">{item.value}</p>
                    <p className="text-xs font-medium text-gray-300 mt-1">{item.label}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={loadSampleData}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-isro-orange to-orange-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-isro-orange/25 disabled:opacity-50">
                {loading ? 'Generating...' : 'Generate & Load Sample Data'}
              </button>
            </div>
          )}

          {/* Upload Result Preview */}
          {uploadResult && (
            <div className="mt-6 glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Data Preview</h3>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {(uploadResult.columns || []).slice(0, 10).map((col) => (
                        <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-400 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(uploadResult.preview || []).slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-white/3">
                        {Object.values(row).slice(0, 10).map((val, j) => (
                          <td key={j} className="px-3 py-2 text-xs text-gray-300 font-mono whitespace-nowrap">
                            {typeof val === 'boolean' ? (val ? '✓' : '✗') : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {uploadResult.columns && uploadResult.columns.length > 10 && (
                <p className="text-xs text-gray-500 mt-3">Showing first 10 of {uploadResult.columns.length} columns</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
