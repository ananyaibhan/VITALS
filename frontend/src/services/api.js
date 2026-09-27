const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchNetworkSummary() {
  const res = await fetch(`${API_BASE}/network-summary`);
  if (!res.ok) throw new Error(`Network summary failed: ${res.statusText}`);
  return res.json();
}

export async function fetchHospitalInventory(hospitalId) {
  const res = await fetch(`${API_BASE}/hospital-inventory?hospital_id=${encodeURIComponent(hospitalId)}`);
  if (!res.ok) throw new Error(`Hospital inventory failed: ${res.statusText}`);
  return res.json();
}

export async function fetchForecast(hospitalId, bloodType) {
  const res = await fetch(`${API_BASE}/forecast?hospital_id=${encodeURIComponent(hospitalId)}&blood_type=${encodeURIComponent(bloodType)}`);
  if (!res.ok) throw new Error(`Forecast failed: ${res.statusText}`);
  return res.json();
}

export async function fetchExpiryRisk(hospitalId, bloodType = null) {
  let url = `${API_BASE}/expiry-risk?hospital_id=${encodeURIComponent(hospitalId)}`;
  if (bloodType) url += `&blood_type=${encodeURIComponent(bloodType)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Expiry risk failed: ${res.statusText}`);
  return res.json();
}

export async function fetchRecommendations(hospitalId = null) {
  let url = `${API_BASE}/recommendation`;
  if (hospitalId) url += `?hospital_id=${encodeURIComponent(hospitalId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Recommendations failed: ${res.statusText}`);
  return res.json();
}

export async function fetchDriftStatus() {
  const res = await fetch(`${API_BASE}/monitoring/drift-status`);
  if (!res.ok) throw new Error(`Drift status failed: ${res.statusText}`);
  return res.json();
}

export async function logHospitalIntake({ hospital_id, blood_type, units_collected, units_issued }) {
  const res = await fetch(`${API_BASE}/log-intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hospital_id,
      blood_type,
      units_collected: parseInt(units_collected) || 0,
      units_issued: parseInt(units_issued) || 0
    })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Log intake failed: ${res.statusText}`);
  }
  return res.json();
}

export function getDriftReportUrl() {
  return `${API_BASE}/monitoring/drift-report`;
}
