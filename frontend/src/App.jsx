import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginModal, { HOSPITALS } from './components/LoginModal';
import AdminDashboard from './components/AdminDashboard';
import HospitalDashboard from './components/HospitalDashboard';
import { fetchHealth } from './services/api';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hemo_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(true);

  useEffect(() => {
    if (user) {
      localStorage.setItem('hemo_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('hemo_user');
    }
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchHealth();
      setBackendHealthy(true);
      setRefreshKey(prev => prev + 1);
    } catch (e) {
      setBackendHealthy(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHospitalView = (hospitalId, hospitalName) => {
    setUser({
      role: 'hospital',
      hospitalId,
      hospitalName: hospitalName || `Hospital ${hospitalId}`
    });
  };

  if (!user) {
    return <LoginModal onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        onRefresh={handleRefresh}
        loading={loading}
      />

      <main style={{ flex: 1, padding: '0 24px' }}>
        {user.role === 'admin' ? (
          <AdminDashboard 
            key={refreshKey}
            onSelectHospitalView={handleSelectHospitalView} 
          />
        ) : (
          <HospitalDashboard 
            key={`${user.hospitalId}_${refreshKey}`}
            hospitalId={user.hospitalId} 
            hospitalName={user.hospitalName} 
            onDataUpdated={handleRefresh}
          />
        )}
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '24px',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        borderTop: '1px solid var(--border-subtle)',
        marginTop: '40px'
      }}>
        🩸 HEMO-PULSE MLOps Architecture • End-to-End Hospital Supply Chain Optimizer
      </footer>
    </div>
  );
}
