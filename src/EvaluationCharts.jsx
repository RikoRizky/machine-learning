import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Scatter, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
} from 'chart.js';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, BarElement, CategoryScale);

const EvaluationCharts = () => {
  const [evalData, setEvalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get('/evaluation')
      .then((res) => {
        setEvalData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Gagal memuat data grafik. Pastikan backend berjalan.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '30px' }}>⏳ Memuat grafik...</div>;
  if (error) return <div style={{ color: '#e53e3e', padding: '20px', textAlign: 'center' }}>{error}</div>;
  if (!evalData) return null;

  const { scatter, feature_importance, targets } = evalData;
  const colors = ['#5a67d8', '#ed8936', '#38b2ac'];

  const scatterDatasets = targets.map((target, idx) => {
    const data = scatter[target];
    return {
      label: target,
      data: data.actual.map((act, i) => ({ x: act, y: data.predicted[i] })),
      backgroundColor: colors[idx % colors.length],
      pointRadius: 2,
      pointHoverRadius: 5,
    };
  });

  const scatterOptions = (target) => ({
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: {
        title: { display: true, text: 'Nilai Aktual' },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      y: {
        title: { display: true, text: 'Nilai Prediksi' },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
    plugins: {
      legend: {
        labels: { font: { size: 10 } },
      },
    },
  });

  // Feature Importance
  const barData = {
    labels: feature_importance.features,
    datasets: [
      {
        label: 'Tingkat Pengaruh',
        data: feature_importance.importances,
        backgroundColor: '#5a67d8',
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      y: {
        grid: { display: false },
      },
    },
  };

  return (
    <div>
      <h2 className="section-title">📈 Evaluasi Model</h2>
      <p style={{ color: '#718096', marginBottom: '20px' }}>
        Perbandingan prediksi AI dengan data aktual untuk setiap indikator Z-Score.
      </p>

      <div className="charts-grid">
        {targets.map((target, idx) => (
          <div className="chart-card" key={target}>
            <h4>{target}</h4>
            <Scatter
              data={{ datasets: [scatterDatasets[idx]] }}
              options={scatterOptions(target)}
            />
          </div>
        ))}
      </div>

      <div className="importance-wrapper">
        <h4 style={{ marginBottom: '12px' }}>Faktor Paling Berpengaruh</h4>
        <Bar data={barData} options={barOptions} />
      </div>
    </div>
  );
};

export default EvaluationCharts;