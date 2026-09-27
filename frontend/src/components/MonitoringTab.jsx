import React, { useState, useEffect } from 'react';
import { fetchDriftStatus, getDriftReportUrl } from '../services/api';
import { AlertTriangle, CheckCircle, ExternalLink, RefreshCw, BarChart2, ShieldCheck, Activity } from 'lucide-react';

export default function MonitoringTab() {
  const [driftData, setDriftData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMonitoring = async () => {
    setLoading(true);
    try {
      const data = await fetchDriftStatus();
      setDriftData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoring();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>📊 Evidently AI Model & Data Drift Monitor</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Continuous distribution tracking comparing baseline training features against incoming production requests.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={loadMonitoring}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Re-check Drift</span>
          </button>
          <a 
            href={getDriftReportUrl()} 
            target="_blank" 
            rel="noreferrer"
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
          >
            <ExternalLink size={16} />
            <span>View Full Evidently Report</span>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      {driftData && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Dataset Drift Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              {driftData.dataset_drift_detected ? (
                <>
                  <AlertTriangle size={24} color="var(--danger)" />
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)' }}>DRIFT DETECTED</span>
                </>
              ) : (
                <>
                  <CheckCircle size={24} color="var(--success)" />
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>STABLE</span>
                </>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Evaluated on Kolmogorov-Smirnov statistical tests
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Drift Share
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
              {driftData.drift_share ?? 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Threshold for retrain alarm: 50%
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Features Evaluated
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
              {driftData.features_evaluated || 10} Features
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Lags, rolling means, temporal seasonality
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Baseline / Current Samples
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginTop: '8px' }}>
              {(driftData.reference_rows || 29332).toLocaleString()} / {(driftData.current_rows || 12572).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Historical vs Recent window
            </div>
          </div>
        </div>
      )}

      {/* Detailed Feature Drift Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart2 size={20} color="var(--primary)" />
          <span>Feature Distribution Drift Breakdown</span>
        </h4>

        {driftData && driftData.features_summary && driftData.features_summary.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Feature Name</th>
                  <th>Drift Detected</th>
                  <th>Drift P-Value / Score</th>
                  <th>Statistical Test</th>
                  <th>Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {driftData.features_summary.map((f, i) => (
                  <tr key={i}>
                    <td><b>{f.feature}</b></td>
                    <td>
                      {f.drift_detected ? (
                        <span className="badge badge-red">Drifted</span>
                      ) : (
                        <span className="badge badge-green">Healthy</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{f.drift_score}</td>
                    <td><span style={{ color: 'var(--text-secondary)' }}>{f.stat_test}</span></td>
                    <td>
                      {f.drift_detected ? (
                        <span style={{ color: 'var(--warning)', fontSize: '0.82rem' }}>⚠️ Schedule Pipeline Retrain</span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontSize: '0.82rem' }}>✔ Pass</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            No drift metrics found. Click "View Full Evidently Report" or re-run the monitoring pipeline.
          </div>
        )}
      </div>
    </div>
  );
}
