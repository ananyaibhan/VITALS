import React, { useState } from 'react';
import { Activity, Shield, Hospital, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

export const HOSPITALS = [
  { id: 'H1', name: 'Metro Medical Center', location: 'Downtown Hub', capacity: '500 Beds', color: '#e63946' },
  { id: 'H2', name: 'City Health Memorial', location: 'North District', capacity: '350 Beds', color: '#3b82f6' },
  { id: 'H3', name: 'St. Jude Regional', location: 'East Corridor', capacity: '280 Beds', color: '#f59e0b' },
  { id: 'H4', name: 'Westside Clinic', location: 'West Suburban', capacity: '200 Beds', color: '#10b981' },
  { id: 'H5', name: 'North Valley Trauma', location: 'Valley Sector', capacity: '420 Beds', color: '#8b5cf6' },
  { id: 'H6', name: 'East District Hospital', location: 'Harbor District', capacity: '310 Beds', color: '#ec4899' },
];

export default function LoginModal({ onLogin }) {
  const [selectedHospital, setSelectedHospital] = useState('H1');

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background ambient lighting */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '20%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(230,57,70,0.12) 0%, transparent 70%)',
        filter: 'blur(40px)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '20%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
        filter: 'blur(40px)',
        zIndex: 0
      }}></div>

      <div style={{
        maxWidth: '960px',
        width: '100%',
        zIndex: 1,
        textAlign: 'center'
      }}>
        {/* Brand Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #e63946, #9b111e)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(230, 57, 70, 0.4)',
            marginBottom: '16px'
          }}>
            <Activity color="#fff" size={36} />
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            letterSpacing: '-1px',
            background: 'linear-gradient(180deg, #ffffff, #cbd5e1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            HEMO-PULSE MLOPS
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
            Multi-Hospital Blood Inventory Optimization, Demand Forecasting & Expiry Risk Mitigation Portal
          </p>
        </div>

        {/* Portals Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '24px',
          textAlign: 'left'
        }}>
          {/* Card 1: Central Admin */}
          <div className="glass-panel" style={{
            padding: '32px',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'var(--purple-bg)',
                  border: '1px solid rgba(139, 92, 246, 0.3)'
                }}>
                  <Shield size={24} color="#8b5cf6" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Central Network Command</h3>
                  <span className="badge badge-purple">Executive / Admin</span>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.6' }}>
                Full visibility over the entire hospital cluster (H1–H6). Run network-wide linear programming optimization, inspect data drift via Evidently, and orchestrate inter-facility deliveries.
              </p>
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                marginBottom: '24px'
              }}>
                <div>✔ Global Network Status Grid</div>
                <div>✔ Master Rebalancing Schedule</div>
                <div>✔ Evidently Data Drift & MLflow Tracking</div>
              </div>
            </div>

            <button 
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.35)'
              }}
              onClick={() => onLogin({ role: 'admin', name: 'Central Network Operations' })}
            >
              <span>Access Central Command</span>
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Card 2: Hospital Staff */}
          <div className="glass-panel" style={{
            padding: '32px',
            border: '1px solid rgba(230, 57, 70, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'var(--primary-glow)',
                  border: '1px solid rgba(230, 57, 70, 0.3)'
                }}>
                  <Hospital size={24} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Hospital Staff Portal</h3>
                  <span className="badge badge-red">Facility Specific</span>
                </div>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Select your medical facility to access on-hand blood unit counts, local 7-day demand forecasts, urgent batch expiry lists, and dispatch manifests.
              </p>

              {/* Hospital selector pills */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                marginBottom: '24px'
              }}>
                {HOSPITALS.map(h => {
                  const isSelected = selectedHospital === h.id;
                  return (
                    <div
                      key={h.id}
                      onClick={() => setSelectedHospital(h.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(230, 57, 70, 0.15)' : 'var(--bg-secondary)',
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <b style={{ color: isSelected ? 'var(--primary)' : '#fff', fontSize: '0.85rem' }}>{h.id}</b>
                        {isSelected && <CheckCircle2 size={14} color="var(--primary)" />}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button 
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px' }}
              onClick={() => {
                const h = HOSPITALS.find(item => item.id === selectedHospital);
                onLogin({
                  role: 'hospital',
                  hospitalId: selectedHospital,
                  hospitalName: h ? h.name : selectedHospital
                });
              }}
            >
              <span>Login to {selectedHospital} Dashboard</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
