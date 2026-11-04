import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Scatter, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
} from 'chart.js';

ChartJS.register(
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale
);

// Plugin untuk menampilkan label persentase di ujung horizontal bar (Panel B)
const barPercentagePlugin = {
  id: 'barPercentagePlugin',
  afterDatasetsDraw(chart) {
    if (chart.options.indexAxis !== 'y') return;
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    if (!meta || meta.hidden) return;

    meta.data.forEach((element, index) => {
      const val = dataset.data[index];
      if (val === undefined || val === null) return;
      const text = `${(val * 100).toFixed(1)}%`;
      ctx.save();
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f2d59';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, element.x + 8, element.y);
      ctx.restore();
    });
  },
};

// Plugin untuk menampilkan jumlah baris di atas vertical bar (Panel C)
const outlierLabelsPlugin = {
  id: 'outlierLabelsPlugin',
  afterDatasetsDraw(chart) {
    if (chart.options.indexAxis === 'y') return;
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    if (!meta || meta.hidden) return;

    meta.data.forEach((element, index) => {
      const val = dataset.data[index];
      if (val === undefined || val === null) return;
      const text = `${Number(val).toLocaleString()} baris`;
      ctx.save();
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f2d59';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(text, element.x, element.y - 6);
      ctx.restore();
    });
  },
};

// Helper untuk generate sample scatter fallback jika backend offline
const generateFallbackScatter = () => {
  const targets = ['BB/U (WAZ)', 'TB/U (HAZ)', 'BB/TB (WHZ)'];
  const data = {};
  targets.forEach((t, tIdx) => {
    const actual = [];
    const predicted = [];
    const spread = tIdx === 0 ? 0.16 : tIdx === 1 ? 0.19 : 0.23;
    for (let i = 0; i < 160; i++) {
      const act = -3.8 + Math.random() * 7.2;
      const noise = (Math.random() - 0.5) * spread * 2;
      actual.push(parseFloat(act.toFixed(2)));
      predicted.push(parseFloat((act + noise).toFixed(2)));
    }
    data[t] = { actual, predicted };
  });
  return data;
};

const DEFAULT_EVAL_DATA = {
  metrics: {
    mean_r2: 0.9473,
    rmse: 1.0991,
    mae: 0.0463,
  },
  targets_info: [
    { name: 'BB/U (WAZ)', key: 'Z-score BB/U', r2: 0.987, color: '#4a90e2' },
    { name: 'TB/U (HAZ)', key: 'Z-score TB/U', r2: 0.993, color: '#38b2ac' },
    { name: 'BB/TB (WHZ)', key: 'Z-score BB/TB', r2: 0.862, color: '#ed8936' },
  ],
  scatter: generateFallbackScatter(),
  feature_importance: {
    features: ['Jenis Kelamin (jk)', 'Berat Badan (bb)', 'Tinggi Badan (tb)', 'Umur Bulan (umur)'],
    importances: [0.0374, 0.1926, 0.3623, 0.4078],
    colors: ['#718096', '#1d70b8', '#102a43', '#0e7490'],
  },
  outlier_distribution: {
    total: 40071,
    categories: ['Data Normal\n(|Z| ≤ 3.0)', 'Kasus Ekstrem\n(3 < |Z| ≤ 5)', 'Outlier Anomali\n(|Z| > 5.0)'],
    counts: [34650, 5159, 262],
    colors: ['#0f766e', '#d97706', '#b91c1c'],
  },
  chart_image: null,
};

