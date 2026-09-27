import React, { useState, useEffect } from 'react';
import { 
  fetchNetworkSummary, 
  fetchForecast, 
  fetchExpiryRisk, 
  fetchRecommendations 
} from '../services/api';
import { HOSPITALS } from './LoginModal';
import MonitoringTab from './MonitoringTab';
import { 
  Globe, 
  Building2, 
  TrendingUp, 
  Truck, 
  AlertOctagon, 
  CheckCircle2, 
  Activity, 
  BarChart3,
  Calendar
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminDashboard({ onSelectHospitalView }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [networkSummary, setNetworkSummary] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  
  // Facility deep dive state
  const [selectedHospital, setSelectedHospital] = useState('H1');
  const [selectedBloodType, setSelectedBloodType] = useState('O+');
  const [forecastData, setForecastData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [net, recs] = await Promise.all([
        fetchNetworkSummary(),
        fetchRecommendations()
      ]);
      setNetworkSummary(net);
      setRecommendations(recs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDeepDive = async () => {
    try {
      const [fc, risk] = await Promise.all([
        fetchForecast(selectedHospital, selectedBloodType),
        fetchExpiryRisk(selectedHospital, selectedBloodType)
      ]);
      setForecastData(fc);
      setRiskData(risk);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    if (activeTab === 'deepdive') {
      loadDeepDive();
    }
  }, [activeTab, selectedHospital, selectedBloodType]);

  // Chart data setup for forecast
  const chartData = {
    labels: forecastData?.daily_breakdown?.map(d => d.date) || [],
    datasets: [
      {
        label: `Predicted Demand (${selectedHospital} - ${selectedBloodType})`,
        data: forecastData?.daily_breakdown?.map(d => d.predicted_demand) || [],
        borderColor: '#e63946',
        backgroundColor: 'rgba(230, 57, 70, 0.12)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#e63946',
        pointBorderColor: '#fff',
        pointRadius: 5
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 12 } }
      },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#fff',
        bodyColor: '#e63946',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#64748b' }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#64748b' },
        title: { display: true, text: 'Units Demanded', color: '#94a3b8' }
      }
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Banner & KPIs */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              🛡️ Central Network Operations Command
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Global multi-facility telemetry, continuous demand forecasting & automated rebalancing.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Calendar size={16} color="var(--primary)" />
            <span>Telemetry Snapshot: <b>{networkSummary?.as_of_date || 'Live'}</b></span>
          </div>
        </div>

        {/* 4 Global KPIs */}
        {networkSummary && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px'
          }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Network Stock
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                {networkSummary.total_network_stock.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Units</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '4px' }}>
                ✔ Across 6 regional hospitals & 8 blood groups
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Critical Shortage Nodes
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)', marginTop: '4px' }}>
                {networkSummary.hospitals.filter(h => h.status === 'Red').length} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Facilities</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '4px' }}>
                Immediate stock injection required
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Optimized Inter-Facility Transits
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--info)', marginTop: '4px' }}>
                {recommendations?.recommendations?.filter(r => r.type === 'transfer').length || 0} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Transfers</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--info)', marginTop: '4px' }}>
                PuLP Linear Programming minimum cost solution
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Target Donor Drives
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)', marginTop: '4px' }}>
                {recommendations?.recommendations?.filter(r => r.type === 'collection').length || 0} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Drives</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '4px' }}>
                Shortfall mitigation campaigns
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('overview')}
        >
          <Globe size={18} />
          <span>Network Health Grid</span>
        </button>

        <button
          className={`btn ${activeTab === 'deepdive' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('deepdive')}
        >
          <BarChart3 size={18} />
          <span>Facility Deep-Dive & ML Forecasts</span>
        </button>

        <button
          className={`btn ${activeTab === 'transfers' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('transfers')}
        >
          <Truck size={18} />
          <span>Inter-Hospital Transfer Matrix</span>
        </button>

        <button
          className={`btn ${activeTab === 'monitoring' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('monitoring')}
        >
          <Activity size={18} />
          <span>Evidently Drift Monitoring</span>
        </button>
      </div>

      {/* TAB 1: Network Health Grid */}
      {activeTab === 'overview' && networkSummary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Regional Facility Telemetry Cards</h3>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Click any facility to view detailed logistics</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '18px'
          }}>
            {networkSummary.hospitals.map(h => {
              const info = HOSPITALS.find(item => item.id === h.hospital_id);
              const isRed = h.status === 'Red';
              const isYellow = h.status === 'Yellow';
              const statusColor = isRed ? 'var(--danger)' : isYellow ? 'var(--warning)' : 'var(--success)';
              const badgeClass = isRed ? 'badge-red' : isYellow ? 'badge-yellow' : 'badge-green';

              return (
                <div
                  key={h.hospital_id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    borderLeft: `4px solid ${statusColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'var(--bg-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          color: statusColor
                        }}>
                          {h.hospital_id}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{info ? info.name : h.hospital_id}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{info?.location} • {info?.capacity}</span>
                        </div>
                      </div>
                      <span className={`badge ${badgeClass}`}>{h.status} Alert</span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      margin: '16px 0'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>On-Hand Units</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{h.total_stock}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily Outflow</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{h.today_issued}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '0.82rem' }}
                    onClick={() => onSelectHospitalView(h.hospital_id, info?.name)}
                  >
                    <span>Inspect {h.hospital_id} Local Portal</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Facility Deep-Dive */}
      {activeTab === 'deepdive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Controls Bar */}
          <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Target Facility:</label>
              <select 
                className="select" 
                value={selectedHospital}
                onChange={e => setSelectedHospital(e.target.value)}
              >
                {HOSPITALS.map(h => (
                  <option key={h.id} value={h.id}>{h.id} - {h.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Blood Group:</label>
              <select 
                className="select" 
                value={selectedBloodType}
                onChange={e => setSelectedBloodType(e.target.value)}
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bt => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
            {/* Forecast Chart */}
            <div className="glass-panel" style={{ padding: '24px', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    📈 7-Day LightGBM Demand Forecast
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Predicted unit consumption for {selectedHospital} ({selectedBloodType})
                  </p>
                </div>
                {forecastData && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {forecastData.seven_day_forecast} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Units / 7d</span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minHeight: '260px' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* At-Risk Batches */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
                ⚠️ Active Batches & XGBoost Expiry Risk
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Batches scored with ML waste risk probability classifier
              </p>

              {riskData && riskData.batches && riskData.batches.length > 0 ? (
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Batch ID</th>
                        <th>Units</th>
                        <th>Days Left</th>
                        <th>Risk Score</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskData.batches.slice(0, 6).map((b, i) => (
                        <tr key={i}>
                          <td><code style={{ color: 'var(--text-primary)' }}>{b.batch_id}</code></td>
                          <td><b>{b.units_collected}</b></td>
                          <td>{b.days_to_expiry} days</td>
                          <td>
                            <span style={{
                              fontWeight: 700,
                              color: b.risk_score_pct > 50 ? 'var(--danger)' : b.risk_score_pct > 25 ? 'var(--warning)' : 'var(--success)'
                            }}>
                              {Number(b.risk_score_pct).toFixed(2)}%
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${b.risk_level === 'High' ? 'badge-red' : b.risk_level === 'Medium' ? 'badge-yellow' : 'badge-green'}`}>
                              {b.risk_level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  ✅ No batches categorized as high expiry risk for this selection.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Inter-Hospital Transfers */}
      {activeTab === 'transfers' && recommendations && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>
              🚚 Optimized Inter-Hospital Dispatch Orders
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Solved via PuLP Optimization with GLPK. Minimizes network shortage penalties, transfer costs, and expiry waste.
            </p>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Logistics Type</th>
                    <th>Source Hospital</th>
                    <th>Destination Hospital</th>
                    <th>Blood Group</th>
                    <th>Recommended Units</th>
                    <th>Priority Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.recommendations.map((r, i) => (
                    <tr key={i}>
                      <td>
                        {r.type === 'transfer' ? (
                          <span className="badge badge-blue">Inter-Hospital Transfer</span>
                        ) : (
                          <span className="badge badge-purple">Target Collection Drive</span>
                        )}
                      </td>
                      <td><b>{r.from || 'Donation Drive'}</b></td>
                      <td><b>{r.to || r.hospital}</b></td>
                      <td><span className="badge badge-red">{r.blood_type}</span></td>
                      <td style={{ fontSize: '1.05rem', fontWeight: 800 }}>{Math.round(r.units)} Units</td>
                      <td>
                        <span style={{ color: r.type === 'transfer' ? 'var(--info)' : 'var(--purple)', fontSize: '0.82rem', fontWeight: 600 }}>
                          {r.type === 'transfer' ? `🚚 Dispatch ${r.from} ➔ ${r.to}` : `🎯 Trigger local appeal at ${r.hospital}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Evidently Drift Monitoring */}
      {activeTab === 'monitoring' && (
        <MonitoringTab />
      )}
    </div>
  );
}
