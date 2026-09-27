import React from 'react';
import { Activity, Shield, Hospital, LogOut, RefreshCw } from 'lucide-react';

export default function Navbar({ user, onLogout, onRefresh, loading }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(10, 14, 23, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '12px 24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #e63946, #b01b2a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(230, 57, 70, 0.4)'
          }}>
            <Activity color="#fff" size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>HEMO-PULSE</span>
              <span style={{
                fontSize: '0.65rem',
                background: 'rgba(230, 57, 70, 0.2)',
                color: 'var(--primary)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 700
              }}>MLOPS v2.0</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Intelligent Blood Bank Optimization & Logistics
            </div>
          </div>
        </div>

        {/* User Info & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Live System Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            <span className="pulse-dot" style={{ background: '#10b981' }}></span>
            <span>API Online</span>
          </div>

          {/* Refresh Action */}
          <button 
            className="btn btn-secondary" 
            onClick={onRefresh}
            disabled={loading}
            title="Refresh Real-time Data"
            style={{ padding: '8px 12px' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span style={{ fontSize: '0.82rem' }}>Sync</span>
          </button>

          {/* User Profile Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 14px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            {user.role === 'admin' ? (
              <Shield size={18} color="#8b5cf6" />
            ) : (
              <Hospital size={18} color="#e63946" />
            )}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                {user.role === 'admin' ? 'Central Command' : user.hospitalName || user.hospitalId}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {user.role === 'admin' ? 'Network Administrator' : `Facility ID: ${user.hospitalId}`}
              </div>
            </div>
          </div>

          {/* Sign out */}
          <button 
            className="btn btn-outline-danger" 
            onClick={onLogout}
            style={{ padding: '8px 12px' }}
            title="Sign Out"
          >
            <LogOut size={16} />
            <span style={{ fontSize: '0.82rem' }}>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