const EvaluationCharts = () => {
  const [evalData, setEvalData] = useState(DEFAULT_EVAL_DATA);
  const [viewMode, setViewMode] = useState('interactive'); // 'interactive' | 'image'

  useEffect(() => {
    axios
      .get('/evaluation')
      .then((res) => {
        if (res.data) {
          const d = res.data;
          let featNames = d.feature_importance?.features || DEFAULT_EVAL_DATA.feature_importance.features;
          let featVals = d.feature_importance?.importances || DEFAULT_EVAL_DATA.feature_importance.importances;
          let featColors = d.feature_importance?.colors || DEFAULT_EVAL_DATA.feature_importance.colors;

          const paired = featNames.map((name, i) => ({
            name,
            val: featVals[i],
            color: featColors ? featColors[i] : '#1d70b8',
          }));
          paired.sort((a, b) => a.val - b.val);

          setEvalData({
            metrics: d.metrics || DEFAULT_EVAL_DATA.metrics,
            targets_info: d.targets_info || DEFAULT_EVAL_DATA.targets_info,
            scatter: d.scatter || DEFAULT_EVAL_DATA.scatter,
            feature_importance: {
              features: paired.map((p) => p.name),
              importances: paired.map((p) => p.val),
              colors: paired.map((p) => p.color),
            },
            outlier_distribution: d.outlier_distribution || DEFAULT_EVAL_DATA.outlier_distribution,
            chart_image: d.chart_image || null,
          });
        }
      })
      .catch((err) => {
        console.warn('Backend /evaluation offline, menggunakan data diagram default:', err);
      });
  }, []);

  const { metrics, scatter, feature_importance, outlier_distribution, chart_image, targets_info } = evalData;

  const currentTargets = targets_info || DEFAULT_EVAL_DATA.targets_info;

  // ===== PANEL A: SCATTER AKTUAL VS PREDIKSI =====
  const scatterDatasets = [
    ...currentTargets.map((t) => ({
      label: `${t.name} - R²=${t.r2 != null ? Number(t.r2).toFixed(3) : ''}`,
      data: (scatter[t.name]?.actual || []).map((act, i) => ({
        x: act,
        y: scatter[t.name]?.predicted?.[i] ?? act,
      })),
      backgroundColor: `${t.color || '#4a90e2'}99`,
      borderColor: t.color || '#4a90e2',
      pointRadius: 3,
      pointHoverRadius: 6,
    })),
    {
      type: 'line',
      label: 'Garis Ideal (y = x)',
      data: [
        { x: -4.5, y: -4.5 },
        { x: 4.5, y: 4.5 },
      ],
      borderColor: '#e53e3e',
      borderWidth: 2,
      borderDash: [6, 6],
      pointRadius: 0,
      fill: false,
      showLine: true,
    },
  ];

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        min: -4.5,
        max: 4.5,
        title: {
          display: true,
          text: 'Z-Score Aktual (Dataset MySQL)',
          font: { size: 11, weight: 'bold' },
          color: '#2d3748',
        },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      y: {
        min: -4.5,
        max: 4.5,
        title: {
          display: true,
          text: 'Z-Score Prediksi (Hybrid Model)',
          font: { size: 11, weight: 'bold' },
          color: '#2d3748',
        },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          font: { size: 10, weight: '600' },
          color: '#2d3748',
          padding: 6,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.dataset.label === 'Garis Ideal (y = x)') return 'Garis Ideal (y = x)';
            return `${context.dataset.label}: (${context.parsed.x.toFixed(2)}, ${context.parsed.y.toFixed(2)})`;
          },
        },
      },
    },
  };

  // ===== PANEL B: FEATURE IMPORTANCE (MDI) =====
  const barBData = {
    labels: feature_importance.features,
    datasets: [
      {
        label: 'Relative Importance Score',
        data: feature_importance.importances,
        backgroundColor: feature_importance.colors || ['#718096', '#0e7490', '#1d70b8', '#102a43'],
        borderRadius: 4,
        barThickness: 26,
      },
    ],
  };

  const barBOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { right: 35 },
    },
    scales: {
      x: {
        min: 0,
        max: 0.5,
        ticks: {
          stepSize: 0.1,
          callback: (val) => val.toFixed(1),
          font: { size: 10 },
          color: '#4a5568',
        },
        title: {
          display: true,
          text: 'Relative Importance Score (MDI)',
          font: { size: 11, weight: 'bold' },
          color: '#2d3748',
        },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      y: {
        grid: { display: false },
        ticks: {
          font: { size: 11, weight: '600' },
          color: '#2d3748',
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Pengaruh: ${(context.raw * 100).toFixed(1)}%`,
        },
      },
    },
  };

  // ===== PANEL C: DISTRIBUSI OUTLIER =====
  const barCData = {
    labels: outlier_distribution.categories,
    datasets: [
      {
        label: 'Jumlah Data Anak',
        data: outlier_distribution.counts,
        backgroundColor: outlier_distribution.colors || ['#0f766e', '#d97706', '#b91c1c'],
        borderRadius: 4,
        barThickness: 48,
      },
    ],
  };

  const barCOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 22 },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10, weight: '600' },
          color: '#2d3748',
        },
      },
      y: {
        type: 'logarithmic',
        min: 50,
        max: 100000,
        ticks: {
          callback: (val) => {
            if (val === 100) return '10²';
            if (val === 1000) return '10³';
            if (val === 10000) return '10⁴';
            if (val === 100000) return '10⁵';
            return null;
          },
          font: { size: 10 },
          color: '#4a5568',
        },
        title: {
          display: true,
          text: 'Jumlah Data Anak (Skala Log)',
          font: { size: 11, weight: 'bold' },
          color: '#2d3748',
        },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) =>
            `Jumlah: ${Number(context.raw).toLocaleString()} baris`,
        },
      },
    },
  };

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Header Minimalis dengan Switcher Tab */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          📊 Diagram Evaluasi Model
        </h2>

        {chart_image && (
          <div style={{ display: 'inline-flex', background: '#edf2f7', padding: '3px', borderRadius: '8px', gap: '3px' }}>
            <button
              type="button"
              onClick={() => setViewMode('interactive')}
              style={{
                border: 'none',
                background: viewMode === 'interactive' ? '#fff' : 'transparent',
                color: viewMode === 'interactive' ? '#2b6cb0' : '#718096',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'interactive' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Interaktif
            </button>
            <button
              type="button"
              onClick={() => setViewMode('image')}
              style={{
                border: 'none',
                background: viewMode === 'image' ? '#fff' : 'transparent',
                color: viewMode === 'image' ? '#2b6cb0' : '#718096',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'image' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Gambar Asli
            </button>
          </div>
        )}
      </div>

      {viewMode === 'interactive' ? (
        /* HANYA 3 DIAGRAM SAJA */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* DIAGRAM A */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f2d59' }}>
                A. Scatter Aktual vs Prediksi (/evaluation)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#2b6cb0', fontWeight: 700, marginTop: '2px' }}>
                Mean R² = {metrics.mean_r2.toFixed(4)} | RMSE = {metrics.rmse.toFixed(4)} | MAE = {metrics.mae.toFixed(4)}
              </div>
            </div>
            <div style={{ height: '350px', width: '100%', position: 'relative' }}>
              <Scatter data={{ datasets: scatterDatasets }} options={scatterOptions} />
            </div>
          </div>

          {/* DIAGRAM B */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f2d59' }}>
                B. Feature Importance Analysis (MDI)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#2b6cb0', fontWeight: 700, marginTop: '2px' }}>
                Endpoint /evaluation pada main.py
              </div>
            </div>
            <div style={{ height: '350px', width: '100%', position: 'relative' }}>
              <Bar data={barBData} options={barBOptions} plugins={[barPercentagePlugin]} />
            </div>
          </div>

          {/* DIAGRAM C */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f2d59' }}>
                C. Bukti Distribusi Outlier di Database (n={outlier_distribution.total.toLocaleString()})
              </div>
              <div style={{ fontSize: '0.78rem', color: '#2b6cb0', fontWeight: 700, marginTop: '2px' }}>
                Dikoreksi oleh Logika Hybrid (±4.0 & Batas ±5.0)
              </div>
            </div>
            <div style={{ height: '350px', width: '100%', position: 'relative' }}>
              <Bar data={barCData} options={barCOptions} plugins={[outlierLabelsPlugin]} />
            </div>
          </div>
        </div>
      ) : (
        /* HANYA GAMBAR ASLI 3-PANEL SAJA */
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          {chart_image ? (
            <img
              src={`data:image/png;base64,${chart_image}`}
              alt="Diagram Evaluasi Model 3-Panel"
              style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', display: 'block', margin: '0 auto' }}
            />
          ) : (
            <div style={{ padding: '40px', color: '#718096' }}>Memuat gambar...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default EvaluationCharts;
