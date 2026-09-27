import React, { useState, useEffect } from 'react';
import { 
  fetchHospitalInventory, 
  fetchForecast, 
  fetchExpiryRisk, 
  fetchRecommendations,
  logHospitalIntake
} from '../services/api';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  Truck, 
  ClipboardList, 
  ArrowDownLeft, 
  ArrowUpRight, 
  HeartHandshake,
  CheckCircle2,
  Calendar,
  AlertCircle
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

export default function HospitalDashboard({ hospitalId, hospitalName, onDataUpdated }) {
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventoryData, setInventoryData] = useState(null);
  const [selectedBloodType, setSelectedBloodType] = useState('O+');
  const [forecastData, setForecastData] = useState(null);
  const [expiryData, setExpiryData] = useState(null);
  const [logisticsData, setLogisticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state for quick logging
  const [logForm, setLogForm] = useState({ bloodType: 'O+', unitsIssued: 5, unitsCollected: 8 });
  const [formSuccess, setFormSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadHospitalData = async () => {
    setLoading(true);
    try {
      const [inv, exp, recs] = await Promise.all([
        fetchHospitalInventory(hospitalId),
        fetchExpiryRisk(hospitalId),
        fetchRecommendations(hospitalId)
      ]);
      setInventoryData(inv);
      setExpiryData(exp);
      setLogisticsData(recs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadForecast = async () => {
    try {
      const fc = await fetchForecast(hospitalId, selectedBloodType);
      setForecastData(fc);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadHospitalData();
  }, [hospitalId]);

  useEffect(() => {
    if (activeTab === 'forecast') {
      loadForecast();
    }
  }, [activeTab, selectedBloodType, hospitalId]);

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await logHospitalIntake({
        hospital_id: hospitalId,
        blood_type: logForm.bloodType,
        units_collected: logForm.unitsCollected,
        units_issued: logForm.unitsIssued
      });
      setSuccessMessage(result.message || 'Log successfully committed to inventory!');
      setFormSuccess(true);
      
      // Immediately reload local hospital inventory & batches
      await loadHospitalData();
      if (activeTab === 'forecast') {
        await loadForecast();
      }
      
      // Notify parent app to update global caches (e.g. Admin overview, Navbar)
      if (onDataUpdated) {
        onDataUpdated();
      }
      
      setTimeout(() => setFormSuccess(false), 5000);
    } catch (err) {
      alert(`Error updating inventory: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const chartData = {
    labels: forecastData?.daily_breakdown?.map(d => d.date) || [],
    datasets: [
      {
        label: `${hospitalId} - ${selectedBloodType} 7-Day Demand Forecast`,
        data: forecastData?.daily_breakdown?.map(d => d.predicted_demand) || [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#10b981',
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
        title: { display: true, text: 'Units Expected', color: '#94a3b8' }
      }
    }
  };

  const inboundTransfers = logisticsData?.recommendations?.filter(r => r.to === hospitalId) || [];
  const outboundTransfers = logisticsData?.recommendations?.filter(r => r.from === hospitalId) || [];
  const collectionDrives = logisticsData?.recommendations?.filter(r => r.hospital === hospitalId && r.type === 'collection') || [];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '28px 32px',
        background: 'linear-gradient(135deg, rgba(22,30,46,0.9), rgba(15,23,42,0.95))',
        borderLeft: '4px solid var(--primary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <span style={{
              background: 'rgba(230, 57, 70, 0.2)',
              color: 'var(--primary)',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.85rem'
            }}>
              FACILITY {hospitalId}
            </span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              {hospitalName || `Hospital ${hospitalId}`}
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Local Blood Bank Management, ML Consumption Projections & Dispatch Orders
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ textAlign: 'right', background: 'var(--bg-card)', padding: '10px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total On-Hand Stock</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
              {inventoryData?.inventory?.reduce((acc, curr) => acc + curr.current_stock, 0) || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Units</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Package size={18} />
          <span>Local Inventory Status</span>
        </button>

        <button
          className={`btn ${activeTab === 'forecast' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('forecast')}
        >
          <TrendingUp size={18} />
          <span>7-Day Demand Forecast</span>
        </button>

        <button
          className={`btn ${activeTab === 'expiry' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('expiry')}
        >
          <AlertTriangle size={18} />
          <span>Batch Expiry Risk (ML)</span>
        </button>

        <button
          className={`btn ${activeTab === 'logistics' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('logistics')}
        >
          <Truck size={18} />
          <span>Inbound / Outbound Deliveries ({inboundTransfers.length + outboundTransfers.length})</span>
        </button>

        <button
          className={`btn ${activeTab === 'logging' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('logging')}
        >
          <ClipboardList size={18} />
          <span>Log Daily Intake/Issue</span>
        </button>
      </div>

      {/* TAB 1: Inventory Status */}
      {activeTab === 'inventory' && inventoryData && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Blood Inventory & Safety Levels</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Stock status evaluated against 7-day rolling baseline consumption.
              </p>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Last updated: <b>{inventoryData.as_of_date}</b>
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Blood Group</th>
                  <th>Current Stock</th>
                  <th>Today Issued</th>
                  <th>Today Collected</th>
                  <th style={{ width: '220px' }}>Days of Supply</th>
                  <th>Status Alert</th>
                </tr>
              </thead>
              <tbody>
                {inventoryData.inventory.map((row, i) => {
                  const isCritical = row.status === 'Critical Shortage';
                  const isLow = row.status === 'Low Stock';
                  const isSurplus = row.status === 'Surplus';
                  const badgeClass = isCritical ? 'badge-red' : isLow ? 'badge-yellow' : isSurplus ? 'badge-purple' : 'badge-green';
                  const fillWidth = Math.min(100, (row.days_of_supply / 15) * 100);
                  const fillColor = isCritical ? 'var(--danger)' : isLow ? 'var(--warning)' : isSurplus ? 'var(--purple)' : 'var(--success)';

                  return (
                    <tr key={i}>
                      <td>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '1rem',
                          background: 'rgba(230, 57, 70, 0.15)',
                          color: 'var(--primary)',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          {row.blood_type}
                        </span>
                      </td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 800 }}>{row.current_stock} Units</td>
                      <td>{row.daily_issued} Units</td>
                      <td>{row.units_collected} Units</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="progress-bar-bg" style={{ flex: 1 }}>
                            <div className="progress-bar-fill" style={{ width: `${fillWidth}%`, background: fillColor }}></div>
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, minWidth: '55px', color: fillColor }}>
                            {row.days_of_supply}d
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{row.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Forecast */}
      {activeTab === 'forecast' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '18px 24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Blood Group:</label>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {forecastData && (
              <>
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Next-Day Expected Demand</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                    {forecastData.next_day_demand} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Units</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '4px' }}>
                    ✔ LightGBM Multi-horizon regressor prediction
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>7-Day Cumulative Requirement</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--info)', marginTop: '4px' }}>
                    {forecastData.seven_day_forecast} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Units</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--info)', marginTop: '4px' }}>
                    7-day projected inventory drawdown
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '24px', minHeight: '400px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
              📈 7-Day Consumption Trajectory ({selectedBloodType})
            </h4>
            <div style={{ height: '320px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Expiry Risk */}
      {activeTab === 'expiry' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>
            ⚠️ Active Inventory Batches & XGBoost Expiry Scoring
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
            Batches currently held at {hospitalId}, ranked by waste risk probability so staff can prioritize First-Expired-First-Out (FEFO) dispensing.
          </p>

          {expiryData && expiryData.batches && expiryData.batches.length > 0 ? (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Blood Group</th>
                    <th>Units</th>
                    <th>Collection Date</th>
                    <th>Expiry Date</th>
                    <th>Days Remaining</th>
                    <th>ML Risk Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expiryData.batches.map((b, i) => (
                    <tr key={i}>
                      <td><code style={{ color: 'var(--text-primary)' }}>{b.batch_id}</code></td>
                      <td><span className="badge badge-red">{b.blood_type}</span></td>
                      <td><b>{b.units_collected}</b></td>
                      <td>{b.collection_date}</td>
                      <td>{b.expiry_date}</td>
                      <td><b>{b.days_to_expiry} days</b></td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: b.risk_score_pct > 50 ? 'var(--danger)' : b.risk_score_pct > 25 ? 'var(--warning)' : 'var(--success)'
                        }}>
                          {Number(b.risk_score_pct).toFixed(2)}%
                        </span>
                      </td>
                      <td>
                        {b.risk_score_pct > 50 ? (
                          <span className="badge badge-red">Prioritize Dispense</span>
                        ) : (
                          <span className="badge badge-green">Standard FEFO</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} color="var(--success)" style={{ margin: '0 auto 12px auto' }} />
              <div>All active batches in this facility are well within safe shelf-life limits.</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Logistics */}
      {activeTab === 'logistics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
          {/* Inbound */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--success-bg)' }}>
                <ArrowDownLeft size={20} color="var(--success)" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Inbound Transfers to Receive</h3>
            </div>

            {inboundTransfers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {inboundTransfers.map((item, idx) => (
                  <div key={idx} style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
                        Receive {Math.round(item.units)} Units of {item.blood_type}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Source: <b>Hospital {item.from}</b>
                      </div>
                    </div>
                    <span className="badge badge-green">Inbound Shipment</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No incoming deliveries scheduled.
              </div>
            )}
          </div>

          {/* Outbound */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--warning-bg)' }}>
                <ArrowUpRight size={20} color="var(--warning)" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Outbound Shipments to Dispatch</h3>
            </div>

            {outboundTransfers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {outboundTransfers.map((item, idx) => (
                  <div key={idx} style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
                        Dispatch {Math.round(item.units)} Units of {item.blood_type}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Destination: <b>Hospital {item.to}</b>
                      </div>
                    </div>
                    <span className="badge badge-yellow">Ready for Transit</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No outbound transfer commitments required.
              </div>
            )}
          </div>

          {/* Donor Campaign */}
          {collectionDrives.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <HeartHandshake size={24} color="var(--primary)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Recommended Local Collection Drives</h3>
              </div>
              {collectionDrives.map((d, i) => (
                <div key={i} style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  🎯 <b>Action Required:</b> Trigger donation drive to collect <b>{Math.round(d.units)} additional units of {d.blood_type}</b> to prevent forecasted shortage.
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Quick Daily Intake Log */}
      {activeTab === 'logging' && (
        <div className="glass-panel" style={{ padding: '32px', maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>
            📝 Record Daily Intake & Dispensing
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '24px' }}>
            Simulate real-time blood bank logging for {hospitalId}.
          </p>

          {formSuccess && (
            <div style={{
              background: 'var(--success-bg)',
              border: '1px solid var(--success)',
              color: 'var(--success)',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <CheckCircle2 size={20} />
              <div>
                <b style={{ display: 'block' }}>Inventory Synchronized!</b>
                <span style={{ fontSize: '0.85rem' }}>{successMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Blood Group:
              </label>
              <select 
                className="select" 
                style={{ width: '100%' }}
                value={logForm.bloodType}
                onChange={e => setLogForm({ ...logForm, bloodType: e.target.value })}
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bt => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Units Collected / Donated Today:
              </label>
              <input 
                type="number"
                min="0"
                className="input"
                style={{ width: '100%' }}
                value={logForm.unitsCollected}
                onChange={e => setLogForm({ ...logForm, unitsCollected: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Units Issued to Surgery / ER:
              </label>
              <input 
                type="number"
                min="0"
                className="input"
                style={{ width: '100%' }}
                value={logForm.unitsIssued}
                onChange={e => setLogForm({ ...logForm, unitsIssued: parseInt(e.target.value) || 0 })}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ marginTop: '10px', padding: '12px' }}
              disabled={submitting}
            >
              {submitting ? 'Updating Inventory...' : 'Commit Daily Telemetry Log'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
