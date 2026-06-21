import React from 'react';

const ResultDisplay = ({ result }) => {
  const { 
    jk, umur, bb, tb,
    z_bbu, z_tbu, z_bbtb, 
    status_bbu, status_tbu, status_bbtb, 
    saran 
  } = result;

  const getStatusClass = (status) => {
    if (status.includes('Normal') || status.includes('Baik')) return 'status-normal';
    if (status.includes('Risiko') || status.includes('Lebih')) return 'status-warning';
    if (status.includes('Kurang') || status.includes('Pendek') || status.includes('Stunting')) return 'status-danger';
    if (status.includes('Sangat Kurang') || status.includes('Sangat Pendek') || status.includes('Buruk')) return 'status-critical';
    if (status.includes('Obesitas') || status.includes('Gizi Lebih')) return 'status-info';
    if (status.includes('Ekstrem') || status.includes('Anomali')) return 'status-ekstrem';
    return '';
  };

  const getIcon = (status) => {
    if (status.includes('Normal') || status.includes('Baik')) return '✅';
    if (status.includes('Risiko') || status.includes('Lebih')) return '⚠️';
    if (status.includes('Kurang') || status.includes('Pendek') || status.includes('Stunting')) return '🔴';
    if (status.includes('Sangat Kurang') || status.includes('Sangat Pendek') || status.includes('Buruk')) return '🚨';
    if (status.includes('Obesitas') || status.includes('Gizi Lebih')) return '🟡';
    if (status.includes('Ekstrem') || status.includes('Anomali')) return '💀';
    return 'ℹ️';
  };

  return (
    <div className="result-card">
      <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📊 Hasil Analisis
      </h3>

      {/* Tampilkan data input */}
      <div style={{ 
        background: '#f7fafc', 
        padding: '12px 16px', 
        borderRadius: '10px', 
        marginBottom: '16px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <span><strong>JK:</strong> {jk === 'F' ? 'Perempuan' : 'Laki-laki'}</span>
          <span><strong>Umur:</strong> {umur} bulan</span>
          <span><strong>BB:</strong> {bb} kg</span>
          <span><strong>TB:</strong> {tb} cm</span>
        </div>
      </div>

      <div className="result-item">
        <span className="label">BB/U</span>
        <span className="value">
          Z-Score: <strong>{z_bbu}</strong>
          <span className={`status ${getStatusClass(status_bbu)}`} style={{ marginLeft: '12px' }}>
            {getIcon(status_bbu)} {status_bbu}
          </span>
        </span>
      </div>

      <div className="result-item">
        <span className="label">TB/U</span>
        <span className="value">
          Z-Score: <strong>{z_tbu}</strong>
          <span className={`status ${getStatusClass(status_tbu)}`} style={{ marginLeft: '12px' }}>
            {getIcon(status_tbu)} {status_tbu}
          </span>
        </span>
      </div>

      <div className="result-item">
        <span className="label">BB/TB</span>
        <span className="value">
          Z-Score: <strong>{z_bbtb}</strong>
          <span className={`status ${getStatusClass(status_bbtb)}`} style={{ marginLeft: '12px' }}>
            {getIcon(status_bbtb)} {status_bbtb}
          </span>
        </span>
      </div>

      <div className="saran-box">
        <h4 style={{ marginBottom: '8px' }}>💡 Rekomendasi Intervensi</h4>
        <p>{saran}</p>
      </div>
    </div>
  );
};

export default ResultDisplay;