import { useEffect, useState } from 'react';
import axios from 'axios';
import { Scatter, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend, BarElement, CategoryScale } from 'chart.js';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, BarElement, CategoryScale);

const EvaluationCharts = () => {
  const [evalData, setEvalData] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/evaluation')
      .then(res => setEvalData(res.data))
      .catch(err => console.error(err));
  }, []);

  if (!evalData) return <p>Loading grafik...</p>;

  const { scatter, feature_importance, targets } = evalData;

  // Siapkan data scatter untuk 3 target
  const scatterDatasets = targets.map((target, idx) => {
    const data = scatter[target];
    return {
      label: target,
      data: data.actual.map((act, i) => ({ x: act, y: data.predicted[i] })),
      backgroundColor: ['teal', 'coral', 'orchid'][idx],
    };
  });

  const scatterOptions = {
    scales: {
      x: { title: { display: true, text: 'Nilai Aktual (Database)' } },
      y: { title: { display: true, text: 'Nilai Prediksi AI' } },
    },
  };

  // Feature Importance
  const barData = {
    labels: feature_importance.features,
    datasets: [{
      label: 'Tingkat Pengaruh',
      data: feature_importance.importances,
      backgroundColor: 'purple',
    }]
  };

  return (
    <div>
      <h3>📈 Evaluasi Model</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {targets.map((target, idx) => (
          <div key={target} style={{ width: '300px' }}>
            <Scatter data={{ datasets: [scatterDatasets[idx]] }} options={scatterOptions} />
          </div>
        ))}
      </div>
      <div style={{ width: '400px', marginTop: '30px' }}>
        <Bar data={barData} options={{ indexAxis: 'y' }} />
      </div>
    </div>
  );
};